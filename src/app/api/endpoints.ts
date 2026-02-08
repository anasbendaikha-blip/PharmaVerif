/**
 * API Endpoints simulés (équivalent de main.py FastAPI)
 * 
 * Configuration équivalente:
 * - CORS activé pour le frontend
 * - Base de données SQLite simulée en mémoire
 * - Gestion d'erreurs avec status codes HTTP
 */

import { db } from '../data/database';
import { seedDemoData, isDatabaseEmpty } from '../data/seedData';
import { verifyFacture, calculateSavingsPotential } from '../utils/verificationLogic';
import { Grossiste, Facture, Anomalie } from '../types';

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

/**
 * GET /api/grossistes
 * Liste tous les grossistes avec leurs conditions
 * 
 * @returns Response: [{"id": 1, "nom": "CERP Rouen", "remise_base": 3.0, ...}]
 */
export async function getGrossistes(): Promise<ApiResponse<Grossiste[]>> {
  try {
    const grossistes = db.getAllGrossistes();
    return {
      success: true,
      data: grossistes,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur lors de la récupération des grossistes',
      status: 500,
    };
  }
}

/**
 * POST /api/factures
 * Créer une nouvelle facture
 * 
 * @param body - {numero, date, grossiste_id, montant_brut_ht, remises_ligne_a_ligne, remises_pied_facture, net_a_payer}
 * @returns Response: {"id": 1, "statut_verification": "non_verifie", ...}
 */
