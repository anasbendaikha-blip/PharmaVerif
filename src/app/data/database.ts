/**
 * PharmaVerif - Base de données avec persistance localStorage
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Les données sont sauvegardées automatiquement dans localStorage
 * pour survivre aux rechargements de page.
 */

import {
  Fournisseur,
  Grossiste,
  ConditionSpecifique,
  Facture,
  Anomalie,
  LigneFacture,
  TypeFournisseur,
} from '../types';

const STORAGE_KEYS = {
  // V1 (legacy)
  grossistes: 'pharmaverif_grossistes',
  // V2
  fournisseurs: 'pharmaverif_fournisseurs',
  conditions: 'pharmaverif_conditions',
  factures: 'pharmaverif_factures',
  anomalies: 'pharmaverif_anomalies',
  lignes: 'pharmaverif_lignes',
  counters: 'pharmaverif_counters',
  initialized: 'pharmaverif_initialized',
  schema_version: 'pharmaverif_schema_version',
};

const CURRENT_SCHEMA_VERSION = 2;

class PersistentDatabase {
  private fournisseurs: Fournisseur[] = [];
  private conditions: ConditionSpecifique[] = [];
  private factures: Facture[] = [];
  private anomalies: Anomalie[] = [];
  private lignesFactures: LigneFacture[] = [];

