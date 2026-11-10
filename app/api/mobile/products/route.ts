import { prisma } from "@/lib/prisma";

// Mirrors app/products/page.tsx. Public — browsing the catalog doesn't
// require a login (only ordering does), same as the web page.
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return Response.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        price: Number(p.price),
        stock: p.stock,
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile products list error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load products." }, { status: 500 });
  }
}
