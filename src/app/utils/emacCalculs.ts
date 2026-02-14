/**
 * PharmaVerif - Calculs metier EMAC & Prix
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Fonctions pures pour :
 *  - Classifier les ecarts EMAC (conforme / sous-declaration / sur-declaration)
 *  - Construire les donnees de comparaison EMAC depuis le triangle API
 *  - Detecter les variations de prix suspectes (>10% par defaut)
 *  - Calculer les statistiques prix (min/max/moy)
 */

import type { TriangleVerificationResponse } from '../api/types';
import type { PrixHistoriqueEntry } from '../components/PrixHistoriqueChart';

// ========================================
// TYPES — EMAC
// ========================================

/** Classification d'un ecart EMAC */
export type EcartClassification = 'conforme' | 'sous-declaration' | 'sur-declaration';

/** Ligne de comparaison EMAC enrichie */
export interface EMACComparisonRow {
  /** Label de l'element (RFA, COP, Remises diff., etc.) */
  label: string;
  /** Montant declare dans l'EMAC */
  emacDeclare: number;
  /** Montant calcule a partir des factures */
  facturesCalcule: number;
  /** Ecart en euros (EMAC - Factures) */
  ecart: number;
  /** Ecart en pourcentage */
  ecartPourcent: number;
  /** Classification automatique */
  statut: EcartClassification;
  /** Est-ce une ligne TOTAL ? */
  isTotal: boolean;
}

/** Totaux de la comparaison EMAC */
export interface EMACComparisonTotaux {
  emacTotal: number;
  facturesTotal: number;
  ecartTotal: number;
  ecartTotalPct: number;
}

// ========================================
// TYPES — PRIX
// ========================================

/** Point de donnee enrichi avec variation */
export interface PrixVariationPoint {
  /** Date (ISO string) */
  date: string;
  /** Prix unitaire net */
  prix: number;
  /** Variation en % par rapport au point precedent (0 pour le premier) */
  variation: number;
  /** La variation est-elle suspecte ? */
  isSuspect: boolean;
  /** ID de la facture source */
  factureId?: number;
  /** Numero de la facture source */
  factureNumero?: string;
  /** Nom du laboratoire */
  laboratoireNom?: string;
}

/** Statistiques globales d'un historique de prix */
export interface PrixTimelineStats {
  /** Prix minimum observe */
  prixMin: number;
  /** Prix maximum observe */
  prixMax: number;
  /** Prix moyen */
  prixMoyen: number;
  /** Variation moyenne (%) */
  variationMoyenne: number;
  /** Nombre de hausses suspectes (variation > seuil) */
  nbHaussesSuspectes: number;
  /** Nombre de baisses suspectes (variation < -seuil) */
  nbBaissesSuspectes: number;
}

// ========================================
// FONCTIONS — EMAC
// ========================================

/**
 * Classifie un ecart EMAC selon le seuil configurable.
 *
 * - conforme : ecart < seuil%
 * - sous-declaration : EMAC < Factures (le fournisseur doit plus)
 * - sur-declaration : EMAC > Factures (a verifier)
 *
 * @param emac Montant declare dans l'EMAC
 * @param factures Montant calcule des factures
 * @param seuil Seuil en % (defaut: 5)
 */
export function classifyEcart(
  emac: number,
  factures: number,
  seuil: number = 5
): EcartClassification {
  if (factures === 0 && emac === 0) return 'conforme';

  const base = factures !== 0 ? factures : emac;
  const ecartPct = Math.abs(((emac - factures) / base) * 100);

  if (ecartPct < seuil) return 'conforme';
  if (emac < factures) return 'sous-declaration';
  return 'sur-declaration';
}

/**
 * Construit les donnees de comparaison enrichies a partir
 * du TriangleVerificationResponse de l'API.
 *
 * Chaque ligne du triangle est enrichie avec la classification
 * automatique (conforme / sous-declaration / sur-declaration).
 */
