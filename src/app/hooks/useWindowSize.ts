/**
 * PharmaVerif - Hook useWindowSize
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Retourne les dimensions du viewport en temps reel.
 * Optimise avec debounce interne pour eviter les re-renders excessifs.
 *
 * Usage :
 *   const { width, height } = useWindowSize();
 *   const chartHeight = width < 640 ? 200 : width < 1024 ? 280 : 350;
 */

import { useState, useEffect, useRef } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(debounceMs: number = 100): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => {
    if (typeof window === 'undefined') return { width: 1024, height: 768 };
    return { width: window.innerWidth, height: window.innerHeight };
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleResize() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      }, debounceMs);
    }

    window.addEventListener('resize', handleResize, { passive: true });
    // Aussi ecouter les changements d'orientation mobile
    window.addEventListener('orientationchange', handleResize);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [debounceMs]);

  return size;
}
