import { getSession } from "@/lib/session";
import { isPinMandatoryRole } from "@/lib/pin-login";
import { SetPinForm } from "./set-pin-form";

// Whether this page can be skipped depends on the role, so the decision is
// made on the server: members must set a PIN (it's their login), staff may
// skip (PIN login refuses their roles, so it would be friction for nothing).
export default async function SetPinPage() {
  const session = await getSession();
  return <SetPinForm pinMandatory={!session || isPinMandatoryRole(session.role)} />;
}
