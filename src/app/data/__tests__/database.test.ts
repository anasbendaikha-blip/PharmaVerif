import { describe, it, expect, beforeEach } from 'vitest';

// We need to re-import the database module for each test
// Since the db is a singleton, we need to use resetDb()
import { db } from '../database';

describe('PersistentDatabase', () => {
  beforeEach(() => {
    // Reset la base de données avant chaque test
    db.resetDb();
  });

  describe('Grossistes', () => {
    it('initialise avec 3 grossistes par défaut', () => {
      const grossistes = db.getAllGrossistes();
      expect(grossistes).toHaveLength(3);
    });

    it('les grossistes par défaut ont les bons noms', () => {
      const grossistes = db.getAllGrossistes();
      const noms = grossistes.map((g) => g.nom);
      expect(noms).toContain('CERP Rouen');
      expect(noms).toContain('OCP');
      expect(noms).toContain('Alliance Healthcare');
    });

    it('crée un nouveau grossiste', () => {
      const nouveau = db.createGrossiste({
        nom: 'Phoenix',
        remise_base: 4.0,
        cooperation_commerciale: 1.0,
        escompte: 0.5,
        franco: 2000,
      });

      expect(nouveau.id).toBeDefined();
      expect(nouveau.nom).toBe('Phoenix');
      expect(db.getAllGrossistes()).toHaveLength(4);
    });

    it('trouve un grossiste par ID', () => {
      const grossistes = db.getAllGrossistes();
      const found = db.getGrossisteById(grossistes[0].id);
      expect(found).toBeDefined();
      expect(found!.nom).toBe(grossistes[0].nom);
    });

    it('trouve un grossiste par nom', () => {
      const found = db.getGrossisteByNom('OCP');
      expect(found).toBeDefined();
      expect(found!.nom).toBe('OCP');
    });

    it('retourne undefined pour un ID inexistant', () => {
      expect(db.getGrossisteById(999)).toBeUndefined();
    });

    it('met à jour un grossiste', () => {
      const grossistes = db.getAllGrossistes();
      const updated = db.updateGrossiste(grossistes[0].id, { remise_base: 5.0 });
      expect(updated).not.toBeNull();
      expect(updated!.remise_base).toBe(5.0);
    });

    it("retourne null pour la mise à jour d'un grossiste inexistant", () => {
      expect(db.updateGrossiste(999, { remise_base: 5.0 })).toBeNull();
    });

    it('supprime un grossiste', () => {
      const grossistes = db.getAllGrossistes();
      const deleted = db.deleteGrossiste(grossistes[0].id);
      expect(deleted).toBe(true);
      expect(db.getAllGrossistes()).toHaveLength(2);
    });

    it("retourne false pour la suppression d'un grossiste inexistant", () => {
      expect(db.deleteGrossiste(999)).toBe(false);
    });
  });

  describe('Factures', () => {
    it('crée une facture', () => {
      const grossistes = db.getAllGrossistes();
      const facture = db.createFacture({
        numero: 'FAC-TEST-001',
        date: '2026-01-15',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 5000,
        remises_ligne_a_ligne: 150,
        remises_pied_facture: 100,
        net_a_payer: 4750,
        statut_verification: 'non_verifie',
      });

      expect(facture.id).toBeDefined();
      expect(facture.numero).toBe('FAC-TEST-001');
      expect(facture.created_at).toBeDefined();
    });

    it('enrichit la facture avec le grossiste', () => {
      const grossistes = db.getAllGrossistes();
      db.createFacture({
        numero: 'FAC-TEST-002',
        date: '2026-01-15',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 5000,
        remises_ligne_a_ligne: 150,
        remises_pied_facture: 100,
        net_a_payer: 4750,
        statut_verification: 'non_verifie',
      });

      const factures = db.getAllFactures();
      expect(factures[0].grossiste).toBeDefined();
      expect(factures[0].grossiste!.nom).toBe(grossistes[0].nom);
    });

    it('filtre les factures par grossiste', () => {
      const grossistes = db.getAllGrossistes();
      db.createFacture({
        numero: 'FAC-A',
        date: '2026-01-15',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 5000,
        remises_ligne_a_ligne: 150,
        remises_pied_facture: 100,
        net_a_payer: 4750,
        statut_verification: 'non_verifie',
      });
      db.createFacture({
        numero: 'FAC-B',
        date: '2026-01-16',
        grossiste_id: grossistes[1].id,
        montant_brut_ht: 3000,
        remises_ligne_a_ligne: 90,
        remises_pied_facture: 60,
        net_a_payer: 2850,
        statut_verification: 'conforme',
      });

      const facturesG1 = db.getFacturesByGrossiste(grossistes[0].id);
      expect(facturesG1).toHaveLength(1);
      expect(facturesG1[0].numero).toBe('FAC-A');
    });

    it('filtre les factures par statut', () => {
      const grossistes = db.getAllGrossistes();
      db.createFacture({
        numero: 'FAC-CONF',
        date: '2026-01-15',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 5000,
        remises_ligne_a_ligne: 150,
        remises_pied_facture: 100,
        net_a_payer: 4750,
        statut_verification: 'conforme',
      });

      const conformes = db.getFacturesByStatut('conforme');
      expect(conformes).toHaveLength(1);
    });

    it('supprime une facture avec cascade (anomalies + lignes)', () => {
      const grossistes = db.getAllGrossistes();
      const facture = db.createFacture({
        numero: 'FAC-DEL',
        date: '2026-01-15',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 5000,
        remises_ligne_a_ligne: 150,
        remises_pied_facture: 100,
        net_a_payer: 4750,
        statut_verification: 'anomalie',
      });

      // Ajouter une ligne et une anomalie
      db.createLigneFacture({
        facture_id: facture.id,
        produit: 'Test',
        cip: '123',
        quantite: 10,
        prix_unitaire: 5,
        remise_appliquee: 3,
        montant_ht: 48.5,
      });

      db.createAnomalie({
        facture_id: facture.id,
        type_anomalie: 'remise_manquante',
        description: 'Test anomalie',
        montant_ecart: 50,
      });

      // Supprimer la facture
      const deleted = db.deleteFacture(facture.id);
      expect(deleted).toBe(true);
      expect(db.getAllFactures()).toHaveLength(0);
      expect(db.getLignesByFactureId(facture.id)).toHaveLength(0);
      expect(db.getAnomaliesByFacture(facture.id)).toHaveLength(0);
    });
  });

  describe('Anomalies', () => {
    it('crée une anomalie', () => {
      const grossistes = db.getAllGrossistes();
      const facture = db.createFacture({
        numero: 'FAC-ANO',
        date: '2026-01-15',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 5000,
        remises_ligne_a_ligne: 100,
        remises_pied_facture: 50,
        net_a_payer: 4850,
        statut_verification: 'anomalie',
      });

      const anomalie = db.createAnomalie({
        facture_id: facture.id,
        type_anomalie: 'remise_manquante',
        description: 'Remise insuffisante',
        montant_ecart: 125.5,
      });

      expect(anomalie.id).toBeDefined();
      expect(anomalie.created_at).toBeDefined();
      expect(anomalie.montant_ecart).toBe(125.5);
    });

    it('filtre les anomalies par type', () => {
      const grossistes = db.getAllGrossistes();
      const facture = db.createFacture({
        numero: 'FAC-TYPES',
        date: '2026-01-15',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 5000,
        remises_ligne_a_ligne: 100,
        remises_pied_facture: 50,
        net_a_payer: 4850,
        statut_verification: 'anomalie',
      });

      db.createAnomalie({
        facture_id: facture.id,
        type_anomalie: 'remise_manquante',
        description: 'Test 1',
        montant_ecart: 50,
      });
      db.createAnomalie({
        facture_id: facture.id,
        type_anomalie: 'ecart_calcul',
        description: 'Test 2',
        montant_ecart: 30,
      });

      const remiseManquantes = db.getAnomaliesByType('remise_manquante');
      expect(remiseManquantes).toHaveLength(1);
    });

    it('supprime les anomalies par facture', () => {
      const grossistes = db.getAllGrossistes();
      const facture = db.createFacture({
        numero: 'FAC-DEL-ANO',
        date: '2026-01-15',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 5000,
        remises_ligne_a_ligne: 100,
        remises_pied_facture: 50,
        net_a_payer: 4850,
        statut_verification: 'anomalie',
      });

      db.createAnomalie({
        facture_id: facture.id,
        type_anomalie: 'remise_manquante',
        description: 'A supprimer 1',
        montant_ecart: 50,
      });
      db.createAnomalie({
        facture_id: facture.id,
        type_anomalie: 'ecart_calcul',
        description: 'A supprimer 2',
        montant_ecart: 30,
      });

      const count = db.deleteAnomaliesByFacture(facture.id);
      expect(count).toBe(2);
      expect(db.getAnomaliesByFacture(facture.id)).toHaveLength(0);
    });
  });

  describe('Stats', () => {
    it('calcule les stats sur une base vide', () => {
      const stats = db.getStats();
      expect(stats.totalFactures).toBe(0);
      expect(stats.anomaliesDetectees).toBe(0);
      expect(stats.montantRecuperable).toBe(0);
      expect(stats.tauxConformite).toBe(0);
    });

    it('calcule le taux de conformité', () => {
      const grossistes = db.getAllGrossistes();

      db.createFacture({
        numero: 'FAC-CONF',
        date: '2026-01-15',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 5000,
        remises_ligne_a_ligne: 150,
        remises_pied_facture: 100,
        net_a_payer: 4750,
        statut_verification: 'conforme',
      });

      db.createFacture({
        numero: 'FAC-ANO',
        date: '2026-01-16',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 3000,
        remises_ligne_a_ligne: 50,
        remises_pied_facture: 30,
        net_a_payer: 2920,
        statut_verification: 'anomalie',
      });

      const stats = db.getStats();
      expect(stats.totalFactures).toBe(2);
      expect(stats.tauxConformite).toBe(50.0); // 1/2 = 50%
    });

    it('calcule le montant récupérable', () => {
      const grossistes = db.getAllGrossistes();
      const facture = db.createFacture({
        numero: 'FAC-RECUP',
        date: '2026-01-15',
        grossiste_id: grossistes[0].id,
        montant_brut_ht: 5000,
        remises_ligne_a_ligne: 100,
        remises_pied_facture: 50,
        net_a_payer: 4850,
        statut_verification: 'anomalie',
      });

      db.createAnomalie({
        facture_id: facture.id,
        type_anomalie: 'remise_manquante',
        description: 'Test',
        montant_ecart: 125.5,
      });
      db.createAnomalie({
        facture_id: facture.id,
        type_anomalie: 'ecart_calcul',
        description: 'Test 2',
        montant_ecart: 30.25,
      });

      const stats = db.getStats();
      expect(stats.montantRecuperable).toBe(155.75);
    });
  });
});
