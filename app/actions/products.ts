"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifyAdmin } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type State = { error?: string; success?: boolean; message?: string } | null;

async function authAdmin() {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

function revalidateProductPaths() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");
}

function parsePrice(raw: FormDataEntryValue | null): number | null {
  const n = parseFloat(String(raw ?? "").trim());
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

// ── Admin: product catalog CRUD ──────────────────────────────────────────────

export async function addProductAction(_prev: State, formData: FormData): Promise<State> {
  try { await authAdmin(); } catch { return { error: "Unauthorized." }; }

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const imageUrl = (formData.get("imageUrl") as string)?.trim() || null;
  const price = parsePrice(formData.get("price"));
  const rawStock = (formData.get("stock") as string)?.trim();

  if (!name || name.length < 2) return { error: "Product name is required." };
  if (price === null) return { error: "Enter a valid price (0 or more)." };

  // Blank stock = untracked/unlimited, which is different from 0 (sold out).
  let stock: number | null = null;
  if (rawStock) {
    const s = parseInt(rawStock, 10);
    if (isNaN(s) || s < 0) return { error: "Stock must be 0 or more, or left blank for unlimited." };
    stock = s;
  }

  const count = await prisma.product.count();
  await prisma.product.create({
    data: { name, description, imageUrl, price, stock, sortOrder: count },
  });

  revalidateProductPaths();
  return { success: true };
}

export async function updateProductAction(_prev: State, formData: FormData): Promise<State> {
  try { await authAdmin(); } catch { return { error: "Unauthorized." }; }

  const id = formData.get("id") as string;
  if (!id) return { error: "Missing product id." };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const imageUrl = (formData.get("imageUrl") as string)?.trim() || null;
  const price = parsePrice(formData.get("price"));
  const rawStock = (formData.get("stock") as string)?.trim();

  if (!name || name.length < 2) return { error: "Product name is required." };
  if (price === null) return { error: "Enter a valid price (0 or more)." };

  let stock: number | null = null;
  if (rawStock) {
    const s = parseInt(rawStock, 10);
    if (isNaN(s) || s < 0) return { error: "Stock must be 0 or more, or left blank for unlimited." };
    stock = s;
  }

  await prisma.product.update({ where: { id }, data: { name, description, imageUrl, price, stock } });

  revalidateProductPaths();
  return { success: true };
}

export async function toggleProductActiveAction(id: string): Promise<void> {
  await authAdmin();
  const product = await prisma.product.findUnique({ where: { id }, select: { isActive: true } });
  if (!product) return;
  await prisma.product.update({ where: { id }, data: { isActive: !product.isActive } });
  revalidateProductPaths();
}

export async function deleteProductAction(id: string): Promise<void> {
  await authAdmin();
  // Orders keep a historical reference to the product, so deleting one that
  // has already been ordered would break that trail — deactivate instead.
  const orderCount = await prisma.productOrder.count({ where: { productId: id } });
  if (orderCount > 0) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.product.delete({ where: { id } });
  }
  revalidateProductPaths();
}

// ── Customer: place an order ─────────────────────────────────────────────────

export async function placeProductOrderAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session) redirect("/login");

  const productId = (formData.get("productId") as string)?.trim();
  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;
  const quantity = parseInt((formData.get("quantity") as string) ?? "1", 10);

  if (!productId) return { error: "Missing product." };
  if (!fullName || fullName.length < 2) return { error: "Enter your full name." };
  if (!phone || phone.length < 6) return { error: "Enter a valid phone number." };
  if (isNaN(quantity) || quantity < 1) return { error: "Quantity must be at least 1." };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) return { error: "This product is no longer available." };
  if (product.stock !== null && product.stock < quantity) {
    return { error: product.stock === 0 ? "This product is out of stock." : `Only ${product.stock} left in stock.` };
  }

  const unitPrice = Number(product.price);
  const totalAmount = Math.round(unitPrice * quantity * 100) / 100;

  await prisma.productOrder.create({
    data: {
      productId,
      userId: session.userId,
      fullName,
      phone,
      address,
      note,
      quantity,
      unitPrice,
      totalAmount,
    },
  });

  await notifyAdmin({
    subject: `New product order — ${product.name}`,
    heading: "New Product Order",
    lines: [
      { label: "Customer", value: `${fullName} (${session.email})` },
      { label: "Product", value: product.name },
      { label: "Quantity", value: String(quantity) },
      { label: "Total", value: `৳${totalAmount.toFixed(2)}` },
      { label: "Phone", value: phone },
    ],
    actionPath: "/admin/products",
  });

  revalidateProductPaths();
  return {
    success: true,
    message: "Order placed! Our team will confirm it and send you a payment invoice shortly.",
  };
}

// ── Admin: order status ──────────────────────────────────────────────────────

export async function updateProductOrderStatusAction(
  orderId: string,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED",
  adminNote?: string
): Promise<void> {
  await authAdmin();
  await prisma.productOrder.update({
    where: { id: orderId },
    data: { status, ...(adminNote !== undefined ? { adminNote: adminNote.trim() || null } : {}) },
  });
  revalidatePath("/admin/products");
}
