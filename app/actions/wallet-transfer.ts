"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { creditWallet, debitWallet, getTransferFeeSetting } from "@/lib/wallet";
import { computeTransferFee } from "@/lib/wallet-tx";
import { notifyUser } from "@/lib/notifications";

type ActionState = { error?: string; success?: boolean; message?: string } | null;

const transferSchema = z.object({
  recipient: z.string().trim().min(3, "Enter the recipient's email or phone number"),
  amount: z.coerce.number().min(1, "Minimum transfer is ৳1"),
  note: z.string().trim().max(200, "Note is too long").optional(),
  password: z.string().min(1, "Enter your password or PIN to confirm"),
});

async function findRecipient(identifier: string) {
  const select = { id: true, fullName: true, email: true, phone: true, isActive: true } as const;
  if (identifier.includes("@")) {
    return prisma.user.findFirst({ where: { email: { equals: identifier, mode: "insensitive" } }, select });
  }
  const matches = await prisma.user.findMany({ where: { phone: identifier }, select, take: 2 });
  // A phone number shared by two accounts is ambiguous — make the sender use email.
  return matches.length === 1 ? matches[0] : null;
}

export async function sendMoneyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parse = transferSchema.safeParse({
    recipient: formData.get("recipient"),
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
    password: formData.get("password"),
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  const { recipient: identifier, note, password } = parse.data;
  const amount = Math.round(parse.data.amount * 100) / 100;

  const sender = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true, pinHash: true, email: true, phone: true },
  });
  if (!sender?.passwordHash && !sender?.pinHash) {
    return { error: "Set a password or PIN on your account before sending money." };
  }
  // PIN and password are separate credentials now — accept either one.
  const matchesPassword = sender.passwordHash ? await bcrypt.compare(password, sender.passwordHash) : false;
  const matchesPin = sender.pinHash ? await bcrypt.compare(password, sender.pinHash) : false;
  if (!matchesPassword && !matchesPin) {
    return { error: "Incorrect password or PIN." };
  }

  const recipient = await findRecipient(identifier);
  if (!recipient || !recipient.isActive) {
    return { error: "No active account found with that email or phone number." };
  }
  if (recipient.id === session.userId) {
    return { error: "You can't send money to yourself." };
  }

  const fee = computeTransferFee(await getTransferFeeSetting(), amount);
  const noteSuffix = note ? ` — "${note}"` : "";

  try {
    await prisma.$transaction(async (tx) => {
      const transfer = await tx.walletTransfer.create({
        data: { senderId: session.userId, recipientId: recipient.id, amount, fee, note: note ?? null },
      });

      // Checked up front only for a clearer message — debitWallet is the real
      // guard, and any failure below rolls the whole transfer back.
      const wallet = await tx.wallet.findUnique({ where: { userId: session.userId }, select: { balance: true } });
      if (!wallet || Number(wallet.balance) < amount + fee) {
        throw new Error(
          `Insufficient balance. You need ৳${(amount + fee).toFixed(2)}${fee > 0 ? ` (incl. ৳${fee.toFixed(2)} fee)` : ""}, available ৳${Number(wallet?.balance ?? 0).toFixed(2)}.`
        );
      }

      await debitWallet(tx, {
        userId: session.userId,
        amount,
        type: "TRANSFER_SENT",
        description: `Sent to ${recipient.fullName}${noteSuffix}`,
        referenceId: transfer.id,
      });
      if (fee > 0) {
        await debitWallet(tx, {
          userId: session.userId,
          amount: fee,
          type: "TRANSFER_FEE",
          description: `Fee for transfer to ${recipient.fullName}`,
          referenceId: transfer.id,
        });
      }
      await creditWallet(tx, {
        userId: recipient.id,
        amount,
        type: "TRANSFER_RECEIVED",
        description: `Received from ${session.fullName}${noteSuffix}`,
        referenceId: transfer.id,
      });

      await tx.notification.createMany({
        data: [
          {
            userId: recipient.id,
            title: "Money received",
            message: `${session.fullName} sent you ৳${amount.toFixed(2)}.${note ? ` Note: ${note}` : ""}`,
            type: "WALLET",
          },
          {
            userId: session.userId,
            title: "Money sent",
            message: `You sent ৳${amount.toFixed(2)} to ${recipient.fullName}${fee > 0 ? ` (fee ৳${fee.toFixed(2)})` : ""}.`,
            type: "WALLET",
          },
        ],
      });
    });
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Transfer failed. Please try again." };
  }

  await notifyUser({
    to: recipient.email,
    phone: recipient.phone,
    subject: "Money received",
    heading: "Money Received",
    message: `${session.fullName} sent you ৳${amount.toFixed(2)}.${note ? ` Note: ${note}` : ""}`,
  });

  await notifyUser({
    to: sender.email,
    phone: sender.phone,
    subject: "Money sent",
    heading: "Money Sent",
    message: `You sent ৳${amount.toFixed(2)} to ${recipient.fullName}${fee > 0 ? ` (fee ৳${fee.toFixed(2)})` : ""}.`,
  });

  revalidatePath("/wallet");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  return {
    success: true,
    message: `৳${amount.toFixed(2)} sent to ${recipient.fullName}${fee > 0 ? ` (fee ৳${fee.toFixed(2)})` : ""}.`,
  };
}
