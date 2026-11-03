import { prisma } from "@/lib/prisma";

// Derives the transaction-client type generically from prisma.$transaction's
// own signature, since the generator doesn't export a named TransactionClient type.
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const PLATFORM_WALLET_ID = "platform";

// Company-wide revenue ledger — a single shared row, not tied to any one
// admin's personal login. Credited by creditCommission() (lib/commission.ts)
// using the admin-configured platform-cut rate per module, alongside
// whatever the referring agent earns on the same sale.
export async function creditPlatformWallet(
  tx: TxClient,
  { amount, description }: { amount: number; description: string }
): Promise<void> {
  if (amount <= 0) return;

  const wallet = await tx.platformWallet.upsert({
    where: { id: PLATFORM_WALLET_ID },
    update: {},
    create: { id: PLATFORM_WALLET_ID },
  });

  const newBalance = Number(wallet.balance) + amount;
  await tx.platformWallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });

  await tx.platformWalletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "COMMISSION",
      amount,
      description,
      balanceBefore: wallet.balance,
      balanceAfter: newBalance,
    },
  });
}

export async function getPlatformWalletSummary(): Promise<{
  balance: number;
  transactions: { id: string; amount: number; description: string; balanceAfter: number; createdAt: Date }[];
}> {
  const wallet = await prisma.platformWallet.findUnique({
    where: { id: PLATFORM_WALLET_ID },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
  });

  return {
    balance: wallet ? Number(wallet.balance) : 0,
    transactions: (wallet?.transactions ?? []).map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      description: t.description,
      balanceAfter: Number(t.balanceAfter),
      createdAt: t.createdAt,
    })),
  };
}
