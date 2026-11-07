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
// recipient last messaging us — a scheduled reminder or admin notification is
// almost always sent outside that window, so it must go out as an approved
// Content Template rather than plain text. TWILIO_DEFAULT_CONTENT_SID is
// expected to be a template with one variable slot that holds the full
// message; if the approved template's variable count/shape differs, adjust
// the `contentVariables` map below to match (check via Twilio's Content API,
// GET /v1/Content/{Sid}, once TWILIO_AUTH_TOKEN is set).
async function sendViaTwilio(
  config: ReturnType<typeof getTwilioConfig>,
  to: string,
  text: string,
  mediaUrl?: string
): Promise<{ success: boolean; error?: string; sid?: string }> {
  try {
    const client = twilio(config.accountSid, config.authToken);
    const e164 = to.startsWith("+") ? to : `+${to.replace(/[^\d]/g, "")}`;
    const toWhatsApp = to.startsWith("whatsapp:") ? to : `whatsapp:${e164}`;

    const params: Parameters<typeof client.messages.create>[0] = config.defaultContentSid
      ? {
          from: config.from,
          to: toWhatsApp,
          contentSid: config.defaultContentSid,
          contentVariables: JSON.stringify({ "1": text }),
        }
      : {
          from: config.from,
          to: toWhatsApp,
          body: text,
          ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
        };

    const message = await client.messages.create(params);
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
