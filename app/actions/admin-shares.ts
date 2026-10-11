"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { creditCommission } from "@/lib/commission";
import { notifyUser } from "@/lib/notifications";

type ActionState = { error?: string; success?: boolean; shareNumbersCreated?: number } | null;

// ShareOwnership.purchasePrice is the average BDT actually paid per share.
// It's locked at purchase time and only moves when the owner buys more —
// admin changing a project's current price never touches it.
function averagePurchasePrice(
  existing: { quantity: number; purchasePrice: unknown } | null,
  addedQty: number,
  addedTotal: number
): number {
  const prevQty = existing ? existing.quantity : 0;
  const prevTotal = existing ? Number(existing.purchasePrice) * prevQty : 0;
  const qty = prevQty + addedQty;
  return qty > 0 ? Math.round(((prevTotal + addedTotal) / qty) * 100) / 100 : 0;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.role)) redirect("/dashboard");
  return session;
}

// ── Approve / reject purchase request ────────────────────────────────────────

export async function processPurchaseAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();

  const requestId = formData.get("requestId") as string;
  const decision = formData.get("decision") as "APPROVED" | "REJECTED";
  const adminNote = formData.get("adminNote") as string | null;

  const request = await prisma.sharePurchaseRequest.findUnique({
    where: { id: requestId, status: "PENDING" },
    include: { project: true, buyer: { select: { email: true, fullName: true } } },
  });

  if (!request) return { error: "Request not found or already processed." };

  if (decision === "APPROVED") {
    if (request.project.availableShares < request.quantity) {
      return { error: `Only ${request.project.availableShares} shares left.` };
    }

    try {
    await prisma.$transaction(async (tx) => {
      // Debit buyer's wallet if they chose to pay from it
      if (request.paymentMethod === "WALLET") {
        const wallet = await tx.wallet.findUnique({ where: { userId: request.buyerId } });
        if (!wallet) throw new Error("Buyer's wallet not found");
        if (Number(wallet.balance) < Number(request.totalAmount)) {
          throw new Error(`Buyer's wallet balance (৳${Number(wallet.balance).toFixed(2)}) is insufficient for this purchase.`);
        }

        const newBalance = Number(wallet.balance) - Number(request.totalAmount);
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "SHARE_PURCHASE",
            amount: request.totalAmount,
            description: `Purchase of ${request.quantity} shares in ${request.project.name}`,
            balanceBefore: wallet.balance,
            balanceAfter: newBalance,
          },
        });
      }

      // Update request status
      await tx.sharePurchaseRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", adminNote, processedById: session.userId, processedAt: new Date() },
      });

      // Decrement available shares
      await tx.project.update({
        where: { id: request.projectId },
        data: { availableShares: { decrement: request.quantity } },
      });

      // Upsert ownership
      const existing = await tx.shareOwnership.findUnique({
        where: { projectId_ownerId: { projectId: request.projectId, ownerId: request.buyerId } },
      });

      if (existing) {
        await tx.shareOwnership.update({
          where: { projectId_ownerId: { projectId: request.projectId, ownerId: request.buyerId } },
          data: {
            quantity: { increment: request.quantity },
            purchasePrice: averagePurchasePrice(existing, request.quantity, Number(request.totalAmount)),
          },
        });
      } else {
        await tx.shareOwnership.create({
          data: {
            projectId: request.projectId,
            ownerId: request.buyerId,
            quantity: request.quantity,
            purchasePrice: averagePurchasePrice(null, request.quantity, Number(request.totalAmount)),
          },
        });
      }

      // Assign the buyer's specifically requested share numbers — falling
      // back to auto-picking any available numbers for legacy requests
      // created before buyers could pick specific numbers.
      const requestedNumbers = request.requestedShareNumbers;
      const availableCerts = requestedNumbers.length > 0
        ? await tx.shareCertificate.findMany({
            where: { projectId: request.projectId, shareNumber: { in: requestedNumbers }, ownerId: null },
            select: { id: true },
          })
        : await tx.shareCertificate.findMany({
            where: { projectId: request.projectId, ownerId: null },
            orderBy: { shareNumber: "asc" },
            take: request.quantity,
            select: { id: true },
          });
      if (availableCerts.length < request.quantity) {
        throw new Error(
          requestedNumbers.length > 0
            ? `Some of the requested share numbers are no longer available (${availableCerts.length}/${request.quantity} still free). Ask the buyer to resubmit with different numbers.`
            : `Not enough unassigned share numbers. Available: ${availableCerts.length}, needed: ${request.quantity}. Please create share numbers for this project first.`
        );
      }
      await tx.shareCertificate.updateMany({
        where: { id: { in: availableCerts.map((c) => c.id) } },
        data: { ownerId: request.buyerId, issuedAt: new Date() },
      });

      // Referral commission, if this purchase was referred by an agent
      await creditCommission(tx, {
        referredById: request.referredById,
        amount: Number(request.totalAmount),
        description: `Share purchase — ${request.project.name}`,
        module: "SHARE",
      });

      // Notify buyer
      await tx.notification.create({
        data: {
          userId: request.buyerId,
          title: "Share purchase approved",
          message: `Your purchase of ${request.quantity} shares in ${request.project.name} has been approved.`,
          type: "PURCHASE",
        },
      });
    });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed.";
      return { error: msg };
    }

    await notifyUser({
      to: request.buyer.email,
      subject: `Your share purchase is confirmed — ${request.project.name}`,
      heading: "Purchase Approved",
      message: `Hi ${request.buyer.fullName}, your purchase of ${request.quantity} share${request.quantity > 1 ? "s" : ""} in ${request.project.name} has been approved and added to your account.`,
      lines: [
        { label: "Project", value: request.project.name },
        { label: "Shares", value: String(request.quantity) },
        { label: "Total Paid", value: `৳${Number(request.totalAmount).toFixed(2)}` },
      ],
    });
  } else {
    await prisma.sharePurchaseRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", adminNote, processedById: session.userId, processedAt: new Date() },
    });

    await prisma.notification.create({
      data: {
        userId: request.buyerId,
        title: "Share purchase rejected",
        message: `Your purchase request for ${request.project.name} was rejected.${adminNote ? ` Reason: ${adminNote}` : ""}`,
        type: "PURCHASE",
      },
    });
  }

  revalidatePath("/admin/purchases");
  return { success: true };
}

