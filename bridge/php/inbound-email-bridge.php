#!/opt/cpanel/ea-php80/root/usr/bin/php
<?php
declare(strict_types=1);

// cPanel / mail pipe bridge script.
// Usage (pipe in cPanel):
// |/home/USER/public_html/resqcity/bridge/php/inbound-email-bridge.php
//
// Goal:
// - parse raw email locally
// - send only normalized signal update to Vercel (not full raw email)


// IMAP configuration (edit these)
$imapHost = 'imap.yourhost.com';
$imapPort = 993;
$imapUser = 'info@yourdomain.bg';
$imapPass = 'yourpassword';
$imapMailbox = 'INBOX';

$inboundUrl = getenv('INBOUND_EMAIL_URL') ?: 'https://resq.tcom-sf.org/api/inbound-email';
$authToken = getenv('INBOUND_EMAIL_AUTH_TOKEN') ?: 'aaa';
$maxNoteChars = (int) (getenv('INBOUND_EMAIL_MAX_NOTE_CHARS') ?: '1200');
$strictDelivery = in_array(
    strtolower((string) getenv('INBOUND_EMAIL_STRICT_DELIVERY')),
    ['1', 'true', 'yes', 'on'],
    true
);


if ($authToken === '') {
    error_log('[ResQCity inbound bridge] Missing INBOUND_EMAIL_AUTH_TOKEN');
    exit(1);
}

// Connect to IMAP
$imapStream = imap_open("{${imapHost}:${imapPort}/ssl}${imapMailbox}", $imapUser, $imapPass);
if (!$imapStream) {
    error_log('[ResQCity inbound bridge] IMAP connection failed: ' . imap_last_error());
    exit(1);
}

$emails = imap_search($imapStream, 'UNSEEN');
if (!$emails) {
    imap_close($imapStream);
    exit(0); // No new emails
}

foreach ($emails as $emailNum) {
    $overview = imap_fetch_overview($imapStream, $emailNum, 0)[0];
    $rawHeaders = imap_fetchheader($imapStream, $emailNum);
    $structure = imap_fetchstructure($imapStream, $emailNum);
    $rawBody = imap_body($imapStream, $emailNum);

    // If multipart, try to get plain/text
    if (isset($structure->parts) && count($structure->parts) > 0) {
        foreach ($structure->parts as $partNum => $part) {
            if (strtolower($part->subtype ?? '') === 'plain') {
                $rawBody = imap_fetchbody($imapStream, $emailNum, $partNum+1);
                break;
            }
        }
    }

    // ...existing code...

function findHeaderValue(string $headers, string $name): string
{
    // RFC email headers can continue on the next line when prefixed with whitespace.
    $unfolded = preg_replace("/\r?\n[\t ]+/", ' ', $headers);
    foreach (preg_split('/\r?\n/', (string) $unfolded) as $line) {
        if (stripos($line, $name . ':') === 0) {
            return trim(substr($line, strlen($name) + 1));
        }
    }

    return '';
}

function extractReportId(string $subject, string $body): string
{
    $combined = $subject . "\n" . $body;
    if (preg_match('/#ID-([A-Za-z0-9-]{6,80})/i', $combined, $matches) === 1) {
        return $matches[1];
    }

    return '';
}

function inferStatus(string $subject, string $body): string
{
    $textRaw = $subject . "\n" . $body;
    $text = function_exists('mb_strtolower')
        ? mb_strtolower($textRaw, 'UTF-8')
        : strtolower($textRaw);

    $statusMap = [
        'RESOLVED' => ['resolved', 'fixed', 'completed', 'решен', 'приключен', 'отстранен'],
        'IN_PROGRESS' => ['in progress', 'working on', 'started', 'в процес', 'работи се', 'започнат'],
        'IN_REVIEW' => ['review', 'inspection', 'under review', 'на преглед', 'проверка'],
        'REJECTED' => ['rejected', 'cannot process', 'not feasible', 'отхвърлен', 'невъзможно'],
    ];

    foreach ($statusMap as $status => $keywords) {
        foreach ($keywords as $keyword) {
            $hasKeyword = function_exists('mb_strpos')
                ? mb_strpos($text, $keyword, 0, 'UTF-8') !== false
                : strpos($text, $keyword) !== false;

            if ($hasKeyword) {
                return $status;
            }
        }
    }

    return '';
}


    $subject = findHeaderValue($rawHeaders, 'Subject');
    $from = findHeaderValue($rawHeaders, 'From');
    $messageId = findHeaderValue($rawHeaders, 'Message-ID');
    $inReplyTo = findHeaderValue($rawHeaders, 'In-Reply-To');

    if ($from === '') {
        error_log('[ResQCity inbound bridge] Missing From header');
        continue;
    }

    $plainBody = trim(preg_replace('/\s+/', ' ', strip_tags($rawBody)) ?: '');
    $reportId = extractReportId($subject, $plainBody);
    $status = inferStatus($subject, $plainBody);
    $updateNote = function_exists('mb_substr')
        ? mb_substr($plainBody, 0, $maxNoteChars, 'UTF-8')
        : substr($plainBody, 0, $maxNoteChars);

    $payload = [
        'source' => 'php-mail-bridge',
        'from' => $from,
        'subject' => $subject,
        'text' => $plainBody,
        'html' => $rawBody,
        'reportId' => $reportId !== '' ? $reportId : null,
        'status' => $status !== '' ? $status : null,
        'updateNote' => $updateNote !== '' ? $updateNote : null,
        'messageId' => $messageId !== '' ? $messageId : null,
        'inReplyTo' => $inReplyTo !== '' ? $inReplyTo : null,
        'authToken' => $authToken,
    ];

    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        error_log('[ResQCity inbound bridge] Failed to encode payload to JSON');
        continue;
    }

    $ch = curl_init($inboundUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-Inbound-Email-Token: ' . $authToken,
        ],
        CURLOPT_POSTFIELDS => $json,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);

    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    // Log API response and payload for debugging
    $logFile = '/tmp/inbound-email-bridge.log';
    $logEntry = sprintf(
        "[%s] HTTP=%d CURL=%s\nPayload: %s\nResponse: %s\n\n",
        date('Y-m-d H:i:s'),
        $httpCode,
        $curlError,
        $json,
        is_string($response) ? $response : var_export($response, true)
    );
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);

    if ($response === false || $httpCode >= 400) {
        error_log('[ResQCity inbound bridge] Forward failed. HTTP=' . $httpCode . ' CURL=' . $curlError . ' RESPONSE=' . (string)$response);
        continue;
    }

    // Mark email as deleted
    imap_delete($imapStream, $emailNum);
}

imap_expunge($imapStream);
imap_close($imapStream);

exit(0);
