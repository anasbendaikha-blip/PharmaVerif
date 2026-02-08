/**
 * PharmaVerif - Navbar Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  FileCheck,
  LayoutDashboard,
  Home,
  FileBarChart,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

interface NavLink {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navLinks: NavLink[] = [
  { label: 'Accueil', path: '/', icon: <Home className="h-4 w-4" /> },
  { label: 'Vérification', path: '/verification', icon: <FileCheck className="h-4 w-4" /> },
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Rapports', path: '/reports', icon: <FileBarChart className="h-4 w-4" /> },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => handleNavigate('/')} className="flex items-center gap-2">
            <Logo variant="horizontal" theme={resolvedTheme} size="sm" />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavigate(link.path)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]
                    ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                    }`}
                >
                  {link.icon}
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Auth + Theme Toggle + Mobile Menu Button */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{user?.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout();
                    handleNavigate('/');
                  }}
                  className="gap-1 text-gray-600 dark:text-gray-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">Déconnexion</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate('/login')}
                className="hidden sm:flex gap-1 text-gray-600 dark:text-gray-400"
              >
                <LogIn className="h-4 w-4" />
                <span>Connexion</span>
              </Button>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden min-h-[44px] min-w-[44px]"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavigate(link.path)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]
                    ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                    }`}
                >
                  {link.icon}
                  {link.label}
                </button>
              );
            })}
            {/* Mobile auth buttons */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    logout();
                    handleNavigate('/');
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px]"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion ({user?.name})
                </button>
              ) : (
                <button
                  onClick={() => handleNavigate('/login')}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 min-h-[44px]"
                >
                  <LogIn className="h-4 w-4" />
                  Connexion
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
