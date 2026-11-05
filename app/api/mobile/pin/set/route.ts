import { prisma } from "@/lib/prisma";
import { getMobileSession, issueMobileToken, unauthorizedJson } from "@/lib/mobile-session";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Mirrors app/actions/auth.ts setPinAction (first-time PIN setup / overwrite).
// hasPin flips to true, so we hand back a freshly-signed token carrying that
// claim — a mobile JWT can't be updated in place like the web's cookie.
const setPinSchema = z
  .object({
    pin: z
      .string()
      .regex(/^\d{4}$/, "PIN must be exactly 4 digits")
      .refine((v) => v !== "0000", "0000 is too easy to guess — choose a different PIN"),
    confirmPin: z.string(),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = setPinSchema.safeParse(body);
    if (!parse.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return Response.json({ fieldErrors }, { status: 400 });
    }

    const pinHash = await bcrypt.hash(parse.data.pin, 12);
    await prisma.user.update({ where: { id: session.userId }, data: { pinHash } });

    const token = await issueMobileToken({ ...session, hasPin: true });
    return Response.json({ success: true, token });
  } catch (err: unknown) {
    console.error("Mobile set-pin error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to set PIN. Please try again." },
      { status: 500 }
    );
  }
}
