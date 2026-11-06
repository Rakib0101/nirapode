import { getSiteContactSettings, formatWhatsAppLink } from "@/lib/site-contact";

// Mirrors app/contact/page.tsx. Public — no login required.
export async function GET() {
  try {
    const contact = await getSiteContactSettings();
    return Response.json({
      whatsappNumber: contact.whatsappNumber,
      whatsappHref: formatWhatsAppLink(contact.whatsappNumber, contact.whatsappMessage),
      supportEmail: contact.supportEmail,
      supportPhone: contact.supportPhone,
      facebookUrl: contact.facebookUrl,
      officeAddress: contact.officeAddress,
      officeHours: contact.officeHours,
    });
  } catch (err: unknown) {
    console.error("Mobile contact error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load contact info." }, { status: 500 });
  }
}
