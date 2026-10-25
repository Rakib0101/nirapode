import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { waLink } from "@/lib/whatsapp";

async function getMyRequests(userId: string) {
  return prisma.airTicketRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      assignedManager: { select: { fullName: true, phone: true } },
      checkoutItem: {
        include: {
          checkout: { select: { id: true, token: true, status: true, totalAmount: true } },
        },
      },
    },
  });
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ASSIGNED: "bg-purple-100 text-purple-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

function fmt(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function MyAirTicketRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const requests = await getMyRequests(session.userId);

  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <Link
            href="/air-ticket"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Book a Flight
          </Link>
          <h1 className="text-2xl font-bold text-foreground">My Air Ticket Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Track the status, assigned manager, and price for your bookings.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">✈️</div>
            <p className="text-lg font-semibold text-foreground mb-2">No requests yet</p>
            <p className="text-muted-foreground text-sm mb-6">Request a flight and track its status here.</p>
            <Link
              href="/air-ticket"
              className="inline-block bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors"
            >
              Request Flight
            </Link>
          </div>
        ) : (
          requests.map((r) => {
            const assigneeName = r.assignedManager?.fullName ?? null;
            const assigneePhone = r.assignedManager?.phone ?? null;
            const price = r.price != null ? Number(r.price) : null;
            const checkout = r.checkoutItem?.checkout ?? null;

            return (
              <div key={r.id} className="bg-white rounded-2xl border border-border p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {r.origin} → {r.destination}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fmt(r.departDate)}{r.returnDate ? ` – ${fmt(r.returnDate)}` : ""} · {r.preferredAirline ?? "—"} · {r.passengers} pax
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.ticketUrl && (
                      <a
                        href={`/api/tickets/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={`nirapode-ticket-${r.id}.pdf`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg transition-colors shadow-2xs"
                      >
                        📥 Download E-Ticket
                      </a>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.status}
                    </span>
                  </div>
                </div>

                {(assigneeName || price != null || checkout) && (
                  <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {assigneeName && (
                        <p className="text-sm text-foreground">
                          Assigned to: <span className="font-medium">{assigneeName}</span>
                        </p>
                      )}
                      {price != null && (
                        <p className="text-sm font-semibold text-foreground">
                          Price: ৳{price.toFixed(2)}
                        </p>
                      )}
                      {assigneePhone && (
                        <a
                          href={waLink(
                            assigneePhone,
                            `Hi, following up on my air ticket request from ${r.origin} to ${r.destination} on ${fmt(r.departDate)}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#25D366] px-3 py-1.5 rounded-lg hover:bg-[#1ebe5a] transition-colors"
                        >
                          Message on WhatsApp
                        </a>
                      )}
                    </div>

                    {checkout && (
                      <div>
                        {checkout.status === "PAID" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                            ✓ Paid & Confirmed
                          </span>
                        ) : checkout.status === "PROOF_SUBMITTED" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                            ⏳ Payment Under Review
                          </span>
                        ) : (
                          <Link
                            href={`/pay/${checkout.token}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand hover:bg-brand-dark px-4 py-1.5 rounded-lg transition-colors shadow-xs"
                          >
                            💳 Pay Now (৳{Number(checkout.totalAmount).toFixed(2)})
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
