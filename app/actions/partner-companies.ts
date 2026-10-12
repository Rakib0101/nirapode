"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

type State = { error?: string; success?: boolean } | null;

async function authAdmin() {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    throw new Error("Unauthorized");
  }
}

function revalidatePartnerPaths() {
  revalidatePath("/");
  revalidatePath("/admin/partner-companies");
}

export async function addPartnerCompanyAction(_prev: State, formData: FormData): Promise<State> {
  try { await authAdmin(); } catch { return { error: "Unauthorized." }; }

  const name = (formData.get("name") as string)?.trim();
  const logoUrl = (formData.get("logoUrl") as string)?.trim();
  const websiteUrl = (formData.get("websiteUrl") as string)?.trim() || null;

  if (!name) return { error: "Company name is required." };
  if (!logoUrl) return { error: "Please upload a logo." };

  const count = await prisma.partnerCompany.count();
  await prisma.partnerCompany.create({
    data: { name, logoUrl, websiteUrl, sortOrder: count },
  });

  revalidatePartnerPaths();
  return { success: true };
}

export async function updatePartnerCompanyAction(_prev: State, formData: FormData): Promise<State> {
  try { await authAdmin(); } catch { return { error: "Unauthorized." }; }

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const logoUrl = (formData.get("logoUrl") as string)?.trim();
  const websiteUrl = (formData.get("websiteUrl") as string)?.trim() || null;

  if (!name) return { error: "Company name is required." };
  if (!logoUrl) return { error: "Please upload a logo." };

  await prisma.partnerCompany.update({ where: { id }, data: { name, logoUrl, websiteUrl } });

  revalidatePartnerPaths();
  return { success: true };
}

export async function togglePartnerCompanyAction(id: string, isActive: boolean): Promise<void> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) return;

  await prisma.partnerCompany.update({ where: { id }, data: { isActive } });
  revalidatePartnerPaths();
}

export async function deletePartnerCompanyAction(id: string): Promise<void> {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) return;

  await prisma.partnerCompany.delete({ where: { id } });
  revalidatePartnerPaths();
}

export async function getActivePartnerCompanies() {
  try {
    return await prisma.partnerCompany.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return [];
  }
}
