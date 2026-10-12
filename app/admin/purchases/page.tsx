import { prisma } from "@/lib/prisma";
import { getCommissionSetting, computeCommissionAmount, getShare4AdminCutPercent } from "@/lib/commission";
import { getShareAdminCutPercent } from "@/lib/commission";
import { getShareSgdRate } from "@/lib/share-pricing";
import { ProcessPurchaseForm } from "./process-form";
import { ScreenshotViewerModal } from "@/components/screenshot-modal";
import { ResellActions } from "@/app/admin/shares/resell-actions";

async function getPurchaseRequests() {
  return prisma.sharePurchaseRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      buyer: { select: { fullName: true, email: true, nidNumber: true } },
      project: { select: { name: true, sharePriceSgd: true } },
      referredBy: { select: { fullName: true } },
    },
  });
}

async function getPendingBuyRequests() {
  return prisma.shareBuyRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      buyer: { select: { fullName: true, email: true, phone: true } },
      referredBy: { select: { fullName: true } },
    },
  });
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank",
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  GCASH: "GCash",
  PAYNOW: "PayNow",
  WALLET: "Wallet",
};

export default async function AdminPurchasesPage() {
  const [requests, shareCommission, adminCutPercent, pendingBuyRequests, share4Rate, share4Commission, share4AdminCutPercent] = await Promise.all([
    getPurchaseRequests(),
    getCommissionSetting("SHARE"),
    getShareAdminCutPercent(),
    getPendingBuyRequests(),
    getShareSgdRate(),
    getCommissionSetting("SHARE_BUY_REQUEST"),
    getShare4AdminCutPercent(),
  ]);
  const pending = requests.filter((r) => r.status === "PENDING");

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Requests</h1>
          <p className="text-sm text-muted-foreground">
            {pending.length} pending · {requests.length} total · {pendingBuyRequests.length} pending buy requests
          </p>
        </div>
      </div>

      {/* Pending buy requests — Share 4, general requests not tied to a project */}
      {pendingBuyRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-purple-50">
            <h2 className="font-semibold text-purple-800">
              Pending Buy Requests ({pendingBuyRequests.length})
            </h2>
            <p className="text-xs text-purple-700 mt-0.5">General requests to buy shares, not tied to a specific project</p>
          </div>
          <div className="divide-y divide-border">
            {pendingBuyRequests.map((r) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Buyer: {r.buyer.fullName} · {r.buyer.email} · {r.buyer.phone}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span>Share #: <strong className="text-foreground font-mono">{r.shareNumber}</strong></span>
                      <span>Size: <strong className="text-foreground">{r.size}</strong></span>
                      <span>Offered: <strong className="text-foreground">৳{Number(r.price).toFixed(2)}</strong> <span className="text-muted-foreground font-normal">(~${(Number(r.price) / Number(r.sgdRate ?? share4Rate)).toFixed(2)} SGD)</span></span>
                      <span>Preferred Date: <strong className="text-foreground">{r.preferredDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong></span>
                    </div>
                    <p className="text-xs mt-1.5">
                      {r.referredBy ? (
                        <span className="text-foreground">
                          Agent <span className="text-muted-foreground">({r.referredBy.fullName})</span>: <strong>৳{computeCommissionAmount(share4Commission, Number(r.price)).toFixed(2)}</strong>
                          <span className="text-muted-foreground"> ({share4Commission.mode === "PERCENTAGE" ? `${share4Commission.value}%` : `flat ৳${share4Commission.value}`})</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No referring agent</span>
                      )}
                      {share4AdminCutPercent > 0 && (
                        <span className="text-foreground">
                          {" · "}Platform: <strong>৳{(Number(r.price) * (share4AdminCutPercent / 100)).toFixed(2)}</strong>
                          <span className="text-muted-foreground"> ({share4AdminCutPercent}%)</span>
                        </span>
                      )}
                    </p>
                  </div>
                  <ResellActions buyRequestId={r.id} type="buyRequest" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-base font-semibold text-foreground">Share Purchase Requests</h2>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">Buyer</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Project</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Shares</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Commission Split</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Payment</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-foreground">{r.buyer.fullName}</p>
                    <p className="text-xs text-muted-foreground">{r.buyer.email}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{r.buyer.nidNumber}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-foreground max-w-40 truncate">{r.project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ৳{(Number(r.totalAmount) / Math.max(r.quantity, 1)).toFixed(2)}/share at request
                      <span className="text-muted-foreground/70"> (now ৳{Number(r.project.sharePriceSgd).toFixed(2)})</span>
                    </p>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    {r.quantity}
                    {r.requestedShareNumbers.length > 0 && (
                      <p className="text-[11px] font-mono text-muted-foreground font-normal mt-0.5 max-w-32 wrap-break-word">
                        {r.requestedShareNumbers.map((n) => `#${String(n).padStart(6, "0")}`).join(", ")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-foreground">৳{Number(r.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-3.5 text-xs">
                    {r.referredBy ? (
                      <p className="text-foreground">
                        Agent <span className="text-muted-foreground">({r.referredBy.fullName})</span>: <span className="font-semibold">৳{computeCommissionAmount(shareCommission, Number(r.totalAmount)).toFixed(2)}</span>
                        <span className="text-muted-foreground"> ({shareCommission.mode === "PERCENTAGE" ? `${shareCommission.value}%` : `flat ৳${shareCommission.value}`})</span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">No referring agent</p>
                    )}
                    <p className="text-foreground mt-1">
                      Platform: <span className="font-semibold">৳{(Number(r.totalAmount) * (adminCutPercent / 100)).toFixed(2)}</span>
                      <span className="text-muted-foreground"> ({adminCutPercent}%)</span>
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium text-muted-foreground">{METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}</span>
                    {r.txId && (
                      <p className="text-[11px] font-mono text-muted-foreground truncate max-w-28">{r.txId}</p>
                    )}
                    {r.screenshotUrl && (
                      <div className="mt-1">
                        <ScreenshotViewerModal url={r.screenshotUrl} label="📎 Screenshot" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                    {r.adminNote && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-32 truncate">{r.adminNote}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                    {r.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3.5">
                    {r.status === "PENDING" && (
                      <ProcessPurchaseForm
                        requestId={r.id}
                        txId={r.txId ?? null}
                        screenshotUrl={r.screenshotUrl ?? null}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                    No purchase requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
