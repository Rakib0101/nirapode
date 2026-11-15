import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerateLinkButton, PaymentLinkCard, ReviewActions, DeleteCheckoutButton } from "./checkout-detail-actions";
import { StoredScreenshot } from "@/components/stored-screenshot";

async function getCheckout(id: string) {
  return prisma.checkout.findUnique({
    where: { id },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      createdBy: { select: { fullName: true } },
      items: true,
    },
  });
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  AWAITING_PAYMENT: "bg-amber-100 text-amber-700",
  PROOF_SUBMITTED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  GCASH: "GCash",
  PAYNOW: "PayNow",
  WALLET: "Wallet",
};

export default async function AdminCheckoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const checkout = await getCheckout(id);
  if (!checkout) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/checkouts"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Checkouts
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{checkout.user.fullName}</h1>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[checkout.status] ?? "bg-gray-100 text-gray-600"}`}>
            {checkout.status.replace("_", " ")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{checkout.user.email} · {checkout.user.phone}</p>
      </div>

      {/* Itemized breakdown */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-5">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">Items</h2>
        </div>
        <div className="divide-y divide-border">
          {checkout.items.map((item) => (
            <div key={item.id} className="px-6 py-3.5 flex items-center justify-between text-sm">
              <div>
                <p className="text-foreground">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × ৳{Number(item.unitPrice).toFixed(2)}
                </p>
              </div>
              <p className="font-semibold text-foreground">৳{Number(item.lineTotal).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-border space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">৳{Number(checkout.subtotal).toFixed(2)}</span>
          </div>
          {Number(checkout.discountAmount) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-red-600">−৳{Number(checkout.discountAmount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-bold pt-1.5 border-t border-border">
            <span className="text-foreground">Total</span>
            <span className="text-brand">৳{Number(checkout.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment link — persistent once generated, so it's always findable here */}
      {checkout.status !== "DRAFT" && checkout.status !== "CANCELLED" && (
        <div className="bg-white rounded-xl border border-border p-5 mb-5">
          <h2 className="font-semibold text-foreground text-sm mb-3">Payment Link</h2>
          <PaymentLinkCard
            url={`${baseUrl}/pay/${checkout.token}`}
            customerName={checkout.user.fullName}
            customerPhone={checkout.user.phone}
            total={Number(checkout.totalAmount)}
          />
        </div>
      )}

      {/* Payment proof, if submitted */}
      {(checkout.status === "PROOF_SUBMITTED" || checkout.status === "PAID" || checkout.status === "REJECTED") && checkout.paymentMethod && (
        <div className="bg-white rounded-xl border border-border p-5 mb-5 space-y-2">
          <h2 className="font-semibold text-foreground text-sm mb-2">Payment Proof</h2>
          <p className="text-sm text-foreground">Method: <span className="font-medium">{PAYMENT_METHOD_LABELS[checkout.paymentMethod] ?? checkout.paymentMethod}</span></p>
          {checkout.txId && <p className="text-sm text-foreground">Transaction ID: <span className="font-mono">{checkout.txId}</span></p>}
          {checkout.screenshotUrl && (
            <div>
              <StoredScreenshot value={checkout.screenshotUrl} label="📎 View Payment Screenshot" />
            </div>
          )}
          {checkout.adminNote && <p className="text-sm text-muted-foreground">Note: {checkout.adminNote}</p>}
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl border border-border p-5">
        {checkout.status === "DRAFT" && (
          <div className="flex flex-wrap items-start gap-3">
            <GenerateLinkButton checkoutId={checkout.id} />
            <DeleteCheckoutButton checkoutId={checkout.id} />
          </div>
        )}
        {checkout.status === "AWAITING_PAYMENT" && (
          <p className="text-sm text-muted-foreground">Waiting for the customer to submit payment proof.</p>
        )}
        {checkout.status === "PROOF_SUBMITTED" && <ReviewActions checkoutId={checkout.id} />}
        {checkout.status === "PAID" && (
          <p className="text-sm text-green-700 font-medium">Payment confirmed. Booking(s) marked as confirmed.</p>
        )}
        {checkout.status === "REJECTED" && (
          <p className="text-sm text-muted-foreground">Proof rejected. Customer can resubmit using the same link.</p>
        )}
      </div>
    </div>
  );
}
