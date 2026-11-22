import { prisma } from "@/lib/prisma";
import { getGcashSettings } from "@/lib/gcash-transfer";
import { formatMoney, gcashMethodLabel } from "@/lib/gcash-transfer-shared";
import { StoredScreenshot } from "@/components/stored-screenshot";
import { GcashSettingsForm, ProcessGcashForm } from "./forms";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function AdminGcashPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status === "COMPLETED" || status === "REJECTED" || status === "ALL" ? status : "PENDING";

  const [settings, requests, pendingCount] = await Promise.all([
    getGcashSettings(),
    prisma.gcashTransfer.findMany({
      where: filter === "ALL" ? {} : { status: filter },
      orderBy: { createdAt: filter === "PENDING" ? "asc" : "desc" },
      take: 100,
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        processedBy: { select: { fullName: true } },
      },
    }),
    prisma.gcashTransfer.count({ where: { status: "PENDING" } }),
  ]);

  const tabs = [
    { key: "PENDING", label: `Pending (${pendingCount})` },
    { key: "COMPLETED", label: "Sent" },
    { key: "REJECTED", label: "Rejected" },
    { key: "ALL", label: "All" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SGD → GCash</h1>
        <p className="text-sm text-muted-foreground">
          Users pay SGD and upload proof. Check the payment, send the Pesos by GCash, then complete the request with a
          screenshot of the send. No wallet balance is involved.
        </p>
      </div>

      <GcashSettingsForm settings={settings} />

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/admin/gcash?status=${t.key}`}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              filter === t.key ? "bg-brand text-white border-brand" : "bg-white border-border text-muted-foreground"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-border px-6 py-10 text-center text-sm text-muted-foreground">
          Nothing here.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-border p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-lg font-bold text-foreground">
                      S${formatMoney(Number(r.amountSgd))} → ₱{formatMoney(Number(r.amountPhp))}
                    </p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rate {Number(r.rate)} ·{" "}
                    {r.createdAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm mt-2">
                    <dt className="text-muted-foreground">Customer</dt>
                    <dd className="text-foreground">
                      {r.user.fullName} <span className="text-muted-foreground text-xs">{r.user.email}</span>
                    </dd>
                    <dt className="text-muted-foreground">Paid via</dt>
                    <dd className="text-foreground">
                      {gcashMethodLabel(r.paymentMethod)} from <span className="font-mono">{r.payerAccount}</span>
                    </dd>
                    <dt className="text-muted-foreground">Send to GCash</dt>
                    <dd className="text-foreground font-semibold">
                      <span className="font-mono">{r.recipientGcashNumber}</span> — {r.recipientName}
                    </dd>
                    {r.note && (
                      <>
                        <dt className="text-muted-foreground">Note</dt>
                        <dd className="text-foreground">{r.note}</dd>
                      </>
                    )}
                    {r.adminNote && (
                      <>
                        <dt className="text-muted-foreground">Admin note</dt>
                        <dd className="text-foreground">{r.adminNote}</dd>
                      </>
                    )}
                    {r.processedBy && (
                      <>
                        <dt className="text-muted-foreground">Handled by</dt>
                        <dd className="text-foreground">{r.processedBy.fullName}</dd>
                      </>
                    )}
                  </dl>
                  <div className="flex gap-4 pt-2">
                    <StoredScreenshot value={r.paymentProofUrl} label="User's payment proof" />
                    <StoredScreenshot value={r.sentProofUrl} label="GCash send proof" />
                  </div>
                </div>
                {r.status === "PENDING" && (
                  <div className="sm:w-72 shrink-0">
                    <ProcessGcashForm id={r.id} pesos={formatMoney(Number(r.amountPhp))} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
