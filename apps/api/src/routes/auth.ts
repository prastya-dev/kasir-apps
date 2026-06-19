import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parse = LoginSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Data tidak valid' })

  const { email, password } = parse.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ error: 'Email atau password salah' })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ error: 'Email atau password salah' })

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '8h' }
  )

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  res.json(user)
})

export default router
