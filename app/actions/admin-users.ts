"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "../../generated/prisma/enums";
import { Prisma } from "../../generated/prisma/client";
import { generateReferralCode } from "@/lib/commission";
import { notifyUser } from "@/lib/notifications";
import bcrypt from "bcryptjs";
import { z } from "zod";

type ActionState = { error?: string; success?: string } | null;

const ROLE_RANK: Record<string, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

async function requireAdminSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.role)) redirect("/dashboard");
  return session;
}

// Can the acting session manage the target role?
function canManage(actorRole: string, targetRole: string) {
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

// ── Create user (admin-initiated, skips OTP — admin vouches for the account) ──

const createUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string(),
});

export async function createUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdminSession();

  const parse = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  const { fullName, email, phone, password, role } = parse.data;
  const validRoles = Object.values(Role);
  if (!validRoles.includes(role as Role)) return { error: "Invalid role." };

  // Only allow creating accounts with a role strictly below the actor's own —
  // same rule as editing an existing user — so this form can't be used to
  // instantly create a peer or superior account.
  if (!canManage(session.role, role)) {
    return { error: "You don't have permission to create a user with that role." };
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "A user with this email already exists." };

  const makeAgent = formData.get("isAgent") === "on";
  const referralCode = makeAgent ? await generateReferralCode(fullName) : null;

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        role: role as Role,
        isVerified: true,
        isActive: true,
        isAgent: makeAgent,
        referralCode,
      },
    });
    await tx.wallet.create({ data: { userId: user.id } });
  });

  revalidatePath("/", "layout");
  return {
    success: makeAgent
      ? `Account created for ${fullName} as an agent — referral code ${referralCode}. Share the password with them directly.`
      : `Account created for ${fullName}. Share the password with them directly.`,
  };
}

// ── Edit user ─────────────────────────────────────────────────────────────────

const updateUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
});

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireAdminSession();
    const userId = formData.get("userId") as string;

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!target) return { error: "User not found." };
    if (target.id !== session.userId && !canManage(session.role, target.role)) {
      return { error: "You don't have permission to edit this user." };
    }

    const parse = updateUserSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
    });
    if (!parse.success) return { error: parse.error.issues[0].message };

    const { fullName, email, phone } = parse.data;

    const emailOwner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (emailOwner && emailOwner.id !== userId) return { error: "Another user already has this email." };

    await prisma.user.update({ where: { id: userId }, data: { fullName, email, phone } });
    revalidatePath("/", "layout");
    return { success: "User updated." };
  } catch (err: unknown) {
    console.error("Update user error:", err);
    return { error: err instanceof Error ? err.message : "Failed to update user." };
  }
}

// ── Delete user ───────────────────────────────────────────────────────────────

