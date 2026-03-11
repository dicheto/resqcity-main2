import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

function getSafeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message || err.name || 'Unknown error';
  }
  return String(err);
}

export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });
    return { ok: true };
  } catch (error) {
    const msg = getSafeErrorMessage(error);
    console.error('[Email] Failed to send:', msg, error);
    return { ok: false, error: msg };
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationLink: string
): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: 'Потвърди своя имейл — ResQCity',
    html: `
<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0f14;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f14;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141620;border-radius:16px;border:1px solid #1f2335;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7C3AED,#06b6d4);padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.9;font-weight:700;">ResQCity</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:800;">Потвърди имейл адреса си</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="color:#a0a8c0;font-size:15px;line-height:1.6;margin:0 0 24px;">Благодарим ти, че се регистрира в <strong style="color:#e2e8f0;">ResQCity</strong>! Кликни върху бутона по-долу, за да потвърдиш имейл адреса си и да активираш профила си.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${verificationLink}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#5b21b6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:.5px;">
              ✅ Потвърди имейл
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">Линкът е валиден 24 часа. Ако не си създал акаунт в ResQCity, просто игнорирай този имейл.</p>
          <hr style="border:none;border-top:1px solid #1f2335;margin:24px 0;">
          <p style="color:#4b5563;font-size:12px;margin:0;">Или копирай линка в браузъра:<br><span style="color:#7C3AED;word-break:break-all;">${verificationLink}</span></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0d0f14;padding:20px 40px;text-align:center;">
          <p style="color:#374151;font-size:11px;margin:0;">© ${new Date().getFullYear()} ResQCity — Градска сигурност</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Потвърди имейл адреса си в ResQCity.\n\nОтвори следния линк:\n${verificationLink}\n\nЛинкът е валиден 24 часа.`,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: 'Смяна на парола — ResQCity',
    html: `
<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0f14;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f14;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141620;border-radius:16px;border:1px solid #1f2335;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#f97316,#ef4444);padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.9;font-weight:700;">ResQCity</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:800;">Смяна на парола</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="color:#a0a8c0;font-size:15px;line-height:1.6;margin:0 0 24px;">Получихме заявка за смяна на паролата за акаунта, свързан с <strong style="color:#e2e8f0;">${email}</strong>. Кликни върху бутона по-долу, за да зададеш нова парола.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:.5px;">
              🔑 Смени паролата
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">Линкът е валиден <strong>1 час</strong>. Ако не си поискал смяна на парола, просто игнорирай този имейл — акаунтът ти остава защитен.</p>
          <hr style="border:none;border-top:1px solid #1f2335;margin:24px 0;">
          <p style="color:#4b5563;font-size:12px;margin:0;">Или копирай линка в браузъра:<br><span style="color:#f97316;word-break:break-all;">${resetLink}</span></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0d0f14;padding:20px 40px;text-align:center;">
          <p style="color:#374151;font-size:11px;margin:0;">© ${new Date().getFullYear()} ResQCity — Градска сигурност</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Смяна на парола в ResQCity.\n\nОтвори следния линк:\n${resetLink}\n\nЛинкът е валиден 1 час.`,
  });
}

export async function sendReportUpdateEmail(
  email: string,
  reportTitle: string,
  newStatus: string
): Promise<SendEmailResult> {
  return sendEmail({
    to: email,
    subject: `Report Update: ${reportTitle}`,
    html: `
      <h1>Your report has been updated</h1>
      <p><strong>Report:</strong> ${reportTitle}</p>
      <p><strong>New Status:</strong> ${newStatus}</p>
      <p>View your report at: ${process.env.NEXT_PUBLIC_APP_URL}/reports</p>
    `,
    text: `Your report "${reportTitle}" has been updated to: ${newStatus}`,
  });
}
