/**
 * PharmaVerif - Logique métier de vérification des factures pharmaceutiques
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Ce fichier contient la logique de vérification des remises et détection d'anomalies.
 */

import { Facture, Anomalie, Grossiste, LigneFacture } from '../types';
import { db } from '../data/database';
import type { FactureParsee, LigneFactureParsee } from './fileParser';

/**
 * Fonction principale : vérifie une facture et détecte les anomalies
 *
 * @param facture - La facture à vérifier
 * @param grossiste - Le grossiste associé avec ses taux de remise
 * @returns Liste des anomalies détectées
 *
 * Logique de vérification :
 * 1. Calculer la remise totale attendue
 * 2. Calculer la remise réelle appliquée
 * 3. Comparer avec une tolérance de 5€
 * 4. Vérifier la cohérence du net à payer (tolérance 1€)
 */
export function verifyFacture(facture: Facture, grossiste: Grossiste): Anomalie[] {
  const anomalies: Anomalie[] = [];

  // 1. Calculer la remise totale attendue
  const tauxRemiseTotale =
    grossiste.remise_base + grossiste.cooperation_commerciale + grossiste.escompte;
  const remiseAttendue = facture.montant_brut_ht * (tauxRemiseTotale / 100);

  // 2. Calculer la remise réelle appliquée
  const remiseReelle = facture.remises_ligne_a_ligne + facture.remises_pied_facture;

  // 3. Comparer avec une tolérance de 5€
  const ecartRemise = remiseAttendue - remiseReelle;
  const TOLERANCE_REMISE = 5.0;

  if (Math.abs(ecartRemise) > TOLERANCE_REMISE) {
    if (ecartRemise > 0) {
      // Remise attendue > remise appliquée : remise manquante
      anomalies.push({
        id: Date.now() + Math.random(), // Sera remplacé lors de la sauvegarde
        facture_id: facture.id,
        type_anomalie: 'remise_manquante',
        description: `Remise totale insuffisante : ${remiseReelle.toFixed(2)}€ appliqués au lieu de ${remiseAttendue.toFixed(2)}€ attendus (${tauxRemiseTotale.toFixed(2)}% sur ${facture.montant_brut_ht.toFixed(2)}€ HT)`,
        montant_ecart: parseFloat(ecartRemise.toFixed(2)),
        created_at: new Date().toISOString(),
      });
    } else {
      // Remise appliquée > remise attendue : remise incorrecte (trop élevée, cas rare)
      anomalies.push({
        id: Date.now() + Math.random(),
        facture_id: facture.id,
        type_anomalie: 'remise_incorrecte',
        description: `Remise totale excessive : ${remiseReelle.toFixed(2)}€ appliqués alors que seulement ${remiseAttendue.toFixed(2)}€ attendus`,
        montant_ecart: parseFloat(Math.abs(ecartRemise).toFixed(2)),
        created_at: new Date().toISOString(),
      });
    }
  }

  // 4. Vérifier la cohérence du net à payer
  const netCalcule = facture.montant_brut_ht - remiseReelle;
  const ecartNetAPayer = Math.abs(netCalcule - facture.net_a_payer);
  const TOLERANCE_NET = 1.0;

  if (ecartNetAPayer > TOLERANCE_NET) {
    anomalies.push({
      id: Date.now() + Math.random() + 1,
      facture_id: facture.id,
      type_anomalie: 'ecart_calcul',
      description: `Écart de calcul sur le net à payer : ${facture.net_a_payer.toFixed(2)}€ facturés au lieu de ${netCalcule.toFixed(2)}€ calculés (Brut HT ${facture.montant_brut_ht.toFixed(2)}€ - Remises ${remiseReelle.toFixed(2)}€)`,
      montant_ecart: parseFloat(ecartNetAPayer.toFixed(2)),
      created_at: new Date().toISOString(),
    });
  }

  // Vérifications supplémentaires
  const anomaliesSupplementaires = verifierConditionsSpecifiques(facture, grossiste);
  anomalies.push(...anomaliesSupplementaires);

  return anomalies;
}

/**
 * Vérifications supplémentaires spécifiques
 * - Franco : frais de port quand montant > seuil
 * - Prix suspects sur lignes individuelles
 *
 * @param facture - La facture à vérifier
 * @param grossiste - Le grossiste associé
 * @returns Liste des anomalies spécifiques détectées
 */
