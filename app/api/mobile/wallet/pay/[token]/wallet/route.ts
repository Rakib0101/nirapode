import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { creditCommission } from "@/lib/commission";
import { notifyUser } from "@/lib/notifications";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Shared with app/actions/checkout.ts settleCheckoutPaid — ported as-is
// (not imported, since the original isn't exported) because it carries
// non-obvious business logic: flips linked taxi/air-ticket/service bookings
// to their next status and credits the referring agent's commission.
async function settleCheckoutPaid(tx: TxClient, checkoutId: string) {
  const checkout = await tx.checkout.update({
    where: { id: checkoutId },
    data: { status: "PAID", processedById: null, processedAt: new Date() },
    include: {
      user: { select: { email: true, phone: true } },
      items: {
        include: {
          taxiRequest: { select: { referredById: true } },
          airTicketRequest: { select: { referredById: true } },
          serviceRequest: { select: { referredById: true } },
        },
      },
    },
  });

  for (const item of checkout.items) {
    if (item.taxiRequestId) {
      await tx.taxiRequest.update({ where: { id: item.taxiRequestId }, data: { status: "CONFIRMED" } });
    }
    if (item.airTicketRequestId) {
      await tx.airTicketRequest.update({ where: { id: item.airTicketRequestId }, data: { status: "CONFIRMED" } });
    }
    if (item.serviceRequestId) {
      await tx.serviceRequest.update({ where: { id: item.serviceRequestId }, data: { status: "IN_PROGRESS" } });
    }

    const referredById =
      item.taxiRequest?.referredById ?? item.airTicketRequest?.referredById ?? item.serviceRequest?.referredById ?? null;
    const commissionModule = item.taxiRequestId ? "TAXI" : item.airTicketRequestId ? "AIR_TICKET" : item.serviceRequestId ? "SERVICE" : null;
    if (referredById && commissionModule) {
      await creditCommission(tx, {
        referredById,
        amount: Number(item.lineTotal),
        description: item.description,
        module: commissionModule,
      });
    }
  }

  await tx.notification.create({
    data: {
      userId: checkout.userId,
      title: "Payment received",
      message: `Your payment of ৳${Number(checkout.totalAmount).toFixed(2)} has been confirmed. Your booking(s) are now confirmed.`,
      type: "SYSTEM",
    },
  });

  return checkout;
}

// Mirrors app/actions/checkout.ts payCheckoutWithWalletAction.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { token } = await params;

    const checkout = await prisma.checkout.findUnique({ where: { token } });
    if (!checkout) return Response.json({ error: "Checkout not found." }, { status: 404 });
    if (checkout.userId !== session.userId) {
      return Response.json({ error: "This checkout doesn't belong to your account." }, { status: 403 });
    }
    if (checkout.status !== "AWAITING_PAYMENT" && checkout.status !== "REJECTED") {
      return Response.json({ error: "This checkout is not awaiting payment." }, { status: 400 });
    }
    if (checkout.expiresAt && checkout.expiresAt < new Date()) {
      return Response.json({ error: "This payment link has expired. Please contact us for a new one." }, { status: 400 });
    }

    const amount = Number(checkout.totalAmount);
    let settledCheckout: Awaited<ReturnType<typeof settleCheckoutPaid>> | null = null;

    // Default 5s Prisma transaction timeout is too tight here — this does a
    // per-checkout-item loop (booking status flip + a full referral-
    // commission wallet credit each) plus a notification write, all as
    // sequential round trips. Hit it reproducibly in dev against the
    // Supabase pooler; bumped it rather than risk a half-settled checkout
    // under any real latency spike.
    try {
      await prisma.$transaction(
        async (tx) => {
          const wallet = await tx.wallet.findUnique({ where: { userId: session.userId } });
          if (!wallet) throw new Error("Wallet not found.");
          const balanceBefore = Number(wallet.balance);
          if (balanceBefore < amount) {
            throw new Error(
              `Insufficient wallet balance. You need ৳${amount.toFixed(2)} but have ৳${balanceBefore.toFixed(2)}. Deposit funds first.`
            );
          }
          const balanceAfter = balanceBefore - amount;

          await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: "CHECKOUT_PAYMENT",
              amount,
              description: `Checkout payment — ${checkout.token}`,
              balanceBefore,
              balanceAfter,
            },
          });
          await tx.checkout.update({
            where: { id: checkout.id },
            data: { paymentMethod: "WALLET", txId: null, screenshotUrl: null, adminNote: null },
          });
          settledCheckout = await settleCheckoutPaid(tx, checkout.id);
        },
        { timeout: 15000 }
      );
    } catch (err: unknown) {
      return Response.json({ error: err instanceof Error ? err.message : "Payment failed." }, { status: 400 });
    }

    if (settledCheckout) {
      const settled: Awaited<ReturnType<typeof settleCheckoutPaid>> = settledCheckout;
      await notifyUser({
        to: settled.user.email,
        phone: settled.user.phone,
        subject: "Payment received — booking confirmed",
        heading: "Payment Received",
        message: `Your payment of ৳${Number(settled.totalAmount).toFixed(2)} has been confirmed. Your booking(s) are now confirmed.`,
      });
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile wallet-pay error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Payment failed." }, { status: 500 });
  }
}
