/**
 * seed_demo_data() - Crée des données de démonstration réalistes
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { db } from './database';
import { Fournisseur } from '../types';
import { verifyFacture } from '../utils/verificationLogic';

// ========================================
// SEED FOURNISSEURS & CONDITIONS
// ========================================

/**
 * Crée les laboratoires, grossistes supplémentaires et conditions spécifiques
 */
function seedFournisseursEtConditions(): void {
  console.log('   🏭 Création des laboratoires et fournisseurs...');

  // ==================== LABORATOIRES ====================

  // Sanofi : gamme + quantité + RFA
  const sanofi = db.createFournisseur({
    nom: 'Sanofi',
    type_fournisseur: 'laboratoire',
    remise_base: 0,
    cooperation_commerciale: 0,
    escompte: 0,
    franco: 0,
    remise_gamme_actif: true,
    remise_quantite_actif: true,
    rfa_actif: true,
    actif: true,
    notes: 'Laboratoire principal - gamme complète',
  });
  console.log(`      ✓ Sanofi créé (id=${sanofi.id})`);

  // Biogaran : gamme uniquement
  const biogaran = db.createFournisseur({
    nom: 'Biogaran',
    type_fournisseur: 'laboratoire',
    remise_base: 0,
    cooperation_commerciale: 0,
    escompte: 0,
    franco: 0,
    remise_gamme_actif: true,
    remise_quantite_actif: false,
    rfa_actif: false,
    actif: true,
    notes: 'Génériques - remise gamme uniquement',
  });
  console.log(`      ✓ Biogaran créé (id=${biogaran.id})`);

  // Arrow Génériques : gamme
  const arrow = db.createFournisseur({
    nom: 'Arrow Génériques',
    type_fournisseur: 'laboratoire',
    remise_base: 0,
    cooperation_commerciale: 0,
    escompte: 0,
    franco: 0,
    remise_gamme_actif: true,
    remise_quantite_actif: false,
    rfa_actif: false,
    actif: true,
    notes: 'Génériques Arrow - remise gamme',
  });
  console.log(`      ✓ Arrow Génériques créé (id=${arrow.id})`);

  // Teva Santé : quantité + RFA
  const teva = db.createFournisseur({
    nom: 'Teva Santé',
    type_fournisseur: 'laboratoire',
    remise_base: 0,
    cooperation_commerciale: 0,
    escompte: 0,
    franco: 0,
    remise_gamme_actif: false,
    remise_quantite_actif: true,
    rfa_actif: true,
    actif: true,
    notes: 'Génériques Teva - remise quantité + RFA',
  });
  console.log(`      ✓ Teva Santé créé (id=${teva.id})`);

  // ==================== GROSSISTE SUPPLEMENTAIRE ====================

  // Phoenix Pharma
  db.createFournisseur({
    nom: 'Phoenix Pharma',
    type_fournisseur: 'grossiste',
    remise_base: 2.8,
    cooperation_commerciale: 1.8,
    escompte: 0.3,
    franco: 1400.0,
    remise_gamme_actif: false,
    remise_quantite_actif: false,
    rfa_actif: false,
    actif: true,
    notes: 'Grossiste - répartiteur national',
  });
  console.log('      ✓ Phoenix Pharma créé');

  // ==================== CONDITIONS SPECIFIQUES ====================
  console.log('   📋 Création des conditions spécifiques...');

  // CERP Rouen : franco conditionnel à 3000€
  const cerp = db.getFournisseurByNom('CERP Rouen');
  if (cerp) {
    db.createCondition({
      fournisseur_id: cerp.id,
      type_condition: 'franco_seuil',
      nom: 'Franco conditionnel 3000€',
      description: 'Franco de port à partir de 3000€ HT de commande',
      parametres: { seuil_montant: 3000 },
      actif: true,
      date_debut: '2026-01-01',
    });
    console.log('      ✓ CERP Rouen : franco conditionnel 3000€');
  }

  // Phoenix Pharma : franco conditionnel à 2500€
  const phoenix = db.getFournisseurByNom('Phoenix Pharma');
  if (phoenix) {
    db.createCondition({
      fournisseur_id: phoenix.id,
      type_condition: 'franco_seuil',
      nom: 'Franco conditionnel 2500€',
      description: 'Franco de port à partir de 2500€ HT de commande',
      parametres: { seuil_montant: 2500 },
      actif: true,
      date_debut: '2025-01-01',
    });
    console.log('      ✓ Phoenix Pharma : franco conditionnel 2500€');
  }

  // Sanofi : remise volume (paliers)
  db.createCondition({
    fournisseur_id: sanofi.id,
    type_condition: 'remise_volume',
    nom: 'Remise volume Sanofi',
    description: 'Remise progressive par paliers de quantité',
    parametres: {
      seuils: [
        { min: 100, max: 499, taux: 5 },
        { min: 500, max: 999, taux: 8 },
        { min: 1000, taux: 12 },
      ],
    },
    actif: true,
    date_debut: '2026-01-01',
  });
  console.log('      ✓ Sanofi : remise volume (5/8/12%)');

  // Sanofi : RFA annuelle
  db.createCondition({
    fournisseur_id: sanofi.id,
    type_condition: 'rfa',
    nom: 'RFA annuelle Sanofi',
    description: 'Remise de fin d\'année sur objectif de CA',
    parametres: {
      objectif_annuel: 50000,
      taux_rfa: 2.5,
    },
    actif: true,
    date_debut: '2026-01-01',
    date_fin: '2026-12-31',
  });
  console.log('      ✓ Sanofi : RFA annuelle (objectif 50k€, 2.5%)');

  // Biogaran : remise gamme
  db.createCondition({
    fournisseur_id: biogaran.id,
    type_condition: 'remise_gamme',
    nom: 'Remise gamme Biogaran',
    description: 'Remise par gamme de produits génériques',
    parametres: {
      gammes: [
        { nom: 'Cardiovasculaire', taux: 4 },
        { nom: 'Anti-inflammatoire', taux: 3.5 },
        { nom: 'Antibiotiques', taux: 5 },
      ],
    },
    actif: true,
    date_debut: '2026-01-01',
  });
  console.log('      ✓ Biogaran : remise gamme (3 gammes)');

  // Arrow : remise gamme
  db.createCondition({
    fournisseur_id: arrow.id,
    type_condition: 'remise_gamme',
    nom: 'Remise gamme Arrow',
    description: 'Remise par gamme de produits génériques Arrow',
    parametres: {
      gammes: [
        { nom: 'Antalgiques', taux: 3 },
        { nom: 'Gastro-entérologie', taux: 4.5 },
      ],
    },
    actif: true,
    date_debut: '2025-01-01',
  });
  console.log('      ✓ Arrow : remise gamme (2 gammes)');

  // Teva : remise volume
  db.createCondition({
    fournisseur_id: teva.id,
    type_condition: 'remise_volume',
    nom: 'Remise volume Teva',
    description: 'Remise progressive par paliers de quantité',
    parametres: {
      seuils: [
        { min: 50, max: 299, taux: 3 },
        { min: 300, max: 599, taux: 6 },
        { min: 600, taux: 10 },
      ],
    },
    actif: true,
    date_debut: '2025-01-01',
  });
  console.log('      ✓ Teva : remise volume (3/6/10%)');

  // Teva : RFA annuelle
  db.createCondition({
    fournisseur_id: teva.id,
    type_condition: 'rfa',
    nom: 'RFA annuelle Teva',
    description: 'Remise de fin d\'année sur objectif de CA',
    parametres: {
      objectif_annuel: 30000,
      taux_rfa: 2.0,
    },
    actif: true,
    date_debut: '2025-01-01',
    date_fin: '2026-12-31',
  });
  console.log('      ✓ Teva : RFA annuelle (objectif 30k€, 2%)');
}

