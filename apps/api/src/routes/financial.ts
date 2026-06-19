import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

const ExpenseSchema = z.object({
  amount: z.number().positive(),
  category: z.enum(['pembelian_bahan', 'operasional', 'lainnya']),
  description: z.string().min(1),
})

// POST /api/financial/expense — catat pengeluaran
router.post('/expense', authenticate, requireRole('admin'), async (req, res) => {
  const parse = ExpenseSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const log = await prisma.financialLog.create({
    data: {
      logType: 'pengeluaran',
      amount: parse.data.amount,
      category: parse.data.category,
      description: parse.data.description,
    },
  })
  res.status(201).json(log)
})

// GET /api/financial/logs — riwayat keuangan
router.get('/logs', authenticate, requireRole('admin'), async (req, res) => {
  const { startDate, endDate, type } = req.query

  const where: Record<string, unknown> = {}
  if (type) where.logType = type
  if (startDate || endDate) {
    where.loggedAt = {
      ...(startDate ? { gte: new Date(startDate as string) } : {}),
      ...(endDate ? { lte: new Date(endDate as string) } : {}),
    }
  }

  const logs = await prisma.financialLog.findMany({
    where,
    orderBy: { loggedAt: 'desc' },
    take: 100,
  })
  res.json(logs)
})

// GET /api/financial/report/monthly — laporan bulanan
router.get('/report/monthly', authenticate, requireRole('admin'), async (req, res) => {
  const { year, month } = req.query
  const y = parseInt(year as string) || new Date().getFullYear()
  const m = parseInt(month as string) || new Date().getMonth() + 1

  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 1)

  const [income, expenses] = await Promise.all([
    prisma.financialLog.aggregate({
      where: { logType: 'pemasukan', loggedAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.financialLog.aggregate({
      where: { logType: 'pengeluaran', loggedAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ])

  const dailyBreakdown = await prisma.$queryRaw<{ day: Date; total: number }[]>`
    SELECT DATE(logged_at) as day, SUM(amount) as total
    FROM financial_logs
    WHERE log_type = 'pemasukan'
      AND logged_at >= ${start}
      AND logged_at < ${end}
    GROUP BY DATE(logged_at)
    ORDER BY day ASC
  `

  res.json({
    period: `${y}-${String(m).padStart(2, '0')}`,
    totalIncome: Number(income._sum.amount || 0),
    totalExpenses: Number(expenses._sum.amount || 0),
    netProfit: Number(income._sum.amount || 0) - Number(expenses._sum.amount || 0),
    dailyBreakdown,
  })
})

export default router
