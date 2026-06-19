import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

// GET /api/dashboard/summary — ringkasan harian
router.get('/summary', authenticate, requireRole('admin', 'kasir'), async (_req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [totalOrders, totalRevenue, pendingOrders, financialSummary] = await Promise.all([
    // Total order hari ini
    prisma.order.count({
      where: { createdAt: { gte: today, lt: tomorrow }, paymentStatus: 'paid' },
    }),
    // Total revenue hari ini
    prisma.order.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow }, paymentStatus: 'paid' },
      _sum: { totalAmount: true },
    }),
    // Pending orders
    prisma.order.count({
      where: { orderStatus: { in: ['pending', 'dimasak'] }, paymentStatus: 'paid' },
    }),
    // Laba kotor (dari order items)
    prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: today, lt: tomorrow },
          paymentStatus: 'paid',
        },
      },
    }),
  ])

  const grossProfit = financialSummary.reduce((acc, item) => {
    return acc + (Number(item.priceAtSale) - Number(item.costAtSale)) * item.quantity
  }, 0)

  // Total pengeluaran hari ini
  const expenses = await prisma.financialLog.aggregate({
    where: {
      logType: 'pengeluaran',
      loggedAt: { gte: today, lt: tomorrow },
    },
    _sum: { amount: true },
  })

  res.json({
    totalOrders,
    totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
    grossProfit,
    totalExpenses: Number(expenses._sum.amount || 0),
    pendingOrders,
    netProfit: grossProfit - Number(expenses._sum.amount || 0),
  })
})

// GET /api/dashboard/recent-orders
router.get('/recent-orders', authenticate, requireRole('admin', 'kasir'), async (_req, res) => {
  const orders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { menu: { select: { name: true } } } } },
  })
  res.json(orders)
})

export default router
