"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import {
  Search, Code2, Server, Globe, Zap, Shield, Activity, Cpu,
  Layers, Layout, Database, Lock, Terminal, BarChart, ArrowRight,
  Menu, X, Clock, AlertTriangle, MessageSquare, Box,
  Eye, EyeOff, Copy, Check, ChevronRight, RotateCcw, Download,
  ArrowDown
} from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { sanitizeUrl } from '@/lib/sanitize';

// ── Types ─────────────────────────────────────────────────────
interface LocalUser { email: string; displayName?: string }
interface AnalysisData {
  url: string; domain: string; scrape_method: string;
  stack?: Record<string, string>; structure?: string[];
  ui_components?: string[]; explanation?: string;
  skeleton?: { folder_structure: string; install_command: string; components?: Record<string,string> };
  performance?: { load_time_ms: number; page_size_kb: number; status_code: number; speed_rating: string; https?: boolean; compression?: boolean; server?: string; cache_control?: string };
  from_cache?: boolean; ollama_used?: boolean; response_time_ms?: number;
}
interface HistoryItem { url: string; summary: string; timestamp: number }
type DashTab = 'overview' | 'stack' | 'architecture' | 'ai' | 'skeleton' | 'performance'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Motion presets ────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }
});
const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay, duration: 0.6 }
});
const revealInView = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }
});

