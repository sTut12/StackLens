'use client'
import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import AuthCard from '@/components/auth/AuthCard'
import Link from 'next/link'
import { Mail, AlertTriangle, CheckCircle2, ArrowLeft, Send } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sent,    setSent]    = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email address'); return }
    setError(''); setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch (err: any) {
      const c = err?.code || ''
      if (c === 'auth/user-not-found')    setError('No account found with this email.')
      else if (c === 'auth/invalid-email') setError('Enter a valid email address.')
      else setError('Failed to send reset email. Please try again.')
    } finally { setLoading(false) }
  }

  const inputCls = "w-full border-4 border-[#111111] bg-gray-50 p-4 pl-14 font-bold text-[#111111] focus:outline-none focus:bg-white focus:border-[#FF5500] rounded-xl transition-all text-sm"

  return (
    <AuthCard title="Reset Password" subtitle="Enter your email and we'll send a secure reset link.">
      {sent ? (
        <div className="flex flex-col items-center text-center gap-6 py-4">
          <div className="w-20 h-20 rounded-full border-4 border-[#111111] bg-green-50 flex items-center justify-center shadow-[6px_6px_0_0_#111111]">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black font-display uppercase tracking-widest mb-2">Check Inbox!</h3>
            <p className="text-gray-600 font-medium leading-relaxed text-sm">
              Reset link sent to<br />
              <span className="text-[#FF5500] font-bold">{email}</span>
            </p>
          </div>
          <p className="text-xs font-bold text-gray-400">
            Didn't receive it?{' '}
            <button onClick={() => { setSent(false); setEmail(''); }} className="text-[#FF5500] hover:underline">Try again</button>
          </p>
          <Link href="/login"
            className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs border-2 border-[#111111] bg-white text-[#111111] hover:bg-gray-100 hover:shadow-[4px_4px_0_0_#111111] transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handle} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Email Address</label>
            <div className="relative">
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="developer@example.com" className={inputCls} disabled={loading} />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <button type="submit" disabled={loading || !email}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 border-2 border-[#111111] bg-[#111111] text-white hover:bg-[#FF5500] hover:shadow-[4px_4px_0_0_rgba(17,17,17,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <span className="flex gap-1.5">
                <span className="dot-1 w-2 h-2 bg-white rounded-full inline-block" />
                <span className="dot-2 w-2 h-2 bg-white rounded-full inline-block" />
                <span className="dot-3 w-2 h-2 bg-white rounded-full inline-block" />
              </span>
            ) : (
              <><Send className="w-4 h-4" /> Send Reset Link</>
            )}
          </button>

          <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-500">
            Remember it?{' '}
            <Link href="/login" className="text-[#FF5500] hover:underline">Sign In →</Link>
          </p>
        </form>
      )}
    </AuthCard>
  )
}
