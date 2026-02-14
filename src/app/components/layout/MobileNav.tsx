/**
 * PharmaVerif - Mobile Navigation Drawer
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Drawer overlay pour la navigation mobile.
 * S'affiche uniquement en dessous de md (768px).
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck,
  Upload,
  FileText,
  FlaskConical,
  ClipboardList,
  TrendingUp,
  FileBarChart,
  Building2,
  Store,
  X,
  LogIn,
  LogOut,
  Handshake,
} from 'lucide-react';
import { Logo } from '../Logo';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
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
// NAVIGATION (meme structure que Sidebar)
// ========================================

const navGroups: NavGroup[] = [
  {
    title: '',
    items: [
      { label: 'Tableau de bord', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
      { label: 'Verification', path: '/verification', icon: <FileCheck className="h-5 w-5" /> },
      { label: 'Importer', path: '/upload', icon: <Upload className="h-5 w-5" /> },
      { label: 'Factures', path: '/factures', icon: <FileText className="h-5 w-5" /> },
    ],
  },
  {
    title: 'FACTURES',
    items: [
      { label: 'Factures Labo', path: '/factures-labo', icon: <FlaskConical className="h-5 w-5" />, apiOnly: true },
      { label: 'EMAC', path: '/emac', icon: <ClipboardList className="h-5 w-5" />, apiOnly: true },
      { label: 'Accords Remises', path: '/agreements', icon: <Handshake className="h-5 w-5" />, apiOnly: true },
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

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const apiMode = isApiMode();

  // Fermer le drawer lors d'un changement de route
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bloquer le scroll du body quand le drawer est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.apiOnly || apiMode),
    }))
    .filter((group) => group.items.length > 0);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'absolute top-0 left-0 h-full w-[280px] max-w-[85vw]',
          'bg-sidebar text-sidebar-foreground',
          'shadow-2xl',
          'flex flex-col',
          'animate-in slide-in-from-left duration-300'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0">
          <button
            onClick={() => handleNavigate('/')}
            className="flex items-center focus:outline-none"
          >
            <Logo variant="horizontal" theme={resolvedTheme} size="sm" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.title && (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
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
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: Auth */}
        <div className="border-t border-sidebar-border p-3 shrink-0">
          {isAuthenticated ? (
            <button
              onClick={() => {
                logout();
                handleNavigate('/');
              }}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors min-h-[44px]"
            >
              <LogOut className="h-5 w-5" />
              <span>Deconnexion ({user?.name})</span>
            </button>
          ) : (
            <button
              onClick={() => handleNavigate('/login')}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-sidebar-primary hover:bg-sidebar-accent/50 transition-colors min-h-[44px]"
            >
              <LogIn className="h-5 w-5" />
              <span>Connexion</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
