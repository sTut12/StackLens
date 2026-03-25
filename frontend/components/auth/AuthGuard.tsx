'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Layers } from 'lucide-react'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center bg-grid">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-[6px] border-gray-200 rounded-full" />
          <div className="absolute inset-0 border-[6px] border-[#111111] rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-[#FF5500] rounded-full border-2 border-[#111111] animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#111111] bg-white flex items-center justify-center">
            <Layers className="w-4 h-4 text-[#111111]" />
          </div>
          <p className="font-black uppercase tracking-[0.2em] text-sm text-[#111111]">Authenticating...</p>
        </div>
      </div>
    </div>
  )

  if (!user) return null
  return <>{children}</>
}
