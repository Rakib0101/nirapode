import { getSession } from "@/lib/session";
import { getShareSgdRate, getShare4Amounts, getShare4ClosedDates } from "@/lib/share-pricing";
import { BuyRequestForm } from "./buy-request-form";
import Link from "next/link";

export default async function BuyRequestPage() {
  const [session, rate, amounts, closedDates] = await Promise.all([
    getSession(),
    getShareSgdRate(),
    getShare4Amounts(),
    getShare4ClosedDates(),
  ]);

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/dashboard" className="hover:text-brand transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href="/shares" className="hover:text-brand transition-colors">Shares</Link>
          <span>/</span>
          <span className="text-foreground">Buy Request</span>
        </div>

        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-7 py-5 border-b border-border">
            <h1 className="font-bold text-foreground text-xl">Request to Buy Shares</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tell us the share number you want, the size, your offered price, and your preferred date. Admin will review and get in touch.
            </p>
          </div>

          {session ? (
            <BuyRequestForm defaultName={session.fullName} rate={rate} amounts={amounts} closedDates={closedDates} />
          ) : (
            <div className="p-10 text-center">
              <div className="text-5xl mb-4">📈</div>
              <h2 className="font-bold text-foreground text-xl mb-2">Login to Submit a Buy Request</h2>
              <p className="text-muted-foreground text-sm mb-6">You need to be logged in to request buying shares.</p>
              <div className="flex justify-center gap-3">
                <Link href="/login" className="bg-brand text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-dark transition-colors text-sm">
                  Login
                </Link>
                <Link href="/register" className="border border-border text-foreground font-semibold px-6 py-2.5 rounded-xl hover:bg-muted transition-colors text-sm">
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800 space-y-1.5">
          <p className="font-semibold">How buy requests work</p>
          <ol className="space-y-1 text-xs text-blue-700 list-decimal list-inside">
            <li>Submit your request with share number, size, price and preferred date</li>
            <li>Admin reviews your request</li>
            <li>Once approved, admin will contact you to complete the purchase</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
