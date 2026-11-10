import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BalanceCard } from "@/components/balance-card";

// GCash-style signed-in home: balance up top, an icon grid of the actions
// people actually open the app for, then content rows. Rendered at / for
// logged-in users only (guests get the marketing hero) — see app/page.tsx.
//
// Icons are deliberately duotone filled shapes with no tile behind them, to
// match the reference's chunky illustrated look rather than thin line icons.
// `currentColor` + an opacity layer keeps them theme-safe.

const SVG = "w-9 h-9 text-brand";

function Duotone({ children }: { children: React.ReactNode }) {
  return (
    <svg className={SVG} viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
}

const QUICK_ACTIONS: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/wallet/send",
    label: "Send",
    icon: (
      <Duotone>
        <rect x="4" y="12" width="26" height="18" rx="4" opacity="0.3" />
        <path d="M31 18.5l9-6.5v24l-9-6.5z" />
        <path d="M12 21h12v4H12z" opacity="0.85" />
      </Duotone>
    ),
  },
  {
    href: "/dashboard/deposit",
    label: "Deposit",
    icon: (
      <Duotone>
        <rect x="6" y="26" width="36" height="16" rx="4" opacity="0.3" />
        <path d="M24 4a2.5 2.5 0 012.5 2.5v12.9l4.7-4.7a2.5 2.5 0 113.6 3.6l-9 9a2.5 2.5 0 01-3.6 0l-9-9a2.5 2.5 0 113.6-3.6l4.7 4.7V6.5A2.5 2.5 0 0124 4z" />
      </Duotone>
    ),
  },
  {
    href: "/dashboard/withdraw",
    label: "Withdraw",
    icon: (
      <Duotone>
        <rect x="6" y="26" width="36" height="16" rx="4" opacity="0.3" />
        <path d="M24 30a2.5 2.5 0 01-2.5-2.5V14.6l-4.7 4.7a2.5 2.5 0 11-3.6-3.6l9-9a2.5 2.5 0 013.6 0l9 9a2.5 2.5 0 11-3.6 3.6l-4.7-4.7v12.9A2.5 2.5 0 0124 30z" />
      </Duotone>
    ),
  },
  {
    href: "/shares",
    label: "Shares 6",
    icon: (
      <Duotone>
        <rect x="5" y="28" width="9" height="15" rx="2.5" opacity="0.3" />
        <rect x="19" y="20" width="9" height="23" rx="2.5" opacity="0.3" />
        <rect x="33" y="10" width="9" height="33" rx="2.5" opacity="0.3" />
        <path d="M8 24.5a2.4 2.4 0 01-1.6-4.2l11-9.8a2.4 2.4 0 013 0l6.4 5 9.6-9.1a2.4 2.4 0 113.3 3.5l-11.2 10.6a2.4 2.4 0 01-3.1.1l-6.5-5.1-9.3 8.3a2.4 2.4 0 01-1.6.7z" />
      </Duotone>
    ),
  },
  {
    href: "/taxi",
    label: "Taxi",
    icon: (
      <Duotone>
        <path d="M6 24l4-9a5 5 0 014.6-3h18.8A5 5 0 0138 15l4 9z" opacity="0.3" />
        <rect x="4" y="23" width="40" height="14" rx="4" />
        <circle cx="13" cy="39" r="4" />
        <circle cx="35" cy="39" r="4" />
        <rect x="18" y="4" width="12" height="6" rx="2" opacity="0.85" />
      </Duotone>
    ),
  },
  {
    href: "/air-ticket",
    label: "Air Ticket",
    icon: (
      <Duotone>
        <path d="M4 30l40-16-6 20-10-4-6 9-2-10z" opacity="0.3" />
        <path d="M44 10a3 3 0 00-4-2.6L6 21a2 2 0 00-.1 3.7l8.4 3.9 20-13.4-15 15.9.6 8.3a1.6 1.6 0 002.9.8l4.4-6 8.3 3.8a2 2 0 002.8-1.4l6.6-25.8A3 3 0 0044 10z" />
      </Duotone>
    ),
  },
  {
    href: "/pick-put",
    label: "Pick & Put",
    icon: (
      <Duotone>
        <path d="M24 4l18 9v22l-18 9-18-9V13z" opacity="0.3" />
        <path d="M24 24.6L6.6 15.3 24 6l17.4 9.3z" />
        <path d="M21.5 27v16.2l-15-7.5V19.5z" opacity="0.85" />
      </Duotone>
    ),
  },
  {
    href: "/services",
    label: "Services",
    icon: (
      <Duotone>
        <rect x="4" y="14" width="40" height="28" rx="5" opacity="0.3" />
        <path d="M18 6a5 5 0 00-5 5v3h5v-3h12v3h5v-3a5 5 0 00-5-5z" />
        <path d="M4 20h40v6a4 4 0 01-2.6 3.7L26 35.2a6 6 0 01-4 0L6.6 29.7A4 4 0 014 26z" />
      </Duotone>
    ),
  },
];

