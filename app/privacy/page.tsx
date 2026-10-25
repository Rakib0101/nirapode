import { getSiteContactSettings } from "@/lib/site-contact";

export default async function PrivacyPage() {
  const contact = await getSiteContactSettings();

  const sections = [
    {
      title: "1. Information We Collect",
      body: "We collect the following information when you register and use the Platform:\n\n• Personal identity: Full name, National Identity Document (NID) number, email address, phone number, and profile photo.\n• Financial data: Payment transaction IDs submitted for wallet deposits and share purchases. We do not store credit card or full bank account numbers.\n• Usage data: Log data, IP addresses, browser type, and activity on the Platform for security and analytics purposes.\n• Communications: Any messages you send to our support team.",
    },
    {
      title: "2. How We Use Your Information",
      body: "Your data is used to:\n\n• Verify your identity and activate your account.\n• Process share purchases, wallet deposits, and other transactions.\n• Send OTP verification codes and important account notifications.\n• Provide customer support.\n• Detect and prevent fraud or unauthorised access.\n• Comply with applicable Singapore laws and regulations.\n\nWe do not sell or rent your personal data to third parties.",
    },
    {
      title: "3. Data Sharing",
      body: "We may share your data with:\n\n• Trusted service providers who operate the platform infrastructure (e.g. database hosting, email delivery) under strict confidentiality agreements.\n• Law enforcement or regulatory authorities if required by Singapore law.\n• Other community members only to the extent necessary — for example, your name and phone number appear on your Lost & Found posts to allow community contact.\n\nYour NID number is never shared with other members.",
    },
    {
      title: "4. Data Retention",
      body: "We retain your data for as long as your account is active or as required by law. If you request account deletion, we will remove your personal data within 30 days, except where retention is required for legal, tax, or fraud-prevention purposes.",
    },
    {
      title: "5. Security",
      body: "We implement industry-standard security measures including encrypted passwords (bcrypt), HTTPS-only connections, HTTP-only session cookies, and regular security reviews. However, no system is 100% secure. Please use a strong, unique password and do not share your login credentials.",
    },
    {
      title: "6. Cookies",
      body: "We use a single session cookie (sp_session) to keep you logged in. We also set a googtrans cookie to remember your language preference. No third-party advertising cookies are used. The Google Translate widget may set its own cookies governed by Google's Privacy Policy.",
    },
    {
      title: "7. Your Rights",
      body: `Under Singapore's Personal Data Protection Act (PDPA) 2012, you have the right to:\n\n• Access the personal data we hold about you.\n• Correct inaccurate personal data.\n• Withdraw consent for data use (which may affect your ability to use certain features).\n• Request deletion of your account and personal data.\n\nTo exercise these rights, contact us at ${contact.supportEmail}.`,
    },
    {
      title: "8. Changes to This Policy",
      body: "We may update this policy from time to time. We will notify registered users of significant changes via email. Continued use of the Platform after changes constitutes acceptance of the updated policy.",
    },
    {
      title: "9. Contact",
      body: `For privacy-related questions or data requests, contact:\n\nEmail: ${contact.supportEmail}\nWhatsApp: ${contact.whatsappNumber}\nAddress: ${contact.officeAddress}`,
    },
  ];

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-border p-8 sm:p-10">
          <p className="text-xs text-muted-foreground mb-2">Last updated: 2026</p>
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Nirapode Platform (&quot;we&quot;, &quot;our&quot;, &quot;the Platform&quot;) is committed to protecting the privacy of our members. This policy explains how we collect, use, and protect your personal data.</p>

          {sections.map((section) => (
            <div key={section.title} className="mb-7">
              <h2 className="text-base font-bold text-foreground mb-3">{section.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
