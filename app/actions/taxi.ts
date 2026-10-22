"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getReferredByAgentId } from "@/lib/commission";
import { notifyAdmin, notifyUser } from "@/lib/notifications";

type ActionState = { error?: string; success?: boolean; message?: string } | null;
type TaxiStatus = "PENDING" | "ASSIGNED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(session.role)) redirect("/dashboard");
  return session;
}

const taxiSchema = z.object({
  pickupLocation: z.string().min(3, "Enter pickup location"),
  destination: z.string().min(3, "Enter destination"),
  date: z.string().min(1, "Select a date"),
  passengerCount: z.coerce.number().int().min(1).max(10),
  vehicleType: z.enum(["Noah", "Private Car", "Hiace"]),
  notes: z.string().optional(),
});

export async function requestTaxiAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parse = taxiSchema.safeParse({
    pickupLocation: formData.get("pickupLocation"),
    destination: formData.get("destination"),
    date: formData.get("date"),
    passengerCount: formData.get("passengerCount"),
    vehicleType: formData.get("vehicleType"),
    notes: formData.get("notes") || undefined,
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { pickupLocation, destination, date, passengerCount, vehicleType, notes } = parse.data;

  const referredById = await getReferredByAgentId(session.userId);

  await prisma.taxiRequest.create({
    data: {
      userId: session.userId,
      pickupLocation,
      destination,
      date: new Date(date),
      passengerCount,
      vehicleType,
      notes: notes ?? null,
      referredById,
    },
  });

  await prisma.notification.create({
    data: {
      userId: session.userId,
      title: "Taxi booking requested",
      message: `Your taxi request from ${pickupLocation} to ${destination} (${vehicleType}) has been submitted. We'll contact you within 1 hour to confirm.`,
      type: "SYSTEM",
    },
  });

  await notifyAdmin({
    subject: `New taxi request — ${pickupLocation} → ${destination}`,
    heading: "New Taxi Request",
    lines: [
      { label: "Requested by", value: `${session.fullName} (${session.email})` },
      { label: "Pickup", value: pickupLocation },
      { label: "Destination", value: destination },
      { label: "Date", value: new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
      { label: "Vehicle Type", value: vehicleType },
      { label: "Passengers", value: String(passengerCount) },
    ],
    actionPath: "/admin/taxi",
  });

  revalidatePath("/taxi/my");
  revalidatePath("/dashboard");
  return { success: true, message: "Taxi request submitted! We'll contact you within 1 hour to confirm." };
}

// ─── Admin: staff list for "assign to manager" ────────────────────────────────

export async function getTaxiStaff() {
  await requireAdmin();
  return prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] } },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });
}

// ─── Admin: assign a vendor or internal manager + set price ──────────────────

export async function assignTaxiRequestAction(
  requestId: string,
  data: {
    assignedVendorId?: string;
    assignedManagerId?: string;
    price: number;
    adminNote?: string;
  }
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  const hasVendor = !!data.assignedVendorId;
  const hasManager = !!data.assignedManagerId;
  if (hasVendor === hasManager) {
    return { error: "Assign to exactly one of vendor or manager." };
  }

  const request = await prisma.taxiRequest.findUnique({ where: { id: requestId } });
  if (!request) return { error: "Request not found." };

  await prisma.taxiRequest.update({
    where: { id: requestId },
    data: {
      price: data.price,
      assignedVendorId: hasVendor ? data.assignedVendorId : null,
      assignedManagerId: hasManager ? data.assignedManagerId : null,
      adminNote: data.adminNote || null,
      processedById: session.userId,
      processedAt: new Date(),
      status: request.status === "PENDING" ? "ASSIGNED" : request.status,
    },
  });

  const assigneeName = hasVendor
    ? (await prisma.taxiVendor.findUnique({ where: { id: data.assignedVendorId } }))?.name
    : (await prisma.user.findUnique({ where: { id: data.assignedManagerId } }))?.fullName;

  await prisma.notification.create({
    data: {
      userId: request.userId,
      title: "Taxi request assigned",
      message: `Your taxi request from ${request.pickupLocation} to ${request.destination} has been assigned to ${assigneeName ?? "our team"}. Price: ৳${Number(data.price).toFixed(2)}.`,
      type: "SYSTEM",
    },
  });

  revalidatePath("/admin/taxi");
  revalidatePath("/taxi/my");
  return {};
}

// ─── Admin: update request status ─────────────────────────────────────────────

