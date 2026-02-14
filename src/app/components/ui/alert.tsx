/**
 * PharmaVerif - Alert Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Composant d'alerte reutilisable :
 *  - 5 variantes semantiques (default, info, success, warning, destructive)
 *  - Sub-composants : Alert, AlertTitle, AlertDescription
 *  - Slot icone optionnel
 *  - Utilise les tokens semantiques du design system
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './utils';

// ========================================
// VARIANTS
// ========================================

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11 [&>svg]:size-4',
  {
    variants: {
      variant: {
        default:
          'bg-card text-card-foreground border-border',
        info:
          'bg-info-light border-info/20 text-info [&>svg]:text-info',
        success:
          'bg-success-light border-success/20 text-success [&>svg]:text-success',
        warning:
          'bg-warning-light border-warning/20 text-warning [&>svg]:text-warning',
        destructive:
          'bg-destructive/10 border-destructive/20 text-destructive [&>svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// ========================================
// COMPONENTS
// ========================================

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'h5'>) {
  return (
    <h5
      data-slot="alert-title"
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
