import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import { formatRupiah, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/lib/format'

interface Order {
  id: string
  invoiceNumber: string
  tableNumber?: string
  orderType: string
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  createdAt: string
  items: Array<{ menu: { name: string }; quantity: number }>
}

export default function OrdersPage() {
  const { user, isKasir } = useAuthStore()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !isKasir()) { router.replace('/login'); return }
    api.get('/orders').then((r) => { setOrders(r.data); setLoading(false) })
  }, [user, router, isKasir])

  const confirmPayment = async (id: string) => {
    await api.patch(`/orders/${id}/pay`)
    const res = await api.get('/orders')
    setOrders(res.data)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-white/80 hover:text-white">←</Link>
        <h1 className="font-bold">Daftar Pesanan</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Memuat...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Belum ada pesanan hari ini</div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">{order.invoiceNumber}</div>
                    <div className="text-xs text-gray-500">
                      {order.tableNumber ? `Meja ${order.tableNumber}` : 'Takeaway'} · {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLOR[order.orderStatus]}`}>
                    {ORDER_STATUS_LABEL[order.orderStatus]}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {order.items.map((i) => `${i.menu.name} x${i.quantity}`).join(', ')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary-600">{formatRupiah(Number(order.totalAmount))}</span>
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {order.paymentStatus === 'paid' ? 'Lunas' : 'Belum Bayar'}
                    </span>
                    {order.paymentStatus === 'unpaid' && (
                      <button
                        onClick={() => confirmPayment(order.id)}
                        className="text-xs bg-primary-600 text-white px-3 py-1 rounded-lg"
                      >
                        Konfirmasi Bayar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
