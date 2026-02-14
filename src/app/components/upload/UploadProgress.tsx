/**
 * PharmaVerif - UploadProgress Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Barre de progression multi-etapes pour upload de factures :
 *  - 4 etapes visuelles avec icones et labels
 *  - Sous-etapes avec checklist progressive
 *  - Barre de progression animee
 *  - Nom fichier + taille affiches
 *  - Bouton annuler disponible
 */

import { CheckCircle2, Upload, FileSearch, ShieldCheck, FileCheck2, Loader2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import type { UploadStep, SubStep } from '../../hooks/useFileUpload';

// ========================================
// TYPES
// ========================================

interface UploadProgressProps {
  /** Etape courante */
  step: UploadStep;
  /** Progression 0-100 */
  progress: number;
  /** Sous-etapes */
  subSteps: SubStep[];
  /** Fichier en cours */
  file: File | null;
  /** Peut annuler */
  canCancel: boolean;
  /** Callback annulation */
  onCancel: () => void;
  /** Classe CSS */
  className?: string;
}

// ========================================
// STEP DEFINITIONS
// ========================================

interface StepDef {
  key: UploadStep;
  label: string;
  icon: React.ReactNode;
  range: [number, number]; // [min, max] de la barre
}

const STEPS: StepDef[] = [
  { key: 'upload', label: 'Envoi', icon: <Upload className="h-4 w-4" />, range: [0, 25] },
  { key: 'parsing', label: 'Lecture', icon: <FileSearch className="h-4 w-4" />, range: [25, 50] },
  { key: 'verification', label: 'Verification', icon: <ShieldCheck className="h-4 w-4" />, range: [50, 75] },
  { key: 'complete', label: 'Rapport', icon: <FileCheck2 className="h-4 w-4" />, range: [75, 100] },
];

function getStepIndex(step: UploadStep): number {
  const idx = STEPS.findIndex((s) => s.key === step);
  return idx >= 0 ? idx : 0;
}

// ========================================
// COMPONENT
// ========================================

export function UploadProgress({
  step,
  progress,
  subSteps,
  file,
  canCancel,
  onCancel,
  className,
}: UploadProgressProps) {
  const currentStepIndex = getStepIndex(step);
  const isComplete = step === 'complete' && progress >= 100;

  return (
    <div className={cn('bg-card border rounded-xl p-6 space-y-5', className)}>
      {/* Header : fichier + annuler */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {isComplete ? (
            <div className="shrink-0 p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          ) : (
            <div className="shrink-0 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {isComplete ? 'Verification terminee' : getStepLabel(step)}
            </p>
            {file && (
              <p className="text-xs text-muted-foreground truncate">
                {file.name} ({formatFileSize(file.size)})
              </p>
            )}
          </div>
        </div>

        {canCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="shrink-0">
            <X className="h-4 w-4" />
            Annuler
          </Button>
        )}
      </div>

      {/* Barre de progression globale */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progression</span>
          <span className="font-mono font-medium text-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="relative w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out',
              isComplete ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${progress}%` }}
          />
          {/* Shimmer animation quand en cours */}
          {!isComplete && progress > 0 && (
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((s, index) => {
          const isStepComplete = index < currentStepIndex || (index === currentStepIndex && isComplete);
          const isStepCurrent = index === currentStepIndex && !isComplete;
          const isStepFuture = index > currentStepIndex;

          return (
            <div key={s.key} className="flex items-center gap-1 flex-1">
              {/* Step indicator */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300',
                    isStepComplete && 'bg-green-100 dark:bg-green-900/30 text-green-600',
                    isStepCurrent && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
                    isStepFuture && 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  )}
                >
                  {isStepComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    s.icon
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium whitespace-nowrap hidden sm:block',
                    isStepComplete && 'text-green-600 dark:text-green-400',
                    isStepCurrent && 'text-blue-600 dark:text-blue-400',
                    isStepFuture && 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>

              {/* Connector */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-1">
                  <div
                    className={cn(
                      'h-0.5 rounded-full transition-all duration-500',
                      index < currentStepIndex
                        ? 'bg-green-400'
                        : index === currentStepIndex
                          ? 'bg-blue-300'
                          : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sub-steps checklist */}
      {subSteps.length > 0 && !isComplete && (
        <div className="pl-2 space-y-1.5 border-l-2 border-blue-200 dark:border-blue-800 ml-1">
          {subSteps.map((sub, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {sub.status === 'done' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : sub.status === 'active' ? (
                <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-gray-300 dark:border-gray-600 shrink-0" />
              )}
              <span
                className={cn(
                  'text-xs',
                  sub.status === 'done' && 'text-green-600 dark:text-green-400',
                  sub.status === 'active' && 'text-blue-600 dark:text-blue-400 font-medium',
                  sub.status === 'pending' && 'text-muted-foreground'
                )}
              >
                {sub.status === 'done' ? '\u2713 ' : sub.status === 'active' ? '\u23F3 ' : ''}
                {sub.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========================================
// HELPERS
// ========================================

function getStepLabel(step: UploadStep): string {
  switch (step) {
    case 'upload': return 'Envoi du fichier...';
    case 'parsing': return 'Lecture de la facture...';
    case 'verification': return 'Verification en cours...';
    case 'complete': return 'Generation du rapport...';
    default: return '';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