export function buildEMACComparisonData(
  triangle: TriangleVerificationResponse,
  seuil: number = 5
): {
  rows: EMACComparisonRow[];
  totaux: EMACComparisonTotaux;
} {
  const rows: EMACComparisonRow[] = triangle.lignes.map((ligne) => {
    const facturesCalcule = ligne.valeur_factures ?? 0;
    const ecart = ligne.ecart_emac_factures ?? (ligne.valeur_emac - facturesCalcule);
    const ecartPct = ligne.ecart_pct ?? (
      facturesCalcule !== 0
        ? ((ligne.valeur_emac - facturesCalcule) / facturesCalcule) * 100
        : 0
    );
    const isTotal = ligne.label === 'TOTAL AVANTAGES' || ligne.label.toLowerCase().includes('total');

    return {
      label: ligne.label,
      emacDeclare: ligne.valeur_emac,
      facturesCalcule,
      ecart,
      ecartPourcent: Number(ecartPct.toFixed(2)),
      statut: classifyEcart(ligne.valeur_emac, facturesCalcule, seuil),
      isTotal,
    };
  });

  // Calcul des totaux
  const nonTotalRows = rows.filter((r) => !r.isTotal);
  const emacTotal = nonTotalRows.reduce((sum, r) => sum + r.emacDeclare, 0);
  const facturesTotal = nonTotalRows.reduce((sum, r) => sum + r.facturesCalcule, 0);
  const ecartTotal = emacTotal - facturesTotal;
  const ecartTotalPct = facturesTotal !== 0
    ? Number(((ecartTotal / facturesTotal) * 100).toFixed(2))
    : 0;

  return {
    rows,
    totaux: { emacTotal, facturesTotal, ecartTotal, ecartTotalPct },
  };
}

/**
 * Retourne le message explicatif et l'action suggeree
 * pour un ecart EMAC selon sa classification.
 */
export function getEcartExplanation(
  row: EMACComparisonRow
): { title: string; description: string; action: string } {
  switch (row.statut) {
    case 'sous-declaration':
      return {
        title: 'Sous-declaration detectee',
        description: `Le fournisseur declare ${Math.abs(row.ecart).toFixed(2)} \u20AC de moins que ce qui a ete facture. Cet argent vous est du et doit etre verse.`,
        action: `Contactez le fournisseur pour reclamer ce montant sur le poste "${row.label}".`,
      };
    case 'sur-declaration':
      return {
        title: 'Sur-declaration detectee',
        description: `Le fournisseur declare ${row.ecart.toFixed(2)} \u20AC de plus que ce qui apparait dans vos factures.`,
        action: `Verifiez vos conditions commerciales ou si des remises speciales s'appliquent pour "${row.label}".`,
      };
    case 'conforme':
    default:
      return {
        title: 'EMAC conforme',
        description: `L'ecart est inferieur a 5%, ce qui est normal (arrondis, remises fin de mois). Aucune action necessaire.`,
        action: '',
      };
  }
}

// ========================================
// FONCTIONS — PRIX
// ========================================

/**
 * Analyse un historique de prix et detecte les variations suspectes.
 *
 * @param historique Donnees brutes de PrixHistoriqueEntry
 * @param seuilSuspect Seuil en % au-dela duquel une variation est suspecte (defaut: 10)
 */
export function detectPrixVariations(
  historique: PrixHistoriqueEntry[],
  seuilSuspect: number = 10
): { data: PrixVariationPoint[]; stats: PrixTimelineStats } {
  if (!historique || historique.length === 0) {
    return {
      data: [],
      stats: {
        prixMin: 0,
        prixMax: 0,
        prixMoyen: 0,
        variationMoyenne: 0,
        nbHaussesSuspectes: 0,
        nbBaissesSuspectes: 0,
      },
    };
  }

  // Trier par date
  const sorted = [...historique].sort(
    (a, b) => new Date(a.date_facture).getTime() - new Date(b.date_facture).getTime()
  );

  // Construire les points avec variation
  const data: PrixVariationPoint[] = sorted.map((point, index) => {
    const variation = index > 0
      ? ((point.prix_unitaire_net - sorted[index - 1].prix_unitaire_net) /
          sorted[index - 1].prix_unitaire_net) * 100
      : 0;

    return {
      date: point.date_facture,
      prix: point.prix_unitaire_net,
      variation: Number(variation.toFixed(2)),
      isSuspect: Math.abs(variation) > seuilSuspect,
      laboratoireNom: point.laboratoire_nom ?? undefined,
    };
  });

  // Calculer les stats
  const prices = data.map((d) => d.prix);
  const variations = data.map((d) => d.variation).filter((v) => v !== 0);

  const stats: PrixTimelineStats = {
    prixMin: Math.min(...prices),
    prixMax: Math.max(...prices),
    prixMoyen: prices.reduce((a, b) => a + b, 0) / prices.length,
    variationMoyenne: variations.length > 0
      ? variations.reduce((a, b) => a + b, 0) / variations.length
      : 0,
    nbHaussesSuspectes: data.filter((d) => d.variation > seuilSuspect).length,
    nbBaissesSuspectes: data.filter((d) => d.variation < -seuilSuspect).length,
  };

  return { data, stats };
}

/**
 * Calcule les statistiques basiques pour un tableau de prix.
 */
export function computePrixStats(prices: number[]): {
  min: number;
  max: number;
  moy: number;
} {
  if (prices.length === 0) return { min: 0, max: 0, moy: 0 };
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    moy: prices.reduce((a, b) => a + b, 0) / prices.length,
  };
}
