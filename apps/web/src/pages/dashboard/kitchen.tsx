import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { connectSocket } from '@/lib/socket'
import { formatDate } from '@/lib/format'

interface KitchenOrder {
  id: string
  invoiceNumber: string
  tableNumber?: string
  orderStatus: string
  createdAt: string
  items: Array<{ menu: { name: string }; quantity: number; notes?: string }>
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([])

  const fetchOrders = () => api.get('/orders/kitchen').then((r) => setOrders(r.data))

  useEffect(() => {
    fetchOrders()
    const socket = connectSocket('kitchen')
    socket.on('new-kitchen-order', fetchOrders)
    socket.on('order-updated', fetchOrders)
    return () => {
      socket.off('new-kitchen-order', fetchOrders)
      socket.off('order-updated', fetchOrders)
    }
  }, [])

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/orders/${id}/status`, { orderStatus: status })
    fetchOrders()
  }

  const pending = orders.filter((o) => o.orderStatus === 'pending')
  const cooking = orders.filter((o) => o.orderStatus === 'dimasak')

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">←</Link>
        <h1 className="font-bold text-lg">👨‍🍳 Kitchen Display System</h1>
        <span className="ml-auto text-xs text-gray-400">Auto-refresh via WebSocket</span>
      </header>

      <div className="p-4 grid md:grid-cols-2 gap-4">
        {/* Pending orders */}
        <div>
          <h2 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
            ⏳ Antrian ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((order) => (
              <div key={order.id} className="bg-gray-800 rounded-xl p-4 border border-yellow-500/30">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-yellow-400">
                    {order.tableNumber ? `Meja ${order.tableNumber}` : 'Takeaway'}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                </div>
                {order.items.map((item, i) => (
                  <div key={i} className="text-sm mb-1">
                    <span className="font-semibold">{item.quantity}x {item.menu.name}</span>
                    {item.notes && <span className="text-gray-400 ml-2 italic">— {item.notes}</span>}
                  </div>
                ))}
                <button
                  onClick={() => updateStatus(order.id, 'dimasak')}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold"
                >
                  Mulai Masak →
                </button>
              </div>
            ))}
            {pending.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Tidak ada antrian</p>}
          </div>
        </div>

        {/* Cooking orders */}
        <div>
          <h2 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
            🔥 Sedang Dimasak ({cooking.length})
          </h2>
          <div className="space-y-3">
            {cooking.map((order) => (
              <div key={order.id} className="bg-gray-800 rounded-xl p-4 border border-blue-500/30">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-blue-400">
                    {order.tableNumber ? `Meja ${order.tableNumber}` : 'Takeaway'}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                </div>
                {order.items.map((item, i) => (
                  <div key={i} className="text-sm mb-1">
                    <span className="font-semibold">{item.quantity}x {item.menu.name}</span>
                    {item.notes && <span className="text-gray-400 ml-2 italic">— {item.notes}</span>}
                  </div>
                ))}
                <button
                  onClick={() => updateStatus(order.id, 'selesai')}
                  className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold"
                >
                  ✅ Selesai / Sajikan
                </button>
              </div>
            ))}
            {cooking.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Tidak ada pesanan dimasak</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
