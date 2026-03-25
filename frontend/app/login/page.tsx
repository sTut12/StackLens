'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import AuthCard from '@/components/auth/AuthCard'
import Link from 'next/link'
import { Eye, EyeOff, AlertTriangle, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields'); return }
    setError(''); setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace('/')
    } catch (err: any) {
      const c = err?.code || ''
      if (c === 'auth/user-not-found' || c === 'auth/wrong-password' || c === 'auth/invalid-credential')
        setError('Wrong email or password. Please try again.')
      else if (c === 'auth/too-many-requests')
        setError('Too many attempts. Try again later.')
      else setError('Sign in failed. Please try again.')
    } finally { setLoading(false) }
  }

  const inputCls = "w-full border-4 border-[#111111] bg-gray-50 p-4 font-bold text-[#111111] focus:outline-none focus:bg-white focus:border-[#FF5500] rounded-xl transition-all text-sm"

  return (
    <AuthCard title="Welcome Back" subtitle="Sign in to your StackLens account to start analyzing websites.">
      <form onSubmit={handle} className="space-y-5">
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Email</label>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="developer@example.com" className={inputCls} disabled={loading} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Password</label>
            <Link href="/forgot-password" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#FF5500] transition-colors">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••" className={inputCls + ' pr-14'} disabled={loading} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111111] transition-colors">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading || !email || !password}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 border-2 border-[#111111] bg-[#111111] text-white hover:bg-[#FF5500] hover:shadow-[4px_4px_0_0_rgba(17,17,17,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-2">
          {loading ? (
            <span className="flex gap-1.5">
              <span className="dot-1 w-2 h-2 bg-white rounded-full inline-block" />
              <span className="dot-2 w-2 h-2 bg-white rounded-full inline-block" />
              <span className="dot-3 w-2 h-2 bg-white rounded-full inline-block" />
            </span>
          ) : (
            <>Authenticate <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-0.5 bg-gray-200" />
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">OR</span>
          <div className="flex-1 h-0.5 bg-gray-200" />
        </div>

        <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-500">
          No account?{' '}
          <Link href="/signup" className="text-[#FF5500] hover:underline">Create One →</Link>
        </p>
      </form>
    </AuthCard>
  )
}
