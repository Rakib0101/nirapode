"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { BottomNav } from "@/components/bottom-nav";
import type { SessionPayload } from "@/lib/session";
import type { SiteContactSettings } from "@/lib/site-contact-types";

const AUTH_PATHS = ["/login", "/register", "/verify-otp", "/forgot-password", "/reset-password", "/set-pin", "/verify-pin", "/forgot-pin", "/admin"];

// Pages that take over the whole screen. The MRT map is a pan-and-zoom
// canvas — every pixel of navbar, rate bar and footer above it is a pixel
// of map you cannot see. They carry their own way back instead.
const FULLSCREEN_PATHS = ["/mrt-map"];

type ShellProps = {
  children: React.ReactNode;
  user: SessionPayload | null;
  rateBar?: React.ReactNode;
  walletBalance?: number | null;
  pendingCheckout?: { token: string; totalAmount: number } | null;
  contactSettings?: SiteContactSettings;
};

// One menu, two places to open it: the navbar on wide screens, the bottom
// bar on phones, where the top of the screen is the furthest thing from
// your thumb. Both render lib/nav-links.ts — the bottom bar no longer keeps
// link lists of its own, which is how the menus drifted apart before.
export function Shell({ children, user, rateBar, walletBalance, pendingCheckout, contactSettings }: ShellProps) {
  const pathname = usePathname();

  const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isFullscreen = FULLSCREEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isAuth || isFullscreen) return <>{children}</>;

  return (
    <>
      <Navbar user={user} walletBalance={walletBalance} pendingCheckout={pendingCheckout} />
      {rateBar}
      <main className="flex-1 pb-16 xl:pb-0">{children}</main>
      <Footer contact={contactSettings} />
      <BottomNav signedIn={Boolean(user)} />
      <FloatingWhatsApp
        whatsappNumber={contactSettings?.whatsappNumber}
        defaultMessage={contactSettings?.whatsappMessage}
      />
    </>
  );
}
