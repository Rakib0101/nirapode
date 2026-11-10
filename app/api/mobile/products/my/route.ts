import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// The customer's own product orders. The web has no equivalent page yet —
// orders surface there through the admin-issued checkout invoice — but on
// mobile people expect to see what they've ordered, so this backs a
// "My Orders" screen.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const orders = await prisma.productOrder.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, imageUrl: true } } },
    });

    return Response.json({
      orders: orders.map((o) => ({
        id: o.id,
        product: o.product.name,
        imageUrl: o.product.imageUrl,
        quantity: o.quantity,
        unitPrice: Number(o.unitPrice),
        totalAmount: Number(o.totalAmount),
        status: o.status,
        adminNote: o.adminNote,
        date: o.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile my-orders error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load your orders." }, { status: 500 });
  }
}
