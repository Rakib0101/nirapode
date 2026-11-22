import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { effectiveSections, type AdminSection } from "@/lib/admin-sections";

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export type AdminAccess = {
  session: Session;
  sections: AdminSection[];
};

// The signed-in staff member and the admin sections they may use, read fresh
// from the database on every request (like getSession's role check), so a
// super admin's change applies on the staff member's next click. Null for
// anyone who isn't staff.
export const getAdminAccess = cache(async (): Promise<AdminAccess | null> => {
  const session = await getSession();
  if (!session) return null;
  if (!["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(session.role)) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { adminPermissions: true },
  });
  return { session, sections: effectiveSections(session.role, user?.adminPermissions ?? []) };
});

export async function hasAdminSection(section: AdminSection): Promise<boolean> {
  const access = await getAdminAccess();
  return !!access?.sections.includes(section);
}

// For admin pages and redirecting server actions: sends anyone without the
// section away instead of rendering or running anything.
export async function requireAdminSection(
  section: AdminSection,
  options: { roles?: readonly string[] } = {},
): Promise<Session> {
  const access = await getAdminAccess();
  if (!access) {
    const session = await getSession();
    redirect(session ? "/dashboard" : "/admin-login");
  }
  if (options.roles && !options.roles.includes(access.session.role)) redirect("/admin");
  if (!access.sections.includes(section)) redirect("/admin?denied=" + section);
  return access.session;
}

// For server actions that report errors instead of redirecting.
export async function checkAdminSection(
  section: AdminSection,
  options: { roles?: readonly string[] } = {},
): Promise<Session | null> {
  const access = await getAdminAccess();
  if (!access) return null;
  if (options.roles && !options.roles.includes(access.session.role)) return null;
  if (!access.sections.includes(section)) return null;
  return access.session;
}