function verifierConditionsSpecifiques(facture: Facture, grossiste: Grossiste): Anomalie[] {
  const anomalies: Anomalie[] = [];

  // Vérifier le franco (frais de port)
  // Détection déterministe : si le montant brut dépasse le franco mais que le net à payer
  // est supérieur au montant attendu (brut - remises), des frais de port sont probablement inclus
  if (facture.montant_brut_ht >= grossiste.franco) {
    const remiseReelle = facture.remises_ligne_a_ligne + facture.remises_pied_facture;
    const netAttendu = facture.montant_brut_ht - remiseReelle;
    const ecartNet = facture.net_a_payer - netAttendu;

    // Si le net à payer est supérieur au net calculé de plus de 5€, des frais de port sont suspects
    if (ecartNet > 5) {
      anomalies.push({
        id: Date.now() + 2,
        facture_id: facture.id,
        type_anomalie: 'franco_non_respecte',
        description: `Frais de port suspects (${ecartNet.toFixed(2)}€) alors que le franco de ${grossiste.franco.toFixed(2)}€ est dépassé (montant brut : ${facture.montant_brut_ht.toFixed(2)}€)`,
        montant_ecart: parseFloat(ecartNet.toFixed(2)),
        created_at: new Date().toISOString(),
      });
    }
  }

  // Vérifier les prix suspects sur les lignes individuelles
  if (facture.lignes && facture.lignes.length > 0) {
    facture.lignes.forEach((ligne) => {
      // Détecter si la remise ligne est anormalement faible
      if (ligne.remise_appliquee < grossiste.remise_base - 0.5) {
        const ecartLigne =
          ligne.prix_unitaire *
          ligne.quantite *
          ((grossiste.remise_base - ligne.remise_appliquee) / 100);

        if (ecartLigne > 10) {
          // Seuil de 10€ par ligne
          anomalies.push({
            id: Date.now() + Math.random() + 3,
            facture_id: facture.id,
            type_anomalie: 'prix_suspect',
            description: `Produit "${ligne.produit}" (CIP: ${ligne.cip}) : remise ligne ${ligne.remise_appliquee}% inférieure à la remise base ${grossiste.remise_base}% (écart: ${ecartLigne.toFixed(2)}€)`,
            montant_ecart: parseFloat(ecartLigne.toFixed(2)),
            created_at: new Date().toISOString(),
          });
        }
      }
    });
  }

  return anomalies;
}

/**
 * Calcule le potentiel d'économies sur une liste de factures
 *
 * @param factures - Liste des factures à analyser
 * @returns Montant total récupérable (somme des écarts détectés)
 */
export function calculateSavingsPotential(factures: Facture[]): number {
  let totalEconomies = 0;

  factures.forEach((facture) => {
    const grossiste = db.getGrossisteById(facture.grossiste_id);
    if (!grossiste) return;

    const anomalies = verifyFacture(facture, grossiste);
    const economieFacture = anomalies.reduce((sum, anomalie) => sum + anomalie.montant_ecart, 0);
    totalEconomies += economieFacture;
  });

  return parseFloat(totalEconomies.toFixed(2));
}

/**
 * Calcule les statistiques détaillées par type d'anomalie
 *
 * @param factures - Liste des factures à analyser
 * @returns Objet avec statistiques par type
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
  };

  factures.forEach((facture) => {
    const grossiste = db.getGrossisteById(facture.grossiste_id);
    if (!grossiste) return;

    const anomalies = verifyFacture(facture, grossiste);
    anomalies.forEach((anomalie) => {
      if (stats[anomalie.type_anomalie]) {
        stats[anomalie.type_anomalie].count++;
        stats[anomalie.type_anomalie].montantTotal += anomalie.montant_ecart;
      }
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
 * @param grossisteId - ID du grossiste (optionnel, aléatoire si non fourni)
 * @returns Facture générée avec données réalistes
 */
