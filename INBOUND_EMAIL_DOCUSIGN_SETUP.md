# Inbound Email + DocuSign Setup

## 1) Environment variables

Set the following in your deployment:

- `INBOUND_EMAIL_AUTH_TOKEN`
- `DOCUSIGN_BASE_URL`
- `DOCUSIGN_ACCOUNT_ID`
- `DOCUSIGN_ACCESS_TOKEN`
- Optional: `DOCUSIGN_CONNECT_HMAC_SECRET`

## 2) Inbound email API

Endpoint:

- `POST /api/inbound-email`

Auth:

- Header `X-Inbound-Email-Token` OR body `authToken`
- Must match `INBOUND_EMAIL_AUTH_TOKEN`

Expected JSON payload (full mode):

```json
{
  "from": "institution@example.bg",
  "subject": "Update for #ID-REPORT_UUID",
  "text": "Signal is now resolved.",
  "authToken": "same-as-env-token",
  "attachments": [
    {
      "fileName": "proof.pdf",
      "mimeType": "application/pdf",
      "contentBase64": "JVBERi0xLjc..."
    }
  ]
}
```

Lean JSON payload (recommended for cPanel/PHP bridge):

```json
{
  "source": "php-mail-bridge",
  "from": "institution@example.bg",
  "reportId": "REPORT_UUID",
  "status": "IN_PROGRESS",
  "updateNote": "Работи се по сигнала, екипът е на място.",
  "messageId": "<abc@example.bg>",
  "authToken": "same-as-env-token"
}
```

Why lean mode:

- Do not send full raw email/MIME payload to Vercel
- Keep request size small and predictable
- Do heavy parsing in PHP bridge, keep Vercel as update API only

Signal resolution:

- Route looks for `#ID-<signal-id>` in subject/body.
- You can also pass `reportId` directly.

Status auto-detection keywords:

- `RESOLVED`: resolved, fixed, completed, решен, отстранен
- `IN_PROGRESS`: in progress, working on, started, в процес
- `IN_REVIEW`: review, inspection, на преглед, проверка
- `REJECTED`: rejected, cannot process, невъзможно, отхвърлен

Sender authorization:

- Sender email must match at least one known participant for the signal:
- Citizen owner email
- Assigned responsible person email
- Included institution / ad-hoc institution email
- Custom recipient email

## 3) PHP bridge for cPanel mail piping

Script path:

- `bridge/php/inbound-email-bridge.php`

Example cPanel forwarder command:

```bash
|/usr/local/bin/php /home/USER/public_html/resqcity/bridge/php/inbound-email-bridge.php
```

Environment variables required for PHP runtime:

- `INBOUND_EMAIL_URL` (example: `https://your-domain.com/api/inbound-email`)
- `INBOUND_EMAIL_AUTH_TOKEN`
- Optional: `INBOUND_EMAIL_MAX_NOTE_CHARS` (default `1200`)

## 4) DocuSign dispatch signing

Send a dispatch batch for DocuSign signing:

- `POST /api/admin/dispatch/batches/:batchId/docusign/send`

Optional request body:

```json
{
  "signerName": "Ivan Ivanov",
  "signerEmail": "ivan.ivanov@example.bg"
}
```

Webhook endpoint:

- `POST /api/docusign/webhook`

On completed envelope:

- Downloads combined signed PDF from DocuSign
- Stores document in Supabase Storage bucket `dispatch-docs`
- Creates `DispatchDocument` with `kind=SIGNED`
- Moves batch status to `SIGNED`

## 5) Notes

- Current DocuSign auth expects a ready bearer token (`DOCUSIGN_ACCESS_TOKEN`).
- For long-term production, migrate to OAuth JWT service integration and token refresh.
- KEP verification remains separate and can be layered after DocuSign completion.