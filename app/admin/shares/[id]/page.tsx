import { prisma } from "@/lib/prisma";
import { getCommissionSetting, getShareAdminCutPercent, computeCommissionAmount } from "@/lib/commission";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScreenshotViewer } from "./screenshot-viewer";
import { ShareNumbersManager } from "./share-numbers";
import { ProjectActions } from "./project-actions";

async function getProjectDetail(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      createdBy: { select: { fullName: true, email: true } },
      shares: {
        include: {
          owner: { select: { fullName: true, email: true, phone: true } },
        },
        orderBy: { acquiredAt: "desc" },
      },
      purchaseRequests: {
        include: {
          buyer: { select: { fullName: true, email: true, phone: true } },
          processedBy: { select: { fullName: true } },
          referredBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      listings: {
        include: {
          seller: { select: { fullName: true, email: true } },
          trades: {
            include: {
              buyer: { select: { fullName: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      certificates: {
        include: {
          owner: { select: { fullName: true, email: true } },
        },
        orderBy: { shareNumber: "asc" },
      },
    },
  });
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-600",
  COMPLETED: "bg-blue-100 text-blue-700",
};

const REQUEST_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  GCASH: "GCash",
  PAYNOW: "PayNow",
  WALLET: "Wallet",
};

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, shareCommission, adminCutPercent] = await Promise.all([
    getProjectDetail(id),
    getCommissionSetting("SHARE"),
    getShareAdminCutPercent(),
  ]);
  if (!project) notFound();

  const soldShares = project.totalShares - project.availableShares;
  const soldPct = project.totalShares > 0 ? Math.round((soldShares / project.totalShares) * 100) : 0;
  const availableCertCount = project.certificates.filter((c) => !c.ownerId).length;
  const totalRaised = project.purchaseRequests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const pendingRequests = project.purchaseRequests.filter((r) => r.status === "PENDING");
  const approvedRequests = project.purchaseRequests.filter((r) => r.status === "APPROVED");
  const rejectedRequests = project.purchaseRequests.filter((r) => r.status === "REJECTED");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/admin/shares"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Share Management
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Created by {project.createdBy.fullName} · {project.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[project.status]}`}>
              {project.status}
            </span>
            <ProjectActions
              project={{
                id: project.id,
                name: project.name,
                description: project.description,
                sharePriceSgd: Number(project.sharePriceSgd),
                status: project.status,
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Share Price", value: `৳${Number(project.sharePriceSgd).toFixed(2)}` },
          { label: "Total Shares", value: project.totalShares.toLocaleString() },
          { label: "Sold Shares", value: soldShares.toLocaleString() },
          { label: "Available", value: project.availableShares.toLocaleString() },
          { label: "Total Raised", value: `৳${totalRaised.toLocaleString()}` },
          { label: "Shareholders", value: project.shares.length },
          { label: "Pending Requests", value: pendingRequests.length },
          { label: "Approved Requests", value: approvedRequests.length },
          { label: "Share #s Created", value: project.certificates.length },
          { label: "Share #s Available", value: availableCertCount },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-border px-4 py-3">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-border px-5 py-4">
        <div className="flex justify-between text-sm font-medium text-foreground mb-2">
          <span>Sales Progress</span>
          <span>{soldPct}% sold</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${soldPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span>{soldShares.toLocaleString()} sold</span>
          <span>{project.availableShares.toLocaleString()} remaining</span>
        </div>
      </div>

      {/* Shareholders */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">
            Shareholders <span className="text-muted-foreground font-normal text-sm">({project.shares.length})</span>
          </h2>
        </div>
        {project.shares.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No shareholders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Member</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Shares</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Share Numbers</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Purchase Price</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Total Value</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">% of Project</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Acquired</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {project.shares.map((s) => {
                  const totalValue = s.quantity * Number(s.purchasePrice);
                  const pct = project.totalShares > 0 ? ((s.quantity / project.totalShares) * 100).toFixed(1) : "0";
                  const holderCerts = project.certificates
                    .filter((c) => c.ownerId === s.ownerId)
                    .map((c) => c.shareNumber)
                    .sort((a, b) => a - b);
                  const certLabel = holderCerts.length > 0
                    ? holderCerts.map((n) => `#${String(n).padStart(4, "0")}`).join(", ")
                    : "—";
                  return (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{s.owner.fullName}</p>
                        <p className="text-xs text-muted-foreground">{s.owner.email}</p>
                        {s.owner.phone && <p className="text-[11px] text-muted-foreground">{s.owner.phone}</p>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{s.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs font-mono text-brand max-w-45 wrap-break-word">{certLabel}</td>
                      <td className="px-4 py-3 text-foreground">৳{Number(s.purchasePrice).toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">৳{totalValue.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {s.acquiredAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Requests */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Purchase Requests <span className="text-muted-foreground font-normal text-sm">({project.purchaseRequests.length})</span>
          </h2>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{pendingRequests.length} pending</span>
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{approvedRequests.length} approved</span>
            {rejectedRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{rejectedRequests.length} rejected</span>
            )}
          </div>
        </div>
        {project.purchaseRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No purchase requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Buyer</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Qty</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Commission Split</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Payment</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Proof</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {project.purchaseRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{r.buyer.fullName}</p>
                      <p className="text-xs text-muted-foreground">{r.buyer.email}</p>
                      {r.buyer.phone && <p className="text-[11px] text-muted-foreground">{r.buyer.phone}</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {r.quantity}
                      {r.requestedShareNumbers.length > 0 && (
                        <p className="text-[11px] font-mono text-muted-foreground font-normal mt-0.5 max-w-32 wrap-break-word">
                          {r.requestedShareNumbers.map((n) => `#${String(n).padStart(4, "0")}`).join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">৳{Number(r.totalAmount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs">
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
                    <td className="px-4 py-3">
                      <p className="text-xs text-foreground">{METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}</p>
                    </td>
                    <td className="px-4 py-3 max-w-40">
                      {r.txId && (
                        <p className="text-[11px] font-mono text-muted-foreground break-all">{r.txId}</p>
                      )}
                      {r.screenshotUrl && (
                        <ScreenshotViewer src={r.screenshotUrl} />
                      )}
                      {!r.txId && !r.screenshotUrl && (
                        <span className="text-[11px] text-muted-foreground italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${REQUEST_STYLES[r.status]}`}>
                        {r.status}
                      </span>
                      {r.adminNote && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{r.adminNote}</p>
                      )}
                      {r.processedBy && (
                        <p className="text-[11px] text-muted-foreground">by {r.processedBy.fullName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {r.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share Numbers */}
      <ShareNumbersManager
        projectId={project.id}
        projectSharePriceSgd={Number(project.sharePriceSgd)}
        certificates={project.certificates.map((c) => ({ ...c, priceSgd: c.priceSgd != null ? Number(c.priceSgd) : null }))}
      />

      {/* Secondary Market Listings */}
      {project.listings.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              Resell Listings <span className="text-muted-foreground font-normal text-sm">({project.listings.length})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Seller</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Qty</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Asking Price</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Trades</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Listed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {project.listings.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{l.seller.fullName}</p>
                      <p className="text-xs text-muted-foreground">{l.seller.email}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {l.quantity}
                      {l.listedShareNumbers.length > 0 && (
                        <p className="text-[11px] font-mono text-muted-foreground font-normal mt-0.5 max-w-32 wrap-break-word">
                          {l.listedShareNumbers.map((n) => `#${String(n).padStart(6, "0")}`).join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">৳{Number(l.askingPrice).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${REQUEST_STYLES[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {l.trades.length === 0 ? "—" : (
                        <span>{l.trades.length} trade{l.trades.length > 1 ? "s" : ""}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {l.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
