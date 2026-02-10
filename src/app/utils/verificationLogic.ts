/**
 * PharmaVerif - Logique métier de vérification des factures pharmaceutiques
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Ce fichier contient la logique de vérification des remises et détection d'anomalies.
 * Supporte grossistes, laboratoires et autres types de fournisseurs.
 */

import { Facture, Anomalie, Fournisseur, Grossiste, LigneFacture, NiveauSeverite } from '../types';
import { db } from '../data/database';
import type { FactureParsee } from './fileParser';

// ==================== FONCTION PRINCIPALE ====================

/**
 * Vérifie une facture et détecte les anomalies selon le type de fournisseur
 *
 * @param facture - La facture à vérifier
 * @param fournisseur - Le fournisseur associé avec ses conditions
 * @returns Liste des anomalies détectées
 */
export function verifyFacture(facture: Facture, fournisseur: Fournisseur): Anomalie[] {
  const anomalies: Anomalie[] = [];

  // 1. Vérifications communes (tous types) : cohérence calculs
  anomalies.push(...verifierCoherenceCalculs(facture));

  // 2. Dispatch par type de fournisseur
  switch (fournisseur.type_fournisseur) {
    case 'grossiste':
      anomalies.push(...verifierGrossiste(facture, fournisseur));
      break;
    case 'laboratoire':
      anomalies.push(...verifierLaboratoire(facture, fournisseur));
      break;
    case 'autre':
      // Vérifications minimales déjà couvertes par la cohérence
      break;
  }

  // 3. Vérifications des conditions spécifiques (tous types)
  if (fournisseur.conditions_specifiques && fournisseur.conditions_specifiques.length > 0) {
    anomalies.push(...verifierConditionsParametrees(facture, fournisseur));
  }

  return anomalies;
}

// ==================== VERIFICATIONS COMMUNES ====================

/**
 * Vérifie la cohérence des calculs (net à payer ± 1€)
 */
function verifierCoherenceCalculs(facture: Facture): Anomalie[] {
  const anomalies: Anomalie[] = [];
  const remiseReelle = facture.remises_ligne_a_ligne + facture.remises_pied_facture;
  const netCalcule = facture.montant_brut_ht - remiseReelle;
  const ecartNetAPayer = Math.abs(netCalcule - facture.net_a_payer);
  const TOLERANCE_NET = 1.0;

  if (ecartNetAPayer > TOLERANCE_NET) {
    anomalies.push(createAnomalie(
      facture.id,
      'ecart_calcul',
      `Écart de calcul sur le net à payer : ${facture.net_a_payer.toFixed(2)}€ facturés au lieu de ${netCalcule.toFixed(2)}€ calculés (Brut HT ${facture.montant_brut_ht.toFixed(2)}€ - Remises ${remiseReelle.toFixed(2)}€)`,
      parseFloat(ecartNetAPayer.toFixed(2)),
      'erreur',
    ));
  }

  return anomalies;
}

// ==================== VERIFICATIONS GROSSISTE ====================

/**
 * Vérifications spécifiques aux grossistes : remise base + coop + escompte + franco + prix suspects
 */
