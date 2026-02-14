/**
 * PharmaVerif - Utilitaires de formatage des nombres
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Formatage centralise des nombres, montants, pourcentages et dates
 * au format francais. TOUTES les pages et composants doivent utiliser
 * ces fonctions au lieu de redefinir des formatters locaux.
 *
 * Convention : espace insecable pour les milliers, virgule pour les decimales.
 */

// ========================================
// NOMBRES
// ========================================

/**
 * Formate un nombre au format francais
 * Exemples:
 * - 1234.56 -> "1 234,56"
 * - null -> "-"
 */
export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ========================================
// MONTANTS
// ========================================

/**
 * Formate un montant en euros avec le symbole euro
 * Exemples:
 * - 1234.56 -> "1 234,56 \u20AC"
 * - null -> "-"
 */
export function formatCurrency(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '-';
  return `${formatNumber(value, decimals)} \u20AC`;
}

// ========================================
// POURCENTAGES
// ========================================

/**
 * Formate un pourcentage au format francais
 * Exemples:
 * - 12.5 -> "12,5 %"
 * - null -> "-"
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) return '-';
  return `${formatNumber(value, decimals)} %`;
}

/**
 * Formate un pourcentage avec signe (+/-) pour les variations
 * Exemples:
 * - 12.5 -> "+12,5 %"
 * - -3.2 -> "-3,2 %"
 * - null -> "-"
 */
export function formatSignedPercentage(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) return '-';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatNumber(value, decimals)} %`;
}

// ========================================
// DATES
// ========================================

/**
 * Formate une date au format francais long
 * Exemples:
 * - "2026-02-13" -> "13 fevrier 2026"
 */
export function formatDateFR(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate une date au format francais court
 * Exemples:
 * - "2026-02-13" -> "13/02/2026"
 * - Date object -> "13/02/2026"
 * - null -> "-"
 */
export function formatDateShortFR(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return typeof dateStr === 'string' ? dateStr : '-';
  return date.toLocaleDateString('fr-FR');
}

/**
 * Formate une date au format francais medium (jour + mois abrege + annee)
 * Exemples:
 * - "2026-02-13" -> "13 fev. 2026"
 * - null -> "-"
 */
export function formatDateMediumFR(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formate une date (ISO ou "YYYY-MM") en mois/annee francais long
 * Exemples:
 * - "2026-02" -> "Fevrier 2026"
 * - "2026-02-13" -> "Fevrier 2026"
 */
export function formatMonthYear(dateStr: string): string {
  // Handle "YYYY-MM" format by appending -01
  const normalized = dateStr.length <= 7 ? `${dateStr}-01` : dateStr;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return dateStr;
  const result = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Formate une date (ISO ou "YYYY-MM") en mois court + annee courte
 * Exemples:
 * - "2026-02" -> "Fev. 26"
 * - "2026-02-13" -> "Fev. 26"
 */
export function formatMonthShort(dateStr: string): string {
  const normalized = dateStr.length <= 7 ? `${dateStr}-01` : dateStr;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}
