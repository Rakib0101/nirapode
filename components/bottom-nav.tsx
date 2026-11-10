"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { SessionPayload } from "@/lib/session";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function SharesIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function IslamicIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}
function BlogIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// ── Icons reused in extra links ────────────────────────────────────────────────

const IcoPlane   = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IcoCurr    = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
const IcoTaxi    = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IcoSearch  = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcoChat     = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const IcoWallet   = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IcoChart    = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IcoServices = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
const IcoApply    = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
const IcoRequest  = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 8l2 2 4-4"/></svg>;
const IcoResell   = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/><circle cx="12" cy="12" r="2.5"/></svg>;
const IcoMap      = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const IcoShop     = <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>;

// ── Extra links shown in the sheet (static — for guests) ──────────────────────

const GUEST_LINKS = [
  { href: "/products",           label: "Products",           icon: IcoShop   },
  { href: "/shares/buy-request", label: "Share 4", icon: IcoRequest },
  { href: "/shares/resell",      label: "Resell Market",      icon: IcoResell  },
  { href: "/apply",              label: "Apply for Service",  icon: IcoApply   },
  { href: "/services",           label: "Services",           icon: IcoServices },
  { href: "/air-ticket",         label: "Air Ticket",         icon: IcoPlane  },
  { href: "/currency",           label: "Currency",           icon: IcoCurr   },
  { href: "/taxi",               label: "Taxi",               icon: IcoTaxi   },
  { href: "/pick-put",         label: "Pick & Put",       icon: IcoSearch },
  { href: "/mrt-map",            label: "MRT Map",            icon: IcoMap    },
  { href: "/contact",            label: "Contact",            icon: IcoChat   },
];

const USER_LINKS = [
  { href: "/products",           label: "Products",           icon: IcoShop     },
  { href: "/shares/my",          label: "My Investments",     icon: IcoChart    },
  { href: "/shares/buy-request", label: "Share 4", icon: IcoRequest  },
  { href: "/shares/resell",      label: "Resell Market",      icon: IcoResell   },
  { href: "/services",           label: "Services",           icon: IcoServices },
  { href: "/pick-put/my",      label: "My Pick & Put",    icon: IcoSearch   },
  { href: "/apply",              label: "Apply",              icon: IcoApply    },
  { href: "/wallet",             label: "Wallet",             icon: IcoWallet   },
  { href: "/air-ticket",         label: "Air Tickets",        icon: IcoPlane  },
  { href: "/currency",           label: "Currency",           icon: IcoCurr   },
  { href: "/taxi",               label: "Taxi",               icon: IcoTaxi   },
  { href: "/mrt-map",            label: "MRT Map",            icon: IcoMap    },
  { href: "/contact",            label: "Contact",            icon: IcoChat   },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function BottomNav({ user }: { user: SessionPayload | null }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const EXTRA_LINKS = user ? USER_LINKS : GUEST_LINKS;

  // Close sheet on route change
  useEffect(() => { setSheetOpen(false); }, [pathname]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  const isActive = (href: string, prefix = false) => {
    if (href === "/") return pathname === "/";
    return prefix ? pathname.startsWith(href) : pathname === href;
  };

  const isMoreActive = EXTRA_LINKS.some((l) => pathname === l.href || pathname.startsWith(l.href + "/"));

  const mainTabs = [
    { href: "/",               label: "Home",    icon: HomeIcon },
    { href: "/shares",         label: "Shares 6",  icon: SharesIcon,  prefix: true },
    { href: "/islamic-center", label: "Islamic", icon: IslamicIcon, prefix: true },
    { href: "/blog",           label: "Blog",    icon: BlogIcon,    prefix: true },
  ];

  return (
    <>
      {/* ── Backdrop ── */}
      {sheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* ── Drawer ── (inline transform so hiding is guaranteed regardless of Tailwind class scanning) */}
      <div
        className="lg:hidden fixed inset-x-0 bottom-16 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          maxHeight: "75vh",
          transform: sheetOpen ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          pointerEvents: sheetOpen ? "auto" : "none",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 pb-6 pt-2">

          {/* Auth section */}
          {user ? (
            <div className="mb-5 p-4 bg-muted rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-11 h-11 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {getInitials(user.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-brand bg-brand-50 px-1.5 py-0.5 rounded">
                    {user.role.replace("_", " ")}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ADMIN_ROLES.includes(user.role) && (
                  <Link href="/admin" className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-brand bg-brand-50 rounded-xl active:scale-95 transition-transform col-span-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                    Admin Panel
                  </Link>
                )}
                <Link href="/dashboard" className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-foreground bg-white border border-border rounded-xl active:scale-95 transition-transform">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" /></svg>
                  Dashboard
                </Link>
                <Link href="/profile" className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-foreground bg-white border border-border rounded-xl active:scale-95 transition-transform">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                  Profile
                </Link>
                <form action="/api/logout" method="POST" className="col-span-2">
                  <button type="submit" className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl active:scale-95 transition-transform">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                    Logout
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="mb-5 grid grid-cols-2 gap-3">
              <Link href="/login" className="flex items-center justify-center py-3 text-sm font-semibold text-brand border border-brand rounded-xl active:scale-95 transition-transform">
                Login
              </Link>
              <Link href="/register" className="flex items-center justify-center py-3 text-sm font-semibold text-white bg-brand rounded-xl active:scale-95 transition-transform">
                Register
              </Link>
            </div>
          )}

          {/* Extra nav links */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
            More Services
          </p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {EXTRA_LINKS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform ${
                    active ? "bg-brand-50 text-brand" : "bg-muted text-foreground"
                  }`}
                >
                  <span className={active ? "text-brand" : "text-muted-foreground"}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── Bottom tab bar ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-border safe-area-pb">
        <div className="flex items-stretch h-16">
          {mainTabs.map((tab) => {
            const active = isActive(tab.href, tab.prefix);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-brand" : "text-muted-foreground"
                }`}
              >
                <Icon active={active} />
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </Link>
            );
          })}

          {/* More tab */}
          <button
            onClick={() => setSheetOpen((v) => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              isMoreActive || sheetOpen ? "text-brand" : "text-muted-foreground"
            }`}
          >
            <MoreIcon active={isMoreActive || sheetOpen} />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
