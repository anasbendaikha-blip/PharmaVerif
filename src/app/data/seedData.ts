/**
 * seed_demo_data() - Crée des données de démonstration réalistes
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { db } from './database';
import { verifyFacture } from '../utils/verificationLogic';

/**
 * Crée 2 laboratoires et des conditions spécifiques exemples
 */
function seedFournisseursEtConditions(): void {
  console.log('   🏭 Création des laboratoires...');

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

  // Conditions spécifiques
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
}

/**
 * Crée 5 factures de démonstration avec des montants précis
 * et vérifie automatiquement chaque facture
 */
export function seedDemoData(): void {
  console.log('🌱 Création des données de démonstration...');

  // Créer laboratoires et conditions
  seedFournisseursEtConditions();

  // Récupérer les fournisseurs
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
