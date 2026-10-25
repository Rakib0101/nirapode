import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSiteContactSettings } from "@/lib/site-contact";
import { CvBuilderClient } from "./cv-builder-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Worker CV Builder – Nirapode",
  description: "Create professional CV / Resume for expatriate workers with instant PDF download and WhatsApp sharing.",
};

export default async function CvBuilderPage() {
  const session = await getSession();
  const contact = await getSiteContactSettings();

  let userProfile = null;
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { fullName: true, email: true, phone: true },
    });
    if (user) {
      userProfile = {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
      };
    }
  }

  return (
    <div className="min-h-screen bg-muted">
      <CvBuilderClient user={userProfile} whatsappNumber={contact.whatsappNumber} />
    </div>
  );
}
