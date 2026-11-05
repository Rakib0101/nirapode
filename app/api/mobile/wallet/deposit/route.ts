import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { notifyAdmin } from "@/lib/notifications";
import { z } from "zod";

// Mirrors app/actions/deposits.ts requestDepositAction.
const depositSchema = z.object({
  amount: z.coerce.number().min(10, "Minimum deposit is ৳10"),
  paymentMethod: z.enum(["BANK_TRANSFER", "BKASH", "NAGAD", "ROCKET", "GCASH", "PAYNOW"]),
  txId: z.string().optional(),
  screenshotUrl: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = depositSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { amount, paymentMethod, txId, screenshotUrl } = parse.data;

    if (!txId && !screenshotUrl) {
      return Response.json(
        { error: "Please provide a transaction ID or upload a payment screenshot." },
        { status: 400 }
      );
    }

    if (txId) {
      const existing = await prisma.depositRequest.findFirst({
        where: { userId: session.userId, txId, status: "PENDING" },
      });
      if (existing) {
        return Response.json({ error: "A deposit with this transaction ID is already pending." }, { status: 409 });
      }
    }

    await prisma.depositRequest.create({
      data: {
        userId: session.userId,
        amount,
        paymentMethod,
        txId: txId ?? "",
        screenshotUrl: screenshotUrl ?? null,
        status: "PENDING",
      },
    });

    await notifyAdmin({
      subject: `New deposit request — ৳${amount.toFixed(2)}`,
      heading: "New Deposit Request",
      lines: [
        { label: "User", value: `${session.fullName} (${session.email})` },
        { label: "Amount", value: `৳${amount.toFixed(2)}` },
        { label: "Payment", value: paymentMethod },
      ],
      actionPath: "/admin/deposits",
    });

    await prisma.notification.create({
      data: {
        userId: session.userId,
        title: "Deposit request submitted",
        message: `Your deposit request of ৳${amount.toFixed(2)} has been submitted and is pending admin review.`,
        type: "WALLET",
      },
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile deposit error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to submit deposit request." },
      { status: 500 }
    );
  }
}
