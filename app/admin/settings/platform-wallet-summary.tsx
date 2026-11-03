type Transaction = { id: string; amount: number; description: string; balanceAfter: number; createdAt: Date };

type Props = { balance: number; transactions: Transaction[] };

export function PlatformWalletSummary({ balance, transactions }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border px-4 py-3.5">
        <p className="text-sm font-medium text-muted-foreground">Total Platform Commission Earned</p>
        <p className="text-lg font-bold text-foreground">৳{balance.toFixed(2)}</p>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No platform commission recorded yet — set a nonzero rate below to start tracking.
        </p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border max-h-80 overflow-y-auto">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{t.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(t.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <p className="text-sm font-semibold text-green-600 shrink-0">+৳{t.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
