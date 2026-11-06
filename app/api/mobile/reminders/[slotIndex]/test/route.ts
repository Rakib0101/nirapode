import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { deliverReminder } from "@/lib/reminders";

// Mirrors app/actions/reminders.ts triggerTestReminderAction — a manual test
// send that doesn't disarm the scheduled reminder.
export async function POST(req: Request, { params }: { params: Promise<{ slotIndex: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const slotIndex = Number((await params).slotIndex);
    const reminder = await prisma.reminder.findUnique({
      where: { userId_slotIndex: { userId: session.userId, slotIndex } },
      include: { user: true },
    });
    if (!reminder || !reminder.note) return Response.json({ error: "No note found in this reminder slot." }, { status: 400 });

    const { waSent } = await deliverReminder(reminder);
    await prisma.reminder.update({ where: { id: reminder.id }, data: { lastSentAt: new Date() } });

    return Response.json({ success: true, message: `Test reminder alert sent for Slot #${slotIndex}!`, waApiSuccess: waSent });
  } catch (err: unknown) {
    console.error("Mobile reminder-test error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to send test reminder." }, { status: 500 });
  }
}