// ── Scroll progress bar ───────────────────────────────────────
function ScrollProgress() {
  useEffect(() => {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    const update = () => {
      const scrolled = window.scrollY;
      const total    = document.documentElement.scrollHeight - window.innerHeight;
      const pct      = total > 0 ? (scrolled / total) * 100 : 0;
      bar.style.width = `${pct}%`;
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return null;
}

// ── Animated counter ──────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number | string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  const numTo = typeof to === 'string' ? parseInt(to) || 0 : to;

  useEffect(() => {
    if (!isInView || typeof to === 'string') return;
    let start = 0;
    const duration = 1200;
    const step = 16;
    const increment = (numTo / duration) * step;
    const timer = setInterval(() => {
      start += increment;
      if (start >= numTo) { setCount(numTo); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [isInView, numTo]);

  return (
    <span ref={ref}>
      {typeof to === 'string' ? to : isInView ? count : 0}{suffix}
    </span>
  );
}

// ── Shared UI ─────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-2 px-4 py-2 border-2 border-[#111111] rounded-full text-xs font-bold uppercase tracking-widest bg-white hover:bg-[#FF5500] hover:text-white hover:border-[#FF5500] transition-all">
      {copied ? <><Check className="w-3.5 h-3.5"/>Copied!</> : <><Copy className="w-3.5 h-3.5"/>Copy</>}
    </button>
  );
}

function stackIcon(cat: string, size = 'w-5 h-5') {
  const cls = `${size} text-[#111111]`;
  if (cat.includes('framework') || cat.includes('language')) return <Code2 className={cls}/>;
  if (cat.includes('styling'))  return <Layout   className={cls}/>;
  if (cat.includes('hosting') || cat.includes('server')) return <Server className={cls}/>;
  if (cat.includes('database')) return <Database className={cls}/>;
  if (cat.includes('payments') || cat.includes('auth')) return <Lock    className={cls}/>;
  if (cat.includes('analytics'))return <BarChart className={cls}/>;
  return <Cpu className={cls}/>;
}

function computeScore(data: AnalysisData): number {
  let score = 20;
  const stack = Object.keys(data.stack || {}).length;
  const perf  = data.performance;
  score += Math.min(25, stack * 5);
  if (perf) {
    score += perf.status_code === 200 ? 10 : 0;
    score += perf.load_time_ms < 800  ? 15 : perf.load_time_ms < 2000 ? 8 : 2;
    score += perf.page_size_kb < 300  ? 10 : perf.page_size_kb < 800  ? 5 : 1;
    score += (perf.https ?? false)        ? 10 : 0;
    score += (perf.compression ?? false)  ? 10 : 0;
  }
  if (data.ollama_used)                        score += 5;
  if ((data.structure    || []).length > 2)    score += 3;
  if ((data.ui_components|| []).length > 2)    score += 2;
  return Math.min(99, Math.max(12, score));
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD TABS (same logic, better animations)
// ══════════════════════════════════════════════════════════════

function DashOverview({ data }: { data: AnalysisData }) {
  const stackKeys = Object.entries(data.stack || {});
  const score = computeScore(data);
  const scoreColor = score >= 75 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="space-y-8 tab-content-enter">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label:'Tech Score', val:score, sub:'/100', accent:true, sc:scoreColor },
          { label:'Frameworks', val:stackKeys.length, sub:'Found' },
          { label:'Load Time', val:data.performance?`${(data.performance.load_time_ms/1000).toFixed(1)}s`:'--', sub:data.performance?.speed_rating||'' },
          { label:'Response', val:`${data.response_time_ms||0}ms`, sub:'Total' },
        ].map(({label,val,sub,accent,sc}:any,i)=>(
          <motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.08,duration:0.5,ease:[0.22,1,0.36,1]}}
            className={`border-2 border-[#111111] rounded-[1.5rem] p-6 hover:shadow-[6px_6px_0_0_#111111] hover:-translate-y-1 transition-all duration-300 ${accent?'bg-[#111111]':'bg-white'}`}>
            <div className={`p-2 rounded-xl border border-[#111111] inline-flex mb-4 ${accent?'bg-[#FF5500]/20 border-white/20':'bg-gray-100'}`}>
              {[Activity,Layers,Zap,Clock][i] && React.createElement([Activity,Layers,Zap,Clock][i],{className:`w-5 h-5 ${accent?'text-white':'text-[#111111]'}`})}
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${accent?'text-gray-400':'text-gray-500'}`}>{label}</div>
            <div className={`text-3xl font-black font-display ${accent?'text-white':'text-[#111111]'}`} style={sc?{color:sc}:{}}>
              {val}{sub&&<span className="text-[10px] ml-1 font-bold uppercase tracking-widest text-gray-400">{sub}</span>}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div {...{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:0.3,duration:0.5}}}
        className="bg-white border-2 border-[#111111] rounded-[2rem] p-8 shadow-[6px_6px_0_0_#111111]">
        <div className="flex items-center gap-4 border-b-2 border-[#111111] pb-5 mb-7">
          <div className="p-2 bg-[#FF5500] text-white rounded-xl border-2 border-[#111111]"><Terminal className="w-5 h-5"/></div>
          <h2 className="text-xl font-black font-display uppercase tracking-widest">Technologies Detected</h2>
          <span className="ml-auto bg-[#111111] text-white px-3 py-1 rounded-full text-[10px] font-bold">{stackKeys.length} found</span>
        </div>
        {stackKeys.length>0?(
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {stackKeys.map(([cat,name],i)=>(
              <div key={i} className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-2xl hover:border-[#111111] hover:shadow-[3px_3px_0_0_#111111] transition-all cursor-default">
                <div className="p-2 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0">{stackIcon(cat)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[#111111] truncate text-sm">{name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{cat}</div>
                </div>
                <span className="bg-[#FF5500] text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-[#111111]">✓</span>
              </div>
            ))}
          </div>
        ):<div className="p-10 text-center border-2 border-dashed border-gray-300 rounded-2xl"><p className="font-bold text-gray-400">No tech stack detected.</p></div>}
      </motion.div>
      <motion.div {...{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:0.4}}}
        className="bg-[#111111] text-white border-2 border-[#111111] rounded-[1.5rem] p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#FF5500] border-2 border-white flex items-center justify-center flex-shrink-0"><Activity className="w-5 h-5 text-white"/></div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Scrape Method Used</div>
          <div className="font-black uppercase tracking-widest text-sm">
            {data.scrape_method==='playwright'?'L1: Full JS Render (Playwright)':data.scrape_method==='requests'?'L2: HTML Scraping (Requests)':'L3: HTTP Headers Only'}
          </div>
        </div>
        {data.ollama_used&&<div className="ml-auto bg-[#FF5500] border-2 border-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">AI Enhanced</div>}
        {data.from_cache&&<div className="ml-auto bg-gray-700 border-2 border-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">Cached</div>}
      </motion.div>
    </div>
  );
}

function DashStack({ data }: { data: AnalysisData }) {
  const stackKeys = Object.entries(data.stack || {});
  return (
    <div className="space-y-6 tab-content-enter">
      <div className="bg-white border-2 border-[#111111] rounded-[2rem] p-8 shadow-[6px_6px_0_0_#111111]">
        <div className="flex items-center gap-4 border-b-2 border-[#111111] pb-6 mb-8">
          <div className="p-2 bg-[#FF5500] text-white rounded-xl border-2 border-[#111111]"><Terminal className="w-6 h-6"/></div>
          <div><h2 className="text-2xl font-black font-display uppercase tracking-widest">Tech Stack</h2>
          <p className="text-sm text-gray-500 mt-0.5 font-medium">All technologies on {data.domain}</p></div>
          <span className="ml-auto bg-[#111111] text-white px-4 py-2 rounded-full text-[10px] font-bold">{stackKeys.length} found</span>
        </div>
        {stackKeys.length>0?(
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 stagger">
            {stackKeys.map(([cat,name],i)=>(
              <div key={i} className="flex items-center gap-5 p-5 border-2 border-gray-200 rounded-2xl hover:border-[#111111] hover:shadow-[4px_4px_0_0_#111111] transition-all bg-gray-50 cursor-default">
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#111111] flex items-center justify-center flex-shrink-0 shadow-[3px_3px_0_0_#111111]">{stackIcon(cat,'w-6 h-6')}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[#111111] text-lg">{name}</div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mt-0.5">{cat}</div>
                </div>
                <span className="bg-[#FF5500] text-white text-[10px] font-bold px-3 py-1.5 rounded-full border-2 border-[#111111]">DETECTED</span>
              </div>
            ))}
          </div>
        ):<div className="p-16 text-center border-2 border-dashed border-gray-300 rounded-2xl"><p className="font-black text-gray-400 uppercase tracking-widest">No Stack Detected</p></div>}
      </div>
      {data.ui_components&&data.ui_components.length>0&&(
        <div className="bg-[#FF5500] border-2 border-[#111111] rounded-[2rem] p-8 shadow-[6px_6px_0_0_#111111]">
          <h2 className="text-xl font-black font-display uppercase tracking-widest text-white mb-6 flex items-center gap-3"><Shield className="w-6 h-6"/>UI Components</h2>
          <div className="flex flex-wrap gap-3">
            {data.ui_components.map((ui,i)=>(
              <motion.span key={i} initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{delay:i*0.05}}
                className="bg-white border-2 border-[#111111] px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest shadow-[3px_3px_0_0_#111111]">{ui}</motion.span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DashArchitecture({ data }: { data: AnalysisData }) {
  return (
    <div className="space-y-6 tab-content-enter">
      <div className="bg-white border-2 border-[#111111] rounded-[2rem] p-8 shadow-[6px_6px_0_0_#111111]">
        <div className="flex items-center gap-4 border-b-2 border-[#111111] pb-6 mb-8">
          <div className="p-2 bg-[#111111] text-white rounded-xl"><Layers className="w-6 h-6"/></div>
          <div><h2 className="text-2xl font-black font-display uppercase tracking-widest">Page Architecture</h2>
          <p className="text-sm text-gray-500 mt-0.5 font-medium">Component hierarchy for {data.domain}</p></div>
        </div>
        {data.structure&&data.structure.length>0?(
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-[#111111] border-2 border-[#111111] rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-[#FF5500] border-2 border-white flex items-center justify-center flex-shrink-0"><Globe className="w-5 h-5 text-white"/></div>
              <div><div className="font-black text-white uppercase tracking-widest">{data.domain}</div><div className="text-[10px] text-gray-400 font-bold tracking-widest">ROOT DOMAIN</div></div>
            </div>
            <div className="ml-6 space-y-2 border-l-4 border-[#FF5500] pl-6">
              {data.structure.map((s,i)=>(
                <motion.div key={i} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}}
                  className="flex items-center gap-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl hover:border-[#111111] hover:shadow-[3px_3px_0_0_#111111] transition-all relative cursor-default">
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#FF5500] border-2 border-[#111111]"/>
                  <div className="w-8 h-8 rounded-xl bg-white border-2 border-[#111111] flex items-center justify-center flex-shrink-0 text-xs font-black text-[#FF5500]">{i+1}</div>
                  <span className="font-black text-[#111111] font-mono">{s}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded-full">Component</span>
                </motion.div>
              ))}
            </div>
          </div>
        ):<div className="p-16 text-center border-2 border-dashed border-gray-300 rounded-2xl"><Layers className="w-16 h-16 text-gray-200 mx-auto mb-4"/><p className="font-black text-gray-400 uppercase tracking-widest">No structure detected</p></div>}
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[{label:'Domain',val:data.domain||'—',icon:Globe},{label:'Method',val:data.scrape_method==='playwright'?'L1: Playwright':data.scrape_method==='requests'?'L2: Requests':'L3: Headers',icon:Activity},{label:'Components',val:`${(data.structure||[]).length} found`,icon:Layers}].map(({label,val,icon:Icon}:any)=>(
          <div key={label} className="bg-white border-2 border-[#111111] rounded-[1.5rem] p-6 text-center hover:shadow-[4px_4px_0_0_#111111] transition-all cursor-default">
            <Icon className="w-8 h-8 text-[#FF5500] mx-auto mb-3"/>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</div>
            <div className="font-black text-[#111111] font-mono text-sm">{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashAI({ data }: { data: AnalysisData }) {
  return (
    <div className="space-y-6 tab-content-enter">
      {data.explanation?(
        <>
          <div className="bg-[#111111] text-white border-4 border-[#111111] rounded-[2rem] p-8 shadow-[8px_8px_0_0_#FF5500]">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-white/20">
              <div className="p-2 bg-[#FF5500] text-white rounded-xl border-2 border-white"><MessageSquare className="w-6 h-6"/></div>
              <div><h2 className="text-2xl font-black font-display uppercase tracking-widest">Architectural Insights</h2>
              <p className="text-xs text-[#FF5500] font-bold tracking-widest uppercase mt-1">Powered by Ollama · Mistral 7B</p></div>
              <div className="ml-auto"><CopyButton text={data.explanation}/></div>
            </div>
            <div className="font-medium leading-relaxed space-y-5 text-gray-300 text-base">
              {data.explanation.split('\n\n').filter(p=>p.trim()).map((p,i)=>(
                <motion.p key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}>{p}</motion.p>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[{label:'AI Model',val:'Mistral 7B',desc:'Via Ollama — fully local'},{label:'Privacy',val:'100% Local',desc:'Zero external API calls'},{label:'Status',val:data.ollama_used?'Enhanced':'Fallback',desc:'AI enhancement status'}].map(({label,val,desc})=>(
              <div key={label} className="bg-white border-2 border-[#111111] rounded-[1.5rem] p-6 hover:shadow-[4px_4px_0_0_#111111] transition-all">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{label}</div>
                <div className="font-black text-[#111111] text-lg mb-1">{val}</div>
                <div className="text-xs text-gray-400">{desc}</div>
              </div>
            ))}
          </div>
        </>
      ):(
        <div className="bg-white border-2 border-[#111111] rounded-[2rem] p-16 text-center shadow-[6px_6px_0_0_#111111]">
          <div className="w-20 h-20 rounded-full border-4 border-[#111111] bg-gray-100 flex items-center justify-center mx-auto mb-6"><MessageSquare className="w-10 h-10 text-gray-300"/></div>
          <h3 className="text-2xl font-black font-display uppercase tracking-widest mb-3">No AI Insights</h3>
          <p className="text-gray-500 font-medium mb-2">Ollama may not be running.</p>
          <p className="text-sm text-gray-400">Run <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">ollama serve</code></p>
        </div>
      )}
    </div>
  );
}

function DashSkeleton({ data }: { data: AnalysisData }) {
  const [activeFile, setActiveFile] = useState<string|null>(null);
  const components = data.skeleton?.components || {};
  const fileNames  = Object.keys(components);
  return (
    <div className="space-y-6 tab-content-enter">
      <div className="bg-white border-2 border-[#111111] rounded-[2rem] overflow-hidden shadow-[6px_6px_0_0_#111111]">
        <div className="px-8 py-6 border-b-2 border-[#111111] flex items-center gap-4">
          <div className="p-2 bg-[#111111] text-white rounded-xl"><Code2 className="w-6 h-6"/></div>
          <div><h2 className="text-2xl font-black font-display uppercase tracking-widest">Generated Skeleton</h2>
          <p className="text-sm text-gray-500 mt-0.5 font-medium">Copy and start building immediately</p></div>
          {data.skeleton?.folder_structure&&<div className="ml-auto"><CopyButton text={data.skeleton.folder_structure}/></div>}
        </div>
        <div className="bg-gray-800 px-8 py-3 flex items-center gap-3 border-b-2 border-[#111111]">
          <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-400"/><div className="w-3 h-3 rounded-full bg-yellow-400"/><div className="w-3 h-3 rounded-full bg-green-400"/></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono ml-2">folder-structure.txt</span>
        </div>
        <div className="p-8 bg-[#1a1a2e] font-mono text-sm overflow-x-auto">
          <pre className="whitespace-pre-wrap text-green-400 leading-relaxed">{data.skeleton?.folder_structure||'// No structure generated'}</pre>
        </div>
        {data.skeleton?.install_command&&(
          <div className="border-t-2 border-[#111111]">
            <div className="bg-gray-800 px-8 py-2 flex items-center justify-between border-b-2 border-[#111111]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Install Command</span>
              <CopyButton text={data.skeleton.install_command}/>
            </div>
            <div className="p-6 bg-[#111111] font-mono text-sm flex items-center gap-3">
              <span className="text-gray-500 font-bold">$</span>
              <span className="text-green-400 font-bold">{data.skeleton.install_command}</span>
            </div>
          </div>
        )}
      </div>
      {fileNames.length>0&&(
        <div className="bg-white border-2 border-[#111111] rounded-[2rem] overflow-hidden shadow-[4px_4px_0_0_#111111]">
          <div className="px-8 py-5 border-b-2 border-[#111111]"><h3 className="text-lg font-black font-display uppercase tracking-widest">Component Files</h3></div>
          <div className="flex min-h-[200px]">
            <div className="w-52 border-r-2 border-[#111111] bg-gray-50">
              {fileNames.map(name=>(
                <button key={name} onClick={()=>setActiveFile(name===activeFile?null:name)}
                  className={`w-full text-left px-5 py-3.5 border-b border-gray-200 font-mono text-xs font-bold transition-all ${activeFile===name?'bg-[#111111] text-[#FF5500]':'text-gray-600 hover:bg-white hover:text-[#111111]'}`}>
                  {name}
                </button>
              ))}
            </div>
            <div className="flex-1 bg-[#1a1a2e] p-6 font-mono text-sm overflow-x-auto">
              {activeFile&&components[activeFile]?<pre className="whitespace-pre-wrap text-green-300 text-xs leading-relaxed">{components[activeFile]}</pre>:<p className="text-gray-500 font-bold text-xs">← Click a file to view</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashPerformance({ data }: { data: AnalysisData }) {
  const perf = data.performance;
  if (!perf) return (
    <div className="tab-content-enter bg-white border-2 border-[#111111] rounded-[2rem] p-16 text-center shadow-[6px_6px_0_0_#111111]">
      <div className="w-20 h-20 rounded-full border-4 border-[#111111] bg-gray-100 flex items-center justify-center mx-auto mb-6"><Zap className="w-10 h-10 text-gray-300"/></div>
      <h3 className="text-2xl font-black font-display uppercase tracking-widest mb-3">Performance Unavailable</h3>
    </div>
  );
  const speedScore = perf.speed_rating==='Fast'?92:perf.speed_rating==='Medium'?65:35;
  const speedColor = perf.speed_rating==='Fast'?'#22C55E':perf.speed_rating==='Medium'?'#F59E0B':'#EF4444';
  return (
    <div className="space-y-6 tab-content-enter">
      <div className="bg-[#111111] border-2 border-[#111111] rounded-[2rem] p-8 shadow-[8px_8px_0_0_#FF5500]">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="w-32 h-32 rounded-full border-[8px] border-[#FF5500] flex items-center justify-center bg-[#1a1a1a]">
              <div className="text-center">
                <div className="text-4xl font-black text-white font-display">{speedScore}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">/100</div>
              </div>
            </div>
            <span className="px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-sm border-2 border-white text-white" style={{background:speedColor}}>{perf.speed_rating}</span>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {[
              {label:'Load Time',  val:`${(perf.load_time_ms/1000).toFixed(2)}s`, good:perf.load_time_ms<1000},
              {label:'Page Size',  val:`${perf.page_size_kb} KB`,                 good:perf.page_size_kb<500},
              {label:'HTTP Status',val:perf.status_code.toString(),               good:perf.status_code===200},
              {label:'HTTPS',      val:perf.https?'Secure':'Not Secure',          good:perf.https??false},
            ].map(({label,val,good})=>(
              <div key={label} className="bg-[#1a1a1a] border border-[#333333] rounded-2xl p-4 text-center">
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">{label}</div>
                <div className={`font-black font-mono text-lg ${good?'text-green-400':'text-[#FF5500]'}`}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white border-2 border-[#111111] rounded-[2rem] p-8 shadow-[6px_6px_0_0_#111111]">
        <h2 className="text-xl font-black font-display uppercase tracking-widest mb-8 flex items-center gap-3"><Zap className="w-6 h-6 text-[#FF5500]"/>Detailed Metrics</h2>
        <div className="space-y-7">
          {[
            {label:'Speed',       val:speedScore, color:speedColor, note:perf.speed_rating},
            {label:'Response',    val:perf.status_code===200?100:50, color:'#111111', note:`HTTP ${perf.status_code}`},
            {label:'Security',    val:perf.https?100:0, color:'#22C55E', note:perf.https?'Secure':'Not Secure'},
            {label:'Compression', val:perf.compression?85:30, color:'#0EA5E9', note:perf.compression?'Enabled':'None'},
          ].map(({label,val,color,note}:any)=>(
            <div key={label}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-black uppercase tracking-widest">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">{note}</span>
                  <span className="font-mono font-black">{val}%</span>
                </div>
              </div>
              <div className="h-5 bg-gray-100 rounded-full overflow-hidden border-2 border-gray-200">
                <motion.div className="h-full rounded-full border-r-2 border-[#111111]"
                  initial={{width:0}} animate={{width:`${val}%`}} transition={{duration:1.2,ease:[0.22,1,0.36,1]}}
                  style={{background:color}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD — working sidebar tabs + export
// ══════════════════════════════════════════════════════════════
function DashboardView({ data, history, onNewScan }: { data: AnalysisData; history: HistoryItem[]; onNewScan: () => void }) {
  const [tab, setTab] = useState<DashTab>('overview');
  const [prevTab, setPrevTab] = useState<DashTab>('overview');
  if (!data) return null;

  const changeTab = (t: DashTab) => { setPrevTab(tab); setTab(t); };
  const score = computeScore(data);

  const exportReport = () => {
    const lines = [
      `STACKLENS ANALYSIS REPORT`,`========================`,
      `URL: ${data.url}`,`Domain: ${data.domain}`,
      `Date: ${new Date().toLocaleString()}`,`Scrape Method: ${data.scrape_method}`,
      `Response Time: ${data.response_time_ms}ms`,`Tech Score: ${score}/100`,``,
      `TECH STACK`,`----------`,
      ...Object.entries(data.stack||{}).map(([cat,name])=>`• ${name} (${cat})`),``,
      `PAGE STRUCTURE`,`--------------`,
      ...(data.structure||[]).map((s,i)=>`${i+1}. ${s}`),``,
      `UI COMPONENTS`,`-------------`,
      (data.ui_components||[]).join(', ')||'None',``,
      `AI INSIGHTS`,`-----------`,data.explanation||'Not available',``,
      `CODE SKELETON`,`-------------`,data.skeleton?.folder_structure||'Not generated',``,
      `Install: ${data.skeleton?.install_command||'N/A'}`,``,
      `PERFORMANCE`,`-----------`,
      data.performance?[`Load Time: ${(data.performance.load_time_ms/1000).toFixed(2)}s`,`Page Size: ${data.performance.page_size_kb} KB`,`HTTP: ${data.performance.status_code}`,`Speed: ${data.performance.speed_rating}`,`HTTPS: ${data.performance.https?'Yes':'No'}`].join('\n'):'Not available',``,
      `Generated by StackLens — Team Delvrixo Syndicate — HackIndia Spark 4`,
    ].join('\n');
    const blob=new Blob([lines],{type:'text/plain'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`stacklens-${data.domain}-report.txt`;a.click();
    URL.revokeObjectURL(url);
  };

  const TABS: { id: DashTab; label: string; icon: any }[] = [
    {id:'overview',label:'Overview',icon:Activity},
    {id:'stack',label:'Tech Stack',icon:Terminal},
    {id:'architecture',label:'Architecture',icon:Layers},
    {id:'ai',label:'AI Insights',icon:MessageSquare},
    {id:'skeleton',label:'Code Skeleton',icon:Code2},
    {id:'performance',label:'Performance',icon:Zap},
  ];
  const activeTab = TABS.find(t=>t.id===tab)!;

  return (
    <div className="flex h-[calc(100vh-6rem)]">
      {/* Sidebar */}
      <aside className="w-72 border-r-2 border-[#111111] bg-white hidden lg:flex flex-col">
        <div className="p-5 border-b-2 border-[#111111] bg-[#111111]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Analyzing</div>
          <div className="font-mono font-black text-white truncate">{data.domain}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse"/>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{data.from_cache?'Cached':'Live Analysis'}</span>
          </div>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto" data-lenis-prevent>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 px-3 py-2 mb-1">Sections</div>
          {TABS.map(({id,label,icon:Icon})=>(
            <button key={id} onClick={()=>changeTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all mb-1 text-left group
                ${tab===id?'bg-[#111111] text-white shadow-[4px_4px_0_0_#FF5500]':'text-gray-500 hover:bg-gray-100 hover:text-[#111111]'}`}>
              <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${tab===id?'text-[#FF5500]':'group-hover:text-[#FF5500]'}`}/>
              <span className="uppercase tracking-widest text-[11px] font-black">{label}</span>
              {tab===id&&<ChevronRight className="w-4 h-4 ml-auto text-[#FF5500]"/>}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t-2 border-[#111111] p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Recent Scans</div>
          {history.slice(0,3).map((h,i)=>(
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#111111] transition-all">
              <Clock className="w-4 h-4 flex-shrink-0 text-[#FF5500]"/>
              <span className="truncate text-[10px] font-bold uppercase tracking-widest">{h.url.replace(/^https?:\/\//,'')}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-[#F5F5F0]/95 border-b-2 border-[#111111] px-8 py-4 flex items-center gap-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center flex-shrink-0">
            <activeTab.icon className="w-5 h-5 text-[#FF5500]"/>
          </div>
          <div>
            <h1 className="text-xl font-black font-display uppercase tracking-widest text-[#111111]">{activeTab.label}</h1>
            <p className="text-xs text-gray-500 font-bold truncate">{data.url} · Score: {score}/100</p>
          </div>
          <div className="ml-auto flex gap-3">
            <button onClick={onNewScan}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs border-2 border-[#111111] bg-white hover:shadow-[4px_4px_0_0_#111111] transition-all">
              <RotateCcw className="w-4 h-4"/> New Scan
            </button>
            <button onClick={exportReport}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs border-2 border-[#111111] bg-[#FF5500] text-white hover:bg-[#111111] hover:shadow-[4px_4px_0_0_#FF5500] transition-all">
              <Download className="w-4 h-4"/> Export
            </button>
          </div>
        </div>

        {/* ── Scrollable content — data-lenis-prevent stops Lenis hijacking this div ── */}
        <div
          className="flex-1 overflow-y-auto p-8 bg-[#F5F5F0]"
          data-lenis-prevent
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#FF5500 #E5E7EB',
          }}
        >
          <style>{`
            [data-lenis-prevent]::-webkit-scrollbar { width: 8px; }
            [data-lenis-prevent]::-webkit-scrollbar-track { background: #F5F5F0; border-left: 2px solid #E5E7EB; }
            [data-lenis-prevent]::-webkit-scrollbar-thumb { background: #FF5500; border-radius: 0; border: none; }
            [data-lenis-prevent]::-webkit-scrollbar-thumb:hover { background: #111111; }
          `}</style>
          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {tab==='overview'     && <DashOverview     data={data}/>}
                {tab==='stack'        && <DashStack        data={data}/>}
                {tab==='architecture' && <DashArchitecture data={data}/>}
                {tab==='ai'           && <DashAI           data={data}/>}
                {tab==='skeleton'     && <DashSkeleton     data={data}/>}
                {tab==='performance'  && <DashPerformance  data={data}/>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ANALYZING VIEW — animated
// ══════════════════════════════════════════════════════════════
function AnalyzingView({ url }: { url: string }) {
  const steps = ['Booting headless browser...','Scraping DOM & JS bundles...','Analyzing headers & network...','Running AI inference (Mistral)...'];
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6">
      <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:0.5,ease:[0.22,1,0.36,1]}}
        className="relative w-32 h-32 mb-10">
        <div className="absolute inset-0 border-[6px] border-gray-200 rounded-full"/>
        <div className="absolute inset-0 border-[6px] border-[#111111] rounded-full border-t-transparent animate-spin"/>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 bg-[#FF5500] rounded-full animate-pulse-ring border-2 border-[#111111]"/>
        </div>
        <div className="scan-line"/>
      </motion.div>
      <motion.h2 {...fadeUp(0.1)} className="text-3xl font-black font-display uppercase tracking-widest mb-4">Analyzing Target</motion.h2>
      <motion.div {...fadeUp(0.2)} className="bg-white border-2 border-[#111111] px-6 py-3 rounded-full font-mono text-sm shadow-[4px_4px_0_0_#111111] font-bold mb-12 cursor-blink">{url||'...'}</motion.div>
      <div className="w-80 space-y-3">
        {steps.map((text,i)=>{
          const [vis,setVis] = useState(false);
          useEffect(()=>{ const t=setTimeout(()=>setVis(true),i*800); return()=>clearTimeout(t); },[]);
          return (
            <div key={i} className={`flex items-center gap-4 bg-white border-2 border-[#111111] p-4 rounded-2xl font-mono text-sm transition-all duration-500 ${vis?'opacity-100 shadow-[4px_4px_0_0_#111111]':'opacity-0 translate-y-4'}`}>
              <div className={`w-4 h-4 rounded-full border-2 border-[#111111] flex-shrink-0 transition-all ${vis?'bg-[#FF5500] animate-pulse':'bg-gray-200'}`}/>
              <span className="font-bold text-[#111111]">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  AUTH VIEW
// ══════════════════════════════════════════════════════════════
function AuthView({ onLogin, onBack }: { onLogin:(u:LocalUser)=>void; onBack:()=>void }) {
  const [isSignup,setIsSignup]=useState(false);
  const [name,setName]=useState('');const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');
  const [showPw,setShowPw]=useState(false);const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const pwS=password.length===0?0:password.length<6?1:password.length<10?2:3;
  const pwC=['','#EF4444','#F59E0B','#22C55E'];

  const handle=async(e:React.FormEvent)=>{
    e.preventDefault();setError('');
    if(isSignup&&password!==confirm){setError('Passwords do not match');return;}
    if(isSignup&&password.length<8){setError('Use at least 8 characters');return;}
    setLoading(true);
    try{
      if(isSignup){const c=await createUserWithEmailAndPassword(auth,email,password);if(name)await updateProfile(c.user,{displayName:name});onLogin({email,displayName:name});}
      else{await signInWithEmailAndPassword(auth,email,password);onLogin({email});}
      onBack();
    }catch(err:any){
      const c=err?.code||'';
      if(c==='auth/email-already-in-use')setError('Email already registered.');
      else if(c==='auth/user-not-found'||c==='auth/wrong-password'||c==='auth/invalid-credential')setError('Wrong email or password.');
      else if(c==='auth/weak-password')setError('Password too weak.');
      else if(c==='auth/invalid-email')setError('Enter a valid email.');
      else if(c==='auth/too-many-requests')setError('Too many attempts. Try later.');
      else setError('Authentication failed. Please try again.');
    }finally{setLoading(false);}
  };

  const cls="w-full border-4 border-[#111111] bg-gray-50 p-4 font-bold text-[#111111] focus:outline-none focus:bg-white focus:border-[#FF5500] rounded-xl transition-all";
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-6">
      <motion.div {...fadeUp(0)} className="w-full max-w-md relative bg-white border-2 border-[#111111] rounded-[2rem] overflow-hidden shadow-[12px_12px_0_0_#111111] p-10 flex flex-col gap-6">
        <button onClick={onBack} className="absolute top-8 right-8 text-gray-400 hover:text-[#111111]"><X className="w-6 h-6"/></button>
        <div className="flex items-center justify-between border-b-4 border-[#111111] pb-6">
          <h2 className="text-3xl font-black font-display uppercase tracking-widest">{isSignup?'Create Account':'Sign In'}</h2>
          <div className="w-4 h-4 rounded-full bg-[#FF5500] border-2 border-[#111111] animate-pulse"/>
        </div>
        <AnimatePresence>
          {error&&(
            <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="bg-red-50 border-2 border-red-400 text-red-700 px-5 py-3 rounded-xl flex items-center gap-3 text-sm font-bold">
              <AlertTriangle className="w-5 h-5 flex-shrink-0"/>{error}
            </motion.div>
          )}
        </AnimatePresence>
        <form onSubmit={handle} className="flex flex-col gap-5">
          {isSignup&&(<div><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Full Name</label><input type="text" value={name} onChange={e=>{setName(e.target.value);setError('');}} placeholder="Your name" className={cls} disabled={loading}/></div>)}
          <div><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Email</label><input type="email" required value={email} onChange={e=>{setEmail(e.target.value);setError('');}} placeholder="developer@example.com" className={cls} disabled={loading}/></div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Password</label>
            <div className="relative">
              <input type={showPw?'text':'password'} required value={password} onChange={e=>{setPassword(e.target.value);setError('');}} placeholder="••••••••" className={cls+' pr-14'} disabled={loading}/>
              <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111111]">{showPw?<EyeOff className="w-5 h-5"/>:<Eye className="w-5 h-5"/>}</button>
            </div>
            {isSignup&&password.length>0&&(
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-1 flex-1">{[1,2,3].map(l=><div key={l} className="flex-1 h-2 rounded-full border border-gray-200 transition-all" style={{background:pwS>=l?pwC[pwS]:'#E5E7EB'}}/>)}</div>
                <span className="text-xs font-black" style={{color:pwC[pwS]}}>{['','Weak','Fair','Strong'][pwS]}</span>
              </div>
            )}
          </div>
          {isSignup&&(<div><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 block">Confirm</label><input type="password" value={confirm} onChange={e=>{setConfirm(e.target.value);setError('');}} placeholder="••••••••" className={cls+(confirm&&confirm!==password?' !border-red-400':confirm&&confirm===password?' !border-green-500':'')} disabled={loading}/></div>)}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs border-2 border-[#111111] bg-[#111111] text-white hover:bg-[#FF5500] hover:shadow-[4px_4px_0_0_rgba(17,17,17,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2">
            {loading?<span className="flex gap-1.5"><span className="dot-1 w-2 h-2 bg-white rounded-full inline-block"/><span className="dot-2 w-2 h-2 bg-white rounded-full inline-block"/><span className="dot-3 w-2 h-2 bg-white rounded-full inline-block"/></span>:isSignup?'Create Account →':'Sign In →'}
          </button>
        </form>
        <div className="flex items-center gap-3"><div className="flex-1 h-0.5 bg-gray-200"/><span className="text-xs text-gray-400 font-bold">OR</span><div className="flex-1 h-0.5 bg-gray-200"/></div>
        <button onClick={()=>{setIsSignup(!isSignup);setError('');}} className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-[#FF5500] transition-colors text-center">
          {isSignup?'Already have an account? Sign In →':"No account? Create One →"}
        </button>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  LANDING — full Lenis + framer-motion experience
// ══════════════════════════════════════════════════════════════
const TICKER_SITES = ['stripe.com','vercel.com','linear.app','notion.so','github.com','tailwindcss.com','nextjs.org','supabase.com','figma.com','shopify.com'];
const DEMO_SITES   = ['stripe.com','vercel.com','linear.app','notion.so','github.com'];

function LandingView({ user, url, setUrl, onAnalyze, onLoginClick }: any) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 600], [0, -80]);
  const heroScale    = useTransform(scrollY, [0, 600], [1, 0.97]);
  const heroOpacity  = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <div className="max-w-7xl mx-auto px-6">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section ref={heroRef} className="min-h-screen flex flex-col justify-center pt-28 pb-20 relative overflow-hidden">

        {/* Floating decorative elements */}
        <motion.div style={{y:useTransform(scrollY,[0,600],[0,-40])}}
          className="absolute right-10 top-32 w-20 h-20 border-4 border-[#111111] rounded-[2rem] bg-[#FF5500] opacity-15 animate-float-slow hidden lg:block"/>
        <motion.div style={{y:useTransform(scrollY,[0,600],[0,-60])}}
          className="absolute right-40 top-64 w-10 h-10 border-4 border-[#111111] rounded-full bg-[#111111] opacity-10 animate-float-delay hidden lg:block"/>
        <motion.div style={{y:useTransform(scrollY,[0,600],[0,-30])}}
          className="absolute left-0 bottom-32 w-14 h-14 border-4 border-[#111111] bg-white opacity-60 animate-float-delay2 hidden lg:block"/>

        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Left copy */}
          <motion.div style={{y:heroParallax, scale:heroScale}} className="w-full lg:w-1/2 flex flex-col items-start gap-8 z-10">

            {/* Badge */}
            <motion.div {...fadeUp(0.05)}
              className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white border-2 border-[#111111] text-[10px] font-bold uppercase tracking-[0.2em] shadow-[4px_4px_0_0_#111111]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5500] opacity-75"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5500]"/>
              </span>
              StackLens Engine · Live
            </motion.div>

            {/* Headline — stagger each word */}
            <div className="overflow-hidden">
              <motion.h1 className="text-6xl md:text-8xl font-black tracking-tighter text-[#111111] leading-[0.9] font-display uppercase"
                initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
                {['Reverse', 'Engineer', ''].map((word, i) => (
                  <motion.span key={i} className="block" variants={{ hidden: { y: 80, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}>
                    {i === 2 ? <span className="text-[#FF5500]">Any Website.</span> : word}
                  </motion.span>
                ))}
              </motion.h1>
            </div>

            <motion.p {...fadeUp(0.45)} className="text-lg md:text-xl text-gray-600 max-w-xl leading-relaxed font-medium">
              AI-powered platform that analyzes any website and reveals the technologies, frameworks, architecture, and performance behind it — in under 60 seconds.
            </motion.p>

            {/* URL input / lock */}
            <motion.div {...fadeUp(0.55)} className="w-full max-w-lg">
              {user ? (
                <form onSubmit={onAnalyze}
                  className="relative flex items-center bg-white border-4 border-[#111111] rounded-full p-2 shadow-[8px_8px_0_0_#111111] focus-within:translate-y-1 focus-within:shadow-[4px_4px_0_0_#111111] transition-all duration-200">
                  <div className="pl-6 text-[#111111]"><Globe className="w-6 h-6"/></div>
                  <input type="url" required placeholder="https://example.com" value={url} onChange={e=>setUrl(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-[#111111] px-4 py-3 placeholder:text-gray-400 focus:ring-0 font-bold text-lg"/>
                  <button type="submit"
                    className="group flex items-center gap-2 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs bg-[#111111] text-white hover:bg-[#FF5500] hover:shadow-[4px_4px_0_0_rgba(17,17,17,0.3)] border-2 border-[#111111] transition-all">
                    Analyze <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                  </button>
                </form>
              ) : (
                <div className="relative bg-white border-2 border-[#111111] rounded-[2rem] overflow-hidden p-8 text-center shadow-[12px_12px_0_0_#111111] bg-[#111111]"
                  style={{background:'#111111'}}>
                  <Lock className="w-10 h-10 text-[#FF5500] mx-auto mb-4"/>
                  <h3 className="text-2xl font-black font-display uppercase tracking-widest text-white mb-2">Unlock Scanner</h3>
                  <p className="text-sm text-gray-400 mb-6 font-medium">Create a free account to analyze any website.</p>
                  <button onClick={onLoginClick}
                    className="group w-full flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs bg-[#FF5500] border-2 border-[#FF5500] text-white hover:bg-white hover:text-[#111111] hover:border-[#111111] transition-all">
                    Authenticate to Analyze
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                  </button>
                </div>
              )}
            </motion.div>

            {/* Demo site buttons */}
            {user && (
              <motion.div {...fadeIn(0.7)} className="flex flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 self-center mr-1">Try:</span>
                {DEMO_SITES.map(site=>(
                  <button key={site} onClick={()=>{setUrl(`https://${site}`);}}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-[#111111] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#FF5500] hover:text-white hover:border-[#FF5500] hover:shadow-[3px_3px_0_0_#111111] transition-all">
                    {site} <ArrowRight className="w-3 h-3"/>
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Right — animated scanner visual */}
          <motion.div {...fadeIn(0.3)} className="w-full lg:w-1/2 relative h-[500px] flex items-center justify-center">
            <motion.div animate={{y:[0,-12,0]}} transition={{duration:5,repeat:Infinity,ease:'easeInOut'}}
              className="relative w-[400px] h-[450px] bg-[#EAEAEA] border-4 border-[#111111] rounded-[3rem] shadow-[16px_16px_0_0_rgba(0,0,0,0.12)] flex flex-col items-center justify-center overflow-hidden">
              {['top-6 left-6','top-6 right-6','bottom-6 left-6','bottom-6 right-6'].map(pos=><div key={pos} className={`absolute ${pos} w-4 h-4 rounded-full border-2 border-[#111111] bg-gray-300`}/>)}
              <div className="w-[85%] h-[85%] bg-white border-4 border-[#111111] rounded-[2rem] p-6 flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center border-b-2 border-[#111111] pb-4 mb-6">
                  <div className="font-display font-black text-xl uppercase tracking-widest text-[#111111]">Scanner_Core</div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300 border border-[#111111]"/>
                    <div className="w-3 h-3 rounded-full bg-[#FF5500] border border-[#111111] animate-pulse"/>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center relative">
                  <div className="w-48 h-48 border-[6px] border-[#111111] rounded-full absolute"/>
                  <div className="w-32 h-32 border-4 border-dashed border-gray-300 rounded-full absolute animate-spin-slow"/>
                  <div className="w-16 h-16 bg-[#111111] text-white rounded-full flex items-center justify-center absolute z-10"><Search className="w-6 h-6"/></div>
                  <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-transparent to-[#FF5500]/20 animate-spin-slow origin-bottom border-b-4 border-[#FF5500]"/>
                </div>
                {/* Scan line */}
                <div className="scan-line"/>
                <div className="absolute bottom-6 left-6 right-6 flex justify-between">
                  <div className="px-4 py-1.5 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-widest rounded-full">L1: DOM</div>
                  <div className="px-4 py-1.5 bg-[#FF5500] text-white border-2 border-[#111111] text-[10px] font-bold uppercase tracking-widest rounded-full">L4: AI</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div {...fadeIn(1.2)} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Scroll</span>
          <motion.div animate={{y:[0,8,0]}} transition={{duration:1.5,repeat:Infinity}}><ArrowDown className="w-5 h-5"/></motion.div>
        </motion.div>
      </section>

      {/* ── TICKER ───────────────────────────────────────────── */}
      <motion.div {...revealInView(0)} className="mb-24 border-y-2 border-[#111111] py-4 bg-[#111111] -mx-6 px-0 overflow-hidden">
        <div className="ticker-wrap">
          <div className="ticker-track">
            {[...TICKER_SITES,...TICKER_SITES,...TICKER_SITES,...TICKER_SITES].map((site,i)=>(
              <span key={i} className="inline-flex items-center gap-4 px-8 text-white/60 font-bold text-sm uppercase tracking-widest">
                <span className="text-[#FF5500]">→</span>{site}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="mb-32">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {val:'1500',suffix:'+',label:'Technologies Detected'},
            {val:'60',suffix:'s',label:'Average Analysis'},
            {val:'4',suffix:'',label:'Fallback Layers'},
            {val:'100',suffix:'%',label:'Free Forever'},
          ].map(({val,suffix,label},i)=>(
            <motion.div key={i} {...revealInView(i*0.1)}
              className="bg-white border-2 border-[#111111] rounded-[2rem] p-8 text-center hover:shadow-[6px_6px_0_0_#111111] hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="text-4xl md:text-5xl font-black font-display text-[#FF5500] mb-2">
                <Counter to={val}/>{suffix}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── WHAT IT DOES ─────────────────────────────────────── */}
      <section className="mb-32">
        <motion.div {...revealInView(0)} className="text-center mb-14">
          <h2 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight mb-4">What StackLens Does</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg font-medium leading-relaxed">
            Combine intelligent scraping, AI analysis, and real-time detection to get a complete breakdown of any website.
          </p>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {[
            [Cpu,'Frontend Frameworks'],[Server,'Backend Technologies'],[Box,'APIs & Integrations'],
            [Globe,'Hosting Platforms'],[Zap,'Performance Metrics'],[Code2,'Code Structure'],
          ].map(([Icon,label]:any,i)=>(
            <motion.div key={i} {...revealInView(i*0.07)}
              className="group bg-white border-2 border-[#111111] rounded-[2rem] p-8 text-center hover:bg-[#111111] hover:text-white hover:shadow-[8px_8px_0_0_#FF5500] hover:-translate-y-2 transition-all duration-300 cursor-default">
              <Icon className="w-10 h-10 text-[#111111] group-hover:text-[#FF5500] mx-auto mb-4 transition-colors"/>
              <h3 className="font-black font-display uppercase tracking-widest text-sm">{label}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 4-LAYER ENGINE ───────────────────────────────────── */}
      <section id="how-it-works" className="mb-32">
        <motion.div {...revealInView(0)} className="text-center mb-14">
          <h2 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight mb-4">4-Layer Inference Engine</h2>
          <p className="text-gray-600 max-w-xl mx-auto text-lg font-medium">We always return results. Never a blank screen.</p>
        </motion.div>
        <div className="space-y-5 max-w-4xl mx-auto">
          {[
            {num:'01',title:'Playwright — Full JS Render',desc:'Headless Chromium renders the page like a real user. Detects React, Next.js, Vue, Angular.',accent:false},
            {num:'02',title:'Requests + BeautifulSoup',desc:'Direct HTTP + HTML parsing. Works on static sites, WordPress, CMS platforms.',accent:false},
            {num:'03',title:'HTTP Headers Only',desc:'Server headers reveal CDN, hosting, infrastructure — even when scraping is blocked.',accent:false},
            {num:'04',title:'Ollama AI Inference (Mistral 7B)',desc:'Local AI infers the stack when everything else fails. Zero cost. Zero data leaks. Always a result.',accent:true},
          ].map(({num,title,desc,accent},i)=>(
            <motion.div key={num} {...revealInView(i*0.1)}
              className={`flex flex-col md:flex-row items-start md:items-center gap-8 p-8 border-2 border-[#111111] rounded-[2rem] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_${accent?'#FF5500':'#111111'}] transition-all duration-300 cursor-default ${accent?'bg-[#111111] text-white':'bg-white'}`}>
              <div className={`w-20 h-20 rounded-full border-4 border-[#111111] flex items-center justify-center flex-shrink-0 font-black text-3xl font-display ${accent?'bg-[#FF5500] border-white text-white':'bg-[#FF5500] text-white'}`}>
                {num.slice(1)}
              </div>
              <div>
                <div className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${accent?'text-gray-400':'text-gray-500'}`}>Layer {num.slice(1)}</div>
                <h3 className="text-2xl font-black font-display uppercase tracking-widest mb-2">{title}</h3>
                <p className={`font-medium leading-relaxed ${accent?'text-gray-400':'text-gray-600'}`}>{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="mb-32">
        <motion.div {...revealInView(0)} className="text-center mb-14">
          <h2 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight mb-4">Powerful Features</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            [Zap,'Instant Tech Detection','Identify frameworks, CDN, hosting, analytics — 1500+ signatures across the web.'],
            [Cpu,'AI Architecture Map','Mistral 7B explains exactly how the system is built and WHY those choices were made.'],
            [Search,'Deep Code Insights','Detect API integrations, analytics tools, third-party services, and tracking scripts.'],
            [Layers,'Structure Visualization','Visual hierarchy: Navbar → Hero → Features → Footer and everything in between.'],
          ].map(([Icon,title,desc]:any,i)=>(
            <motion.div key={i} {...revealInView(i*0.1)}
              className="group bg-white border-2 border-[#111111] rounded-[2rem] p-10 hover:bg-[#111111] hover:text-white hover:shadow-[8px_8px_0_0_#FF5500] hover:-translate-y-2 transition-all duration-300 cursor-default overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5500] opacity-0 group-hover:opacity-5 rounded-full translate-x-16 -translate-y-16 transition-all duration-500"/>
              <Icon className="w-10 h-10 text-[#111111] mb-6 group-hover:text-[#FF5500] transition-colors"/>
              <h3 className="text-2xl font-black font-display uppercase tracking-widest mb-4">{title}</h3>
              <p className="text-gray-600 group-hover:text-gray-300 font-medium leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── TECH STACK ───────────────────────────────────────── */}
      <motion.section {...revealInView(0)} id="tech-stack" className="mb-32">
        <div className="bg-[#111111] text-white p-12 md:p-20 rounded-[3rem] border-4 border-[#111111] shadow-[16px_16px_0_0_#FF5500] overflow-hidden relative">
          {/* Decorative dots */}
          <div className="absolute right-8 top-8 grid grid-cols-5 gap-3 opacity-20">
            {Array(20).fill(0).map((_,i)=><div key={i} className="w-2 h-2 rounded-full bg-white"/>)}
          </div>
          <div className="flex flex-col md:flex-row gap-16 items-center relative z-10">
            <div className="w-full md:w-1/2">
              <MessageSquare className="w-12 h-12 text-[#FF5500] mb-6 animate-float-slow"/>
              <h2 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight mb-6">Powered by<br/>Local AI</h2>
              <p className="text-gray-400 font-medium leading-relaxed text-lg mb-4">
                Runs on Playwright + <span className="text-white font-bold">Ollama / Mistral 7B</span> — fully offline, zero API costs, complete privacy.
              </p>
              <p className="text-gray-500 text-sm font-medium">Your data never leaves your machine.</p>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
              {[['Frontend','Next.js + React'],['Backend','FastAPI (Python)'],['Scraper','Playwright'],['AI','Ollama / Mistral 7B']].map(([l,v],i)=>(
                <motion.div key={i} {...revealInView(i*0.08)}
                  className={`p-6 border-2 rounded-2xl hover:-translate-y-1 transition-all duration-300 ${i===3?'bg-[#FF5500] border-[#FF5500] text-[#111111]':'border-white/20 bg-white/5'}`}>
                  <div className={`text-[10px] uppercase font-bold mb-2 tracking-widest ${i===3?'text-[#111111]/70':'text-gray-400'}`}>{l}</div>
                  <div className="font-bold text-lg">{v}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <motion.section {...revealInView(0)} className="mb-20 text-center border-t-4 border-[#111111] pt-24">
        <Shield className="w-16 h-16 text-[#111111] mx-auto mb-8 animate-float"/>
        <h2 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight mb-6">Built for Developers</h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-10 text-lg font-medium leading-relaxed">
          For developers, founders, and researchers. Popular sites like Stripe, Vercel, and Linear are pre-cached for instant demo results.
        </p>
        {!user&&(
          <button onClick={onLoginClick}
            className="group inline-flex items-center gap-3 px-10 py-5 rounded-full font-bold uppercase tracking-widest text-sm border-2 border-[#111111] bg-[#111111] text-white hover:bg-[#FF5500] hover:shadow-[6px_6px_0_0_rgba(17,17,17,0.3)] transition-all">
            Create an Account to Start Scanning
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
          </button>
        )}
      </motion.section>

      {/* Footer */}
      <footer className="border-t-2 border-[#111111] py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold uppercase tracking-widest text-gray-400">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#111111] bg-white flex items-center justify-center">
            <Layers className="w-4 h-4 text-[#111111]"/>
          </div>
          <span>StackLens · <span className="text-[#111111]">Algo Force</span> · HackIndia Spark 4 · 2026</span>
        </div>
        <span>Next.js + FastAPI + Ollama + Firebase</span>
      </footer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROOT APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const { user:fbUser, loading:authLoading, logout:fbLogout } = useAuth();
  const [activeView, setActiveView] = useState<'landing'|'analyzing'|'dashboard'|'auth'>('landing');
  const [url,  setUrl]  = useState('');
  const [menu, setMenu] = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [analysisData, setAnalysisData] = useState<AnalysisData|null>(null);
  const [history, setHistory]           = useState<HistoryItem[]>([]);
  const [user, setUser]                 = useState<LocalUser|null>(null);

  useEffect(()=>{
    if(!authLoading){
      if(fbUser) setUser({email:fbUser.email||'',displayName:fbUser.displayName||''});
      else setUser(null);
    }
  },[fbUser,authLoading]);

  useEffect(()=>{
    if(!authLoading&&fbUser&&activeView==='auth') setActiveView('landing');
  },[fbUser,authLoading]);

  useEffect(()=>{
    fetch(`${API_BASE}/api/history`).then(r=>r.json()).then(d=>{if(d?.history)setHistory(d.history);}).catch(()=>{});
  },[activeView]);

  // ── Safe Lenis smooth scroll (silent if package not installed) ──
  useEffect(() => {
    let raf: number; let lenis: any = null;
    import('lenis').then(({ default: Lenis }) => {
      lenis = new Lenis({
        duration: 1.4,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9,
        // Prevent Lenis from hijacking scroll on elements with data-lenis-prevent
        prevent: (node: Element) => node.hasAttribute('data-lenis-prevent'),
      });
      (window as any).__lenis = lenis;
      const animate = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(animate); };
      raf = requestAnimationFrame(animate);
    }).catch(() => {});
    return () => { cancelAnimationFrame(raf); lenis?.destroy(); try { delete (window as any).__lenis; } catch(_){} };
  }, []);

  const handleAnalyze=async(e?:React.FormEvent)=>{
    e?.preventDefault();
    if(!user)return;

    // Sanitize & validate input before sending
    const sanitized = sanitizeUrl(url);
    if (!sanitized.ok) {
      setErrorMsg(sanitized.error || 'Invalid URL.');
      return;
    }
    const cleanUrl = sanitized.url;

    setErrorMsg('');setActiveView('analyzing');
    try{
      // Get Firebase token to send with request
      const { getAuth } = await import('firebase/auth');
      const fbAuth = getAuth();
      const token  = fbAuth.currentUser ? await fbAuth.currentUser.getIdToken() : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res=await fetch(`${API_BASE}/api/analyze`,{
        method:'POST',
        headers,
        body:JSON.stringify({url: cleanUrl})
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({}));
        throw new Error(err.detail || `Server ${res.status}`);
      }
      const data:AnalysisData=await res.json();
      setAnalysisData(data);setActiveView('dashboard');
    }catch(err:any){
      setErrorMsg(`Analysis failed: ${err.message}. Make sure FastAPI is running on port 8000.`);
      setActiveView('landing');
    }
  };

  const handleLogout=async()=>{ await fbLogout(); setUser(null); setActiveView('landing'); };

  if(authLoading) return (
    <div className="min-h-screen bg-[#F5F5F0] bg-grid flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-[6px] border-gray-200 rounded-full"/>
          <div className="absolute inset-0 border-[6px] border-[#111111] rounded-full border-t-transparent animate-spin"/>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-[#FF5500] rounded-full border-2 border-[#111111] animate-pulse"/>
          </div>
        </div>
        <p className="font-black uppercase tracking-[0.2em] text-sm text-gray-500">Loading StackLens...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-gray-900 font-sans overflow-x-hidden bg-[#F5F5F0]">
      <ScrollProgress/>
      <div className="fixed inset-0 pointer-events-none z-0 bg-grid"/>

      {/* ── Navbar ────────────────────────────────────────────── */}
      <motion.nav initial={{y:-80,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:0.6,ease:[0.22,1,0.36,1]}}
        className="fixed top-0 w-full z-50 bg-[#F5F5F0]/90 backdrop-blur-md border-b-2 border-transparent">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <button onClick={()=>setActiveView('landing')} className="flex items-center gap-3 group">
            <motion.div whileHover={{scale:1.1,rotate:5}} whileTap={{scale:0.95}}
              className="w-12 h-12 rounded-full border-2 border-[#111111] bg-white flex items-center justify-center group-hover:bg-[#FF5500] group-hover:border-[#FF5500] transition-colors">
              <Layers className="w-6 h-6 text-[#111111] group-hover:text-white transition-colors"/>
            </motion.div>
            <span className="text-2xl font-black tracking-tighter uppercase font-display text-[#111111]">StackLens</span>
          </button>

          <div className="hidden md:flex items-center gap-10 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            {[['Engine','#how-it-works'],['Features','#features'],['Tech','#tech-stack']].map(([label,href])=>(
              <button key={label}
                onClick={(e) => {
                  e.preventDefault();
                  if (activeView !== 'landing') { setActiveView('landing'); setTimeout(() => { document.querySelector(href)?.scrollIntoView({behavior:'smooth'}); }, 100); return; }
                  const target = document.querySelector(href);
                  if (!target) return;
                  // Use Lenis if available, fallback to native smooth scroll
                  const lenisInstance = (window as any).__lenis;
                  if (lenisInstance) { lenisInstance.scrollTo(target, { offset: -96, duration: 1.4, easing: (t:number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) }); }
                  else { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
                }}
                className="relative hover:text-[#111111] transition-colors group text-left">
                {label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-[#FF5500] group-hover:w-full transition-all duration-300"/>
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em]">
                  <motion.div whileHover={{scale:1.1}} className="w-8 h-8 rounded-full bg-[#FF5500] border-2 border-[#111111] flex items-center justify-center text-white font-black text-sm">
                    {(user.displayName?.[0]||user.email[0]).toUpperCase()}
                  </motion.div>
                  <span className="text-[#111111] max-w-[120px] truncate">{user.email}</span>
                </div>
                <button onClick={handleLogout}
                  className="px-6 py-2 rounded-full border-2 border-[#111111] bg-white text-xs font-bold uppercase tracking-widest hover:bg-gray-100 hover:shadow-[4px_4px_0_0_#111111] transition-all">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button onClick={()=>setActiveView('auth')} className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600 hover:text-[#FF5500] transition-colors">Sign In</button>
                <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>setActiveView('auth')}
                  className="px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs bg-[#111111] text-white hover:bg-[#FF5500] border-2 border-[#111111] transition-all">
                  Get Started
                </motion.button>
              </>
            )}
          </div>

          <button className="md:hidden text-[#111111]" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
        </div>

        <AnimatePresence>
          {menu && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
              className="border-t-2 border-[#111111] px-6 py-5 space-y-3 bg-[#F5F5F0] overflow-hidden">
              {user?<button onClick={handleLogout} className="block text-xs font-bold uppercase text-gray-600 py-2">Log Out</button>:<>
                <button onClick={()=>{setActiveView('auth');setMenu(false);}} className="block text-xs font-bold uppercase text-[#FF5500] py-2">Sign In</button>
                <button onClick={()=>{setActiveView('auth');setMenu(false);}} className="block text-xs font-bold uppercase text-[#111111] py-2">Get Started</button>
              </>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <main className="relative z-10 pt-0">
        <AnimatePresence>
          {errorMsg&&(
            <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              className="max-w-3xl mx-auto mt-6 px-6 pt-24">
              <div className="bg-red-50 border-2 border-red-500 text-red-700 px-6 py-4 rounded-[1rem] flex items-center gap-4 shadow-[4px_4px_0_0_#EF4444]">
                <AlertTriangle className="w-6 h-6 flex-shrink-0"/><p className="font-bold text-sm">{errorMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeView==='landing' && (
            <motion.div key="landing" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}}
              className="pt-0">
              <LandingView user={user} url={url} setUrl={setUrl} onAnalyze={handleAnalyze} onLoginClick={()=>setActiveView('auth')}/>
            </motion.div>
          )}
          {activeView==='auth' && (
            <motion.div key="auth" initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.97}} transition={{duration:0.3}}
              className="pt-24">
              <AuthView onLogin={u=>setUser(u)} onBack={()=>setActiveView('landing')}/>
            </motion.div>
          )}
          {activeView==='analyzing' && (
            <motion.div key="analyzing" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}}
              className="pt-24">
              <AnalyzingView url={url}/>
            </motion.div>
          )}
          {activeView==='dashboard' && (
            <motion.div key="dashboard" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.4,ease:[0.22,1,0.36,1]}}
              className="pt-24">
              <DashboardView data={analysisData!} history={history} onNewScan={()=>setActiveView('landing')}/>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}