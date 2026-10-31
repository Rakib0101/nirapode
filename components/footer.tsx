import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { DEFAULT_CONTACT_SETTINGS, formatWhatsAppLink, type SiteContactSettings } from "@/lib/site-contact-types";

export function Footer({ contact = DEFAULT_CONTACT_SETTINGS }: { contact?: SiteContactSettings }) {
  const whatsappHref = formatWhatsAppLink(contact.whatsappNumber, contact.whatsappMessage);

  const links = {
    Services: [
      { href: "/shares", label: "Shares & Investment" },
      { href: "/wallet", label: "Wallet & Deposit" },
      { href: "/air-ticket", label: "Air Ticket Booking" },
      { href: "/taxi", label: "Taxi Rental" },
      { href: "/currency", label: "Currency Converter" },
      { href: "/apply", label: "Service Application" },
    ],
    Community: [
      { href: "/forum", label: "Community Forum" },
      { href: "/islamic-center", label: "Islamic Center & Quran" },
      { href: "/pick-put", label: "Pick & Put" },
      { href: "/reminders", label: "Alarm & Reminders" },
      { href: "/blog", label: "Probashi News & Blog" },
      { href: "/contact", label: "Contact Support" },
    ],
    Account: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/profile", label: "My Profile" },
      { href: "/history", label: "All History & Orders" },
      { href: "/shares/my", label: "My Investments" },
      { href: "/login", label: "Login" },
      { href: "/register", label: "Register Free" },
    ],
  };

  return (
    <footer className="bg-muted border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & Direct Contact */}
          <div className="lg:col-span-2 space-y-4">
            <div className="mb-3">
              <Logo size="md" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Complete trusted expatriate community platform. Shares, Flight Tickets, Currency, Islamic Center, and Community Support.
            </p>

            {/* Direct WhatsApp button */}
            <div className="pt-1 flex flex-wrap gap-2.5">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5a] px-4 py-2 rounded-full transition-all shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp Support ({contact.whatsappNumber})
              </a>

              {contact.facebookUrl && (
                <a
                  href={contact.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1877F2] hover:bg-blue-700 px-3.5 py-2 rounded-full transition-all shadow-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook Group
                </a>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-2">
              <p>
                <span className="font-semibold text-foreground">Email:</span>{" "}
                <a href={`mailto:${contact.supportEmail}`} className="hover:text-brand transition-colors">
                  {contact.supportEmail}
                </a>
              </p>
              {contact.supportPhone && (
                <p>
                  <span className="font-semibold text-foreground">Hotline:</span>{" "}
                  <a href={`tel:${contact.supportPhone}`} className="hover:text-brand transition-colors">
                    {contact.supportPhone}
                  </a>
                </p>
              )}
              {contact.officeHours && (
                <p>
                  <span className="font-semibold text-foreground">Hours:</span> {contact.officeHours}
                </p>
              )}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h3 className="text-xs font-semibold text-foreground mb-4 uppercase tracking-widest">
                {title}
              </h3>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-brand transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Nirapode. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <Link href="/privacy" className="hover:text-brand transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-brand transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
