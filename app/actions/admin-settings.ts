"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { COMMISSION_MODULES, saveCommissionSetting, saveShareAdminCutPercent, saveShare4AdminCutPercent, type CommissionMode } from "@/lib/commission";
import { saveShareSgdRate, saveShare4Amounts } from "@/lib/share-pricing";
import { saveAdminNotificationEmail, saveAdminNotificationPhone } from "@/lib/notifications";
import { saveTransferFeeSetting } from "@/lib/wallet";

type State = { error?: string; success?: boolean } | null;

export async function saveCurrencySettingsAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const source = formData.get("source") as string;
  const rawRate = formData.get("manualRate") as string;
  const rawPhpRate = (formData.get("manualPhpRate") as string)?.trim();
  const showBar = formData.get("showBar") === "on";

  if (!["internet", "manual"].includes(source)) {
    return { error: "Invalid source." };
  }

  if (source === "manual") {
    const rate = parseFloat(rawRate);
    if (isNaN(rate) || rate <= 0) {
      return { error: "Enter a valid positive rate." };
    }
  }

  if (rawPhpRate) {
    const phpRate = parseFloat(rawPhpRate);
    if (isNaN(phpRate) || phpRate <= 0) {
      return { error: "Enter a valid positive Peso rate, or leave it blank." };
    }
  }

  const rate = parseFloat(rawRate) || 83.5;

  const updates = [
    prisma.siteSetting.upsert({
      where: { key: "currency_source" },
      create: { key: "currency_source", value: source },
      update: { value: source },
    }),
    prisma.siteSetting.upsert({
      where: { key: "currency_bdt_rate" },
      create: { key: "currency_bdt_rate", value: String(rate) },
      update: { value: String(rate) },
    }),
    prisma.siteSetting.upsert({
      where: { key: "currency_show_bar" },
      create: { key: "currency_show_bar", value: showBar ? "true" : "false" },
      update: { value: showBar ? "true" : "false" },
    }),
  ];

  if (rawPhpRate) {
    updates.push(
      prisma.siteSetting.upsert({
        where: { key: "currency_php_rate" },
        create: { key: "currency_php_rate", value: rawPhpRate },
        update: { value: rawPhpRate },
      })
    );
  }

  await prisma.$transaction(updates);

  revalidatePath("/", "layout");
  revalidatePath("/currency");
  revalidatePath("/admin/settings");

  return { success: true };
}

// ── Commission rates (per module: taxi / air ticket / service / share) ────────

export async function saveCommissionSettingsAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const parsed: { module: (typeof COMMISSION_MODULES)[number]["module"]; mode: CommissionMode; value: number }[] = [];

  for (const { module, label } of COMMISSION_MODULES) {
    const key = module.toLowerCase();
    const mode = formData.get(`${key}_mode`) as string;
    const value = parseFloat(formData.get(`${key}_value`) as string);

    if (mode !== "PERCENTAGE" && mode !== "FIXED") {
      return { error: `Invalid commission mode for ${label}.` };
    }
    if (isNaN(value) || value < 0) {
      return { error: `Enter a valid ${label} commission value.` };
    }
    if (mode === "PERCENTAGE" && value > 100) {
      return { error: `${label} percentage can't exceed 100.` };
    }

    parsed.push({ module, mode, value });
  }

  await Promise.all(parsed.map((p) => saveCommissionSetting(p.module, p.mode, p.value)));

  revalidatePath("/admin/settings");
  return { success: true };
}

// ── Share purchase platform cut (informational — never paid out) ─────────────

export async function saveShareAdminCutAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const value = parseFloat(formData.get("percent") as string);
  if (isNaN(value) || value < 0 || value > 100) {
    return { error: "Enter a valid percentage between 0 and 100." };
  }

  await saveShareAdminCutPercent(value);

  revalidatePath("/admin/settings");
  revalidatePath("/admin/purchases");
  revalidatePath("/admin/shares");
  return { success: true };
}

// ── Share 4 (buy-request) platform cut (informational — never paid out) ──────

export async function saveShare4AdminCutAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const value = parseFloat(formData.get("percent") as string);
  if (isNaN(value) || value < 0 || value > 100) {
    return { error: "Enter a valid percentage between 0 and 100." };
  }

  await saveShare4AdminCutPercent(value);

  revalidatePath("/admin/settings");
  revalidatePath("/admin/shares");
  return { success: true };
}

// ── User-to-user wallet transfer fee ─────────────────────────────────────────