// ========================================
// HELPERS
// ========================================

type FactureType = 'conforme' | 'mineure' | 'critique';

interface FactureDef {
  fournisseurNom: string;
  prefix: string;
  type: FactureType;
  date: string;
  montantBrut: number;
}

/**
 * Charge un fournisseur avec ses conditions actives
 */
function loadFournisseurAvecConditions(nom: string): Fournisseur | undefined {
  const f = db.getFournisseurByNom(nom);
  if (f) {
    f.conditions_specifiques = db.getActiveConditions(f.id);
  }
  return f;
}

/**
 * Calcule les montants de remise et net à payer calibrés selon le type d'anomalie voulu.
 *
 * - conforme : remises exactes → verifyFacture() ne détecte rien
 * - mineure  : sous-remise 50-200€ → verifyFacture() détecte 'remise_manquante' (warning)
 * - critique : écart calcul 500-2000€ → verifyFacture() détecte 'ecart_calcul' (erreur)
 */
function calibrerMontants(
  fournisseur: Fournisseur,
  montantBrut: number,
  type: FactureType,
  seed: number,
): { remisesLigne: number; remisesPied: number; netAPayer: number } {
  const tauxRemiseBase = fournisseur.remise_base || 0;
  const tauxCoop = fournisseur.cooperation_commerciale || 0;
  const tauxEscompte = fournisseur.escompte || 0;

  let remisesLigne = montantBrut * (tauxRemiseBase / 100);
  const remisesPied = montantBrut * ((tauxCoop + tauxEscompte) / 100);

  if (type === 'mineure') {
    // Sous-remise déterministe basée sur le seed (50-200€)
    const ecart = 50 + (seed % 151); // 50 à 200
    remisesLigne = Math.max(0, remisesLigne - ecart);
  }

  let netAPayer = montantBrut - remisesLigne - remisesPied;

  if (type === 'critique') {
    // Écart calcul sur le net à payer (500-2000€)
    const ecart = 500 + (seed % 1501); // 500 à 2000
    netAPayer = netAPayer + ecart;
  }

  return {
    remisesLigne: parseFloat(remisesLigne.toFixed(2)),
    remisesPied: parseFloat(remisesPied.toFixed(2)),
    netAPayer: parseFloat(netAPayer.toFixed(2)),
  };
}