export async function createFacture(body: {
  numero: string;
  date: string;
  grossiste_id: number;
  montant_brut_ht: number;
  remises_ligne_a_ligne: number;
  remises_pied_facture: number;
  net_a_payer: number;
}): Promise<ApiResponse<Facture>> {
  try {
    // Validation
    if (!body.numero || !body.date || !body.grossiste_id) {
      return {
        success: false,
        error: 'Paramètres manquants : numero, date, et grossiste_id sont requis',
        status: 400,
      };
    }

    // Vérifier que le grossiste existe
    const grossiste = db.getGrossisteById(body.grossiste_id);
    if (!grossiste) {
      return {
        success: false,
        error: `Grossiste avec id ${body.grossiste_id} non trouvé`,
        status: 404,
      };
    }

    // Créer la facture
    const newFacture = db.createFacture({
      numero: body.numero,
      date: body.date,
      grossiste_id: body.grossiste_id,
      montant_brut_ht: body.montant_brut_ht,
      remises_ligne_a_ligne: body.remises_ligne_a_ligne,
      remises_pied_facture: body.remises_pied_facture,
      net_a_payer: body.net_a_payer,
      statut_verification: 'non_verifie',
    });

    return {
      success: true,
      data: newFacture,
      status: 201,
    };
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
 * Vérifier une facture et créer les anomalies
 * 
 * @param factureId - ID de la facture à vérifier
 * @returns Response: {facture, anomalies, statut}
 */
export async function verifyFactureById(factureId: number): Promise<ApiResponse<VerifyFactureResponse>> {
  try {
    // Récupérer la facture
    const facture = db.getFactureById(factureId);
    if (!facture) {
      return {
        success: false,
        error: `Facture avec id ${factureId} non trouvée`,
        status: 404,
      };
    }

    // Récupérer le grossiste
    const grossiste = db.getGrossisteById(facture.grossiste_id);
    if (!grossiste) {
      return {
        success: false,
        error: `Grossiste avec id ${facture.grossiste_id} non trouvé`,
        status: 404,
      };
    }

    // Supprimer les anciennes anomalies de cette facture
    db.deleteAnomaliesByFacture(factureId);

    // Vérifier la facture avec la logique métier
    const anomalies = verifyFacture(facture, grossiste);

    // Sauvegarder les nouvelles anomalies
    const savedAnomalies: Anomalie[] = [];
    anomalies.forEach((anomalie) => {
      const saved = db.createAnomalie({
        facture_id: factureId,
        type_anomalie: anomalie.type_anomalie,
        description: anomalie.description,
        montant_ecart: anomalie.montant_ecart,
      });
      savedAnomalies.push(saved);
    });

    // Mettre à jour le statut de la facture
    const statut = anomalies.length > 0 ? 'anomalie' : 'conforme';
    const updatedFacture = db.updateFacture(factureId, {
      statut_verification: statut,
    });

    if (!updatedFacture) {
      return {
        success: false,
        error: 'Erreur lors de la mise à jour de la facture',
        status: 500,
      };
    }

    return {
      success: true,
      data: {
        facture: updatedFacture,
        anomalies: savedAnomalies,
        statut,
      },
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
 * Liste toutes les factures avec leurs anomalies
 * 
 * @returns Response: [{"id": 1, "numero": "...", "anomalies": [...]}]
 */
export async function getFactures(): Promise<ApiResponse<Facture[]>> {
  try {
    const factures = db.getAllFactures();
    
    // Enrichir chaque facture avec ses anomalies
    const facturesWithAnomalies = factures.map((facture) => {
      const anomalies = db.getAnomaliesByFacture(facture.id);
      return {
        ...facture,
        anomalies,
      };
    });

    return {
      success: true,
      data: facturesWithAnomalies,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur lors de la récupération des factures',
      status: 500,
    };
  }
}

/**
 * GET /api/factures/{facture_id}
 * Récupérer une facture spécifique
 * 
 * @param factureId - ID de la facture
 * @returns Response: {"id": 1, "numero": "...", "anomalies": [...]}
 */
export async function getFactureById(factureId: number): Promise<ApiResponse<Facture>> {
  try {
    const facture = db.getFactureById(factureId);
    
    if (!facture) {
      return {
        success: false,
        error: `Facture avec id ${factureId} non trouvée`,
        status: 404,
      };
    }

    // Enrichir avec les anomalies
    const anomalies = db.getAnomaliesByFacture(factureId);
    const factureWithAnomalies = {
      ...facture,
      anomalies,
    };

    return {
      success: true,
      data: factureWithAnomalies,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur lors de la récupération de la facture',
      status: 500,
    };
  }
}

/**
 * GET /api/stats
 * Statistiques pour le dashboard
 * 
 * @returns Response: {total_factures, total_anomalies, economies_potentielles, dernieres_anomalies}
 */
export async function getStats(): Promise<ApiResponse<StatsResponse>> {
  try {
    const stats = db.getStats();
    const anomalies = db.getAllAnomalies();
    
    // Trier les anomalies par date (les plus récentes en premier)
    const sortedAnomalies = [...anomalies].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Prendre les 5 dernières
    const dernieres_anomalies = sortedAnomalies.slice(0, 5);

    const response: StatsResponse = {
      total_factures: stats.totalFactures,
      total_anomalies: stats.anomaliesDetectees,
      economies_potentielles: stats.montantRecuperable,
      dernieres_anomalies,
      taux_conformite: stats.tauxConformite,
    };

    return {
      success: true,
      data: response,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
      status: 500,
    };
  }
}

/**
 * DELETE /api/factures/{facture_id}
 * Supprimer une facture
 * 
 * @param factureId - ID de la facture à supprimer
 * @returns Response: {success: true}
 */
export async function deleteFacture(factureId: number): Promise<ApiResponse<{ message: string }>> {
  try {
    const success = db.deleteFacture(factureId);
    
    if (!success) {
      return {
        success: false,
        error: `Facture avec id ${factureId} non trouvée`,
        status: 404,
      };
    }

    return {
      success: true,
      data: { message: 'Facture supprimée avec succès' },
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur lors de la suppression de la facture',
      status: 500,
    };
  }
}

/**
 * GET /api/anomalies
 * Liste toutes les anomalies
 * 
 * @param type - Filtre optionnel par type d'anomalie
 * @returns Response: [{"id": 1, "type_anomalie": "...", "facture": {...}}]
 */
export async function getAnomalies(type?: string): Promise<ApiResponse<Anomalie[]>> {
  try {
    let anomalies = db.getAllAnomalies();
    
    // Filtrer par type si spécifié
    if (type && type !== 'tous') {
      anomalies = anomalies.filter((a) => a.type_anomalie === type);
    }

    return {
      success: true,
      data: anomalies,
      status: 200,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur lors de la récupération des anomalies',
      status: 500,
    };
  }
}

/**
 * Initialisation de la base de données au démarrage
 * Équivalent de l'événement "startup" de FastAPI
 */
export function initializeDatabase(): void {
  console.log('🗄️  Initialisation de la base de données...');
  db.initDb();
  console.log('✅ Base de données initialisée avec succès');
  console.log(`   - ${db.getAllGrossistes().length} grossistes chargés`);
  console.log(`   - ${db.getAllFactures().length} factures exemples chargées`);
  console.log(`   - ${db.getAllAnomalies().length} anomalies exemples chargées`);
  
  // Vérifier si la base de données est vide et semer les données de démonstration si nécessaire
  if (isDatabaseEmpty()) {
    console.log('🔍 Base de données vide détectée, semer les données de démonstration...');
    seedDemoData();
    console.log('🌱 Données de démonstration semées avec succès');
  }
}

/**
 * Gestionnaire d'erreurs global
 * Équivalent de l'exception handler FastAPI
 */
export function handleApiError(error: unknown): ApiResponse<never> {
  console.error('❌ Erreur API:', error);
  
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      status: 500,
    };
  }
  
  return {
    success: false,
    error: 'Erreur interne du serveur',
    status: 500,
  };
}