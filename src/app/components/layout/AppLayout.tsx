/**
 * PharmaVerif - Application Layout
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Layout principal :
 *  - Sidebar fixe a gauche (desktop/tablet)
 *  - Header sticky en haut
 *  - Zone de contenu principale avec scroll
 *  - MobileNav en drawer (mobile)
 */

import { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

// ========================================
// CONSTANTS
// ========================================

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const SIDEBAR_STORAGE_KEY = 'pharmaverif_sidebar_collapsed';

// ========================================
// COMPONENT
// ========================================

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const handleMobileMenuToggle = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const handleMobileNavClose = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  const marginLeft = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Sidebar (desktop/tablet — hidden below md via Sidebar component) */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

      {/* Mobile Nav drawer */}
      <MobileNav isOpen={mobileNavOpen} onClose={handleMobileNavClose} />

      {/* Inject responsive margin via CSS custom property */}
      <style>{`
        .pv-main-area {
          margin-left: 0;
          transition: margin-left 300ms ease-in-out;
        }
        @media (min-width: 768px) {
          .pv-main-area {
            margin-left: ${marginLeft}px;
          }
        }
      `}</style>

      {/* Main content area */}
      <div className="pv-main-area flex flex-col min-h-screen">
        {/* Header */}
        <Header onMobileMenuToggle={handleMobileMenuToggle} />

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Footer compact */}
        <footer className="shrink-0 border-t border-gray-200 dark:border-gray-700/50 px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} PharmaVerif &mdash;{' '}
              <span className="font-medium text-foreground/70">Anas BENDAIKHA</span>
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Prototype
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
