/**
 * API Endpoints simulés (équivalent de main.py FastAPI)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { db } from '../data/database';
import { seedDemoData, isDatabaseEmpty } from '../data/seedData';
import { verifyFacture } from '../utils/verificationLogic';
import { Fournisseur, Grossiste, ConditionSpecifique, Facture, Anomalie, TypeFournisseur } from '../types';

// Types pour les réponses API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

export interface VerifyFactureResponse {
  facture: Facture;
  anomalies: Anomalie[];
  statut: 'conforme' | 'anomalie';
}

export interface StatsResponse {
  total_factures: number;
  total_anomalies: number;
  economies_potentielles: number;
  dernieres_anomalies: Anomalie[];
  taux_conformite: number;
}

// ==================== FOURNISSEURS ====================

/**
 * GET /api/fournisseurs
 * Liste tous les fournisseurs, filtrable par type
 */
export async function getFournisseurs(type?: TypeFournisseur): Promise<ApiResponse<Fournisseur[]>> {
  try {
    const fournisseurs = type
      ? db.getFournisseursByType(type)
      : db.getAllFournisseurs();
    return { success: true, data: fournisseurs, status: 200 };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la récupération des fournisseurs', status: 500 };
  }
}

/**
 * GET /api/fournisseurs/{id}
 */
export async function getFournisseurById(id: number): Promise<ApiResponse<Fournisseur>> {
  try {
    const fournisseur = db.getFournisseurById(id);
    if (!fournisseur) {
      return { success: false, error: `Fournisseur avec id ${id} non trouvé`, status: 404 };
    }
    // Charger les conditions
    fournisseur.conditions_specifiques = db.getConditionsByFournisseur(id);
    return { success: true, data: fournisseur, status: 200 };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la récupération du fournisseur', status: 500 };
  }
}

/**
 * POST /api/fournisseurs
 */