export async function saveTransferFeeAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const mode = formData.get("mode");
  const value = parseFloat(formData.get("value") as string);
  if (mode !== "PERCENTAGE" && mode !== "FIXED") return { error: "Invalid fee type." };
  if (isNaN(value) || value < 0) return { error: "Enter a valid fee (0 for free transfers)." };
  if (mode === "PERCENTAGE" && value > 100) return { error: "Percentage can't exceed 100." };

  await saveTransferFeeSetting({ mode, value });

  revalidatePath("/admin/settings");
  revalidatePath("/wallet/send");
  return { success: true };
}

// ── Admin notification email ──────────────────────────────────────────────────

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function saveAdminNotificationEmailAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const email = (formData.get("email") as string)?.trim();
  if (!email || !emailRegex.test(email)) {
    return { error: "Enter a valid email address." };
  }
  const phone = (formData.get("phone") as string)?.trim() ?? "";

  await Promise.all([
    saveAdminNotificationEmail(email),
    saveAdminNotificationPhone(phone),
  ]);

  revalidatePath("/admin/settings");
  return { success: true };
}

// ── Share pricing rate (SGD → BDT, always admin-defined, never live) ──────────

export async function saveShareRateAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const rate = parseFloat(formData.get("rate") as string);
  if (isNaN(rate) || rate <= 0) {
    return { error: "Enter a valid positive rate." };
  }

  await saveShareSgdRate(rate);

  revalidatePath("/admin/settings");
  revalidatePath("/shares");
  revalidatePath("/");

  return { success: true };
}

// ── Share 4 (buy-request) offer amounts — fully admin-configurable ───────────

export async function saveShare4AmountsAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  let amounts: number[];
  try {
    const parsed = JSON.parse(formData.get("amounts") as string);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
    amounts = parsed.map(Number);
    if (amounts.some((n) => !Number.isFinite(n) || n <= 0)) throw new Error();
  } catch {
    return { error: "Add at least one valid amount." };
  }

  await saveShare4Amounts(amounts);

  revalidatePath("/admin/settings");
  revalidatePath("/shares/buy-request");
  return { success: true };
}

// ── Bank rates ────────────────────────────────────────────────────────────────

async function authAdmin() {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    throw new Error("Unauthorized");
  }
}

export async function addBankRateAction(_prev: State, formData: FormData): Promise<State> {
  try { await authAdmin(); } catch { return { error: "Unauthorized." }; }

  const bankName = (formData.get("bankName") as string)?.trim();
  const rate = parseFloat(formData.get("rate") as string);

  if (!bankName) return { error: "Bank name is required." };
  if (isNaN(rate) || rate <= 0) return { error: "Enter a valid rate." };

  const count = await prisma.bankRate.count();
  await prisma.bankRate.create({
    data: { bankName, rate, sortOrder: count },
  });

  revalidatePath("/currency");
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function updateBankRateAction(_prev: State, formData: FormData): Promise<State> {
  try { await authAdmin(); } catch { return { error: "Unauthorized." }; }

  const id = formData.get("id") as string;
  const bankName = (formData.get("bankName") as string)?.trim();
  const rate = parseFloat(formData.get("rate") as string);

  if (!bankName) return { error: "Bank name is required." };
  if (isNaN(rate) || rate <= 0) return { error: "Enter a valid rate." };

  await prisma.bankRate.update({ where: { id }, data: { bankName, rate } });

  revalidatePath("/currency");
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function toggleBankRateAction(id: string, isActive: boolean): Promise<void> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) return;

  await prisma.bankRate.update({ where: { id }, data: { isActive } });

  revalidatePath("/currency");
  revalidatePath("/admin/settings");
}

export async function deleteBankRateAction(id: string): Promise<void> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) return;

  await prisma.bankRate.delete({ where: { id } });

  revalidatePath("/currency");
  revalidatePath("/admin/settings");
}

// ── Payment accounts (deposit receiving accounts shown to customers) ─────────

const PAYMENT_METHODS = ["BANK_TRANSFER", "BKASH", "NAGAD", "ROCKET", "GCASH", "PAYNOW"] as const;

function revalidatePaymentAccountPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard/deposit");
}

export async function addPaymentAccountAction(_prev: State, formData: FormData): Promise<State> {
  try { await authAdmin(); } catch { return { error: "Unauthorized." }; }

  const method = formData.get("method") as string;
  const label = (formData.get("label") as string)?.trim();
  const accountNumber = (formData.get("accountNumber") as string)?.trim();
  const accountName = (formData.get("accountName") as string)?.trim() || null;

  if (!PAYMENT_METHODS.includes(method as (typeof PAYMENT_METHODS)[number])) {
    return { error: "Select a valid payment method." };
  }
  if (!label) return { error: "Label is required." };
  if (!accountNumber) return { error: "Account number is required." };

  const count = await prisma.paymentAccount.count();
  await prisma.paymentAccount.create({
    data: { method: method as (typeof PAYMENT_METHODS)[number], label, accountNumber, accountName, sortOrder: count },
  });

  revalidatePaymentAccountPaths();
  return { success: true };
}

