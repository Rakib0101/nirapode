import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { CREDIT_TX_TYPES, WALLET_TX_LABELS } from "@/lib/wallet-tx";

// The app's bell screen: latest notifications plus the latest wallet
// transactions (both used to be lists on the Home screen). Same data as the
// website's navbar bell (app/actions/notifications.ts).
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();
    const userId = session.userId;

    const [notifications, unread, transactions] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.walletTransaction.findMany({
        where: { wallet: { userId } },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
    ]);

    return Response.json({
      unread,
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        date: n.createdAt.toISOString(),
        unread: !n.isRead,
      })),
      transactions: transactions.map((tx) => ({
        id: tx.id,
        label: WALLET_TX_LABELS[tx.type] ?? tx.type,
        description: tx.description,
        amount: Number(tx.amount),
        credit: CREDIT_TX_TYPES.has(tx.type),
        date: tx.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile notifications error:", err);
    return Response.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}

// Opening the bell screen marks everything read, same as on the website.
export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();
    await prisma.notification.updateMany({
      where: { userId: session.userId, isRead: false },
      data: { isRead: true },
    });
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile mark notifications read error:", err);
    return Response.json({ error: "Could not update notifications." }, { status: 500 });
  }
}
