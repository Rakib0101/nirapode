import { prisma } from "@/lib/prisma";
import { notifyAdmin } from "@/lib/notifications";
import { z } from "zod";

// Mirrors app/actions/checkout.ts submitCheckoutPaymentAction exactly,
// including its lack of an auth/ownership check — on the web this is a
// public, shareable link, so no WALLET method (that's the instant-pay path,
// not manual proof) and no requirement that the submitter own the checkout.
const proofSchema = z.object({
  paymentMethod: z.enum(["BANK_TRANSFER", "BKASH", "NAGAD", "ROCKET", "GCASH", "PAYNOW"]),
  txId: z.string().optional(),
  screenshotUrl: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json();
    const parse = proofSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { paymentMethod, txId, screenshotUrl } = parse.data;
    if (!txId && !screenshotUrl) {
      return Response.json({ error: "Please provide a transaction ID or upload a payment screenshot." }, { status: 400 });
    }

    const checkout = await prisma.checkout.findUnique({
      where: { token },
      include: { user: { select: { fullName: true, email: true } } },
    });
    if (!checkout) return Response.json({ error: "Checkout not found." }, { status: 404 });
    if (checkout.status !== "AWAITING_PAYMENT" && checkout.status !== "REJECTED") {
      return Response.json({ error: "This checkout is not awaiting payment." }, { status: 400 });
    }
    if (checkout.expiresAt && checkout.expiresAt < new Date()) {
      return Response.json({ error: "This payment link has expired. Please contact us for a new one." }, { status: 400 });
    }

    await prisma.checkout.update({
      where: { token },
      data: { paymentMethod, txId: txId ?? null, screenshotUrl: screenshotUrl ?? null, status: "PROOF_SUBMITTED", adminNote: null },
    });

    await notifyAdmin({
      subject: `Payment submitted for checkout — ৳${Number(checkout.totalAmount).toFixed(2)}`,
      heading: "Checkout Payment Submitted",
      lines: [
        { label: "Customer", value: `${checkout.user.fullName} (${checkout.user.email})` },
        { label: "Amount", value: `৳${Number(checkout.totalAmount).toFixed(2)}` },
        { label: "Payment Method", value: paymentMethod },
        ...(txId ? [{ label: "Transaction ID", value: txId }] : []),
      ],
      actionPath: "/admin/checkouts",
    });

    await prisma.notification.create({
      data: {
        userId: checkout.userId,
        title: "Payment proof submitted",
        message: `Your payment proof of ৳${Number(checkout.totalAmount).toFixed(2)} has been submitted and is pending admin review.`,
        type: "SYSTEM",
      },
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile checkout-proof error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to submit payment proof." }, { status: 500 });
  }
}
