import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { CREDIT_TX_TYPES, WALLET_TX_LABELS } from "@/lib/wallet-tx";

// Mirrors app/history/page.tsx's 5 tabs. Shares merges SharePurchaseRequest
// (primary) and ShareTrade (secondary resale) into one list, same as the web
// page — ShareListing is fetched there too but never actually rendered
// (dead code on the web side), so it's skipped here.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const userId = session.userId;

    const [sharePurchases, shareTrades, taxiRequests, airTickets, wallet, checkouts] = await Promise.all([
      prisma.sharePurchaseRequest.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: "desc" },
        include: { project: { select: { name: true } } },
      }),
      prisma.shareTrade.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: "desc" },
        include: { listing: { include: { project: { select: { name: true } } } } },
      }),
      prisma.taxiRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { assignedVendor: true },
      }),
      prisma.airTicketRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.wallet.findUnique({
        where: { userId },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
      }),
      prisma.checkout.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    ]);

    const shares = [
      ...sharePurchases.map((p) => ({
        id: p.id,
        project: p.project.name,
        type: "Primary Purchase",
        qty: p.quantity,
        amount: Number(p.totalAmount),
        status: p.status,
        date: p.createdAt.toISOString(),
      })),
      ...shareTrades.map((t) => ({
        id: t.id,
        project: t.listing.project.name,
        type: "Secondary Resale",
        qty: t.quantity,
        amount: Number(t.totalAmount),
        status: t.status,
        date: t.createdAt.toISOString(),
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));

    return Response.json({
      shares,
      taxi: taxiRequests.map((t) => ({
        id: t.id,
        route: `${t.pickupLocation} → ${t.destination}`,
        date: t.date.toISOString(),
        passengers: t.passengerCount,
        driver: t.assignedVendor?.name ?? null,
        driverPhone: t.assignedVendor?.phone ?? null,
        fare: t.price != null ? Number(t.price) : null,
        status: t.status,
      })),
      air: airTickets.map((a) => ({
        id: a.id,
        route: `${a.origin} → ${a.destination}`,
        airline: a.preferredAirline ?? "Any",
        date: a.departDate.toISOString(),
        passengers: a.passengers,
        fare: a.price != null ? Number(a.price) : null,
        status: a.status,
        ticketUrl: a.ticketUrl ?? null,
      })),
      wallet: (wallet?.transactions ?? []).map((tx) => ({
        id: tx.id,
        type: WALLET_TX_LABELS[tx.type] ?? tx.type,
        description: tx.description,
        amount: Number(tx.amount),
        balanceAfter: Number(tx.balanceAfter),
        credit: CREDIT_TX_TYPES.has(tx.type),
        date: tx.createdAt.toISOString(),
      })),
      checkouts: checkouts.map((c) => ({
        id: c.id,
        token: c.token,
        items: c.items.map((i) => `${i.description} (${i.quantity}×)`),
        amount: Number(c.totalAmount),
        status: c.status,
        date: c.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile wallet-history error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load history." }, { status: 500 });
  }
}
