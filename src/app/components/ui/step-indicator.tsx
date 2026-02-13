/**
 * PharmaVerif - StepIndicator Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Indicateur de progression reutilisable :
 *  - Cercles numerotes relies par des lignes
 *  - Etape completee : cercle bleu + checkmark
 *  - Etape courante : anneau bleu pulsant
 *  - Etape future : cercle gris
 *  - Labels masques sur mobile
 */

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from './utils';

// ========================================
// TYPES
// ========================================

interface Step {
  /** Label de l'etape */
  label: string;
  /** Description courte */
  description?: string;
}

interface StepIndicatorProps {
  /** Definition des etapes */
  steps: Step[];
  /** Etape courante (1-indexed) */
  currentStep: number;
  /** Classe CSS additionnelle */
  className?: string;
}

// ========================================
// COMPONENT
// ========================================

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isFuture = stepNumber > currentStep;

          return (
            <React.Fragment key={index}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                {/* Circle */}
                <div
                  className={cn(
                    'flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-sm font-semibold transition-all duration-300',
                    isCompleted && 'bg-blue-600 text-white',
                    isCurrent && 'ring-2 ring-blue-600 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse',
                    isFuture && 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Label (hidden on mobile) */}
                <div className="hidden sm:flex flex-col items-center text-center">
                  <span
                    className={cn(
                      'text-xs font-medium transition-colors',
                      isCompleted && 'text-blue-600 dark:text-blue-400',
                      isCurrent && 'text-blue-600 dark:text-blue-400',
                      isFuture && 'text-gray-400 dark:text-gray-500'
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Connector line (between steps) */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-3">
                  <div
                    className={cn(
                      'h-0.5 rounded-full transition-all duration-500',
                      stepNumber < currentStep
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
