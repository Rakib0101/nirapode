import { requireAdminSection } from "@/lib/admin-permissions";

// Only staff a super admin has given the "gcash" section can open these pages.
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdminSection("gcash");
  return children;
}
