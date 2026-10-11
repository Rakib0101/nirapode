// Shared types/constants safe to import from client components — no `prisma`
// import here. lib/commission.ts (server-only, uses prisma) re-exports these.

export type CommissionModule = "TAXI" | "AIR_TICKET" | "SERVICE" | "SHARE" | "SHARE_BUY_REQUEST";
export type CommissionMode = "PERCENTAGE" | "FIXED";
export type CommissionSetting = { mode: CommissionMode; value: number };

export const COMMISSION_MODULES: { module: CommissionModule; label: string }[] = [
  { module: "TAXI", label: "Taxi" },
  { module: "AIR_TICKET", label: "Air Ticket" },
  { module: "SERVICE", label: "Service" },
  { module: "SHARE", label: "Share Purchase" },
  { module: "SHARE_BUY_REQUEST", label: "Share 4 (Buy Request)" },
];
