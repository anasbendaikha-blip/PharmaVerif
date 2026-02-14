/**
 * PharmaVerif - Error Boundary
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Composant Error Boundary React pour capturer les erreurs runtime.
 * 3 niveaux de fallback :
 *   - 'app'     : plein ecran avec bouton "Recharger l'application"
 *   - 'route'   : dans le layout avec lien "Revenir au tableau de bord"
 *   - 'section' : compact inline avec bouton "Reessayer"
 *
 * Usage :
 *   <ErrorBoundary level="app">
 *     <App />
 *   </ErrorBoundary>
 */

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, RotateCcw } from 'lucide-react';

// ========================================
// TYPES
// ========================================

type ErrorLevel = 'app' | 'route' | 'section';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Niveau du fallback (defaut: 'section') */
  level?: ErrorLevel;
  /** Fallback personnalise (remplace le fallback par defaut) */
  fallback?: ReactNode;
  /** Callback appele quand une erreur est capturee */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ========================================
// COMPONENT
// ========================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Erreur capturee:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/dashboard';
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Fallback personnalise
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const level = this.props.level || 'section';
    const errorMessage = this.state.error?.message || 'Une erreur inattendue est survenue';

    switch (level) {
      case 'app':
        return <AppLevelFallback error={errorMessage} onReload={this.handleReload} />;
      case 'route':
        return (
          <RouteLevelFallback
            error={errorMessage}
            onRetry={this.handleRetry}
            onGoHome={this.handleGoHome}
          />
        );
      case 'section':
      default:
        return <SectionLevelFallback error={errorMessage} onRetry={this.handleRetry} />;
    }
  }
}

// ========================================
// FALLBACK COMPONENTS
// ========================================

/**
 * Fallback plein ecran pour erreurs catastrophiques (niveau app).
 */
function AppLevelFallback({
  error,
  onReload,
}: {
  error: string;
  onReload: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>

        {/* Titre */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            PharmaVerif a rencontre un probleme
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            L'application a rencontre une erreur inattendue. Vos donnees sont en securite.
          </p>
        </div>

        {/* Detail erreur */}
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs font-mono text-red-700 dark:text-red-400 break-all">
            {error}
          </p>
        </div>

        {/* Action */}
        <button
          onClick={onReload}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" />
          Recharger l'application
        </button>
      </div>
    </div>
  );
}

/**
 * Fallback dans le layout pour erreurs de page (niveau route).
 */
function RouteLevelFallback({
  error,
  onRetry,
  onGoHome,
}: {
  error: string;
  onRetry: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-lg w-full text-center space-y-5">
        {/* Icone */}
        <div className="mx-auto w-14 h-14 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
        </div>

        {/* Titre */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Erreur sur cette page
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cette page a rencontre un probleme. Vous pouvez reessayer ou revenir au tableau de bord.
          </p>
        </div>

        {/* Detail erreur */}
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-left">
          <p className="text-xs font-mono text-red-700 dark:text-red-400 break-all">
            {error}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reessayer
          </button>
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" />
            Tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Fallback compact inline pour erreurs de section (niveau section).
 */
function SectionLevelFallback({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            Une erreur est survenue
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono break-all">
            {error}
          </p>
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 text-red-700 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reessayer
          </button>
        </div>
      </div>
    </div>
  );
}
