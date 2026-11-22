import { getSession } from "@/lib/session";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminBottomNav } from "@/components/admin-bottom-nav";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminAccess } from "@/lib/admin-permissions";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

async function getPendingCounts() {
  const [sharePurchases, shareBuyRequests, deposits, withdrawals, taxi, airTicket, checkouts] = await Promise.all([
    prisma.sharePurchaseRequest.count({ where: { status: "PENDING" } }),
    prisma.shareBuyRequest.count({ where: { status: "PENDING" } }),
    prisma.depositRequest.count({ where: { status: "PENDING" } }),
    prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
    prisma.taxiRequest.count({ where: { status: "PENDING" } }),
    prisma.airTicketRequest.count({ where: { status: "PENDING" } }),
    prisma.checkout.count({ where: { status: "AWAITING_PAYMENT" } }),
  ]);
  return { purchases: sharePurchases + shareBuyRequests, deposits, withdrawals, taxi, airTicket, checkouts };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) redirect("/admin-login");
  if (!ADMIN_ROLES.includes(session.role)) redirect("/dashboard");
  const access = await getAdminAccess();
  if (!access) redirect("/dashboard");

  const pendingCounts = await getPendingCounts();
  const userName = session.fullName ?? session.email.split("@")[0];

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Desktop sidebar — hidden on mobile */}
      <AdminSidebar
        userName={userName}
        userRole={session.role}
        userEmail={session.email}
        pendingCounts={pendingCounts}
        sections={access.sections}
      />

      {/* Page content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <AdminBottomNav
        pendingPurchases={pendingCounts.purchases}
        pendingDeposits={pendingCounts.deposits}
        userName={userName}
        userRole={session.role}
        sections={access.sections}
      />
    </div>
  );
}
