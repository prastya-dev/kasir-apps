import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { formatRupiah } from '@/lib/format'

interface Menu {
  id: string
  name: string
  price: number
  costPerPortion: number
  dailyStock: number
  isAvailable: boolean
}

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [stockEdit, setStockEdit] = useState<Record<string, number>>({})

  const fetchMenus = () => api.get('/menus').then((r) => setMenus(r.data))

  useEffect(() => { fetchMenus() }, [])

  const toggleAvailable = async (id: string, current: boolean) => {
    await api.patch(`/menus/${id}`, { isAvailable: !current })
    fetchMenus()
  }

  const saveStock = async (id: string) => {
    const stock = stockEdit[id]
    if (stock === undefined) return
    await api.patch(`/menus/${id}/stock`, { dailyStock: stock })
    setEditing(null)
    fetchMenus()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-white/80 hover:text-white">←</Link>
        <h1 className="font-bold">🍜 Manajemen Menu</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        <div className="space-y-3">
          {menus.map((menu) => (
            <div key={menu.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{menu.name}</div>
                  <div className="text-sm text-gray-600">
                    Jual: {formatRupiah(Number(menu.price))} · HPP: {formatRupiah(Number(menu.costPerPortion))}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Laba/porsi: {formatRupiah(Number(menu.price) - Number(menu.costPerPortion))}
                  </div>
                </div>
                <button
                  onClick={() => toggleAvailable(menu.id, menu.isAvailable)}
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    menu.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {menu.isAvailable ? 'Tersedia' : 'Habis'}
                </button>
              </div>

              {/* Stok harian */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-sm text-gray-600">Stok hari ini:</span>
                {editing === menu.id ? (
                  <>
                    <input
                      type="number"
                      value={stockEdit[menu.id] ?? menu.dailyStock}
                      onChange={(e) => setStockEdit({ ...stockEdit, [menu.id]: parseInt(e.target.value) })}
                      className="input w-20 text-sm"
                      min={0}
                    />
                    <button onClick={() => saveStock(menu.id)} className="text-xs bg-primary-600 text-white px-2 py-1 rounded">Simpan</button>
                    <button onClick={() => setEditing(null)} className="text-xs text-gray-500">Batal</button>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-gray-800">{menu.dailyStock} porsi</span>
                    <button onClick={() => { setEditing(menu.id); setStockEdit({ ...stockEdit, [menu.id]: menu.dailyStock }) }}
                      className="text-xs text-primary-600 underline">Edit</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
