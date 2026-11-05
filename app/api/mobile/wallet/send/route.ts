import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { creditWallet, debitWallet, getTransferFeeSetting } from "@/lib/wallet";
import { computeTransferFee } from "@/lib/wallet-tx";
import { notifyUser } from "@/lib/notifications";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Mirrors app/actions/wallet-transfer.ts sendMoneyAction exactly, including
// the atomic $transaction (debitWallet/creditWallet guard against overdraw
// via an UPDATE ... WHERE balance >= amount, so this is safe under
// concurrent transfers). "password" accepts either the account password or
// the 4-digit PIN — same dual-credential behavior as the web.
const transferSchema = z.object({
  recipient: z.string().trim().min(3, "Enter the recipient's email or phone number"),
  amount: z.coerce.number().min(1, "Minimum transfer is ৳1"),
  note: z.string().trim().max(200, "Note is too long").optional(),
  password: z.string().min(1, "Enter your password or PIN to confirm"),
});

async function findRecipient(identifier: string) {
  const select = { id: true, fullName: true, email: true, phone: true, isActive: true } as const;
  if (identifier.includes("@")) {
    return prisma.user.findFirst({ where: { email: { equals: identifier, mode: "insensitive" } }, select });
  }
  const matches = await prisma.user.findMany({ where: { phone: identifier }, select, take: 2 });
  return matches.length === 1 ? matches[0] : null;
}

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = transferSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { recipient: identifier, note, password } = parse.data;
    const amount = Math.round(parse.data.amount * 100) / 100;

    const sender = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true, pinHash: true, email: true, phone: true, fullName: true },
    });
    if (!sender?.passwordHash && !sender?.pinHash) {
      return Response.json({ error: "Set a password or PIN on your account before sending money." }, { status: 400 });
    }

    const matchesPassword = sender.passwordHash ? await bcrypt.compare(password, sender.passwordHash) : false;
    const matchesPin = sender.pinHash ? await bcrypt.compare(password, sender.pinHash) : false;
    if (!matchesPassword && !matchesPin) {
      return Response.json({ error: "Incorrect password or PIN." }, { status: 401 });
    }

    const recipient = await findRecipient(identifier);
    if (!recipient || !recipient.isActive) {
      return Response.json({ error: "No active account found with that email or phone number." }, { status: 404 });
    }
    if (recipient.id === session.userId) {
      return Response.json({ error: "You can't send money to yourself." }, { status: 400 });
    }

    const fee = computeTransferFee(await getTransferFeeSetting(), amount);
    const noteSuffix = note ? ` — "${note}"` : "";

    try {
      // Default 5s Prisma transaction timeout can be tight under this
      // environment's Supabase pooler latency for a transaction with this
      // many sequential writes (see the pay/[token]/wallet route, which
      // hit it reproducibly) — bumped defensively here too.
      await prisma.$transaction(async (tx) => {
        const transfer = await tx.walletTransfer.create({
          data: { senderId: session.userId, recipientId: recipient.id, amount, fee, note: note ?? null },
        });

        const wallet = await tx.wallet.findUnique({ where: { userId: session.userId }, select: { balance: true } });
        if (!wallet || Number(wallet.balance) < amount + fee) {
          throw new Error(
            `Insufficient balance. You need ৳${(amount + fee).toFixed(2)}${fee > 0 ? ` (incl. ৳${fee.toFixed(2)} fee)` : ""}, available ৳${Number(wallet?.balance ?? 0).toFixed(2)}.`
          );
        }

        await debitWallet(tx, {
          userId: session.userId,
          amount,
          type: "TRANSFER_SENT",
          description: `Sent to ${recipient.fullName}${noteSuffix}`,
          referenceId: transfer.id,
        });
        if (fee > 0) {
          await debitWallet(tx, {
            userId: session.userId,
            amount: fee,
            type: "TRANSFER_FEE",
            description: `Fee for transfer to ${recipient.fullName}`,
            referenceId: transfer.id,
          });
        }
        await creditWallet(tx, {
          userId: recipient.id,
          amount,
          type: "TRANSFER_RECEIVED",
          description: `Received from ${session.fullName}${noteSuffix}`,
          referenceId: transfer.id,
        });

        await tx.notification.createMany({
          data: [
            {
              userId: recipient.id,
              title: "Money received",
              message: `${session.fullName} sent you ৳${amount.toFixed(2)}.${note ? ` Note: ${note}` : ""}`,
              type: "WALLET",
            },
            {
              userId: session.userId,
              title: "Money sent",
              message: `You sent ৳${amount.toFixed(2)} to ${recipient.fullName}${fee > 0 ? ` (fee ৳${fee.toFixed(2)})` : ""}.`,
              type: "WALLET",
            },
          ],
        });
      }, { timeout: 15000 });
    } catch (err: unknown) {
      return Response.json({ error: err instanceof Error ? err.message : "Transfer failed. Please try again." }, { status: 400 });
    }

    await notifyUser({
      to: recipient.email,
      phone: recipient.phone,
      subject: "Money received",
      heading: "Money Received",
      message: `${session.fullName} sent you ৳${amount.toFixed(2)}.${note ? ` Note: ${note}` : ""}`,
    });
    await notifyUser({
      to: sender.email,
      phone: sender.phone,
      subject: "Money sent",
      heading: "Money Sent",
      message: `You sent ৳${amount.toFixed(2)} to ${recipient.fullName}${fee > 0 ? ` (fee ৳${fee.toFixed(2)})` : ""}.`,
    });

    return Response.json({
      success: true,
      message: `৳${amount.toFixed(2)} sent to ${recipient.fullName}${fee > 0 ? ` (fee ৳${fee.toFixed(2)})` : ""}.`,
    });
  } catch (err: unknown) {
    console.error("Mobile send-money error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Transfer failed. Please try again." }, { status: 500 });
  }
}
