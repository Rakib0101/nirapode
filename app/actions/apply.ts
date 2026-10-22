"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyAdmin, notifyUser } from "@/lib/notifications";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

async function requireAdmin() {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) throw new Error("Unauthorized");
  return session;
}

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

type State = { error?: string; success?: boolean } | null;

// ── Admin: Manage Services ────────────────────────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  sortOrder: z.coerce.number().default(0),
});

export async function createServiceAction(_prev: State, formData: FormData): Promise<State> {
  await requireAdmin();
  const parse = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parse.success) return { error: parse.error.issues[0].message };
  await prisma.applyService.create({ data: parse.data });
  revalidatePath("/admin/apply");
  revalidatePath("/apply");
  return { success: true };
}

export async function updateServiceAction(_prev: State, formData: FormData): Promise<State> {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing service ID" };
  const parse = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parse.success) return { error: parse.error.issues[0].message };
  await prisma.applyService.update({ where: { id }, data: parse.data });
  revalidatePath("/admin/apply");
  revalidatePath("/apply");
  return { success: true };
}

export async function toggleServiceAction(id: string): Promise<void> {
  await requireAdmin();
  const s = await prisma.applyService.findUnique({ where: { id }, select: { isActive: true } });
  if (!s) return;
  await prisma.applyService.update({ where: { id }, data: { isActive: !s.isActive } });
  revalidatePath("/admin/apply");
  revalidatePath("/apply");
}

export async function deleteServiceAction(id: string): Promise<State> {
  await requireAdmin();

  const [applicationCount, requestCount] = await Promise.all([
    prisma.applyApplication.count({ where: { serviceId: id } }),
    prisma.serviceRequest.count({ where: { serviceId: id } }),
  ]);

  const total = applicationCount + requestCount;
  if (total > 0) {
    return {
      error: `Cannot delete — ${total} application(s)/request(s) already reference this service. Consider deactivating it instead.`,
    };
  }

  await prisma.applyService.delete({ where: { id } });
  revalidatePath("/admin/apply");
  revalidatePath("/apply");
  return { success: true };
}

// ── Admin: Update application status ─────────────────────────────────────────

export async function updateApplicationStatusAction(
  id: string,
  status: string,
  adminNote?: string
): Promise<void> {
  const session = await requireAdmin();

  await prisma.applyApplication.update({
    where: { id },
    data: { status: status as never, adminNote: adminNote ?? null },
  });

  // Notify user when completed or rejected
  if (status === "COMPLETED" || status === "REJECTED") {
    const app = await prisma.applyApplication.findUnique({
      where: { id },
      select: { userId: true, service: { select: { name: true } }, user: { select: { email: true, phone: true } } },
    });
    if (app) {
      const message =
        status === "COMPLETED"
          ? `Your application for "${app.service.name}" has been completed. Please check your email or contact admin for next steps.`
          : `Your application for "${app.service.name}" was not accepted. Reason: ${adminNote ?? "No reason provided."}`;

      await prisma.notification.create({
        data: {
          userId: app.userId,
          title: status === "COMPLETED" ? "Application Completed" : "Application Rejected",
          message,
          type: "SYSTEM",
        },
      });

      await notifyUser({
        to: app.user.email,
        phone: app.user.phone,
        subject: status === "COMPLETED" ? "Application completed" : "Application rejected",
        heading: status === "COMPLETED" ? "Application Completed" : "Application Rejected",
        message,
      });
    }
  }

  revalidatePath("/admin/apply");
  revalidatePath("/apply/my");
}

// ── User: Submit application ──────────────────────────────────────────────────

function isValidBase64File(value: unknown): boolean {
  if (typeof value !== "string" || !value) return true; // optional fields
  return value.startsWith("data:") && value.length < 6 * 1024 * 1024; // ~4.5MB decoded
}

export async function submitApplicationAction(_prev: State, formData: FormData): Promise<State> {
  const session = await requireSession();

  const serviceId = formData.get("serviceId") as string;
  if (!serviceId) return { error: "Service is required." };

  const service = await prisma.applyService.findUnique({ where: { id: serviceId, isActive: true } });
  if (!service) return { error: "Service not found." };

  // Check for duplicate pending application
  const existing = await prisma.applyApplication.findFirst({
    where: { userId: session.userId, serviceId, status: { in: ["PENDING", "IN_PROGRESS"] } },
  });
  if (existing) return { error: "You already have a pending application for this service." };

  const fields = ["resumeUrl", "ePassportUrl", "permitUrl", "oldPassportUrl", "otherFileUrl"] as const;
  const files: Record<string, string | null> = {};

  for (const field of fields) {
    const val = formData.get(field) as string | null;
    if (val && val.startsWith("data:")) {
      if (!isValidBase64File(val)) return { error: `File too large (max ~4MB each).` };
      files[field] = val;
    } else {
      files[field] = null;
    }
  }

  if (!files.resumeUrl && !files.ePassportUrl) {
    return { error: "Please upload at least your Resume or ePassport." };
  }

  await prisma.applyApplication.create({
    data: {
      userId: session.userId,
      serviceId,
      resumeUrl: files.resumeUrl,
      ePassportUrl: files.ePassportUrl,
      permitUrl: files.permitUrl,
      oldPassportUrl: files.oldPassportUrl,
      otherFileUrl: files.otherFileUrl,
    },
  });

  await notifyAdmin({
    subject: `New application — ${service.name}`,
    heading: "New Service Application",
    lines: [
      { label: "Applicant", value: `${session.fullName} (${session.email})` },
      { label: "Service", value: service.name },
    ],
    actionPath: "/admin/apply",
  });

  revalidatePath("/apply/my");
  return { success: true };
}
