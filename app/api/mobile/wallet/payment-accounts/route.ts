import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors getPaymentAccounts() in app/pay/[token]/page.tsx — the real,
// admin-configured accounts, used by both the Deposit screen and the
// pay-by-link screen.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const accounts = await prisma.paymentAccount.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, method: true, label: true, accountNumber: true, accountName: true },
    });

    return Response.json({ accounts });
  } catch (err: unknown) {
    console.error("Mobile payment-accounts error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load payment accounts." },
      { status: 500 }
    );
  }
}
