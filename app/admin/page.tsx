import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import Link from "next/link";

async function getStats() {
  const [
    totalUsers, verifiedUsers,
    pendingPurchases, pendingDeposits,
    pendingWithdrawals, pendingTaxi,
    pendingAirTicket, pendingBuyRequests, pendingCheckouts,
    activeProjects, totalShares,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.sharePurchaseRequest.count({ where: { status: "PENDING" } }),
    prisma.depositRequest.count({ where: { status: "PENDING" } }),
    prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
    prisma.taxiRequest.count({ where: { status: "PENDING" } }),
    prisma.airTicketRequest.count({ where: { status: "PENDING" } }),
    prisma.shareBuyRequest.count({ where: { status: "PENDING" } }),
    prisma.checkout.count({ where: { status: "AWAITING_PAYMENT" } }),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.shareOwnership.aggregate({ _sum: { quantity: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, fullName: true, email: true, role: true, isVerified: true, createdAt: true },
    }),
  ]);

  return {
    totalUsers, verifiedUsers,
    pendingPurchases, pendingDeposits,
    pendingWithdrawals, pendingTaxi,
    pendingAirTicket, pendingBuyRequests, pendingCheckouts,
    activeProjects,
    totalShares: totalShares._sum.quantity ?? 0,
    recentUsers,
  };
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  MODERATOR: "bg-amber-100 text-amber-700",
  USER: "bg-gray-100 text-gray-600",
};

