/**
 * PharmaVerif - SortDropdown Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Dropdown de tri avec :
 *  - 3 criteres (date, montant, fournisseur)
 *  - Toggle asc/desc
 *  - Pas de dependance @headlessui — utilise un <details> natif
 *  - Dark mode + responsive
 */

import { useState, useRef, useEffect } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  DollarSign,
  Building2,
  Check,
} from 'lucide-react';
import type { SortField, SortOrder } from '../../types/filters';
import { SORT_OPTIONS } from '../../types/filters';
import { cn } from '../ui/utils';

// ========================================
// TYPES
// ========================================

interface SortDropdownProps {
  sortBy: SortField;
  sortOrder: SortOrder;
  onChange: (sortBy: SortField, sortOrder: SortOrder) => void;
  className?: string;
}

// ========================================
// ICON MAP
// ========================================

const SORT_ICONS: Record<SortField, typeof Calendar> = {
  date: Calendar,
  montant: DollarSign,
  fournisseur: Building2,
};

// ========================================
// COMPONENT
// ========================================

export function SortDropdown({
  sortBy,
  sortOrder,
  onChange,
  className,
}: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const currentOption = SORT_OPTIONS.find((o) => o.value === sortBy);
  const CurrentIcon = SORT_ICONS[sortBy];

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2',
          'px-3 py-2 rounded-lg',
          'border border-border',
          'text-sm font-medium text-muted-foreground',
          'hover:bg-muted hover:text-foreground',
          'transition-colors'
        )}
      >
        <ArrowUpDown className="h-4 w-4" />
        <span className="hidden sm:inline">
          {currentOption?.label || 'Trier'}
        </span>
        {sortOrder === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute right-0 mt-1.5 w-56 z-20',
            'bg-card border border-border rounded-lg shadow-lg',
            'py-1',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
        >
          {SORT_OPTIONS.map((option) => {
            const Icon = SORT_ICONS[option.value];

            return (
              <div key={option.value}>
                {/* Descending */}
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value, 'desc');
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm',
                    'flex items-center gap-2',
                    'hover:bg-muted transition-colors',
                    sortBy === option.value && sortOrder === 'desc'
                      ? 'text-primary font-medium'
                      : 'text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {option.label}
                  <ArrowDown className="h-3 w-3 ml-auto text-muted-foreground" />
                  {sortBy === option.value && sortOrder === 'desc' && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </button>

                {/* Ascending */}
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value, 'asc');
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm',
                    'flex items-center gap-2',
                    'hover:bg-muted transition-colors',
                    sortBy === option.value && sortOrder === 'asc'
                      ? 'text-primary font-medium'
                      : 'text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {option.label}
                  <ArrowUp className="h-3 w-3 ml-auto text-muted-foreground" />
                  {sortBy === option.value && sortOrder === 'asc' && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
