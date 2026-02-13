/**
 * PharmaVerif - Utilitaires de formatage des nombres
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Formatage des nombres, montants et pourcentages au format francais.
 * Convention : espace insecable pour les milliers, virgule pour les decimales.
 */

/**
 * Formate un nombre au format francais
 * Exemples:
 * - 1234.56 -> "1 234,56"
 * - 123456.78 -> "123 456,78"
 * - 1234567.89 -> "1 234 567,89"
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formate un montant en euros avec le symbole euro
 * Exemples:
 * - 1234.56 -> "1 234,56 \u20AC"
 * - 123456.78 -> "123 456,78 \u20AC"
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `${formatNumber(value, decimals)} \u20AC`;
}

/**
 * Formate un pourcentage au format francais
 * Exemples:
 * - 12.5 -> "12,5 %"
 * - 100 -> "100,0 %"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)} %`;
}

/**
 * Formate une date au format francais long
 * Exemples:
 * - "2026-02-13" -> "13 fevrier 2026"
 */
export function formatDateFR(dateStr: string): string {
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
 */
export function formatDateShortFR(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('fr-FR');
}
