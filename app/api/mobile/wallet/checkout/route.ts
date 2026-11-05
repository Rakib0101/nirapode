import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/checkout/page.tsx — truncates each checkout to its first
// item's description + a "+N more" count (the full-items view lives on the
// pay-by-token detail screen and the All History checkouts tab).
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const checkouts = await prisma.checkout.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    return Response.json({
      checkouts: checkouts.map((c) => ({
        id: c.id,
        token: c.token,
        description: c.items[0]?.description ?? "Checkout",
        extraCount: Math.max(0, c.items.length - 1),
        amount: Number(c.totalAmount),
        status: c.status,
        date: c.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile checkout-list error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load checkouts." }, { status: 500 });
  }
}
