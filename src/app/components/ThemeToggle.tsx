/**
 * PharmaVerif - Bouton toggle dark/light mode
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const icon =
    theme === 'dark' ? (
      <Moon className="h-4 w-4" />
    ) : theme === 'system' ? (
      <Monitor className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  const label = theme === 'dark' ? 'Sombre' : theme === 'system' ? 'Système' : 'Clair';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      className="gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
      title={`Thème : ${label}`}
    >
      {icon}
      <span className="hidden sm:inline text-xs">{label}</span>
    </Button>
  );
}
