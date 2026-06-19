import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'kasir' | 'customer'
}

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: () => boolean
  isKasir: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        const { token, user } = res.data
        localStorage.setItem('token', token)
        set({ user, token })
      },
      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null })
      },
      isAdmin: () => get().user?.role === 'admin',
      isKasir: () => ['admin', 'kasir'].includes(get().user?.role || ''),
    }),
    {
      name: 'kasir-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
