import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { notifyAdmin } from "@/lib/notifications";
import { getBdtToPhpRate } from "@/lib/currency";
import { z } from "zod";

// GET returns what the withdraw form needs up front: current balance and the
// real GCASH BDT->PHP rate (an admin-configured SiteSetting, not a constant).
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const [wallet, gcashRate] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId: session.userId }, select: { balance: true } }),
      getBdtToPhpRate(),
    ]);

    return Response.json({ balance: Number(wallet?.balance ?? 0), gcashRate });
  } catch (err: unknown) {
    console.error("Mobile withdraw-info error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load withdrawal info." },
      { status: 500 }
    );
  }
}

// Mirrors app/actions/withdrawals.ts requestWithdrawalAction. Balance is only
// checked here, not deducted — that happens on admin approval.
const withdrawalSchema = z.object({
  amount: z.coerce.number().min(10, "Minimum withdrawal is ৳10"),
  paymentMethod: z.enum(["BANK_TRANSFER", "BKASH", "NAGAD", "ROCKET", "GCASH", "PAYNOW"]),
  accountNumber: z.string().min(4, "Enter a valid account/mobile number"),
  accountName: z.string().min(2, "Enter the account holder's name"),
});

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = withdrawalSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { amount, paymentMethod, accountNumber, accountName } = parse.data;

    const wallet = await prisma.wallet.findUnique({ where: { userId: session.userId } });
    if (!wallet || Number(wallet.balance) < amount) {
      return Response.json(
        { error: `Insufficient balance. Available: ৳${wallet ? Number(wallet.balance).toFixed(2) : "0.00"}.` },
        { status: 400 }
      );
    }

    await prisma.withdrawalRequest.create({
      data: { userId: session.userId, amount, paymentMethod, accountNumber, accountName, status: "PENDING" },
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

    await prisma.notification.create({
      data: {
        userId: session.userId,
        title: "Withdrawal request submitted",
        message: `Your withdrawal request of ৳${amount.toFixed(2)} has been submitted and is pending admin review.`,
        type: "WALLET",
      },
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile withdraw error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to submit withdrawal request." },
      { status: 500 }
    );
  }
}
