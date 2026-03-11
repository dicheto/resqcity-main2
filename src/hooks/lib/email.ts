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

/** Преизползваем layout за всички имейли */
function emailLayout(content: string, headerGradient = '135deg,#7C3AED,#06b6d4'): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:linear-gradient(180deg,#0f0f14 0%,#15151d 100%);font-family:'DM Sans',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#0f0f14,#15151d);padding:48px 24px;min-height:100vh;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1b24;border-radius:20px;border:1px solid rgba(124,58,237,0.2);overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <tr><td style="background:linear-gradient(${headerGradient});padding:40px 44px;text-align:center;">
          <p style="margin:0;color:rgba(255,255,255,0.9);font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">ResQCity</p>
          <div style="width:48px;height:3px;background:rgba(255,255,255,0.5);margin:12px auto 0;border-radius:2px;"></div>
        </td></tr>
        <tr><td style="padding:40px 44px;">
          ${content}
        </td></tr>
        <tr><td style="background:#12131a;padding:24px 44px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="color:#6b7280;font-size:12px;margin:0;">© ${new Date().getFullYear()} ResQCity — Платформа за граждански сигнали</p>
          <p style="color:#4b5563;font-size:11px;margin:6px 0 0;"><a href="${appUrl}" style="color:#7C3AED;text-decoration:none;">resqcity.bg</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  email: string,
  verificationLink: string
): Promise<SendEmailResult> {
  const content = `
    <p style="color:#a0aec0;font-size:16px;line-height:1.7;margin:0 0 28px;">Здравейте,<br><br>Благодарим ви, че се регистрирахте в <strong style="color:#e2e8f0;">ResQCity</strong>. Кликнете бутона по-долу, за да потвърдите имейл адреса си и да активирате профила.</p>
    <div style="text-align:center;margin:36px 0;">
      <a href="${verificationLink}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#5b21b6);color:#fff!important;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:600;font-size:15px;letter-spacing:.3px;box-shadow:0 4px 14px rgba(124,58,237,0.4);">Потвърди имейл</a>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:28px 0 0;">Линкът е валиден 24 часа. Ако не сте създали акаунт, просто игнорирайте този имейл.</p>
    <div style="margin-top:28px;padding:16px;background:rgba(124,58,237,0.08);border-radius:10px;border-left:4px solid #7C3AED;">
      <p style="color:#94a3b8;font-size:12px;margin:0;word-break:break-all;">Или копирайте: ${verificationLink}</p>
    </div>
  `;
  return sendEmail({
    to: email,
    subject: 'Потвърди имейла си — ResQCity',
    html: emailLayout(content, '135deg,#7C3AED,#06b6d4'),
    text: `Потвърди имейл адреса си в ResQCity.\n\nОтвори: ${verificationLink}\n\nЛинкът е валиден 24 часа.`,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<SendEmailResult> {
  const content = `
    <p style="color:#a0aec0;font-size:16px;line-height:1.7;margin:0 0 28px;">Здравейте,<br><br>Получихме заявка за смяна на паролата за акаунта с имейл <strong style="color:#e2e8f0;">${email}</strong>. Натиснете бутона по-долу, за да зададете нова парола.</p>
    <div style="text-align:center;margin:36px 0;">
      <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff!important;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:600;font-size:15px;letter-spacing:.3px;box-shadow:0 4px 14px rgba(249,115,22,0.4);">Смени паролата</a>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:28px 0 0;">Линкът е валиден <strong>1 час</strong>. Ако не сте поискали смяна на парола, игнорирайте този имейл — акаунтът остава защитен.</p>
    <div style="margin-top:28px;padding:16px;background:rgba(249,115,22,0.08);border-radius:10px;border-left:4px solid #f97316;">
      <p style="color:#94a3b8;font-size:12px;margin:0;word-break:break-all;">Или копирайте: ${resetLink}</p>
    </div>
  `;
  return sendEmail({
    to: email,
    subject: 'Смяна на парола — ResQCity',
    html: emailLayout(content, '135deg,#f97316,#ef4444'),
    text: `Смяна на парола в ResQCity.\n\nОтвори: ${resetLink}\n\nЛинкът е валиден 1 час.`,
  });
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'В обработка',
  IN_REVIEW: 'На преглед',
  IN_PROGRESS: 'В процес',
  RESOLVED: 'Решен',
  REJECTED: 'Отхвърлен',
};

export async function sendReportCreatedEmail(
  email: string,
  reportTitle: string,
  reportId: string,
  categoryName: string
): Promise<SendEmailResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reportLink = `${appUrl}/dashboard/reports/${reportId}`;
  const content = `
    <p style="color:#a0aec0;font-size:16px;line-height:1.7;margin:0 0 24px;">Вашият сигнал е успешно създаден и е записан в системата.</p>
    <div style="background:rgba(6,182,212,0.08);border-radius:12px;padding:20px;border-left:4px solid #06b6d4;margin:24px 0;">
      <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">Сигнал</p>
      <p style="margin:0 0 12px;color:#e2e8f0;font-size:17px;font-weight:600;">${reportTitle}</p>
      <p style="margin:0;color:#94a3b8;font-size:13px;">Категория: ${categoryName}</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${reportLink}" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:14px;">Преглед на сигнала</a>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">Сигналът ще бъде прегледан от екипа ни. Ще получите известие при промяна в статуса.</p>
  `;
  return sendEmail({
    to: email,
    subject: `Сигналът ви е създаден — ${reportTitle}`,
    html: emailLayout(content, '135deg,#06b6d4,#0891b2'),
    text: `Сигналът ви "${reportTitle}" е създаден успешно. Преглед: ${reportLink}`,
  });
}

export async function sendReportStatusChangedEmail(
  email: string,
  reportTitle: string,
  reportId: string,
  oldStatus: string,
  newStatus: string,
  note?: string
): Promise<SendEmailResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reportLink = `${appUrl}/dashboard/reports/${reportId}`;
  const oldLabel = STATUS_LABELS[oldStatus] || oldStatus;
  const newLabel = STATUS_LABELS[newStatus] || newStatus;
  const noteBlock = note
    ? `<div style="background:rgba(124,58,237,0.08);border-radius:10px;padding:16px;margin-top:16px;border-left:4px solid #7C3AED;"><p style="margin:0;color:#94a3b8;font-size:14px;">${note}</p></div>`
    : '';
  const content = `
    <p style="color:#a0aec0;font-size:16px;line-height:1.7;margin:0 0 24px;">Има нова промяна по сигнала ви.</p>
    <div style="background:rgba(124,58,237,0.08);border-radius:12px;padding:20px;border-left:4px solid #7C3AED;">
      <p style="margin:0 0 12px;color:#e2e8f0;font-size:17px;font-weight:600;">${reportTitle}</p>
      <p style="margin:0;color:#94a3b8;font-size:14px;"><span style="color:#94a3b8;">Статус: </span><span style="text-decoration:line-through;color:#94a3b8;">${oldLabel}</span> → <strong style="color:#a78bfa;">${newLabel}</strong></p>
      ${noteBlock}
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${reportLink}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#5b21b6);color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:14px;">Преглед на сигнала</a>
    </div>
  `;
  return sendEmail({
    to: email,
    subject: `Промяна в статус — ${reportTitle}`,
    html: emailLayout(content, '135deg,#7C3AED,#06b6d4'),
    text: `Сигналът ви "${reportTitle}" е обновен: ${oldLabel} → ${newLabel}. Преглед: ${reportLink}`,
  });
}

export async function sendReportCommentEmail(
  email: string,
  reportTitle: string,
  reportId: string,
  commenterName: string,
  commentPreview: string
): Promise<SendEmailResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reportLink = `${appUrl}/dashboard/reports/${reportId}`;
  const preview = commentPreview.length > 120 ? commentPreview.slice(0, 120) + '…' : commentPreview;
  const content = `
    <p style="color:#a0aec0;font-size:16px;line-height:1.7;margin:0 0 24px;"><strong style="color:#e2e8f0;">${commenterName}</strong> добави отговор по сигнала ви.</p>
    <div style="background:rgba(16,185,129,0.08);border-radius:12px;padding:20px;border-left:4px solid #10b981;">
      <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">Сигнал: ${reportTitle}</p>
      <p style="margin:0;color:#e2e8f0;font-size:15px;line-height:1.5;">"${preview}"</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${reportLink}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:14px;">Преглед и отговор</a>
    </div>
  `;
  return sendEmail({
    to: email,
    subject: `Нов отговор по сигнала ви — ${reportTitle}`,
    html: emailLayout(content, '135deg,#10b981,#059669'),
    text: `${commenterName} отговори по "${reportTitle}": "${preview}". Преглед: ${reportLink}`,
  });
}
