/**
 * PharmaVerif - Module API EMAC
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * API-only — pas de fallback localStorage.
 * CRUD + upload + verification des EMAC (Etats Mensuels des Avantages Commerciaux)
 */

import { http } from './httpClient';
import type {
  EMACResponse,
  EMACListResponse,
  EMACCreateManuel,
  EMACUpdate,
  AnomalieEMACResponse,
  TriangleVerificationResponse,
  UploadEMACResponse,
  EMACManquantsListResponse,
  EMACDashboardStats,
  MessageResponse,
  SeveriteAnomalieEMAC,
} from './types';

// ========================================
// TYPES LOCAUX
// ========================================

export interface EMACListParams {
  page?: number;
  page_size?: number;
  laboratoire_id?: number;
  statut?: string;
  annee?: number;
}

// ========================================
// API EMAC
// ========================================

export const emacApi = {
  /**
   * Upload et parse un fichier EMAC (Excel/CSV)
   *
   * POST /api/v1/emac/upload
   */
  async upload(
    file: File,
    laboratoireId: number,
    periodeDebut: string,
    periodeFin: string
  ): Promise<UploadEMACResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload<UploadEMACResponse>(
      `/emac/upload?laboratoire_id=${laboratoireId}&periode_debut=${periodeDebut}&periode_fin=${periodeFin}`,
      formData
    );
  },

  /**
   * Creer un EMAC par saisie manuelle
   *
   * POST /api/v1/emac/manual
   */
  async createManual(data: EMACCreateManuel): Promise<EMACResponse> {
    return http.post<EMACResponse>('/emac/manual', data);
  },

  /**
   * Liste les EMAC avec pagination et filtres
   *
   * GET /api/v1/emac/
   */
  async list(params?: EMACListParams): Promise<EMACListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return http.get<EMACListResponse>(`/emac/${query ? `?${query}` : ''}`);
  },

  /**
   * Detail d'un EMAC par ID
   *
   * GET /api/v1/emac/{id}
   */
  async getById(id: number): Promise<EMACResponse> {
    return http.get<EMACResponse>(`/emac/${id}`);
  },

  /**
   * Modifier un EMAC
   *
   * PUT /api/v1/emac/{id}
   */
  async update(id: number, data: EMACUpdate): Promise<EMACResponse> {
    return http.put<EMACResponse>(`/emac/${id}`, data);
  },

  /**
   * Supprimer un EMAC
   *
   * DELETE /api/v1/emac/{id}
   */
  async delete(id: number): Promise<MessageResponse> {
    return http.delete<MessageResponse>(`/emac/${id}`);
  },

  /**
   * Lancer ou relancer la verification croisee
   *
   * POST /api/v1/emac/{id}/verify
   */
  async verify(id: number): Promise<TriangleVerificationResponse> {
    return http.post<TriangleVerificationResponse>(`/emac/${id}/verify`, {});
  },

  /**
   * Obtenir le triangle de verification
   *
   * GET /api/v1/emac/{id}/triangle
   */
  async getTriangle(id: number): Promise<TriangleVerificationResponse> {
    return http.get<TriangleVerificationResponse>(`/emac/${id}/triangle`);
  },

  /**
   * Obtenir les anomalies d'un EMAC
   *
   * GET /api/v1/emac/{id}/anomalies
   */
  async getAnomalies(id: number, severite?: SeveriteAnomalieEMAC): Promise<AnomalieEMACResponse[]> {
    const params = severite ? `?severite=${severite}` : '';
    return http.get<AnomalieEMACResponse[]>(`/emac/${id}/anomalies${params}`);
  },

  /**
   * Marquer une anomalie comme resolue
   *
   * PATCH /api/v1/emac/anomalies/{id}
   */
  async resolveAnomalie(
    anomalieId: number,
    resolu: boolean,
    note?: string
  ): Promise<AnomalieEMACResponse> {
    return http.patch<AnomalieEMACResponse>(`/emac/anomalies/${anomalieId}`, {
      resolu,
      note_resolution: note || null,
    });
  },

  /**
   * Detecter les EMAC manquants
   *
   * GET /api/v1/emac/manquants
   */
  async getManquants(
    annee?: number,
    laboratoireId?: number
  ): Promise<EMACManquantsListResponse> {
    const params = new URLSearchParams();
    if (annee) params.set('annee', String(annee));
    if (laboratoireId) params.set('laboratoire_id', String(laboratoireId));
    const query = params.toString();
    return http.get<EMACManquantsListResponse>(
      `/emac/manquants${query ? `?${query}` : ''}`
    );
  },

  /**
   * Statistiques EMAC pour le dashboard
   *
   * GET /api/v1/emac/dashboard/stats
   */
  async getDashboardStats(): Promise<EMACDashboardStats> {
    return http.get<EMACDashboardStats>('/emac/dashboard/stats');
  },
};
