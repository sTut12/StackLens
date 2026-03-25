'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import React from 'react'
import AuthGuard from '@/components/auth/AuthGuard'
import {
  ArrowLeft, Globe, Layers, Code2, MessageSquare, Zap, Terminal,
  Server, Database, Lock, BarChart, Layout, Clock, Activity,
  CheckCircle2, AlertTriangle, RotateCcw, ChevronRight,
  Cpu, Shield, Copy, Check
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AnalysisResult {
  url: string; domain: string; scrape_method: string
  stack: Record<string, string>; structure: string[]
  ui_components: string[]; explanation: string
  skeleton: { folder_structure: string; install_command: string; components?: Record<string, string> }
  performance?: { load_time_ms: number; page_size_kb: number; status_code: number; speed_rating: string; https?: boolean; compression?: boolean; server?: string; cache_control?: string }
  from_cache: boolean; ollama_used: boolean; response_time_ms: number
}
interface TreeNode { name: string; children?: TreeNode[] }
type Tab = 'overview' | 'stack' | 'architecture' | 'ai' | 'skeleton' | 'performance'

const LOADING_STEPS = [
  'Booting headless browser...',
  'Scraping DOM & JS bundles...',
  'Analyzing headers & network...',
  'Running AI inference (Mistral)...',
  'Building architecture blueprint...',
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-2 px-4 py-2 border-2 border-[#111111] rounded-full bg-white text-xs font-bold uppercase tracking-widest hover:bg-[#FF5500] hover:text-white hover:border-[#FF5500] transition-all">
      {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
    </button>
  )
}

function LoadingStep({ text, delay, done }: { text: string; delay: number; done: boolean }) {
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div className={`flex items-center gap-4 bg-white border-2 border-[#111111] p-4 rounded-2xl font-mono text-sm transition-all duration-500 ${vis ? 'opacity-100 shadow-[4px_4px_0_0_#111111]' : 'opacity-0 translate-y-4'}`}>
      <div className={`w-4 h-4 rounded-full border-2 border-[#111111] flex-shrink-0 transition-all ${done ? 'bg-green-400' : vis ? 'bg-[#FF5500] animate-pulse' : 'bg-gray-200'}`} />
      <span className="font-bold text-[#111111]">{text}</span>
      {done && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
    </div>
  )
}

/* ─── TAB: OVERVIEW ─────────────────────────────────────── */
function TabOverview({ data }: { data: AnalysisResult }) {
  const stackKeys = Object.entries(data.stack || {})
  const techScore = Math.min(100, stackKeys.length * 15 + 40)
  const getIcon = (cat: string) => {
    if (cat.includes('framework') || cat.includes('language')) return <Code2 className="w-5 h-5 text-[#111111]" />
    if (cat.includes('styling'))  return <Layout   className="w-5 h-5 text-[#111111]" />
    if (cat.includes('hosting') || cat.includes('server')) return <Server className="w-5 h-5 text-[#111111]" />
    if (cat.includes('database')) return <Database className="w-5 h-5 text-[#111111]" />
    if (cat.includes('payments') || cat.includes('auth'))  return <Lock    className="w-5 h-5 text-[#111111]" />
    if (cat.includes('analytics'))return <BarChart className="w-5 h-5 text-[#111111]" />
    return <Globe className="w-5 h-5 text-[#111111]" />
  }
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { icon: Activity, label:'Tech Score',  val: techScore,     sub:'/100',  accent:true },
          { icon: Layers,   label:'Frameworks',  val: stackKeys.length, sub:'Found' },
          { icon: Zap,      label:'Load Time',   val: data.performance ? `${(data.performance.load_time_ms/1000).toFixed(1)}s` : '--', sub: data.performance?.speed_rating || '' },
          { icon: Clock,    label:'Response',    val:`${data.response_time_ms}ms`, sub:'Total' },
        ].map(({ icon:Icon, label, val, sub, accent }:any, i) => (
          <div key={i} className={`border-2 border-[#111111] rounded-[1.5rem] p-6 hover:shadow-[6px_6px_0_0_#111111] hover:-translate-y-1 transition-all ${accent ? 'bg-[#FF5500]' : 'bg-white'}`}>
            <div className={`p-2 rounded-xl border border-[#111111] inline-flex mb-4 ${accent ? 'bg-white/20 border-white/40' : 'bg-gray-100'}`}>
              <Icon className={`w-5 h-5 ${accent ? 'text-white' : 'text-[#111111]'}`} />
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${accent ? 'text-white/70' : 'text-gray-500'}`}>{label}</div>
            <div className={`text-3xl font-black font-display ${accent ? 'text-white' : 'text-[#111111]'}`}>{val}
              {sub && <span className={`text-[10px] ml-1 font-bold uppercase tracking-widest ${accent ? 'text-white/70' : 'text-gray-400'}`}>{sub}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border-2 border-[#111111] rounded-[2rem] p-8 shadow-[6px_6px_0_0_#111111]">
        <div className="flex items-center gap-4 border-b-2 border-[#111111] pb-5 mb-7">
          <div className="p-2 bg-[#FF5500] text-white rounded-xl border-2 border-[#111111]"><Terminal className="w-5 h-5" /></div>
          <h2 className="text-xl font-black font-display uppercase tracking-widest">Detected Technologies</h2>
          <span className="ml-auto bg-[#111111] text-white px-3 py-1 rounded-full text-[10px] font-bold">{stackKeys.length} found</span>
        </div>
        {stackKeys.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stackKeys.map(([cat, name], i) => (
              <div key={i} className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-2xl hover:border-[#111111] hover:shadow-[3px_3px_0_0_#111111] transition-all">
                <div className="p-2 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0">{getIcon(cat)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[#111111] truncate text-sm">{name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{cat}</div>
                </div>
                <span className="bg-[#FF5500] text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-[#111111] flex-shrink-0">✓</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center border-2 border-dashed border-gray-300 rounded-2xl">
            <p className="font-bold text-gray-400">No tech stack detected.</p>
          </div>
        )}
      </div>
      <div className="bg-[#111111] text-white border-2 border-[#111111] rounded-[1.5rem] p-5 flex items-center gap-4">
        <CheckCircle2 className="w-6 h-6 text-[#FF5500] flex-shrink-0" />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Scrape Method Used</div>
          <div className="font-black uppercase tracking-widest">{data.scrape_method === 'playwright' ? 'L1: Full JS Render (Playwright)' : data.scrape_method === 'requests' ? 'L2: HTML Scraping (Requests)' : 'L3: HTTP Headers Only'}</div>
        </div>
        {data.ollama_used && <div className="ml-auto bg-[#FF5500] border-2 border-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">AI Enhanced</div>}
      </div>
    </div>
  )
}

/* ─── TAB: TECH STACK ───────────────────────────────────── */
function TabStack({ data }: { data: AnalysisResult }) {
  const stackKeys = Object.entries(data.stack || {})
  const getIcon = (cat: string) => {
    if (cat.includes('framework') || cat.includes('language')) return <Code2 className="w-6 h-6 text-[#111111]" />
    if (cat.includes('styling'))  return <Layout   className="w-6 h-6 text-[#111111]" />
    if (cat.includes('hosting') || cat.includes('server')) return <Server className="w-6 h-6 text-[#111111]" />
    if (cat.includes('database')) return <Database className="w-6 h-6 text-[#111111]" />
    if (cat.includes('payments') || cat.includes('auth'))  return <Lock    className="w-6 h-6 text-[#111111]" />
    if (cat.includes('analytics'))return <BarChart className="w-6 h-6 text-[#111111]" />
    return <Cpu className="w-6 h-6 text-[#111111]" />
  }
  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-[#111111] rounded-[2rem] p-8 shadow-[6px_6px_0_0_#111111]">
        <div className="flex items-center gap-4 border-b-2 border-[#111111] pb-6 mb-8">
          <div className="p-2 bg-[#FF5500] text-white rounded-xl border-2 border-[#111111]"><Terminal className="w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-black font-display uppercase tracking-widest">Tech Stack</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">All technologies detected on {data.domain}</p>
          </div>
          <span className="ml-auto bg-[#111111] text-white px-4 py-2 rounded-full text-[10px] font-bold">{stackKeys.length} technologies</span>
        </div>
        {stackKeys.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {stackKeys.map(([cat, name], i) => (
              <div key={i} className="flex items-center gap-5 p-5 border-2 border-gray-200 rounded-2xl hover:border-[#111111] hover:shadow-[4px_4px_0_0_#111111] transition-all bg-gray-50">
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#111111] flex items-center justify-center flex-shrink-0 shadow-[3px_3px_0_0_#111111]">{getIcon(cat)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[#111111] text-lg">{name}</div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mt-0.5">{cat}</div>
                </div>
                <span className="bg-[#FF5500] text-white text-[10px] font-bold px-3 py-1.5 rounded-full border-2 border-[#111111] flex-shrink-0">DETECTED</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center border-2 border-dashed border-gray-300 rounded-2xl">
            <Shield className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="font-black text-gray-400 uppercase tracking-widest">No Stack Detected</p>
          </div>
        )}
      </div>
      {data.ui_components && data.ui_components.length > 0 && (
        <div className="bg-[#FF5500] border-2 border-[#111111] rounded-[2rem] p-8 shadow-[6px_6px_0_0_#111111]">
          <h2 className="text-xl font-black font-display uppercase tracking-widest text-white mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6" /> UI Components Detected
          </h2>
          <div className="flex flex-wrap gap-3">
            {data.ui_components.map((ui, i) => (
              <span key={i} className="bg-white border-2 border-[#111111] px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest shadow-[3px_3px_0_0_#111111]">{ui}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── TAB: ARCHITECTURE ─────────────────────────────────── */
function TabArchitecture({ data }: { data: AnalysisResult }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-[#111111] rounded-[2rem] p-8 shadow-[6px_6px_0_0_#111111]">
        <div className="flex items-center gap-4 border-b-2 border-[#111111] pb-6 mb-8">
          <div className="p-2 bg-[#111111] text-white rounded-xl"><Layers className="w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-black font-display uppercase tracking-widest">Page Architecture</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Component structure and page layout hierarchy</p>
          </div>
        </div>
        {data.structure && data.structure.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-[#111111] border-2 border-[#111111] rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-[#FF5500] border-2 border-white flex items-center justify-center flex-shrink-0"><Globe className="w-5 h-5 text-white" /></div>
              <div>
                <div className="font-black text-white uppercase tracking-widest">{data.domain}</div>
                <div className="text-[10px] text-gray-400 font-bold tracking-widest">ROOT DOMAIN</div>
              </div>
            </div>
            <div className="ml-6 space-y-2 border-l-4 border-[#FF5500] pl-6">
              {data.structure.map((s, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl hover:border-[#111111] hover:shadow-[3px_3px_0_0_#111111] transition-all relative">
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#FF5500] border-2 border-[#111111]" />
                  <div className="w-8 h-8 rounded-xl bg-white border-2 border-[#111111] flex items-center justify-center flex-shrink-0 text-xs font-black text-[#FF5500]">{i + 1}</div>
                  <span className="font-black text-[#111111] font-mono">{s}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded-full">Component</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-16 text-center border-2 border-dashed border-gray-300 rounded-2xl">
            <Layers className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="font-black text-gray-400 uppercase tracking-widest">No structure detected</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[
          { label:'Domain',     val: data.domain || '—',   icon: Globe },
          { label:'Method',     val: data.scrape_method === 'playwright' ? 'L1: Playwright' : data.scrape_method === 'requests' ? 'L2: Requests' : 'L3: Headers', icon: Activity },
          { label:'Components', val:`${(data.structure||[]).length} found`, icon: Layers },
        ].map(({label,val,icon:Icon}:any) => (
          <div key={label} className="bg-white border-2 border-[#111111] rounded-[1.5rem] p-6 text-center hover:shadow-[4px_4px_0_0_#111111] transition-all">
            <Icon className="w-8 h-8 text-[#FF5500] mx-auto mb-3" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</div>
            <div className="font-black text-[#111111] font-mono text-sm">{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── TAB: AI INSIGHTS ──────────────────────────────────── */
function TabAI({ data }: { data: AnalysisResult }) {
  return (
    <div className="space-y-6">
      {data.explanation ? (
        <>
          <div className="bg-[#111111] text-white border-4 border-[#111111] rounded-[2rem] p-8 shadow-[8px_8px_0_0_#FF5500]">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-white/20">
              <div className="p-2 bg-[#FF5500] text-white rounded-xl border-2 border-white"><MessageSquare className="w-6 h-6" /></div>
              <div>
                <h2 className="text-2xl font-black font-display uppercase tracking-widest">Architectural Insights</h2>
                <p className="text-xs text-[#FF5500] font-bold tracking-widest uppercase mt-1">Powered by Ollama · Mistral 7B · Local AI</p>
              </div>
              <div className="ml-auto"><CopyButton text={data.explanation} /></div>
            </div>
            <div className="font-medium leading-relaxed space-y-5 text-gray-300 text-base">
              {data.explanation.split('\n\n').filter(p => p.trim()).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { label:'AI Model',  val:'Mistral 7B',   desc:'Via Ollama — fully local' },
              { label:'Privacy',   val:'100% Local',   desc:'No data sent externally' },
              { label:'AI Status', val: data.ollama_used ? 'Enhanced' : 'Fallback', desc:'AI enhancement status' },
            ].map(({label,val,desc}) => (
              <div key={label} className="bg-white border-2 border-[#111111] rounded-[1.5rem] p-6 hover:shadow-[4px_4px_0_0_#111111] transition-all">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{label}</div>
                <div className="font-black text-[#111111] text-lg mb-1">{val}</div>
                <div className="text-xs text-gray-400 font-medium">{desc}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white border-2 border-[#111111] rounded-[2rem] p-16 text-center shadow-[6px_6px_0_0_#111111]">
          <div className="w-20 h-20 rounded-full border-4 border-[#111111] bg-gray-100 flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0_0_#111111]">
            <MessageSquare className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-2xl font-black font-display uppercase tracking-widest mb-3">No AI Insights</h3>
          <p className="text-gray-500 font-medium mb-2">Ollama may not be running or returned no output.</p>
          <p className="text-sm text-gray-400">Run <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">ollama serve</code> in a separate terminal.</p>
        </div>
      )}
    </div>
  )
}

/* ─── TAB: CODE SKELETON ────────────────────────────────── */
function TabSkeleton({ data }: { data: AnalysisResult }) {
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const components = data.skeleton?.components || {}
  const fileNames  = Object.keys(components)
  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-[#111111] rounded-[2rem] overflow-hidden shadow-[6px_6px_0_0_#111111]">
        <div className="px-8 py-6 border-b-2 border-[#111111] flex items-center gap-4">
          <div className="p-2 bg-[#111111] text-white rounded-xl"><Code2 className="w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-black font-display uppercase tracking-widest">Generated Skeleton</h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">AI-generated project structure — copy and start building</p>
          </div>
          {data.skeleton?.folder_structure && <div className="ml-auto"><CopyButton text={data.skeleton.folder_structure} /></div>}
        </div>
        <div className="bg-gray-800 px-8 py-3 flex items-center gap-3 border-b-2 border-[#111111]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono ml-2">folder-structure.txt</span>
        </div>
        <div className="p-8 bg-[#1a1a2e] font-mono text-sm overflow-x-auto">
          <pre className="whitespace-pre-wrap text-green-400 leading-relaxed">{data.skeleton?.folder_structure || '// No structure generated'}</pre>
        </div>
        {data.skeleton?.install_command && (
          <div className="border-t-2 border-[#111111]">
            <div className="bg-gray-800 px-8 py-2 flex items-center justify-between border-b-2 border-[#111111]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Install Command</span>
              <CopyButton text={data.skeleton.install_command} />
            </div>
            <div className="p-6 bg-[#111111] font-mono text-sm flex items-center gap-3">
              <span className="text-gray-500 font-bold">$</span>
              <span className="text-green-400 font-bold">{data.skeleton.install_command}</span>
            </div>
          </div>
        )}
      </div>
      {fileNames.length > 0 && (
        <div className="bg-white border-2 border-[#111111] rounded-[2rem] overflow-hidden shadow-[4px_4px_0_0_#111111]">
          <div className="px-8 py-5 border-b-2 border-[#111111]">
            <h3 className="text-lg font-black font-display uppercase tracking-widest">Component Files</h3>
          </div>
          <div className="flex min-h-[200px]">
            <div className="w-52 border-r-2 border-[#111111] bg-gray-50">
              {fileNames.map(name => (
                <button key={name} onClick={() => setActiveFile(name === activeFile ? null : name)}
                  className={`w-full text-left px-5 py-3.5 border-b border-gray-200 font-mono text-xs font-bold transition-all ${activeFile===name ? 'bg-[#111111] text-[#FF5500]' : 'text-gray-600 hover:bg-white hover:text-[#111111]'}`}>
                  {name}
                </button>
              ))}
            </div>
            <div className="flex-1 bg-[#1a1a2e] p-6 font-mono text-sm overflow-x-auto">
              {activeFile && components[activeFile]
                ? <pre className="whitespace-pre-wrap text-green-300 text-xs leading-relaxed">{components[activeFile]}</pre>
                : <p className="text-gray-500 font-bold text-xs">← Click a file to view</p>}
            </div>
          </div>
        </div>
      )}
      <div className="bg-[#FF5500] border-2 border-[#111111] rounded-[1.5rem] p-6 shadow-[4px_4px_0_0_#111111]">
        <h3 className="font-black uppercase tracking-widest text-white text-lg mb-4">How to Use This Skeleton</h3>
        <div className="grid grid-cols-3 gap-4">
          {[['1','Copy structure','Use the folder layout as your project blueprint'],['2','Run install cmd','Execute in your terminal to scaffold the project'],['3','Start building','Replace placeholders with your actual code']].map(([n,t,d]) => (
            <div key={n} className="bg-white border-2 border-[#111111] rounded-2xl p-4">
              <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center font-black text-sm mb-3">{n}</div>
              <div className="font-black text-[#111111] text-sm mb-1">{t}</div>
              <div className="text-xs text-gray-500">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── TAB: PERFORMANCE ──────────────────────────────────── */
function TabPerformance({ data }: { data: AnalysisResult }) {
  const perf = data.performance
  if (!perf) return (
    <div className="bg-white border-2 border-[#111111] rounded-[2rem] p-16 text-center shadow-[6px_6px_0_0_#111111]">
      <div className="w-20 h-20 rounded-full border-4 border-[#111111] bg-gray-100 flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0_0_#111111]">
        <Zap className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-2xl font-black font-display uppercase tracking-widest mb-3">Performance Unavailable</h3>
      <p className="text-gray-500 font-medium">Could not measure performance metrics for this site.</p>
    </div>
  )
  const speedScore = perf.speed_rating === 'Fast' ? 92 : perf.speed_rating === 'Medium' ? 65 : 35
  const speedColor = perf.speed_rating === 'Fast' ? '#22C55E' : perf.speed_rating === 'Medium' ? '#F59E0B' : '#EF4444'
  return (
    <div className="space-y-6">
      <div className="bg-[#111111] border-2 border-[#111111] rounded-[2rem] p-8 shadow-[8px_8px_0_0_#FF5500]">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="w-32 h-32 rounded-full border-[8px] border-[#FF5500] flex items-center justify-center bg-[#1a1a1a]">
              <div className="text-center">
                <div className="text-4xl font-black text-white font-display">{speedScore}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">/100</div>
              </div>
            </div>
            <span className="px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-sm border-2 border-white text-white" style={{ background: speedColor }}>
              {perf.speed_rating}
            </span>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {[
              { label:'Load Time',   val:`${(perf.load_time_ms/1000).toFixed(2)}s`, good: perf.load_time_ms < 1000 },
              { label:'Page Size',   val:`${perf.page_size_kb} KB`,                 good: perf.page_size_kb < 500 },
              { label:'HTTP Status', val: perf.status_code.toString(),              good: perf.status_code === 200 },
              { label:'HTTPS',       val: perf.https ? 'Secure' : 'Not Secure',    good: perf.https ?? false },
            ].map(({label,val,good}) => (
              <div key={label} className="bg-[#1a1a1a] border border-[#333333] rounded-2xl p-4 text-center">
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">{label}</div>
                <div className={`font-black font-mono text-lg ${good ? 'text-green-400' : 'text-[#FF5500]'}`}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white border-2 border-[#111111] rounded-[2rem] p-8 shadow-[6px_6px_0_0_#111111]">
        <h2 className="text-xl font-black font-display uppercase tracking-widest mb-8 flex items-center gap-3">
          <Zap className="w-6 h-6 text-[#FF5500]" /> Detailed Metrics
        </h2>
        <div className="space-y-7">
          {[
            { label:'Speed Rating',     val: speedScore,                        color: speedColor, note: perf.speed_rating },
            { label:'Response Quality', val: perf.status_code===200 ? 100 : 50, color:'#111111',   note:`HTTP ${perf.status_code}` },
            { label:'Security (HTTPS)', val: perf.https ? 100 : 0,              color:'#22C55E',   note: perf.https ? 'Secure' : 'Not Secure' },
            { label:'Compression',      val: perf.compression ? 85 : 30,        color:'#0EA5E9',   note: perf.compression ? 'Enabled' : 'Not Detected' },
          ].map(({label,val,color,note}:any) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-black uppercase tracking-widest">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">{note}</span>
                  <span className="font-mono font-black">{val}%</span>
                </div>
              </div>
              <div className="h-5 bg-gray-100 rounded-full overflow-hidden border-2 border-gray-200">
                <div className="h-full rounded-full transition-all duration-1000 border-r-2 border-[#111111]" style={{ width:`${val}%`, background:color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[
          { label:'Server',        val: perf.server       || 'Unknown' },
          { label:'Cache Control', val: perf.cache_control || 'None detected' },
          { label:'Compression',   val: perf.compression   ? 'gzip/br enabled' : 'Not detected' },
        ].map(({label,val}) => (
          <div key={label} className="bg-white border-2 border-[#111111] rounded-[1.5rem] p-5 hover:shadow-[4px_4px_0_0_#111111] transition-all">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{label}</div>
            <div className="font-black text-[#111111] font-mono text-sm break-all">{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── MAIN ───────────────────────────────────────────────── */
function AnalysisPage() {
  const router  = useRouter()
  const params  = useParams()
  const urlSlug = typeof params.id === 'string' ? decodeURIComponent(params.id) : ''
  const [data,    setData]    = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [step,    setStep]    = useState(0)
  const [error,   setError]   = useState('')
  const [tab,     setTab]     = useState<Tab>('overview')

  useEffect(() => {
    if (!urlSlug) return
    const target = urlSlug.startsWith('http') ? urlSlug : 'https://' + urlSlug
    const timers = LOADING_STEPS.map((_, i) => setTimeout(() => setStep(i), i * 900))
    fetch(`${API_BASE}/api/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: target }),
    })
      .then(r => { if (!r.ok) throw new Error(`Server ${r.status}`); return r.json() })
      .then(d  => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
    return () => timers.forEach(clearTimeout)
  }, [urlSlug])

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F0] bg-grid flex flex-col items-center justify-center px-6">
      <div className="relative w-32 h-32 mb-10">
        <div className="absolute inset-0 border-[6px] border-gray-200 rounded-full" />
        <div className="absolute inset-0 border-[6px] border-[#111111] rounded-full border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 bg-[#FF5500] rounded-full border-2 border-[#111111] animate-pulse-ring" />
        </div>
      </div>
      <h2 className="text-3xl font-black font-display uppercase tracking-widest mb-3">Analyzing Target</h2>
      <div className="bg-white border-2 border-[#111111] px-6 py-3 rounded-full font-mono text-sm shadow-[4px_4px_0_0_#111111] font-bold mb-10">{urlSlug}</div>
      <div className="w-96 space-y-3">
        {LOADING_STEPS.map((text, i) => <LoadingStep key={i} text={text} delay={i * 900} done={step > i} />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#F5F5F0] bg-grid flex flex-col items-center justify-center px-6">
      <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-[#111111] flex items-center justify-center mb-6 shadow-[6px_6px_0_0_#111111]">
        <AlertTriangle className="w-10 h-10 text-[#FF5500]" />
      </div>
      <h2 className="text-3xl font-black font-display uppercase tracking-widest mb-4">Analysis Failed</h2>
      <div className="bg-white border-2 border-[#111111] rounded-2xl p-6 max-w-md text-center shadow-[6px_6px_0_0_#111111] mb-8">
        <p className="text-gray-600 font-medium">{error}</p>
        <p className="text-gray-400 text-sm mt-2">Make sure FastAPI is on port 8000 and Ollama is running.</p>
      </div>
      <div className="flex gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs border-2 border-[#111111] bg-white hover:shadow-[4px_4px_0_0_#111111] transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs border-2 border-[#111111] bg-[#111111] text-white hover:bg-[#FF5500] transition-all">
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  )

  if (!data) return null

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id:'overview',     label:'Overview',      icon: Activity },
    { id:'stack',        label:'Tech Stack',    icon: Terminal },
    { id:'architecture', label:'Architecture',  icon: Layers },
    { id:'ai',           label:'AI Insights',   icon: MessageSquare },
    { id:'skeleton',     label:'Code Skeleton', icon: Code2 },
    { id:'performance',  label:'Performance',   icon: Zap },
  ]

  const activeTab = TABS.find(t => t.id === tab)!

  return (
    <div className="min-h-screen bg-[#F5F5F0] bg-grid">
      {/* Top navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#F5F5F0]/95 backdrop-blur-md border-b-2 border-[#111111]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs text-gray-500 hover:text-[#111111] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#111111] bg-white flex items-center justify-center">
              <Layers className="w-4 h-4 text-[#111111]" />
            </div>
            <span className="text-base font-black tracking-tighter uppercase font-display">StackLens</span>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#111111] bg-white text-xs font-bold uppercase tracking-widest hover:shadow-[3px_3px_0_0_#111111] hover:bg-[#FF5500] hover:text-white hover:border-[#FF5500] transition-all">
            <RotateCcw className="w-3 h-3" /> New Scan
          </button>
        </div>
      </nav>

      <div className="flex pt-16 min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 fixed left-0 top-16 bottom-0 border-r-2 border-[#111111] bg-white flex flex-col z-40 overflow-y-auto">
          <div className="p-5 border-b-2 border-[#111111] bg-[#111111]">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Analyzing</div>
            <div className="font-mono font-black text-white text-sm truncate">{data.domain}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{data.from_cache ? 'Cached Result' : 'Live Analysis'}</span>
            </div>
          </div>

          <nav className="flex-1 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 px-3 py-2 mb-1">Sections</div>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all mb-1 text-left group
                  ${tab === id ? 'bg-[#111111] text-white shadow-[4px_4px_0_0_#FF5500]' : 'text-gray-500 hover:bg-gray-100 hover:text-[#111111]'}`}>
                <Icon className={`w-5 h-5 flex-shrink-0 ${tab===id ? 'text-[#FF5500]' : 'group-hover:text-[#FF5500] transition-colors'}`} />
                <span className="uppercase tracking-widest text-[11px] font-black">{label}</span>
                {tab === id && <ChevronRight className="w-4 h-4 ml-auto text-[#FF5500]" />}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t-2 border-[#111111] space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
              <span className="text-gray-400">Response</span><span className="font-mono text-[#111111]">{data.response_time_ms}ms</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
              <span className="text-gray-400">Method</span>
              <span className="text-[#FF5500] font-mono">{data.scrape_method === 'playwright' ? 'L1' : data.scrape_method === 'requests' ? 'L2' : 'L3'}</span>
            </div>
            {data.from_cache && <div className="bg-[#111111] text-white text-center py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-[2px_2px_0_0_#FF5500]">Cached</div>}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 overflow-y-auto">
          <div className="sticky top-0 z-30 bg-[#F5F5F0]/95 backdrop-blur-sm border-b-2 border-[#111111] px-8 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center flex-shrink-0">
              <activeTab.icon className="w-5 h-5 text-[#FF5500]" />
            </div>
            <div>
              <h1 className="text-xl font-black font-display uppercase tracking-widest text-[#111111]">{activeTab.label}</h1>
              <p className="text-xs text-gray-500 font-bold truncate">{data.url} · {data.response_time_ms}ms</p>
            </div>
            {data.ollama_used && (
              <span className="ml-auto bg-[#FF5500] border-2 border-[#111111] text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[2px_2px_0_0_#111111]">+AI</span>
            )}
          </div>

          <div className="p-8 max-w-5xl mx-auto">
            {tab === 'overview'     && <TabOverview     data={data} />}
            {tab === 'stack'        && <TabStack        data={data} />}
            {tab === 'architecture' && <TabArchitecture data={data} />}
            {tab === 'ai'           && <TabAI           data={data} />}
            {tab === 'skeleton'     && <TabSkeleton     data={data} />}
            {tab === 'performance'  && <TabPerformance  data={data} />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AnalyzePage() {
  return <AuthGuard><AnalysisPage /></AuthGuard>
}