export function genererFactureAleatoire(grossisteId?: number): Facture {
  const grossiste = grossisteId
    ? db.getGrossisteById(grossisteId)
    : db.getAllGrossistes()[Math.floor(Math.random() * db.getAllGrossistes().length)];

  if (!grossiste) {
    throw new Error('Grossiste non trouvé');
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

    // Appliquer de façon variable la remise de base (70% respectent la remise, 30% ont une remise partielle)
    const respecteRemise = Math.random() < 0.7;
    const remiseAppliquee = respecteRemise
      ? grossiste.remise_base
      : grossiste.remise_base * (0.4 + Math.random() * 0.5); // 40-90% de la remise

    const montantHT = montantLigne * (1 - remiseAppliquee / 100);

    lignes.push({
      id: Date.now() + i,
      facture_id: 0, // sera mis à jour
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

  // Simuler l'application partielle ou totale des remises pied de facture
  const tauxRemisePiedFacture = grossiste.cooperation_commerciale + grossiste.escompte;
  const respecteRemisePied = Math.random() < 0.65; // 65% respectent, 35% ont des anomalies

  const remisesPiedFacture = respecteRemisePied
    ? montantBrutHT * (tauxRemisePiedFacture / 100)
    : montantBrutHT * (tauxRemisePiedFacture / 100) * (0.3 + Math.random() * 0.6); // 30-90% du montant attendu

  const netAPayer = montantBrutHT - remisesLigneALigne - remisesPiedFacture;

  return {
    id: 0, // sera assigné par la DB
    numero: `FAC2026-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
    date: new Date().toISOString().split('T')[0],
    grossiste_id: grossiste.id,
    montant_brut_ht: parseFloat(montantBrutHT.toFixed(2)),
    remises_ligne_a_ligne: parseFloat(remisesLigneALigne.toFixed(2)),
    remises_pied_facture: parseFloat(remisesPiedFacture.toFixed(2)),
    net_a_payer: parseFloat(netAPayer.toFixed(2)),
    statut_verification: 'non_verifie',
    created_at: new Date().toISOString(),
    lignes,
    grossiste,
  };
}

/**
 * Calculer les remises attendues selon les taux du grossiste
 *
 * @param facture - La facture à analyser
 * @param grossiste - Le grossiste avec ses taux
 * @returns Montant total des remises attendues
 */
export function calculerRemisesAttendues(facture: Facture, grossiste: Grossiste): number {
  const tauxTotal = grossiste.remise_base + grossiste.cooperation_commerciale + grossiste.escompte;
  const remisesAttendues = facture.montant_brut_ht * (tauxTotal / 100);
  return parseFloat(remisesAttendues.toFixed(2));
}

/**
 * Obtenir un résumé textuel de la conformité d'une facture
 *
 * @param facture - La facture à analyser
 * @param grossiste - Le grossiste associé
 * @returns Description textuelle du statut
 */
export function getFactureConformiteSummary(facture: Facture, grossiste: Grossiste): string {
  const anomalies = verifyFacture(facture, grossiste);

  if (anomalies.length === 0) {
    return 'Facture conforme : toutes les remises sont correctement appliquées.';
  }

  const montantTotal = anomalies.reduce((sum, a) => sum + a.montant_ecart, 0);
  return `${anomalies.length} anomalie(s) détectée(s) pour un montant de ${montantTotal.toFixed(2)}€ récupérable.`;
}

/**
 * NOUVELLE FONCTION : Convertir une facture parsée en objet Facture pour vérification
 *
 * @param factureParsee - Données extraites du fichier
 * @param grossisteId - ID du grossiste sélectionné
 * @returns Facture formatée pour vérification
 */
export function convertParsedToFacture(factureParsee: FactureParsee, grossisteId: number): Facture {
  const grossiste = db.getGrossisteById(grossisteId);

  if (!grossiste) {
    throw new Error(`Grossiste avec ID ${grossisteId} non trouvé`);
  }

  // Convertir les lignes parsées en lignes de facture
  const lignes: LigneFacture[] = factureParsee.lignes.map((ligneParsee, index) => ({
    id: Date.now() + index,
    facture_id: 0, // sera assigné après
    produit: ligneParsee.designation,
    cip: ligneParsee.code_produit || `CODE-${index}`,
    quantite: ligneParsee.quantite,
    prix_unitaire:
      ligneParsee.prix_unitaire_ht || ligneParsee.total_ligne_ht / ligneParsee.quantite,
    remise_appliquee: ligneParsee.remise_pourcent || 0,
    montant_ht: ligneParsee.total_ligne_ht,
  }));

  const facture: Facture = {
    id: 0, // sera assigné par la DB
    numero: factureParsee.numero,
    date: factureParsee.date,
    grossiste_id: grossisteId,
    montant_brut_ht: factureParsee.total_brut_ht,
    remises_ligne_a_ligne: factureParsee.total_remises_lignes,
    remises_pied_facture: factureParsee.remises_pied_facture || 0,
    net_a_payer: factureParsee.net_a_payer,
    statut_verification: 'non_verifie',
    created_at: new Date().toISOString(),
    lignes,
    grossiste,
  };

  return facture;
}
