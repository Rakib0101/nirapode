import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp-server";

const ADMIN_EMAIL_KEY = "admin_notification_email";
const ADMIN_PHONE_KEY = "admin_notification_phone";

export async function getAdminNotificationEmail(): Promise<string | null> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: ADMIN_EMAIL_KEY } });
    return row?.value?.trim() || null;
  } catch {
    return null;
  }
}

export async function saveAdminNotificationEmail(email: string): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: ADMIN_EMAIL_KEY },
    create: { key: ADMIN_EMAIL_KEY, value: email },
    update: { value: email },
  });
}

export async function getAdminNotificationPhone(): Promise<string | null> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: ADMIN_PHONE_KEY } });
    return row?.value?.trim() || null;
  } catch {
    return null;
  }
}

export async function saveAdminNotificationPhone(phone: string): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: ADMIN_PHONE_KEY },
    create: { key: ADMIN_PHONE_KEY, value: phone },
    update: { value: phone },
  });
}

function wrapEmail(heading: string, bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:#2563eb;padding:24px 32px;text-align:center;">
                    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Singapur Probashi</p>
                    <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;">${heading}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 32px;">${bodyHtml}</td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:16px 32px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Singapur Probashi Community.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// Fires an email (and, if configured, a WhatsApp message) to the admin
// whenever a new request/action happens somewhere on the platform.
// Deliberately silent on failure (no admin email/phone set, SMTP down,
// WhatsApp gateway not configured, etc.) — the request/action itself must
// always succeed regardless of whether these notifications go out.
export async function notifyAdmin(opts: {
  subject: string;
  heading: string;
  lines: { label: string; value: string }[];
  actionPath?: string;
  actionLabel?: string;
}): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  try {
    const to = await getAdminNotificationEmail();
    if (to) {
      const rows = opts.lines
        .map(
          (l) =>
            `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">${l.label}</td><td style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;">${l.value}</td></tr>`
        )
        .join("");

      const body = `
        <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111827;">${opts.heading}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">${rows}</table>
        ${
          opts.actionPath
            ? `<a href="${baseUrl}${opts.actionPath}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;">${opts.actionLabel ?? "View in Admin Panel"}</a>`
            : ""
        }
      `;

      await sendEmail(to, opts.subject, wrapEmail("New Activity", body));
    }
  } catch (err) {
    console.error("[notifyAdmin] failed to send notification email:", err);
  }

  try {
    const phone = await getAdminNotificationPhone();
    if (phone) {
      const lines = opts.lines.map((l) => `${l.label}: ${l.value}`).join("\n");
      const link = opts.actionPath ? `\n${baseUrl}${opts.actionPath}` : "";
      const text = `🔔 ${opts.heading}\n\n${lines}${link}`;
      const res = await sendWhatsAppMessage({ to: phone, text });
      if (!res.success) console.error("[notifyAdmin] WhatsApp send failed:", res.error);
    }
  } catch (err) {
    console.error("[notifyAdmin] failed to send WhatsApp notification:", err);
  }
}

// Fires a confirmation email to a user (e.g. buyer) when their request is
// approved. Same silent-failure contract as notifyAdmin.
export async function notifyUser(opts: {
  to: string;
  subject: string;
  heading: string;
  message: string;
  lines?: { label: string; value: string }[];
}): Promise<void> {
  try {
    const rows = (opts.lines ?? [])
      .map(
        (l) =>
          `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">${l.label}</td><td style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;">${l.value}</td></tr>`
      )
      .join("");

    const body = `
      <p style="margin:0 0 16px;font-size:14px;color:#111827;line-height:1.6;">${opts.message}</p>
      ${rows ? `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>` : ""}
    `;

    await sendEmail(opts.to, opts.subject, wrapEmail(opts.heading, body));
  } catch (err) {
    console.error("[notifyUser] failed to send notification email:", err);
  }
}
