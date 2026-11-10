import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { OrderForm } from "./order-form";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, session] = await Promise.all([
    prisma.product.findUnique({ where: { id } }).catch(() => null),
    getSession(),
  ]);

  if (!product || !product.isActive) notFound();

  const user = session
    ? await prisma.user
        .findUnique({ where: { id: session.userId }, select: { fullName: true, phone: true } })
        .catch(() => null)
    : null;

  const price = Number(product.price);
  const soldOut = product.stock !== null && product.stock <= 0;

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-brand transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-brand transition-colors">Products</Link>
          <span>/</span>
          <span className="text-foreground truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div>
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="w-full h-72 sm:h-96 object-cover" />
              ) : (
                <div className="w-full h-72 sm:h-96 bg-gradient-to-br from-brand to-brand-dark" />
              )}
            </div>

            <div className="bg-white rounded-2xl border border-border p-5 mt-4">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{product.name}</h1>
              <p className="text-2xl font-bold text-brand mt-2">৳{price.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {product.stock === null
                  ? "In stock"
                  : soldOut
                    ? "Out of stock"
                    : `${product.stock} available`}
              </p>
              {product.description && (
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          <div>
            {soldOut ? (
              <div className="bg-white rounded-2xl border border-border p-8 text-center">
                <p className="font-semibold text-foreground">Out of stock</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This item isn&apos;t available right now. Check back soon.
                </p>
                <Link href="/products" className="inline-block mt-4 text-sm font-semibold text-brand hover:underline">
                  Browse other products →
                </Link>
              </div>
            ) : (
              <OrderForm
                productId={product.id}
                unitPrice={price}
                maxQty={product.stock}
                defaultName={user?.fullName ?? ""}
                defaultPhone={user?.phone ?? ""}
                isLoggedIn={Boolean(session)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
