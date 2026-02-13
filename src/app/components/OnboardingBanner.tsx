/**
 * PharmaVerif - OnboardingBanner Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Banniere persistante affichee en haut du dashboard quand
 * l'onboarding n'est pas complete. Peut etre fermee pour la
 * session (stocke dans sessionStorage).
 */

import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

// ========================================
// TYPES
// ========================================

interface OnboardingBannerProps {
  /** Callback pour naviguer vers /onboarding */
  onConfigure: () => void;
  /** Callback pour fermer la banniere (session only) */
  onDismiss?: () => void;
}

// ========================================
// COMPONENT
// ========================================

export function OnboardingBanner({ onConfigure, onDismiss }: OnboardingBannerProps) {
  return (
    <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Configuration incomplete
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
            Completez la configuration de votre pharmacie pour profiter de toutes les fonctionnalites de PharmaVerif.
          </p>

          {/* CTA */}
          <Button
            type="button"
            onClick={onConfigure}
            size="sm"
            className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
          >
            Configurer maintenant
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 p-1 rounded-md text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
