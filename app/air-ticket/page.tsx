import { getSession } from "@/lib/session";
import { AirTicketRequestForm } from "./air-ticket-form";
import { getSiteContactSettings, formatWhatsAppLink } from "@/lib/site-contact";
import Link from "next/link";

export default async function AirTicketPage() {
  const [session, contact] = await Promise.all([
    getSession(),
    getSiteContactSettings(),
  ]);

  const whatsappHref = formatWhatsAppLink(
    contact.whatsappNumber,
    "Hello Nirapode Support, I need urgent assistance with an Air Ticket booking."
  );

  return (
    <div className="min-h-screen bg-muted">
      {/* Hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-brand bg-brand-50 px-3 py-1 rounded-full mb-3">
            Air Tickets
          </span>
          <h1 className="text-3xl font-bold text-foreground">Community Air Ticket Booking</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">Tell us your travel dates and we&apos;ll find you the best fare — direct bookings with verified agents, no hidden fees.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Form */}
        <div>
          {session ? (
            <AirTicketRequestForm />
          ) : (
            <div className="bg-white rounded-2xl border border-border p-10 text-center">
              <div className="text-5xl mb-4">✈️</div>
              <h2 className="font-bold text-foreground text-xl mb-2">Login to Book a Flight</h2>
              <p className="text-muted-foreground text-sm mb-6">You need to be logged in to submit an air ticket request.</p>
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

        {/* Urgent Contact at bottom */}
        <div className="bg-brand-50 rounded-2xl border border-brand-100 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand">Need urgent booking?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Contact us directly on WhatsApp for immediate assistance ({contact.whatsappNumber}).</p>
          </div>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-white bg-[#25D366] px-5 py-2.5 rounded-xl hover:bg-[#1ebe5a] transition-colors shrink-0 shadow-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            WhatsApp Us
          </a>
        </div>
      </div>
    </div>
  );
}