/**
 * Crée une facture, la vérifie et enregistre les anomalies
 */
function creerEtVerifierFacture(
  def: FactureDef,
  numero: string,
  fournisseur: Fournisseur,
  seed: number,
): void {
  const { remisesLigne, remisesPied, netAPayer } = calibrerMontants(
    fournisseur,
    def.montantBrut,
    def.type,
    seed,
  );

  const facture = db.createFacture({
    numero,
    date: def.date,
    fournisseur_id: fournisseur.id,
    montant_brut_ht: def.montantBrut,
    remises_ligne_a_ligne: remisesLigne,
    remises_pied_facture: remisesPied,
    net_a_payer: netAPayer,
    statut_verification: 'non_verifie',
  });

  const anomalies = verifyFacture(facture, fournisseur);
  anomalies.forEach((anomalie) => {
    db.createAnomalie({
      facture_id: facture.id,
      type_anomalie: anomalie.type_anomalie,
      description: anomalie.description,
      montant_ecart: anomalie.montant_ecart,
      niveau_severite: anomalie.niveau_severite || 'warning',
    });
  });

  const statut = anomalies.length > 0 ? 'anomalie' : 'conforme';
  db.updateFacture(facture.id, { statut_verification: statut });
}

// ========================================
// 50 FACTURES REALISTES
// ========================================

/**
 * Génère 50 factures avec distribution réaliste :
 * - 60% conformes (30)
 * - 30% anomalies mineures 50-200€ (15)
 * - 10% critiques 500-2000€ (5)
 * - 8 fournisseurs variés
 * - Dates sur 3 mois (déc 2025, jan 2026, fev 2026)
 */
