/**
 * PharmaVerif - ErrorDisplay Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Affichage d'erreurs contextualise pour le workflow upload :
 *  - 4 types d'erreur : fichier trop lourd, format invalide, parsing echoue, erreur serveur
 *  - Messages clairs sans jargon technique
 *  - Causes possibles listees
 *  - Suggestion actionnable
 *  - Bouton retry / aide
 */

import { XCircle, AlertTriangle, FileWarning, WifiOff, HelpCircle, RotateCcw, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import type { UploadError } from '../../hooks/useFileUpload';

// ========================================
// TYPES
// ========================================

interface ErrorDisplayProps {
  /** Erreur a afficher */
  error: UploadError;
  /** Callback reessayer */
  onRetry?: () => void;
  /** Callback choisir un autre fichier */
  onChooseFile?: () => void;
  /** Callback contacter support */
  onContactSupport?: () => void;
  /** Classe CSS */
  className?: string;
}

// ========================================
// ICON MAP
// ========================================

function getErrorIcon(type: UploadError['type']) {
  switch (type) {
    case 'file_too_large':
      return <FileWarning className="h-8 w-8 text-orange-500" />;
    case 'format_invalid':
      return <AlertTriangle className="h-8 w-8 text-orange-500" />;
    case 'parsing_failed':
      return <XCircle className="h-8 w-8 text-red-500" />;
    case 'server_error':
      return <WifiOff className="h-8 w-8 text-red-500" />;
    default:
      return <XCircle className="h-8 w-8 text-red-500" />;
  }
}

function getErrorColor(type: UploadError['type']) {
  switch (type) {
    case 'file_too_large':
    case 'format_invalid':
      return {
        border: 'border-orange-200 dark:border-orange-800',
        bg: 'bg-orange-50/50 dark:bg-orange-900/10',
        iconBg: 'bg-orange-100 dark:bg-orange-900/30',
        title: 'text-orange-800 dark:text-orange-300',
      };
    default:
      return {
        border: 'border-red-200 dark:border-red-800',
        bg: 'bg-red-50/50 dark:bg-red-900/10',
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        title: 'text-red-800 dark:text-red-300',
      };
  }
}

// ========================================
// COMPONENT
// ========================================

export function ErrorDisplay({
  error,
  onRetry,
  onChooseFile,
  onContactSupport,
  className,
}: ErrorDisplayProps) {
  const colors = getErrorColor(error.type);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'border rounded-xl overflow-hidden transition-all',
        colors.border,
        colors.bg,
        className
      )}
    >
      {/* Bande couleur en haut */}
      <div
        className={cn(
          'h-1',
          error.type === 'file_too_large' || error.type === 'format_invalid'
            ? 'bg-orange-400'
            : 'bg-red-400'
        )}
      />

      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={cn('shrink-0 p-2.5 rounded-lg', colors.iconBg)}>
            {getErrorIcon(error.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn('font-semibold text-base', colors.title)}>
              {error.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          </div>
        </div>

        {/* Details (causes possibles) */}
        {error.details && error.details.length > 0 && (
          <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-1">
            {error.type === 'parsing_failed' && (
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Causes possibles :
              </p>
            )}
            {error.details.map((detail, i) => (
              <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-px shrink-0">{'\u2022'}</span>
                <span>{detail}</span>
              </p>
            ))}
          </div>
        )}

        {/* Suggestion */}
        {error.suggestion && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50">
            <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">{error.suggestion}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {error.type === 'server_error' && onRetry && (
            <Button size="sm" onClick={onRetry}>
              <RotateCcw className="h-4 w-4" />
              Reessayer
            </Button>
          )}
          {error.type === 'parsing_failed' && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RotateCcw className="h-4 w-4" />
              Reessayer
            </Button>
          )}
          {(error.type === 'file_too_large' || error.type === 'format_invalid') && onChooseFile && (
            <Button size="sm" onClick={onChooseFile}>
              <Upload className="h-4 w-4" />
              Choisir un autre fichier
            </Button>
          )}
          {onContactSupport && (
            <Button size="sm" variant="ghost" onClick={onContactSupport}>
              <HelpCircle className="h-4 w-4" />
              Contacter le support
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
