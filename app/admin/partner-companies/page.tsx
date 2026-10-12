import { prisma } from "@/lib/prisma";
import { PartnerCompaniesForm } from "./partner-companies-form";

async function getCompanies() {
  return prisma.partnerCompany.findMany({ orderBy: { sortOrder: "asc" } });
}

export default async function AdminPartnerCompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Partner Companies</h1>
        <p className="text-sm text-muted-foreground">
          Logos shown near the bottom of the homepage. Only active companies appear there.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <PartnerCompaniesForm companies={companies} />
      </div>
    </div>
  );
}
