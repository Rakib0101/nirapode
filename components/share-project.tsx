"use client";

import { useState } from "react";

// Share a Share 6 project to social apps or copy the link.
//
// When the sharer is an agent, `referralCode` is passed in and the link gets
// ?ref=CODE appended. proxy.ts already captures ?ref= on ANY page into the
// referral cookie, so a friend who opens a shared project link and later
// signs up is credited to that agent — no extra backend work needed.
export function ShareProject({
  projectName,
  sharePrice,
  referralCode,
}: {
  projectName: string;
  sharePrice: number;
  referralCode?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Built at click time: the component is server-rendered, so window isn't
  // available during render, and the canonical host differs per environment.
  function buildUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    if (referralCode) url.searchParams.set("ref", referralCode);
    return url.toString();
  }

  function shareText() {
    return `${projectName} — invest from ৳${sharePrice.toFixed(2)} per share on Nirapode.`;
  }

  async function handleCopy() {
    const link = buildUrl();
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard API needs a secure context and can be blocked; fall back to
      // a temporary textarea so copy still works.
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // Uses the OS share sheet where available (most phones), which is the
  // nicest path; falls back to showing the explicit app buttons.
  async function handleNativeShare() {
    const link = buildUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: projectName, text: shareText(), url: link });
        return;
      } catch {
        // User dismissed the sheet, or share failed — fall through to buttons.
      }
    }
    setOpen((v) => !v);
  }

  function openWindow(href: string) {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  const targets = [
    {
      label: "WhatsApp",
      className: "bg-[#25D366] hover:bg-[#1ebe5a] text-white",
      onClick: () => openWindow(`https://wa.me/?text=${encodeURIComponent(`${shareText()}\n${buildUrl()}`)}`),
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
        </svg>
      ),
    },
    {
      label: "Facebook",
      className: "bg-[#1877F2] hover:bg-blue-700 text-white",
      onClick: () => openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(buildUrl())}`),
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      label: "Telegram",
      className: "bg-[#2AABEE] hover:bg-sky-600 text-white",
      onClick: () =>
        openWindow(
          `https://t.me/share/url?url=${encodeURIComponent(buildUrl())}&text=${encodeURIComponent(shareText())}`
        ),
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand bg-brand-50 border border-brand/20 px-4 py-2 rounded-xl hover:bg-brand hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 text-sm font-semibold text-foreground border border-border px-4 py-2 rounded-xl hover:bg-muted transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {targets.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={t.onClick}
              className={`inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${t.className}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      )}

      {referralCode && (
        <p className="text-[11px] text-muted-foreground mt-2">
          Your referral code is included — you earn commission on what they buy.
        </p>
      )}
    </div>
  );
}
