// Client-safe pieces of the SGD → GCash transfer service (no prisma import).

export const GCASH_PAYMENT_METHODS = [
  { value: "PAYNOW", label: "PayNow" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
] as const;

export type GcashPaymentMethod = (typeof GCASH_PAYMENT_METHODS)[number]["value"];

export function gcashMethodLabel(value: string): string {
  return GCASH_PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

export const GCASH_MIN_SGD = 1;

// Pesos the user receives for an SGD amount at a rate (1 SGD = rate PHP),
// rounded to centavos.
export function pesosFor(amountSgd: number, rate: number): number {
  return Math.round(amountSgd * rate * 100) / 100;
}

export function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
