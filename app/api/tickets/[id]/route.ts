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

  const ticket = await prisma.airTicketRequest.findUnique({
    where: { id },
    select: { userId: true, ticketUrl: true },
  });

  if (!ticket || !ticket.ticketUrl) {
    return new NextResponse("Ticket not found", { status: 404 });
  }

  const isAdmin = await hasAdminSection("airTicket");
  if (!isAdmin && ticket.userId !== session.userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // If already an external HTTP / HTTPS URL
  if (ticket.ticketUrl.startsWith("http://") || ticket.ticketUrl.startsWith("https://")) {
    return NextResponse.redirect(new URL(ticket.ticketUrl));
  }

  // If a Base64 data URL
  if (ticket.ticketUrl.startsWith("data:")) {
    const match = ticket.ticketUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="e-ticket-${id}.pdf"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  }

  return new NextResponse("Invalid ticket data format", { status: 400 });
}
