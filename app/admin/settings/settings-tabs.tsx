"use client";

import { useState, useEffect, useMemo } from "react";

export type SettingsTabsProps = {
  currencyContent: React.ReactNode;
  sharesContent: React.ReactNode;
  notificationsContent: React.ReactNode;
  alarmsContent: React.ReactNode;
  commissionContent: React.ReactNode;
  securityContent: React.ReactNode;
  siteContent: React.ReactNode;
};

type TabId = "currency" | "shares" | "notifications" | "alarms" | "commission" | "security" | "site";

type TabDefinition = {
  id: TabId;
  label: string;
  shortLabel: string;
  badge: string;
  keywords: string[];
  itemCount: number;
  icon: React.ReactNode;
};

const TABS: TabDefinition[] = [
  {
    id: "currency",
    label: "Currency & Banking",
    shortLabel: "Currency",
    badge: "Rates & Accounts",
    itemCount: 4,
    keywords: ["currency", "rate", "sgd", "bdt", "peso", "php", "bank", "payment", "account", "transfer", "fee", "gcash", "bkash", "nagad"],
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
    badge: "Share 4 & 6 Controls",
    itemCount: 5,
    keywords: ["share", "pricing", "cut", "platform cut", "share 4", "share 6", "offer", "amount", "closed", "calendar", "date", "holiday"],
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
    badge: "SMTP & WhatsApp Gateway",
    itemCount: 3,
    keywords: ["email", "notification", "alert", "whatsapp", "smtp", "gmail", "host", "port", "token", "api", "green api", "ultramsg", "phone"],
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
    badge: "Slot Price & Cron Trigger",
    itemCount: 2,
    keywords: ["alarm", "reminder", "cron", "slot", "fee", "trigger", "unlock", "schedule"],
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
    badge: "Referral Percentages",
    itemCount: 1,
    keywords: ["commission", "agent", "referral", "cut", "percentage", "flat", "taxi", "ticket", "service"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: "security",
    label: "Security & PIN",
    shortLabel: "Security",
    badge: "PIN Lock & Google Auth",
    itemCount: 1,
    keywords: ["pin", "security", "google", "login", "auth", "lock", "setup", "password", "prompt"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: "site",
    label: "Site & AdSense",
    shortLabel: "Site Info",
    badge: "Contact, Social, Ads",
    itemCount: 2,
    keywords: ["site", "contact", "support", "facebook", "address", "hours", "adsense", "ads", "google", "client id"],
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
  securityContent,
  siteContent,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("currency");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync with URL hash if present
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

  // Quick search filter to help admins jump directly to matching tabs
  const filteredTabs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TABS;
    return TABS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.badge.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.includes(q))
    );
  }, [searchQuery]);

  // If user searched and current tab doesn't match, auto-select first matching tab
  useEffect(() => {
    if (searchQuery.trim() && filteredTabs.length > 0 && !filteredTabs.some((t) => t.id === activeTab)) {
      setActiveTab(filteredTabs[0].id);
    }
  }, [searchQuery, filteredTabs, activeTab]);

  const currentTabInfo = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="w-full space-y-6">
      {/* ─── Hero Header & Search Bar ─── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-border p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                System Settings
              </h1>
              <span className="text-xs bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full font-medium">
                Admin Console
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Configure live currency rates, payment channels, automated WhatsApp & SMTP gateways, and platform controls.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full lg:w-72 shrink-0">
            <svg
              className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings (e.g. SMTP, Pesos, Cron)..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Mobile Quick Dropdown */}
        <div className="mt-4 pt-4 border-t border-border sm:hidden">
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
            Select Category:
          </label>
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => handleTabSelect(e.target.value as TabId)}
              className="w-full bg-muted/50 border border-border text-foreground font-semibold text-xs py-2.5 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 appearance-none"
            >
              {filteredTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label} — {tab.badge}
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

      {/* ─── Modern Tab Navigation Bar ─── */}
      <div className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md pt-1 pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {filteredTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-brand text-white shadow-sm ring-2 ring-brand/30"
                    : "bg-white text-muted-foreground border border-border hover:text-foreground hover:bg-white/80 hover:border-brand/40"
                }`}
              >
                <span className={isActive ? "text-white" : "text-brand"}>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.itemCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Active Tab Banner ─── */}
      <div className="bg-white rounded-2xl border border-border px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand shrink-0">
            {currentTabInfo.icon}
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {currentTabInfo.label}
            </h2>
            <p className="text-xs text-muted-foreground">
              {currentTabInfo.badge} · {currentTabInfo.itemCount} settings module{currentTabInfo.itemCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[11px] font-medium text-muted-foreground">
            Category {TABS.findIndex((t) => t.id === activeTab) + 1} of {TABS.length}
          </span>
        </div>
      </div>

      {/* ─── Tab Panes: Preserved in DOM for instant switching & state retention ─── */}
      <div className="w-full">
        <div className={activeTab === "currency" ? "block" : "hidden"}>
          {currencyContent}
        </div>

        <div className={activeTab === "shares" ? "block" : "hidden"}>
          {sharesContent}
        </div>

        <div className={activeTab === "notifications" ? "block" : "hidden"}>
          {notificationsContent}
        </div>

        <div className={activeTab === "alarms" ? "block" : "hidden"}>
          {alarmsContent}
        </div>

        <div className={activeTab === "commission" ? "block" : "hidden"}>
          {commissionContent}
        </div>

        <div className={activeTab === "security" ? "block" : "hidden"}>
          {securityContent}
        </div>

        <div className={activeTab === "site" ? "block" : "hidden"}>
          {siteContent}
        </div>
      </div>
    </div>
  );
}