export default async function AdminDashboard() {
  const [session, stats] = await Promise.all([getSession(), getStats()]);
  const firstName = (session?.fullName ?? session?.email ?? "Admin").split(" ")[0];
  const totalPending =
    stats.pendingPurchases +
    stats.pendingDeposits +
    stats.pendingWithdrawals +
    stats.pendingTaxi +
    stats.pendingAirTicket +
    stats.pendingBuyRequests +
    stats.pendingCheckouts;

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      sub: `${stats.verifiedUsers} verified`,
      href: "/admin/users",
      gradient: "from-blue-500 to-blue-600",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      label: "Active Projects",
      value: stats.activeProjects,
      sub: `${stats.totalShares} shares issued`,
      href: "/admin/shares",
      gradient: "from-violet-500 to-brand",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: "Pending Purchases",
      value: stats.pendingPurchases,
      sub: stats.pendingPurchases > 0 ? "Needs review" : "All clear",
      href: "/admin/purchases",
      gradient: stats.pendingPurchases > 0 ? "from-amber-500 to-orange-500" : "from-green-500 to-emerald-500",
      urgent: stats.pendingPurchases > 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: "Pending Deposits",
      value: stats.pendingDeposits,
      sub: stats.pendingDeposits > 0 ? "Verify payment" : "All clear",
      href: "/admin/deposits",
      gradient: stats.pendingDeposits > 0 ? "from-orange-500 to-red-500" : "from-green-500 to-emerald-500",
      urgent: stats.pendingDeposits > 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  const quickLinks = [
    { href: "/admin/shares",    label: "Shares 6",    icon: "📈" },
    { href: "/admin/air-ticket",label: "Air Tickets", icon: "✈️" },
    { href: "/admin/taxi",      label: "Taxi Rent",   icon: "🚕" },
    { href: "/admin/checkouts", label: "Checkouts",   icon: "🧾" },
    { href: "/admin/blog",      label: "Blog",        icon: "📝" },
    { href: "/admin/islamic",   label: "Islamic",     icon: "🌙" },
    { href: "/admin/pick-put",label: "Pick & Put",  icon: "🔍" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back 👋</p>
          <h1 className="text-2xl font-bold text-foreground">{firstName}</h1>
        </div>
        {totalPending > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {totalPending} Action{totalPending > 1 ? "s" : ""} Required
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="relative bg-white rounded-2xl border border-border p-4 hover:shadow-md active:scale-95 transition-all overflow-hidden group"
          >
            {card.urgent && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${card.gradient} flex items-center justify-center text-white mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-foreground leading-none">{card.value}</p>
            <p className="text-xs font-semibold text-foreground mt-1 leading-tight">{card.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Urgent alerts */}
      {totalPending > 0 && (
        <div className="space-y-2">
          {stats.pendingPurchases > 0 && (
            <Link
              href="/admin/purchases"
              className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 hover:bg-amber-100 active:scale-[.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-white text-sm shrink-0">📋</span>
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {stats.pendingPurchases} share purchase{stats.pendingPurchases > 1 ? "s" : ""} waiting
                  </p>
                  <p className="text-xs text-amber-700">Tap to review and approve</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </Link>
          )}
          {stats.pendingDeposits > 0 && (
            <Link
              href="/admin/deposits"
              className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3.5 hover:bg-orange-100 active:scale-[.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-orange-400 flex items-center justify-center text-white text-sm shrink-0">💳</span>
                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    {stats.pendingDeposits} deposit{stats.pendingDeposits > 1 ? "s" : ""} awaiting verification
                  </p>
                  <p className="text-xs text-orange-700">Tap to verify payment proof</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-orange-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </Link>
          )}
          {stats.pendingWithdrawals > 0 && (
            <Link
              href="/admin/withdrawals"
              className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-xl px-4 py-3.5 hover:bg-rose-100 active:scale-[.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-400 flex items-center justify-center text-white text-sm shrink-0">💸</span>
                <div>
                  <p className="text-sm font-semibold text-rose-900">
                    {stats.pendingWithdrawals} withdrawal request{stats.pendingWithdrawals > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-rose-700">Tap to process payouts</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </Link>
          )}
          {stats.pendingTaxi > 0 && (
            <Link
              href="/admin/taxi"
              className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3.5 hover:bg-yellow-100 active:scale-[.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-white text-sm shrink-0">🚕</span>
                <div>
                  <p className="text-sm font-semibold text-yellow-900">
                    {stats.pendingTaxi} taxi request{stats.pendingTaxi > 1 ? "s" : ""} waiting
                  </p>
                  <p className="text-xs text-yellow-700">Tap to assign driver / quote price</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-yellow-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </Link>
          )}
          {stats.pendingAirTicket > 0 && (
            <Link
              href="/admin/air-ticket"
              className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-4 py-3.5 hover:bg-sky-100 active:scale-[.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-400 flex items-center justify-center text-white text-sm shrink-0">✈️</span>
                <div>
                  <p className="text-sm font-semibold text-sky-900">
                    {stats.pendingAirTicket} flight booking request{stats.pendingAirTicket > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-sky-700">Tap to assign manager / quote options</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-sky-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </Link>
          )}
          {/* Share 4 buy requests are reviewed on /admin/purchases, not
              /admin/shares (which only handles Share 6 listings & trades).
              The Purchases badge already counts them — see
              pendingCounts.purchases in app/admin/layout.tsx. */}
          {stats.pendingBuyRequests > 0 && (
            <Link
              href="/admin/purchases"
              className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3.5 hover:bg-purple-100 active:scale-[.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-purple-400 flex items-center justify-center text-white text-sm shrink-0">🤝</span>
                <div>
                  <p className="text-sm font-semibold text-purple-900">
                    {stats.pendingBuyRequests} Share 4 buy request{stats.pendingBuyRequests > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-purple-700">Tap to review in Purchases</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </Link>
          )}
        </div>
      )}

      {/* Quick access grid */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Access</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex flex-col items-center gap-2 bg-white rounded-2xl border border-border py-4 px-2 hover:border-brand hover:shadow-sm active:scale-95 transition-all text-center"
            >
              <span className="text-2xl leading-none">{q.icon}</span>
              <span className="text-[11px] font-medium text-muted-foreground">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent registrations */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Registrations</h2>
          <Link href="/admin/users" className="text-xs text-brand font-medium hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-border">
          {stats.recentUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-brand">{u.fullName.charAt(0)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{u.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {u.role.replace("_", " ")}
                </span>
                {u.isVerified ? (
                  <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Verified
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
