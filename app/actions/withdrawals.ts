"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notifyAdmin } from "@/lib/notifications";
import { getBdtToPhpRate } from "@/lib/currency";

type ActionState = { error?: string; success?: boolean } | null;

const withdrawalSchema = z.object({
  amount: z.coerce.number().min(10, "Minimum withdrawal is ৳10"),
  paymentMethod: z.enum(["BANK_TRANSFER", "BKASH", "NAGAD", "ROCKET", "GCASH", "PAYNOW"]),
  accountNumber: z.string().min(4, "Enter a valid account/mobile number"),
  accountName: z.string().min(2, "Enter the account holder's name"),
});

export async function requestWithdrawalAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parse = withdrawalSchema.safeParse({
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod"),
    accountNumber: formData.get("accountNumber"),
    accountName: formData.get("accountName"),
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { amount, paymentMethod, accountNumber, accountName } = parse.data;

  const wallet = await prisma.wallet.findUnique({ where: { userId: session.userId } });
  if (!wallet || Number(wallet.balance) < amount) {
    return { error: `Insufficient balance. Available: ৳${wallet ? Number(wallet.balance).toFixed(2) : "0.00"}.` };
  }

  await prisma.withdrawalRequest.create({
    data: {
      userId: session.userId,
      amount,
      paymentMethod,
      accountNumber,
      accountName,
      status: "PENDING",
    },
  });

  const phpRate = paymentMethod === "GCASH" ? await getBdtToPhpRate() : null;
  const phpPayout = phpRate ? `₱${(amount * phpRate).toFixed(2)} PHP (Rate: 1 BDT = ${phpRate.toFixed(4)} PHP)` : null;

  await notifyAdmin({
    subject: `New withdrawal request — ৳${amount.toFixed(2)}${phpPayout ? ` (${phpPayout})` : ""}`,
    heading: "New Withdrawal Request",
    lines: [
      { label: "User", value: `${session.fullName} (${session.email})` },
      { label: "Amount", value: `৳${amount.toFixed(2)}` },
      ...(phpPayout ? [{ label: "Estimated GCash Payout", value: phpPayout }] : []),
      { label: "Payment", value: paymentMethod },
      { label: "Account", value: `${accountName} (${accountNumber})` },
    ],
    actionPath: "/admin/withdrawals",
  });

  revalidatePath("/wallet");
  return { success: true };
}
