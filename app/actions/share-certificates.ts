"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminSection } from "@/lib/admin-permissions";
import { revalidatePath } from "next/cache";

type ActionState = { error?: string; success?: boolean; created?: number } | null;

async function requireAdmin() {
  const session = await requireAdminSection("shares");
  return session;
}

type PendingNumber = { number: number; priceSgd: number | null; code?: string | null };

// Admin saves a batch of individually-entered share numbers for a project,
// each with its own optional price override and optional word/code identifier.
export async function createShareNumbersAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const projectId = formData.get("projectId") as string;
  const numbersRaw = formData.get("numbers") as string;

  if (!projectId || !numbersRaw) return { error: "No share numbers provided." };

  let entries: PendingNumber[];
  try {
    const parsed = JSON.parse(numbersRaw);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
    entries = parsed.map((e: { number: number; priceSgd: number | null; code?: string | null }) => ({
      number: e.number,
      priceSgd: e.priceSgd ?? null,
      code: e.code ? String(e.code).trim() : null,
    }));
  } catch {
    return { error: "Invalid data." };
  }

  // Dedup within submitted list (last one wins)
  const unique = [...new Map(entries.map((e) => [e.number, e])).values()];

  // Check conflicts with already-existing numbers
  const existing = await prisma.shareCertificate.findMany({
    where: { projectId, shareNumber: { in: unique.map((e) => e.number) } },
    select: { shareNumber: true },
  });

  if (existing.length > 0) {
    const conflicts = existing.map((c) => `#${String(c.shareNumber).padStart(6, "0")}`).join(", ");
    return { error: `Already exist: ${conflicts}` };
  }

  await prisma.shareCertificate.createMany({
    data: unique.map((e) => ({
      projectId,
      shareNumber: e.number,
      priceSgd: e.priceSgd,
      code: e.code?.trim() || null,
    })),
  });

  revalidatePath(`/admin/shares/${projectId}`);
  return { success: true, created: unique.length };
}

// Admin updates the price override of one unassigned share number
export async function updateShareCertificatePriceAction(
  certificateId: string,
  projectId: string,
  priceSgd: number | null
) {
  await requireAdmin();

  const cert = await prisma.shareCertificate.findUnique({
    where: { id: certificateId },
    select: { ownerId: true },
  });

  if (!cert) return { error: "Not found." };
  if (cert.ownerId) return { error: "Cannot change the price of an assigned share number." };
  if (priceSgd !== null && (isNaN(priceSgd) || priceSgd <= 0)) return { error: "Enter a valid price." };

  await prisma.shareCertificate.update({
    where: { id: certificateId },
    data: { priceSgd },
  });

  revalidatePath(`/admin/shares/${projectId}`);
  return { success: true };
}

// Admin deletes one unassigned share number
export async function deleteShareNumberAction(certificateId: string, projectId: string) {
  await requireAdmin();

  const cert = await prisma.shareCertificate.findUnique({
    where: { id: certificateId },
    select: { ownerId: true },
  });

  if (!cert) return { error: "Not found." };
  if (cert.ownerId) return { error: "Cannot delete an assigned share number." };

  await prisma.shareCertificate.delete({ where: { id: certificateId } });
  revalidatePath(`/admin/shares/${projectId}`);
  return { success: true };
}

// Admin deletes ALL unassigned share numbers for a project
export async function deleteAllUnassignedAction(projectId: string) {
  await requireAdmin();

  await prisma.shareCertificate.deleteMany({
    where: { projectId, ownerId: null },
  });

  revalidatePath(`/admin/shares/${projectId}`);
  return { success: true };
}
