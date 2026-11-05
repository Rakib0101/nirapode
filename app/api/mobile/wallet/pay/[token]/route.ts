import { prisma } from "@/lib/prisma";
import { getMobileSession } from "@/lib/mobile-session";

// Mirrors app/pay/[token]/page.tsx. Unlike every other wallet endpoint, a
// session is optional here, not required — the web page is a shareable
// public link; an absent/invalid session just means isOwner is false and
// walletBalance is 0 (no wallet-pay option shown), matching web behavior.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const session = await getMobileSession(req);

    const checkout = await prisma.checkout.findUnique({
      where: { token },
      include: { items: true, user: { select: { fullName: true } } },
    });
    if (!checkout) return Response.json({ error: "Payment link not found." }, { status: 404 });

    const isOwner = session?.userId === checkout.userId;
    const wallet = isOwner ? await prisma.wallet.findUnique({ where: { userId: checkout.userId } }) : null;
    const expired = checkout.expiresAt != null && checkout.expiresAt < new Date();

    return Response.json({
      forName: checkout.user.fullName,
      status: checkout.status,
      expired,
      isOwner,
      adminNote: checkout.adminNote,
      walletBalance: wallet ? Number(wallet.balance) : 0,
      items: checkout.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
      subtotal: Number(checkout.subtotal),
      discountAmount: Number(checkout.discountAmount),
      totalAmount: Number(checkout.totalAmount),
    });
  } catch (err: unknown) {
    console.error("Mobile pay-by-token error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load payment link." }, { status: 500 });
  }
}
