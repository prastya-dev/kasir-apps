import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

const MenuSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  price: z.number().positive(),
  costPerPortion: z.number().positive(),
  dailyStock: z.number().int().min(0),
  isAvailable: z.boolean().optional(),
})

// GET /api/menus — public (untuk e-menu pelanggan)
router.get('/', async (_req, res) => {
  const menus = await prisma.menu.findMany({
    orderBy: { name: 'asc' },
  })
  res.json(menus)
})

// POST /api/menus — admin only
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const parse = MenuSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  const menu = await prisma.menu.create({ data: parse.data })
  res.status(201).json(menu)
})

// PATCH /api/menus/:id — admin/kasir
router.patch('/:id', authenticate, requireRole('admin', 'kasir'), async (req, res) => {
  const parse = MenuSchema.partial().safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() })

  try {
    const menu = await prisma.menu.update({
      where: { id: req.params.id },
      data: parse.data,
    })
    res.json(menu)
  } catch {
    res.status(404).json({ error: 'Menu tidak ditemukan' })
  }
})

// PATCH /api/menus/:id/stock — reset stok harian
router.patch('/:id/stock', authenticate, requireRole('admin'), async (req, res) => {
  const { dailyStock } = req.body
  if (typeof dailyStock !== 'number') return res.status(400).json({ error: 'Stock tidak valid' })

  const menu = await prisma.menu.update({
    where: { id: req.params.id },
    data: { dailyStock },
  })
  res.json(menu)
})

// DELETE /api/menus/:id — admin only
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  await prisma.menu.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
