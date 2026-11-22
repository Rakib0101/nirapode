"use client";

import { sectionForPath } from "@/lib/admin-sections";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  pendingPurchases: number;
  pendingDeposits: number;
  userName: string;
  userRole: string;
  // Admin sections this account may use; links to the rest are hidden.
  sections: string[];
};

const MORE_LINKS = [
  { href: "/admin/shares",    label: "Share Projects",   icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
  { href: "/admin/gcash",      label: "SGD → GCash",      icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg> },
  { href: "/admin/withdrawals", label: "Withdrawals",      icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg> },
  { href: "/admin/products",   label: "Products",         icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  { href: "/admin/air-ticket", label: "Air Tickets",      icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
  { href: "/admin/taxi",      label: "Taxi Requests",    icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
  { href: "/admin/blog",      label: "Blog",             icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { href: "/admin/islamic",   label: "Islamic Center",   icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> },
  { href: "/admin/pick-put",label: "Pick & Put",       icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { href: "/admin/apply",      label: "Apply / Services", icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
  { href: "/admin/partner-companies", label: "Partners",  icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg> },
  { href: "/admin/checkouts", label: "Checkouts",        icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m-10-4h10m-10 4a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z"/></svg> },
  { href: "/admin/settings", label: "Settings",          icon: <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

export function AdminBottomNav({ pendingPurchases, pendingDeposits, userName, userRole, sections }: Props) {
  const allowed = (href: string) => {
    const section = sectionForPath(href);
    return section === null || sections.includes(section);
  };
  const moreLinks = MORE_LINKS.filter((l) => allowed(l.href));
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const totalPending = pendingPurchases + pendingDeposits;

  // Close the "More" sheet on navigation (adjusted during render, not in an effect)
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    setSheetOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  const tabs = ([
    {
      href: "/admin",
      label: "Dashboard",
      exact: true,
      badge: 0,
      icon: (active: boolean) => (
        <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
    },
    {
      href: "/admin/purchases",
      label: "Purchases",
      exact: false,
      badge: pendingPurchases,
      icon: (active: boolean) => (
        <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      ),
    },
    {
      href: "/admin/deposits",
      label: "Deposits",
      exact: false,
      badge: pendingDeposits,
      icon: (active: boolean) => (
        <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      ),
    },
    {
      href: "/admin/users",
      label: "Users",
      exact: false,
      badge: 0,
      icon: (active: boolean) => (
        <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
    },
  ]).filter((t) => allowed(t.href));

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href || pathname === href + "/" : pathname.startsWith(href);

  const isMoreActive = moreLinks.some((l) => pathname.startsWith(l.href));

  return (
    <>
      {/* Backdrop */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSheetOpen(false)} />
      )}

      {/* More sheet */}
      <div
        className="lg:hidden fixed inset-x-0 bottom-16 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          maxHeight: "70vh",
          transform: sheetOpen ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          pointerEvents: sheetOpen ? "auto" : "none",
        }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-6 pt-2">
          {/* User info */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-xl">
            <span className="w-10 h-10 rounded-full bg-brand text-white font-bold text-sm flex items-center justify-center shrink-0">
              {userName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{userName}</p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand-50 px-1.5 py-0.5 rounded">
                {userRole.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Visit website */}
          <Link
            href="/"
            className="flex items-center gap-3 w-full px-4 py-3 mb-4 rounded-xl bg-brand-50 text-brand font-medium text-sm active:scale-95 transition-transform"
          >
            <svg className="w-4.5 h-4.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Visit Website
          </Link>

          {/* More nav links */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
            More Sections
          </p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {moreLinks.map((item) => {
              const active = pathname.startsWith(item.href);
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

          {/* Logout */}
          <form action="/api/logout" method="POST">
            <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-xl active:scale-95 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
              Logout
            </button>
          </form>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-border safe-area-pb">
        <div className="flex items-stretch h-16">
          {tabs.map((tab) => {
            const active = isActive(tab.href, tab.exact);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors ${
                  active ? "text-brand" : "text-muted-foreground"
                }`}
              >
                {tab.icon(active)}
                {tab.badge > 0 && (
                  <span className="absolute top-2 right-1/4 translate-x-1/2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </Link>
            );
          })}

          {/* More */}
          <button
            onClick={() => setSheetOpen((v) => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors ${
              isMoreActive || sheetOpen ? "text-brand" : "text-muted-foreground"
            }`}
          >
            <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isMoreActive || sheetOpen ? 2.5 : 1.8} strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            {totalPending > 0 && (
              <span className="absolute top-2 right-1/4 translate-x-1/2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {totalPending > 9 ? "9+" : totalPending}
              </span>
            )}
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
