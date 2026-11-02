import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getTransferFeeSetting } from "@/lib/wallet";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SendMoneyForm } from "./send-form";

export default async function SendMoneyPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [wallet, feeSetting, user] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: session.userId }, select: { balance: true } }),
    getTransferFeeSetting(),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true, pinHash: true },
    }),
  ]);
  const balance = wallet ? Number(wallet.balance) : 0;
  const hasSecurityAuth = Boolean(user?.passwordHash || user?.pinHash);

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/wallet" className="hover:text-brand transition-colors">
            My Wallet
          </Link>
          <span>/</span>
          <span className="text-foreground">Send Money</span>
        </div>

        <div className="bg-white rounded-2xl border border-border p-7">
          <h1 className="text-xl font-bold text-foreground mb-1">Send Money</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Transfer from your wallet to another member instantly, using their email or phone number.
          </p>

          <div className="bg-muted rounded-xl px-4 py-3 mb-5">
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="text-lg font-bold text-foreground">৳{balance.toFixed(2)}</p>
          </div>

          <SendMoneyForm
            balance={balance}
            feeSetting={feeSetting}
            hasSecurityAuth={hasSecurityAuth}
            hasPin={Boolean(user?.pinHash)}
            hasPassword={Boolean(user?.passwordHash)}
          />
        </div>
      </div>
    </div>
  );
}