// ── Create project ────────────────────────────────────────────────────────────

const projectSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  totalShares: z.coerce.number().int().min(1),
  sharePriceSgd: z.coerce.number().min(0.01),
});

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();

  const parse = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    totalShares: formData.get("totalShares"),
    sharePriceSgd: formData.get("sharePriceSgd"),
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { name, description, totalShares, sharePriceSgd } = parse.data;
  const imageUrl = (formData.get("imageUrl") as string) || null;

  const numbersRaw = formData.get("shareNumbers") as string;
  let shareNumbers: { number: number; priceSgd: number | null; code?: string | null }[] = [];
  try {
    const parsed = JSON.parse(numbersRaw || "[]");
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(
        (e: unknown): e is { number: number; priceSgd: number | null; code?: string | null } =>
          typeof e === "object" && e !== null && typeof (e as { number: unknown }).number === "number" && (e as { number: number }).number > 0
      );
      shareNumbers = [...new Map(valid.map((e) => [e.number, { number: e.number, priceSgd: e.priceSgd ?? null, code: e.code ?? null }])).values()];
    }
  } catch { /* ignore — no numbers provided */ }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      imageUrl: imageUrl || undefined,
      totalShares,
      sharePriceSgd,
      availableShares: totalShares,
      createdById: session.userId,
    },
  });

  if (shareNumbers.length > 0) {
    await prisma.shareCertificate.createMany({
      data: shareNumbers.map((e) => ({
        projectId: project.id,
        shareNumber: e.number,
        priceSgd: e.priceSgd,
        code: e.code ? String(e.code).trim() : null,
      })),
    });
  }

  revalidatePath("/admin/shares");
  return { success: true, shareNumbersCreated: shareNumbers.length };
}

