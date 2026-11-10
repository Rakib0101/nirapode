import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = {
  title: "Products — Nirapode",
  description: "Products available to order from Nirapode.",
};

export default async function ProductsPage() {
  const products = await prisma.product
    .findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] })
    .catch(() => []);

  return (
    <div className="min-h-screen bg-muted">
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-brand transition-colors">Home</Link>
            <span>/</span>
            <span className="text-foreground">Products</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Order from Nirapode — we&apos;ll confirm your order and send a payment invoice to your wallet.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="font-semibold text-foreground">No products listed yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon — new items are added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {products.map((p) => {
              const soldOut = p.stock !== null && p.stock <= 0;
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="w-full h-36 sm:h-44 object-cover" />
                  ) : (
                    <div className="w-full h-36 sm:h-44 bg-gradient-to-br from-brand to-brand-dark" />
                  )}
                  <div className="p-4">
                    <p className="font-semibold text-foreground text-sm leading-snug group-hover:text-brand transition-colors line-clamp-2">
                      {p.name}
                    </p>
                    <p className="text-brand font-bold mt-1.5">৳{Number(p.price).toFixed(2)}</p>
                    {soldOut && <p className="text-[11px] font-semibold text-red-600 mt-1">Out of stock</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
