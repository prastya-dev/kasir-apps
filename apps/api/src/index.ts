import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

import authRouter from './routes/auth'
import menuRouter from './routes/menus'
import orderRouter from './routes/orders'
import dashboardRouter from './routes/dashboard'
import financialRouter from './routes/financial'

dotenv.config()

const app = express()
const httpServer = http.createServer(app)

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/api/auth', authRouter)
app.use('/api/menus', menuRouter)
app.use('/api/orders', orderRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/financial', financialRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join-room', (room: string) => {
    socket.join(room)
    console.log(`Socket ${socket.id} joined room: ${room}`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`🚀 API Server berjalan di http://localhost:${PORT}`)
})