function seedFacturesRealistes(): void {
  console.log('   📄 Génération de 50 factures réalistes...');

  // Charger les fournisseurs avec leurs conditions
  const fournisseurs: Record<string, Fournisseur> = {};
  const noms = [
    'CERP Rouen', 'OCP', 'Alliance Healthcare', 'Phoenix Pharma',
    'Sanofi', 'Biogaran', 'Arrow Génériques', 'Teva Santé',
  ];
  for (const nom of noms) {
    const f = loadFournisseurAvecConditions(nom);
    if (f) fournisseurs[nom] = f;
  }

  // Définition des 50 factures
  // Format: [fournisseurNom, prefix, type, date, montantBrut]
  const defs: Array<[string, string, FactureType, string, number]> = [
    // ====== DÉCEMBRE 2025 (15 factures) ======
    // CERP Rouen (3) — 2 conformes, 1 mineure
    ['CERP Rouen',         'CERP', 'conforme', '2025-12-03',  7850],
    ['CERP Rouen',         'CERP', 'conforme', '2025-12-11', 11200],
    ['CERP Rouen',         'CERP', 'mineure',  '2025-12-19',  9400],
    // OCP (3) — 2 conformes, 1 critique
    ['OCP',                'OCP',  'conforme', '2025-12-02',  6320],
    ['OCP',                'OCP',  'conforme', '2025-12-15', 14500],
    ['OCP',                'OCP',  'critique', '2025-12-22', 18200],
    // Alliance (2) — 1 conforme, 1 mineure
    ['Alliance Healthcare','ALL',  'conforme', '2025-12-05', 8900],
    ['Alliance Healthcare','ALL',  'mineure',  '2025-12-18', 5670],
    // Phoenix (2) — 1 conforme, 1 mineure
    ['Phoenix Pharma',     'PHX',  'conforme', '2025-12-08', 4350],
    ['Phoenix Pharma',     'PHX',  'mineure',  '2025-12-20', 7800],
    // Sanofi (2) — 1 conforme, 1 mineure
    ['Sanofi',             'SAN',  'conforme', '2025-12-10', 3200],
    ['Sanofi',             'SAN',  'mineure',  '2025-12-23', 5800],
    // Biogaran (1) — conforme
    ['Biogaran',           'BIO',  'conforme', '2025-12-12', 2400],
    // Arrow (1) — conforme
    ['Arrow Génériques',   'ARR',  'conforme', '2025-12-16', 1800],
    // Teva (1) — conforme
    ['Teva Santé',         'TEV',  'conforme', '2025-12-09', 2100],

    // ====== JANVIER 2026 (18 factures) ======
    // CERP Rouen (4) — 2 conformes, 1 mineure, 1 critique
    ['CERP Rouen',         'CERP', 'conforme', '2026-01-06', 6480],
    ['CERP Rouen',         'CERP', 'conforme', '2026-01-14', 9850],
    ['CERP Rouen',         'CERP', 'mineure',  '2026-01-21', 13200],
    ['CERP Rouen',         'CERP', 'critique', '2026-01-28', 16400],
    // OCP (4) — 2 conformes, 1 mineure, 1 critique
    ['OCP',                'OCP',  'conforme', '2026-01-03', 8750],
    ['OCP',                'OCP',  'conforme', '2026-01-12', 5200],
    ['OCP',                'OCP',  'mineure',  '2026-01-19', 11300],
    ['OCP',                'OCP',  'critique', '2026-01-27', 22000],
    // Alliance (3) — 2 conformes, 1 mineure
    ['Alliance Healthcare','ALL',  'conforme', '2026-01-07', 7200],
    ['Alliance Healthcare','ALL',  'conforme', '2026-01-17', 10400],
    ['Alliance Healthcare','ALL',  'mineure',  '2026-01-24', 6300],
    // Phoenix (2) — 1 conforme, 1 mineure
    ['Phoenix Pharma',     'PHX',  'conforme', '2026-01-09', 5100],
    ['Phoenix Pharma',     'PHX',  'mineure',  '2026-01-22', 8600],
    // Sanofi (2) — 1 conforme, 1 mineure
    ['Sanofi',             'SAN',  'conforme', '2026-01-11', 4500],
    ['Sanofi',             'SAN',  'mineure',  '2026-01-25', 7200],
    // Biogaran (2) — 1 conforme, 1 mineure
    ['Biogaran',           'BIO',  'conforme', '2026-01-08', 3100],
    ['Biogaran',           'BIO',  'mineure',  '2026-01-20', 4800],
    // Arrow (0 en janvier)
    // Teva (1) — conforme
    ['Teva Santé',         'TEV',  'conforme', '2026-01-16', 2800],

    // ====== FÉVRIER 2026 (17 factures) ======
    // CERP Rouen (3) — 2 conformes, 1 mineure
    ['CERP Rouen',         'CERP', 'conforme', '2026-02-04', 8300],
    ['CERP Rouen',         'CERP', 'conforme', '2026-02-13', 12600],
    ['CERP Rouen',         'CERP', 'mineure',  '2026-02-20', 10100],
    // OCP (3) — 2 conformes, 1 critique
    ['OCP',                'OCP',  'conforme', '2026-02-03', 7650],
    ['OCP',                'OCP',  'conforme', '2026-02-11', 9200],
    ['OCP',                'OCP',  'critique', '2026-02-19', 19800],
    // Alliance (3) — 2 conformes, 1 mineure
    ['Alliance Healthcare','ALL',  'conforme', '2026-02-06', 6100],
    ['Alliance Healthcare','ALL',  'conforme', '2026-02-14', 11800],
    ['Alliance Healthcare','ALL',  'mineure',  '2026-02-21', 7400],
    // Phoenix (3) — 2 conformes, 1 mineure
    ['Phoenix Pharma',     'PHX',  'conforme', '2026-02-05', 5800],
    ['Phoenix Pharma',     'PHX',  'conforme', '2026-02-12', 9500],
    ['Phoenix Pharma',     'PHX',  'mineure',  '2026-02-24', 6700],
    // Sanofi (1) — conforme
    ['Sanofi',             'SAN',  'conforme', '2026-02-10', 3900],
    // Biogaran (2) — 1 conforme, 1 mineure
    ['Biogaran',           'BIO',  'conforme', '2026-02-07', 2900],
    ['Biogaran',           'BIO',  'mineure',  '2026-02-18', 4200],
    // Arrow (1) — conforme
    ['Arrow Génériques',   'ARR',  'conforme', '2026-02-15', 2200],
    // Teva (1) — conforme
    ['Teva Santé',         'TEV',  'conforme', '2026-02-09', 3400],
  ];

  // Compteur par préfixe pour les numéros de facture
  const compteur: Record<string, number> = {};

  let totalConformes = 0;
  let totalAnomalies = 0;
  let totalCritiques = 0;

  for (let i = 0; i < defs.length; i++) {
    const [fournisseurNom, prefix, type, date, montantBrut] = defs[i];
    const fournisseur = fournisseurs[fournisseurNom];
    if (!fournisseur) {
      console.warn(`      ⚠ Fournisseur "${fournisseurNom}" non trouvé, skip`);
      continue;
    }

    compteur[prefix] = (compteur[prefix] || 0) + 1;
    const numero = `FAC-${prefix}-2026-${String(compteur[prefix]).padStart(3, '0')}`;

    creerEtVerifierFacture(
      { fournisseurNom, prefix, type, date, montantBrut },
      numero,
      fournisseur,
      i * 37 + 17, // Seed déterministe pour des écarts variés mais reproductibles
    );

    if (type === 'conforme') totalConformes++;
    else if (type === 'mineure') totalAnomalies++;
    else totalCritiques++;
  }

  console.log(`      ✓ ${defs.length} factures créées : ${totalConformes} conformes, ${totalAnomalies} anomalies mineures, ${totalCritiques} critiques`);
}