export async function updatePaymentAccountAction(_prev: State, formData: FormData): Promise<State> {
  try { await authAdmin(); } catch { return { error: "Unauthorized." }; }

  const id = formData.get("id") as string;
  const method = formData.get("method") as string;
  const label = (formData.get("label") as string)?.trim();
  const accountNumber = (formData.get("accountNumber") as string)?.trim();
  const accountName = (formData.get("accountName") as string)?.trim() || null;

  if (!PAYMENT_METHODS.includes(method as (typeof PAYMENT_METHODS)[number])) {
    return { error: "Select a valid payment method." };
  }
  if (!label) return { error: "Label is required." };
  if (!accountNumber) return { error: "Account number is required." };

  await prisma.paymentAccount.update({
    where: { id },
    data: { method: method as (typeof PAYMENT_METHODS)[number], label, accountNumber, accountName },
  });

  revalidatePaymentAccountPaths();
  return { success: true };
}

export async function togglePaymentAccountAction(id: string, isActive: boolean): Promise<void> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) return;

  await prisma.paymentAccount.update({ where: { id }, data: { isActive } });

  revalidatePaymentAccountPaths();
}

export async function deletePaymentAccountAction(id: string): Promise<void> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) return;

  await prisma.paymentAccount.delete({ where: { id } });

  revalidatePaymentAccountPaths();
}

export async function getAdSenseSettings(): Promise<{ enabled: boolean; clientId: string }> {
  try {
    const [enabledRow, clientRow] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "adsense_enabled" } }),
      prisma.siteSetting.findUnique({ where: { key: "adsense_client_id" } }),
    ]);
    return {
      enabled: enabledRow?.value === "true",
      clientId: clientRow?.value || process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "",
    };
  } catch {
    return { enabled: false, clientId: "" };
  }
}

export async function saveAdSenseSettingsAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const enabled = formData.get("enabled") === "on";
  const clientId = (formData.get("clientId") as string)?.trim() || "";

  await prisma.$transaction([
    prisma.siteSetting.upsert({
      where: { key: "adsense_enabled" },
      create: { key: "adsense_enabled", value: enabled ? "true" : "false" },
      update: { value: enabled ? "true" : "false" },
    }),
    prisma.siteSetting.upsert({
      where: { key: "adsense_client_id" },
      create: { key: "adsense_client_id", value: clientId },
      update: { value: clientId },
    }),
  ]);

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getReminderPriceSetting(): Promise<number> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "reminder_slot_price" } });
    const val = row ? parseFloat(row.value) : 100;
    return isNaN(val) || val < 0 ? 100 : val;
  } catch {
    return 100;
  }
}

export async function saveReminderSlotPriceAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const rawPrice = formData.get("slotPrice") as string;
  const price = parseFloat(rawPrice);
  if (isNaN(price) || price < 0) {
    return { error: "Please enter a valid price." };
  }

  await prisma.siteSetting.upsert({
    where: { key: "reminder_slot_price" },
    create: { key: "reminder_slot_price", value: String(price) },
    update: { value: String(price) },
  });

  revalidatePath("/reminders");
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function getSmtpSettings() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure"] },
      },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));
    return {
      host: map.get("smtp_host") || process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(map.get("smtp_port") || process.env.SMTP_PORT || 587),
      user: map.get("smtp_user") || process.env.SMTP_USER || "",
      pass: map.get("smtp_pass") || (process.env.SMTP_PASS ? "••••••••" : ""),
      from: map.get("smtp_from") || process.env.SMTP_FROM || "",
      secure: map.get("smtp_secure") === "true" || process.env.SMTP_SECURE === "true",
    };
  } catch {
    return {
      host: "smtp.gmail.com",
      port: 587,
      user: "",
      pass: "",
      from: "",
      secure: false,
    };
  }
}

