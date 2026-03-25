'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getHistory } from '@/lib/api'
import { HistoryItem } from '@/types'
import { ArrowLeft, Clock, Globe, ArrowRight, Layers, Zap } from 'lucide-react'
import AuthGuard from '@/components/auth/AuthGuard'

function HistoryInner() {
  const router  = useRouter()
  const [items,   setItems]   = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory().then(setItems).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fmt = (ts: number) => {
    const diff = Date.now() - ts * 1000
    const mins = Math.floor(diff / 60000)
    if (mins < 1)  return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const h = Math.floor(mins / 60)
    if (h < 24)    return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 7)     return `${d}d ago`
    return new Date(ts * 1000).toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] bg-grid">
      <nav className="fixed top-0 w-full z-50 bg-[#F5F5F0]/95 backdrop-blur-md border-b-2 border-[#111111]">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs text-gray-500 hover:text-[#111111] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-7 h-7 rounded-full border-2 border-[#111111] bg-white flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-[#111111]" />
            </div>
            <span className="font-black uppercase tracking-tight text-base">StackLens</span>
          </div>
          <div className="ml-auto">
            <h1 className="font-black uppercase tracking-widest text-sm">Analysis History</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-[5px] border-gray-200 rounded-full" />
              <div className="absolute inset-0 border-[5px] border-[#111111] rounded-full border-t-transparent animate-spin" />
            </div>
            <p className="font-bold uppercase tracking-widest text-sm text-gray-500">Loading history...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-24 h-24 rounded-full border-4 border-[#111111] bg-white flex items-center justify-center mx-auto mb-8 shadow-[8px_8px_0_0_#111111]">
              <Clock className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-3xl font-black font-display uppercase tracking-widest mb-4">No History Yet</h2>
            <p className="text-gray-600 font-medium mb-10">Analyze a website to see it appear here.</p>
            <button onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs border-2 border-[#111111] bg-[#111111] text-white hover:bg-[#FF5500] hover:shadow-[4px_4px_0_0_rgba(17,17,17,0.3)] transition-all">
              <Zap className="w-4 h-4" /> Analyze a Site
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black font-display uppercase tracking-tight flex items-center gap-3">
                <Clock className="w-7 h-7 text-[#FF5500]" /> Recent Scans
              </h2>
              <span className="bg-[#111111] text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest">{items.length} Total</span>
            </div>
            <div className="space-y-3 stagger">
              {items.map((item, i) => (
                <button key={i}
                  onClick={() => router.push(`/analyze/${encodeURIComponent(item.url)}`)}
                  className="w-full flex items-center gap-5 p-5 bg-white border-2 border-[#111111] rounded-[1.5rem] hover:shadow-[6px_6px_0_0_#111111] hover:-translate-y-0.5 transition-all text-left group">
                  <div className="w-12 h-12 rounded-full border-2 border-[#111111] bg-[#F5F5F0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF5500] group-hover:border-[#FF5500] transition-all">
                    <Globe className="w-6 h-6 text-[#111111] group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black uppercase tracking-widest text-sm truncate text-[#111111]">
                      {item.url.replace(/^https?:\/\//, '')}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {item.summary && <span className="text-xs text-gray-500 font-medium flex items-center gap-1"><Zap className="w-3 h-3" />{item.summary}</span>}
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{fmt(item.timestamp)}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#FF5500] transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="border-t-2 border-[#111111] px-6 py-5 bg-[#F5F5F0]">
        <div className="max-w-7xl mx-auto text-center text-xs font-bold uppercase tracking-widest text-gray-400">
          StackLens · Delvrixo Syndicate · HackIndia Spark 4
        </div>
      </footer>
    </div>
  )
}

export default function HistoryPage() {
  return <AuthGuard><HistoryInner /></AuthGuard>
}
