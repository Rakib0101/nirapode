"use client";

import { useState, useEffect } from "react";

export type SettingsTabsProps = {
  currencyContent: React.ReactNode;
  sharesContent: React.ReactNode;
  notificationsContent: React.ReactNode;
  alarmsContent: React.ReactNode;
  commissionContent: React.ReactNode;
  siteContent: React.ReactNode;
};

type TabId = "currency" | "shares" | "notifications" | "alarms" | "commission" | "site";

const TABS: { id: TabId; label: string; shortLabel: string; badge: string; icon: React.ReactNode }[] = [
  {
    id: "currency",
    label: "Currency & Banking",
    shortLabel: "Currency",
    badge: "Rates & Accounts",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "shares",
    label: "Shares & Pricing",
    shortLabel: "Shares",
    badge: "Share 4 & 6",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Email & WhatsApp",
    shortLabel: "Alerts & API",
    badge: "SMTP & WhatsApp",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    id: "alarms",
    label: "Alarms & Cron",
    shortLabel: "Alarms",
    badge: "Reminders & Cron",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "commission",
    label: "Agent Commission",
    shortLabel: "Commission",
    badge: "Referral Cuts",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: "site",
    label: "Site & AdSense",
    shortLabel: "Site Info",
    badge: "Contact & Ads",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
];

export function SettingsTabs({
  currencyContent,
  sharesContent,
  notificationsContent,
  alarmsContent,
  commissionContent,
  siteContent,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("currency");

  // Sync with URL hash if present on mount or popstate
  useEffect(() => {
    function readHash() {
      const hash = window.location.hash.replace("#", "") as TabId;
      if (TABS.some((t) => t.id === hash)) {
        setActiveTab(hash);
      }
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  function handleTabSelect(id: TabId) {
    setActiveTab(id);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const currentTabInfo = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="space-y-6">
      {/* Top Bar: Title & Mobile Section Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage site-wide rates, alerts, shares, and automated integrations
          </p>
        </div>

        {/* Mobile Dropdown Selector — fast one-tap navigation for mobile admin */}
        <div className="sm:hidden">
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
            Jump to Section:
          </label>
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => handleTabSelect(e.target.value as TabId)}
              className="w-full bg-white border border-border text-foreground font-semibold text-xs py-2.5 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 shadow-xs appearance-none"
            >
              {TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label} ({tab.badge})
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Horizontal Tabs Bar */}
      <div className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md pt-1 pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-brand text-white shadow-sm"
                    : "bg-white text-muted-foreground border border-border hover:text-foreground hover:bg-white/80"
                }`}
              >
                <span className={isActive ? "text-white" : "text-brand"}>{tab.icon}</span>
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Description Pill (Mobile/Tablet Friendly) */}
      <div className="bg-brand-50/70 border border-brand/20 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-foreground">
              {currentTabInfo.label}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Active Section · {currentTabInfo.badge}
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white text-brand border border-brand/20">
          Tab {TABS.findIndex((t) => t.id === activeTab) + 1} of {TABS.length}
        </span>
      </div>

      {/* Tab Panes: All kept in DOM to preserve inputs and validation messages */}
      <div className="space-y-6">
        <div className={activeTab === "currency" ? "space-y-6 block" : "hidden"}>
          {currencyContent}
        </div>

        <div className={activeTab === "shares" ? "space-y-6 block" : "hidden"}>
          {sharesContent}
        </div>

        <div className={activeTab === "notifications" ? "space-y-6 block" : "hidden"}>
          {notificationsContent}
        </div>

        <div className={activeTab === "alarms" ? "space-y-6 block" : "hidden"}>
          {alarmsContent}
        </div>

        <div className={activeTab === "commission" ? "space-y-6 block" : "hidden"}>
          {commissionContent}
        </div>

        <div className={activeTab === "site" ? "space-y-6 block" : "hidden"}>
          {siteContent}
        </div>
      </div>
    </div>
  );
}
