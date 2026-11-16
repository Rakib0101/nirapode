"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdBanner({
  slotId = "default-slot",
  format = "auto",
  responsive = true,
  className = "",
}: {
  slotId?: string;
  format?: string;
  responsive?: boolean;
  className?: string;
}) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.adsbygoogle && !pushed.current) {
        window.adsbygoogle.push({});
        pushed.current = true;
      }
    } catch {
      // Ignore adsbygoogle load quirks in dev
    }
  }, []);

  return (
    <div className={`w-full overflow-hidden my-4 text-center ${className}`}>
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-4 px-3 flex flex-col items-center justify-center min-h-[90px]">
        <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">
          Advertisement · Google AdSense
        </span>
        <ins
          ref={adRef}
          className="adsbygoogle block w-full"
          data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-placeholder"}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      </div>
    </div>
  );
}