// ========================================
// SEED DEMO DATA (MAIN ENTRY)
// ========================================

/**
 * Crée les données de démonstration complètes :
 * - 8 fournisseurs (4 grossistes + 4 labos) avec conditions
 * - 5 factures legacy + 50 factures réalistes
 * - Anomalies auto-détectées par verifyFacture()
 */
export function seedDemoData(): void {
  console.log('🌱 Création des données de démonstration...');

  // Créer laboratoires, fournisseurs et conditions
  seedFournisseursEtConditions();

  // Récupérer les fournisseurs de base
  const cerpRouen = db.getFournisseurByNom('CERP Rouen');
  const ocp = db.getFournisseurByNom('OCP');
  const alliance = db.getFournisseurByNom('Alliance Healthcare');

  if (!cerpRouen || !ocp || !alliance) {
    console.error("❌ Erreur: Fournisseurs non trouvés. Initialiser la DB d'abord.");
    return;
  }

  // ==================== FACTURE 1 - CERP Rouen - CONFORME ====================
  console.log('   📄 Création Facture 1: FAC-CERP-001 (CONFORME)');
  const facture1 = db.createFacture({
    numero: 'FAC-CERP-001',
    date: '2026-01-15',
    fournisseur_id: cerpRouen.id,
    montant_brut_ht: 5230.0,
    remises_ligne_a_ligne: 157.0,
    remises_pied_facture: 131.0,
    net_a_payer: 4942.0,
    statut_verification: 'non_verifie',
  });

  // Vérifier la facture
  const anomalies1 = verifyFacture(facture1, cerpRouen);
  anomalies1.forEach((anomalie) => {
    db.createAnomalie({
      facture_id: facture1.id,
      type_anomalie: anomalie.type_anomalie,
      description: anomalie.description,
      montant_ecart: anomalie.montant_ecart,
      niveau_severite: anomalie.niveau_severite || 'warning',
    });
  });
  const statut1 = anomalies1.length > 0 ? 'anomalie' : 'conforme';
  db.updateFacture(facture1.id, { statut_verification: statut1 });
  console.log(`      ✓ Statut: ${statut1} - ${anomalies1.length} anomalie(s)`);

  // ==================== FACTURE 2 - CERP Rouen - ANOMALIE ====================
  console.log('   📄 Création Facture 2: FAC-CERP-002 (ANOMALIE ~127€)');
  const facture2 = db.createFacture({
    numero: 'FAC-CERP-002',
    date: '2026-01-22',
    fournisseur_id: cerpRouen.id,
    montant_brut_ht: 8450.0,
    remises_ligne_a_ligne: 245.0,
    remises_pied_facture: 125.0,
    net_a_payer: 8080.0,
    statut_verification: 'non_verifie',
  });

  const anomalies2 = verifyFacture(facture2, cerpRouen);
  anomalies2.forEach((anomalie) => {
    db.createAnomalie({
      facture_id: facture2.id,
      type_anomalie: anomalie.type_anomalie,
      description: anomalie.description,
      montant_ecart: anomalie.montant_ecart,
      niveau_severite: anomalie.niveau_severite || 'warning',
    });
  });
  const statut2 = anomalies2.length > 0 ? 'anomalie' : 'conforme';
  db.updateFacture(facture2.id, { statut_verification: statut2 });
  const montantAnomalie2 = anomalies2.reduce((sum, a) => sum + a.montant_ecart, 0);
  console.log(
    `      ✓ Statut: ${statut2} - ${anomalies2.length} anomalie(s) - ${montantAnomalie2.toFixed(2)}€ récupérable`
  );

  // ==================== FACTURE 3 - OCP - ANOMALIE ====================
  console.log('   📄 Création Facture 3: FAC-OCP-001 (ANOMALIE ~123€)');
  const facture3 = db.createFacture({
    numero: 'FAC-OCP-001',
    date: '2026-02-01',
    fournisseur_id: ocp.id,
    montant_brut_ht: 12300.0,
    remises_ligne_a_ligne: 308.0,
    remises_pied_facture: 246.0,
    net_a_payer: 11746.0,
    statut_verification: 'non_verifie',
  });

  const anomalies3 = verifyFacture(facture3, ocp);
  anomalies3.forEach((anomalie) => {
    db.createAnomalie({
      facture_id: facture3.id,
      type_anomalie: anomalie.type_anomalie,
      description: anomalie.description,
      montant_ecart: anomalie.montant_ecart,
      niveau_severite: anomalie.niveau_severite || 'warning',
    });
  });
  const statut3 = anomalies3.length > 0 ? 'anomalie' : 'conforme';
  db.updateFacture(facture3.id, { statut_verification: statut3 });
  const montantAnomalie3 = anomalies3.reduce((sum, a) => sum + a.montant_ecart, 0);
  console.log(
    `      ✓ Statut: ${statut3} - ${anomalies3.length} anomalie(s) - ${montantAnomalie3.toFixed(2)}€ récupérable`
  );

  // ==================== FACTURE 4 - Alliance Healthcare - CONFORME ====================
  console.log('   📄 Création Facture 4: FAC-ALL-001 (CONFORME)');
  const facture4 = db.createFacture({
    numero: 'FAC-ALL-001',
    date: '2026-02-05',
    fournisseur_id: alliance.id,
    montant_brut_ht: 6780.0,
    remises_ligne_a_ligne: 237.0,
    remises_pied_facture: 102.0,
    net_a_payer: 6441.0,
    statut_verification: 'non_verifie',
  });

  const anomalies4 = verifyFacture(facture4, alliance);
  anomalies4.forEach((anomalie) => {
    db.createAnomalie({
      facture_id: facture4.id,
      type_anomalie: anomalie.type_anomalie,
      description: anomalie.description,
      montant_ecart: anomalie.montant_ecart,
      niveau_severite: anomalie.niveau_severite || 'warning',
    });
  });
  const statut4 = anomalies4.length > 0 ? 'anomalie' : 'conforme';
  db.updateFacture(facture4.id, { statut_verification: statut4 });
  console.log(`      ✓ Statut: ${statut4} - ${anomalies4.length} anomalie(s)`);

  // ==================== FACTURE 5 - OCP - ANOMALIE ====================
  console.log('   📄 Création Facture 5: FAC-OCP-002 (ANOMALIE ~46€)');
  const facture5 = db.createFacture({
    numero: 'FAC-OCP-002',
    date: '2026-02-08',
    fournisseur_id: ocp.id,
    montant_brut_ht: 4560.0,
    remises_ligne_a_ligne: 114.0,
    remises_pied_facture: 91.0,
    net_a_payer: 4355.0,
    statut_verification: 'non_verifie',
  });

  const anomalies5 = verifyFacture(facture5, ocp);
  anomalies5.forEach((anomalie) => {
    db.createAnomalie({
      facture_id: facture5.id,
      type_anomalie: anomalie.type_anomalie,
      description: anomalie.description,
      montant_ecart: anomalie.montant_ecart,
      niveau_severite: anomalie.niveau_severite || 'warning',
    });
  });
  const statut5 = anomalies5.length > 0 ? 'anomalie' : 'conforme';
  db.updateFacture(facture5.id, { statut_verification: statut5 });
  const montantAnomalie5 = anomalies5.reduce((sum, a) => sum + a.montant_ecart, 0);
  console.log(
    `      ✓ Statut: ${statut5} - ${anomalies5.length} anomalie(s) - ${montantAnomalie5.toFixed(2)}€ récupérable`
  );

  // ==================== 50 FACTURES REALISTES ====================
  seedFacturesRealistes();

  // ==================== RÉSUMÉ ====================
  const stats = db.getStats();
  console.log('');
  console.log('✅ Données de démonstration créées avec succès!');
  console.log(`   📊 ${stats.totalFactures} factures créées`);
  console.log(`   ⚠️  ${stats.anomaliesDetectees} anomalies détectées`);
  console.log(`   💰 ${stats.montantRecuperable.toFixed(2)}€ d'économies potentielles`);
  console.log(`   ✓  ${stats.tauxConformite.toFixed(1)}% de taux de conformité`);
  console.log(`   🏭 ${db.getAllFournisseurs().length} fournisseurs (${db.getAllGrossistes().length} grossistes + ${db.getFournisseursByType('laboratoire').length} labos)`);
  console.log('');
}

/**
 * Vérifie si la base de données contient déjà des factures
 * @returns true si la DB est vide, false sinon
 */
export function isDatabaseEmpty(): boolean {
  return db.getAllFactures().length === 0;
}
