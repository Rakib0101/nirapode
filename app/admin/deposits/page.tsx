import { prisma } from "@/lib/prisma";
import { ProcessDepositForm } from "./process-form";
import { StoredScreenshot } from "@/components/stored-screenshot";

async function getDeposits() {
  return prisma.depositRequest.findMany({
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

export default async function AdminDepositsPage() {
  const deposits = await getDeposits();
  const pending = deposits.filter((d) => d.status === "PENDING");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Deposit Requests</h1>
        <p className="text-sm text-muted-foreground">{pending.length} pending · {deposits.length} total</p>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Method</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Transaction ID</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deposits.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-foreground">{d.user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{d.user.email}</p>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-foreground">৳{Number(d.amount).toFixed(2)}</td>
                  <td className="px-4 py-3.5 text-xs">
                    {d.txId ? <p className="font-mono text-muted-foreground">{d.txId}</p> : <span className="text-muted-foreground">—</span>}
                    {d.screenshotUrl && (
                      <div className="mt-1">
                        <StoredScreenshot value={d.screenshotUrl} label="📎 Screenshot" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_STYLES[d.status]}`}>
                      {d.status}
                    </span>
                    {d.adminNote && <p className="text-[11px] text-muted-foreground mt-0.5 max-w-32 truncate">{d.adminNote}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                    {d.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3.5">
                    {d.status === "PENDING" && <ProcessDepositForm requestId={d.id} />}
                  </td>
                </tr>
              ))}
              {deposits.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No deposit requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
