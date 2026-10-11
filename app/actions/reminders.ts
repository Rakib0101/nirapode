"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deliverReminder, sendDueReminders } from "@/lib/reminders";
import { zonedToUtc, DEFAULT_REMINDER_TIMEZONE, REMINDER_COUNTRIES } from "@/lib/timezones";

export async function getReminderSlotPrice(): Promise<number> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "reminder_slot_price" } });
    const val = row ? parseFloat(row.value) : 100;
    return isNaN(val) || val < 0 ? 100 : val;
  } catch {
    return 100;
  }
}

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function getRemindersDataAction() {
  const session = await requireUser();

  const [reminders, wallet, user, slotPrice] = await Promise.all([
    prisma.reminder.findMany({
      where: { userId: session.userId },
      orderBy: { slotIndex: "asc" },
    }),
    prisma.wallet.findUnique({
      where: { userId: session.userId },
      select: { balance: true },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, phone: true, fullName: true },
    }),
    getReminderSlotPrice(),
  ]);

  return {
    reminders,
    walletBalance: wallet ? Number(wallet.balance) : 0,
    slotPrice,
    user,
  };
}

export async function unlockSlotAction(slotIndex: number) {
  const session = await requireUser();
  const slotPrice = await getReminderSlotPrice();

  if (slotIndex < 2 || slotIndex > 10) {
    return { error: "Invalid slot number." };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: session.userId } });
      if (!wallet) throw new Error("Wallet not found.");
      if (Number(wallet.balance) < slotPrice) {
        throw new Error(`Insufficient wallet balance. You need at least ৳${slotPrice} to unlock Slot #${slotIndex}.`);
      }

      // Deduct from wallet
      const newBalance = Number(wallet.balance) - slotPrice;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

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

      // Upsert slot as unlocked
      await tx.reminder.upsert({
        where: {
          userId_slotIndex: { userId: session.userId, slotIndex },
        },
        create: {
          userId: session.userId,
          slotIndex,
          isUnlocked: true,
        },
        update: {
          isUnlocked: true,
        },
      });

      revalidatePath("/reminders");
      revalidatePath("/alarm");
      revalidatePath("/dashboard");
      return { success: true, message: `Slot #${slotIndex} unlocked successfully!` };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to unlock slot.";
    return { error: msg };
  }
}

export async function saveReminderAction(formData: FormData) {
  const session = await requireUser();

  const slotIndex = Number(formData.get("slotIndex"));
  const note = (formData.get("note") as string)?.trim();
  const dateStr = formData.get("remindAt") as string;
  const timeStr = (formData.get("remindTime") as string) || "09:00";
  const channel = (formData.get("channel") as string) || "WHATSAPP";
  const timezoneRaw = formData.get("timezone") as string | null;
  const timezone = REMINDER_COUNTRIES.some((c) => c.timezone === timezoneRaw) ? timezoneRaw! : DEFAULT_REMINDER_TIMEZONE;

  if (!slotIndex || slotIndex < 1 || slotIndex > 10) {
    return { error: "Invalid slot." };
  }

  // Ensure slot is unlocked (Slot 1 is always unlocked)
  if (slotIndex > 1) {
    const existing = await prisma.reminder.findUnique({
      where: { userId_slotIndex: { userId: session.userId, slotIndex } },
    });
    if (!existing || !existing.isUnlocked) {
      return { error: `Slot #${slotIndex} is locked. Please unlock it first.` };
    }
  }

  // The date/time inputs are wall-clock in the user's chosen country/timezone
  // (explicit selection, not the browser's own clock) — convert to the real
  // UTC instant using that zone's fixed offset.
  let remindAt: Date | null = null;
  if (dateStr) {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, mi] = timeStr.split(":").map(Number);
    remindAt = zonedToUtc(y, mo, d, h || 0, mi || 0, timezone);
    if (isNaN(remindAt.getTime())) return { error: "Invalid date or time." };
  }

  await prisma.reminder.upsert({
    where: {
      userId_slotIndex: { userId: session.userId, slotIndex },
    },
    create: {
      userId: session.userId,
      slotIndex,
      isUnlocked: true,
      note: note || null,
      remindAt,
      timezone,
      channel,
      isActive: Boolean(note && remindAt),
    },
    update: {
      note: note || null,
      remindAt,
      timezone,
      channel,
      isActive: Boolean(note && remindAt),
    },
  });

  revalidatePath("/reminders");
  revalidatePath("/alarm");
  return { success: true, message: `Reminder for Slot #${slotIndex} saved!` };
}

export async function triggerTestReminderAction(slotIndex: number) {
  const session = await requireUser();

  const reminder = await prisma.reminder.findUnique({
    where: { userId_slotIndex: { userId: session.userId, slotIndex } },
    include: { user: true },
  });

  if (!reminder || !reminder.note) {
    return { error: "No note found in this reminder slot." };
  }


  // Manual test send — doesn't disarm the scheduled reminder.
  const { waSent } = await deliverReminder(reminder);

  await prisma.reminder.update({
    where: { id: reminder.id },
    data: { lastSentAt: new Date() },
  });

  revalidatePath("/reminders");
  revalidatePath("/alarm");
  return { success: true, message: `Test reminder alert sent for Slot #${slotIndex}!`, waApiSuccess: waSent };
}

// Admin: send all due reminders immediately (same as the scheduled job).
export async function runDueRemindersAction(): Promise<{ error?: string; message?: string }> {
  const session = await requireUser();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.role)) return { error: "Unauthorized." };
  const { due, sent } = await sendDueReminders();
  return { message: due === 0 ? "No reminders are due right now." : `Sent ${sent} of ${due} due reminder(s).` };
}
