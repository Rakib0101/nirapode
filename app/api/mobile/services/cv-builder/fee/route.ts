import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/actions/cv-builder.ts deductCvFeeAction exactly — a real wallet
// deduction, not a mock. Fee comes from whichever ApplyService's name
// contains "Resume" or "CV" (admin-configured), falling back to ৳30.
export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const cvService = await prisma.applyService.findFirst({
      where: { OR: [{ name: { contains: "Resume", mode: "insensitive" } }, { name: { contains: "CV", mode: "insensitive" } }] },
      select: { price: true },
    });
    const fee = cvService?.price ? Number(cvService.price) : 30;

    const wallet = await prisma.wallet.findUnique({ where: { userId: session.userId } });
    if (!wallet || Number(wallet.balance) < fee) {
      const currentBal = wallet ? Number(wallet.balance) : 0;
      return Response.json(
        {
          error: `Insufficient wallet balance (৳${currentBal.toFixed(2)}). The CV generation fee is ৳${fee.toFixed(2)}. Please deposit funds to your platform wallet.`,
          needDeposit: true,
          fee,
        },
        { status: 400 }
      );
    }

    const newBalance = Number(wallet.balance) - fee;

    await prisma.$transaction([
      prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "CHECKOUT_PAYMENT",
          amount: fee,
          description: "Worker CV / Resume Builder - Instant PDF Generation",
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
        },
      }),
      prisma.notification.create({
        data: {
          userId: session.userId,
          title: "CV Builder Download Fee",
          message: `৳${fee.toFixed(2)} has been deducted from your platform wallet for Worker CV generation.`,
          type: "WALLET",
        },
      }),
    ]);

    return Response.json({ success: true, fee, newBalance });
  } catch (err: unknown) {
    console.error("Mobile cv-fee error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to process CV fee." }, { status: 500 });
  }
}