function verifierGrossiste(facture: Facture, grossiste: Fournisseur): Anomalie[] {
  const anomalies: Anomalie[] = [];

  // Remise totale attendue
  const tauxRemiseTotale =
    grossiste.remise_base + grossiste.cooperation_commerciale + grossiste.escompte;
  const remiseAttendue = facture.montant_brut_ht * (tauxRemiseTotale / 100);
  const remiseReelle = facture.remises_ligne_a_ligne + facture.remises_pied_facture;
  const ecartRemise = remiseAttendue - remiseReelle;
  const TOLERANCE_REMISE = 5.0;

  if (Math.abs(ecartRemise) > TOLERANCE_REMISE) {
    if (ecartRemise > 0) {
      anomalies.push(createAnomalie(
        facture.id,
        'remise_manquante',
        `Remise totale insuffisante : ${remiseReelle.toFixed(2)}€ appliqués au lieu de ${remiseAttendue.toFixed(2)}€ attendus (${tauxRemiseTotale.toFixed(2)}% sur ${facture.montant_brut_ht.toFixed(2)}€ HT)`,
        parseFloat(ecartRemise.toFixed(2)),
        'warning',
      ));
    } else {
      anomalies.push(createAnomalie(
        facture.id,
        'remise_incorrecte',
        `Remise totale excessive : ${remiseReelle.toFixed(2)}€ appliqués alors que seulement ${remiseAttendue.toFixed(2)}€ attendus`,
        parseFloat(Math.abs(ecartRemise).toFixed(2)),
        'warning',
      ));
    }
  }

  // Franco
  if (facture.montant_brut_ht >= grossiste.franco && grossiste.franco > 0) {
    const remiseR = facture.remises_ligne_a_ligne + facture.remises_pied_facture;
    const netAttendu = facture.montant_brut_ht - remiseR;
    const ecartNet = facture.net_a_payer - netAttendu;

    if (ecartNet > 5) {
      anomalies.push(createAnomalie(
        facture.id,
        'franco_non_respecte',
        `Frais de port suspects (${ecartNet.toFixed(2)}€) alors que le franco de ${grossiste.franco.toFixed(2)}€ est dépassé (montant brut : ${facture.montant_brut_ht.toFixed(2)}€)`,
        parseFloat(ecartNet.toFixed(2)),
        'warning',
      ));
    }
  }

  // Prix suspects sur lignes
  if (facture.lignes && facture.lignes.length > 0) {
    facture.lignes.forEach((ligne) => {
      if (ligne.remise_appliquee < grossiste.remise_base - 0.5) {
        const ecartLigne =
          ligne.prix_unitaire *
          ligne.quantite *
          ((grossiste.remise_base - ligne.remise_appliquee) / 100);

        if (ecartLigne > 10) {
          anomalies.push(createAnomalie(
            facture.id,
            'prix_suspect',
            `Produit "${ligne.produit}" (CIP: ${ligne.cip}) : remise ligne ${ligne.remise_appliquee}% inférieure à la remise base ${grossiste.remise_base}% (écart: ${ecartLigne.toFixed(2)}€)`,
            parseFloat(ecartLigne.toFixed(2)),
            'info',
          ));
        }
      }
    });
  }

  return anomalies;
}

// ==================== VERIFICATIONS LABORATOIRE ====================

/**
 * Vérifications spécifiques aux laboratoires
 */
function verifierLaboratoire(facture: Facture, labo: Fournisseur): Anomalie[] {
  const anomalies: Anomalie[] = [];

  // Alerte si commande > 5000€ sans aucune remise appliquée
  const remiseReelle = facture.remises_ligne_a_ligne + facture.remises_pied_facture;
  if (facture.montant_brut_ht > 5000 && remiseReelle === 0) {
    anomalies.push(createAnomalie(
      facture.id,
      'remise_manquante',
      `Commande de ${facture.montant_brut_ht.toFixed(2)}€ HT chez ${labo.nom} sans aucune remise appliquée. Vérifiez les conditions négociées.`,
      0,
      'warning',
    ));
  }

  return anomalies;
}

// ==================== VERIFICATIONS CONDITIONS PARAMETREES ====================

/**
 * Vérifie les conditions spécifiques paramétrées pour un fournisseur
 */
