import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isPinMandatoryRole } from "@/lib/pin-login";
import { SetPinForm } from "./set-pin-form";

// Whether this page can be skipped depends on the role, so the decision is
// made on the server: members must set a PIN (it's their login), staff may
// skip (PIN login refuses their roles, so it would be friction for nothing).
export default async function SetPinPage() {
  const session = await getSession();

  // Ask for the name only on first setup. A user changing an existing PIN has
  // already been through this, and their name is whatever they chose.
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId }, select: { pinHash: true, fullName: true } })
    : null;
  const confirmName = user && !user.pinHash ? user.fullName : undefined;

  return (
    <SetPinForm pinMandatory={!session || isPinMandatoryRole(session.role)} confirmName={confirmName} />
  );
}
