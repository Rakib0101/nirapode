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

// Mirrors app/actions/reminders.ts unlockSlotAction, with one deliberate fix:
// the web action re-charges the wallet every time this is called even if the
// slot is already unlocked (no idempotency guard) — reproduced live via a
// double-tap during testing. Guarded here so a repeat call is a safe no-op.
export async function POST(req: Request, { params }: { params: Promise<{ slotIndex: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const slotIndex = Number((await params).slotIndex);
    if (!Number.isInteger(slotIndex) || slotIndex < 2 || slotIndex > 10) {
      return Response.json({ error: "Invalid slot number." }, { status: 400 });
    }

    const slotPrice = await getReminderSlotPrice();

    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.reminder.findUnique({ where: { userId_slotIndex: { userId: session.userId, slotIndex } } });
        if (existing?.isUnlocked) {
          return { message: `Slot #${slotIndex} is already unlocked.` };
        }

        const wallet = await tx.wallet.findUnique({ where: { userId: session.userId } });
        if (!wallet) throw new Error("Wallet not found.");
        if (Number(wallet.balance) < slotPrice) {
          throw new Error(`Insufficient wallet balance. You need at least ৳${slotPrice} to unlock Slot #${slotIndex}.`);
        }

        const newBalance = Number(wallet.balance) - slotPrice;
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "SERVICE_FEE",
            amount: slotPrice,
            description: `Unlocked Reminder Alarm Slot #${slotIndex}`,
            balanceBefore: wallet.balance,
            balanceAfter: newBalance,
          },
        });
        await tx.reminder.upsert({
          where: { userId_slotIndex: { userId: session.userId, slotIndex } },
          create: { userId: session.userId, slotIndex, isUnlocked: true },
          update: { isUnlocked: true },
        });

        return { message: `Slot #${slotIndex} unlocked successfully!` };
      },
      { timeout: 15000 }
    );

    return Response.json({ success: true, message: result.message });
  } catch (err: unknown) {
    console.error("Mobile reminder-unlock error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to unlock slot." }, { status: 400 });
  }
}
