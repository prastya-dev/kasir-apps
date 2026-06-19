import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/store/auth'

export default function Home() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [user, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-600" />
    </div>
  )
}
