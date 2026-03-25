'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnalysisResult } from '@/types'
import { Sparkles, Cpu, AlertCircle } from 'lucide-react'

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!text) return
    let i = 0
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1))
          i++
        } else {
          clearInterval(interval)
          setDone(true)
        }
      }, 8)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timeout)
  }, [text, delay])

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-4 bg-cyan ml-0.5 animate-pulse align-text-bottom" />}
    </span>
  )
}

export default function TabAI({ result }: { result: AnalysisResult }) {
  const paragraphs = result.explanation
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)

  const PARA_META = [
    { label: 'Architecture & Tech Choices', color: 'text-cyan', border: 'border-cyan/10', gradient: 'from-cyan/10 to-transparent' },
    { label: 'Design Strategy', color: 'text-purple', border: 'border-purple/10', gradient: 'from-purple/10 to-transparent' },
    { label: 'How to Replicate', color: 'text-emerald', border: 'border-emerald/10', gradient: 'from-emerald/10 to-transparent' },
  ]

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">AI Explanation</h2>
        <p className="text-slate-500 text-sm">
          Powered by <span className="text-cyan">{result.ollama_used ? 'Ollama (local AI)' : 'Rule-based analysis'}</span>
        </p>
      </div>

      {!result.ollama_used && (
        <div className="mb-6 p-4 glass-card rounded-xl flex gap-3 text-sm border border-amber/10">
          <AlertCircle size={16} className="text-amber shrink-0 mt-0.5" />
          <div>
            <span className="text-amber font-semibold">Ollama not running. </span>
            <span className="text-slate-400">This is a rule-based fallback. Start Ollama for full AI analysis: </span>
            <code className="text-emerald font-mono text-xs">ollama serve</code>
          </div>
        </div>
      )}

      {result.ollama_used && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 mb-8 px-4 py-3 glass-card rounded-xl border border-emerald/10"
        >
          <div className="relative">
            <Cpu size={16} className="text-emerald" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald glow-dot" />
          </div>
          <span className="text-emerald text-sm font-medium">Full AI analysis complete</span>
          <span className="text-slate-600 text-xs ml-auto font-mono">via Ollama local LLM</span>
        </motion.div>
      )}

      {/* Explanation paragraphs */}
      <div className="space-y-5 stagger-children">
        {paragraphs.map((para, i) => {
          const meta = i < PARA_META.length ? PARA_META[i] : { label: `Section ${i + 1}`, color: 'text-slate-300', border: 'border-white/5', gradient: 'from-white/5 to-transparent' }
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`p-6 glass-card rounded-2xl border ${meta.border}`}
            >
              <div className={`flex items-center gap-2 mb-3 text-sm font-semibold ${meta.color}`}>
                <Sparkles size={14} />
                {meta.label}
              </div>
              <p className="text-slate-300 leading-relaxed text-[15px]">
                <TypewriterText text={para} delay={i * 300} />
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Tech summary chips */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        {Object.entries(result.stack).slice(0, 4).map(([key, val]) => (
          <div key={key} className="p-3 glass-card rounded-xl text-center">
            <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">{key}</div>
            <div className="text-sm font-bold text-white truncate">{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
