import { prisma } from "@/lib/prisma";
import { getBdtToPhpRate } from "@/lib/currency";
import { ProcessWithdrawalForm } from "./process-form";
import { ScreenshotViewerModal } from "@/components/screenshot-modal";

async function getWithdrawals() {
  return prisma.withdrawalRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { fullName: true, email: true } } },
  });
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  GCASH: "GCash",
  PAYNOW: "PayNow",
};

export default async function AdminWithdrawalsPage() {
  const [withdrawals, phpRate] = await Promise.all([
    getWithdrawals(),
    getBdtToPhpRate(),
  ]);
  const pending = withdrawals.filter((w) => w.status === "PENDING");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Withdrawal Requests</h1>
        <p className="text-sm text-muted-foreground">{pending.length} pending · {withdrawals.length} total</p>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Method</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Account</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-foreground">{w.user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{w.user.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-foreground">৳{Number(w.amount).toFixed(2)}</p>
                    {w.paymentMethod === "GCASH" && phpRate && (
                      <p className="text-[11px] font-semibold text-emerald-600 font-mono mt-0.5">
                        ≈ ₱{(Number(w.amount) * phpRate).toFixed(2)} PHP
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{METHOD_LABELS[w.paymentMethod] ?? w.paymentMethod}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-mono text-xs text-foreground">{w.accountNumber}</p>
                    <p className="text-xs text-muted-foreground">{w.accountName}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_STYLES[w.status]}`}>
                      {w.status}
                    </span>
                    {w.adminTxId && <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Trx: {w.adminTxId}</p>}
                    {w.adminProofUrl && (
                      <div className="mt-1">
                        <ScreenshotViewerModal url={w.adminProofUrl} label="📎 Payout Slip" />
                      </div>
                    )}
                    {w.adminNote && <p className="text-[11px] text-muted-foreground mt-0.5 max-w-32 truncate">{w.adminNote}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                    {w.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3.5">
                    {w.status === "PENDING" && <ProcessWithdrawalForm requestId={w.id} />}
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No withdrawal requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