function verifierConditionsParametrees(facture: Facture, fournisseur: Fournisseur): Anomalie[] {
  const anomalies: Anomalie[] = [];
  const now = new Date().toISOString().split('T')[0];

  for (const condition of fournisseur.conditions_specifiques || []) {
    if (!condition.actif) continue;
    if (condition.date_debut && condition.date_debut > now) continue;
    if (condition.date_fin && condition.date_fin < now) continue;

    switch (condition.type_condition) {
      case 'remise_volume':
        anomalies.push(...verifierRemiseVolume(facture, condition));
        break;
      case 'franco_seuil':
        anomalies.push(...verifierFrancoSeuil(facture, condition));
        break;
      case 'escompte_conditionnel':
        anomalies.push(...verifierEscompteConditionnel(facture, condition));
        break;
      case 'rfa':
        anomalies.push(...verifierRFA(facture, condition));
        break;
      case 'remise_gamme':
      case 'remise_produit':
        anomalies.push(...verifierRemiseGammeOuProduit(facture, condition));
        break;
    }
  }

  return anomalies;
}

/**
 * Vérifie la remise volume : détecte palier atteint mais remise insuffisante
 */
function verifierRemiseVolume(facture: Facture, condition: { parametres: { seuils?: Array<{ min: number; max?: number; taux: number }> }; nom: string; id: number }): Anomalie[] {
  const anomalies: Anomalie[] = [];
  const seuils = condition.parametres.seuils;
  if (!seuils || !facture.lignes) return anomalies;

  const quantiteTotale = facture.lignes.reduce((sum, l) => sum + l.quantite, 0);

  // Trouver le palier applicable
  const palierApplicable = seuils.find(
    (s) => quantiteTotale >= s.min && (!s.max || quantiteTotale <= s.max)
  );

  if (palierApplicable) {
    const remiseAttendue = facture.montant_brut_ht * (palierApplicable.taux / 100);
    const remiseReelle = facture.remises_ligne_a_ligne + facture.remises_pied_facture;

    if (remiseReelle < remiseAttendue * 0.9) {
      anomalies.push(createAnomalie(
        facture.id,
        'remise_volume_manquante',
        `Condition "${condition.nom}" : ${quantiteTotale} unités commandées (palier ${palierApplicable.min}+, taux ${palierApplicable.taux}%). Remise attendue ~${remiseAttendue.toFixed(2)}€, appliquée ${remiseReelle.toFixed(2)}€`,
        parseFloat((remiseAttendue - remiseReelle).toFixed(2)),
        'warning',
        condition.id,
      ));
    }
  }

  return anomalies;
}

/**
 * Vérifie le franco conditionnel : détecte frais de port quand seuil dépassé
 */
function verifierFrancoSeuil(facture: Facture, condition: { parametres: { seuil_montant?: number }; nom: string; id: number }): Anomalie[] {
  const anomalies: Anomalie[] = [];
  const seuil = condition.parametres.seuil_montant;
  if (!seuil) return anomalies;

  if (facture.montant_brut_ht >= seuil) {
    const remiseReelle = facture.remises_ligne_a_ligne + facture.remises_pied_facture;
    const netAttendu = facture.montant_brut_ht - remiseReelle;
    const ecart = facture.net_a_payer - netAttendu;

    if (ecart > 5) {
      anomalies.push(createAnomalie(
        facture.id,
        'condition_non_respectee',
        `Condition "${condition.nom}" : frais suspects de ${ecart.toFixed(2)}€ alors que le seuil de ${seuil.toFixed(2)}€ est dépassé (montant : ${facture.montant_brut_ht.toFixed(2)}€)`,
        parseFloat(ecart.toFixed(2)),
        'warning',
        condition.id,
      ));
    }
  }

  return anomalies;
}

/**
 * Vérifie l'escompte conditionnel : info sur escompte applicable
 */
function verifierEscompteConditionnel(facture: Facture, condition: { parametres: { taux?: number; delai_jours?: number }; nom: string; id: number }): Anomalie[] {
  const anomalies: Anomalie[] = [];
  const taux = condition.parametres.taux;
  if (!taux) return anomalies;

  const escompteAttendu = facture.montant_brut_ht * (taux / 100);
  anomalies.push(createAnomalie(
    facture.id,
    'condition_non_respectee',
    `Condition "${condition.nom}" : escompte de ${taux}% applicable (${escompteAttendu.toFixed(2)}€). Vérifiez les délais de paiement.`,
    0,
    'info',
    condition.id,
  ));

  return anomalies;
}

