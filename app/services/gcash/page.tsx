import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getGcashSettings } from "@/lib/gcash-transfer";
import { formatMoney, gcashMethodLabel } from "@/lib/gcash-transfer-shared";
import { StoredScreenshot } from "@/components/stored-screenshot";
import { GcashTransferForm } from "./gcash-form";

export const metadata = { title: "Send to GCash | Nirapode" };

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Checking payment", cls: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Sent", cls: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-700" },
};

// SGD → GCash: the user pays SGD to us, uploads proof, and we send Pesos to
// their GCash. The wallet isn't involved.
export default async function GcashTransferPage() {
  const [session, settings] = await Promise.all([getSession(), getGcashSettings()]);
  const requests = session
    ? await prisma.gcashTransfer.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <Link href="/services" className="text-xs text-muted-foreground hover:text-brand">
            ← Services
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-2">Send to GCash</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pay in Singapore Dollars, and we send Pesos to any GCash account in the Philippines.
          </p>
        </div>

        {/* Rate */}
        <div className="bg-white rounded-2xl border border-border p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today&apos;s rate</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {settings.rate ? <>S$1 = ₱{formatMoney(settings.rate)}</> : "Not set yet"}
            </p>
          </div>
          <span className="text-3xl" aria-hidden>
            🇸🇬→🇵🇭
          </span>
        </div>

        {/* Where to pay + instructions */}
        {(settings.receiveAccounts || settings.instructions) && (
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
            {settings.receiveAccounts && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">1. Pay SGD to</p>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-muted rounded-xl px-4 py-3 text-foreground">
                  {settings.receiveAccounts}
                </pre>
              </div>
            )}
            {settings.instructions && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Instructions</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{settings.instructions}</p>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-4">2. Send your request</p>
          {!session ? (
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-brand font-semibold hover:underline">
                Log in
              </Link>{" "}
              to send a request.
            </p>
          ) : !settings.rate ? (
            <p className="text-sm text-muted-foreground">This service opens once the exchange rate is set.</p>
          ) : (
            <GcashTransferForm rate={settings.rate} />
          )}
        </div>

        {/* My requests */}
        {requests.length > 0 && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">My requests</h2>
            </div>
            <ul className="divide-y divide-border">
              {requests.map((r) => {
                const st = STATUS[r.status] ?? STATUS.PENDING;
                return (
                  <li key={r.id} className="px-5 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          S${formatMoney(Number(r.amountSgd))} → ₱{formatMoney(Number(r.amountPhp))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          To GCash {r.recipientGcashNumber} ({r.recipientName}) · paid via{" "}
                          {gcashMethodLabel(r.paymentMethod)} ·{" "}
                          {r.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    {r.status === "REJECTED" && r.adminNote && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        Reason: {r.adminNote}
                      </p>
                    )}
                    {r.status === "COMPLETED" && r.adminNote && (
                      <p className="text-xs text-muted-foreground">Note: {r.adminNote}</p>
                    )}
                    <div className="flex flex-wrap gap-4">
                      <StoredScreenshot value={r.paymentProofUrl} label="My payment proof" />
                      <StoredScreenshot value={r.sentProofUrl} label="GCash send proof" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
