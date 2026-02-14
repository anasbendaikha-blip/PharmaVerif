/**
 * PharmaVerif - Chart Colors
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Palette de couleurs centralisee pour les graphiques (Recharts) et exports PDF.
 * Source unique de verite — remplace les constantes locales dans les pages.
 *
 * Note : Recharts ne supporte pas les CSS variables dans certains attributs (fill, stroke),
 * donc on utilise des hex directs ici. Ces couleurs sont alignees avec les tokens du design system.
 */

// ========================================
// PALETTE PRINCIPALE (hex pour Recharts)
// ========================================

/**
 * Palette ordonnee de 8 couleurs pour graphiques.
 * Utiliser via index : CHART_PALETTE[i % CHART_PALETTE.length]
 */
export const CHART_PALETTE = [
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#F59E0B', // amber-500
  '#10B981', // emerald-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#6366F1', // indigo-500
] as const;

// ========================================
// COULEURS NOMMEES
// ========================================

/**
 * Acces par nom semantique pour des cas specifiques
 * (ex: CHART_COLORS_BY_NAME.blue pour une serie "conforme")
 */
export const CHART_COLORS_BY_NAME = {
  blue: '#3B82F6',
  red: '#EF4444',
  amber: '#F59E0B',
  green: '#10B981',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  indigo: '#6366F1',
  orange: '#F97316',
  teal: '#14B8A6',
} as const;

// ========================================
// COULEURS POUR TYPES D'ANOMALIES
// ========================================

/**
 * Mapping type d'anomalie → couleur pour PieChart / BarChart
 * Aligné avec les types retournés par l'API
 */
export const ANOMALIE_TYPE_COLORS: Record<string, string> = {
  prix_unitaire: CHART_PALETTE[0],
  quantite: CHART_PALETTE[1],
  remise: CHART_PALETTE[2],
  tva: CHART_PALETTE[3],
  doublon: CHART_PALETTE[4],
  montant_total: CHART_PALETTE[5],
  reference: CHART_PALETTE[6],
  autre: CHART_PALETTE[7],
};

// ========================================
// COULEURS PDF (RGB arrays pour jsPDF)
// ========================================

/**
 * Couleurs RGB pour export PDF (jsPDF / autoTable).
 * Format : [R, G, B] (0-255)
 */
export const PDF_COLORS = {
  primary: [3, 2, 19] as const,       // --primary
  blue: [59, 130, 246] as const,       // blue-500
  green: [16, 185, 129] as const,      // emerald-500
  red: [239, 68, 68] as const,         // red-500
  amber: [245, 158, 11] as const,      // amber-500
  gray: [113, 113, 130] as const,      // --muted-foreground
  white: [255, 255, 255] as const,
  lightGray: [243, 243, 245] as const, // --input-background
  border: [236, 236, 240] as const,    // --muted
} as const;

// ========================================
// UTILITAIRES
// ========================================

/**
 * Retourne une couleur de la palette par index (cyclique).
 * Utile pour les séries dynamiques.
 */
export function getChartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
