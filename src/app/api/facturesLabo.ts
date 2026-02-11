/**
 * PharmaVerif - Module API Factures Laboratoires
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * API-only — pas de fallback localStorage.
 * Cette fonctionnalité nécessite le backend FastAPI.
 */

import { http } from './httpClient';
import type {
  FactureLaboResponse,
  FactureLaboListResponse,
  LigneFactureLaboResponse,
  UploadLaboResponse,
  AnalyseRemiseResponse,
  RFAUpdateResponse,
  MessageResponse,
} from './types';

// ========================================
// TYPES LOCAUX
// ========================================

export interface FacturesLaboListParams {
  page?: number;
  page_size?: number;
  laboratoire_id?: number;
  statut?: string;
  search?: string;
  date_debut?: string;
  date_fin?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface StatsMonthlyParams {
  laboratoire_id?: number;
  annee?: number;
}

// ========================================
// API FACTURES LABO
// ========================================

export const facturesLaboApi = {
  /**
   * Upload et parse un PDF de facture laboratoire
   *
   * POST /api/v1/factures-labo/upload
   * Content-Type: multipart/form-data
   */
  async upload(file: File, laboratoireId: number): Promise<UploadLaboResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload<UploadLaboResponse>(
      `/factures-labo/upload?laboratoire_id=${laboratoireId}`,
      formData
    );
  },

  /**
   * Liste les factures labo avec pagination et filtres
   *
   * GET /api/v1/factures-labo/
   */
  async list(params?: FacturesLaboListParams): Promise<FactureLaboListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return http.get<FactureLaboListResponse>(
      `/factures-labo/${query ? `?${query}` : ''}`
    );
  },

  /**
   * Détail d'une facture labo par ID
   *
   * GET /api/v1/factures-labo/{id}
   */
  async getById(id: number): Promise<FactureLaboResponse> {
    return http.get<FactureLaboResponse>(`/factures-labo/${id}`);
  },

  /**
   * Lignes de produits d'une facture labo
   *
   * GET /api/v1/factures-labo/{id}/lignes
   */
  async getLignes(id: number, tranche?: string): Promise<LigneFactureLaboResponse[]> {
    const params = tranche ? `?tranche=${tranche}` : '';
    return http.get<LigneFactureLaboResponse[]>(`/factures-labo/${id}/lignes${params}`);
  },

  /**
   * Analyse complète des tranches et remises
   *
   * GET /api/v1/factures-labo/{id}/analyse
   */
  async getAnalyse(id: number): Promise<AnalyseRemiseResponse> {
    return http.get<AnalyseRemiseResponse>(`/factures-labo/${id}/analyse`);
  },

  /**
   * Mettre à jour la RFA reçue et calculer l'écart
   *
   * PATCH /api/v1/factures-labo/{id}/rfa
   */
  async updateRfa(id: number, rfaRecue: number): Promise<RFAUpdateResponse> {
    return http.patch<RFAUpdateResponse>(`/factures-labo/${id}/rfa`, {
      rfa_recue: rfaRecue,
    });
  },

  /**
   * Supprimer une facture labo
   *
   * DELETE /api/v1/factures-labo/{id}
   */
  async delete(id: number): Promise<MessageResponse> {
    return http.delete<MessageResponse>(`/factures-labo/${id}`);
  },

  /**
   * Statistiques mensuelles des factures labo
   *
   * GET /api/v1/factures-labo/stats/monthly
   */
  async getStatsMonthly(params?: StatsMonthlyParams): Promise<unknown> {
    const searchParams = new URLSearchParams();
    if (params?.laboratoire_id) searchParams.set('laboratoire_id', String(params.laboratoire_id));
    if (params?.annee) searchParams.set('annee', String(params.annee));
    const query = searchParams.toString();
    return http.get(`/factures-labo/stats/monthly${query ? `?${query}` : ''}`);
  },
};
