// The one menu.
//
// There used to be four, and they disagreed: the navbar's desktop row, the
// navbar's hamburger sheet, and two separate lists in the bottom nav (one for
// guests, one for signed-in users). Products was in some and not others, MRT
// Map only in the bottom nav, Forum only in the navbar — which link you could
// reach depended on your screen width and whether you were logged in.
//
// Everything now comes from here, grouped, and the app's More screen mirrors
// the same grouping. `auth` decides who sees an item.
export type NavAudience = "all" | "signedIn" | "guest";

export type NavLink = {
  href: string;
  label: string;
  auth?: NavAudience; // default "all"
};

export type NavGroup = {
  title: string;
  links: NavLink[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Invest",
    links: [
      { href: "/shares", label: "Shares 6" },
      { href: "/shares/buy-request", label: "Share 4" },
      { href: "/shares/resell", label: "Resell Market" },
      { href: "/shares/my", label: "My Investments", auth: "signedIn" },
    ],
  },
  {
    title: "Shop",
    links: [
      { href: "/products", label: "Products" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/services", label: "Services" },
      { href: "/services/cv-builder", label: "CV Builder" },
      { href: "/apply", label: "Apply" },
      { href: "/taxi", label: "Taxi Rent" },
      { href: "/air-ticket", label: "Air Ticket" },
      { href: "/pick-put", label: "Pick & Put" },
      { href: "/pick-put/my", label: "My Pick & Put", auth: "signedIn" },
    ],
  },
  {
    title: "Money",
    links: [
      { href: "/wallet", label: "Wallet", auth: "signedIn" },
      { href: "/checkout", label: "Checkout", auth: "signedIn" },
      { href: "/history", label: "All History", auth: "signedIn" },
      { href: "/currency", label: "Currency" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/forum", label: "Forum" },
      { href: "/islamic-center", label: "Islamic Center" },
      { href: "/blog", label: "Blog" },
      // Existed on both web and app but was in none of the four old menus.
      { href: "/lost-found", label: "Lost & Found" },
      { href: "/reminders", label: "Alarm & Reminders", auth: "signedIn" },
      { href: "/mrt-map", label: "MRT Map" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

// Account items. Kept apart from the groups above because the navbar shows
// them under the avatar, not in the main list.
export const ACCOUNT_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", auth: "signedIn" },
  { href: "/profile", label: "Profile", auth: "signedIn" },
];

function visible(link: NavLink, signedIn: boolean): boolean {
  const audience = link.auth ?? "all";
  if (audience === "signedIn") return signedIn;
  if (audience === "guest") return !signedIn;
  return true;
}

export function navGroupsFor(signedIn: boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((l) => visible(l, signedIn)),
  })).filter((group) => group.links.length > 0);
}

export function navLinksFor(signedIn: boolean): NavLink[] {
  return navGroupsFor(signedIn).flatMap((g) => g.links);
}

// The handful that fit across the top on a wide screen. Everything else is
// one tap away in the same menu — this is a shortcut row, not a second menu.
export const PRIMARY_HREFS = ["/shares", "/shares/buy-request", "/products", "/services", "/forum", "/islamic-center"];

export function primaryNavLinks(signedIn: boolean): NavLink[] {
  const all = navLinksFor(signedIn);
  return PRIMARY_HREFS.map((href) => all.find((l) => l.href === href)).filter((l): l is NavLink => Boolean(l));
}
