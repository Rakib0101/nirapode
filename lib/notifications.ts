import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp-server";

const ADMIN_EMAIL_KEY = "admin_notification_email";
const ADMIN_PHONE_KEY = "admin_notification_phone";

// Optional per-module override (currently SHARE4 / SHARE6) — falls back to
// the global admin contact above when unset. Lets the client route Share 4
// and Share 6 order alerts to two different people.
export type NotifyModule = "SHARE4" | "SHARE6";

function moduleKey(base: string, module?: NotifyModule) {
  return module ? `${base}_${module.toLowerCase()}` : base;
}

export async function getAdminNotificationEmail(module?: NotifyModule): Promise<string | null> {
  try {
    if (module) {
      const row = await prisma.siteSetting.findUnique({ where: { key: moduleKey(ADMIN_EMAIL_KEY, module) } });
      if (row?.value?.trim()) return row.value.trim();
    }
    const row = await prisma.siteSetting.findUnique({ where: { key: ADMIN_EMAIL_KEY } });
    return row?.value?.trim() || null;
  } catch {
    return null;
  }
}

export async function saveAdminNotificationEmail(email: string, module?: NotifyModule): Promise<void> {
  const key = moduleKey(ADMIN_EMAIL_KEY, module);
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: email },
    update: { value: email },
  });
}

export async function getAdminNotificationPhone(module?: NotifyModule): Promise<string | null> {
  try {
    if (module) {
      const row = await prisma.siteSetting.findUnique({ where: { key: moduleKey(ADMIN_PHONE_KEY, module) } });
      if (row?.value?.trim()) return row.value.trim();
    }
    const row = await prisma.siteSetting.findUnique({ where: { key: ADMIN_PHONE_KEY } });
    return row?.value?.trim() || null;
  } catch {
    return null;
  }
}

// Raw module override only, no fallback to the global contact — for
// pre-filling the settings form, so a blank override shows as blank rather
// than looking like it's already set to the global value.
export async function getModuleNotificationOverride(module: NotifyModule): Promise<{ email: string | null; phone: string | null }> {
  try {
    const [emailRow, phoneRow] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: moduleKey(ADMIN_EMAIL_KEY, module) } }),
      prisma.siteSetting.findUnique({ where: { key: moduleKey(ADMIN_PHONE_KEY, module) } }),
    ]);
    return { email: emailRow?.value?.trim() || null, phone: phoneRow?.value?.trim() || null };
  } catch {
    return { email: null, phone: null };
  }
}

export async function saveAdminNotificationPhone(phone: string, module?: NotifyModule): Promise<void> {
  const key = moduleKey(ADMIN_PHONE_KEY, module);
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: phone },
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
                  <td style="background:#7c3aed;padding:24px 32px;text-align:center;">
                    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Nirapode</p>
                    <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;">${heading}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 32px;">${bodyHtml}</td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:16px 32px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Nirapode Platform.</p>
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
  module?: NotifyModule;
}): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  try {
    const to = await getAdminNotificationEmail(opts.module);
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
    const phone = await getAdminNotificationPhone(opts.module);
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

// Fires a confirmation email (and, if a phone is given, WhatsApp) to a user —
// order confirmed, deposit/withdrawal approved, any completed transaction.
// Same silent-failure contract as notifyAdmin: never throws, never blocks
// the action that triggered it.
export async function notifyUser(opts: {
  to: string;
  phone?: string | null;
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

  if (opts.phone) {
    try {
      const lines = (opts.lines ?? []).map((l) => `${l.label}: ${l.value}`).join("\n");
      const text = `✅ ${opts.heading}\n\n${opts.message}${lines ? `\n\n${lines}` : ""}`;
      const res = await sendWhatsAppMessage({ to: opts.phone, text });
      if (!res.success) console.error("[notifyUser] WhatsApp send failed:", res.error);
    } catch (err) {
      console.error("[notifyUser] failed to send WhatsApp notification:", err);
    }
  }
}
