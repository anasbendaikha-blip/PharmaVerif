/**
 * PharmaVerif - Utilitaires de formatage des nombres
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 * 
 * Formatage des nombres, montants et pourcentages au format français.
 */

/**
 * Formate un nombre avec des espaces pour les milliers (format français)
 * Exemples:
 * - 1234.56 -> "1 234.56"
 * - 123456.78 -> "123 456.78"
 * - 1234567.89 -> "1 234 567.89"
 */
export function formatNumber(value: number, decimals: number = 2): string {
  // Formater avec le nombre de décimales souhaité
  const formatted = value.toFixed(decimals);
  
  // Séparer la partie entière et décimale
  const [integerPart, decimalPart] = formatted.split('.');
  
  // Ajouter des espaces tous les 3 chiffres (de droite à gauche)
  const integerWithSpaces = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  // Recombiner avec la partie décimale
  return decimalPart ? `${integerWithSpaces}.${decimalPart}` : integerWithSpaces;
}

/**
 * Formate un montant en euros avec le symbole €
 * Exemples:
 * - 1234.56 -> "1 234.56 €"
 * - 123456.78 -> "123 456.78 €"
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `${formatNumber(value, decimals)} €`;
}

/**
 * Formate un pourcentage
 * Exemples:
 * - 12.5 -> "12.5%"
 * - 100 -> "100%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}