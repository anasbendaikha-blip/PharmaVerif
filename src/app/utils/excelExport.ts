/**
 * PharmaVerif - Export Excel
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Fonctions d'export Excel pour :
 *  - Comparaison EMAC vs Factures (triangle de verification)
 *  - Historique des prix avec detection variations suspectes
 *
 * Utilise la librairie xlsx (deja installee pour l'import).
 */

import * as XLSX from 'xlsx';
import type { EMACComparisonRow, EMACComparisonTotaux, PrixVariationPoint, PrixTimelineStats } from './emacCalculs';
import { formatMonthYear } from './formatNumber';

// ========================================
// EMAC EXPORT
// ========================================

/**
 * Exporte les donnees de comparaison EMAC vs Factures en fichier Excel (.xlsx).
 *
 * Structure du fichier :
 *  - Titre avec labo et periode
 *  - Headers colores
 *  - Lignes de donnees avec ecart %, statut
 *  - Ligne TOTAL en gras
 *  - Colonnes auto-dimensionnees
 *
 * @param comparaisonData Lignes de comparaison enrichies
 * @param totaux Totaux calcules
 * @param mois Periode au format "YYYY-MM" ou ISO
 * @param laboratoireNom Nom du laboratoire (optionnel)
 */
export function exportEMACToExcel(
  comparaisonData: EMACComparisonRow[],
  totaux: EMACComparisonTotaux,
  mois: string,
  laboratoireNom?: string
): void {
  const periodeLabel = formatMonthYear(mois);
  const titre = laboratoireNom
    ? `Verification EMAC vs Factures - ${laboratoireNom} - ${periodeLabel}`
    : `Verification EMAC vs Factures - ${periodeLabel}`;

  // Construire les lignes du worksheet
  const worksheetData: (string | number)[][] = [
    // Titre
    [titre],
    [], // Ligne vide
    // Headers
    [
      'Element',
      'EMAC Declare (\u20AC)',
      'Factures Calculees (\u20AC)',
      'Ecart (\u20AC)',
      'Ecart (%)',
      'Statut',
    ],
    // Data rows (exclure TOTAL, on l'ajoute a part)
    ...comparaisonData
      .filter((row) => !row.isTotal)
      .map((row) => [
        row.label,
        Number(row.emacDeclare.toFixed(2)),
        Number(row.facturesCalcule.toFixed(2)),
        Number(row.ecart.toFixed(2)),
        `${row.ecartPourcent > 0 ? '+' : ''}${row.ecartPourcent.toFixed(2)}%`,
        row.statut === 'conforme'
          ? 'Conforme'
          : row.statut === 'sous-declaration'
            ? 'Sous-declaration'
            : 'Sur-declaration',
      ]),
    // Ligne vide avant total
    [],
    // Total
    [
      'TOTAL',
      Number(totaux.emacTotal.toFixed(2)),
      Number(totaux.facturesTotal.toFixed(2)),
      Number(totaux.ecartTotal.toFixed(2)),
      `${totaux.ecartTotalPct > 0 ? '+' : ''}${totaux.ecartTotalPct.toFixed(2)}%`,
      '',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Dimensionner les colonnes
  ws['!cols'] = [
    { wch: 28 }, // Element
    { wch: 20 }, // EMAC Declare
    { wch: 22 }, // Factures Calculees
    { wch: 16 }, // Ecart
    { wch: 12 }, // Ecart %
    { wch: 18 }, // Statut
  ];

  // Creer le workbook et telecharger
  const wb = XLSX.utils.book_new();
  const sheetName = `EMAC ${periodeLabel}`.substring(0, 31); // Max 31 chars pour Excel
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = laboratoireNom
    ? `EMAC_Verification_${laboratoireNom.replace(/\s+/g, '_')}_${mois}.xlsx`
    : `EMAC_Verification_${mois}.xlsx`;

  XLSX.writeFile(wb, filename);
}

// ========================================
// PRIX HISTORIQUE EXPORT
// ========================================

/**
 * Exporte l'historique des prix d'un produit en fichier Excel (.xlsx).
 *
 * Structure du fichier :
 *  - Titre avec designation produit
 *  - Historique mensuel : date, prix, variation %, suspect
 *  - Resume statistique en bas
 *
 * @param designation Nom du produit
 * @param data Points de prix enrichis avec variations
 * @param stats Statistiques globales
 * @param cipCode Code CIP optionnel
 */
export function exportPrixHistoriqueToExcel(
  designation: string,
  data: PrixVariationPoint[],
  stats: PrixTimelineStats,
  cipCode?: string
): void {
  const titre = cipCode
    ? `Historique des prix - ${designation} (CIP: ${cipCode})`
    : `Historique des prix - ${designation}`;

  const worksheetData: (string | number)[][] = [
    // Titre
    [titre],
    [], // Ligne vide
    // Headers
    ['Date', 'Prix unitaire (\u20AC)', 'Variation (%)', 'Statut', 'Laboratoire'],
    // Data rows
    ...data.map((point) => [
      point.date,
      Number(point.prix.toFixed(2)),
      point.variation !== 0
        ? `${point.variation > 0 ? '+' : ''}${point.variation.toFixed(2)}%`
        : '-',
      point.isSuspect ? 'SUSPECT' : 'Normal',
      point.laboratoireNom || '-',
    ]),
    // Lignes vides avant stats
    [],
    [],
    // Resume stats
    ['Statistiques'],
    ['Prix minimum', Number(stats.prixMin.toFixed(2))],
    ['Prix maximum', Number(stats.prixMax.toFixed(2))],
    ['Prix moyen', Number(stats.prixMoyen.toFixed(2))],
    [
      'Variation moyenne',
      `${stats.variationMoyenne > 0 ? '+' : ''}${stats.variationMoyenne.toFixed(2)}%`,
    ],
    ['Hausses suspectes', stats.nbHaussesSuspectes],
    ['Baisses suspectes', stats.nbBaissesSuspectes],
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Dimensionner les colonnes
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 20 }, // Prix
    { wch: 16 }, // Variation
    { wch: 12 }, // Statut
    { wch: 22 }, // Laboratoire
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historique Prix');

  const filename = `Historique_Prix_${designation.replace(/\s+/g, '_').substring(0, 30)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
