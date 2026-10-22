import { getActivePartnerCompanies } from "@/app/actions/partner-companies";

export async function PartnerCompaniesSection() {
  const companies = await getActivePartnerCompanies();
  if (companies.length === 0) return null;

  return (
    <section className="py-12 md:py-20 bg-white border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground mb-8">
          Companies We Work With
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {companies.map((c) =>
            c.websiteUrl ? (
              <a
                key={c.id}
                href={c.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={c.name}
                className="opacity-90 hover:opacity-100 transition-opacity"
              >
                <img src={c.logoUrl} alt={c.name} className="h-10 sm:h-12 w-auto object-contain" />
              </a>
            ) : (
              <img
                key={c.id}
                src={c.logoUrl}
                alt={c.name}
                title={c.name}
                className="h-10 sm:h-12 w-auto object-contain opacity-90"
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
