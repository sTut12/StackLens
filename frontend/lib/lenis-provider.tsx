'use client'
import { createContext, useContext, useEffect, useRef, ReactNode } from 'react'

// We dynamically import lenis to avoid SSR issues
const LenisContext = createContext<any>(null)

export function LenisProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<any>(null)

  useEffect(() => {
    let lenis: any = null
    let raf: number

    async function init() {
      const { default: Lenis } = await import('lenis')
      lenis = new Lenis({
        duration: 1.4,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.5,
        infinite: false,
      })
      lenisRef.current = lenis
      // Expose globally so navbar can call scrollTo without prop drilling
      ;(window as any).__lenis = lenis

      function animate(time: number) {
        lenis.raf(time)
        raf = requestAnimationFrame(animate)
      }
      raf = requestAnimationFrame(animate)
    }

    init()

    return () => {
      cancelAnimationFrame(raf)
      lenis?.destroy()
      delete (window as any).__lenis
    }
  }, [])

  return (
    <LenisContext.Provider value={lenisRef}>
      {children}
    </LenisContext.Provider>
  )
}

export const useLenis = () => useContext(LenisContext)