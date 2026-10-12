import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/shell";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { getSession } from "@/lib/session";
import { CurrencyRateBar } from "@/components/currency-rate-bar";
import { prisma } from "@/lib/prisma";
import { getSiteContactSettings } from "@/lib/site-contact";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Singapur Probashi – Bangladesh Community in Singapore",
  description:
    "Complete community platform for Bangladeshi expatriates in Singapore. Share investments, air tickets, currency converter, Islamic center, and more.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Singapur Probashi",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#8133f1",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  let contactSettings = undefined;
  let walletBalance: number | null = null;
  let pendingCheckout: { token: string; totalAmount: number } | null = null;

  try {
    const [fetchedSession, fetchedContact] = await Promise.all([
      getSession().catch(() => null),
      getSiteContactSettings().catch(() => undefined),
    ]);
    session = fetchedSession;
    contactSettings = fetchedContact;

    if (session) {
      const [wallet, checkout] = await Promise.all([
        prisma.wallet
          .findUnique({ where: { userId: session.userId }, select: { balance: true } })
          .catch(() => null),
        prisma.checkout
          .findFirst({
            where: { userId: session.userId, status: { in: ["AWAITING_PAYMENT", "PROOF_SUBMITTED"] } },
            orderBy: { createdAt: "desc" },
            select: { token: true, totalAmount: true },
          })
          .catch(() => null),
      ]);
      walletBalance = wallet ? Number(wallet.balance) : 0;
      pendingCheckout = checkout ? { token: checkout.token, totalAmount: Number(checkout.totalAmount) } : null;
    }
  } catch (err) {
    console.error("RootLayout error:", err);
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <ServiceWorkerRegister />
        <InstallPwaButton />
        <Shell
          user={session}
          rateBar={<CurrencyRateBar />}
          walletBalance={walletBalance}
          pendingCheckout={pendingCheckout}
          contactSettings={contactSettings}
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
