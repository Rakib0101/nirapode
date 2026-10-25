import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { effectiveShareCertPrice } from "@/lib/share-pricing-utils";
import { ShareholdersChart } from "@/components/shareholders-chart";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PurchaseForm } from "./purchase-form";

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id, status: "ACTIVE" },
    include: {
      createdBy: { select: { fullName: true } },
      priceHistory: { orderBy: { changedAt: "desc" }, take: 5 },
      shares: {
        include: { owner: { select: { fullName: true } } },
        orderBy: { quantity: "desc" },
      },
      _count: { select: { shares: true, purchaseRequests: true } },
    },
  });
}

async function getMyOwnership(projectId: string, userId: string) {
  return prisma.shareOwnership.findUnique({
    where: { projectId_ownerId: { projectId, ownerId: userId } },
    select: { quantity: true, purchasePrice: true, acquiredAt: true },
  });
}

async function getMyPendingRequest(projectId: string, userId: string) {
  return prisma.sharePurchaseRequest.findFirst({
    where: { projectId, buyerId: userId, status: "PENDING" },
    select: { id: true, quantity: true, createdAt: true },
  });
}

async function getAvailableShares(projectId: string, projectSharePriceSgd: number) {
  const certs = await prisma.shareCertificate.findMany({
    where: { projectId, ownerId: null },
    orderBy: { shareNumber: "asc" },
    select: { shareNumber: true, priceSgd: true },
  });
  return certs.map((c) => ({
    shareNumber: c.shareNumber,
    priceSgd: effectiveShareCertPrice(c.priceSgd != null ? Number(c.priceSgd) : null, projectSharePriceSgd),
  }));
}

export default async function ShareDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [session, availableShares] = await Promise.all([
    getSession(),
    getAvailableShares(id, Number(project.sharePriceSgd)),
  ]);

  const soldShares = project.totalShares - project.availableShares;
  const soldPct = Math.round((soldShares / project.totalShares) * 100);
  const totalValue = Number(project.sharePriceSgd) * project.totalShares;

  const [ownership, pendingRequest] = session
    ? await Promise.all([
        getMyOwnership(id, session.userId),
        getMyPendingRequest(id, session.userId),
      ])
    : [null, null];

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/shares" className="hover:text-brand transition-colors">Share Marketplace</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{project.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Project details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="bg-linear-to-br from-brand/10 to-brand-50 px-7 py-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                    Active Project
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                <p className="text-muted-foreground mt-2">{project.description}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Created by <span className="font-medium text-foreground">{project.createdBy.fullName}</span>
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
                {[
                  { label: "Share Price", value: `৳${Number(project.sharePriceSgd).toFixed(2)}` },
                  { label: "Total Shares", value: project.totalShares.toLocaleString() },
                  { label: "Available", value: project.availableShares.toLocaleString() },
                  { label: "Total Fund", value: `৳${totalValue.toLocaleString()}` },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white px-5 py-4 text-center">
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="px-7 py-5">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Funding progress</span>
                  <span className="font-semibold text-foreground">{soldPct}% sold</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-brand to-brand-dark rounded-full transition-all"
                    style={{ width: `${soldPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span>{soldShares.toLocaleString()} sold</span>
                  <span>{project.availableShares.toLocaleString()} remaining</span>
                </div>
              </div>

              {/* Shareholder Breakdown Chart */}
              <div className="px-7 py-6 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📊</span>
                  <h3 className="font-bold text-foreground text-sm">Shareholder Breakdown</h3>
                </div>
                <ShareholdersChart
                  holders={project.shares.map((s) => ({
                    name: s.owner?.fullName || "Shareholder",
                    quantity: s.quantity,
                  }))}
                  availableShares={project.availableShares}
                />
              </div>
            </div>

            {/* My ownership (if any) */}
            {ownership && (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-7 py-5">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Your Investment
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xl font-bold text-green-700">{ownership.quantity}</p>
                    <p className="text-xs text-green-600">Shares owned</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-700">
                      ৳{(ownership.quantity * Number(ownership.purchasePrice)).toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600">Total invested</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-700">
                      ৳{Number(ownership.purchasePrice).toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600">Bought at (per share)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pending request notice */}
            {pendingRequest && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-7 py-5">
                <p className="text-sm font-semibold text-amber-800">
                  You have a pending purchase request for {pendingRequest.quantity} shares — awaiting admin approval.
                </p>
              </div>
            )}
          </div>

          {/* Right: Purchase form — browsable by everyone, login required only to submit */}
          <div className="lg:col-span-1">
            <PurchaseForm
              projectId={project.id}
              availableShares={availableShares}
              hasPending={!!pendingRequest}
              isLoggedIn={!!session}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