export async function deleteUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireAdminSession();
    const userId = formData.get("userId") as string;

    if (!userId) return { error: "User ID is required." };

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, fullName: true },
    });
    if (!target) return { error: "User not found." };
    if (target.id === session.userId) return { error: "You cannot delete your own account." };
    if (!canManage(session.role, target.role))
      return { error: "You don't have permission to delete this user." };

    // Prevent deleting the last SUPER_ADMIN
    if (target.role === "SUPER_ADMIN") {
      const count = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      if (count <= 1) return { error: "Cannot delete the last Super Admin." };
    }

    // Pick & Put bookings in PENDING/ACCEPTED hold the customer's money in
    // escrow — settle them (deliver or reject) before the user can go.
    const openPickPut = await prisma.pickPutBooking.count({
      where: {
        status: { in: ["PENDING", "ACCEPTED"] },
        OR: [{ customerId: userId }, { trip: { travelerId: userId } }],
      },
    });
    if (openPickPut > 0) {
      return { error: `This user has ${openPickPut} open Pick & Put booking(s) holding funds. Deliver or reject them first.` };
    }

    // Clean up all related user records in an atomic transaction. This touches
    // ~35 tables sequentially (Prisma interactive transactions can't run
    // concurrent queries on the same tx), which comfortably exceeds the
    // client's default 5000ms transaction timeout over a remote DB connection.
    await prisma.$transaction(async (tx) => {
      // 1. Disassociate agent and admin assignments
      await tx.user.updateMany({ where: { referredByAgentId: userId }, data: { referredByAgentId: null } });
      await tx.sharePurchaseRequest.updateMany({ where: { referredById: userId }, data: { referredById: null } });
      await tx.sharePurchaseRequest.updateMany({ where: { processedById: userId }, data: { processedById: null } });
      await tx.taxiRequest.updateMany({ where: { referredById: userId }, data: { referredById: null } });
      await tx.taxiRequest.updateMany({ where: { assignedManagerId: userId }, data: { assignedManagerId: null } });
      await tx.taxiRequest.updateMany({ where: { processedById: userId }, data: { processedById: null } });
      await tx.airTicketRequest.updateMany({ where: { referredById: userId }, data: { referredById: null } });
      await tx.airTicketRequest.updateMany({ where: { assignedManagerId: userId }, data: { assignedManagerId: null } });
      await tx.airTicketRequest.updateMany({ where: { processedById: userId }, data: { processedById: null } });
      await tx.serviceRequest.updateMany({ where: { referredById: userId }, data: { referredById: null } });
      await tx.checkout.updateMany({ where: { createdById: userId }, data: { createdById: session.userId } });
      await tx.checkout.updateMany({ where: { processedById: userId }, data: { processedById: null } });
      await tx.project.updateMany({ where: { createdById: userId }, data: { createdById: session.userId } });
      await tx.depositRequest.updateMany({ where: { processedById: userId }, data: { processedById: null } });
      await tx.withdrawalRequest.updateMany({ where: { processedById: userId }, data: { processedById: null } });
      await tx.shareBuyRequest.updateMany({ where: { processedById: userId }, data: { processedById: null } });
      await tx.shareTrade.updateMany({ where: { processedById: userId }, data: { processedById: null } });

      // 2. Clear checkout items tied to user requests or checkouts
      await tx.checkoutItem.deleteMany({
        where: {
          OR: [
            { checkout: { userId } },
            { taxiRequest: { userId } },
            { airTicketRequest: { userId } },
            { serviceRequest: { userId } },
          ],
        },
      });

      // 3. Delete user-specific activity records
      await tx.reminder.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.otpToken.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });
      await tx.forumReply.deleteMany({ where: { userId } });
      await tx.forumTopic.deleteMany({ where: { userId } });
      await tx.lostFoundPost.deleteMany({ where: { userId } });
      await tx.applyApplication.deleteMany({ where: { userId } });
      await tx.serviceRequest.deleteMany({ where: { userId } });
      await tx.airTicketRequest.deleteMany({ where: { userId } });
      await tx.taxiRequest.deleteMany({ where: { userId } });
      await tx.checkout.deleteMany({ where: { userId } });
      await tx.depositRequest.deleteMany({ where: { userId } });
      await tx.withdrawalRequest.deleteMany({ where: { userId } });
      await tx.shareBuyRequest.deleteMany({ where: { buyerId: userId } });
      await tx.shareTrade.deleteMany({ where: { OR: [{ buyerId: userId }, { listing: { sellerId: userId } }] } });
      await tx.shareListing.deleteMany({ where: { sellerId: userId } });
      await tx.shareOwnership.deleteMany({ where: { ownerId: userId } });
      await tx.shareCertificate.updateMany({ where: { ownerId: userId }, data: { ownerId: null, issuedAt: null } });
      await tx.sharePurchaseRequest.deleteMany({ where: { buyerId: userId } });
      await tx.pickPutBooking.deleteMany({ where: { OR: [{ customerId: userId }, { trip: { travelerId: userId } }] } });
      await tx.pickPutTrip.deleteMany({ where: { travelerId: userId } });
      await tx.walletTransfer.deleteMany({ where: { OR: [{ senderId: userId }, { recipientId: userId }] } });
      await tx.walletTransaction.deleteMany({ where: { wallet: { userId } } });
      await tx.wallet.deleteMany({ where: { userId } });
      await tx.blog.deleteMany({ where: { authorId: userId } });
      await tx.islamicArticle.deleteMany({ where: { authorId: userId } });
      await tx.pdfDocument.deleteMany({ where: { authorId: userId } });

      // 4. Delete the user
      await tx.user.delete({ where: { id: userId } });
    }, { timeout: 20000 });

    revalidatePath("/", "layout");
    revalidatePath("/admin/users");
    return { success: `User "${target.fullName}" was successfully deleted.` };
  } catch (err: unknown) {
    console.error("Delete user error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to delete user. Please try again.",
    };
  }
}

// ── Toggle active / ban ───────────────────────────────────────────────────────

export async function toggleUserActiveAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireAdminSession();
    const userId = formData.get("userId") as string;
    const currentlyActive = formData.get("isActive") === "true";

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) return { error: "User not found." };
    if (target.id === session.userId) return { error: "You cannot ban your own account." };
    if (!canManage(session.role, target.role))
      return { error: "You don't have permission to manage this user." };

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: !currentlyActive },
    });
    revalidatePath("/", "layout");
    return { success: currentlyActive ? "User banned." : "User activated." };
  } catch (err: unknown) {
    console.error("Toggle user active error:", err);
    return { error: err instanceof Error ? err.message : "Failed to update user status." };
  }
}

// ── Verify user manually ──────────────────────────────────────────────────────

