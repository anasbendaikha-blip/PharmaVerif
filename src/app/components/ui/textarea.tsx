/**
 * PharmaVerif - Textarea Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Zone de texte multiligne reutilisable :
 *  - Style uniforme (tokens design system)
 *  - Variante erreur
 *  - Forward ref pour formulaires
 */

import * as React from 'react';

import { cn } from './utils';

// ========================================
// COMPONENT
// ========================================

function Textarea({
  className,
  error = false,
  ...props
}: React.ComponentProps<'textarea'> & {
  /** Afficher le style erreur */
  error?: boolean;
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm text-foreground',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'resize-y transition-colors',
        error && 'border-destructive focus:ring-destructive/40',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
