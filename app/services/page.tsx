import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ServiceRequestForm } from "./service-form";

async function getServices() {
  return prisma.applyService.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, description: true, price: true },
  });
}

export default async function ServicesPage() {
  const services = await getServices();

  const serialized = services.map((s) => ({
    ...s,
    price: Number(s.price),
  }));

  return (
    <div className="min-h-screen bg-muted">
      {/* Hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-brand bg-brand-50 px-3 py-1 rounded-full mb-4">
            Professional Services
          </span>
          <h1 className="text-3xl font-bold text-foreground mb-2">Our Services</h1>
          <p className="text-muted-foreground max-w-xl">
            We help Bangladeshi workers in Singapore with document processing, resume creation, ePassport applications, and more. Fill the form and our team will contact you.
          </p>

          {/* What you need */}
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { icon: "📄", label: "Passport Copy" },
              { icon: "🪪", label: "NID / IC" },
              { icon: "📸", label: "Passport Photo" },
              { icon: "📋", label: "Work Permit" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-sm text-foreground">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Quick CV Builder Link */}
          <div className="mt-6 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent border border-brand/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>✨</span> Instant Worker CV / Resume Builder
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Build your professional Singapore CV in 2 minutes, download PDF, and share to WhatsApp.
              </p>
            </div>
            <Link
              href="/services/cv-builder"
              className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs whitespace-nowrap"
            >
              <span>Build My CV</span>
              <span>→</span>
            </Link>
          </div>

          {/* SGD → GCash transfer service */}
          <div className="mt-3 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border border-sky-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>💸</span> Send to GCash (SGD → Pesos)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pay in Singapore Dollars and we send Pesos to any GCash account. Upload your payment proof; we send you ours.
              </p>
            </div>
            <Link
              href="/services/gcash"
              className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs whitespace-nowrap"
            >
              <span>Send to GCash</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Services grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {services.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No services available right now. Check back soon.
          </div>
        ) : (
          <ServiceRequestForm services={serialized} />
        )}
      </div>

      {/* How it works */}
      <div className="bg-white border-t border-border mt-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <h2 className="text-lg font-bold text-foreground mb-6">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Choose a Service", desc: "Select the service you need and click Apply Now." },
              { step: "2", title: "Upload Documents", desc: "Fill your details and upload required documents like Passport and NID." },
              { step: "3", title: "We Contact You", desc: "Our team will review your application and contact you within 1–2 business days." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-9 h-9 rounded-full bg-brand text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
