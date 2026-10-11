import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

async function getEmailConfig() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure"] },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    const host = map.get("smtp_host") || process.env.SMTP_HOST || "";
    const port = Number(map.get("smtp_port") || process.env.SMTP_PORT || 587);
    const user = map.get("smtp_user") || process.env.SMTP_USER || "";
    const pass = map.get("smtp_pass") || process.env.SMTP_PASS || "";
    const from = map.get("smtp_from") || process.env.SMTP_FROM || user || "";
    const secure = map.get("smtp_secure") === "true" || process.env.SMTP_SECURE === "true";

    return { host, port, user, pass, from, secure };
  } catch {
    return {
      host: process.env.SMTP_HOST || "",
      port: Number(process.env.SMTP_PORT ?? 587),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
      secure: process.env.SMTP_SECURE === "true",
    };
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const config = await getEmailConfig();

  if (!config.host || !config.user || !config.pass) {
    console.warn("⚠️ SMTP credentials not configured (in SiteSetting or .env). Email to:", to, "was skipped.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const fromAddress = config.from.includes("<") ? config.from : `Singapore Probashi <${config.from}>`;
  await transporter.sendMail({ from: fromAddress, to, subject, html });
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTPEmail(
  email: string,
  otp: string,
  type: "verification" | "reset" | "reset-pin"
): Promise<void> {
  const isVerification = type === "verification";
  const isResetPin = type === "reset-pin";
  const subject = isVerification
    ? "Verify your Singapore Probashi account"
    : isResetPin
      ? "Reset your Singapore Probashi PIN"
      : "Reset your password";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:#047857;padding:28px 32px;text-align:center;">
                    <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                      Singapore Probashi
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">
                      ${isVerification ? "Welcome to Singapore Probashi!" : isResetPin ? "PIN Reset Request" : "Password Reset Request"}
                    </p>
                    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.5;">
                      ${isVerification
                        ? "Please use the verification code below to confirm your email address. This code expires in 10 minutes."
                        : isResetPin
                          ? "We received a request to reset your 4-digit app-lock PIN. Use the code below to proceed. This code expires in 10 minutes."
                          : "We received a request to reset your password. Use the code below to proceed. This code expires in 10 minutes."}
                    </p>
                    <div style="background:#f4f4f5;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                      <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#047857;">
                        ${otp}
                      </span>
                    </div>
                    <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                      If you did not request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await sendEmail(email, subject, html);
}
