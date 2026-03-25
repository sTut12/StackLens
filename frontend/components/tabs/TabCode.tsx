'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnalysisResult } from '@/types'
import { Copy, Check, FolderOpen, Code2, Terminal, ChevronDown, ChevronRight, FileCode } from 'lucide-react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-lg text-slate-400 hover:text-white transition-all text-xs">
      {copied ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

/**
 * Safe syntax highlighter — NO dangerouslySetInnerHTML.
 * Parses the line into typed segments and renders them as React spans.
 * This eliminates the XSS vector entirely.
 */
type Segment = { text: string; color: string }

const KEYWORDS = new Set([
  'import','export','default','from','const','return','function',
  'interface','type','async','await','new','class','extends','let','var','if','else','for','while'
])

function tokenizeLine(raw: string): Segment[] {
  const segments: Segment[] = []

  // Full line comment
  const commentIdx = raw.indexOf('//')
  let codePart = raw
  let commentPart: string | null = null

  if (commentIdx !== -1) {
    // Check it's not inside a string
    const before = raw.slice(0, commentIdx)
    const quoteCount = (before.match(/['"]/g) || []).length
    if (quoteCount % 2 === 0) {
      codePart    = raw.slice(0, commentIdx)
      commentPart = raw.slice(commentIdx)
    }
  }

  // Tokenise the code part character-by-character
  let i = 0
  while (i < codePart.length) {
    // String literals: ', ", `
    if (["'", '"', '`'].includes(codePart[i])) {
      const quote = codePart[i]
      let j = i + 1
      while (j < codePart.length && codePart[j] !== quote) {
        if (codePart[j] === '\\') j++ // skip escape
        j++
      }
      segments.push({ text: codePart.slice(i, j + 1), color: '#10B981' })
      i = j + 1
      continue
    }

    // Word boundary — check for keyword or function call
    if (/[a-zA-Z_$]/.test(codePart[i])) {
      let j = i
      while (j < codePart.length && /[\w$]/.test(codePart[j])) j++
      const word = codePart.slice(i, j)
      // Look ahead for '(' to detect function call
      const nextNonSpace = codePart.slice(j).trimStart()
      if (nextNonSpace.startsWith('(')) {
        segments.push({ text: word, color: '#F59E0B' })
      } else if (KEYWORDS.has(word)) {
        segments.push({ text: word, color: '#00D4FF' })
      } else {
        segments.push({ text: word, color: '#CBD5E1' })
      }
      i = j
      continue
    }

    // Numbers
    if (/[0-9]/.test(codePart[i])) {
      let j = i
      while (j < codePart.length && /[0-9.xXa-fA-F_]/.test(codePart[j])) j++
      segments.push({ text: codePart.slice(i, j), color: '#F59E0B' })
      i = j
      continue
    }

    // Everything else (punctuation, operators, spaces)
    segments.push({ text: codePart[i], color: '#64748B' })
    i++
  }

  // Append comment part
  if (commentPart) {
    segments.push({ text: commentPart, color: '#4B5563' })
  }

  return segments
}

function CodeLine({ line, lineNum }: { line: string; lineNum: number }) {
  const segments = tokenizeLine(line)
  return (
    <div className="flex hover:bg-white/[0.02] transition-colors">
      <span className="text-slate-700 w-8 text-right mr-4 select-none shrink-0 text-xs leading-relaxed pt-px">
        {lineNum}
      </span>
      <span className="whitespace-pre overflow-x-auto font-mono text-[13px] leading-relaxed">
        {segments.map((seg, i) => (
          <span key={i} style={{ color: seg.color }}>{seg.text}</span>
        ))}
      </span>
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <div>
      {lines.map((line, i) => (
        <CodeLine key={i} line={line} lineNum={i + 1} />
      ))}
    </div>
  )
}

export default function TabCode({ result }: { result: AnalysisResult }) {
  const { skeleton }   = result
  const [activeComp, setActiveComp] = useState<string | null>(null)
  const [showFolder, setShowFolder] = useState(true)
  const components = Object.entries(skeleton.components || {})

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Code Skeleton</h2>
          <p className="text-slate-500 text-sm">Generated for <span className="text-cyan">{skeleton.framework}</span> · {components.length} components</p>
        </div>
      </div>

      {/* Install command */}
      <div className="mb-6 glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Terminal size={14} className="text-cyan" /> Setup Command
          </div>
          <CopyButton text={skeleton.install_command} />
        </div>
        <div className="p-5">
          {/* Use <pre> not innerHTML — safe text rendering */}
          <pre className="text-sm font-mono text-emerald overflow-x-auto leading-relaxed">{skeleton.install_command}</pre>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* File explorer */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3 cursor-pointer group" onClick={() => setShowFolder(!showFolder)}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <FolderOpen size={14} className="text-amber" /> Project Structure
            </div>
            <div className="flex items-center gap-2">
              <CopyButton text={skeleton.folder_structure} />
              {showFolder ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-600" />}
            </div>
          </div>
          <AnimatePresence>
            {showFolder && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="glass-card rounded-2xl p-5">
                  <pre className="text-xs font-mono text-slate-400 leading-relaxed whitespace-pre overflow-x-auto">{skeleton.folder_structure}</pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {components.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Components</div>
              <div className="space-y-1">
                {components.map(([name]) => (
                  <button key={name} onClick={() => setActiveComp(activeComp === name ? null : name)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-mono transition-all text-left ${activeComp === name ? 'glass text-cyan border border-cyan/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}>
                    <FileCode size={14} className={activeComp === name ? 'text-cyan' : 'text-slate-600'} />
                    <span>{name}.{skeleton.extension}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Code viewer — no dangerouslySetInnerHTML */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-300">
            <Code2 size={14} className="text-purple" /> Code Viewer
          </div>
          <AnimatePresence mode="wait">
            {activeComp && skeleton.components?.[activeComp] ? (
              <motion.div key={activeComp} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-amber/60" />
                      <div className="w-3 h-3 rounded-full bg-emerald/60" />
                    </div>
                    <span className="text-sm font-mono text-slate-400 ml-2">{activeComp}.{skeleton.extension}</span>
                  </div>
                  <CopyButton text={skeleton.components[activeComp]} />
                </div>
                <div className="p-4 max-h-[500px] overflow-y-auto">
                  <CodeBlock code={skeleton.components[activeComp]} />
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-12 text-center">
                <Code2 size={32} className="mx-auto mb-3 text-slate-700" />
                <p className="text-slate-600 text-sm">Select a component to view its code</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}