interface NotificationOptions {
  type?: "sms" | "push" | "both";
  priority?: "high" | "normal";
}

function isSmsEnabled(): boolean {
  return process.env.SMS_ENABLED === "true";
}

/**
 * Send notification to user
 * Supports SMS and push notifications
 */
export async function sendNotification(
  phoneNumber: string,
  message: string,
  options: NotificationOptions = {}
): Promise<boolean> {
  const { type = "sms", priority = "normal" } = options;

  try {
    const sentSms = type === "sms" || type === "both"
      ? await sendSMS(phoneNumber, message)
      : true;

    return sentSms;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
}

/**
 * Send SMS using Bulgarian SMS service
 * Currently using Twilio as example - replace with your SMS provider
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    // SMS is optional and disabled by default.
    if (!isSmsEnabled()) {
      return false;
    }

    // Check if SMS service is configured
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.warn("SMS_ENABLED=true but Twilio credentials are missing. Skipping SMS.");
      return false;
    }

    // Twilio expects application/x-www-form-urlencoded body.
    const auth = Buffer.from(
      `${twilioAccountSid}:${twilioAuthToken}`
    ).toString("base64");

    const formBody = new URLSearchParams({
      From: twilioPhoneNumber,
      To: phoneNumber,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Twilio SMS failed:", text);
      return false;
    }

    const data = (await response.json()) as { sid?: string };

    return !!data.sid;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

/**
 * Send email notification
 */
export async function sendEmailNotification(
  email: string,
  subject: string,
  message: string,
  htmlContent?: string
): Promise<boolean> {
  try {
    // Check if email service is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("Email service not configured");
      return true;
    }

    // Import Nodemailer
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const result = await transporter.sendMail({
      from: smtpUser,
      to: email,
      subject,
      text: message,
      html: htmlContent || `<p>${message}</p>`,
    });

    return !!result.messageId;
  } catch (error) {
    console.error("Error sending email notification:", error);
    return false;
  }
}

/**
 * Format incident notification message
 */
export function formatIncidentNotification(
  vehiclePlate: string,
  incidentType: string,
  status: "VERIFIED" | "REJECTED",
  rejectionReason?: string
): string {
  if (status === "VERIFIED") {
    return `ResQCity: Вашият доклад за инцидент с кола ${vehiclePlate} (${incidentType}) е потвърден от диспечер. Благодарим за докладването!`;
  } else {
    return `ResQCity: Вашият доклад за инцидент е отхвърлен. Причина: ${
      rejectionReason || "Няма достатъчно доказателства"
    }`;
  }
}
