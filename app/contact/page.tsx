import { getSiteContactSettings, formatWhatsAppLink } from "@/lib/site-contact";

export default async function ContactPage() {
  const contact = await getSiteContactSettings();
  const whatsappHref = formatWhatsAppLink(contact.whatsappNumber, contact.whatsappMessage);

  const FAQS = [
    { q: "How do I verify my account?", a: "After registration, check your email for a 6-digit OTP code. Enter it on the verification page to activate your account." },
    { q: "How long does a deposit take to process?", a: "Deposits are verified by our admin team within 2–4 hours during business hours (9am–6pm SGT). Weekends may take longer." },
    { q: "How do share purchases work?", a: "Browse active projects, choose a quantity and payment method, then submit your request. Admin approves and transfers shares to your account." },
    { q: "Can I sell my shares?", a: "Yes. Log in and navigate to your portfolio, then list your shares for sale. Another community member can purchase through the secondary market." },
    { q: "Is my NID number safe?", a: "Your NID is stored securely and only used for identity verification. It is never shared with third parties." },
    { q: "How do I contact a driver for taxi?", a: "After submitting a taxi request our team will WhatsApp you within 1 hour to confirm the driver details." },
  ];

  const CHANNELS = [
    {
      icon: (
        <svg className="w-6 h-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      ),
      title: "WhatsApp Support",
      value: contact.whatsappNumber,
      sub: "Fastest response · 9am–9pm SGT",
      href: whatsappHref,
      label: "Chat on WhatsApp",
      btnClass: "bg-[#25D366] hover:bg-[#1ebe5a] text-white",
    },
    {
      icon: (
        <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: "Support Email",
      value: contact.supportEmail,
      sub: "Reply within 24 hours",
      href: `mailto:${contact.supportEmail}`,
      label: "Send Email",
      btnClass: "bg-brand hover:bg-brand-dark text-white",
    },
    {
      icon: (
        <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      title: "Facebook Group",
      value: "Nirapode Community",
      sub: "Community discussions & updates",
      href: contact.facebookUrl || "https://facebook.com",
      label: "Join Group",
      btnClass: "bg-[#1877F2] hover:bg-blue-700 text-white",
    },
  ];

  return (
    <div className="min-h-screen bg-muted">
      {/* Hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-brand bg-brand-50 px-3 py-1 rounded-full mb-3">
            Contact
          </span>
          <h1 className="text-3xl font-bold text-foreground">Get in Touch</h1>
          <p className="text-muted-foreground mt-2">We&apos;re here to help the Bangladeshi community in Singapore. Reach us through any channel below.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Contact channels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {CHANNELS.map((c) => (
            <div key={c.title} className="bg-white rounded-2xl border border-border p-6 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                {c.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{c.title}</h3>
              <p className="text-sm text-foreground mb-0.5 break-all">{c.value}</p>
              <p className="text-xs text-muted-foreground mb-4 flex-1">{c.sub}</p>
              <a href={c.href} target="_blank" rel="noopener noreferrer"
                className={`text-xs font-semibold px-4 py-2 rounded-lg text-center transition-colors ${c.btnClass}`}>
                {c.label}
              </a>
            </div>
          ))}
        </div>

        {/* Office info */}
        <div className="bg-white rounded-2xl border border-border p-7">
          <h2 className="font-semibold text-foreground mb-4">Office & Support Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Address</p>
              <p className="text-foreground whitespace-pre-line">{contact.officeAddress}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Business Hours</p>
              <p className="text-foreground whitespace-pre-line">{contact.officeHours}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Response Time</p>
              <p className="text-foreground whitespace-pre-line">
                WhatsApp: Within 1 hour{"\n"}
                Email: Within 24 hours{"\n"}
                {contact.supportPhone ? `Hotline: ${contact.supportPhone}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-5">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-5">
                <p className="font-semibold text-foreground mb-2">{faq.q}</p>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
