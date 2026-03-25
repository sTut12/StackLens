'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AnalysisResult } from '@/types'
import { Zap, Shield, Globe, FileText, Server, HardDrive } from 'lucide-react'

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const increment = value / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.round(start))
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])
  return <>{display}</>
}

function ProgressRing({ value, max, size = 80, strokeWidth = 6, color }: { value: number; max: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(100, (value / max) * 100)
  const offset = circumference - (pct / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  )
}

function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  )
}

export default function TabPerformance({ result }: { result: AnalysisResult }) {
  const perf = result.performance

  if (!perf) return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Performance</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 glass-card rounded-2xl">
          <div className="flex items-center gap-2 mb-3 text-cyan text-sm font-semibold">
            <Globe size={14} /> Hosting
          </div>
          <div className="text-2xl font-bold text-white">{result.stack.hosting || 'Detected'}</div>
          <div className="text-slate-600 text-xs mt-1">Hosting provider</div>
        </div>
        <div className="p-6 glass-card rounded-2xl">
          <div className="flex items-center gap-2 mb-3 text-purple text-sm font-semibold">
            <HardDrive size={14} /> CDN
          </div>
          <div className="text-2xl font-bold text-white">{result.stack.cdn || 'Unknown'}</div>
          <div className="text-slate-600 text-xs mt-1">Content delivery</div>
        </div>
        <div className="col-span-full p-5 glass-card rounded-2xl text-sm text-slate-500 border border-amber/10">
          <div className="flex items-center gap-2 text-amber mb-1 font-medium"><Zap size={14} /> Limited Data</div>
          Performance metrics are collected during the scraping process. Re-analyze for full metrics.
        </div>
      </div>
    </div>
  )

  const speedColor = perf.speed_rating === 'Fast' ? '#10B981' : perf.speed_rating === 'Medium' ? '#F59E0B' : '#EF4444'
  const speedBg = perf.speed_rating === 'Fast' ? 'bg-emerald' : perf.speed_rating === 'Medium' ? 'bg-amber' : 'bg-red-500'
  const speedPct = Math.max(0, Math.min(100, ((3000 - perf.load_time_ms) / 3000) * 100))

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Performance</h2>
        <p className="text-slate-500 text-sm">Live metrics for <span className="text-cyan">{result.domain}</span></p>
      </div>

      {/* Main speed card */}
      <div className="glass-card rounded-2xl p-8 mb-6 flex items-center gap-10">
        <div className="relative">
          <ProgressRing value={speedPct} max={100} size={120} strokeWidth={8} color={speedColor} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-black text-white"><AnimatedNumber value={perf.load_time_ms} /></div>
            <div className="text-slate-600 text-xs">ms</div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${speedBg} text-bg`}>{perf.speed_rating}</span>
            <span className="text-slate-500 text-sm">Page Load Speed</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
            {perf.speed_rating === 'Fast' && 'Excellent performance! This site loads faster than 90% of websites.'}
            {perf.speed_rating === 'Medium' && 'Decent speed. Could be improved with better caching or CDN.'}
            {perf.speed_rating === 'Slow' && 'This site is slow. Consider optimizing images, scripts, and server response time.'}
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 stagger-children">
        {[
          { icon: Zap, label: 'Load Time', val: `${perf.load_time_ms}ms`, color: 'text-cyan', hint: perf.speed_rating },
          { icon: FileText, label: 'Page Size', val: `${perf.page_size_kb}KB`, color: 'text-purple', hint: '' },
          { icon: Shield, label: 'HTTPS', val: perf.https ? 'Yes' : 'No', color: perf.https ? 'text-emerald' : 'text-red-400', hint: '' },
          { icon: Globe, label: 'Status', val: String(perf.status_code), color: perf.status_code === 200 ? 'text-emerald' : 'text-amber', hint: '' },
        ].map(({ icon: Icon, label, val, color, hint }) => (
          <motion.div
            key={label}
            whileHover={{ scale: 1.03 }}
            className="p-5 glass-card rounded-2xl text-center"
          >
            <Icon size={18} className={`${color} mx-auto mb-2.5`} />
            <div className={`text-xl font-bold ${color}`}>{val}</div>
            <div className="text-slate-600 text-xs mt-1">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Detailed metrics */}
      <div className="space-y-4">
        <div className="p-5 glass-card rounded-2xl">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-slate-400">Load Speed</span>
            <span className="text-white font-mono">{perf.load_time_ms}ms</span>
          </div>
          <Meter value={3000 - Math.min(perf.load_time_ms, 3000)} max={3000} color={speedBg} />
          <div className="flex justify-between text-[11px] text-slate-700 mt-2">
            <span>Slow (3s+)</span><span>Fast (&lt;500ms)</span>
          </div>
        </div>
        <div className="p-5 glass-card rounded-2xl">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Compression</span>
            <span className={perf.compression ? 'text-emerald' : 'text-amber'}>{perf.compression ? 'Enabled (gzip)' : 'Not detected'}</span>
          </div>
          <div className="flex gap-6 mt-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Server size={12} /> {perf.server}
            </div>
            <div className="text-xs text-slate-700">
              Cache: {perf.cache_control}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
