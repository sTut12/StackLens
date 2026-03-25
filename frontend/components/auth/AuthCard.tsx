'use client'
import Link from 'next/link'
import { Layers } from 'lucide-react'

interface AuthCardProps { title: string; subtitle: string; children: React.ReactNode }

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F5F5F0]">
      {/* Subtle grid */}
      <div className="fixed inset-0 pointer-events-none bg-grid opacity-50" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-white border-2 border-[#111111] rounded-[2rem] p-8 shadow-[12px_12px_0_0_#111111]">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-8 w-fit group">
          <div className="w-10 h-10 rounded-full border-2 border-[#111111] bg-white flex items-center justify-center group-hover:bg-[#FF5500] group-hover:border-[#FF5500] transition-all duration-200">
            <Layers className="w-5 h-5 text-[#111111] group-hover:text-white transition-colors" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase font-display text-[#111111]">StackLens</span>
        </Link>

        {/* Live indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111111] text-white text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
          Auth System Active
        </div>

        <h1 className="text-3xl font-black font-display uppercase tracking-tight text-[#111111] mb-2">{title}</h1>
        <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">{subtitle}</p>

        {children}
      </div>
    </div>
  )
}
