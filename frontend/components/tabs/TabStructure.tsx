'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnalysisResult } from '@/types'
import { Layers, ChevronRight, ChevronDown } from 'lucide-react'

const SECTION_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  'Navbar': { border: 'border-cyan/20', bg: 'bg-cyan/5', text: 'text-cyan', dot: 'bg-cyan' },
  'Hero Section': { border: 'border-purple/20', bg: 'bg-purple/5', text: 'text-purple', dot: 'bg-purple' },
  'Features Section': { border: 'border-emerald/20', bg: 'bg-emerald/5', text: 'text-emerald', dot: 'bg-emerald' },
  'Pricing Section': { border: 'border-amber/20', bg: 'bg-amber/5', text: 'text-amber', dot: 'bg-amber' },
  'Testimonials': { border: 'border-sky/20', bg: 'bg-sky/5', text: 'text-sky', dot: 'bg-sky' },
  'FAQ Section': { border: 'border-purple/20', bg: 'bg-purple/5', text: 'text-purple', dot: 'bg-purple' },
  'Blog / Articles': { border: 'border-amber/20', bg: 'bg-amber/5', text: 'text-amber', dot: 'bg-amber' },
  'Team / About': { border: 'border-emerald/20', bg: 'bg-emerald/5', text: 'text-emerald', dot: 'bg-emerald' },
  'Contact Section': { border: 'border-cyan/20', bg: 'bg-cyan/5', text: 'text-cyan', dot: 'bg-cyan' },
  'CTA Section': { border: 'border-sky/20', bg: 'bg-sky/5', text: 'text-sky', dot: 'bg-sky' },
  'Footer': { border: 'border-slate-600/20', bg: 'bg-slate-700/5', text: 'text-slate-400', dot: 'bg-slate-500' },
}
const DEFAULT_COLOR = { border: 'border-slate-600/20', bg: 'bg-slate-700/5', text: 'text-slate-300', dot: 'bg-slate-500' }

const SECTION_DESC: Record<string, string> = {
  'Navbar': 'Navigation bar with logo, links, and CTA button',
  'Hero Section': 'Main headline, subheadline, and primary call-to-action',
  'Features Section': 'Feature cards/grid showcasing product capabilities',
  'Pricing Section': 'Pricing tiers and plan comparison',
  'Testimonials': 'Customer reviews and social proof',
  'FAQ Section': 'Frequently asked questions accordion',
  'Blog / Articles': 'Blog post grid or recent article cards',
  'Team / About': 'Team members or company information',
  'Contact Section': 'Contact form with address and social links',
  'CTA Section': 'Call-to-action banner with conversion goal',
  'Footer': 'Site links, copyright, and social icons',
}

export default function TabStructure({ result }: { result: AnalysisResult }) {
  const { structure } = result
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Page Structure</h2>
        <p className="text-slate-500 text-sm">{structure.length} sections detected on <span className="text-cyan">{result.domain}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Component tree */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Component Tree</h3>
          <div className="glass-card rounded-2xl p-5 space-y-1">
            {/* Root */}
            <div className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg bg-white/[0.02]">
              <span className="text-cyan font-mono text-xs">{'<'}</span>
              <span className="text-white font-semibold">Page</span>
              <span className="text-cyan font-mono text-xs">{'/>'}</span>
            </div>
            {structure.map((section, i) => {
              const colors = SECTION_COLORS[section] || DEFAULT_COLOR
              const isLast = i === structure.length - 1
              return (
                <motion.div
                  key={section}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-2 ml-5"
                >
                  {/* Connector line */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-px h-3 ${isLast ? 'bg-transparent' : 'bg-bdr'}`} />
                    <div className={`w-2 h-2 rounded-full ${colors.dot} opacity-50`} />
                    {!isLast && <div className="w-px flex-1 bg-bdr" />}
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors.border} ${colors.bg} text-sm my-0.5 flex-1 transition-all hover:scale-[1.01]`}>
                    <ChevronRight size={12} className={colors.text} />
                    <span className={`font-mono text-xs ${colors.text}`}>{'<'}{section.replace(/ /g, '')}{'/>'}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Section details */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Section Details</h3>
          <div className="space-y-2 stagger-children">
            {structure.map((section, i) => {
              const colors = SECTION_COLORS[section] || DEFAULT_COLOR
              const isExpanded = expanded === section
              return (
                <button
                  key={section}
                  onClick={() => setExpanded(isExpanded ? null : section)}
                  className={`w-full p-4 rounded-xl glass-card border border-white/[0.04] text-left transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      <span className={`font-semibold text-sm ${colors.text}`}>{i + 1}. {section}</span>
                    </div>
                    {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-600" />}
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-slate-500 text-xs mt-3 pl-5">{SECTION_DESC[section] || 'Custom section with unique content'}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Code hint */}
      <div className="mt-8 glass-card rounded-xl p-5">
        <p className="text-slate-600 text-xs font-mono mb-3">// Suggested page composition</p>
        <pre className="text-sm text-slate-400 font-mono overflow-x-auto leading-relaxed">
          {`export default function Page() {
  return (
    <>
${structure.map(s => `      <${s.replace(/ /g, '_')} />`).join('\n')}
    </>
  )
}`}
        </pre>
      </div>
    </div>
  )
}
