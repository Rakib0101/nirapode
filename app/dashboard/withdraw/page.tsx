import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getBdtToPhpRate } from "@/lib/currency";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WithdrawForm } from "./withdraw-form";

export default async function WithdrawPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { amount } = await searchParams;
  const [wallet, phpRate] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: session.userId } }),
    getBdtToPhpRate(),
  ]);
  const balance = wallet ? Number(wallet.balance) : 0;

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/dashboard" className="hover:text-brand transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">Withdraw Funds</span>
        </div>

        <div className="bg-white rounded-2xl border border-border p-7">
          <h1 className="text-xl font-bold text-foreground mb-1">Withdraw Funds</h1>
          <p className="text-sm text-muted-foreground mb-6">Request a withdrawal to your bank or mobile wallet. Your balance is deducted after admin verification.</p>

          <div className="bg-muted rounded-xl px-4 py-3 mb-5">
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="text-lg font-bold text-foreground">৳{balance.toFixed(2)}</p>
          </div>

          <WithdrawForm balance={balance} defaultAmount={amount} bdtToPhpRate={phpRate} />
        </div>
      </div>
    </div>
  );
}
