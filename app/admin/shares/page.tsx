import { prisma } from "@/lib/prisma";
import { getShareSgdRate } from "@/lib/share-pricing";
import { CreateProjectForm } from "./create-form";
import { ResellActions } from "./resell-actions";
import { ResetDemoSharesButton } from "@/components/reset-demo-shares-button";
import Link from "next/link";

async function getData() {
  const [projects, pendingListings, pendingTrades] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { fullName: true } },
        _count: {
          select: {
            shares: true,
            purchaseRequests: true,
          },
        },
        // Include all certificates so we can count total vs available in JS
        certificates: {
          select: { id: true, ownerId: true },
        },
      },
    }),
    prisma.shareListing.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        seller: { select: { fullName: true, email: true, phone: true } },
        project: { select: { name: true, sharePriceSgd: true } },
      },
    }),
    prisma.shareTrade.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { fullName: true, email: true, phone: true } },
        listing: {
          include: {
            seller: { select: { fullName: true } },
            project: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  return { projects, pendingListings, pendingTrades };
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-600",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export default async function AdminSharesPage() {
  const [{ projects, pendingListings, pendingTrades }, rate] = await Promise.all([
    getData(),
    getShareSgdRate(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Share Management</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} projects · {pendingListings.length} pending resell listings · {pendingTrades.length} pending trades
          </p>
        </div>
        <ResetDemoSharesButton />
      </div>

      {/* Pending resell listings */}
      {pendingListings.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-amber-50">
            <h2 className="font-semibold text-amber-800">
              Pending Resell Listings ({pendingListings.length})
            </h2>
            <p className="text-xs text-amber-700 mt-0.5">Review and approve or reject member resell requests</p>
          </div>
          <div className="divide-y divide-border">
            {pendingListings.map((l) => (
              <div key={l.id} className="px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{l.project.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Seller: {l.seller.fullName} · {l.seller.email} · {l.seller.phone}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span>Qty: <strong className="text-foreground">{l.quantity}</strong></span>
                      <span>Asking: <strong className="text-foreground">৳{Number(l.askingPrice).toFixed(2)}</strong></span>
                      <span>Market: <strong className="text-foreground">৳{Number(l.project.sharePriceSgd).toFixed(2)}</strong></span>
                      <span>Total: <strong className="text-foreground">৳{(l.quantity * Number(l.askingPrice)).toFixed(2)}</strong></span>
                    </div>
                    {l.listedShareNumbers.length > 0 && (
                      <p className="text-[11px] font-mono text-brand mt-1.5 max-w-md wrap-break-word">
                        {l.listedShareNumbers.map((n) => `#${String(n).padStart(6, "0")}`).join(", ")}
                      </p>
                    )}
                  </div>
                  <ResellActions listingId={l.id} type="listing" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending trades */}
      {pendingTrades.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-blue-50">
            <h2 className="font-semibold text-blue-800">
              Pending Secondary Market Trades ({pendingTrades.length})
            </h2>
            <p className="text-xs text-blue-700 mt-0.5">Approve to transfer shares from seller to buyer</p>
          </div>
          <div className="divide-y divide-border">
            {pendingTrades.map((t) => (
              <div key={t.id} className="px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{t.listing.project.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Buyer: {t.buyer.fullName} · {t.buyer.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Seller: {t.listing.seller.fullName}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs">
                      <span>Qty: <strong className="text-foreground">{t.quantity}</strong></span>
                      <span>Total: <strong className="text-foreground">৳{Number(t.totalAmount).toFixed(2)}</strong></span>
                      <span>Method: <strong className="text-foreground">{t.paymentMethod}</strong></span>
                      {t.txId && <span>TXN: <strong className="text-foreground font-mono">{t.txId}</strong></span>}
                    </div>
                  </div>
                  <ResellActions tradeId={t.id} type="trade" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects + create form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-foreground">All Projects</h2>
          {projects.map((p) => {
            const soldPct = Math.round(((p.totalShares - p.availableShares) / p.totalShares) * 100);
            const totalCerts = p.certificates.length;
            const availableCerts = p.certificates.filter((c) => !c.ownerId).length;
            const assignedCerts = totalCerts - availableCerts;
            const missingNumbers = totalCerts === 0;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[p.status]}`}>
                    {p.status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center mb-3">
                  <div>
                    <p className="font-bold text-foreground">৳{Number(p.sharePriceSgd).toFixed(2)}</p>
                    <p className="text-[11px] text-muted-foreground">per share</p>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{p.totalShares}</p>
                    <p className="text-[11px] text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{p.availableShares}</p>
                    <p className="text-[11px] text-muted-foreground">Available</p>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{p._count.purchaseRequests}</p>
                    <p className="text-[11px] text-muted-foreground">Requests</p>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${soldPct}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground mb-3">
                  <span>{soldPct}% sold</span>
                  <span>by {p.createdBy.fullName}</span>
                </div>

                {/* Share number status */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-3 ${missingNumbers ? "bg-red-50 border border-red-200" : "bg-muted"}`}>
                  <svg className={`w-3.5 h-3.5 shrink-0 ${missingNumbers ? "text-red-500" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  {missingNumbers ? (
                    <span className="text-red-600 font-medium">No share numbers created — add them in View Details</span>
                  ) : (
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{totalCerts}</span> share numbers ·{" "}
                      <span className="text-green-600 font-semibold">{availableCerts} available</span> ·{" "}
                      <span className="text-brand font-semibold">{assignedCerts} assigned</span>
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center gap-4">
                  <Link
                    href={`/admin/shares/${p.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand/80 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Details & Manage Share #s
                  </Link>
                </div>
              </div>
            );
          })}
          {projects.length === 0 && (
            <div className="bg-white rounded-xl border border-border p-10 text-center text-muted-foreground text-sm">
              No projects yet. Create one using the form.
            </div>
          )}
        </div>
        <div>
          <CreateProjectForm />
        </div>
      </div>
    </div>
  );
}
