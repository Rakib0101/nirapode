import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { UserActionsMenu, DirectAdjustWalletButton } from "@/components/admin-user-actions";
import { CreateUserModal } from "./create-user-modal";

async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fullName: true, email: true, nidNumber: true,
      phone: true, role: true, isVerified: true, isActive: true, createdAt: true,
      isAgent: true, referralCode: true,
      wallet: { select: { balance: true } },
    },
  });
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  MODERATOR: "bg-amber-100 text-amber-700",
  USER: "bg-gray-100 text-gray-600",
};

export default async function AdminUsersPage() {
  const [users, session] = await Promise.all([getUsers(), getSession()]);
  const actorRole = session?.role ?? "MODERATOR";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">{users.length} total members</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Role legend */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />You can manage
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300" />Read-only
            </span>
          </div>
          <CreateUserModal actorRole={actorRole} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Member</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">NID</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Wallet</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden lg:table-cell">Joined</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors align-top">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${u.isActive ? "bg-brand-50" : "bg-gray-100"}`}>
                        <span className={`text-xs font-bold ${u.isActive ? "text-brand" : "text-gray-400"}`}>
                          {u.fullName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className={`font-medium ${u.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}>
                          {u.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{u.nidNumber}</td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{u.phone}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground whitespace-nowrap">
                        ৳{u.wallet ? Number(u.wallet.balance).toFixed(2) : "0.00"}
                      </span>
                      <DirectAdjustWalletButton user={{ id: u.id, fullName: u.fullName, email: u.email }} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 text-xs ${u.isVerified ? "text-green-700" : "text-amber-700"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${u.isVerified ? "bg-green-500" : "bg-amber-400"}`} />
                        {u.isVerified ? "Verified" : "Unverified"}
                      </span>
                      {!u.isActive && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                          Banned
                        </span>
                      )}
                      {u.isAgent && (
                        <span className="inline-flex items-center gap-1 text-xs text-brand">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />
                          Agent
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs hidden lg:table-cell">
                    {u.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <UserActionsMenu
                      user={{
                        id: u.id, role: u.role, isVerified: u.isVerified, isActive: u.isActive,
                        isAgent: u.isAgent, referralCode: u.referralCode,
                        fullName: u.fullName, email: u.email, phone: u.phone,
                      }}
                      actorRole={actorRole}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission note */}
      <p className="mt-3 text-xs text-muted-foreground px-1">
        {actorRole === "SUPER_ADMIN"
          ? "As Super Admin you can manage all users and change roles."
          : "As Admin you can manage regular users only. Role changes require Super Admin."}
      </p>
    </div>
  );
}
