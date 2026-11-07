import { prisma } from "@/lib/prisma";
import twilio from "twilio";

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const from = process.env.TWILIO_WHATSAPP_FROM || "";
  const defaultContentSid = process.env.TWILIO_DEFAULT_CONTENT_SID || "";
  return { enabled: Boolean(accountSid && authToken && from), accountSid, authToken, from, defaultContentSid };
}

// WhatsApp Business API only allows free-form text within 24h of the
// recipient last messaging us (an open "session"); outside that window a
// message must go out as an approved Content Template, and Twilio rejects a
// free-form send with error 63016. Verified live against this account,
// though: Body-only sends are rejected outright with error 21654
// ("ContentSid Required") regardless of session state — this Trial-account
// WhatsApp Sandbox number requires a Content Template for every message, not
// just ones outside a session window. Treating both codes as "needs a
// template" keeps this working correctly on real production WABA numbers
// (where only 63016 would ever fire) and on accounts like this one.
//
// IMPORTANT caveat about the template itself: TWILIO_DEFAULT_CONTENT_SID is
// Twilio's generic Trial-account sandbox template (per the account holder,
// two variables — likely date/time). Confirming its exact approved wording
// programmatically (Twilio's Content API) is itself blocked on Trial
// accounts (error 20003, "not available on a Trial account"), so its literal
// text is unverified. Live-tested substituting arbitrary strings into both
// variable slots, though, and Twilio delivers them without validating they
// "look like" a date/time — so variable "1" below carries the actual
// reminder text (the one thing that must come through), accepting the
// message may read grammatically oddly depending on the template's real
// wording. A real custom template with a dedicated free-text variable
// requires upgrading past Trial and Meta approval; redo this properly once
// that exists.
const WHATSAPP_NEEDS_CONTENT_TEMPLATE_ERROR_CODES = new Set([63016, 21654]);

async function sendViaTwilio(
  config: ReturnType<typeof getTwilioConfig>,
  to: string,
  text: string,
  mediaUrl?: string
): Promise<{ success: boolean; error?: string; sid?: string }> {
  const client = twilio(config.accountSid, config.authToken);
  const e164 = to.startsWith("+") ? to : `+${to.replace(/[^\d]/g, "")}`;
  const toWhatsApp = to.startsWith("whatsapp:") ? to : `whatsapp:${e164}`;

  try {
    const message = await client.messages.create({
      from: config.from,
      to: toWhatsApp,
      body: text,
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
    });
    return { success: true, sid: message.sid };
  } catch (err: unknown) {
    const code = (err as { code?: number } | null)?.code;
    if (!code || !WHATSAPP_NEEDS_CONTENT_TEMPLATE_ERROR_CODES.has(code) || !config.defaultContentSid) {
      return { success: false, error: err instanceof Error ? err.message : "Twilio send failed" };
    }
  }

  // Fallback: send via the Content Template, substituting the actual
  // reminder text into variable "1" so the real content still comes through
  // (see caveat above).
  try {
    const now = new Date();
    const message = await client.messages.create({
      from: config.from,
      to: toWhatsApp,
      contentSid: config.defaultContentSid,
      contentVariables: JSON.stringify({
        "1": text,
        "2": now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      }),
    });
    return { success: true, sid: message.sid };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Twilio send failed" };
  }
}

export async function getWhatsAppConfig() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: { in: ["whatsapp_api_url", "whatsapp_api_token", "whatsapp_api_enabled"] },
      },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));
    const enabled = map.get("whatsapp_api_enabled") === "true" || process.env.WHATSAPP_API_ENABLED === "true";
    const apiUrl = map.get("whatsapp_api_url") || process.env.WHATSAPP_API_URL || "";
    const apiToken = map.get("whatsapp_api_token") || process.env.WHATSAPP_API_TOKEN || "";

    return {
      enabled: Boolean(enabled && apiUrl && apiToken),
      apiUrl,
      apiToken,
    };
  } catch {
    return {
      enabled: Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN),
      apiUrl: process.env.WHATSAPP_API_URL || "",
      apiToken: process.env.WHATSAPP_API_TOKEN || "",
    };
  }
}

export async function sendWhatsAppMessage({
  to,
  text,
  mediaUrl,
}: {
  to: string;
  text: string;
  mediaUrl?: string;
}): Promise<{ success: boolean; error?: string; sid?: string }> {
  // Twilio is the preferred backend when configured — it's what Reminders
  // (and every other WhatsApp notification sharing this function) actually
  // uses now. Falls through to the generic DB-configured provider below only
  // when Twilio env vars aren't set, so existing Green API/UltraMsg/Meta
  // Cloud API setups keep working unchanged.
  const twilioConfig = getTwilioConfig();
  if (twilioConfig.enabled) {
    return sendViaTwilio(twilioConfig, to, text, mediaUrl);
  }

  const config = await getWhatsAppConfig();

  if (!config.enabled || !config.apiUrl || !config.apiToken) {
    return { success: false, error: "WhatsApp API credentials not configured in Admin Settings or .env" };
  }

  const digits = to.replace(/[^\d]/g, "");

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: Record<string, unknown> = {};

    const url = config.apiUrl.trim();

    // 1. Green API support (Instant free & easiest)
    if (url.includes("green-api.com")) {
      body = {
        chatId: `${digits}@c.us`,
        message: text,
      };
    }
    // 2. UltraMsg support
    else if (url.includes("ultramsg.com")) {
      body = {
        token: config.apiToken,
        to: digits,
        body: text,
      };
    }
    // 3. Standard / Custom / Meta Cloud API
    else {
      headers["Authorization"] = `Bearer ${config.apiToken}`;
      body = {
        to: digits,
        text,
        message: text,
        body: text,
        chatId: `${digits}@c.us`,
        mediaUrl: mediaUrl || undefined,
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `WhatsApp API HTTP ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
