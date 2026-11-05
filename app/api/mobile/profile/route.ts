import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// GET mirrors the data app/profile/page.tsx reads (profile card +
// referral-card.tsx + the 4 activity stat counts). PATCH mirrors
// app/actions/profile.ts updateProfileDetailsAction.

export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        fullName: true,
        nidNumber: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        isAgent: true,
        referralCode: true,
        createdAt: true,
        profilePhoto: true,
        pinHash: true,
        wallet: { select: { balance: true } },
        _count: {
          select: {
            ownedShares: true,
            airTicketRequests: true,
            taxiRequests: true,
            checkouts: true,
          },
        },
      },
    });

    if (!user) return Response.json({ error: "User not found." }, { status: 404 });

    return Response.json({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      nidNumber: user.nidNumber,
      role: user.role,
      isVerified: user.isVerified,
      isAgent: user.isAgent,
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
      profilePhoto: user.profilePhoto,
      hasPin: Boolean(user.pinHash),
      walletBalance: Number(user.wallet?.balance ?? 0),
      stats: {
        shares: user._count.ownedShares,
        airTickets: user._count.airTicketRequests,
        taxiRequests: user._count.taxiRequests,
        checkouts: user._count.checkouts,
      },
    });
  } catch (err: unknown) {
    console.error("Mobile get-profile error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const fullName = (body?.fullName as string | undefined)?.trim();
    const phone = (body?.phone as string | undefined)?.trim() || null;
    const nidNumber = (body?.nidNumber as string | undefined)?.trim() || null;

    if (!fullName || fullName.length < 2) {
      return Response.json({ error: "Full Name must be at least 2 characters." }, { status: 400 });
    }

    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone, id: { not: session.userId } },
      });
      if (existingPhone) {
        return Response.json(
          { error: "This phone number is already registered to another account." },
          { status: 409 }
        );
      }
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { fullName, phone, nidNumber },
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile update-profile error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to update profile." },
      { status: 500 }
    );
  }
}
