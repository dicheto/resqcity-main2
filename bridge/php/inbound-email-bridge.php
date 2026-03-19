<?php
declare(strict_types=1);

// cPanel / mail pipe bridge script.
// Usage (pipe in cPanel):
// |/usr/local/bin/php /home/USER/public_html/resqcity/bridge/php/inbound-email-bridge.php
//
// Goal:
// - parse raw email locally
// - send only normalized signal update to Vercel (not full raw email)

$inboundUrl = getenv('INBOUND_EMAIL_URL') ?: 'https://your-domain.com/api/inbound-email';
$authToken = getenv('INBOUND_EMAIL_AUTH_TOKEN') ?: '';
$maxNoteChars = (int) (getenv('INBOUND_EMAIL_MAX_NOTE_CHARS') ?: '1200');

if ($authToken === '') {
    error_log('[ResQCity inbound bridge] Missing INBOUND_EMAIL_AUTH_TOKEN');
    exit(1);
}

$raw = file_get_contents('php://stdin') ?: '';
if (trim($raw) === '') {
    error_log('[ResQCity inbound bridge] Empty stdin payload');
    exit(1);
}

[$rawHeaders, $rawBody] = array_pad(preg_split("/\r?\n\r?\n/", $raw, 2), 2, '');

function findHeaderValue(string $headers, string $name): string
{
    foreach (preg_split('/\r?\n/', $headers) as $line) {
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
    exit(1);
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
    exit(1);
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

if ($response === false || $httpCode >= 400) {
    error_log('[ResQCity inbound bridge] Forward failed. HTTP=' . $httpCode . ' CURL=' . $curlError . ' RESPONSE=' . (string)$response);
    exit(1);
}

exit(0);
