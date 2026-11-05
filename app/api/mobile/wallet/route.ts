import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { CREDIT_TX_TYPES, WALLET_TX_LABELS } from "@/lib/wallet-tx";

// Mirrors app/wallet/page.tsx. Pending counts are computed from the 5 most
// recently fetched deposits/withdrawals, same as the web page — not a true
// total count, but that's existing web behavior, not a mobile-specific bug.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const [wallet, deposits, withdrawals] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId: session.userId },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
      }),
      prisma.depositRequest.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.withdrawalRequest.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    return Response.json({
      balance: Number(wallet?.balance ?? 0),
      pendingDepositsCount: deposits.filter((d) => d.status === "PENDING").length,
      pendingWithdrawalsCount: withdrawals.filter((w) => w.status === "PENDING").length,
      transactions: (wallet?.transactions ?? []).map((tx) => ({
        id: tx.id,
        label: WALLET_TX_LABELS[tx.type] ?? tx.type,
        description: tx.description,
        amount: Number(tx.amount),
        credit: CREDIT_TX_TYPES.has(tx.type),
        date: tx.createdAt.toISOString(),
      })),
      deposits: deposits.map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        method: d.paymentMethod,
        txId: d.txId,
        status: d.status,
        date: d.createdAt.toISOString(),
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        method: w.paymentMethod,
        accountNumber: w.accountNumber,
        status: w.status,
        date: w.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile wallet error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load wallet." }, { status: 500 });
  }
}
