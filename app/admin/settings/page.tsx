import { getCurrencySettings, getLiveBdtRate } from "@/lib/currency";
import { getAllCommissionSettings, getShareAdminCutPercent, getShare4AdminCutPercent } from "@/lib/commission";
import { getShareSgdRate, getShare4Amounts } from "@/lib/share-pricing";
import { getAdminNotificationEmail, getAdminNotificationPhone } from "@/lib/notifications";
import { getAdSenseSettings, getReminderPriceSetting, getSmtpSettings, getWhatsAppApiSettings } from "@/app/actions/admin-settings";
import { getSiteContactSettings } from "@/lib/site-contact";
import { prisma } from "@/lib/prisma";
import { CurrencySettingsForm } from "./currency-form";
import { BankRatesForm } from "./bank-rates-form";
import { CommissionSettingsForm } from "./commission-form";
import { SharePricingForm } from "./share-pricing-form";
import { ShareAdminCutForm } from "./share-admin-cut-form";
import { Share4AmountsForm } from "./share4-amounts-form";
import { NotificationEmailForm } from "./notification-email-form";
import { PaymentAccountsForm } from "./payment-accounts-form";
import { AdSenseSettingsForm } from "./adsense-form";
import { ReminderPriceForm } from "./reminder-price-form";
import { SmtpSettingsForm } from "./smtp-form";
import { WhatsAppApiSettingsForm } from "./whatsapp-form";
import { SiteContactForm } from "./site-contact-form";
import { TransferFeeForm } from "./transfer-fee-form";
import { getTransferFeeSetting } from "@/lib/wallet";
import { ReminderCronPanel } from "./reminder-cron-panel";
import { getReminderCronKey } from "@/lib/reminders";
import { headers } from "next/headers";

async function getBankRates() {
  try {
    const rows = await prisma.bankRate.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return rows.map((r) => ({ id: r.id, bankName: r.bankName, rate: Number(r.rate), isActive: r.isActive }));
  } catch {
    return [];
  }
}

async function getPaymentAccounts() {
  const rows = await prisma.paymentAccount.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map((r) => ({
    id: r.id, method: r.method, label: r.label,
    accountNumber: r.accountNumber, accountName: r.accountName, isActive: r.isActive,
  }));
}

export default async function AdminSettingsPage() {
  const [settings, liveRate, banks, paymentAccounts, commissionSettings, shareRate, shareAdminCutPercent, share4AdminCutPercent, share4Amounts, notificationEmail, notificationPhone, adSenseSettings, reminderSlotPrice, smtpSettings, whatsAppSettings, contactSettings, transferFee, reminderCronKey, requestHeaders] = await Promise.all([
    getCurrencySettings(),
    getLiveBdtRate(),
    getBankRates(),
    getPaymentAccounts(),
    getAllCommissionSettings(),
    getShareSgdRate(),
    getShareAdminCutPercent(),
    getShare4AdminCutPercent(),
    getShare4Amounts(),
    getAdminNotificationEmail(),
    getAdminNotificationPhone(),
    getAdSenseSettings(),
    getReminderPriceSetting(),
    getSmtpSettings(),
    getWhatsAppApiSettings(),
    getSiteContactSettings(),
    getTransferFeeSetting(),
    getReminderCronKey(),
    headers(),
  ]);

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const reminderCronUrl = `${proto}://${host}/api/cron/reminders?key=${reminderCronKey}`;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage site-wide configuration</p>
      </div>

      {/* Currency source control */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Rate Bar Source (SGD → BDT)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Controls the rate shown in the top bar and the calculator default
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <CurrencySettingsForm settings={settings} liveRate={liveRate} />
        </div>
      </div>

      {/* Share pricing rate */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Share Pricing (SGD → BDT)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Share prices are listed in SGD; this rate converts the actual BDT charged at purchase
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <SharePricingForm rate={shareRate} />
        </div>
      </div>

      {/* Bank rates */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Bank Rates</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add banks and their SGD → BDT rates — shown as cards on the currency page
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <BankRatesForm banks={banks} />
        </div>
      </div>

      {/* Payment accounts (deposit receiving accounts) */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Payment Accounts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                bKash, Nagad, GCash, Bank, PayNow etc. — shown to customers on the deposit page
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <PaymentAccountsForm accounts={paymentAccounts} />
        </div>
      </div>

      {/* Agent commission rate */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6M2 7h20M12 3v4M8 7l4-4 4 4" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Agent Commission</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set a percentage or fixed ৳ amount agents earn per module, on referred requests
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <CommissionSettingsForm settings={commissionSettings} />
        </div>
      </div>

      {/* User-to-user wallet transfer fee */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Wallet Transfer Fee</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Charge for members sending money to each other from their wallets
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <TransferFeeForm setting={transferFee} />
        </div>
      </div>

      {/* Share purchase platform cut */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Share Purchase — Platform Cut</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                A separate percentage from the agent&apos;s commission, shown for admin visibility only
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <ShareAdminCutForm percent={shareAdminCutPercent} variant="share6" />
        </div>
      </div>

      {/* Share 4 (buy-request) platform cut */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Share 4 — Platform Cut</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Same idea as above, tracked separately for Share 4 (buy-request) purchases — informational only
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <ShareAdminCutForm percent={share4AdminCutPercent} variant="share4" />
        </div>
      </div>

      {/* Share 4 offer amounts */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Share 4 — Offer Amounts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                The exact BDT amounts buyers can choose from on the Share 4 (buy-request) form
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <Share4AmountsForm amounts={share4Amounts} />
        </div>
      </div>

      {/* Admin notification email */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Admin Notifications</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Where new-request alerts across every module are sent — email and/or WhatsApp
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <NotificationEmailForm email={notificationEmail} phone={notificationPhone} />
        </div>
      </div>

      {/* Google AdSense */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Google AdSense</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Display advertisements to monetize platform traffic
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <AdSenseSettingsForm settings={adSenseSettings} />
        </div>
      </div>

      {/* Reminder Alarm Price */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <span className="text-lg">⏰</span>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Alarm & Reminder Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set unlock fee for reminder slots (Slots 2–10)
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <ReminderPriceForm currentPrice={reminderSlotPrice} />
          <ReminderCronPanel cronUrl={reminderCronUrl} />
        </div>
      </div>

      {/* SMTP Email Configuration */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">SMTP Email Server Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure Gmail or custom SMTP to send OTPs, reminders, and notifications
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <SmtpSettingsForm settings={smtpSettings} />
        </div>
      </div>

      {/* WhatsApp Automated API */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <span className="text-lg">💬</span>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Automated WhatsApp API Gateway</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure WhatsApp REST API (UltraMsg / GreenAPI / Meta Cloud API) for 100% silent background messaging
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <WhatsAppApiSettingsForm settings={whatsAppSettings} />
        </div>
      </div>

      {/* Public Contact & Social Links */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <span className="text-lg">📞</span>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Site Contact & Social Links</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage WhatsApp support number, support email, hotline, Facebook group, and office info
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <SiteContactForm settings={contactSettings} />
        </div>
      </div>
    </div>
  );
}