/**
 * Vérifie la RFA : info suivi RFA
 */
function verifierRFA(facture: Facture, condition: { parametres: { objectif_annuel?: number; taux_rfa?: number }; nom: string; id: number }): Anomalie[] {
  const anomalies: Anomalie[] = [];
  const objectif = condition.parametres.objectif_annuel;
  const taux = condition.parametres.taux_rfa;
  if (!objectif || !taux) return anomalies;

  anomalies.push(createAnomalie(
    facture.id,
    'rfa_non_appliquee',
    `Condition "${condition.nom}" : RFA de ${taux}% sur objectif annuel de ${objectif.toFixed(2)}€. Facture de ${facture.montant_brut_ht.toFixed(2)}€ contribue à l'objectif.`,
    0,
    'info',
    condition.id,
  ));

  return anomalies;
}

/**
 * Vérifie remise gamme / produit : info (analyse détaillée nécessaire)
 */
function verifierRemiseGammeOuProduit(facture: Facture, condition: { nom: string; id: number; type_condition: string }): Anomalie[] {
  const anomalies: Anomalie[] = [];

  const typeLabel = condition.type_condition === 'remise_gamme' ? 'gamme' : 'produit';
  anomalies.push(createAnomalie(
    facture.id,
    'condition_non_respectee',
    `Condition "${condition.nom}" : remise ${typeLabel} applicable. Analyse détaillée des lignes nécessaire pour vérifier la conformité.`,
    0,
    'info',
    condition.id,
  ));

  return anomalies;
}

// ==================== HELPERS ====================

/**
 * Crée un objet Anomalie (sera remplacé lors de la sauvegarde)
 */
function createAnomalie(
  factureId: number,
  typeAnomalie: Anomalie['type_anomalie'],
  description: string,
  montantEcart: number,
  niveauSeverite: NiveauSeverite,
  conditionId?: number,
): Anomalie {
  return {
    id: Date.now() + Math.random(),
    facture_id: factureId,
    type_anomalie: typeAnomalie,
    description,
    montant_ecart: montantEcart,
    niveau_severite: niveauSeverite,
    condition_id: conditionId,
    created_at: new Date().toISOString(),
  };
}

// ==================== FONCTIONS PUBLIQUES (conservées) ====================

/**
 * Calcule le potentiel d'économies sur une liste de factures
 */
export function calculateSavingsPotential(factures: Facture[]): number {
  let totalEconomies = 0;

  factures.forEach((facture) => {
    const fournisseur = db.getFournisseurById(facture.fournisseur_id ?? facture.grossiste_id ?? 0);
    if (!fournisseur) return;

    const anomalies = verifyFacture(facture, fournisseur);
    const economieFacture = anomalies.reduce((sum, anomalie) => sum + anomalie.montant_ecart, 0);
    totalEconomies += economieFacture;
  });

  return parseFloat(totalEconomies.toFixed(2));
}

/**
 * Calcule les statistiques détaillées par type d'anomalie
 */
export function calculateAnomalieStats(factures: Facture[]): {
  [key: string]: { count: number; montantTotal: number };
} {
  const stats: { [key: string]: { count: number; montantTotal: number } } = {
    remise_manquante: { count: 0, montantTotal: 0 },
    remise_incorrecte: { count: 0, montantTotal: 0 },
    ecart_calcul: { count: 0, montantTotal: 0 },
    franco_non_respecte: { count: 0, montantTotal: 0 },
    prix_suspect: { count: 0, montantTotal: 0 },
    remise_volume_manquante: { count: 0, montantTotal: 0 },
    condition_non_respectee: { count: 0, montantTotal: 0 },
    rfa_non_appliquee: { count: 0, montantTotal: 0 },
  };

  factures.forEach((facture) => {
    const fournisseur = db.getFournisseurById(facture.fournisseur_id ?? facture.grossiste_id ?? 0);
    if (!fournisseur) return;

    const anomalies = verifyFacture(facture, fournisseur);
    anomalies.forEach((anomalie) => {
      if (!stats[anomalie.type_anomalie]) {
        stats[anomalie.type_anomalie] = { count: 0, montantTotal: 0 };
      }
      stats[anomalie.type_anomalie].count++;
      stats[anomalie.type_anomalie].montantTotal += anomalie.montant_ecart;
    });
  });

  // Arrondir les montants
  Object.keys(stats).forEach((key) => {
    stats[key].montantTotal = parseFloat(stats[key].montantTotal.toFixed(2));
  });

  return stats;
}

