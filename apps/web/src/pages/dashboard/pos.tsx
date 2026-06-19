import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import api from '@/lib/api'
import { formatRupiah } from '@/lib/format'

interface Menu {
  id: string
  name: string
  price: number
  dailyStock: number
  isAvailable: boolean
}

export default function POSPage() {
  const { user } = useAuthStore()
  const { items, addItem, updateQuantity, total, clearCart } = useCartStore()
  const [menus, setMenus] = useState<Menu[]>([])
  const [tableNumber, setTableNumber] = useState('')
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cashless'>('cash')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.get('/menus').then((r) => setMenus(r.data))
  }, [])

  const handleOrder = async () => {
    if (items.length === 0) return
    setLoading(true)
    try {
      await api.post('/orders', {
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        paymentMethod,
        items: items.map((i) => ({ menuId: i.menuId, quantity: i.quantity, notes: i.notes })),
      })
      setSuccess('Pesanan berhasil dibuat!')
      clearCart()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      alert(e.response?.data?.error || 'Gagal membuat pesanan')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-white/80 hover:text-white">←</Link>
        <h1 className="font-bold">🖥️ POS Kasir</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Menu List */}
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {menus.filter((m) => m.isAvailable && m.dailyStock > 0).map((menu) => (
              <button
                key={menu.id}
                onClick={() => addItem({ menuId: menu.id, name: menu.name, price: Number(menu.price) })}
                className="bg-white rounded-lg p-3 text-left border border-gray-100 hover:border-primary-400 hover:shadow-sm transition-all"
              >
                <div className="font-semibold text-sm leading-tight">{menu.name}</div>
                <div className="text-primary-600 font-bold text-sm mt-1">{formatRupiah(Number(menu.price))}</div>
                <div className="text-xs text-gray-400">Sisa: {menu.dailyStock}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-3 border-b bg-gray-50">
            <div className="flex gap-2 mb-2">
              <select value={orderType} onChange={(e) => setOrderType(e.target.value as 'dine_in' | 'takeaway')}
                className="input text-xs flex-1">
                <option value="dine_in">Dine In</option>
                <option value="takeaway">Takeaway</option>
              </select>
              {orderType === 'dine_in' && (
                <input placeholder="No. Meja" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)}
                  className="input text-xs w-20" />
              )}
            </div>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'cashless')}
              className="input text-xs">
              <option value="cash">💵 Tunai</option>
              <option value="cashless">📱 Cashless / QRIS</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Keranjang kosong</p>
            ) : (
              items.map((item) => (
                <div key={item.menuId} className="flex items-center gap-2 py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{item.name}</div>
                    <div className="text-xs text-primary-600">{formatRupiah(item.price * item.quantity)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.menuId, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-gray-100 text-sm font-bold hover:bg-gray-200">−</button>
                    <span className="text-xs w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.menuId, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-gray-100 text-sm font-bold hover:bg-gray-200">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t bg-gray-50">
            {success && <p className="text-green-600 text-xs text-center mb-2 font-medium">{success}</p>}
            <div className="flex justify-between font-bold mb-3">
              <span>Total</span>
              <span className="text-primary-600">{formatRupiah(total())}</span>
            </div>
            <button onClick={handleOrder} disabled={loading || items.length === 0}
              className="btn-primary w-full">
              {loading ? 'Memproses...' : 'Buat Pesanan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
