import { prisma } from "@/lib/prisma";
import { getMobileSession } from "@/lib/mobile-session";

// Mirrors app/products/[id]/page.tsx. Session is optional — it's only used to
// prefill the order form, matching the web page where guests can still view a
// product but see a login gate instead of the order form.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || !product.isActive) {
      return Response.json({ error: "Product not found." }, { status: 404 });
    }

    const session = await getMobileSession(req);
    const user = session
      ? await prisma.user.findUnique({
          where: { id: session.userId },
          select: { fullName: true, phone: true },
        })
      : null;

    return Response.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        price: Number(product.price),
        stock: product.stock,
      },
      isLoggedIn: Boolean(session),
      defaultName: user?.fullName ?? "",
      defaultPhone: user?.phone ?? "",
    });
  } catch (err: unknown) {
    console.error("Mobile product detail error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load product." }, { status: 500 });
  }
}
