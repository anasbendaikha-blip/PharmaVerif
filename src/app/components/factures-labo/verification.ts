/**
 * PharmaVerif - Vérification des lignes facture labo
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Logique de vérification arithmétique ligne par ligne
 * + calcul de la ventilation TVA.
 */

import type { LigneFactureLaboResponse } from '../../api/types';

// ========================================
// TYPES
// ========================================

export interface LigneVerification {
  ligne: LigneFactureLaboResponse;
  anomalies: string[];
  isOk: boolean;
}

export interface TvaDetail {
  taux: number;
  nbLignes: number;
  baseHt: number;
  montantTva: number;
}

// ========================================
// CONSTANTES
// ========================================

export const ANOMALIE_TYPE_LABELS: Record<string, string> = {
  remise_ecart: 'Ecart de remise',
  escompte_manquant: 'Escompte non applique',
  franco_seuil: 'Franco de port',
  rfa_palier: 'Progression RFA',
  gratuite_manquante: 'Gratuite manquante',
  tva_incoherence: 'Incoherence TVA',
  calcul_arithmetique: 'Erreur arithmetique',
};

// ========================================
// FONCTIONS
// ========================================

/**
 * Vérifie la cohérence arithmétique d'une ligne facture.
 * Retourne la liste des anomalies détectées.
 */
export function verifyLigne(l: LigneFactureLaboResponse): LigneVerification {
  const anomalies: string[] = [];

  // 1. Vérifier PU × (1 - remise%) ≈ PU après remise (tolérance 0.01€)
  const expectedPuAr = l.prix_unitaire_ht * (1 - l.remise_pct / 100);
  if (Math.abs(expectedPuAr - l.prix_unitaire_apres_remise) > 0.02) {
    anomalies.push(
      `PU après remise: attendu ${expectedPuAr.toFixed(4)}€, affiché ${l.prix_unitaire_apres_remise.toFixed(4)}€`
    );
  }

  // 2. Vérifier PU après remise × Qté ≈ Montant HT (tolérance 0.02€)
  const expectedMontantHt = l.prix_unitaire_apres_remise * l.quantite;
  if (Math.abs(expectedMontantHt - l.montant_ht) > 0.02) {
    anomalies.push(
      `Montant HT: attendu ${expectedMontantHt.toFixed(2)}€, affiché ${l.montant_ht.toFixed(2)}€`
    );
  }

  // 3. Vérifier montant_brut = PU HT × Qté
  const expectedBrut = l.prix_unitaire_ht * l.quantite;
  if (Math.abs(expectedBrut - l.montant_brut) > 0.02) {
    anomalies.push(
      `Montant brut: attendu ${expectedBrut.toFixed(2)}€, calculé ${l.montant_brut.toFixed(2)}€`
    );
  }

  // 4. Vérifier cohérence TVA et tranche
  if (l.taux_tva === 2.1 && l.tranche === 'OTC') {
    anomalies.push(`TVA 2.10% classée OTC (devrait être A ou B)`);
  }
  if ((l.taux_tva === 5.5 || l.taux_tva === 10.0) && (l.tranche === 'A' || l.tranche === 'B')) {
    anomalies.push(`TVA ${l.taux_tva}% classée ${l.tranche} (devrait être OTC)`);
  }

  return {
    ligne: l,
    anomalies,
    isOk: anomalies.length === 0,
  };
}

/**
 * Calcule la ventilation TVA à partir des lignes.
 */
export function computeTvaBreakdown(lignes: LigneFactureLaboResponse[]): TvaDetail[] {
  const map = new Map<number, { nbLignes: number; baseHt: number }>();
  for (const l of lignes) {
    const existing = map.get(l.taux_tva) || { nbLignes: 0, baseHt: 0 };
    existing.nbLignes += 1;
    existing.baseHt += l.montant_ht;
    map.set(l.taux_tva, existing);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([taux, data]) => ({
      taux,
      nbLignes: data.nbLignes,
      baseHt: data.baseHt,
      montantTva: data.baseHt * (taux / 100),
    }));
}
