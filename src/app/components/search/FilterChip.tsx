/**
 * PharmaVerif - FilterChip Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Chip de filtre actif avec bouton de suppression :
 *  - Label texte avec icone X
 *  - Animation hover
 *  - Accessibilite (aria-label)
 *  - Touch-friendly (min 36px)
 */

import { X } from 'lucide-react';
import type { FilterChipData } from '../../types/filters';
import { cn } from '../ui/utils';

interface FilterChipProps {
  chip: FilterChipData;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ chip, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-3 py-1.5 rounded-full',
        'bg-primary/10 text-primary',
        'text-xs font-medium',
        'transition-colors hover:bg-primary/15',
        'group',
        className
      )}
    >
      {chip.label}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          'inline-flex items-center justify-center',
          'rounded-full p-0.5',
          'hover:bg-primary/20 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/30'
        )}
        aria-label={`Retirer le filtre ${chip.label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
