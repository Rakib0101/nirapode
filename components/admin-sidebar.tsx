"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const nav = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard", href: "/admin",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        label: "Users", href: "/admin/users",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      },
      {
        label: "Share Projects", href: "/admin/shares",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      },
      {
        label: "Purchase Requests", href: "/admin/purchases",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      },
      {
        label: "Deposits", href: "/admin/deposits",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      },
      {
        label: "Withdrawals", href: "/admin/withdrawals",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" /></svg>,
      },
      {
        label: "Checkouts", href: "/admin/checkouts",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m-10-4h10m-10 4a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" /></svg>,
      },
    ],
  },
  {
    title: "Transport",
    items: [
      {
        label: "Air Tickets", href: "/admin/air-ticket",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
      },
      {
        label: "Taxi Requests", href: "/admin/taxi",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
      },
      {
        label: "Taxi Vendors", href: "/admin/taxi/vendors",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l1.5-4.5A2 2 0 018.4 7h7.2a2 2 0 011.9 1.5L19 13m-14 0v5a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-5m-14 0h14" /></svg>,
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        label: "Blog", href: "/admin/blog",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
      },
      {
        label: "Islamic Center", href: "/admin/islamic",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
      },
      {
        label: "Pick & Put", href: "/admin/pick-put",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
      },
      {
        label: "Apply / Services", href: "/admin/apply",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      },
      {
        label: "Partner Companies", href: "/admin/partner-companies",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2M19 21H5m0 0H3m4-14h2m-2 4h2m4-4h2m-2 4h2m-6 8v-4a1 1 0 011-1h2a1 1 0 011 1v4" /></svg>,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Settings", href: "/admin/settings",
        icon: <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      },
    ],
  },
];

export type AdminPendingCounts = {
  purchases?: number;
  deposits?: number;
  withdrawals?: number;
  taxi?: number;
  airTicket?: number;
  checkouts?: number;
};

type Props = {
  userName: string;
  userRole: string;
  userEmail: string;
  pendingCounts?: AdminPendingCounts;
};

export function AdminSidebar({ userName, userRole, userEmail, pendingCounts }: Props) {
  const pathname = usePathname();

  const allHrefs = nav.flatMap((group) => group.items.map((item) => item.href));
  const bestMatch = allHrefs
    .filter((href) => (href === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(href)))
    .sort((a, b) => b.length - a.length)[0];

  function isActive(href: string) {
    return href === bestMatch;
  }

  function getBadge(href: string) {
    if (!pendingCounts) return null;
    let count = 0;
    if (href === "/admin/purchases") count = pendingCounts.purchases ?? 0;
    else if (href === "/admin/deposits") count = pendingCounts.deposits ?? 0;
    else if (href === "/admin/withdrawals") count = pendingCounts.withdrawals ?? 0;
    else if (href === "/admin/taxi") count = pendingCounts.taxi ?? 0;
    else if (href === "/admin/air-ticket") count = pendingCounts.airTicket ?? 0;
    else if (href === "/admin/checkouts") count = pendingCounts.checkouts ?? 0;

    if (count <= 0) return null;
    return (
      <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    );
  }

  return (
    // Desktop only — mobile navigation is handled by AdminBottomNav
    <aside className="hidden lg:flex flex-col h-screen sticky top-0 bg-white border-r border-border w-60 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <Image src="/logo.png" alt="Logo" width={32} height={32} />
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">Singapur Probashi</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {nav.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                    isActive(item.href)
                      ? "bg-brand-50 text-brand font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className={isActive(item.href) ? "text-brand" : "text-muted-foreground"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {getBadge(item.href)}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Visit website */}
      <div className="px-3 pb-2">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
        >
          <svg className="w-4.5 h-4.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>Visit Website</span>
        </Link>
      </div>

      {/* User info + actions */}
      <div className="border-t border-border p-4">
        <div className="flex items-start gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{userName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
            <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider text-brand bg-brand-50 px-1.5 py-0.5 rounded">
              {userRole.replace("_", " ")}
            </span>
          </div>
        </div>
        <form action="/api/logout" method="POST">
          <button type="submit" className="w-full text-xs text-red-500 hover:text-red-600 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