export async function updateTaxiStatusAction(
  id: string,
  status: TaxiStatus,
  adminNote?: string,
  farePrice?: number
): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();

  const existing = await prisma.taxiRequest.findUnique({
    where: { id },
    include: { user: { select: { email: true, phone: true } } },
  });
  if (!existing) return { error: "Request not found." };

  const effectiveFare = farePrice !== undefined ? farePrice : (existing.price ? Number(existing.price) : 0);

  // Deduct fare from customer's platform balance upon confirmation if price is set and not already confirmed
  if (status === "CONFIRMED" && existing.status !== "CONFIRMED" && effectiveFare > 0) {
    const userWallet = await prisma.wallet.findUnique({ where: { userId: existing.userId } });
    if (!userWallet || Number(userWallet.balance) < effectiveFare) {
      return {
        error: `Customer has insufficient platform wallet balance (৳${Number(userWallet?.balance ?? 0).toFixed(2)}) for this fare of ৳${effectiveFare.toFixed(2)}.`,
      };
    }
    const newBal = Number(userWallet.balance) - effectiveFare;
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: userWallet.id },
        data: { balance: newBal },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: userWallet.id,
          type: "CHECKOUT_PAYMENT",
          amount: effectiveFare,
          description: `Taxi fare deduction: ${existing.pickupLocation} → ${existing.destination}`,
          balanceBefore: userWallet.balance,
          balanceAfter: newBal,
        },
      }),
    ]);
  }

  const dataToUpdate: any = { status, adminNote: adminNote || null };
  if (farePrice !== undefined) {
    dataToUpdate.price = farePrice;
  }

  const request = await prisma.taxiRequest.update({
    where: { id },
    data: dataToUpdate,
  });

  const STATUS_MESSAGES: Partial<Record<TaxiStatus, string>> = {
    CONFIRMED: `Your taxi booking has been confirmed! Fare: ৳${effectiveFare.toFixed(2)}.`,
    COMPLETED: "Your taxi trip is marked as completed. Thanks for riding with us!",
    CANCELLED: "Your taxi request has been cancelled.",
  };

  if (STATUS_MESSAGES[status]) {
    await prisma.notification.create({
      data: {
        userId: request.userId,
        title: "Taxi request update",
        message: STATUS_MESSAGES[status]!,
        type: "SYSTEM",
      },
    });

    await notifyUser({
      to: existing.user.email,
      phone: existing.user.phone,
      subject: "Taxi request update",
      heading: "Taxi Request Update",
      message: STATUS_MESSAGES[status]!,
    });
  }

  revalidatePath("/admin/taxi");
  revalidatePath("/taxi/my");
  revalidatePath("/dashboard");
  revalidatePath("/wallet");
  return { success: true };
}

// ─── Admin: vendor roster ──────────────────────────────────────────────────────

const vendorSchema = z.object({
  name: z.string().min(2, "Enter vendor name"),
  phone: z.string().min(6, "Enter a valid phone number"),
  vehicleType: z.string().optional(),
});

export async function createTaxiVendorAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parse = vendorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    vehicleType: formData.get("vehicleType") || undefined,
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { name, phone, vehicleType } = parse.data;

  await prisma.taxiVendor.create({
    data: { name, phone, vehicleType: vehicleType ?? null },
  });

  revalidatePath("/admin/taxi/vendors");
  return { success: true };
}

export async function toggleTaxiVendorActiveAction(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.taxiVendor.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/taxi/vendors");
  revalidatePath("/admin/taxi");
}

export async function updateTaxiVendorAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const vendorId = formData.get("vendorId") as string;
  if (!vendorId) return { error: "Missing vendor ID." };

  const parse = vendorSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    vehicleType: formData.get("vehicleType") || undefined,
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { name, phone, vehicleType } = parse.data;

  await prisma.taxiVendor.update({
    where: { id: vendorId },
    data: { name, phone, vehicleType: vehicleType ?? null },
  });

  revalidatePath("/admin/taxi/vendors");
  return { success: true };
}

export async function deleteTaxiVendorAction(id: string): Promise<ActionState> {
  await requireAdmin();

  const assignedCount = await prisma.taxiRequest.count({ where: { assignedVendorId: id } });
  if (assignedCount > 0) {
    return {
      error: `Cannot delete — ${assignedCount} taxi request(s) are assigned to this vendor. Deactivate it instead.`,
    };
  }

  await prisma.taxiVendor.delete({ where: { id } });
  revalidatePath("/admin/taxi/vendors");
  revalidatePath("/admin/taxi");
  return { success: true };
}