export async function verifyUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireAdminSession();
    const userId = formData.get("userId") as string;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isVerified: true },
    });
    if (!target) return { error: "User not found." };
    if (target.isVerified) return { error: "User is already verified." };
    if (!canManage(session.role, target.role))
      return { error: "You don't have permission to verify this user." };

    await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
    revalidatePath("/", "layout");
    return { success: "User verified." };
  } catch (err: unknown) {
    console.error("Verify user error:", err);
    return { error: err instanceof Error ? err.message : "Failed to verify user." };
  }
}

// ── Change role (SUPER_ADMIN only) ────────────────────────────────────────────

export async function changeUserRoleAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireAdminSession();

    if (session.role !== "SUPER_ADMIN")
      return { error: "Only Super Admins can change roles." };

    const userId = formData.get("userId") as string;
    const newRole = formData.get("role") as string;
    const validRoles = Object.values(Role);
    if (!validRoles.includes(newRole as Role)) return { error: "Invalid role." };

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) return { error: "User not found." };
    if (target.id === session.userId) return { error: "You cannot change your own role." };

    // Prevent stripping last SUPER_ADMIN
    if (target.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN") {
      const count = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      if (count <= 1) return { error: "Cannot demote the last Super Admin." };
    }

    await prisma.user.update({ where: { id: userId }, data: { role: newRole as Role } });
    revalidatePath("/", "layout");
    return { success: `Role changed to ${newRole.replace("_", " ")}.` };
  } catch (err: unknown) {
    console.error("Change role error:", err);
    return { error: err instanceof Error ? err.message : "Failed to change user role." };
  }
}

// ── Toggle agent status (referral commission) ────────────────────────────────

export async function toggleAgentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireAdminSession();
    const userId = formData.get("userId") as string;
    const currentlyAgent = formData.get("isAgent") === "true";

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, fullName: true, referralCode: true },
    });
    if (!target) return { error: "User not found." };
    if (!canManage(session.role, target.role))
      return { error: "You don't have permission to manage this user." };

    if (!currentlyAgent) {
      const referralCode = target.referralCode ?? (await generateReferralCode(target.fullName));
      await prisma.user.update({ where: { id: userId }, data: { isAgent: true, referralCode } });
      revalidatePath("/", "layout");
      return { success: `${target.fullName} is now an agent — code ${referralCode}.` };
    }

    await prisma.user.update({ where: { id: userId }, data: { isAgent: false } });
    revalidatePath("/", "layout");
    return { success: "Agent status removed." };
  } catch (err: unknown) {
    console.error("Toggle agent error:", err);
    return { error: err instanceof Error ? err.message : "Failed to toggle agent status." };
  }
}

// ── Manual wallet adjustment (correction, bonus, refund outside a request) ───

const adjustWalletSchema = z.object({
  userId: z.string().min(1),
  direction: z.enum(["CREDIT", "DEBIT"]),
  amount: z.coerce.number().positive("Enter a valid amount"),
  reason: z.string().min(3, "Explain the reason for this adjustment"),
});

export async function adjustWalletAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdminSession();

  const parse = adjustWalletSchema.safeParse({
    userId: formData.get("userId"),
    direction: formData.get("direction"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  const { userId, direction, amount, reason } = parse.data;

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, fullName: true, email: true, phone: true } });
  if (!target) return { error: "User not found." };
  if (!canManage(session.role, target.role)) return { error: "You don't have permission to manage this user." };

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return { error: "This user has no wallet yet." };

  const balanceBefore = Number(wallet.balance);
  if (direction === "DEBIT" && amount > balanceBefore) {
    return { error: `Cannot debit ৳${amount.toFixed(2)} — wallet only has ৳${balanceBefore.toFixed(2)}.` };
  }
  const balanceAfter = direction === "CREDIT" ? balanceBefore + amount : balanceBefore - amount;

  await prisma.$transaction([
    prisma.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: direction === "CREDIT" ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
        amount,
        description: reason,
        balanceBefore,
        balanceAfter,
      },
    }),
    prisma.notification.create({
      data: {
        userId,
        title: direction === "CREDIT" ? "Wallet credited by admin" : "Wallet debited by admin",
        message: `Your wallet was ${direction === "CREDIT" ? "credited" : "debited"} ৳${amount.toFixed(2)} — ${reason}.`,
        type: "WALLET",
      },
    }),
  ]);

  await notifyUser({
    to: target.email,
    phone: target.phone,
    subject: direction === "CREDIT" ? "Wallet credited by admin" : "Wallet debited by admin",
    heading: direction === "CREDIT" ? "Wallet Credited" : "Wallet Debited",
    message: `Your wallet was ${direction === "CREDIT" ? "credited" : "debited"} ৳${amount.toFixed(2)} — ${reason}.`,
  });

  revalidatePath("/admin/users");
  return { success: `${direction === "CREDIT" ? "Credited" : "Debited"} ৳${amount.toFixed(2)} ${direction === "CREDIT" ? "to" : "from"} ${target.fullName}'s wallet.` };
}