// ── Edit project ──────────────────────────────────────────────────────────────

const editProjectSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  sharePriceSgd: z.coerce.number().min(0.01),
  status: z.enum(["ACTIVE", "INACTIVE", "COMPLETED"]),
});

export async function updateProjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parse = editProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    description: formData.get("description"),
    sharePriceSgd: formData.get("sharePriceSgd"),
    status: formData.get("status"),
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { projectId, name, description, sharePriceSgd, status } = parse.data;
  const imageUrl = formData.get("imageUrl") as string | null;

  const existing = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!existing) return { error: "Project not found." };

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      description,
      sharePriceSgd,
      status,
      ...(imageUrl ? { imageUrl } : {}),
    },
  });

  revalidatePath("/admin/shares");
  revalidatePath(`/admin/shares/${projectId}`);
  revalidatePath("/shares");
  revalidatePath(`/shares/${projectId}`);
  return { success: true };
}

// ── Delete project (only when it has zero real activity) ─────────────────────

export async function deleteProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const projectId = formData.get("projectId") as string;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      _count: { select: { shares: true, purchaseRequests: true, listings: true } },
    },
  });
  if (!project) return { error: "Project not found." };

  if (project._count.shares > 0) {
    return { error: `Cannot delete — ${project.name} already has shareholders.` };
  }
  if (project._count.purchaseRequests > 0) {
    return { error: `Cannot delete — ${project.name} has purchase request history.` };
  }
  if (project._count.listings > 0) {
    return { error: `Cannot delete — ${project.name} has resale listings.` };
  }

  // Safe to delete — any share numbers created for this project are still
  // unassigned (guaranteed by the checks above), so clear them first since
  // ShareCertificate has no cascade-delete on its project relation.
  await prisma.$transaction([
    prisma.shareCertificate.deleteMany({ where: { projectId } }),
    prisma.project.delete({ where: { id: projectId } }),
  ]);

  revalidatePath("/admin/shares");
  revalidatePath("/shares");
  return { success: true };
}

// ── Approve / reject resell listing or trade ──────────────────────────────────

