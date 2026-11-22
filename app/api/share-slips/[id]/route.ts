import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hasAdminSection } from "@/lib/admin-permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const buyRequest = await prisma.shareBuyRequest.findUnique({
    where: { id },
    select: { buyerId: true, adminNote: true, shareNumber: true },
  });

  if (!buyRequest || !buyRequest.adminNote) {
    return new NextResponse("Slip not found", { status: 404 });
  }

  const isAdmin = await hasAdminSection("shares");
  if (!isAdmin && buyRequest.buyerId !== session.userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let fileUrl: string | null = null;
  try {
    const parsed = JSON.parse(buyRequest.adminNote);
    if (parsed && typeof parsed.fileUrl === "string") {
      fileUrl = parsed.fileUrl;
    }
  } catch {
    // If adminNote directly contains data: or URL
    if (buyRequest.adminNote.startsWith("data:") || buyRequest.adminNote.startsWith("http")) {
      fileUrl = buyRequest.adminNote;
    }
  }

  if (!fileUrl) {
    return new NextResponse("No attached file found for this request", { status: 404 });
  }

  // If already an external HTTP / HTTPS URL
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return NextResponse.redirect(new URL(fileUrl));
  }

  // If a Base64 data URL
  if (fileUrl.startsWith("data:")) {
    const match = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      const isPdf = mimeType.includes("pdf");
      const ext = isPdf ? "pdf" : "jpg";
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="share4-slip-${buyRequest.shareNumber}.${ext}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  }

  return new NextResponse("Invalid file data format", { status: 400 });
}
