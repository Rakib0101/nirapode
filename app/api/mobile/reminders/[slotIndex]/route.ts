import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { zonedToUtc, DEFAULT_REMINDER_TIMEZONE, REMINDER_COUNTRIES } from "@/lib/timezones";
import { z } from "zod";

// Mirrors app/actions/reminders.ts saveReminderAction.
const schema = z.object({
  note: z.string().trim().optional(),
  remindDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  remindTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  channel: z.enum(["WHATSAPP", "GMAIL", "BOTH"]).optional(),
  timezone: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ slotIndex: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const slotIndex = Number((await params).slotIndex);
    if (!Number.isInteger(slotIndex) || slotIndex < 1 || slotIndex > 10) {
      return Response.json({ error: "Invalid slot." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parse = schema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { remindDate, remindTime = "09:00", channel = "WHATSAPP" } = parse.data;
    const note = parse.data.note?.trim();
    const timezone = REMINDER_COUNTRIES.some((c) => c.timezone === parse.data.timezone) ? parse.data.timezone! : DEFAULT_REMINDER_TIMEZONE;

    if (slotIndex > 1) {
      const existing = await prisma.reminder.findUnique({ where: { userId_slotIndex: { userId: session.userId, slotIndex } } });
      if (!existing || !existing.isUnlocked) {
        return Response.json({ error: `Slot #${slotIndex} is locked. Please unlock it first.` }, { status: 400 });
      }
    }

    let remindAt: Date | null = null;
    if (remindDate) {
      const [y, mo, d] = remindDate.split("-").map(Number);
      const [h, mi] = remindTime.split(":").map(Number);
      remindAt = zonedToUtc(y, mo, d, h || 0, mi || 0, timezone);
      if (isNaN(remindAt.getTime())) return Response.json({ error: "Invalid date or time." }, { status: 400 });
    }

    await prisma.reminder.upsert({
      where: { userId_slotIndex: { userId: session.userId, slotIndex } },
      create: { userId: session.userId, slotIndex, isUnlocked: true, note: note || null, remindAt, timezone, channel, isActive: Boolean(note && remindAt) },
      update: { note: note || null, remindAt, timezone, channel, isActive: Boolean(note && remindAt) },
    });

    return Response.json({ success: true, message: `Reminder for Slot #${slotIndex} saved!` });
  } catch (err: unknown) {
    console.error("Mobile reminder-save error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to save reminder." }, { status: 500 });
  }
}
