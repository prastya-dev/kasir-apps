import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import api from '@/lib/api'
import { useCartStore } from '@/store/cart'
import { formatRupiah } from '@/lib/format'

interface Menu {
  id: string
  name: string
  description?: string
  price: number
  dailyStock: number
  isAvailable: boolean
}

export default function OrderPage() {
  const router = useRouter()
  const { table } = router.query
  const { items, addItem, updateQuantity, total, clearCart, setTable } = useCartStore()
  const [menus, setMenus] = useState<Menu[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cashless'>('cashless')
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (table) setTable(table as string)
    api.get('/menus').then((r) => setMenus(r.data))
  }, [table, setTable])

  const handleCheckout = async () => {
    if (items.length === 0) return
    setLoading(true)
    try {
      const res = await api.post('/orders', {
        orderType: 'dine_in',
        tableNumber: table as string,
        paymentMethod,
        items: items.map((i) => ({ menuId: i.menuId, quantity: i.quantity, notes: i.notes })),
      })
      clearCart()
      setOrderId(res.data.id)
    } catch (e: any) {
      alert(e.response?.data?.error || 'Gagal membuat pesanan')
    } finally {
      setLoading(false)
    }
  }

  if (orderId) {
    return <OrderTracker orderId={orderId} tableNumber={table as string} />
  }

  const availableMenus = menus.filter((m) => m.isAvailable && m.dailyStock > 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-primary-600 text-white px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">🍜 Bakso & Es Teh</h1>
            {table && <p className="text-xs text-red-100">Meja {table}</p>}
          </div>
          {items.length > 0 && (
            <span className="bg-white text-primary-600 text-xs font-bold px-2 py-1 rounded-full">
              {items.reduce((s, i) => s + i.quantity, 0)} item
            </span>
          )}
        </div>
      </header>

      {/* Menu */}
      <div className="p-4 space-y-3">
        {availableMenus.map((menu) => {
          const inCart = items.find((i) => i.menuId === menu.id)
          return (
            <div key={menu.id} className="card flex items-center gap-3">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                {menu.name.toLowerCase().includes('es') ? '🧊' : '🍜'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{menu.name}</div>
                <div className="text-primary-600 font-bold">{formatRupiah(Number(menu.price))}</div>
                <div className="text-xs text-gray-400">Sisa {menu.dailyStock} porsi</div>
              </div>
              {inCart ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => updateQuantity(menu.id, inCart.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 font-bold">−</button>
                  <span className="w-5 text-center font-bold">{inCart.quantity}</span>
                  <button onClick={() => updateQuantity(menu.id, inCart.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-primary-600 text-white font-bold">+</button>
                </div>
              ) : (
                <button onClick={() => addItem({ menuId: menu.id, name: menu.name, price: Number(menu.price) })}
                  className="w-8 h-8 rounded-full bg-primary-600 text-white font-bold flex-shrink-0">+</button>
              )}
            </div>
          )
        })}
      </div>

      {/* Checkout Bar */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'cashless')}
              className="input text-sm flex-1">
              <option value="cashless">📱 Cashless / QRIS</option>
              <option value="cash">💵 Bayar di Kasir</option>
            </select>
          </div>
          <button onClick={handleCheckout} disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-between">
            <span>{loading ? 'Memproses...' : 'Pesan Sekarang'}</span>
            <span className="font-bold">{formatRupiah(total())}</span>
          </button>
        </div>
      )}
    </div>
  )
}

function OrderTracker({ orderId, tableNumber }: { orderId: string; tableNumber: string }) {
  const [order, setOrder] = useState<any>(null)
  const { connectSocket } = require('@/lib/socket')

  useEffect(() => {
    api.get(`/orders/${orderId}`).then((r) => setOrder(r.data))

    const { connectSocket } = require('@/lib/socket')
    const socket = connectSocket(`order-${orderId}`)
    socket.on('order-status-update', (data: any) => {
      setOrder((prev: any) => ({ ...prev, ...data }))
    })
    return () => socket.off('order-status-update')
  }, [orderId])

  const steps = [
    { key: 'unpaid', label: 'Menunggu Pembayaran', icon: '💳' },
    { key: 'paid_pending', label: 'Diterima Dapur', icon: '✅' },
    { key: 'dimasak', label: 'Sedang Dimasak', icon: '🔥' },
    { key: 'selesai', label: 'Siap Disajikan!', icon: '🎉' },
  ]

  const getStepIndex = () => {
    if (order?.paymentStatus === 'unpaid') return 0
    if (order?.orderStatus === 'pending') return 1
    if (order?.orderStatus === 'dimasak') return 2
    if (order?.orderStatus === 'selesai') return 3
    return 0
  }

  const currentStep = getStepIndex()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{steps[currentStep]?.icon}</div>
          <h2 className="text-xl font-bold">{steps[currentStep]?.label}</h2>
          <p className="text-sm text-gray-500 mt-1">Meja {tableNumber}</p>
        </div>

        <div className="space-y-3 mb-8">
          {steps.map((step, i) => (
            <div key={step.key} className={`flex items-center gap-3 p-3 rounded-xl ${i <= currentStep ? 'bg-primary-50 border border-primary-200' : 'bg-gray-100'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= currentStep ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
                {i < currentStep ? '✓' : i + 1}
              </div>
              <span className={`text-sm font-medium ${i <= currentStep ? 'text-primary-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <Link href={`/order?table=${tableNumber}`}
          className="btn-secondary w-full text-center block py-3">
          Pesan Lagi
        </Link>
      </div>
    </div>
  )
}
