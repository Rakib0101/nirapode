import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { notifyAdmin } from "@/lib/notifications";
import { z } from "zod";

// Mirrors app/actions/products.ts placeProductOrderAction — same validation
// and the same "no payment taken now" flow: the order is recorded, admin
// confirms it, then admin issues a Checkout invoice paid from the wallet.
const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  phone: z.string().trim().min(6, "Enter a valid phone number."),
  address: z.string().trim().optional(),
  note: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id: productId } = await params;
    const body = await req.json().catch(() => ({}));
    const parse = schema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { fullName, phone, address, note, quantity } = parse.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return Response.json({ error: "This product is no longer available." }, { status: 404 });
    }
    if (product.stock !== null && product.stock < quantity) {
      return Response.json(
        { error: product.stock === 0 ? "This product is out of stock." : `Only ${product.stock} left in stock.` },
        { status: 400 }
      );
    }

    const unitPrice = Number(product.price);
    const totalAmount = Math.round(unitPrice * quantity * 100) / 100;

    await prisma.productOrder.create({
      data: {
        productId,
        userId: session.userId,
        fullName,
        phone,
        address: address || null,
        note: note || null,
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

    return Response.json({
      success: true,
      message: "Order placed! Our team will confirm it and send you a payment invoice shortly.",
    });
  } catch (err: unknown) {
    console.error("Mobile product order error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to place order." }, { status: 500 });
  }
}
