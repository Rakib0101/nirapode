import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { renderBrandEmail } from "@/lib/email-template";

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

  const fromAddress = config.from.includes("<") ? config.from : `Nirapode <${config.from}>`;
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
    ? "Verify your Nirapode account"
    : isResetPin
      ? "Reset your Nirapode PIN"
      : "Reset your password";

  const badge = isVerification ? "Account Security" : isResetPin ? "PIN Reset" : "Password Reset";
  const title = isVerification
    ? "Welcome to Nirapode!"
    : isResetPin
    ? "Reset Your 4-Digit Security PIN"
    : "Reset Your Account Password";

  const description = isVerification
    ? "Thank you for joining Nirapode. Please use the one-time verification code below to verify your email address. This code expires in 10 minutes."
    : isResetPin
    ? "We received a request to reset your 4-digit security app-lock PIN. Use the verification code below to complete the reset. This code expires in 10 minutes."
    : "We received a request to reset your account password. Use the verification code below to set a new password. This code expires in 10 minutes.";

  const bodyHtml = `
    <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.6;">
      ${description}
    </p>

    <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
      <span style="display: block; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1.5px; margin-bottom: 8px;">
        Your One-Time Code
      </span>
      <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #4f46e5; text-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        ${otp}
      </span>
    </div>

    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
      🔒 <strong>Security Notice:</strong> Never share this code with anyone, including Nirapode support staff. If you did not make this request, you can safely ignore this email.
    </p>
  `;

  const html = await renderBrandEmail({
    title,
    badge,
    bodyHtml,
    preheader: `Your Nirapode verification code is ${otp}`,
  });

  await sendEmail(email, subject, html);
}
