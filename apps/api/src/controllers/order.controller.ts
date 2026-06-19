import { Request, Response } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import { generateInvoiceNumber } from '../lib/invoice';

const orderItemSchema = z.object({
  menuId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional().nullable(),
});

const createOrderSchema = z.object({
  orderType: z.enum(['dine_in', 'takeaway']),
  tableNumber: z.string().optional().nullable(),
  paymentMethod: z.enum(['cash', 'cashless']),
  items: z.array(orderItemSchema).min(1, 'Minimal 1 item pesanan'),
  userId: z.string().uuid().optional().nullable(),
});

export async function createOrder(req: Request, res: Response) {
  try {
    const body = createOrderSchema.parse(req.body);

    // Ambil data menu + validasi stok
    const menuIds = body.items.map((i) => i.menuId);
    const menus = await prisma.menu.findMany({ where: { id: { in: menuIds } } });

    for (const item of body.items) {
      const menu = menus.find((m) => m.id === item.menuId);
      if (!menu) {
        return res.status(404).json({ success: false, message: `Menu tidak ditemukan: ${item.menuId}` });
      }
      if (!menu.isAvailable) {
        return res.status(400).json({ success: false, message: `Menu "${menu.name}" sedang tidak tersedia` });
      }
      if (menu.dailyStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stok "${menu.name}" tidak mencukupi. Sisa: ${menu.dailyStock}`,
        });
      }
    }

    // Hitung total
    const totalAmount = body.items.reduce((sum, item) => {
      const menu = menus.find((m) => m.id === item.menuId)!;
      return sum + Number(menu.price) * item.quantity;
    }, 0);

    const invoiceNumber = await generateInvoiceNumber(prisma);

    // ── ACID TRANSACTION ──────────────────────────────────────
    const order = await prisma.$transaction(async (tx) => {
      // 1. Buat order header
      const newOrder = await tx.order.create({
        data: {
          invoiceNumber,
          userId: body.userId || null,
          orderType: body.orderType,
          tableNumber: body.tableNumber || null,
          totalAmount,
          paymentMethod: body.paymentMethod,
          paymentStatus: 'unpaid',
          orderStatus: 'pending',
          orderItems: {
            create: body.items.map((item) => {
              const menu = menus.find((m) => m.id === item.menuId)!;
              return {
                menuId: item.menuId,
                quantity: item.quantity,
                priceAtSale: menu.price,
                costAtSale: menu.costPerPortion,
                notes: item.notes || null,
              };
            }),
          },
        },
        include: { orderItems: { include: { menu: true } } },
      });

      // 2. Kurangi stok harian
      for (const item of body.items) {
        await tx.menu.update({
          where: { id: item.menuId },
          data: { dailyStock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getAllOrders(req: Request, res: Response) {
  try {
    const { status, date, tableNumber } = req.query;

    const where: any = {};
    if (status) where.orderStatus = status;
    if (tableNumber) where.tableNumber = tableNumber;
    if (date) {
      const start = new Date(date as string);
      const end = new Date(date as string);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        orderItems: { include: { menu: { select: { name: true, imageUrl: true } } } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: orders });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getOrderById(req: Request, res: Response) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { orderItems: { include: { menu: true } }, user: true },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    return res.json({ success: true, data: order });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { orderStatus } = z
      .object({ orderStatus: z.enum(['pending', 'dimasak', 'selesai', 'batal']) })
      .parse(req.body);

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { orderStatus },
    });

    return res.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ── KONFIRMASI PEMBAYARAN (dipanggil setelah cash dibayar / webhook QRIS) ──
export async function confirmPayment(req: Request, res: Response) {
  try {
    const orderId = req.params.id;

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }
    if (existing.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Pembayaran sudah dikonfirmasi sebelumnya' });
    }

    // ── ACID TRANSACTION ──────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      // 1. Update payment status → paid
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'paid', orderStatus: 'pending' },
      });

      // 2. Catat profit ke financial_logs
      const profit = existing.orderItems.reduce((sum, item) => {
        return sum + (Number(item.priceAtSale) - Number(item.costAtSale)) * item.quantity;
      }, 0);

      await tx.financialLog.create({
        data: {
          logType: 'pemasukan',
          amount: Number(existing.totalAmount),
          category: 'penjualan',
          referenceId: orderId,
          description: `Penjualan ${existing.invoiceNumber} — Profit Kotor: Rp ${profit.toLocaleString('id-ID')}`,
        },
      });
    });

    return res.json({ success: true, message: 'Pembayaran berhasil dikonfirmasi' });
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