export async function saveSmtpSettingsAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const host = (formData.get("host") as string)?.trim() || "smtp.gmail.com";
  const port = (formData.get("port") as string)?.trim() || "587";
  const user = (formData.get("user") as string)?.trim() || "";
  const pass = (formData.get("pass") as string)?.trim() || "";
  const from = (formData.get("from") as string)?.trim() || user;
  const secure = formData.get("secure") === "on" ? "true" : "false";

  const updates = [
    prisma.siteSetting.upsert({
      where: { key: "smtp_host" },
      create: { key: "smtp_host", value: host },
      update: { value: host },
    }),
    prisma.siteSetting.upsert({
      where: { key: "smtp_port" },
      create: { key: "smtp_port", value: port },
      update: { value: port },
    }),
    prisma.siteSetting.upsert({
      where: { key: "smtp_user" },
      create: { key: "smtp_user", value: user },
      update: { value: user },
    }),
    prisma.siteSetting.upsert({
      where: { key: "smtp_from" },
      create: { key: "smtp_from", value: from },
      update: { value: from },
    }),
    prisma.siteSetting.upsert({
      where: { key: "smtp_secure" },
      create: { key: "smtp_secure", value: secure },
      update: { value: secure },
    }),
  ];

  if (pass && pass !== "••••••••") {
    updates.push(
      prisma.siteSetting.upsert({
        where: { key: "smtp_pass" },
        create: { key: "smtp_pass", value: pass },
        update: { value: pass },
      })
    );
  }

  await prisma.$transaction(updates);
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function getWhatsAppApiSettings() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: { in: ["whatsapp_api_url", "whatsapp_api_token", "whatsapp_api_enabled"] },
      },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));
    return {
      enabled: map.get("whatsapp_api_enabled") === "true" || process.env.WHATSAPP_API_ENABLED === "true",
      apiUrl: map.get("whatsapp_api_url") || process.env.WHATSAPP_API_URL || "",
      apiToken: map.get("whatsapp_api_token") || (process.env.WHATSAPP_API_TOKEN ? "••••••••" : ""),
    };
  } catch {
    return {
      enabled: false,
      apiUrl: "",
      apiToken: "",
    };
  }
}

export async function saveWhatsAppApiSettingsAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const enabled = formData.get("enabled") === "on" ? "true" : "false";
  const apiUrl = (formData.get("apiUrl") as string)?.trim() || "";
  const apiToken = (formData.get("apiToken") as string)?.trim() || "";

  const updates = [
    prisma.siteSetting.upsert({
      where: { key: "whatsapp_api_enabled" },
      create: { key: "whatsapp_api_enabled", value: enabled },
      update: { value: enabled },
    }),
    prisma.siteSetting.upsert({
      where: { key: "whatsapp_api_url" },
      create: { key: "whatsapp_api_url", value: apiUrl },
      update: { value: apiUrl },
    }),
  ];

  if (apiToken && apiToken !== "••••••••") {
    updates.push(
      prisma.siteSetting.upsert({
        where: { key: "whatsapp_api_token" },
        create: { key: "whatsapp_api_token", value: apiToken },
        update: { value: apiToken },
      })
    );
  }

  await prisma.$transaction(updates);
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function saveSiteContactSettingsAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    return { error: "Unauthorized." };
  }

  const whatsappNumber = (formData.get("whatsappNumber") as string)?.trim() || "";
  const whatsappMessage = (formData.get("whatsappMessage") as string)?.trim() || "";
  const supportEmail = (formData.get("supportEmail") as string)?.trim() || "";
  const supportPhone = (formData.get("supportPhone") as string)?.trim() || "";
  const facebookUrl = (formData.get("facebookUrl") as string)?.trim() || "";
  const officeAddress = (formData.get("officeAddress") as string)?.trim() || "";
  const officeHours = (formData.get("officeHours") as string)?.trim() || "";

  await prisma.$transaction([
    prisma.siteSetting.upsert({
      where: { key: "site_whatsapp_number" },
      create: { key: "site_whatsapp_number", value: whatsappNumber },
      update: { value: whatsappNumber },
    }),
    prisma.siteSetting.upsert({
      where: { key: "site_whatsapp_message" },
      create: { key: "site_whatsapp_message", value: whatsappMessage },
      update: { value: whatsappMessage },
    }),
    prisma.siteSetting.upsert({
      where: { key: "site_support_email" },
      create: { key: "site_support_email", value: supportEmail },
      update: { value: supportEmail },
    }),
    prisma.siteSetting.upsert({
      where: { key: "site_support_phone" },
      create: { key: "site_support_phone", value: supportPhone },
      update: { value: supportPhone },
    }),
    prisma.siteSetting.upsert({
      where: { key: "site_facebook_url" },
      create: { key: "site_facebook_url", value: facebookUrl },
      update: { value: facebookUrl },
    }),
    prisma.siteSetting.upsert({
      where: { key: "site_office_address" },
      create: { key: "site_office_address", value: officeAddress },
      update: { value: officeAddress },
    }),
    prisma.siteSetting.upsert({
      where: { key: "site_office_hours" },
      create: { key: "site_office_hours", value: officeHours },
      update: { value: officeHours },
    }),
  ]);

  revalidatePath("/", "layout");
  revalidatePath("/contact");
  revalidatePath("/air-ticket");
  revalidatePath("/taxi");
  revalidatePath("/privacy");
  revalidatePath("/admin/settings");
  return { success: true };
}
