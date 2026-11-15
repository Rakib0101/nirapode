"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroupsFor } from "@/lib/nav-links";

// Phone navigation. On a phone the top bar is the furthest thing from your
// thumb, so the menu lives down here instead; above `xl` the navbar takes over
// and this is hidden.
//
// The five tabs are deliberately the same five, in the same order, as the
// app's tab bar (nirapode-mobile-app/src/app/(tabs)/_layout.tsx). The sheet
// behind "More" renders lib/nav-links.ts — the same list the navbar menu
// shows. This file used to carry two hand-maintained link lists of its own,
// which is how the menus drifted apart in the first place; it has none now.
const TABS = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/wallet", label: "Wallet", icon: IconWallet },
  { href: "/shares", label: "Shares", icon: IconShares, prefix: true },
  // Web has no /community index — the forum is what that tab opens, and blog
  // and lost-found count as the same section for highlighting.
  { href: "/forum", label: "Community", icon: IconCommunity, section: ["/forum", "/blog", "/lost-found"] },
] as const;

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" />
    </svg>
  );
}
function IconWallet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <path d="M16 12h3" />
    </svg>
  );
}
function IconShares({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </svg>
  );
}
function IconCommunity({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M22 20v-2a4 4 0 00-3-3.87M16.5 3.6a4 4 0 010 7.75" />
    </svg>
  );
}
function IconMore({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const groups = navGroupsFor(signedIn);

  // The sheet is tall; letting the page scroll underneath it feels broken.
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  function isActive(tab: (typeof TABS)[number]): boolean {
    if (tab.href === "/") return pathname === "/";
    const section = "section" in tab ? tab.section : undefined;
    if (section) return section.some((p) => pathname === p || pathname.startsWith(p + "/"));
    return "prefix" in tab && tab.prefix ? pathname.startsWith(tab.href) : pathname === tab.href;
  }

  const moreActive = groups.some((g) =>
    g.links.some((l) => pathname === l.href || pathname.startsWith(l.href + "/"))
  );

  return (
    <>
      {sheetOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSheetOpen(false)}
          className="xl:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
        />
      )}

      {/* Menu sheet */}
      <div
        className={`xl:hidden fixed inset-x-0 bottom-0 z-50 max-h-[72vh] overflow-y-auto rounded-t-2xl border-t border-border bg-white dark:bg-card shadow-2xl transition-transform duration-200 ${
          sheetOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
        }`}
        aria-hidden={!sheetOpen}
      >
        <div className="sticky top-0 bg-white dark:bg-card px-5 pt-3 pb-2 border-b border-border flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">Menu</span>
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            aria-label="Close menu"
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-3 pb-24 pt-2">
          {groups.map((group) => (
            <div key={group.title} className="mb-3">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSheetOpen(false)}
                    className={`px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                      pathname === link.href
                        ? "bg-brand text-white"
                        : "bg-muted text-foreground hover:bg-border"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <nav className="xl:hidden fixed inset-x-0 bottom-0 z-50 bg-white/95 dark:bg-card/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {TABS.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setSheetOpen(false)}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                  active ? "text-brand" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setSheetOpen((v) => !v)}
            aria-expanded={sheetOpen}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
              sheetOpen || moreActive ? "text-brand" : "text-muted-foreground"
            }`}
          >
            <IconMore className="w-5 h-5" />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
