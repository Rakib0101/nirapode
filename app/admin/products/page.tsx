import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AddProductForm, ProductRow, OrderStatusButtons } from "./product-forms";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function AdminProductsPage() {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(session.role)) redirect("/dashboard");

  const [products, orders] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    prisma.productOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        product: { select: { name: true } },
        user: { select: { email: true } },
      },
    }),
  ]);

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Link href="/admin" className="hover:text-brand transition-colors">Admin</Link>
              <span>/</span>
              <span className="text-foreground">Products</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Products & Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Items listed for sale on the homepage. Customers place an order, you confirm it, then issue a checkout
              invoice they pay from their wallet.
            </p>
          </div>
          <AddProductForm />
        </div>

        {/* Catalog */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Catalog ({products.length})
          </h2>
          {products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="font-semibold text-foreground">No products yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first product — it shows up in the PRODUCT row on the homepage straight away.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <ProductRow
                  key={p.id}
                  product={{
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    imageUrl: p.imageUrl,
                    price: Number(p.price),
                    stock: p.stock,
                    isActive: p.isActive,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Orders */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Orders ({orders.length}{pendingCount > 0 ? ` · ${pendingCount} pending` : ""})
          </h2>
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No orders yet.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="bg-white rounded-2xl border border-border p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {o.quantity} × {o.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {o.fullName} · {o.phone} · {o.user.email}
                      </p>
                      {o.address && <p className="text-xs text-muted-foreground mt-0.5">Deliver to: {o.address}</p>}
                      {o.note && <p className="text-xs text-muted-foreground mt-0.5">Note: {o.note}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(o.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0 space-y-2">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {o.status.replace("_", " ")}
                      </span>
                      <p className="font-bold text-foreground">৳{Number(o.totalAmount).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
                    <OrderStatusButtons orderId={o.id} status={o.status} />
                    <Link href="/admin/checkouts" className="text-xs font-semibold text-brand hover:underline">
                      Issue checkout invoice →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