async function getHomeData(userId: string) {
  try {
    const [wallet, deals, products] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId }, select: { balance: true } }),
      prisma.project.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, imageUrl: true, sharePriceSgd: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, imageUrl: true, price: true, stock: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 8,
      }),
    ]);
    return { balance: wallet ? Number(wallet.balance) : 0, deals, products };
  } catch (err) {
    console.error("Signed-in home data error:", err);
    return {
      balance: 0,
      deals: [] as { id: string; name: string; imageUrl: string | null; sharePriceSgd: unknown }[],
      products: [] as { id: string; name: string; imageUrl: string | null; price: unknown; stock: number | null }[],
    };
  }
}

export async function SignedInHome({ userId, fullName }: { userId: string; fullName: string }) {
  const { balance, deals, products } = await getHomeData(userId);
  const firstName = fullName.trim().split(/\s+/)[0];

  return (
    <>
      {/* ── Balance + quick actions ── */}
      <section className="bg-brand-50/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-7">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Hello, {firstName}!</h1>
            <Link
              href="/contact"
              className="text-xs font-bold text-white bg-brand px-4 py-2 rounded-full hover:bg-brand-dark transition-colors shadow-xs"
            >
              HELP
            </Link>
          </div>

          <div className="rounded-3xl overflow-hidden border border-border shadow-sm">
            <BalanceCard balance={balance} />

            <div className="bg-white grid grid-cols-4 gap-y-6 px-2 sm:px-5 py-7">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex flex-col items-center gap-2.5 text-center active:scale-95 transition-transform"
                >
                  {a.icon}
                  <span className="text-[11px] sm:text-xs font-medium text-foreground leading-tight px-0.5">
                    {a.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT ── real items for sale, admin-managed in /admin/products.
           A bordered container with a price-first grid, matching the balance
           card above. Hidden entirely when the catalog is empty (same as Mega
           Deals) rather than falling back to unrelated cards, which read as
           broken under a heading that says PRODUCT. ── */}
      {products.length > 0 && (
        <section className="bg-brand-50/50 pb-7">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="inline-block text-sm font-extrabold tracking-wide text-white bg-emerald-600 px-4 py-1.5 rounded-xl">
                  PRODUCT
                </span>
                <Link href="/products" className="text-sm font-semibold text-brand hover:underline">
                  See all →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 p-5">
                {products.slice(0, 4).map((p) => {
                  const soldOut = p.stock !== null && p.stock <= 0;
                  return (
                    <Link key={p.id} href={`/products/${p.id}`} className="group">
                      <div className="relative">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-28 sm:h-36 w-full rounded-2xl object-cover border border-border"
                          />
                        ) : (
                          <div className="h-28 sm:h-36 w-full rounded-2xl bg-gradient-to-br from-brand to-brand-dark" />
                        )}
                        {soldOut && (
                          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full">
                            Sold out
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-brand transition-colors">
                        {p.name}
                      </p>
                      <p className="text-base font-bold text-brand mt-1">৳{Number(p.price).toFixed(2)}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Mega Deals ── (real ACTIVE projects; hidden when there are none) */}
      {deals.length > 0 && (
        <section className="bg-muted py-7">
          <div className="max-w-5xl mx-auto">
            <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Mega Deals</h2>
              <Link href="/shares" className="flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
                Show more
                <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </Link>
            </div>

            <div className="mt-4 flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 lg:px-8 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {deals.map((d) => (
                <Link
                  key={d.id}
                  href={`/shares/${d.id}`}
                  className="snap-start shrink-0 w-72 sm:w-96 rounded-2xl overflow-hidden border border-border bg-white hover:shadow-md transition-shadow"
                >
                  {d.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.imageUrl} alt={d.name} className="w-full h-36 sm:h-44 object-cover" />
                  ) : (
                    <div className="w-full h-36 sm:h-44 bg-gradient-to-br from-brand to-brand-dark" />
                  )}
                  <div className="px-4 py-3">
                    <p className="font-semibold text-foreground text-sm">{d.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      S${Number(d.sharePriceSgd).toFixed(2)} per share
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="bg-muted pb-6 text-center">
        <Link href="/dashboard" className="text-xs font-semibold text-brand hover:underline">
          View full dashboard →
        </Link>
      </div>
    </>
  );
}
