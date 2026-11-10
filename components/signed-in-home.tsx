import Link from "next/link";
import { prisma } from "@/lib/prisma";

// GCash-style signed-in home: balance up top, then a grid of the actions
// people actually open the app for. Rendered at / for logged-in users only
// (guests get the marketing hero instead) — see app/page.tsx.

const ICON = "w-6 h-6";

const QUICK_ACTIONS: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/wallet/send",
    label: "Send",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/deposit",
    label: "Deposit",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M19 12l-7 7-7-7" />
      </svg>
    ),
  },
  {
    href: "/dashboard/withdraw",
    label: "Withdraw",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    ),
  },
  {
    href: "/shares",
    label: "Shares 6",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: "/taxi",
    label: "Taxi",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    href: "/air-ticket",
    label: "Air Ticket",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.2.6-.6.5-1.1z" />
      </svg>
    ),
  },
  {
    href: "/pick-put",
    label: "Pick & Put",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: "/services",
    label: "Services",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

async function getBalance(userId: string): Promise<number> {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });
    return wallet ? Number(wallet.balance) : 0;
  } catch (err) {
    console.error("Signed-in home wallet fetch error:", err);
    return 0;
  }
}

export async function SignedInHome({ userId, fullName }: { userId: string; fullName: string }) {
  const balance = await getBalance(userId);
  const firstName = fullName.trim().split(/\s+/)[0];

  return (
    <section className="bg-brand-50/40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-8">
        {/* Greeting */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Hello, {firstName}!</h1>
          <Link
            href="/contact"
            className="text-xs font-bold text-white bg-brand px-4 py-2 rounded-full hover:bg-brand-dark transition-colors shadow-xs"
          >
            HELP
          </Link>
        </div>

        {/* Balance + quick actions, joined into one card like the reference */}
        <div className="rounded-3xl overflow-hidden border border-border shadow-sm">
          <div className="bg-gradient-to-br from-brand to-brand-dark px-5 sm:px-7 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Available Balance</p>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-1.5">
              <p className="text-3xl sm:text-4xl font-bold text-white">
                ৳ {balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <Link
                href="/dashboard/deposit"
                className="shrink-0 text-sm font-bold text-brand bg-white px-5 py-2.5 rounded-full hover:bg-white/90 active:scale-95 transition-all shadow-xs"
              >
                + Add Money
              </Link>
            </div>
          </div>

          <div className="bg-white grid grid-cols-4 gap-y-5 px-3 sm:px-5 py-6">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex flex-col items-center gap-2 text-center active:scale-95 transition-transform group"
              >
                <span className="w-12 h-12 rounded-2xl bg-brand-50 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                  {a.icon}
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-foreground leading-tight px-0.5">
                  {a.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Pointer to the full dashboard — this home is a launcher, not a replacement */}
        <div className="flex justify-center mt-4">
          <Link href="/dashboard" className="text-xs font-semibold text-brand hover:underline">
            View full dashboard →
          </Link>
        </div>
      </div>
    </section>
  );
}
