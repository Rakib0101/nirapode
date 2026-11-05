import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { CREDIT_TX_TYPES, WALLET_TX_LABELS } from "@/lib/wallet-tx";

// Mirrors app/dashboard/page.tsx's getDashboardData() + its derived
// portfolioValue/totalShares math, reshaped into JSON. Labels/credit-flag
// for wallet transactions are resolved server-side via lib/wallet-tx.ts so
// the mobile app doesn't need to duplicate that mapping.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const userId = session.userId;

    const [user, wallet, ownerships, pendingPurchases, recentNotifications, pendingDeposits, pendingCheckouts] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, createdAt: true } }),
        prisma.wallet.findUnique({
          where: { userId },
          include: { transactions: { orderBy: { createdAt: "desc" }, take: 5 } },
        }),
        prisma.shareOwnership.findMany({
          where: { ownerId: userId },
          include: { project: { select: { name: true } } },
        }),
        prisma.sharePurchaseRequest.findMany({
          where: { buyerId: userId, status: "PENDING" },
          select: { id: true },
        }),
        prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.depositRequest.findMany({ where: { userId, status: "PENDING" }, select: { id: true } }),
        prisma.checkout.findMany({
          where: { userId, status: { in: ["AWAITING_PAYMENT", "REJECTED"] } },
          include: { items: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    if (!user) return Response.json({ error: "User not found." }, { status: 404 });

    const portfolioValue = ownerships.reduce((sum, o) => sum + Number(o.purchasePrice ?? 0) * o.quantity, 0);
    const totalShares = ownerships.reduce((sum, o) => sum + o.quantity, 0);

    return Response.json({
      fullName: user.fullName,
      memberSince: user.createdAt.toISOString(),
      walletBalance: Number(wallet?.balance ?? 0),
      pendingDepositsCount: pendingDeposits.length,
      portfolioValue,
      totalShares,
      projectCount: ownerships.length,
      pendingRequestsCount: pendingPurchases.length,
      pendingCheckouts: pendingCheckouts.map((c) => ({
        id: c.id,
        token: c.token,
        totalAmount: Number(c.totalAmount),
        items: c.items.map((i) => i.description),
      })),
      ownerships: ownerships.map((o) => ({
        id: o.id,
        projectName: o.project?.name ?? "Project",
        quantity: o.quantity,
        pricePerShare: Number(o.purchasePrice ?? 0),
      })),
      notifications: recentNotifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        date: n.createdAt.toISOString(),
        unread: !n.isRead,
      })),
      transactions: (wallet?.transactions ?? []).map((tx) => ({
        id: tx.id,
        label: WALLET_TX_LABELS[tx.type] ?? tx.type,
        description: tx.description,
        amount: Number(tx.amount),
        credit: CREDIT_TX_TYPES.has(tx.type),
        date: tx.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile dashboard error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load dashboard." },
      { status: 500 }
    );
  }
}
