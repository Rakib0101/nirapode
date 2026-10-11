// Client-safe — no prisma import. Countries relevant to this platform's
// migrant-worker audience, each mapped to a fixed UTC offset. None of these
// zones observe DST, so a static offset table is reliable (no need for the
// more complex Intl-based reverse-offset-lookup algorithm this would
// otherwise require).

export type ReminderCountry = {
  country: string;
  timezone: string; // IANA id, used for *display* via toLocaleString(timeZone:...)
  offsetMinutes: number; // fixed UTC+offset in minutes, used to convert local wall-clock -> UTC
};

export const REMINDER_COUNTRIES: ReminderCountry[] = [
  { country: "Bangladesh", timezone: "Asia/Dhaka", offsetMinutes: 360 },
  { country: "Singapore", timezone: "Asia/Singapore", offsetMinutes: 480 },
  { country: "Malaysia", timezone: "Asia/Kuala_Lumpur", offsetMinutes: 480 },
  { country: "Philippines", timezone: "Asia/Manila", offsetMinutes: 480 },
  { country: "India", timezone: "Asia/Kolkata", offsetMinutes: 330 },
  { country: "Saudi Arabia", timezone: "Asia/Riyadh", offsetMinutes: 180 },
  { country: "United Arab Emirates", timezone: "Asia/Dubai", offsetMinutes: 240 },
  { country: "Qatar", timezone: "Asia/Qatar", offsetMinutes: 180 },
  { country: "Oman", timezone: "Asia/Muscat", offsetMinutes: 240 },
  { country: "Kuwait", timezone: "Asia/Kuwait", offsetMinutes: 180 },
];

export const DEFAULT_REMINDER_TIMEZONE = "Asia/Singapore";

export function getOffsetMinutes(timezone: string | null | undefined): number {
  const match = REMINDER_COUNTRIES.find((c) => c.timezone === timezone);
  return match ? match.offsetMinutes : 480; // fall back to Singapore, the old hardcoded behavior
}

// Converts a wall-clock date/time as picked in the given IANA zone into the
// equivalent UTC instant, using the zone's fixed offset above.
export function zonedToUtc(y: number, month: number, d: number, h: number, mi: number, timezone: string): Date {
  const offsetMinutes = getOffsetMinutes(timezone);
  return new Date(Date.UTC(y, month - 1, d, h, mi) - offsetMinutes * 60_000);
}

// The inverse — renders a stored UTC instant back into the wall-clock
// date/time inputs a <input type="date">/<input type="time"> expect, in the
// reminder's own chosen zone. Deliberately avoids the browser's local
// timezone entirely (unlike `new Date(value).getHours()`, which would be
// wrong whenever the viewer's device clock is set to a different zone than
// the one the reminder was actually scheduled in).
export function utcToZonedInputs(date: Date, timezone: string): { date: string; time: string } {
  const offsetMinutes = getOffsetMinutes(timezone);
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
}
