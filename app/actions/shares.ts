"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getReferredByAgentId } from "@/lib/commission";
import { getShareSgdRate, getShare4Amounts } from "@/lib/share-pricing";
import { effectiveShareCertPrice } from "@/lib/share-pricing-utils";
import { notifyAdmin } from "@/lib/notifications";
import { getLockedShareNumbers, getListingRemainingCount } from "@/lib/share-listings";

type ActionState = { error?: string; success?: boolean; message?: string } | null;

const purchaseSchema = z.object({
  projectId: z.string().min(1),
  shareNumbers: z.string().min(1, "Select at least one share number"),
});

export async function requestSharePurchaseAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parse = purchaseSchema.safeParse({
    projectId: formData.get("projectId"),
    shareNumbers: formData.get("shareNumbers"),
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { projectId, shareNumbers: shareNumbersRaw } = parse.data;

  let shareNumbers: number[];
  try {
    const parsed = JSON.parse(shareNumbersRaw);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
    shareNumbers = [...new Set(parsed.map((n) => Number(n)))];
    if (shareNumbers.some((n) => !Number.isInteger(n) || n <= 0)) throw new Error();
  } catch {
    return { error: "Select at least one share number." };
  }
  const quantity = shareNumbers.length;

  const project = await prisma.project.findUnique({
    where: { id: projectId, status: "ACTIVE" },
    select: { id: true, name: true, sharePriceSgd: true, availableShares: true },
  });

  if (!project) return { error: "Project not found or no longer active." };
  if (project.availableShares < quantity) {
    return { error: `Only ${project.availableShares} shares available.` };
  }

  const availableCerts = await prisma.shareCertificate.findMany({
    where: { projectId, shareNumber: { in: shareNumbers }, ownerId: null },
    select: { shareNumber: true, priceSgd: true },
  });
  if (availableCerts.length < shareNumbers.length) {
    const availableSet = new Set(availableCerts.map((c) => c.shareNumber));
    const unavailable = shareNumbers.filter((n) => !availableSet.has(n));
    return { error: `Share number${unavailable.length > 1 ? "s" : ""} ${unavailable.map((n) => `#${String(n).padStart(4, "0")}`).join(", ")} ${unavailable.length > 1 ? "are" : "is"} no longer available. Please refresh and pick again.` };
  }

  const projectSharePriceSgd = Number(project.sharePriceSgd);
  const totalAmount = availableCerts.reduce(
    (sum, c) => sum + effectiveShareCertPrice(c.priceSgd != null ? Number(c.priceSgd) : null, projectSharePriceSgd),
    0
  );

  const wallet = await prisma.wallet.findUnique({
    where: { userId: session.userId },
    select: { id: true, balance: true },
  });
  if (!wallet || Number(wallet.balance) < totalAmount) {
    return { error: `Insufficient wallet balance. Need ৳${totalAmount.toFixed(2)}. Please deposit funds to your wallet first.` };
  }

  const referredById = await getReferredByAgentId(session.userId);

  await prisma.sharePurchaseRequest.create({
    data: {
      buyerId: session.userId,
      projectId,
      quantity,
      requestedShareNumbers: shareNumbers,
      totalAmount,
      paymentMethod: "WALLET",
      status: "PENDING",
      referredById,
    },
  });

  await notifyAdmin({
    subject: `New share purchase request — ${project.name}`,
    heading: "New Share Purchase Request",
    lines: [
      { label: "Buyer", value: `${session.fullName} (${session.email})` },
      { label: "Project", value: project.name },
      { label: "Shares", value: `${quantity} (#${shareNumbers.map((n) => String(n).padStart(4, "0")).join(", #")})` },
      { label: "Total", value: `৳${totalAmount.toFixed(2)}` },
      { label: "Payment", value: "Platform Wallet" },
    ],
    actionPath: "/admin/purchases",
  });

  return {
    success: true,
    message: `Purchase request for ${quantity} share${quantity > 1 ? "s" : ""} submitted successfully. You will be notified once approved.`,
  };
}

// ── List shares for resale ────────────────────────────────────────────────────
const resellSchema = z.object({
  ownershipId: z.string().min(1),
  shareNumbers: z.string().min(1, "Select at least one share number"),
  askingPrice: z.coerce.number().positive("Enter a valid price"),
});

export async function createShareListingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parse = resellSchema.safeParse({
    ownershipId: formData.get("ownershipId"),
    shareNumbers: formData.get("shareNumbers"),
    askingPrice: formData.get("askingPrice"),
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { ownershipId, shareNumbers: shareNumbersRaw, askingPrice } = parse.data;

  let shareNumbers: number[];
  try {
    const parsed = JSON.parse(shareNumbersRaw);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
    shareNumbers = [...new Set(parsed.map((n) => Number(n)))];
    if (shareNumbers.some((n) => !Number.isInteger(n) || n <= 0)) throw new Error();
  } catch {
    return { error: "Select at least one share number." };
  }
  const quantity = shareNumbers.length;

  const ownership = await prisma.shareOwnership.findUnique({
    where: { id: ownershipId, ownerId: session.userId },
    select: { id: true, quantity: true, projectId: true, project: { select: { name: true } } },
  });

  if (!ownership) return { error: "Ownership not found." };

  const [ownedCerts, lockedNumbers] = await Promise.all([
    prisma.shareCertificate.findMany({
      where: { projectId: ownership.projectId, ownerId: session.userId, shareNumber: { in: shareNumbers } },
      select: { shareNumber: true },
    }),
    getLockedShareNumbers(session.userId, ownership.projectId),
  ]);

  const ownedSet = new Set(ownedCerts.map((c) => c.shareNumber));
  const notOwned = shareNumbers.filter((n) => !ownedSet.has(n));
  if (notOwned.length > 0) {
    return { error: `You don't own share number${notOwned.length > 1 ? "s" : ""} ${notOwned.map((n) => `#${String(n).padStart(6, "0")}`).join(", ")}.` };
  }

  const alreadyListed = shareNumbers.filter((n) => lockedNumbers.has(n));
  if (alreadyListed.length > 0) {
    return { error: `Share number${alreadyListed.length > 1 ? "s" : ""} ${alreadyListed.map((n) => `#${String(n).padStart(6, "0")}`).join(", ")} ${alreadyListed.length > 1 ? "are" : "is"} already listed for resale.` };
  }

  await prisma.shareListing.create({
    data: {
      sellerId: session.userId,
      projectId: ownership.projectId,
      quantity,
      listedShareNumbers: shareNumbers,
      askingPrice,
      status: "PENDING",
    },
  });

  await notifyAdmin({
    subject: `New resell listing — ${ownership.project.name}`,
    heading: "New Resell Listing",
    lines: [
      { label: "Seller", value: `${session.fullName} (${session.email})` },
      { label: "Project", value: ownership.project.name },
      { label: "Shares", value: `${quantity} (#${shareNumbers.map((n) => String(n).padStart(6, "0")).join(", #")})` },
      { label: "Asking Price", value: `৳${Number(askingPrice).toFixed(2)}/share` },
    ],
    actionPath: "/admin/shares",
  });

  return {
    success: true,
    message: `Resell listing for ${quantity} share${quantity > 1 ? "s" : ""} submitted. Admin will review and publish it.`,
  };
}

// ── Buy from secondary market ─────────────────────────────────────────────────
const tradeSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export async function requestShareTradeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parse = tradeSchema.safeParse({
    listingId: formData.get("listingId"),
    quantity: formData.get("quantity"),
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { listingId, quantity } = parse.data;

  const listing = await prisma.shareListing.findUnique({
    where: { id: listingId },
    select: {
      id: true, quantity: true, listedShareNumbers: true, askingPrice: true, sellerId: true, status: true,
      project: { select: { name: true } },
      trades: { where: { status: "APPROVED" }, select: { status: true, tradedShareNumbers: true } },
    },
  });

  if (!listing || listing.status !== "APPROVED") {
    return { error: "This listing is no longer available." };
  }
  if (listing.sellerId === session.userId) {
    return { error: "You cannot buy your own listing." };
  }
  const remaining = getListingRemainingCount(listing);
  if (quantity > remaining) {
    return { error: `Only ${remaining} share${remaining === 1 ? "" : "s"} available in this listing.` };
  }

  const totalAmount = quantity * Number(listing.askingPrice);

  await prisma.shareTrade.create({
    data: {
      listingId,
      buyerId: session.userId,
      quantity,
      totalAmount,
      paymentMethod: "WALLET",
      status: "PENDING",
    },
  });

  await notifyAdmin({
    subject: `New secondary market trade — ${listing.project.name}`,
    heading: "New Secondary Market Trade",
    lines: [
      { label: "Buyer", value: `${session.fullName} (${session.email})` },
      { label: "Project", value: listing.project.name },
      { label: "Quantity", value: String(quantity) },
      { label: "Total", value: `৳${totalAmount.toFixed(2)}` },
      { label: "Payment", value: "Platform Wallet" },
    ],
    actionPath: "/admin/shares",
  });

  return {
    success: true,
    message: `Trade request for ${quantity} share${quantity > 1 ? "s" : ""} submitted. Admin will process it shortly.`,
  };
}

// ── Submit a general buy request (not tied to a specific project) ────────────
const buyRequestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  shareNumber: z.string().min(1, "Share number is required"),
  size: z.enum(["SMALL", "BIG"]),
  price: z.coerce.number().positive("Enter a valid amount"),
  preferredDate: z.coerce.date({ message: "Enter a valid date" }),
});

export async function createShareBuyRequestAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const rawPrice = formData.get("priceBdt") ?? formData.get("price");
  const parse = buyRequestSchema.safeParse({
    name: formData.get("name"),
    shareNumber: formData.get("shareNumber"),
    size: formData.get("size"),
    price: rawPrice,
    preferredDate: formData.get("preferredDate"),
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { name, shareNumber, size, price: offeredBdt, preferredDate } = parse.data;

  // Validated against the admin-configured list, not a hardcoded one — admin
  // has full freedom to set whatever tiers they want (lib/share-pricing.ts).
  const allowedAmounts = await getShare4Amounts();
  if (!allowedAmounts.includes(offeredBdt)) {
    return { error: `Choose one of the available amounts: ${allowedAmounts.map((a) => `৳${a.toLocaleString()}`).join(", ")}.` };
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: session.userId },
    select: { balance: true },
  });

  if (!wallet || Number(wallet.balance) < offeredBdt) {
    return {
      error: `Insufficient platform wallet balance. You have ৳${Number(wallet?.balance ?? 0).toFixed(2)}, but this request requires at least ৳${offeredBdt.toFixed(2)}. Please deposit funds to your platform wallet first.`,
    };
  }

  const existingPending = await prisma.shareBuyRequest.findFirst({
    where: {
      buyerId: session.userId,
      shareNumber,
      status: "PENDING",
    },
  });
  if (existingPending) {
    return {
      error: `You already have a pending buy request for share #${shareNumber}. Please wait for admin review.`,
    };
  }

  const referredById = await getReferredByAgentId(session.userId);

  await prisma.shareBuyRequest.create({
    data: {
      buyerId: session.userId,
      name,
      shareNumber,
      size,
      price: offeredBdt,
      sgdRate: await getShareSgdRate(),
      preferredDate,
      referredById,
      status: "PENDING",
    },
  });

  await notifyAdmin({
    subject: `New share buy request — #${shareNumber}`,
    heading: "New Share Buy Request",
    lines: [
      { label: "Buyer", value: `${name} (${session.email})` },
      { label: "Share #", value: shareNumber },
      { label: "Size", value: size },
      { label: "Offered Price", value: `৳${offeredBdt.toFixed(2)}` },
      { label: "Preferred Date", value: preferredDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
    ],
    actionPath: "/admin/shares",
  });

  return {
    success: true,
    message: `Your request to buy share #${shareNumber} has been submitted. Admin will review it shortly.`,
  };
}
