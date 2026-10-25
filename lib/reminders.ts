import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp-server";
import { REMINDER_COUNTRIES, DEFAULT_REMINDER_TIMEZONE } from "@/lib/timezones";

type ReminderWithUser = {
  id: string;
  userId: string;
  slotIndex: number;
  note: string | null;
  remindAt: Date | null;
  timezone?: string | null;
  channel: string;
  user: { email: string; phone: string | null; fullName: string };
};

function formatWhen(d: Date, timezone?: string | null): string {
  const tz = timezone || DEFAULT_REMINDER_TIMEZONE;
  const country = REMINDER_COUNTRIES.find((c) => c.timezone === tz);
  const label = country ? country.country : "SGT";
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: tz,
  }) + ` (${label})`;
}

// Delivers one reminder over its chosen channel(s) plus an in-app
// notification. Never throws — a failed email/WhatsApp must not block the rest.
export async function deliverReminder(reminder: ReminderWithUser): Promise<{ waSent: boolean }> {
  const note = reminder.note ?? "";
  const when = reminder.remindAt ? formatWhen(reminder.remindAt, reminder.timezone) : null;

  if ((reminder.channel === "GMAIL" || reminder.channel === "BOTH") && reminder.user.email) {
    try {
      await sendEmail(
        reminder.user.email,
        `🔔 Nirapode Reminder: Slot #${reminder.slotIndex}`,
        `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #7c3aed;">🔔 Nirapode Alarm Reminder</h2>
            <p>Hello <strong>${reminder.user.fullName}</strong>,</p>
            <p>This is your scheduled alarm reminder:</p>
            <div style="background: #f8fafc; padding: 16px; border-left: 4px solid #7c3aed; margin: 16px 0; border-radius: 4px;">
              <p style="font-size: 16px; margin: 0; color: #1e293b;"><strong>${note}</strong></p>
              ${when ? `<p style="font-size: 12px; color: #64748b; margin-top: 8px;">Scheduled for: ${when}</p>` : ""}
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Nirapode Platform Services</p>
          </div>
        `
      );
    } catch (err) {
      console.error(`[reminders] email failed for ${reminder.id}:`, err);
    }
  }

  let waSent = false;
  if ((reminder.channel === "WHATSAPP" || reminder.channel === "BOTH") && reminder.user.phone) {
    const text = `🔔 Nirapode Reminder (Slot #${reminder.slotIndex})\n\n${note}${when ? `\nScheduled for: ${when}` : ""}`;
    const res = await sendWhatsAppMessage({ to: reminder.user.phone, text });
    waSent = res.success;
    if (!res.success) console.error(`[reminders] WhatsApp failed for ${reminder.id}: ${res.error}`);
  }

  await prisma.notification.create({
    data: {
      userId: reminder.userId,
      title: `Alarm Reminder (Slot #${reminder.slotIndex})`,
      message: note,
      type: "SYSTEM",
    },
  });

  return { waSent };
}

// Sends every reminder whose time has come. Each is claimed atomically
// (isActive true → false) before sending, so overlapping cron runs can never
// send the same reminder twice. Saving the reminder again re-arms it.
export async function sendDueReminders(): Promise<{ due: number; sent: number }> {
  const due = await prisma.reminder.findMany({
    where: { isActive: true, note: { not: null }, remindAt: { lte: new Date() } },
    include: { user: { select: { email: true, phone: true, fullName: true } } },
    take: 100,
  });

  let sent = 0;
  for (const reminder of due) {
    const { count } = await prisma.reminder.updateMany({
      where: { id: reminder.id, isActive: true },
      data: { isActive: false, lastSentAt: new Date() },
    });
    if (count === 0) continue;
    await deliverReminder(reminder);
    sent++;
  }
  return { due: due.length, sent };
}

// Secret that authorizes the cron URL. Created on first use and shown to
// admins in Settings, so no environment variable is needed.
export async function getReminderCronKey(): Promise<string> {
  const existing = await prisma.siteSetting.findUnique({ where: { key: "reminder_cron_key" } });
  if (existing?.value) return existing.value;
  const key = crypto.randomUUID().replace(/-/g, "");
  await prisma.siteSetting.upsert({
    where: { key: "reminder_cron_key" },
    create: { key: "reminder_cron_key", value: key },
    update: {},
  });
  const row = await prisma.siteSetting.findUnique({ where: { key: "reminder_cron_key" } });
  return row?.value ?? key;
}
