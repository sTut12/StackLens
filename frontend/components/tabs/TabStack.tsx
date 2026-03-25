'use client'
import { motion } from 'framer-motion'
import { AnalysisResult } from '@/types'
import { Globe, Layers, BarChart2, Lock, Database, Cloud, CreditCard, Package, Code2, Cpu, Server, Palette } from 'lucide-react'

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; gradient: string }> = {
  framework: { icon: Layers, color: 'text-cyan', gradient: 'from-cyan/15 to-cyan/5' },
  styling: { icon: Palette, color: 'text-purple', gradient: 'from-purple/15 to-purple/5' },
  hosting: { icon: Cloud, color: 'text-sky', gradient: 'from-sky/15 to-sky/5' },
  cdn: { icon: Globe, color: 'text-sky', gradient: 'from-sky/15 to-sky/5' },
  analytics: { icon: BarChart2, color: 'text-amber', gradient: 'from-amber/15 to-amber/5' },
  auth: { icon: Lock, color: 'text-emerald', gradient: 'from-emerald/15 to-emerald/5' },
  database: { icon: Database, color: 'text-purple', gradient: 'from-purple/15 to-purple/5' },
  cms: { icon: Package, color: 'text-amber', gradient: 'from-amber/15 to-amber/5' },
  payments: { icon: CreditCard, color: 'text-emerald', gradient: 'from-emerald/15 to-emerald/5' },
  language: { icon: Code2, color: 'text-cyan', gradient: 'from-cyan/15 to-cyan/5' },
  orm: { icon: Database, color: 'text-sky', gradient: 'from-sky/15 to-sky/5' },
  server: { icon: Server, color: 'text-slate-300', gradient: 'from-slate-500/15 to-slate-500/5' },
  platform: { icon: Globe, color: 'text-amber', gradient: 'from-amber/15 to-amber/5' },
}

const DEFAULT_META = { icon: Cpu, color: 'text-slate-300', gradient: 'from-slate-500/15 to-slate-500/5' }

export default function TabStack({ result }: { result: AnalysisResult }) {
  const entries = Object.entries(result.stack)

  if (entries.length === 0) return (
    <div className="text-center py-24">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-5">
        <Globe size={28} className="text-slate-600" />
      </div>
      <p className="text-slate-500 text-base">No tech stack detected for this site.</p>
      <p className="text-slate-700 text-sm mt-2">Try a different URL or check if the site is accessible.</p>
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Tech Stack</h2>
        <p className="text-slate-500 text-sm">{entries.length} technologies detected on <span className="text-cyan">{result.domain}</span></p>
      </div>

      {/* Tech grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 stagger-children">
        {entries.map(([key, val], i) => {
          const meta = CATEGORY_META[key.toLowerCase()] || DEFAULT_META
          const Icon = meta.icon
          return (
            <motion.div
              key={key}
              whileHover={{ scale: 1.02 }}
              className={`p-5 rounded-2xl glass-card border border-white/[0.04] group`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0 group-hover:shadow-glow-sm transition-shadow`}>
                  <Icon size={18} className={meta.color} />
                </div>
                <div className="min-w-0">
                  <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-1 font-medium">{key}</div>
                  <div className={`font-bold text-base ${meta.color} break-words`}>{val}</div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Detection method */}
      <div className="p-4 glass-card rounded-xl flex items-start gap-3 text-sm">
        <span className="text-amber mt-0.5">⚡</span>
        <div>
          <span className="text-slate-300 font-medium">Detection method: </span>
          <span className="text-slate-500">{result.scrape_method.replace(/_/g, ' ')}
            {result.scrape_method === 'playwright' && ' — full JavaScript rendering, highest accuracy'}
            {result.scrape_method === 'requests' && ' — HTML-only scraping, good accuracy for static sites'}
            {result.scrape_method === 'headers_only' && ' — headers only, partial detection'}
            {result.scrape_method === 'ai_inference' && ' — AI inference from domain, estimated results'}
          </span>
        </div>
      </div>

      {/* UI components */}
      {result.ui_components.length > 0 && (
        <div className="mt-8">
          <h3 className="text-base font-bold text-white mb-4">UI Components Detected</h3>
          <div className="flex flex-wrap gap-2 stagger-children">
            {result.ui_components.map(comp => (
              <span key={comp} className="px-3 py-1.5 glass-card rounded-lg text-slate-300 text-sm">
                {comp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
