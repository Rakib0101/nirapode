import { getCurrencySettings, getLiveBdtRate } from "@/lib/currency";
import { getAllCommissionSettings, getShareAdminCutPercent, getShare4AdminCutPercent } from "@/lib/commission";
import { getShareSgdRate, getShare4Amounts, getShare4ClosedDates } from "@/lib/share-pricing";
import { getAdminNotificationEmail, getAdminNotificationPhone, getModuleNotificationOverride } from "@/lib/notifications";
import { getAdSenseSettings, getReminderPriceSetting, getSmtpSettings, getWhatsAppApiSettings, getPinAuthSettings } from "@/app/actions/admin-settings";
import { getSiteContactSettings } from "@/lib/site-contact";
import { prisma } from "@/lib/prisma";
import { CurrencySettingsForm } from "./currency-form";
import { BankRatesForm } from "./bank-rates-form";
import { CommissionSettingsForm } from "./commission-form";
import { SharePricingForm } from "./share-pricing-form";
import { ShareAdminCutForm } from "./share-admin-cut-form";
import { Share4AmountsForm } from "./share4-amounts-form";
import { Share4ClosedDatesForm } from "./share4-closed-dates-form";
import { NotificationEmailForm } from "./notification-email-form";
import { ModuleNotificationForm } from "./module-notification-form";
import { PaymentAccountsForm } from "./payment-accounts-form";
import { AdSenseSettingsForm } from "./adsense-form";
import { ReminderPriceForm } from "./reminder-price-form";
import { SmtpSettingsForm } from "./smtp-form";
import { WhatsAppApiSettingsForm } from "./whatsapp-form";
import { SiteContactForm } from "./site-contact-form";
import { PinAuthSettingsForm } from "./pin-settings-form";
import { TransferFeeForm } from "./transfer-fee-form";
import { getTransferFeeSetting } from "@/lib/wallet";
import { ReminderCronPanel } from "./reminder-cron-panel";
import { getReminderCronKey } from "@/lib/reminders";
import { SettingsTabs } from "./settings-tabs";
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
  const [
    settings,
    liveRate,
    banks,
    paymentAccounts,
    commissionSettings,
    shareRate,
    shareAdminCutPercent,
    share4AdminCutPercent,
    share4Amounts,
    share4ClosedDates,
    notificationEmail,
    notificationPhone,
    adSenseSettings,
    reminderSlotPrice,
    smtpSettings,
    whatsAppSettings,
    contactSettings,
    transferFee,
    reminderCronKey,
    pinAuthSettings,
    requestHeaders,
  ] = await Promise.all([
    getCurrencySettings(),
    getLiveBdtRate(),
    getBankRates(),
    getPaymentAccounts(),
    getAllCommissionSettings(),
    getShareSgdRate(),
    getShareAdminCutPercent(),
    getShare4AdminCutPercent(),
    getShare4Amounts(),
    getShare4ClosedDates(),
    getAdminNotificationEmail(),
    getAdminNotificationPhone(),
    getAdSenseSettings(),
    getReminderPriceSetting(),
    getSmtpSettings(),
    getWhatsAppApiSettings(),
    getSiteContactSettings(),
    getTransferFeeSetting(),
    getReminderCronKey(),
    getPinAuthSettings(),
    headers(),
  ]);

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const reminderCronUrl = `${proto}://${host}/api/cron/reminders?key=${reminderCronKey}`;

  const [share4Notify, share6Notify] = await Promise.all([
    getModuleNotificationOverride("SHARE4"),
    getModuleNotificationOverride("SHARE6"),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <SettingsTabs
        currencyContent={
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Currency source control & Pesos Withdrawal Rate (Full Width) */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Exchange Rates & Withdrawal Conversion</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure SGD ➔ BDT live or manual source, and Taka to Pesos (PHP) rate for GCash payouts
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <CurrencySettingsForm settings={settings} liveRate={liveRate} />
              </div>
            </div>

            {/* Bank rates */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Bank Rates Listing</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      SGD ➔ BDT remittance rates displayed on the currency page
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <BankRatesForm banks={banks} />
              </div>
            </div>

            {/* Payment accounts (deposit receiving accounts) */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Deposit Payment Accounts</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      bKash, Nagad, GCash, Bank, PayNow etc. shown on customer deposit page
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <PaymentAccountsForm accounts={paymentAccounts} />
              </div>
            </div>

            {/* User-to-user wallet transfer fee (Full Width or 2nd Row) */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Peer-to-Peer Wallet Transfer Fee</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Charge members when sending funds to other members from their platform wallet
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <TransferFeeForm setting={transferFee} />
              </div>
            </div>
          </div>
        }
        sharesContent={
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Share pricing rate (Full Width) */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Share Pricing Rate (SGD → BDT)</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Admin-fixed conversion rate used when calculating BDT cost for shares denominated in SGD
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <SharePricingForm rate={shareRate} />
              </div>
            </div>

            {/* Share 6 platform cut */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Share 6 — Platform Cut</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Platform margin percentage on Share 6 purchases (informational admin tracking)
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <ShareAdminCutForm percent={shareAdminCutPercent} variant="share6" />
              </div>
            </div>

            {/* Share 4 (buy-request) platform cut */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Share 4 — Platform Cut</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Platform margin percentage on Share 4 buy-requests
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <ShareAdminCutForm percent={share4AdminCutPercent} variant="share4" />
              </div>
            </div>

            {/* Share 4 offer amounts */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Share 4 — Offer Amounts</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Specific ৳ amounts buyers can select on the Share 4 buy-request form
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <Share4AmountsForm amounts={share4Amounts} />
              </div>
            </div>

            {/* Share 4 closed dates */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Share 4 — Closed Dates & Calendar</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Block the Share 4 date picker on specific weekdays or holidays
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <Share4ClosedDatesForm closedWeekdays={share4ClosedDates.closedWeekdays} closedDates={share4ClosedDates.closedDates} />
              </div>
            </div>
          </div>
        }
        notificationsContent={
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Admin notification email (Full Width) */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Admin Alert Recipients (Order Notifications)</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Where new-order and withdrawal alert emails and WhatsApp messages are delivered
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <NotificationEmailForm email={notificationEmail} phone={notificationPhone} />
                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Per-Module Routing Overrides</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Route Share 4 and Share 6 order alerts to separate managers or phones. Leave blank to use the default contact above.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/40 rounded-xl p-4 border border-border">
                      <ModuleNotificationForm module="SHARE4" label="Share 4" email={share4Notify.email} phone={share4Notify.phone} />
                    </div>
                    <div className="bg-muted/40 rounded-xl p-4 border border-border">
                      <ModuleNotificationForm module="SHARE6" label="Share 6" email={share6Notify.email} phone={share6Notify.phone} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SMTP Email Configuration */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">SMTP Email Server Settings</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Gmail or custom SMTP server to send OTPs, reminders, and alerts
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <SmtpSettingsForm settings={smtpSettings} />
              </div>
            </div>

            {/* WhatsApp Automated API */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <span className="text-lg">💬</span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Automated WhatsApp API Gateway</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Connect UltraMsg, GreenAPI, or Meta Cloud API for background WhatsApp alerts
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <WhatsAppApiSettingsForm settings={whatsAppSettings} />
              </div>
            </div>
          </div>
        }
        alarmsContent={
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Reminder Alarm Slot Price */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <span className="text-lg">⏰</span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Alarm & Reminder Slot Pricing</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Set unlock fee in BDT for additional reminder slots (Slots 2–10)
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <ReminderPriceForm currentPrice={reminderSlotPrice} />
              </div>
            </div>

            {/* Automated Cron Trigger Panel */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <span className="text-lg">⚡</span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Cron Job Scheduler & Test</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Recurring 1-minute cron URL and immediate trigger test tool
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <ReminderCronPanel cronUrl={reminderCronUrl} />
              </div>
            </div>
          </div>
        }
        commissionContent={
          <div className="w-full">
            {/* Agent commission rate */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Agent Referral Commission Rules</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure percentage or flat ৳ earnings for referring agents across each service module
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <CommissionSettingsForm settings={commissionSettings} />
              </div>
            </div>
          </div>
        }
        securityContent={
          <div className="max-w-3xl">
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <span className="text-lg">🔒</span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">PIN Setup & App-Lock Security</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure Google account login PIN prompt and master switch for the 4-digit security PIN lock system
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <PinAuthSettingsForm settings={pinAuthSettings} />
              </div>
            </div>
          </div>
        }
        siteContent={
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Public Contact & Social Links */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <span className="text-lg">📞</span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Public Contact & Support Channels</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Customer WhatsApp floating button, support email, hotline, Facebook community, and office address
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <SiteContactForm settings={contactSettings} />
              </div>
            </div>

            {/* Google AdSense */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
              <div className="px-6 py-4.5 border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground text-sm sm:text-base">Google AdSense Monetization</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Publisher client ID and auto-ad script tags for website monetization
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <AdSenseSettingsForm settings={adSenseSettings} />
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
