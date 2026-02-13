/**
 * PharmaVerif - Sidebar Navigation Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Sidebar fixe :
 *  - Desktop : 260px ouvert, 64px collapsed
 *  - Tablet : collapsed (64px) par defaut
 *  - Mobile : masque (drawer via MobileNav)
 */

import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck,
  FlaskConical,
  ClipboardList,
  TrendingUp,
  FileBarChart,
  Building2,
  Store,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Logo } from '../Logo';
import { useTheme } from '../../contexts/ThemeContext';
import { isApiMode } from '../../api/config';
import { cn } from '../ui/utils';

// ========================================
// TYPES
// ========================================

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  apiOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// ========================================
// NAVIGATION STRUCTURE
// ========================================

const navGroups: NavGroup[] = [
  {
    title: '',
    items: [
      { label: 'Tableau de bord', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
      { label: 'Verification', path: '/verification', icon: <FileCheck className="h-5 w-5" /> },
    ],
  },
  {
    title: 'FACTURES',
    items: [
      { label: 'Factures Labo', path: '/factures-labo', icon: <FlaskConical className="h-5 w-5" />, apiOnly: true },
      { label: 'EMAC', path: '/emac', icon: <ClipboardList className="h-5 w-5" />, apiOnly: true },
    ],
  },
  {
    title: 'ANALYSE',
    items: [
      { label: 'Historique Prix', path: '/analyse-prix', icon: <TrendingUp className="h-5 w-5" />, apiOnly: true },
      { label: 'Rapports', path: '/reports', icon: <FileBarChart className="h-5 w-5" /> },
    ],
  },
  {
    title: 'CONFIGURATION',
    items: [
      { label: 'Fournisseurs', path: '/fournisseurs', icon: <Building2 className="h-5 w-5" /> },
      { label: 'Ma Pharmacie', path: '/pharmacie', icon: <Store className="h-5 w-5" /> },
    ],
  },
];

// ========================================
// COMPONENT
// ========================================

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const apiMode = isApiMode();

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.apiOnly || apiMode),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen flex flex-col',
        'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
        'transition-all duration-300 ease-in-out',
        'hidden md:flex',
        collapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-sidebar-border shrink-0',
          collapsed ? 'justify-center px-2' : 'px-4'
        )}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 focus:outline-none"
          title="Accueil"
        >
          {collapsed ? (
            <Logo variant="icon" theme={resolvedTheme} size="sm" />
          ) : (
            <Logo variant="horizontal" theme={resolvedTheme} size="sm" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-6' : ''}>
            {/* Group title */}
            {group.title && !collapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.title}
              </p>
            )}
            {group.title && collapsed && (
              <div className="mx-auto my-2 w-6 border-t border-sidebar-border" />
            )}

            {/* Items */}
            {group.items.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center w-full rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                    collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <span className={cn(
                    'shrink-0',
                    isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'
                  )}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {isActive && !collapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle button */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center w-full rounded-lg text-sm font-medium transition-colors min-h-[40px]',
            'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            collapsed ? 'justify-center px-2' : 'gap-3 px-3'
          )}
          title={collapsed ? 'Ouvrir le menu' : 'Reduire le menu'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Reduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
