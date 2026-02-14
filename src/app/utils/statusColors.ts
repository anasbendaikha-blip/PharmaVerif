/**
 * PharmaVerif - Utilitaire couleurs sémantiques
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Centralise les classes Tailwind pour les badges, pills et banners
 * selon leur signification sémantique. Évite les 400+ instances
 * de couleurs hardcodées à travers le codebase.
 *
 * Usage :
 *   import { PILL_STYLES, getFactureLaboSeverity } from '../utils/statusColors';
 *   <span className={PILL_STYLES[getFactureLaboSeverity('critical')]}>...</span>
 */

// ========================================
// TYPES
// ========================================

export type SemanticColor = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';

// ========================================
// STYLE MAPS
// ========================================

/**
 * Badges pills (statuts, tags) — rounded-full avec bg léger.
 * Ex: statut facture, tranche, badge anomalie.
 */
export const PILL_STYLES: Record<SemanticColor, string> = {
  success:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  error:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  info:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  neutral:
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  purple:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

/**
 * Banners / cards avec bordure — pour anomalies, alertes.
 */
export const BANNER_STYLES: Record<SemanticColor, string> = {
  success:
    'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  error:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  info:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  neutral:
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  purple:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

/**
 * Texte d'accent seul (pas de background).
 */
export const TEXT_COLORS: Record<SemanticColor, string> = {
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
  neutral: 'text-gray-600 dark:text-gray-400',
  purple: 'text-purple-600 dark:text-purple-400',
};

/**
 * Couleurs pour les headers de section d'anomalies (texte + icône).
 */
export const SECTION_HEADER_COLORS: Record<SemanticColor, string> = {
  success: 'text-green-700 dark:text-green-400',
  warning: 'text-amber-700 dark:text-amber-400',
  error: 'text-red-700 dark:text-red-400',
  info: 'text-blue-700 dark:text-blue-400',
  neutral: 'text-gray-700 dark:text-gray-400',
  purple: 'text-purple-700 dark:text-purple-400',
};

// ========================================
// BUSINESS → SEMANTIC MAPPINGS
// ========================================

/**
 * Sévérité anomalie facture labo → couleur sémantique.
 */
export function getFactureLaboSeverity(severite: string): SemanticColor {
  switch (severite) {
    case 'critical':
      return 'error';
    case 'opportunity':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'neutral';
  }
}

/**
 * Statut facture labo → couleur sémantique.
 */
export function getFactureLaboStatut(statut: string): SemanticColor {
  switch (statut) {
    case 'conforme':
      return 'success';
    case 'analysee':
      return 'info';
    case 'ecart_rfa':
      return 'error';
    case 'verifiee':
      return 'purple';
    default:
      return 'neutral';
  }
}

/**
 * Statut EMAC → couleur sémantique.
 */
export function getEmacStatut(statut: string): SemanticColor {
  switch (statut) {
    case 'conforme':
      return 'success';
    case 'en_cours':
      return 'info';
    case 'ecart_detecte':
      return 'warning';
    case 'anomalie':
      return 'error';
    default:
      return 'neutral';
  }
}

/**
 * Tranche produit (A/B/OTC) → couleur sémantique.
 */
export function getTrancheSemantic(tranche: string): SemanticColor {
  switch (tranche) {
    case 'A':
      return 'success';
    case 'B':
      return 'warning';
    case 'OTC':
      return 'purple';
    default:
      return 'neutral';
  }
}

/**
 * Nombre d'anomalies non résolues → couleur badge compteur.
 */
export function getAnomalyCountSeverity(
  anomalies: Array<{ severite: string; resolu: boolean }>
): SemanticColor {
  if (!anomalies || anomalies.length === 0) return 'success';
  const unresolved = anomalies.filter((a) => !a.resolu);
  if (unresolved.length === 0) return 'success';
  if (unresolved.some((a) => a.severite === 'critical')) return 'error';
  if (unresolved.some((a) => a.severite === 'opportunity')) return 'warning';
  return 'success';
}
