'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Globe, Clock, ArrowRight, Layers, LogOut, ChevronDown, User, Zap, Activity, Code2, BarChart2, Shield, Sparkles } from 'lucide-react'
import { getHistory } from '@/lib/api'
import { HistoryItem } from '@/types'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuth } from '@/lib/auth-context'

const DEMO_SITES = ['stripe.com', 'vercel.com', 'linear.app', 'notion.so', 'github.com', 'tailwindcss.com']

const FEATURES = [
  { icon: Globe,    label: 'Tech Stack',       desc: 'Framework, CDN, analytics — 1500+ signatures detected automatically.' },
  { icon: Layers,   label: 'Component Tree',   desc: 'Visual structure: Navbar → Hero → Features → Footer.' },
  { icon: Code2,    label: 'Code Skeleton',    desc: 'Ready-to-use folder structure + component stubs.' },
  { icon: Sparkles, label: 'AI Explanation',   desc: 'Understand WHY every tech choice was made.' },
  { icon: BarChart2,label: 'Performance',      desc: 'Load time, size, HTTPS, compression — in seconds.' },
  { icon: Shield,   label: 'UI Detection',     desc: 'Buttons, modals, carousels — every pattern identified.' },
]

function DashboardInner() {
  const router              = useRouter()
  const { user, logout }    = useAuth()
  const [url, setUrl]       = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [error, setError]   = useState('')
  const [dropOpen, setDropOpen] = useState(false)

  useEffect(() => { getHistory().then(setHistory).catch(() => {}) }, [])

  const handleAnalyze = (target?: string) => {
    const t = (target || url).trim()
    if (!t) { setError('Please enter a URL'); return }
    setError(''); setLoading(true)
    router.push(`/analyze/${encodeURIComponent(t.startsWith('http') ? t : 'https://' + t)}`)
  }

  const handleLogout = async () => { await logout(); router.replace('/') }

  const initial = user?.displayName?.[0] || user?.email?.[0] || 'U'
  const email   = user?.email || ''

  return (
    <div className="min-h-screen bg-[#F5F5F0] bg-grid">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#F5F5F0]/95 backdrop-blur-md border-b-2 border-[#111111]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-9 h-9 rounded-full border-2 border-[#111111] bg-white flex items-center justify-center hover:bg-[#FF5500] hover:border-[#FF5500] transition-all group">
              <Layers className="w-5 h-5 text-[#111111] group-hover:text-white transition-colors" />
            </div>
            <span className="text-lg font-black tracking-tighter uppercase font-display">StackLens</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/history')}
              className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-[#111111] transition-colors">
              <Clock className="w-4 h-4" /> History
            </button>
            <span className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111111] text-white text-[10px] font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
              Ollama Active
            </span>

            <div className="relative">
              <button onClick={() => setDropOpen(!dropOpen)}
                className="flex items-center gap-2 px-3 py-2 border-2 border-[#111111] rounded-full bg-white hover:shadow-[4px_4px_0_0_#111111] transition-all text-sm font-bold">
                <div className="w-6 h-6 rounded-full bg-[#FF5500] border-2 border-[#111111] flex items-center justify-center text-white text-xs font-black">
                  {initial.toUpperCase()}
                </div>
                <span className="hidden sm:block max-w-[120px] truncate text-[11px] font-bold uppercase tracking-widest">{email.split('@')[0]}</span>
                <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border-2 border-[#111111] rounded-[1.5rem] shadow-[8px_8px_0_0_#111111] overflow-hidden z-50">
                  <div className="px-4 py-3 border-b-2 border-[#111111]">
                    <div className="font-black text-sm uppercase tracking-widest truncate">{user?.displayName || 'Developer'}</div>
                    <div className="text-xs text-gray-500 font-medium truncate">{email}</div>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#111111] text-xs font-bold uppercase tracking-widest text-left transition-colors">
                      <User className="w-4 h-4" /> Profile
                    </button>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#FF5500] hover:bg-red-50 text-xs font-bold uppercase tracking-widest text-left transition-colors">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white border-2 border-[#111111] text-[10px] font-bold uppercase tracking-[0.2em] shadow-[4px_4px_0_0_#111111] mb-8">
            <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
            AI-Powered Website Reverse Engineer
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter font-display uppercase leading-[0.9] mb-6">
            Reverse<br /><span className="text-[#FF5500]">Engineer</span><br />Any Website.
          </h1>
          <p className="text-gray-600 text-lg font-medium max-w-xl mx-auto leading-relaxed">
            Paste any URL. StackLens detects the full tech stack, maps the architecture,
            generates a code skeleton, and explains it — in 60 seconds.
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="flex items-center bg-white border-4 border-[#111111] rounded-full p-2 shadow-[8px_8px_0_0_#111111] focus-within:translate-y-1 focus-within:shadow-[4px_4px_0_0_#111111] transition-all duration-200">
            <div className="pl-5 text-[#111111]"><Globe className="w-6 h-6" /></div>
            <input type="text" value={url} onChange={e => { setUrl(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="Enter any URL — e.g. stripe.com or https://example.com"
              className="flex-1 bg-transparent border-none outline-none text-[#111111] px-4 py-3 placeholder:text-gray-400 font-bold text-base" />
            <button onClick={() => handleAnalyze()} disabled={loading || !url.trim()}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full font-bold uppercase tracking-widest text-xs bg-[#111111] text-white hover:bg-[#FF5500] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {loading ? (
                <span className="flex gap-1.5">
                  <span className="dot-1 w-2 h-2 bg-white rounded-full inline-block" />
                  <span className="dot-2 w-2 h-2 bg-white rounded-full inline-block" />
                  <span className="dot-3 w-2 h-2 bg-white rounded-full inline-block" />
                </span>
              ) : (
                <><Zap className="w-4 h-4" /> Analyze</>
              )}
            </button>
          </div>
          {error && <p className="text-red-600 font-bold text-sm mt-3 pl-4">{error}</p>}
        </div>

        {/* Demo sites */}
        <div className="flex flex-wrap items-center gap-2 mb-20 justify-center">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mr-2">Try:</span>
          {DEMO_SITES.map(site => (
            <button key={site} onClick={() => { setUrl(site); handleAnalyze(site); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-[#111111] text-xs font-bold uppercase tracking-widest hover:bg-[#FF5500] hover:text-white hover:border-[#FF5500] hover:shadow-[3px_3px_0_0_#111111] transition-all">
              {site} <ArrowRight className="w-3 h-3" />
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-20">
          {[['60s','Avg Analysis'],['1500+','Tech Signatures'],['4','Fallback Layers'],['∞','Sites Supported']].map(([val,label]) => (
            <div key={label} className="text-center bg-white border-2 border-[#111111] rounded-[1.5rem] p-6 hover:shadow-[4px_4px_0_0_#111111] transition-all">
              <div className="text-3xl font-black font-display text-[#FF5500] mb-1">{val}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mb-20">
          <h2 className="text-3xl font-black font-display uppercase tracking-tight text-center mb-10">
            Everything in <span className="text-[#FF5500]">One Click</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-6 bg-white border-2 border-[#111111] rounded-[1.5rem] hover:shadow-[6px_6px_0_0_#111111] hover:-translate-y-1 hover:border-[#FF5500] transition-all group cursor-default">
                <div className="w-12 h-12 rounded-full border-2 border-[#111111] bg-[#F5F5F0] flex items-center justify-center mb-5 group-hover:bg-[#FF5500] group-hover:border-[#FF5500] transition-all">
                  <Icon className="w-6 h-6 text-[#111111] group-hover:text-white transition-colors" />
                </div>
                <div className="font-black text-[#111111] uppercase tracking-widest text-sm mb-2 font-display">{label}</div>
                <div className="text-gray-500 text-sm leading-relaxed font-medium">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black font-display uppercase tracking-tight flex items-center gap-3">
                <Clock className="w-6 h-6 text-[#FF5500]" /> Recent Analyses
              </h2>
              <button onClick={() => router.push('/history')}
                className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#FF5500] transition-colors flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3 stagger">
              {history.slice(0,5).map((item, i) => (
                <button key={i} onClick={() => handleAnalyze(item.url)}
                  className="w-full flex items-center gap-4 p-5 bg-white border-2 border-[#111111] rounded-[1.5rem] hover:shadow-[6px_6px_0_0_#111111] hover:-translate-y-0.5 transition-all text-left group">
                  <div className="w-10 h-10 rounded-full border-2 border-[#111111] bg-[#F5F5F0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF5500] group-hover:border-[#FF5500] transition-all">
                    <Globe className="w-5 h-5 text-[#111111] group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm uppercase tracking-widest truncate text-[#111111]">{item.url.replace(/^https?:\/\//,'')}</div>
                    {item.summary && <div className="text-xs text-gray-500 font-medium mt-0.5">{item.summary}</div>}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#FF5500] transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t-2 border-[#111111] px-6 py-6 bg-[#F5F5F0]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
          <span>StackLens · Team <span className="text-[#111111]">Delvrixo Syndicate</span> · HackIndia Spark 4 · 2026</span>
          <span>Next.js + FastAPI + Ollama + Firebase</span>
        </div>
      </footer>
    </div>
  )
}

export default function DashboardPage() {
  return <AuthGuard><DashboardInner /></AuthGuard>
}
