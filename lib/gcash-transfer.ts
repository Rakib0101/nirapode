import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isValidImageRef } from "@/lib/storage";
import { notifyAdmin } from "@/lib/notifications";
import {
  GCASH_MIN_SGD,
  GCASH_PAYMENT_METHODS,
  formatMoney,
  gcashMethodLabel,
  pesosFor,
} from "@/lib/gcash-transfer-shared";

// Admin-editable settings for the SGD → GCash service, kept in SiteSetting.
const KEYS = {
  rate: "gcash_sgd_php_rate", // 1 SGD = X PHP
  receiveAccounts: "gcash_receive_accounts", // where users send SGD (free text, one per line)
  instructions: "gcash_instructions",
} as const;

export type GcashSettings = {
  rate: number | null; // null until admin sets one; the form is closed until then
  receiveAccounts: string;
  instructions: string;
};

export async function getGcashSettings(): Promise<GcashSettings> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  const rate = parseFloat(get(KEYS.rate));
  return {
    rate: Number.isFinite(rate) && rate > 0 ? rate : null,
    receiveAccounts: get(KEYS.receiveAccounts),
    instructions: get(KEYS.instructions),
  };
}

export async function saveGcashSettings(s: { rate: number; receiveAccounts: string; instructions: string }) {
  const entries: [string, string][] = [
    [KEYS.rate, String(s.rate)],
    [KEYS.receiveAccounts, s.receiveAccounts],
    [KEYS.instructions, s.instructions],
  ];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );
}

// ── Creating a request (shared by the website action and the mobile API) ────

const createSchema = z.object({
  amountSgd: z.coerce
    .number({ message: "Enter the SGD amount." })
    .min(GCASH_MIN_SGD, `Minimum is S$${GCASH_MIN_SGD}.`)
    .max(100000, "That amount is too large."),
  paymentMethod: z.enum(GCASH_PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]], {
    message: "Choose how you paid.",
  }),
  payerAccount: z.string().trim().min(3, "Enter the phone number or bank account you paid from.").max(60),
  paymentProofUrl: z
    .string({ message: "Upload a screenshot of your payment." })
    .min(1, "Upload a screenshot of your payment.")
    .refine(isValidImageRef, "Upload a screenshot of your payment."),
  recipientName: z.string().trim().min(2, "Enter the GCash account name.").max(80),
  recipientGcashNumber: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,20}$/, "Enter a valid GCash number."),
  note: z.string().trim().max(300).optional(),
});

export type CreateGcashInput = z.input<typeof createSchema>;

export async function createGcashTransfer(
  user: { userId: string; email: string; fullName: string },
  input: CreateGcashInput,
): Promise<{ error: string } | { id: string; amountPhp: number }> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const d = parsed.data;

  const { rate } = await getGcashSettings();
  if (!rate) return { error: "This service isn't open yet: the exchange rate hasn't been set." };

  const amountPhp = pesosFor(d.amountSgd, rate);
  const row = await prisma.gcashTransfer.create({
    data: {
      userId: user.userId,
      amountSgd: d.amountSgd,
      rate,
      amountPhp,
      paymentMethod: d.paymentMethod,
      payerAccount: d.payerAccount,
      paymentProofUrl: d.paymentProofUrl,
      recipientName: d.recipientName,
      recipientGcashNumber: d.recipientGcashNumber,
      note: d.note || null,
    },
  });

  await notifyAdmin({
    subject: `New GCash transfer request: S$${formatMoney(d.amountSgd)}`,
    heading: "New SGD → GCash Request",
    lines: [
      { label: "Customer", value: `${user.fullName} (${user.email})` },
      { label: "Paid", value: `S$${formatMoney(d.amountSgd)} via ${gcashMethodLabel(d.paymentMethod)}` },
      { label: "Paid from", value: d.payerAccount },
      { label: "Send", value: `₱${formatMoney(amountPhp)} (rate ${rate})` },
      { label: "To GCash", value: `${d.recipientGcashNumber} — ${d.recipientName}` },
    ],
    actionPath: "/admin/gcash",
  });

  return { id: row.id, amountPhp };
}
