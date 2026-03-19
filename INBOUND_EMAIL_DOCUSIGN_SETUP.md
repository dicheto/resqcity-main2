# Inbound Email + BISS Setup

## 1) Environment variables

Set the following in your deployment:

- `INBOUND_EMAIL_AUTH_TOKEN`
- `BISS_PROTOCOL_VERSION` (default `1.0`)
- Optional (strict mode): `BISS_REQUEST_SIGNING_PRIVATE_KEY_PEM`
- Optional (strict mode): `BISS_REQUEST_SIGNING_CERT_B64`

Modes:

- `universal` (default): no extra key/cert setup; browser signs via local BISS.
- `strict` (optional): backend adds `signedContents` and `signedContentsCert` in BISS request.

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

## 4) BISS dispatch signing

Dispatch signing with BISS is local (browser -> https://localhost:53952..53955):

- `GET /version`
- `POST /getsigner`
- `POST /sign`

ResQCity backend endpoints:

- `POST /api/admin/dispatch/batches/:batchId/biss/prepare`
- `POST /api/admin/dispatch/batches/:batchId/biss/sign-send`

Flow:

- Browser discovers local BISS by scanning ports `53952`, `53953`, `53954`, `53955`
- Browser requests signer certificate via `/getsigner`
- Backend returns BISS sign payload. In strict mode it includes `signedContents` and `signedContentsCert`.
- Browser calls BISS `/sign` with selected `signerCertificateB64`
- Backend stores detached signature (`.p7s`) and sends email to institution
- Email contains draft PDF + detached signature (+ signer cert when available)
- Batch status moves to `SENT`

## 5) Notes

- BISS requires HTTPS origin for HTML application and CORS checks.
- `signedContents` is created server-side with SHA256WithRSA (or SHA512WithRSA).
- `signedContentsCert` must be trusted certificate chain (no self-signed cert for this field).