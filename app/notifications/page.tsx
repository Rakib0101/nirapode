import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getNotificationsAction, markNotificationsReadAction } from "@/app/actions/notifications";

export const metadata = { title: "Notifications — Nirapode" };

const TYPE_STYLES: Record<string, string> = {
  SYSTEM: "bg-brand-50 text-brand",
  PURCHASE: "bg-green-100 text-green-700",
  WALLET: "bg-amber-100 text-amber-700",
  TRADE: "bg-purple-100 text-purple-700",
  OTP: "bg-muted text-muted-foreground",
};

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { items } = await getNotificationsAction();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reminders, purchases and wallet activity.
          </p>
        </div>
        {items.some((n) => !n.isRead) && (
          <form
            action={async () => {
              "use server";
              await markNotificationsReadAction();
            }}
          >
            <button
              type="submit"
              className="text-xs font-semibold text-brand hover:underline cursor-pointer"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing yet. When a reminder fires or your wallet changes, it shows up here.
          </p>
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {items.map((n) => (
            <li key={n.id} className={`px-5 py-4 ${n.isRead ? "" : "bg-brand-50/40"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    TYPE_STYLES[n.type] ?? TYPE_STYLES.SYSTEM
                  }`}
                >
                  {n.type}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {n.createdAt.toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
