/**
 * PharmaVerif - Header Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Header sticky :
 *  - Breadcrumb dynamique
 *  - Nom de la pharmacie
 *  - Menu utilisateur + theme toggle
 */

import { useLocation, useNavigate } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  User,
  ChevronRight,
  Home,
  Menu,
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

// ========================================
// BREADCRUMB MAP
// ========================================

const breadcrumbLabels: Record<string, string> = {
  '/': 'Accueil',
  '/dashboard': 'Tableau de bord',
  '/verification': 'Verification',
  '/factures-labo': 'Factures Labo',
  '/emac': 'EMAC',
  '/analyse-prix': 'Historique Prix',
  '/reports': 'Rapports',
  '/fournisseurs': 'Fournisseurs',
  '/pharmacie': 'Ma Pharmacie',
  '/login': 'Connexion',
  '/mentions-legales': 'Mentions legales',
  '/contact': 'Contact',
};

// ========================================
// COMPONENT
// ========================================

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  // Build breadcrumb
  const currentLabel = breadcrumbLabels[location.pathname] || 'Page';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 shrink-0',
        'flex items-center justify-between px-4 sm:px-6',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md',
        'border-b border-gray-200 dark:border-gray-700/50'
      )}
    >
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden min-h-[44px] min-w-[44px]"
          onClick={onMobileMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Accueil"
          >
            <Home className="h-4 w-4" />
          </button>
          {location.pathname !== '/' && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="font-medium text-foreground">{currentLabel}</span>
            </>
          )}
        </nav>
      </div>

      {/* Right: User + Theme */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            {/* User info */}
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50">
              <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                {user?.name}
              </span>
            </div>
            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="gap-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
              title="Deconnexion"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline text-sm">Deconnexion</span>
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login')}
            className="gap-1.5 text-muted-foreground"
          >
            <LogIn className="h-4 w-4" />
            <span className="text-sm">Connexion</span>
          </Button>
        )}
      </div>
    </header>
  );
}
