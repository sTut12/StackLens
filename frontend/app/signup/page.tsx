'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import AuthCard from '@/components/auth/AuthCard'
import Link from 'next/link'
import { Eye, EyeOff, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [showCf,   setShowCf]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
  const pwColors   = ['', '#EF4444', '#F59E0B', '#22C55E']
  const pwLabels   = ['', 'Weak', 'Fair', 'Strong']

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password || !confirm) { setError('Please fill in all fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(''); setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      router.replace('/')
    } catch (err: any) {
      const c = err?.code || ''
      if (c === 'auth/email-already-in-use') setError('Email already registered. Sign in instead.')
      else if (c === 'auth/weak-password')   setError('Password is too weak. Use 8+ characters.')
      else if (c === 'auth/invalid-email')   setError('Enter a valid email address.')
      else setError('Account creation failed. Please try again.')
    } finally { setLoading(false) }
  }

  const inputCls = "w-full border-4 border-[#111111] bg-gray-50 p-4 font-bold text-[#111111] focus:outline-none focus:bg-white focus:border-[#FF5500] rounded-xl transition-all text-sm"

  return (
    <AuthCard title="Create Account" subtitle="Join StackLens — analyze any website's architecture for free.">
      <form onSubmit={handle} className="space-y-4">
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Full Name</label>
          <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }}
            placeholder="Your name" className={inputCls} disabled={loading} />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Email</label>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="developer@example.com" className={inputCls} disabled={loading} />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Min. 8 characters" className={inputCls + ' pr-14'} disabled={loading} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111111] transition-colors">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1 flex-1">
                {[1,2,3].map(l => (
                  <div key={l} className="flex-1 h-2 rounded-full border border-gray-200 transition-all duration-300"
                    style={{ background: pwStrength >= l ? pwColors[pwStrength] : '#E5E7EB' }} />
                ))}
              </div>
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: pwColors[pwStrength] }}>{pwLabels[pwStrength]}</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Confirm Password</label>
          <div className="relative">
            <input type={showCf ? 'text' : 'password'} value={confirm}
              onChange={e => { setConfirm(e.target.value); setError('') }}
              placeholder="Repeat password"
              className={inputCls + ' pr-14 ' + (confirm && confirm !== password ? '!border-red-400' : confirm && confirm === password ? '!border-green-500' : '')}
              disabled={loading} />
            <button type="button" onClick={() => setShowCf(!showCf)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111111] transition-colors">
              {showCf ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            {confirm && confirm === password && <CheckCircle2 className="absolute right-14 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
          </div>
        </div>

        <button type="submit" disabled={loading || !name || !email || !password || !confirm}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 border-2 border-[#111111] bg-[#111111] text-white hover:bg-[#FF5500] hover:shadow-[4px_4px_0_0_rgba(17,17,17,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-2">
          {loading ? (
            <span className="flex gap-1.5">
              <span className="dot-1 w-2 h-2 bg-white rounded-full inline-block" />
              <span className="dot-2 w-2 h-2 bg-white rounded-full inline-block" />
              <span className="dot-3 w-2 h-2 bg-white rounded-full inline-block" />
            </span>
          ) : (
            <>Initialize Account <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-0.5 bg-gray-200" />
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">OR</span>
          <div className="flex-1 h-0.5 bg-gray-200" />
        </div>

        <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-[#FF5500] hover:underline">Sign In →</Link>
        </p>
      </form>
    </AuthCard>
  )
}
