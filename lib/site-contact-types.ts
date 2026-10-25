export type SiteContactSettings = {
  whatsappNumber: string;
  whatsappMessage: string;
  supportEmail: string;
  supportPhone: string;
  facebookUrl: string;
  officeAddress: string;
  officeHours: string;
};

export const DEFAULT_CONTACT_SETTINGS: SiteContactSettings = {
  whatsappNumber: "+6581234567",
  whatsappMessage: "Hello Nirapode Support, I would like to inquire about your services.",
  supportEmail: "support@nirapode.com",
  supportPhone: "+65 8123 4567",
  facebookUrl: "https://facebook.com",
  officeAddress: "Mustafa Centre Area, Little India, Singapore",
  officeHours: "Mon–Sat: 10am – 8pm SGT (Sunday: Closed)",
};

export function formatWhatsAppLink(phone: string, message?: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  const text = message ? encodeURIComponent(message) : "";
  return digits ? `https://wa.me/${digits}${text ? `?text=${text}` : ""}` : "https://wa.me/";
}
