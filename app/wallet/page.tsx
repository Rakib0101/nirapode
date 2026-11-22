import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CREDIT_TX_TYPES, WALLET_TX_LABELS } from "@/lib/wallet-tx";

async function getWalletData(userId: string) {
  const [wallet, deposits, withdrawals] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    prisma.depositRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  return { wallet, deposits, withdrawals };
}

const DEPOSIT_STATUS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function WalletPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { wallet, deposits, withdrawals } = await getWalletData(session.userId);
  const balance = wallet ? Number(wallet.balance) : 0;

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/dashboard" className="hover:text-brand transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">My Wallet</span>
        </div>

        {/* Balance card */}
        <div className="bg-linear-to-br from-brand to-brand-dark rounded-2xl p-7 mb-6 text-white">
          <p className="text-sm font-medium text-white/70 mb-1">Available Balance</p>
          <p className="text-4xl font-bold">৳{balance.toFixed(2)}</p>
          <p className="text-xs text-white/60 mt-1">Singapore Dollar</p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link
              href="/dashboard/deposit"
              className="inline-block bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              + Deposit Funds
            </Link>
            <Link
              href="/dashboard/withdraw"
              className="inline-block bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl border border-white/30 transition-colors"
            >
              Withdraw
            </Link>
            <Link
              href="/wallet/send"
              className="inline-block bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl border border-white/30 transition-colors"
            >
              Send to User
            </Link>
          </div>
        </div>

        {/* Pending deposit requests */}
        {deposits.filter((d) => d.status === "PENDING").length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
            <p className="text-sm font-semibold text-amber-800">
              {deposits.filter((d) => d.status === "PENDING").length} deposit request(s) pending admin approval
            </p>
          </div>
        )}

        {/* Pending withdrawal requests */}
        {withdrawals.filter((w) => w.status === "PENDING").length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
            <p className="text-sm font-semibold text-amber-800">
              {withdrawals.filter((w) => w.status === "PENDING").length} withdrawal request(s) pending admin approval
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transactions */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Transaction History</h2>
            </div>
            {!wallet || wallet.transactions.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                No transactions yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {wallet.transactions.map((tx) => (
                  <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${CREDIT_TX_TYPES.has(tx.type) ? "bg-green-50" : "bg-red-50"}`}>
                        <svg className={`w-4 h-4 ${CREDIT_TX_TYPES.has(tx.type) ? "text-green-600" : "text-red-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d={CREDIT_TX_TYPES.has(tx.type)
                              ? "M12 4v16m8-8H4"
                              : "M20 12H4"} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{WALLET_TX_LABELS[tx.type] ?? tx.type}</p>
                        <p className="text-xs text-muted-foreground">{tx.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${CREDIT_TX_TYPES.has(tx.type) ? "text-green-600" : "text-red-600"}`}>
                        {CREDIT_TX_TYPES.has(tx.type) ? "+" : "−"}৳{Number(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deposit history */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Deposit Requests</h2>
              <Link href="/dashboard/deposit" className="text-xs text-brand font-medium hover:underline">
                + New Deposit
              </Link>
            </div>
            {deposits.length === 0 ? (
              <div className="px-6 py-10 text-center text-muted-foreground text-sm">
                No deposit requests yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Amount</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Method</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">TXN ID</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deposits.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="px-6 py-3 font-bold text-foreground">৳{Number(d.amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{d.paymentMethod.replace("_", " ")}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.txId}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${DEPOSIT_STATUS[d.status]}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {d.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Withdrawal history */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Withdrawal Requests</h2>
              <Link href="/dashboard/withdraw" className="text-xs text-brand font-medium hover:underline">
                + New Withdrawal
              </Link>
            </div>
            {withdrawals.length === 0 ? (
              <div className="px-6 py-10 text-center text-muted-foreground text-sm">
                No withdrawal requests yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Amount</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Method</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Account</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-muted/30">
                        <td className="px-6 py-3 font-bold text-foreground">৳{Number(w.amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{w.paymentMethod.replace("_", " ")}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{w.accountNumber}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${DEPOSIT_STATUS[w.status]}`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {w.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
