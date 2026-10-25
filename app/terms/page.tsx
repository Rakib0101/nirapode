export default async function TermsPage() {
  const sections = [
    {
      title: "1. Eligibility",
      body: "The Platform is intended for Bangladeshi nationals and expatriates residing in or connected to Singapore. You must be at least 18 years old to register. By registering, you confirm that the information you provide — including your name, NID number, email, and phone — is accurate and belongs to you.",
    },
    {
      title: "2. Account Responsibility",
      body: "You are responsible for maintaining the confidentiality of your login credentials. Do not share your NID number or password with anyone. You are liable for all activities that occur under your account. Report any unauthorised access to us immediately at support@nirapode.com.",
    },
    {
      title: "3. Share Investment Marketplace",
      body: "The share marketplace facilitates community-based investment in approved projects. Important terms:\n\n• Share purchases are subject to admin approval and are not guaranteed.\n• Investments carry risk. Past performance does not guarantee future returns.\n• The Platform does not provide financial advice. Invest only what you can afford to lose.\n• Share transfers are finalised only after admin approval and payment verification.\n• The Platform reserves the right to suspend or delist any project at its discretion.",
    },
    {
      title: "4. Wallet & Deposits",
      body: "• Wallet balances are held in trust for the purposes of the Platform.\n• Deposits are credited only after verification of payment evidence by an admin.\n• Withdrawals are subject to Platform policies and may require identity re-verification.\n• We are not a licensed bank or financial institution. Wallet balances are not insured.\n• In the event of disputes over deposits, the Platform's decision is final.",
    },
    {
      title: "5. Air Tickets & Taxi Services",
      body: "• Air ticket and taxi bookings are facilitated by community agents, not the Platform directly.\n• Prices displayed are indicative. Actual prices are confirmed at the time of booking.\n• Cancellation and refund policies are determined by the respective agents.\n• The Platform is not liable for flight delays, cancellations, or driver no-shows.",
    },
    {
      title: "6. User-Generated Content",
      body: "When you post content (blog comments, lost & found posts, etc.), you grant the Platform a non-exclusive licence to display that content. You must not post:\n\n• False, misleading, or defamatory content.\n• Content that violates Singapore law, including the Sedition Act or POHA.\n• Spam, scam offers, or unsolicited commercial content.\n• Content infringing third-party intellectual property rights.\n\nThe Platform reserves the right to remove any content and suspend accounts that violate these rules.",
    },
    {
      title: "7. Prohibited Activities",
      body: "You must not:\n• Attempt to gain unauthorised access to other users' accounts or the Platform's systems.\n• Use the Platform to launder money or fund illegal activities.\n• Impersonate another person or provide false identity information.\n• Manipulate the share marketplace through wash trading or coordinated manipulation.\n• Use automated bots or scrapers without express written permission.",
    },
    {
      title: "8. Limitation of Liability",
      body: "To the maximum extent permitted by Singapore law, the Platform is not liable for:\n\n• Investment losses in the share marketplace.\n• Losses arising from reliance on currency exchange rates displayed on the Platform.\n• Service interruptions or data loss due to technical failures.\n• Actions or conduct of third-party agents (taxi drivers, ticket agents, etc.).\n\nThe Platform's total liability to any user is limited to the amount paid by that user to the Platform in the preceding 3 months.",
    },
    {
      title: "9. Governing Law & Disputes",
      body: "These Terms are governed by the laws of Singapore. Any dispute arising from these Terms shall first be attempted to be resolved through mediation. If mediation fails, disputes shall be referred to the Singapore courts.",
    },
    {
      title: "10. Changes to Terms",
      body: "We may update these Terms from time to time. We will notify registered users of material changes via email at least 7 days before they take effect. Continued use of the Platform after the effective date constitutes acceptance of the revised Terms.",
    },
    {
      title: "11. Contact",
      body: "For questions about these Terms:\n\nEmail: legal@nirapode.com\nWhatsApp: +65 XXXX XXXX",
    },
  ];

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-border p-8 sm:p-10">
          <p className="text-xs text-muted-foreground mb-2">Last updated: January 2026</p>
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Please read these Terms of Service carefully before using the Nirapode Platform. By registering or using the Platform, you agree to these terms.</p>

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