/**
 * Génère une facture aléatoire pour la démonstration
 *
 * @param fournisseurId - ID du fournisseur (optionnel, aléatoire si non fourni)
 * @returns Facture générée avec données réalistes
 */
export function genererFactureAleatoire(fournisseurId?: number): Facture {
  const fournisseur = fournisseurId
    ? db.getFournisseurById(fournisseurId)
    : db.getActiveFournisseurs()[Math.floor(Math.random() * db.getActiveFournisseurs().length)];

  if (!fournisseur) {
    throw new Error('Fournisseur non trouvé');
  }

  const produitsExemples = [
    { nom: 'DOLIPRANE 1000MG 8 CPR', cip: '3400935926661', prix: 2.15 },
    { nom: 'SPASFON 80MG 30 CPR', cip: '3400933989668', prix: 5.8 },
    { nom: 'EFFERALGAN 500MG 16 CPR', cip: '3400936111431', prix: 2.4 },
    { nom: 'IBUPROFENE 400MG 30 CPR', cip: '3400934457081', prix: 3.5 },
    { nom: 'GAVISCON MENTHE 24 CPR', cip: '3400936507012', prix: 4.2 },
    { nom: 'HUMEX RHUME 16 CPR', cip: '3400935749048', prix: 5.1 },
    { nom: 'DAFALGAN 1G 8 CPR', cip: '3400933989675', prix: 2.8 },
    { nom: 'FERVEX ADULTES 8 SACHETS', cip: '3400934589867', prix: 6.5 },
    { nom: 'LYSOPAÏNE MAUX GORGE 18 CPR', cip: '3400935748942', prix: 4.9 },
    { nom: 'STREPSILS ORANGE 24 PAST', cip: '3400933814670', prix: 5.3 },
  ];

  const nombreLignes = Math.floor(Math.random() * 8) + 5; // 5-12 lignes
  const lignes: LigneFacture[] = [];
  let montantBrutHT = 0;

  for (let i = 0; i < nombreLignes; i++) {
    const produit = produitsExemples[Math.floor(Math.random() * produitsExemples.length)];
    const quantite = Math.floor(Math.random() * 60) + 15;
    const montantLigne = produit.prix * quantite;

    const respecteRemise = Math.random() < 0.7;
    const remiseAppliquee = respecteRemise
      ? fournisseur.remise_base
      : fournisseur.remise_base * (0.4 + Math.random() * 0.5);

    const montantHT = montantLigne * (1 - remiseAppliquee / 100);

    lignes.push({
      id: Date.now() + i,
      facture_id: 0,
      produit: produit.nom,
      cip: produit.cip,
      quantite,
      prix_unitaire: produit.prix,
      remise_appliquee: parseFloat(remiseAppliquee.toFixed(2)),
      montant_ht: parseFloat(montantHT.toFixed(2)),
    });

    montantBrutHT += montantLigne;
  }

  const remisesLigneALigne = lignes.reduce((sum, l) => {
    return sum + (l.prix_unitaire * l.quantite * l.remise_appliquee) / 100;
  }, 0);

  const tauxRemisePiedFacture = fournisseur.cooperation_commerciale + fournisseur.escompte;
  const respecteRemisePied = Math.random() < 0.65;

  const remisesPiedFacture = respecteRemisePied
    ? montantBrutHT * (tauxRemisePiedFacture / 100)
    : montantBrutHT * (tauxRemisePiedFacture / 100) * (0.3 + Math.random() * 0.6);

  const netAPayer = montantBrutHT - remisesLigneALigne - remisesPiedFacture;

  return {
    id: 0,
    numero: `FAC2026-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
    date: new Date().toISOString().split('T')[0],
    fournisseur_id: fournisseur.id,
    grossiste_id: fournisseur.id,
    montant_brut_ht: parseFloat(montantBrutHT.toFixed(2)),
    remises_ligne_a_ligne: parseFloat(remisesLigneALigne.toFixed(2)),
    remises_pied_facture: parseFloat(remisesPiedFacture.toFixed(2)),
    net_a_payer: parseFloat(netAPayer.toFixed(2)),
    statut_verification: 'non_verifie',
    created_at: new Date().toISOString(),
    lignes,
    fournisseur,
    grossiste: fournisseur,
  };
}

/**
 * Calculer les remises attendues selon les taux du fournisseur
 */
export function calculerRemisesAttendues(facture: Facture, fournisseur: Fournisseur): number {
  if (fournisseur.type_fournisseur !== 'grossiste') {
    // Pour les labos/autres, pas de remise base calculable automatiquement
    return 0;
  }
  const tauxTotal = fournisseur.remise_base + fournisseur.cooperation_commerciale + fournisseur.escompte;
  const remisesAttendues = facture.montant_brut_ht * (tauxTotal / 100);
  return parseFloat(remisesAttendues.toFixed(2));
}

/**
 * Obtenir un résumé textuel de la conformité d'une facture
 */
export function getFactureConformiteSummary(facture: Facture, fournisseur: Grossiste): string {
  const anomalies = verifyFacture(facture, fournisseur);

  if (anomalies.length === 0) {
    return 'Facture conforme : toutes les remises sont correctement appliquées.';
  }

  const montantTotal = anomalies.reduce((sum, a) => sum + a.montant_ecart, 0);
  return `${anomalies.length} anomalie(s) détectée(s) pour un montant de ${montantTotal.toFixed(2)}€ récupérable.`;
}

/**
 * Convertir une facture parsée en objet Facture pour vérification
 *
 * @param factureParsee - Données extraites du fichier
 * @param fournisseurId - ID du fournisseur sélectionné
 * @returns Facture formatée pour vérification
 */
export function convertParsedToFacture(factureParsee: FactureParsee, fournisseurId: number): Facture {
  const fournisseur = db.getFournisseurById(fournisseurId);

  if (!fournisseur) {
    throw new Error(`Fournisseur avec ID ${fournisseurId} non trouvé`);
  }

  const lignes: LigneFacture[] = factureParsee.lignes.map((ligneParsee, index) => ({
    id: Date.now() + index,
    facture_id: 0,
    produit: ligneParsee.designation,
    cip: ligneParsee.code_produit || `CODE-${index}`,
    quantite: ligneParsee.quantite,
    prix_unitaire:
      ligneParsee.prix_unitaire_ht || ligneParsee.total_ligne_ht / ligneParsee.quantite,
    remise_appliquee: ligneParsee.remise_pourcent || 0,
    montant_ht: ligneParsee.total_ligne_ht,
  }));

  const facture: Facture = {
    id: 0,
    numero: factureParsee.numero,
    date: factureParsee.date,
    fournisseur_id: fournisseurId,
    grossiste_id: fournisseurId,
    montant_brut_ht: factureParsee.total_brut_ht,
    remises_ligne_a_ligne: factureParsee.total_remises_lignes,
    remises_pied_facture: factureParsee.remises_pied_facture || 0,
    net_a_payer: factureParsee.net_a_payer,
    statut_verification: 'non_verifie',
    created_at: new Date().toISOString(),
    lignes,
    fournisseur,
    grossiste: fournisseur,
  };

  return facture;
}
