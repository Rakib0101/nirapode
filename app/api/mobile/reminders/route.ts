import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/actions/reminders.ts getReminderSlotPrice.
async function getReminderSlotPrice(): Promise<number> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "reminder_slot_price" } });
    const val = row ? parseFloat(row.value) : 100;
    return isNaN(val) || val < 0 ? 100 : val;
  } catch {
    return 100;
  }
}

// Mirrors app/reminders/page.tsx + getRemindersDataAction — builds the full
// 10-slot grid (slot 1 is always unlocked/free) from whatever rows exist.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const [reminders, wallet, slotPrice] = await Promise.all([
      prisma.reminder.findMany({ where: { userId: session.userId }, orderBy: { slotIndex: "asc" } }),
      prisma.wallet.findUnique({ where: { userId: session.userId }, select: { balance: true } }),
      getReminderSlotPrice(),
    ]);

    const slots = Array.from({ length: 10 }, (_, i) => {
      const slotIndex = i + 1;
      const existing = reminders.find((r) => r.slotIndex === slotIndex);
      return {
        slotIndex,
        isUnlocked: slotIndex === 1 ? true : (existing?.isUnlocked ?? false),
        note: existing?.note ?? null,
        remindAt: existing?.remindAt ? existing.remindAt.toISOString() : null,
        timezone: existing?.timezone ?? null,
        channel: existing?.channel ?? "WHATSAPP",
        isActive: existing?.isActive ?? false,
        lastSentAt: existing?.lastSentAt ? existing.lastSentAt.toISOString() : null,
      };
    });

    return Response.json({ slots, walletBalance: wallet ? Number(wallet.balance) : 0, slotPrice });
  } catch (err: unknown) {
    console.error("Mobile reminders error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load reminders." }, { status: 500 });
  }
}
