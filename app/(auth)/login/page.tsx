import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getRememberedAccount } from "@/lib/remembered-account";
import { isPinLoginBlockedRole } from "@/lib/pin-login";
import { LoginForm } from "./login-form";
import { PinLoginForm } from "./pin-login-form";

// Which screen /login shows is decided on the server, so there's no flash of
// the password form before the client works out that this browser already
// belongs to someone. The remembered email alone isn't enough — the account it
// names has to still exist, still have a PIN, still be active, and not be
// staff; otherwise we fall back to the full identity form.
async function pinLoginAccount(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { fullName: true, pinHash: true, isActive: true, role: true },
  });
  if (!user?.pinHash || !user.isActive || isPinLoginBlockedRole(user.role)) return null;
  // Name comes from the database, not the cookie, so a rename shows up here.
  return { email, fullName: user.fullName };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;

  // A Google failure or a just-reset password has a message that only makes
  // sense on the full form, so those always land there.
  const remembered = error || reset ? null : await getRememberedAccount();
  const account = remembered ? await pinLoginAccount(remembered.email) : null;

  return <Suspense>{account ? <PinLoginForm account={account} /> : <LoginForm />}</Suspense>;
}
