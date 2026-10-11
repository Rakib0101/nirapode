"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BottomNav } from "@/components/bottom-nav";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import type { SessionPayload } from "@/lib/session";
import type { SiteContactSettings } from "@/lib/site-contact-types";

const AUTH_PATHS = ["/login", "/register", "/verify-otp", "/forgot-password", "/reset-password", "/set-pin", "/verify-pin", "/forgot-pin", "/admin"];

type ShellProps = {
  children: React.ReactNode;
  user: SessionPayload | null;
  rateBar?: React.ReactNode;
  walletBalance?: number | null;
  pendingCheckout?: { token: string; totalAmount: number } | null;
  contactSettings?: SiteContactSettings;
};

export function Shell({ children, user, rateBar, walletBalance, pendingCheckout, contactSettings }: ShellProps) {
  const pathname = usePathname();

  const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isAuth) return <>{children}</>;

  return (
    <>
      <Navbar user={user} walletBalance={walletBalance} pendingCheckout={pendingCheckout} />
      {rateBar}
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer contact={contactSettings} />
      <BottomNav user={user} />
      <FloatingWhatsApp
        whatsappNumber={contactSettings?.whatsappNumber}
        defaultMessage={contactSettings?.whatsappMessage}
      />
    </>
  );
}