  private nextFournisseurId = 1;
  private nextConditionId = 1;
  private nextFactureId = 1;
  private nextAnomalieId = 1;
  private nextLigneId = 1;

  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  // ==================== PERSISTANCE ====================

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.fournisseurs, JSON.stringify(this.fournisseurs));
      localStorage.setItem(STORAGE_KEYS.conditions, JSON.stringify(this.conditions));
      localStorage.setItem(STORAGE_KEYS.factures, JSON.stringify(this.factures));
      localStorage.setItem(STORAGE_KEYS.anomalies, JSON.stringify(this.anomalies));
      localStorage.setItem(STORAGE_KEYS.lignes, JSON.stringify(this.lignesFactures));
      localStorage.setItem(
        STORAGE_KEYS.counters,
        JSON.stringify({
          fournisseur: this.nextFournisseurId,
          condition: this.nextConditionId,
          facture: this.nextFactureId,
          anomalie: this.nextAnomalieId,
          ligne: this.nextLigneId,
        })
      );
      localStorage.setItem(STORAGE_KEYS.initialized, 'true');
      localStorage.setItem(STORAGE_KEYS.schema_version, String(CURRENT_SCHEMA_VERSION));
    } catch (e) {
      console.warn('Impossible de sauvegarder dans localStorage:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const wasInitialized = localStorage.getItem(STORAGE_KEYS.initialized) === 'true';
      if (!wasInitialized) return;

      const schemaVersion = parseInt(localStorage.getItem(STORAGE_KEYS.schema_version) || '0');

      // Migration V1 → V2
      if (schemaVersion < 2) {
        this.migrateFromV1();
        return;
      }

      // V2 load
      const fournisseurs = localStorage.getItem(STORAGE_KEYS.fournisseurs);
      const conditions = localStorage.getItem(STORAGE_KEYS.conditions);
      const factures = localStorage.getItem(STORAGE_KEYS.factures);
      const anomalies = localStorage.getItem(STORAGE_KEYS.anomalies);
      const lignes = localStorage.getItem(STORAGE_KEYS.lignes);
      const counters = localStorage.getItem(STORAGE_KEYS.counters);

      if (fournisseurs) this.fournisseurs = JSON.parse(fournisseurs);
      if (conditions) this.conditions = JSON.parse(conditions);
      if (factures) this.factures = JSON.parse(factures);
      if (anomalies) this.anomalies = JSON.parse(anomalies);
      if (lignes) this.lignesFactures = JSON.parse(lignes);
      if (counters) {
        const c = JSON.parse(counters);
        this.nextFournisseurId = c.fournisseur || c.grossiste || 1;
        this.nextConditionId = c.condition || 1;
        this.nextFactureId = c.facture || 1;
        this.nextAnomalieId = c.anomalie || 1;
        this.nextLigneId = c.ligne || 1;
      }

      this.initialized = true;
    } catch (e) {
      console.warn('Impossible de charger depuis localStorage:', e);
    }
  }

  private migrateFromV1(): void {
    try {
      const now = new Date().toISOString();

      // Load V1 grossistes
      const oldGrossistesRaw = localStorage.getItem(STORAGE_KEYS.grossistes);
      if (oldGrossistesRaw) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oldGrossistes: any[] = JSON.parse(oldGrossistesRaw);
        this.fournisseurs = oldGrossistes.map((g) => ({
          id: g.id,
          nom: g.nom,
          type_fournisseur: 'grossiste' as TypeFournisseur,
          remise_base: g.remise_base || 0,
          cooperation_commerciale: g.cooperation_commerciale || 0,
          escompte: g.escompte || 0,
          franco: g.franco || 0,
          remise_gamme_actif: false,
          remise_quantite_actif: false,
          rfa_actif: false,
          actif: true,
          notes: '',
          created_at: now,
          updated_at: now,
        }));
        this.nextFournisseurId = Math.max(...this.fournisseurs.map((f) => f.id), 0) + 1;
      }

      // Load V1 factures and migrate grossiste_id → fournisseur_id
      const facturesRaw = localStorage.getItem(STORAGE_KEYS.factures);
      if (facturesRaw) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.factures = JSON.parse(facturesRaw).map((f: any) => ({
          ...f,
          fournisseur_id: f.fournisseur_id || f.grossiste_id,
        }));
      }

      // Load V1 anomalies and add niveau_severite
      const anomaliesRaw = localStorage.getItem(STORAGE_KEYS.anomalies);
      if (anomaliesRaw) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.anomalies = JSON.parse(anomaliesRaw).map((a: any) => ({
          ...a,
          niveau_severite: a.niveau_severite || 'warning',
        }));
      }

      // Load V1 lignes
      const lignesRaw = localStorage.getItem(STORAGE_KEYS.lignes);
      if (lignesRaw) this.lignesFactures = JSON.parse(lignesRaw);

      // Load V1 counters
      const countersRaw = localStorage.getItem(STORAGE_KEYS.counters);
      if (countersRaw) {
        const c = JSON.parse(countersRaw);
        this.nextFournisseurId = Math.max(this.nextFournisseurId, c.grossiste || 1);
        this.nextFactureId = c.facture || 1;
        this.nextAnomalieId = c.anomalie || 1;
        this.nextLigneId = c.ligne || 1;
      }

      this.conditions = [];
      this.nextConditionId = 1;
      this.initialized = true;

      // Remove old key
      localStorage.removeItem(STORAGE_KEYS.grossistes);

      // Save in V2 format
      this.saveToStorage();
    } catch (e) {
      console.warn('Erreur de migration V1→V2, réinitialisation:', e);
      this.initialized = false;
    }
  }

  initDb(): void {
    if (this.initialized) return;

    this.nextFournisseurId = 1;
    this.nextConditionId = 1;
    this.nextFactureId = 1;
    this.nextAnomalieId = 1;
    this.nextLigneId = 1;

    this.fournisseurs = [];
    this.conditions = [];
    this.factures = [];
    this.anomalies = [];
    this.lignesFactures = [];

    // Grossistes par défaut
    this.createFournisseur({
      nom: 'CERP Rouen',
      type_fournisseur: 'grossiste',
      remise_base: 3.0,
      cooperation_commerciale: 2.0,
      escompte: 0.5,
      franco: 1500.0,
      remise_gamme_actif: false,
      remise_quantite_actif: false,
      rfa_actif: false,
      actif: true,
      notes: '',
    });

    this.createFournisseur({
      nom: 'OCP',
      type_fournisseur: 'grossiste',
      remise_base: 2.5,
      cooperation_commerciale: 2.0,
      escompte: 0.5,
      franco: 1200.0,
      remise_gamme_actif: false,
      remise_quantite_actif: false,
      rfa_actif: false,
      actif: true,
      notes: '',
    });

    this.createFournisseur({
      nom: 'Alliance Healthcare',
      type_fournisseur: 'grossiste',
      remise_base: 3.5,
      cooperation_commerciale: 1.5,
      escompte: 0.0,
      franco: 1800.0,
      remise_gamme_actif: false,
      remise_quantite_actif: false,
      rfa_actif: false,
      actif: true,
      notes: '',
    });

    console.log('✅ Base de données initialisée avec 3 grossistes');
    this.initialized = true;
    this.saveToStorage();
  }

  resetDb(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    this.initialized = false;
    this.initDb();
  }

  // ==================== FOURNISSEURS ====================

  getAllFournisseurs(): Fournisseur[] {
    return [...this.fournisseurs];
  }

  getFournisseurById(id: number): Fournisseur | undefined {
    return this.fournisseurs.find((f) => f.id === id);
  }

  getFournisseurByNom(nom: string): Fournisseur | undefined {
    return this.fournisseurs.find((f) => f.nom === nom);
  }

  getFournisseursByType(type: TypeFournisseur): Fournisseur[] {
    return this.fournisseurs.filter((f) => f.type_fournisseur === type);
  }

  getActiveFournisseurs(): Fournisseur[] {
    return this.fournisseurs.filter((f) => f.actif);
  }

  createFournisseur(
    data: Omit<Fournisseur, 'id' | 'created_at' | 'updated_at'>
  ): Fournisseur {
    const now = new Date().toISOString();
    const newFournisseur: Fournisseur = {
      ...data,
      id: this.nextFournisseurId++,
      created_at: now,
      updated_at: now,
    };
    this.fournisseurs.push(newFournisseur);
    this.saveToStorage();
    return newFournisseur;
  }

  updateFournisseur(
    id: number,
    data: Partial<Omit<Fournisseur, 'id' | 'created_at'>>
  ): Fournisseur | null {
    const index = this.fournisseurs.findIndex((f) => f.id === id);
    if (index === -1) return null;

    this.fournisseurs[index] = {
      ...this.fournisseurs[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.saveToStorage();
    return this.fournisseurs[index];
  }

  deleteFournisseur(id: number): boolean {
    const index = this.fournisseurs.findIndex((f) => f.id === id);
    if (index === -1) return false;

    this.fournisseurs.splice(index, 1);
    // Cascade : supprimer les conditions liées
    this.conditions = this.conditions.filter((c) => c.fournisseur_id !== id);
    this.saveToStorage();
    return true;
  }

  // ==================== GROSSISTES (retrocompat) ====================

  getAllGrossistes(): Grossiste[] {
    return this.getFournisseursByType('grossiste');
  }

  getGrossisteById(id: number): Grossiste | undefined {
    return this.getFournisseurById(id);
  }

  getGrossisteByNom(nom: string): Grossiste | undefined {
    return this.getFournisseurByNom(nom);
  }

  createGrossiste(data: Omit<Grossiste, 'id' | 'created_at' | 'updated_at'>): Grossiste {
    return this.createFournisseur({
      type_fournisseur: 'grossiste',
      remise_gamme_actif: false,
      remise_quantite_actif: false,
      rfa_actif: false,
      actif: true,
      notes: '',
      ...data,
    });
  }

  updateGrossiste(
    id: number,
    data: Partial<Omit<Grossiste, 'id' | 'created_at'>>
  ): Grossiste | null {
    return this.updateFournisseur(id, data);
  }

  deleteGrossiste(id: number): boolean {
    return this.deleteFournisseur(id);
  }

  // ==================== CONDITIONS SPECIFIQUES ====================

  getConditionsByFournisseur(fournisseurId: number): ConditionSpecifique[] {
    return this.conditions.filter((c) => c.fournisseur_id === fournisseurId);
  }

  getActiveConditions(fournisseurId: number): ConditionSpecifique[] {
    return this.conditions.filter((c) => c.fournisseur_id === fournisseurId && c.actif);
  }

  getConditionById(id: number): ConditionSpecifique | undefined {
    return this.conditions.find((c) => c.id === id);
  }

  createCondition(
    data: Omit<ConditionSpecifique, 'id' | 'created_at' | 'updated_at'>
  ): ConditionSpecifique {
    const now = new Date().toISOString();
    const newCondition: ConditionSpecifique = {
      ...data,
      id: this.nextConditionId++,
      created_at: now,
      updated_at: now,
    };
    this.conditions.push(newCondition);
    this.saveToStorage();
    return newCondition;
  }

  updateCondition(
    id: number,
    data: Partial<Omit<ConditionSpecifique, 'id' | 'created_at'>>
  ): ConditionSpecifique | null {
    const index = this.conditions.findIndex((c) => c.id === id);
    if (index === -1) return null;

    this.conditions[index] = {
      ...this.conditions[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.saveToStorage();
    return this.conditions[index];
  }

  deleteCondition(id: number): boolean {
    const index = this.conditions.findIndex((c) => c.id === id);
    if (index === -1) return false;

    this.conditions.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  deleteConditionsByFournisseur(fournisseurId: number): number {
    const initialLength = this.conditions.length;
    this.conditions = this.conditions.filter((c) => c.fournisseur_id !== fournisseurId);
    this.saveToStorage();
    return initialLength - this.conditions.length;
  }

  // ==================== FACTURES ====================

  getAllFactures(): Facture[] {
    return this.factures.map((f) => this.enrichirFacture(f));
  }

  getFactureById(id: number): Facture | undefined {
    const facture = this.factures.find((f) => f.id === id);
    return facture ? this.enrichirFacture(facture) : undefined;
  }

  getFacturesByFournisseur(fournisseurId: number): Facture[] {
    return this.factures
      .filter((f) => (f.fournisseur_id ?? f.grossiste_id) === fournisseurId)
      .map((f) => this.enrichirFacture(f));
  }

  getFacturesByGrossiste(grossisteId: number): Facture[] {
    return this.getFacturesByFournisseur(grossisteId);
  }

  getFacturesByStatut(statut: Facture['statut_verification']): Facture[] {
    return this.factures
      .filter((f) => f.statut_verification === statut)
      .map((f) => this.enrichirFacture(f));
  }

  createFacture(data: Omit<Facture, 'id' | 'created_at'>): Facture {
    const newFacture: Facture = {
      ...data,
      fournisseur_id: data.fournisseur_id || data.grossiste_id || 0,
      id: this.nextFactureId++,
      created_at: new Date().toISOString(),
    };
    this.factures.push(newFacture);
    this.saveToStorage();
    return this.enrichirFacture(newFacture);
  }

  updateFacture(id: number, data: Partial<Omit<Facture, 'id' | 'created_at'>>): Facture | null {
    const index = this.factures.findIndex((f) => f.id === id);
    if (index === -1) return null;

    this.factures[index] = {
      ...this.factures[index],
      ...data,
    };
    this.saveToStorage();
    return this.enrichirFacture(this.factures[index]);
  }

  deleteFacture(id: number): boolean {
    const index = this.factures.findIndex((f) => f.id === id);
    if (index === -1) return false;

    this.anomalies = this.anomalies.filter((a) => a.facture_id !== id);
    this.lignesFactures = this.lignesFactures.filter((l) => l.facture_id !== id);
    this.factures.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  // ==================== LIGNES FACTURES ====================

  getLignesByFactureId(factureId: number): LigneFacture[] {
    return this.lignesFactures.filter((l) => l.facture_id === factureId);
  }

  createLigneFacture(data: Omit<LigneFacture, 'id'>): LigneFacture {
    const newLigne: LigneFacture = {
      ...data,
      id: this.nextLigneId++,
    };
    this.lignesFactures.push(newLigne);
    this.saveToStorage();
    return newLigne;
  }

  // ==================== ANOMALIES ====================

  getAllAnomalies(): Anomalie[] {
    return this.anomalies.map((a) => this.enrichirAnomalie(a));
  }

  getAnomalieById(id: number): Anomalie | undefined {
    const anomalie = this.anomalies.find((a) => a.id === id);
    return anomalie ? this.enrichirAnomalie(anomalie) : undefined;
  }

  getAnomaliesByFacture(factureId: number): Anomalie[] {
    return this.anomalies
      .filter((a) => a.facture_id === factureId)
      .map((a) => this.enrichirAnomalie(a));
  }

  getAnomaliesByType(type: Anomalie['type_anomalie']): Anomalie[] {
    return this.anomalies
      .filter((a) => a.type_anomalie === type)
      .map((a) => this.enrichirAnomalie(a));
  }

  createAnomalie(data: Omit<Anomalie, 'id' | 'created_at'>): Anomalie {
    const newAnomalie: Anomalie = {
      ...data,
      niveau_severite: data.niveau_severite || 'warning',
      id: this.nextAnomalieId++,
      created_at: new Date().toISOString(),
    };
    this.anomalies.push(newAnomalie);
    this.saveToStorage();
    return this.enrichirAnomalie(newAnomalie);
  }

  deleteAnomalie(id: number): boolean {
    const index = this.anomalies.findIndex((a) => a.id === id);
    if (index === -1) return false;

    this.anomalies.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  deleteAnomaliesByFacture(factureId: number): number {
    const initialLength = this.anomalies.length;
    this.anomalies = this.anomalies.filter((a) => a.facture_id !== factureId);
    this.saveToStorage();
    return initialLength - this.anomalies.length;
  }

  // ==================== HELPERS ====================

  private enrichirFacture(facture: Facture): Facture {
    const fournisseurId = facture.fournisseur_id ?? facture.grossiste_id;
    const fournisseur = fournisseurId ? this.getFournisseurById(fournisseurId) : undefined;
    if (fournisseur) {
      fournisseur.conditions_specifiques = this.getActiveConditions(fournisseur.id);
    }
    return {
      ...facture,
      fournisseur_id: fournisseurId || 0,
      grossiste_id: fournisseurId,
      fournisseur,
      grossiste: fournisseur,
      lignes: this.getLignesByFactureId(facture.id),
    };
  }

  private enrichirAnomalie(anomalie: Anomalie): Anomalie {
    const facture = this.factures.find((f) => f.id === anomalie.facture_id);
    return {
      ...anomalie,
      facture: facture ? this.enrichirFacture(facture) : undefined,
    };
  }

  // ==================== STATS ====================

  getStats() {
    const totalFactures = this.factures.length;
    const anomaliesDetectees = this.anomalies.length;
    const montantRecuperable = this.anomalies.reduce((sum, a) => sum + a.montant_ecart, 0);
    const facturesConformes = this.factures.filter(
      (f) => f.statut_verification === 'conforme'
    ).length;
    const tauxConformite = totalFactures > 0 ? (facturesConformes / totalFactures) * 100 : 0;

    return {
      totalFactures,
      anomaliesDetectees,
      montantRecuperable: parseFloat(montantRecuperable.toFixed(2)),
      tauxConformite: parseFloat(tauxConformite.toFixed(1)),
    };
  }
}

// Instance singleton de la base de données
export const db = new PersistentDatabase();
