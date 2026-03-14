'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

type LenisProviderProps = {
  children: ReactNode;
  enabled?: boolean;
};

export function LenisProvider({ children, enabled = true }: LenisProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const a11yReducedMotion = document.documentElement.classList.contains('a11y-reduced-motion');

    if (prefersReducedMotion || a11yReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  // scroll to top on route change (Next.js App Router)
  useEffect(() => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true, force: true });
    }
  }, [pathname]);

  return <>{children}</>;
}
