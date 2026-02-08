/**
 * PharmaVerif - Base de données avec persistance localStorage
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Les données sont sauvegardées automatiquement dans localStorage
 * pour survivre aux rechargements de page.
 */

import { Grossiste, Facture, Anomalie, LigneFacture } from '../types';

const STORAGE_KEYS = {
  grossistes: 'pharmaverif_grossistes',
  factures: 'pharmaverif_factures',
  anomalies: 'pharmaverif_anomalies',
  lignes: 'pharmaverif_lignes',
  counters: 'pharmaverif_counters',
  initialized: 'pharmaverif_initialized',
};

class PersistentDatabase {
  private grossistes: Grossiste[] = [];
  private factures: Facture[] = [];
  private anomalies: Anomalie[] = [];
  private lignesFactures: LigneFacture[] = [];

  private nextGrossisteId = 1;
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
      localStorage.setItem(STORAGE_KEYS.grossistes, JSON.stringify(this.grossistes));
      localStorage.setItem(STORAGE_KEYS.factures, JSON.stringify(this.factures));
      localStorage.setItem(STORAGE_KEYS.anomalies, JSON.stringify(this.anomalies));
      localStorage.setItem(STORAGE_KEYS.lignes, JSON.stringify(this.lignesFactures));
      localStorage.setItem(
        STORAGE_KEYS.counters,
        JSON.stringify({
          grossiste: this.nextGrossisteId,
          facture: this.nextFactureId,
          anomalie: this.nextAnomalieId,
          ligne: this.nextLigneId,
        })
      );
      localStorage.setItem(STORAGE_KEYS.initialized, 'true');
    } catch (e) {
      console.warn('⚠️ Impossible de sauvegarder dans localStorage:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const wasInitialized = localStorage.getItem(STORAGE_KEYS.initialized) === 'true';
      if (!wasInitialized) return;

      const grossistes = localStorage.getItem(STORAGE_KEYS.grossistes);
      const factures = localStorage.getItem(STORAGE_KEYS.factures);
      const anomalies = localStorage.getItem(STORAGE_KEYS.anomalies);
      const lignes = localStorage.getItem(STORAGE_KEYS.lignes);
      const counters = localStorage.getItem(STORAGE_KEYS.counters);

      if (grossistes) this.grossistes = JSON.parse(grossistes);
      if (factures) this.factures = JSON.parse(factures);
      if (anomalies) this.anomalies = JSON.parse(anomalies);
      if (lignes) this.lignesFactures = JSON.parse(lignes);
      if (counters) {
        const c = JSON.parse(counters);
        this.nextGrossisteId = c.grossiste;
        this.nextFactureId = c.facture;
        this.nextAnomalieId = c.anomalie;
        this.nextLigneId = c.ligne;
      }

      this.initialized = true;
      console.log('💾 Données restaurées depuis localStorage');
    } catch (e) {
      console.warn('⚠️ Impossible de charger depuis localStorage:', e);
    }
  }

  // Initialise la base avec les grossistes par défaut
  initDb(): void {
    if (this.initialized) {
      console.log('⚠️  Base déjà initialisée, skip');
      return;
    }

    this.nextGrossisteId = 1;
    this.nextFactureId = 1;
    this.nextAnomalieId = 1;
    this.nextLigneId = 1;

    this.grossistes = [];
    this.factures = [];
    this.anomalies = [];
    this.lignesFactures = [];

    this.createGrossiste({
      nom: 'CERP Rouen',
      remise_base: 3.0,
      cooperation_commerciale: 2.0,
      escompte: 0.5,
      franco: 1500.0,
    });

    this.createGrossiste({
      nom: 'OCP',
      remise_base: 2.5,
      cooperation_commerciale: 2.0,
      escompte: 0.5,
      franco: 1200.0,
    });

    this.createGrossiste({
      nom: 'Alliance Healthcare',
      remise_base: 3.5,
      cooperation_commerciale: 1.5,
      escompte: 0.0,
      franco: 1800.0,
    });

    console.log('✅ Base de données initialisée avec 3 grossistes');
    this.initialized = true;
    this.saveToStorage();
  }

  /**
   * Réinitialise complètement la base de données (efface localStorage)
   */
  resetDb(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    this.initialized = false;
    this.initDb();
  }

  // ==================== GROSSISTES ====================

  getAllGrossistes(): Grossiste[] {
    return [...this.grossistes];
  }

  getGrossisteById(id: number): Grossiste | undefined {
    return this.grossistes.find((g) => g.id === id);
  }

  getGrossisteByNom(nom: string): Grossiste | undefined {
    return this.grossistes.find((g) => g.nom === nom);
  }

  createGrossiste(data: Omit<Grossiste, 'id'>): Grossiste {
    const newGrossiste: Grossiste = {
      ...data,
      id: this.nextGrossisteId++,
    };
    this.grossistes.push(newGrossiste);
    this.saveToStorage();
    return newGrossiste;
  }

  updateGrossiste(id: number, data: Partial<Omit<Grossiste, 'id'>>): Grossiste | null {
    const index = this.grossistes.findIndex((g) => g.id === id);
    if (index === -1) return null;

    this.grossistes[index] = {
      ...this.grossistes[index],
      ...data,
    };
    this.saveToStorage();
    return this.grossistes[index];
  }

  deleteGrossiste(id: number): boolean {
    const index = this.grossistes.findIndex((g) => g.id === id);
    if (index === -1) return false;

    this.grossistes.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  // ==================== FACTURES ====================

  getAllFactures(): Facture[] {
    return this.factures.map((f) => this.enrichirFacture(f));
  }

  getFactureById(id: number): Facture | undefined {
    const facture = this.factures.find((f) => f.id === id);
    return facture ? this.enrichirFacture(facture) : undefined;
  }

  getFacturesByGrossiste(grossisteId: number): Facture[] {
    return this.factures
      .filter((f) => f.grossiste_id === grossisteId)
      .map((f) => this.enrichirFacture(f));
  }

  getFacturesByStatut(statut: Facture['statut_verification']): Facture[] {
    return this.factures
      .filter((f) => f.statut_verification === statut)
      .map((f) => this.enrichirFacture(f));
  }

  createFacture(data: Omit<Facture, 'id' | 'created_at'>): Facture {
    const newFacture: Facture = {
      ...data,
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
    return {
      ...facture,
      grossiste: this.getGrossisteById(facture.grossiste_id),
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
