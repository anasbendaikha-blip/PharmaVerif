/**
 * PharmaVerif - Hook useMediaQuery
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Detecte si une media query CSS correspond au viewport actuel.
 * Ecoute les changements en temps reel (resize, rotation).
 *
 * Usage :
 *   const isMobile = useMediaQuery('(max-width: 767px)');
 *   const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
 *   const isDesktop = useMediaQuery('(min-width: 1024px)');
 *   const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 */

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// ========================================
// PRESETS BREAKPOINTS (alignes Tailwind v4)
// ========================================

/** Vrai si viewport < 640px (mobile phone) */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)');
}

/** Vrai si viewport >= 640px et < 768px (grand mobile / petite tablette) */
export function useIsSmall(): boolean {
  return useMediaQuery('(min-width: 640px) and (max-width: 767px)');
}

/** Vrai si viewport >= 768px et < 1024px (tablette portrait) */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/** Vrai si viewport >= 1024px (desktop) */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/** Vrai si viewport < 768px (mobile ou petit ecran) */
export function useIsMobileOrSmall(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
