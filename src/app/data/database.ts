// Simulation des opérations de base de données (équivalent de database.py)
import { Grossiste, Facture, Anomalie, LigneFacture } from '../types';
import {
  grossistes as initialGrossistes,
  facturesExemples as initialFactures,
  anomaliesExemples as initialAnomalies,
  lignesFactures as initialLignes,
} from './mockData';

// Base de données simulée en mémoire
class InMemoryDatabase {
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
    // Ne pas initialiser automatiquement pour éviter les doubles initialisations
    // L'initialisation sera faite explicitement via initDb()
  }

  // Équivalent de init_db() - Initialise la base avec les données par défaut
  initDb(): void {
    // Ne pas réinitialiser si déjà fait (évite les doublons)
    if (this.initialized) {
      console.log('⚠️  Base déjà initialisée, skip');
      return;
    }
    
    // Réinitialiser les compteurs
    this.nextGrossisteId = 1;
    this.nextFactureId = 1;
    this.nextAnomalieId = 1;
    this.nextLigneId = 1;
    
    // Vider les arrays pour éviter les doublons
    this.grossistes = [];
    this.factures = [];
    this.anomalies = [];
    this.lignesFactures = [];

    // Créer les 3 grossistes par défaut
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
    return newGrossiste;
  }

  updateGrossiste(id: number, data: Partial<Omit<Grossiste, 'id'>>): Grossiste | null {
    const index = this.grossistes.findIndex((g) => g.id === id);
    if (index === -1) return null;
    
    this.grossistes[index] = {
      ...this.grossistes[index],
      ...data,
    };
    return this.grossistes[index];
  }

  deleteGrossiste(id: number): boolean {
    const index = this.grossistes.findIndex((g) => g.id === id);
    if (index === -1) return false;
    
    this.grossistes.splice(index, 1);
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
    return this.enrichirFacture(newFacture);
  }

  updateFacture(id: number, data: Partial<Omit<Facture, 'id' | 'created_at'>>): Facture | null {
    const index = this.factures.findIndex((f) => f.id === id);
    if (index === -1) return null;
    
    this.factures[index] = {
      ...this.factures[index],
      ...data,
    };
    return this.enrichirFacture(this.factures[index]);
  }

  deleteFacture(id: number): boolean {
    const index = this.factures.findIndex((f) => f.id === id);
    if (index === -1) return false;
    
    // Supprimer aussi les anomalies et lignes associées
    this.anomalies = this.anomalies.filter((a) => a.facture_id !== id);
    this.lignesFactures = this.lignesFactures.filter((l) => l.facture_id !== id);
    this.factures.splice(index, 1);
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
    return this.enrichirAnomalie(newAnomalie);
  }

  deleteAnomalie(id: number): boolean {
    const index = this.anomalies.findIndex((a) => a.id === id);
    if (index === -1) return false;
    
    this.anomalies.splice(index, 1);
    return true;
  }

  deleteAnomaliesByFacture(factureId: number): number {
    const initialLength = this.anomalies.length;
    this.anomalies = this.anomalies.filter((a) => a.facture_id !== factureId);
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
    const facturesConformes = this.factures.filter((f) => f.statut_verification === 'conforme').length;
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
export const db = new InMemoryDatabase();