// How a reminder reaches you.
//
// WhatsApp used to be an option. It went because delivery depended on a Twilio
// sandbox that each recipient had to join by hand before a single message
// would arrive — a reminder that silently doesn't reach you is worse than no
// reminder at all.
//
// An in-app notification is written either way, so the bell always has the
// record. The channel only decides what else goes out.
export const REMINDER_CHANNELS = ["EMAIL", "APP", "BOTH"] as const;

export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

export const DEFAULT_REMINDER_CHANNEL: ReminderChannel = "BOTH";

export const REMINDER_CHANNEL_LABELS: Record<ReminderChannel, string> = {
  EMAIL: "Email",
  APP: "App notification",
  BOTH: "Email & app notification",
};

export function isReminderChannel(value: unknown): value is ReminderChannel {
  return typeof value === "string" && (REMINDER_CHANNELS as readonly string[]).includes(value);
}

// Falls back rather than throwing: a bad value should not stop someone saving
// a reminder, and BOTH is the noisiest (safest) option for an alarm.
export function toReminderChannel(value: unknown): ReminderChannel {
  return isReminderChannel(value) ? value : DEFAULT_REMINDER_CHANNEL;
}

export function sendsEmail(channel: string): boolean {
  return channel === "EMAIL" || channel === "BOTH";
}

export function sendsPush(channel: string): boolean {
  return channel === "APP" || channel === "BOTH";
}
