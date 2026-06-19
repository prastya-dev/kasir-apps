import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { formatRupiah } from '@/lib/format'
import { connectSocket } from '@/lib/socket'

interface Summary {
  totalOrders: number
  totalRevenue: number
  grossProfit: number
  totalExpenses: number
  pendingOrders: number
  netProfit: number
}

export default function DashboardPage() {
  const { user, logout, isKasir } = useAuthStore()
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !isKasir()) { router.replace('/login'); return }

    api.get('/dashboard/summary').then((r) => setSummary(r.data))

    const socket = connectSocket('dashboard')
    socket.on('new-order', (order) => {
      setNotification(`Pesanan baru masuk! Meja ${order.tableNumber || 'Takeaway'} - ${formatRupiah(order.totalAmount)}`)
      setTimeout(() => setNotification(null), 5000)
      // Refresh summary
      api.get('/dashboard/summary').then((r) => setSummary(r.data))
    })
    return () => { socket.off('new-order') }
  }, [user, router, isKasir])

  if (!user) return null

  const stats = [
    { label: 'Total Pesanan', value: summary?.totalOrders ?? '-', icon: '📋', color: 'bg-blue-50 text-blue-700' },
    { label: 'Total Pendapatan', value: summary ? formatRupiah(summary.totalRevenue) : '-', icon: '💰', color: 'bg-green-50 text-green-700' },
    { label: 'Laba Kotor', value: summary ? formatRupiah(summary.grossProfit) : '-', icon: '📈', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Pesanan Aktif', value: summary?.pendingOrders ?? '-', icon: '⏳', color: 'bg-orange-50 text-orange-700' },
  ]

  const menus = [
    { href: '/dashboard/pos', icon: '🖥️', label: 'POS Kasir', desc: 'Input pesanan walk-in' },
    { href: '/dashboard/orders', icon: '📋', label: 'Daftar Pesanan', desc: 'Kelola semua transaksi' },
    { href: '/dashboard/kitchen', icon: '👨‍🍳', label: 'Dapur (KDS)', desc: 'Display dapur real-time' },
    { href: '/dashboard/menus', icon: '🍜', label: 'Manajemen Menu', desc: 'Kelola menu & stok harian' },
    { href: '/dashboard/qr-generator', icon: '📱', label: 'QR Meja', desc: 'Generate QR code meja' },
    { href: '/dashboard/financial', icon: '📊', label: 'Laporan Keuangan', desc: 'Buku kas & laporan' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">🍜 Dashboard Kasir</h1>
          <p className="text-xs text-red-100">Halo, {user.name} ({user.role})</p>
        </div>
        <button onClick={logout} className="text-sm bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30">
          Keluar
        </button>
      </header>

      {/* Notification Banner */}
      {notification && (
        <div className="bg-green-500 text-white px-4 py-3 text-sm font-medium flex items-center gap-2 animate-pulse">
          🔔 {notification}
        </div>
      )}

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className={`card ${s.color}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-bold text-lg leading-tight">{s.value}</div>
              <div className="text-xs opacity-75">{s.label} hari ini</div>
            </div>
          ))}
        </div>

        {/* Nav Grid */}
        <div className="grid grid-cols-2 gap-3">
          {menus.map((m) => (
            <Link key={m.href} href={m.href} className="card hover:shadow-md transition-shadow flex flex-col gap-2">
              <span className="text-3xl">{m.icon}</span>
              <div>
                <div className="font-semibold text-sm">{m.label}</div>
                <div className="text-xs text-gray-500">{m.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
