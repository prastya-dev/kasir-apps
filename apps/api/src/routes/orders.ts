import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { generateInvoiceNumber } from '../lib/invoice'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth'
import { io } from '../index'

const router = Router()

const OrderItemSchema = z.object({
  menuId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
})

const CreateOrderSchema = z.object({
  orderType: z.enum(['dine_in', 'takeaway']),
  tableNumber: z.string().optional(),
  paymentMethod: z.enum(['cash', 'cashless']),
  items: z.array(OrderItemSchema).min(1),
})

// POST /api/orders — buat pesanan (pelanggan self-order atau kasir walk-in)
router.post('/', async (req: AuthRequest, res) => {
  const parse = CreateOrderSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const { orderType, tableNumber, paymentMethod, items } = parse.data

  // Ambil semua menu yang dipesan
  const menuIds = items.map((i) => i.menuId)
  const menus = await prisma.menu.findMany({ where: { id: { in: menuIds } } })

  // Validasi stok & ketersediaan
  for (const item of items) {
    const menu = menus.find((m) => m.id === item.menuId)
    if (!menu) return res.status(404).json({ error: `Menu ${item.menuId} tidak ditemukan` })
    if (!menu.isAvailable) return res.status(400).json({ error: `${menu.name} tidak tersedia` })
    if (menu.dailyStock < item.quantity)
      return res.status(400).json({ error: `Stok ${menu.name} tidak cukup (sisa: ${menu.dailyStock})` })
  }

  // Hitung total
  let totalAmount = 0
  const orderItemsData = items.map((item) => {
    const menu = menus.find((m) => m.id === item.menuId)!
    const subtotal = Number(menu.price) * item.quantity
    totalAmount += subtotal
    return {
      menuId: item.menuId,
      quantity: item.quantity,
      priceAtSale: menu.price,
      costAtSale: menu.costPerPortion,
      notes: item.notes,
    }
  })

  const order = await prisma.order.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      userId: req.user?.id || null,
      orderType,
      tableNumber,
      totalAmount,
      paymentMethod,
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      items: { create: orderItemsData },
    },
    include: { items: { include: { menu: true } } },
  })

  // Emit ke dashboard admin
  io.to('dashboard').emit('new-order', order)

  res.status(201).json(order)
})

// GET /api/orders — list pesanan (admin/kasir)
router.get('/', authenticate, requireRole('admin', 'kasir'), async (req, res) => {
  const { status, date } = req.query
  
  const where: Record<string, unknown> = {}
  if (status) where.orderStatus = status
  if (date) {
    const start = new Date(date as string)
    const end = new Date(date as string)
    end.setDate(end.getDate() + 1)
    where.createdAt = { gte: start, lt: end }
  }

  const orders = await prisma.order.findMany({
    where,
    include: { items: { include: { menu: true } }, user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(orders)
})

// GET /api/orders/kitchen — kitchen display (pending + dimasak)
router.get('/kitchen', authenticate, async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { orderStatus: { in: ['pending', 'dimasak'] }, paymentStatus: 'paid' },
    include: { items: { include: { menu: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json(orders)
})

// GET /api/orders/:id — detail pesanan (termasuk pelanggan cek status)
router.get('/:id', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { menu: true } } },
  })
  if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' })
  res.json(order)
})

// PATCH /api/orders/:id/status — update order status (dapur)
router.patch('/:id/status', authenticate, requireRole('admin', 'kasir'), async (req, res) => {
  const { orderStatus } = req.body
  const validStatuses = ['pending', 'dimasak', 'selesai', 'batal']
  if (!validStatuses.includes(orderStatus)) return res.status(400).json({ error: 'Status tidak valid' })

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { orderStatus },
  })

  // Emit update ke pelanggan yang tracking pesanan mereka
  io.to(`order-${order.id}`).emit('order-status-update', {
    orderId: order.id,
    orderStatus: order.orderStatus,
  })
  io.to('kitchen').emit('order-updated', order)

  res.json(order)
})

// PATCH /api/orders/:id/pay — konfirmasi pembayaran cash
router.patch('/:id/pay', authenticate, requireRole('admin', 'kasir'), async (req, res) => {
  const existing = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  })
  if (!existing) return res.status(404).json({ error: 'Pesanan tidak ditemukan' })
  if (existing.paymentStatus === 'paid') return res.status(400).json({ error: 'Sudah dibayar' })

  // ACID Transaction: update payment, kurangi stok, catat finansial
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update payment status
    const order = await tx.order.update({
      where: { id: req.params.id },
      data: { paymentStatus: 'paid', orderStatus: 'dimasak' },
      include: { items: { include: { menu: true } } },
    })

    // 2. Kurangi stok harian per menu
    for (const item of order.items) {
      await tx.menu.update({
        where: { id: item.menuId },
        data: { dailyStock: { decrement: item.quantity } },
      })
    }

    // 3. Catat ke financial_logs
    await tx.financialLog.create({
      data: {
        logType: 'pemasukan',
        amount: order.totalAmount,
        category: 'penjualan',
        referenceId: order.id,
        description: `Penjualan ${order.invoiceNumber}`,
      },
    })

    return order
  })

  io.to('dashboard').emit('payment-confirmed', result)
  io.to(`order-${result.id}`).emit('order-status-update', {
    orderId: result.id,
    paymentStatus: 'paid',
    orderStatus: 'dimasak',
  })
  io.to('kitchen').emit('new-kitchen-order', result)

  res.json(result)
})

export default router
