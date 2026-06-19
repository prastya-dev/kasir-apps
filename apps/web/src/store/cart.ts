import { create } from 'zustand'

export interface CartItem {
  menuId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

interface CartState {
  items: CartItem[]
  tableNumber?: string
  setTable: (table: string) => void
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (menuId: string) => void
  updateQuantity: (menuId: string, qty: number) => void
  updateNotes: (menuId: string, notes: string) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableNumber: undefined,
  setTable: (table) => set({ tableNumber: table }),
  addItem: (item) => {
    const existing = get().items.find((i) => i.menuId === item.menuId)
    if (existing) {
      set({ items: get().items.map((i) => i.menuId === item.menuId ? { ...i, quantity: i.quantity + 1 } : i) })
    } else {
      set({ items: [...get().items, { ...item, quantity: 1 }] })
    }
  },
  removeItem: (menuId) => set({ items: get().items.filter((i) => i.menuId !== menuId) }),
  updateQuantity: (menuId, qty) => {
    if (qty <= 0) {
      get().removeItem(menuId)
    } else {
      set({ items: get().items.map((i) => i.menuId === menuId ? { ...i, quantity: qty } : i) })
    }
  },
  updateNotes: (menuId, notes) =>
    set({ items: get().items.map((i) => i.menuId === menuId ? { ...i, notes } : i) }),
  clearCart: () => set({ items: [] }),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}))