export async function createFournisseur(body: Omit<Fournisseur, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Fournisseur>> {
  try {
    if (!body.nom || !body.type_fournisseur) {
      return { success: false, error: 'Paramètres manquants : nom et type_fournisseur sont requis', status: 400 };
    }
    const newFournisseur = db.createFournisseur(body);
    return { success: true, data: newFournisseur, status: 201 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la création du fournisseur', status: 500 };
  }
}

/**
 * PUT /api/fournisseurs/{id}
 */
export async function updateFournisseur(id: number, body: Partial<Omit<Fournisseur, 'id' | 'created_at'>>): Promise<ApiResponse<Fournisseur>> {
  try {
    const updated = db.updateFournisseur(id, body);
    if (!updated) {
      return { success: false, error: `Fournisseur avec id ${id} non trouvé`, status: 404 };
    }
    return { success: true, data: updated, status: 200 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du fournisseur', status: 500 };
  }
}

/**
 * DELETE /api/fournisseurs/{id}
 */
export async function deleteFournisseur(id: number): Promise<ApiResponse<{ message: string }>> {
  try {
    const success = db.deleteFournisseur(id);
    if (!success) {
      return { success: false, error: `Fournisseur avec id ${id} non trouvé`, status: 404 };
    }
    return { success: true, data: { message: 'Fournisseur supprimé avec succès' }, status: 200 };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la suppression du fournisseur', status: 500 };
  }
}

// ==================== CONDITIONS SPECIFIQUES ====================

/**
 * GET /api/fournisseurs/{id}/conditions
 */
export async function getConditions(fournisseurId: number): Promise<ApiResponse<ConditionSpecifique[]>> {
  try {
    const conditions = db.getConditionsByFournisseur(fournisseurId);
    return { success: true, data: conditions, status: 200 };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la récupération des conditions', status: 500 };
  }
}

/**
 * POST /api/conditions
 */
export async function createCondition(body: Omit<ConditionSpecifique, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<ConditionSpecifique>> {
  try {
    if (!body.fournisseur_id || !body.type_condition || !body.nom) {
      return { success: false, error: 'Paramètres manquants : fournisseur_id, type_condition et nom sont requis', status: 400 };
    }
    const newCondition = db.createCondition(body);
    return { success: true, data: newCondition, status: 201 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la création de la condition', status: 500 };
  }
}

/**
 * PUT /api/conditions/{id}
 */
export async function updateCondition(id: number, body: Partial<Omit<ConditionSpecifique, 'id' | 'created_at'>>): Promise<ApiResponse<ConditionSpecifique>> {
  try {
    const updated = db.updateCondition(id, body);
    if (!updated) {
      return { success: false, error: `Condition avec id ${id} non trouvée`, status: 404 };
    }
    return { success: true, data: updated, status: 200 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la condition', status: 500 };
  }
}

/**
 * DELETE /api/conditions/{id}
 */
export async function deleteCondition(id: number): Promise<ApiResponse<{ message: string }>> {
  try {
    const success = db.deleteCondition(id);
    if (!success) {
      return { success: false, error: `Condition avec id ${id} non trouvée`, status: 404 };
    }
    return { success: true, data: { message: 'Condition supprimée avec succès' }, status: 200 };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la suppression de la condition', status: 500 };
  }
}

// ==================== GROSSISTES (retrocompat) ====================

/**
 * GET /api/grossistes
 * @deprecated Utiliser getFournisseurs('grossiste')
 */
export async function getGrossistes(): Promise<ApiResponse<Grossiste[]>> {
  return getFournisseurs('grossiste');
}

// ==================== FACTURES ====================

/**
 * POST /api/factures
 */
export async function createFacture(body: {
  numero: string;
  date: string;
  fournisseur_id?: number;
  grossiste_id?: number;
  montant_brut_ht: number;
  remises_ligne_a_ligne: number;
  remises_pied_facture: number;
  net_a_payer: number;
}): Promise<ApiResponse<Facture>> {
  try {
    const fournisseurId = body.fournisseur_id || body.grossiste_id;
    if (!body.numero || !body.date || !fournisseurId) {
      return {
        success: false,
        error: 'Paramètres manquants : numero, date, et fournisseur_id sont requis',
        status: 400,
      };
    }

    const fournisseur = db.getFournisseurById(fournisseurId);
    if (!fournisseur) {
      return {
        success: false,
        error: `Fournisseur avec id ${fournisseurId} non trouvé`,
        status: 404,
      };
    }

    const newFacture = db.createFacture({
      numero: body.numero,
      date: body.date,
      fournisseur_id: fournisseurId,
      montant_brut_ht: body.montant_brut_ht,
      remises_ligne_a_ligne: body.remises_ligne_a_ligne,
      remises_pied_facture: body.remises_pied_facture,
      net_a_payer: body.net_a_payer,
      statut_verification: 'non_verifie',
    });

    return { success: true, data: newFacture, status: 201 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création de la facture',
      status: 500,
    };
  }
}

/**
 * POST /api/factures/{facture_id}/verify
 */
export async function verifyFactureById(
  factureId: number
): Promise<ApiResponse<VerifyFactureResponse>> {
  try {
    const facture = db.getFactureById(factureId);
    if (!facture) {
      return { success: false, error: `Facture avec id ${factureId} non trouvée`, status: 404 };
    }

    const fournisseurId = facture.fournisseur_id ?? facture.grossiste_id;
    const fournisseur = fournisseurId ? db.getFournisseurById(fournisseurId) : undefined;
    if (!fournisseur) {
      return {
        success: false,
        error: `Fournisseur avec id ${fournisseurId} non trouvé`,
        status: 404,
      };
    }

    // Supprimer les anciennes anomalies
    db.deleteAnomaliesByFacture(factureId);

    // Vérifier la facture
    const anomalies = verifyFacture(facture, fournisseur);

    // Sauvegarder les nouvelles anomalies
    const savedAnomalies: Anomalie[] = [];
    anomalies.forEach((anomalie) => {
      const saved = db.createAnomalie({
        facture_id: factureId,
        type_anomalie: anomalie.type_anomalie,
        description: anomalie.description,
        montant_ecart: anomalie.montant_ecart,
        niveau_severite: anomalie.niveau_severite || 'warning',
        condition_id: anomalie.condition_id,
      });
      savedAnomalies.push(saved);
    });

    const statut = anomalies.length > 0 ? 'anomalie' : 'conforme';
    const updatedFacture = db.updateFacture(factureId, { statut_verification: statut });

    if (!updatedFacture) {
      return { success: false, error: 'Erreur lors de la mise à jour de la facture', status: 500 };
    }

    return {
      success: true,
      data: { facture: updatedFacture, anomalies: savedAnomalies, statut },
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la vérification de la facture',
      status: 500,
    };
  }
}

/**
 * GET /api/factures
 */
export async function getFactures(): Promise<ApiResponse<Facture[]>> {
  try {
    const factures = db.getAllFactures();
    const facturesWithAnomalies = factures.map((facture) => {
      const anomalies = db.getAnomaliesByFacture(facture.id);
      return { ...facture, anomalies };
    });

    return { success: true, data: facturesWithAnomalies, status: 200 };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la récupération des factures', status: 500 };
  }
}

/**
 * GET /api/factures/{facture_id}
 */
export async function getFactureById(factureId: number): Promise<ApiResponse<Facture>> {
  try {
    const facture = db.getFactureById(factureId);
    if (!facture) {
      return { success: false, error: `Facture avec id ${factureId} non trouvée`, status: 404 };
    }

    const anomalies = db.getAnomaliesByFacture(factureId);
    return { success: true, data: { ...facture, anomalies }, status: 200 };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la récupération de la facture', status: 500 };
  }
}

/**
 * GET /api/stats
 */
export async function getStats(): Promise<ApiResponse<StatsResponse>> {
  try {
    const stats = db.getStats();
    const anomalies = db.getAllAnomalies();

    const sortedAnomalies = [...anomalies].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const dernieres_anomalies = sortedAnomalies.slice(0, 5);

    return {
      success: true,
      data: {
        total_factures: stats.totalFactures,
        total_anomalies: stats.anomaliesDetectees,
        economies_potentielles: stats.montantRecuperable,
        dernieres_anomalies,
        taux_conformite: stats.tauxConformite,
      },
      status: 200,
    };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la récupération des statistiques', status: 500 };
  }
}

/**
 * DELETE /api/factures/{facture_id}
 */
export async function deleteFacture(factureId: number): Promise<ApiResponse<{ message: string }>> {
  try {
    const success = db.deleteFacture(factureId);
    if (!success) {
      return { success: false, error: `Facture avec id ${factureId} non trouvée`, status: 404 };
    }
    return { success: true, data: { message: 'Facture supprimée avec succès' }, status: 200 };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la suppression de la facture', status: 500 };
  }
}

/**
 * GET /api/anomalies
 */
export async function getAnomalies(type?: string): Promise<ApiResponse<Anomalie[]>> {
  try {
    let anomalies = db.getAllAnomalies();
    if (type && type !== 'tous') {
      anomalies = anomalies.filter((a) => a.type_anomalie === type);
    }
    return { success: true, data: anomalies, status: 200 };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la récupération des anomalies', status: 500 };
  }
}

/**
 * Initialisation de la base de données au démarrage
 */
export function initializeDatabase(): void {
  console.log('🗄️  Initialisation de la base de données...');
  db.initDb();
  console.log('✅ Base de données initialisée avec succès');
  console.log(`   - ${db.getAllFournisseurs().length} fournisseurs chargés`);
  console.log(`   - ${db.getAllFactures().length} factures exemples chargées`);
  console.log(`   - ${db.getAllAnomalies().length} anomalies exemples chargées`);

  if (isDatabaseEmpty()) {
    console.log('🔍 Base de données vide détectée, semer les données de démonstration...');
    seedDemoData();
    console.log('🌱 Données de démonstration semées avec succès');
  }
}

/**
 * Gestionnaire d'erreurs global
 */
export function handleApiError(error: unknown): ApiResponse<never> {
  console.error('❌ Erreur API:', error);

  if (error instanceof Error) {
    return { success: false, error: error.message, status: 500 };
  }

  return { success: false, error: 'Erreur interne du serveur', status: 500 };
}
