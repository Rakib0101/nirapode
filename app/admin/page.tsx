import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { ADMIN_SECTIONS, sectionForPath, type AdminSection } from "@/lib/admin-sections";
import { getAdminAccess } from "@/lib/admin-permissions";

const ALERT_TONES: Record<string, string> = {
  amber: "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100",
  purple: "bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100",
  orange: "bg-orange-50 border-orange-200 text-orange-900 hover:bg-orange-100",
  rose: "bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100",
  sky: "bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100",
  teal: "bg-teal-50 border-teal-200 text-teal-900 hover:bg-teal-100",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-900 hover:bg-yellow-100",
};

async function getStats() {
  const [
    totalUsers, verifiedUsers,
    pendingPurchases, pendingDeposits,
    pendingWithdrawals, pendingTaxi,
    pendingAirTicket, pendingBuyRequests, pendingCheckouts,
    unpaidCheckouts, pendingProductOrders, pendingGcash,
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
    // Customer has uploaded proof: the admin must approve or reject it.
    prisma.checkout.count({ where: { status: "PROOF_SUBMITTED" } }),
    // Invoice sent, customer hasn't paid yet: nothing for the admin to do.
    prisma.checkout.count({ where: { status: "AWAITING_PAYMENT" } }),
    prisma.productOrder.count({ where: { status: "PENDING" } }),
    prisma.gcashTransfer.count({ where: { status: "PENDING" } }),
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
    unpaidCheckouts, pendingProductOrders, pendingGcash,
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

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const deniedLabel = ADMIN_SECTIONS.find((s) => s.key === denied)?.label;
  const [session, stats, access] = await Promise.all([getSession(), getStats(), getAdminAccess()]);
  const firstName = (session?.fullName ?? session?.email ?? "Admin").split(" ")[0];
  const canSee = (section: AdminSection) => !!access?.sections.includes(section);

  // Everything waiting on an admin. Each count gets its own tappable row, and
  // the badge total is exactly the sum of the rows shown, so it can never say
  // "1 Action Required" with nothing to tap.
  const alerts = [
    { section: "shares", count: stats.pendingPurchases, href: "/admin/purchases", icon: "📋", tone: "amber", title: (n: number) => `${n} share purchase${n > 1 ? "s" : ""} waiting`, hint: "Tap to review and approve" },
    { section: "shares", count: stats.pendingBuyRequests, href: "/admin/purchases", icon: "🤝", tone: "purple", title: (n: number) => `${n} Share 4 buy request${n > 1 ? "s" : ""}`, hint: "Tap to review in Purchases" },
    { section: "deposits", count: stats.pendingDeposits, href: "/admin/deposits", icon: "💳", tone: "orange", title: (n: number) => `${n} deposit${n > 1 ? "s" : ""} awaiting verification`, hint: "Tap to verify payment proof" },
    { section: "withdrawals", count: stats.pendingWithdrawals, href: "/admin/withdrawals", icon: "💸", tone: "rose", title: (n: number) => `${n} withdrawal request${n > 1 ? "s" : ""}`, hint: "Tap to process payouts" },
    { section: "gcash", count: stats.pendingGcash, href: "/admin/gcash", icon: "🇵🇭", tone: "sky", title: (n: number) => `${n} SGD → GCash request${n > 1 ? "s" : ""}`, hint: "Tap to check payment and send Pesos" },
    { section: "products", count: stats.pendingProductOrders, href: "/admin/products#orders", icon: "🛍️", tone: "emerald", title: (n: number) => `${n} product order${n > 1 ? "s" : ""} waiting`, hint: "Tap to confirm and bill the customer" },
    { section: "checkouts", count: stats.pendingCheckouts, href: "/admin/checkouts", icon: "🧾", tone: "teal", title: (n: number) => `${n} checkout payment${n > 1 ? "s" : ""} to verify`, hint: "Customer uploaded proof: tap to approve" },
    { section: "taxi", count: stats.pendingTaxi, href: "/admin/taxi", icon: "🚕", tone: "yellow", title: (n: number) => `${n} taxi request${n > 1 ? "s" : ""} waiting`, hint: "Tap to assign driver / quote price" },
    { section: "airTicket", count: stats.pendingAirTicket, href: "/admin/air-ticket", icon: "✈️", tone: "sky", title: (n: number) => `${n} flight booking request${n > 1 ? "s" : ""}`, hint: "Tap to assign manager / quote options" },
  ] satisfies { section: AdminSection; count: number; href: string; icon: string; tone: string; title: (n: number) => string; hint: string }[];
  const visibleAlerts = alerts.filter((a) => a.count > 0 && canSee(a.section));
  const totalPending = visibleAlerts.reduce((sum, a) => sum + a.count, 0);
  const showUnpaid = stats.unpaidCheckouts > 0 && canSee("checkouts");

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
    { href: "/admin/products",  label: "Products",    icon: "🛍️" },
    { href: "/admin/gcash",     label: "SGD → GCash", icon: "🇵🇭" },
  ].filter((q) => {
    const section = sectionForPath(q.href);
    return section === null || canSee(section);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back 👋</p>
          <h1 className="text-2xl font-bold text-foreground">{firstName}</h1>
        </div>
        {totalPending > 0 && (
          <a
            href="#pending"
            className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-100 active:scale-95 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {totalPending} Action{totalPending > 1 ? "s" : ""} Required
          </a>
        )}
      </div>

      {deniedLabel && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You don&apos;t have access to <strong>{deniedLabel}</strong>. Ask a Super Admin to give you access.
        </div>
      )}

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

      {/* Waiting on an admin — the badge above links here */}
      {(visibleAlerts.length > 0 || showUnpaid) && (
        <div id="pending" className="space-y-2 scroll-mt-4">
          {visibleAlerts.map((a) => (
            <Link
              key={a.href + a.icon}
              href={a.href}
              className={`flex items-center justify-between rounded-xl px-4 py-3.5 border active:scale-[.99] transition-all ${ALERT_TONES[a.tone]}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center text-base shrink-0">{a.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{a.title(a.count)}</p>
                  <p className="text-xs opacity-80">{a.hint}</p>
                </div>
              </div>
              <svg className="w-4 h-4 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </Link>
          ))}
          {showUnpaid && (
            <Link
              href="/admin/checkouts"
              className="flex items-center justify-between rounded-xl px-4 py-3 border border-border bg-white text-muted-foreground hover:bg-muted active:scale-[.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-base shrink-0">⏳</span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {stats.unpaidCheckouts} invoice{stats.unpaidCheckouts > 1 ? "s" : ""} waiting for customer payment
                  </p>
                  <p className="text-xs">Nothing to do until they pay. Tap to see them.</p>
                </div>
              </div>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
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
