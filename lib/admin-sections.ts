// The admin panel's sections. A SUPER_ADMIN always has every section; ADMIN and
// MODERATOR accounts only get the sections a super admin ticks for them
// (User.adminPermissions). Client-safe: no server imports here, so the admin
// navs and the permissions editor can use it too. Server-side checks live in
// lib/admin-permissions.ts.
export const ADMIN_SECTIONS = [
  { key: "users", label: "Users", hrefs: ["/admin/users"] },
  { key: "shares", label: "Shares & purchase requests", hrefs: ["/admin/shares", "/admin/purchases"] },
  { key: "deposits", label: "Deposits", hrefs: ["/admin/deposits"] },
  { key: "withdrawals", label: "Withdrawals", hrefs: ["/admin/withdrawals"] },
  { key: "checkouts", label: "Checkouts", hrefs: ["/admin/checkouts"] },
  { key: "airTicket", label: "Air tickets", hrefs: ["/admin/air-ticket"] },
  { key: "taxi", label: "Taxi requests & vendors", hrefs: ["/admin/taxi"] },
  { key: "blog", label: "Blog", hrefs: ["/admin/blog"] },
  { key: "islamic", label: "Islamic Center", hrefs: ["/admin/islamic"] },
  { key: "pickPut", label: "Pick & Put / Lost & Found", hrefs: ["/admin/pick-put", "/admin/lost-found"] },
  { key: "apply", label: "Apply / Services", hrefs: ["/admin/apply"] },
  { key: "products", label: "Products", hrefs: ["/admin/products"] },
  { key: "gcash", label: "SGD → GCash transfers", hrefs: ["/admin/gcash"] },
  { key: "partners", label: "Partner companies", hrefs: ["/admin/partner-companies"] },
  { key: "settings", label: "Settings (rates, accounts, site)", hrefs: ["/admin/settings"] },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["key"];

export const ALL_ADMIN_SECTIONS: AdminSection[] = ADMIN_SECTIONS.map((s) => s.key);

export const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"] as const;

export function isAdminSection(value: string): value is AdminSection {
  return (ALL_ADMIN_SECTIONS as string[]).includes(value);
}

// The section an /admin/... path belongs to, or null for the dashboard and
// anything not tied to a section.
export function sectionForPath(pathname: string): AdminSection | null {
  for (const s of ADMIN_SECTIONS) {
    if (s.hrefs.some((h) => pathname === h || pathname.startsWith(h + "/"))) return s.key;
  }
  return null;
}

// Which sections an account can use, from its role and stored list.
export function effectiveSections(role: string, stored: readonly string[]): AdminSection[] {
  if (role === "SUPER_ADMIN") return [...ALL_ADMIN_SECTIONS];
  if (role !== "ADMIN" && role !== "MODERATOR") return [];
  return ALL_ADMIN_SECTIONS.filter((s) => stored.includes(s));
}
