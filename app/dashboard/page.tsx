import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { CREDIT_TX_TYPES, WALLET_TX_LABELS } from "@/lib/wallet-tx";
import { BalanceCard } from "@/components/balance-card";
import Link from "next/link";

async function getDashboardData(userId: string) {
  try {
    const [user, wallet, ownerships, pendingPurchases, recentNotifications, pendingDeposits, pendingCheckouts] =
      await Promise.all([
        prisma.user
          .findUnique({
            where: { id: userId },
            select: { fullName: true, role: true, createdAt: true, isVerified: true },
          })
          .catch((err) => {
            console.error("Dashboard user fetch error:", err);
            return null;
          }),
        prisma.wallet
          .findUnique({
            where: { userId },
            include: {
              transactions: { orderBy: { createdAt: "desc" }, take: 5 },
            },
          })
          .catch((err) => {
            console.error("Dashboard wallet fetch error:", err);
            return null;
          }),
        prisma.shareOwnership
          .findMany({
            where: { ownerId: userId },
            include: { project: { select: { name: true, sharePriceSgd: true, status: true } } },
          })
          .catch((err) => {
            console.error("Dashboard ownerships fetch error:", err);
            return [];
          }),
        prisma.sharePurchaseRequest
          .findMany({
            where: { buyerId: userId, status: "PENDING" },
            include: { project: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 3,
          })
          .catch((err) => {
            console.error("Dashboard purchases fetch error:", err);
            return [];
          }),
        prisma.notification
          .findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
          .catch((err) => {
            console.error("Dashboard notifications fetch error:", err);
            return [];
          }),
        prisma.depositRequest
          .findMany({
            where: { userId, status: "PENDING" },
            take: 3,
          })
          .catch((err) => {
            console.error("Dashboard deposits fetch error:", err);
            return [];
          }),
        prisma.checkout
          .findMany({
            where: { userId, status: { in: ["AWAITING_PAYMENT", "REJECTED"] } },
            include: { items: true },
            orderBy: { createdAt: "desc" },
          })
          .catch((err) => {
            console.error("Dashboard checkouts fetch error:", err);
            return [];
          }),
      ]);

    return {
      user,
      wallet,
      ownerships: ownerships ?? [],
      pendingPurchases: pendingPurchases ?? [],
      recentNotifications: recentNotifications ?? [],
      pendingDeposits: pendingDeposits ?? [],
      pendingCheckouts: pendingCheckouts ?? [],
    };
  } catch (err) {
    console.error("getDashboardData error:", err);
    return {
      user: null,
      wallet: null,
      ownerships: [],
      pendingPurchases: [],
      recentNotifications: [],
      pendingDeposits: [],
      pendingCheckouts: [],
    };
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { user, wallet, ownerships, pendingPurchases, recentNotifications, pendingDeposits, pendingCheckouts } =
    await getDashboardData(session.userId);

  const portfolioValue = (ownerships ?? []).reduce(
    (sum, o) => sum + Number(o?.purchasePrice ?? 0) * (o?.quantity ?? 0),
    0
  );
  const totalShares = (ownerships ?? []).reduce((sum, o) => sum + (o?.quantity ?? 0), 0);

  const MODULE_LINKS = [
    { href: "/history", label: "All History", desc: "Shares, Taxi, Flights & Wallet history", icon: "📑" },
    { href: "/reminders", label: "Alarm & Reminders", desc: "10 slots with WhatsApp / Gmail alerts", icon: "⏰" },
    { href: "/forum", label: "Community Forum", desc: "Group discussions & questions", icon: "💬" },
    { href: "/shares/my", label: "My Investments", desc: "Shares 6 portfolio & certificates", icon: "📈" },
    { href: "/taxi", label: "Taxi Rent", desc: "Book Noah, Private Car, Hiace", icon: "🚕" },
    { href: "/air-ticket", label: "Air Tickets", desc: "Book Biman, SQ, US-Bangla, AirAsia", icon: "✈️" },
    { href: "/checkout", label: "My Checkouts", desc: "View and pay booking invoices", icon: "💳" },
    { href: "/currency", label: "Currency Converter", desc: "SGD ↔ BDT live rates & calculator", icon: "💱" },
    { href: "/pick-put/my", label: "My Pick & Put", desc: "Your trips & items you're sending", icon: "🔍" },
    { href: "/apply", label: "Apply for Service", desc: "Upload documents & apply for services", icon: "📋" },
    { href: "/islamic-center", label: "Islamic Center", desc: "Quran, Duas, articles & PDFs", icon: "🕌" },
    { href: "/blog", label: "Community Blog", desc: "News, tips & community stories", icon: "📝" },
  ];


  const firstName = (user?.fullName ?? session.fullName ?? session.email.split("@")[0]).trim().split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-brand-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Hello, {firstName}!</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Member since{" "}
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
                : "recently"}
            </p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 text-xs font-bold text-white bg-brand px-4 py-2 rounded-full hover:bg-brand-dark transition-colors shadow-xs"
          >
            HELP
          </Link>
        </div>

        {/* Pending Checkout Alert Banner */}
        {pendingCheckouts.length > 0 && (
          <div className="mb-7 space-y-3">
            {pendingCheckouts.map((c) => (
              <div
                key={c.id}
                className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 text-lg">
                    💳
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-amber-900 text-sm">Booking Payment Ready</p>
                      <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {(c.items ?? []).map((i) => i.description).join(" · ")}
                    </p>
                    <p className="text-xs font-semibold text-amber-950 mt-1">
                      Total Payable: ৳{Number(c.totalAmount).toFixed(2)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/pay/${c.token}`}
                  className="inline-flex items-center justify-center bg-brand text-white font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors shrink-0 shadow-xs"
                >
                  Pay Now →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Top stats — balance uses the same card as the signed-in home, so
            the two screens look like one product. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
          <div className="rounded-3xl overflow-hidden border border-border shadow-sm">
            <BalanceCard
              balance={wallet ? Number(wallet.balance) : 0}
              note={
                pendingDeposits.length > 0
                  ? `${pendingDeposits.length} deposit pending approval`
                  : undefined
              }
            />
          </div>

          {/* Portfolio */}
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Share Portfolio</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">৳{portfolioValue.toFixed(2)}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {totalShares} shares across {ownerships.length} {ownerships.length === 1 ? "project" : "projects"}
              </p>
              <Link href="/shares" className="text-xs text-brand font-semibold hover:underline">
                Browse Projects →
              </Link>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{pendingPurchases.length}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Awaiting admin approval</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-7">
          {/* Share Portfolio */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">My Share Portfolio</h2>
              <Link href="/shares" className="text-xs text-brand hover:underline font-medium">
                Browse more →
              </Link>
            </div>
            {ownerships.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-muted-foreground text-sm mb-3">You don&apos;t own any shares yet.</p>
                <Link href="/shares" className="inline-block bg-brand text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
                  Explore Projects
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {ownerships.map((o) => (
                  <div key={o.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{o.project?.name ?? "Project"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {o.quantity} shares · bought at ৳{Number(o.purchasePrice ?? 0).toFixed(2)}/share
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-foreground text-sm">
                          ৳{(Number(o.purchasePrice ?? 0) * o.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">total paid</p>
                      </div>
                      <Link
                        href={`/shares/resell?ownershipId=${o.id}`}
                        className="text-[11px] font-semibold text-brand border border-brand/30 px-2.5 py-1 rounded-lg hover:bg-brand hover:text-white transition-colors whitespace-nowrap"
                      >
                        List for Sale
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notifications */}
          <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Notifications</h2>
            </div>
            {recentNotifications.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentNotifications.map((n) => (
                  <div key={n.id} className={`px-5 py-3.5 ${!n.isRead ? "bg-brand-50/40" : ""}`}>
                    <p className="text-sm font-medium text-foreground leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message?.replace(/৳?\{Number\(request\.amount\)\.toFixed\(2\)\}/g, "৳ (Amount verified)")}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent wallet transactions */}
        {wallet && (wallet.transactions ?? []).length > 0 && (
          <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden mb-7">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Recent Transactions</h2>
            </div>
            <div className="divide-y divide-border">
              {wallet.transactions.map((tx) => (
                <div key={tx.id} className="px-6 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{WALLET_TX_LABELS[tx.type] ?? tx.type}</p>
                    <p className="text-xs text-muted-foreground">{tx.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${CREDIT_TX_TYPES.has(tx.type) ? "text-green-600" : "text-red-600"}`}>
                      {CREDIT_TX_TYPES.has(tx.type) ? "+" : "-"}৳{Number(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULE_LINKS.map((m) => (
            <Link key={m.href} href={m.href}>
              <div className="bg-white rounded-2xl border border-border p-5 h-full hover:shadow-md hover:border-brand/30 transition-all group">
                <div className="text-2xl mb-2">{m.icon}</div>
                <p className="font-semibold text-foreground group-hover:text-brand transition-colors">{m.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