export async function processResellAction({
  listingId,
  tradeId,
  buyRequestId,
  type,
  status,
  ticketFileUrl,
  adminNote,
}: {
  listingId?: string;
  tradeId?: string;
  buyRequestId?: string;
  type: "listing" | "trade" | "buyRequest";
  status: "APPROVED" | "REJECTED";
  ticketFileUrl?: string;
  adminNote?: string;
}) {
  const session = await requireAdmin();

  if (type === "buyRequest" && buyRequestId) {
    const existingReq = await prisma.shareBuyRequest.findUnique({
      where: { id: buyRequestId },
    });
    if (!existingReq) return { error: "Buy request not found." };

    if (status === "APPROVED") {
      const priceBdt = Number(existingReq.price);
      const buyerWallet = await prisma.wallet.findUnique({
        where: { userId: existingReq.buyerId },
      });

      if (!buyerWallet || Number(buyerWallet.balance) < priceBdt) {
        return {
          error: `Buyer has insufficient platform wallet balance (৳${Number(buyerWallet?.balance ?? 0).toFixed(2)}) for this purchase of ৳${priceBdt.toFixed(2)}.`,
        };
      }

      await prisma.$transaction(async (tx) => {
        const newBalance = Number(buyerWallet.balance) - priceBdt;

        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { balance: newBalance },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: buyerWallet.id,
            type: "SHARE_PURCHASE",
            amount: priceBdt,
            description: `Payment for Share #${existingReq.shareNumber} (${existingReq.size}) buy request`,
            balanceBefore: buyerWallet.balance,
            balanceAfter: newBalance,
          },
        });

        const finalNote = ticketFileUrl
          ? JSON.stringify({ fileUrl: ticketFileUrl, note: adminNote?.trim() || null })
          : adminNote?.trim() || null;

        await tx.shareBuyRequest.update({
          where: { id: buyRequestId },
          data: { status: "APPROVED", adminNote: finalNote, processedById: session.userId, processedAt: new Date() },
        });

        // Auto-close other pending buy requests for the same share number so they don't linger
        const otherPending = await tx.shareBuyRequest.findMany({
          where: {
            shareNumber: existingReq.shareNumber,
            status: "PENDING",
            id: { not: buyRequestId },
          },
          select: { id: true, buyerId: true },
        });

        if (otherPending.length > 0) {
          await tx.shareBuyRequest.updateMany({
            where: { id: { in: otherPending.map((o) => o.id) } },
            data: {
              status: "REJECTED",
              adminNote: `Share #${existingReq.shareNumber} was allocated to another approved buyer.`,
              processedById: session.userId,
              processedAt: new Date(),
            },
          });

          for (const other of otherPending) {
            await tx.notification.create({
              data: {
                userId: other.buyerId,
                title: "Buy request closed",
                message: `Your buy request for share #${existingReq.shareNumber} was closed because the share was purchased by another buyer.`,
                type: "PURCHASE",
              },
            });
          }
        }

        await tx.notification.create({
          data: {
            userId: existingReq.buyerId,
            title: "Buy request confirmed & paid",
            message: `Your request to buy share #${existingReq.shareNumber} has been approved! ৳${priceBdt.toFixed(2)} was paid from your platform wallet.${ticketFileUrl ? " Your ticket/slip is attached." : ""}`,
            type: "PURCHASE",
          },
        });

        // Referral commission, if this request was referred by an agent and
        // admin has set a nonzero SHARE_BUY_REQUEST rate (free by default).
        await creditCommission(tx, {
          referredById: existingReq.referredById,
          amount: priceBdt,
          description: `Share 4 buy request — #${existingReq.shareNumber}`,
          module: "SHARE_BUY_REQUEST",
        });
      });
    } else {
      await prisma.shareBuyRequest.update({
        where: { id: buyRequestId },
        data: { status: "REJECTED", adminNote: adminNote?.trim() || null, processedById: session.userId, processedAt: new Date() },
      });

      await prisma.notification.create({
        data: {
          userId: existingReq.buyerId,
          title: "Buy request not approved",
          message: `Your request to buy share #${existingReq.shareNumber} was not approved.`,
          type: "PURCHASE",
        },
      });
    }

    revalidatePath("/admin/shares");
    revalidatePath("/shares/my");
    revalidatePath("/wallet");
    revalidatePath("/dashboard");
    return;
  }

  if (type === "listing" && listingId) {
    await prisma.shareListing.update({
      where: { id: listingId },
      data: { status },
    });

    const listing = await prisma.shareListing.findUnique({
      where: { id: listingId },
      include: { project: { select: { name: true } } },
    });

    if (listing) {
      await prisma.notification.create({
        data: {
          userId: listing.sellerId,
          title: status === "APPROVED" ? "Resell listing approved" : "Resell listing rejected",
          message:
            status === "APPROVED"
              ? `Your listing for ${listing.quantity} shares in ${listing.project.name} is now live on the secondary market.`
              : `Your resell listing for ${listing.project.name} was not approved.`,
          type: "TRADE",
        },
      });
    }
  }

  if (type === "trade" && tradeId) {
    const trade = await prisma.shareTrade.findUnique({
      where: { id: tradeId },
      include: {
        listing: {
          include: {
            project: { select: { name: true } },
          },
        },
      },
    });

    if (!trade) return;

    if (status === "APPROVED") {
      try {
      await prisma.$transaction(async (tx) => {
        // Debit buyer's wallet if they chose to pay from it
        if (trade.paymentMethod === "WALLET") {
          const buyerWallet = await tx.wallet.findUnique({ where: { userId: trade.buyerId } });
          if (!buyerWallet) throw new Error("Buyer's wallet not found");
          if (Number(buyerWallet.balance) < Number(trade.totalAmount)) {
            throw new Error(`Buyer's wallet balance (৳${Number(buyerWallet.balance).toFixed(2)}) is insufficient for this trade.`);
          }

          const buyerNewBalance = Number(buyerWallet.balance) - Number(trade.totalAmount);
          await tx.wallet.update({ where: { id: buyerWallet.id }, data: { balance: buyerNewBalance } });

          await tx.walletTransaction.create({
            data: {
              walletId: buyerWallet.id,
              type: "SHARE_PURCHASE",
              amount: trade.totalAmount,
              description: `Purchase of ${trade.quantity} shares in ${trade.listing.project.name} (secondary market)`,
              balanceBefore: buyerWallet.balance,
              balanceAfter: buyerNewBalance,
            },
          });
        }

        // Credit seller's wallet with the sale proceeds
        const sellerWallet = await tx.wallet.findUnique({ where: { userId: trade.listing.sellerId } });
        if (!sellerWallet) throw new Error("Seller's wallet not found");

        const sellerNewBalance = Number(sellerWallet.balance) + Number(trade.totalAmount);
        await tx.wallet.update({ where: { id: sellerWallet.id }, data: { balance: sellerNewBalance } });

        await tx.walletTransaction.create({
          data: {
            walletId: sellerWallet.id,
            type: "SHARE_SALE",
            amount: trade.totalAmount,
            description: `Sale of ${trade.quantity} shares in ${trade.listing.project.name} (secondary market)`,
            balanceBefore: sellerWallet.balance,
            balanceAfter: sellerNewBalance,
          },
        });

        // Figure out which of the listing's specific share numbers this trade
        // claims — whatever's left after other approved trades against the
        // same listing have already taken theirs. Legacy listings with no
        // tracked numbers fall back to just grabbing the seller's lowest-
        // numbered owned certs, same as before this field existed.
        const otherApprovedTrades = await tx.shareTrade.findMany({
          where: { listingId: trade.listingId, status: "APPROVED", id: { not: tradeId } },
          select: { tradedShareNumbers: true },
        });
        const consumed = new Set(otherApprovedTrades.flatMap((t) => t.tradedShareNumbers));
        const availableNumbers = trade.listing.listedShareNumbers.filter((n) => !consumed.has(n));
        const claimedNumbers = availableNumbers.slice(0, trade.quantity);

        if (trade.listing.listedShareNumbers.length > 0 && claimedNumbers.length < trade.quantity) {
          throw new Error(`Only ${claimedNumbers.length} share number(s) still available on this listing.`);
        }

        await tx.shareTrade.update({
          where: { id: tradeId },
          data: {
            status: "APPROVED",
            tradedShareNumbers: claimedNumbers,
            processedById: session.userId,
            processedAt: new Date(),
          },
        });

        // Transfer ownership: decrement seller, upsert buyer
        await tx.shareOwnership.updateMany({
          where: { projectId: trade.listing.projectId, ownerId: trade.listing.sellerId },
          data: { quantity: { decrement: trade.quantity } },
        });

        const buyerOwnership = await tx.shareOwnership.findUnique({
          where: { projectId_ownerId: { projectId: trade.listing.projectId, ownerId: trade.buyerId } },
        });

        if (buyerOwnership) {
          await tx.shareOwnership.update({
            where: { projectId_ownerId: { projectId: trade.listing.projectId, ownerId: trade.buyerId } },
            data: {
              quantity: { increment: trade.quantity },
              purchasePrice: averagePurchasePrice(buyerOwnership, trade.quantity, Number(trade.totalAmount)),
            },
          });
        } else {
          await tx.shareOwnership.create({
            data: {
              projectId: trade.listing.projectId,
              ownerId: trade.buyerId,
              quantity: trade.quantity,
              purchasePrice: averagePurchasePrice(null, trade.quantity, Number(trade.totalAmount)),
            },
          });
        }

        // Transfer share certificates from seller to buyer — the specific
        // numbers claimed above, or (legacy listings) any of the seller's
        // owned certs in this project.
        const certsToTransfer = claimedNumbers.length > 0
          ? await tx.shareCertificate.findMany({
              where: { projectId: trade.listing.projectId, ownerId: trade.listing.sellerId, shareNumber: { in: claimedNumbers } },
              select: { id: true },
            })
          : await tx.shareCertificate.findMany({
              where: { projectId: trade.listing.projectId, ownerId: trade.listing.sellerId },
              orderBy: { shareNumber: "asc" },
              take: trade.quantity,
              select: { id: true },
            });
        await tx.shareCertificate.updateMany({
          where: { id: { in: certsToTransfer.map((c) => c.id) } },
          data: { ownerId: trade.buyerId },
        });

        // Notify both parties
        await tx.notification.createMany({
          data: [
            {
              userId: trade.buyerId,
              title: "Share trade approved",
              message: `You successfully bought ${trade.quantity} shares in ${trade.listing.project.name} from the secondary market.`,
              type: "TRADE",
            },
            {
              userId: trade.listing.sellerId,
              title: "Your shares have been sold",
              message: `${trade.quantity} shares in ${trade.listing.project.name} were sold for ৳${Number(trade.totalAmount).toFixed(2)}. Your wallet has been credited.`,
              type: "TRADE",
            },
          ],
        });

        // If listing is now completely sold out, mark listing as COMPLETED and reject leftover pending trades
        const allApprovedTrades = await tx.shareTrade.findMany({
          where: { listingId: trade.listingId, status: "APPROVED" },
          select: { quantity: true },
        });
        const totalSold = allApprovedTrades.reduce((sum, t) => sum + t.quantity, 0);

        if (totalSold >= trade.listing.quantity) {
          await tx.shareListing.update({
            where: { id: trade.listingId },
            data: { status: "COMPLETED" },
          });

          const leftoverPending = await tx.shareTrade.findMany({
            where: { listingId: trade.listingId, status: "PENDING" },
            select: { id: true, buyerId: true },
          });

          if (leftoverPending.length > 0) {
            await tx.shareTrade.updateMany({
              where: { id: { in: leftoverPending.map((p) => p.id) } },
              data: {
                status: "REJECTED",
                processedById: session.userId,
                processedAt: new Date(),
              },
            });

            for (const p of leftoverPending) {
              await tx.notification.create({
                data: {
                  userId: p.buyerId,
                  title: "Listing Sold Out",
                  message: `The resell listing for ${trade.listing.project.name} has been completed as all available shares were purchased.`,
                  type: "TRADE",
                },
              });
            }
          }
        }
      });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Transaction failed.";
        return { error: msg };
      }
    } else {
      await prisma.shareTrade.update({
        where: { id: tradeId },
        data: { status: "REJECTED", processedById: session.userId, processedAt: new Date() },
      });

      await prisma.notification.create({
        data: {
          userId: trade.buyerId,
          title: "Trade request rejected",
          message: `Your request to buy shares in ${trade.listing.project.name} was not approved.`,
          type: "TRADE",
        },
      });
    }
  }

  revalidatePath("/admin/shares");
}

export async function resetDemoSharesAction(): Promise<{ error?: string; success?: boolean; message?: string }> {
  await requireAdmin();
  try {
    await prisma.$transaction([
      prisma.shareTrade.deleteMany({}),
      prisma.shareListing.deleteMany({}),
      prisma.shareCertificate.deleteMany({}),
      prisma.sharePurchaseRequest.deleteMany({}),
      prisma.shareOwnership.deleteMany({}),
      prisma.shareBuyRequest.deleteMany({}),
    ]);
    revalidatePath("/admin/shares");
    revalidatePath("/shares");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "All demo share data (purchases, trades, listings, buy requests, certificates, ownerships) has been successfully deleted!",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reset demo share data.";
    return { error: msg };
  }
}
