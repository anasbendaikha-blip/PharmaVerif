/**
 * PharmaVerif - Module API Laboratoires & Accords Commerciaux
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * CRUD complet pour Laboratoires, AccordCommercial, PalierRFA
 */

import { http } from './httpClient';
import type {
  LaboratoireResponse,
  LaboratoireCreate,
  AccordCommercialResponse,
  AccordCommercialCreate,
  PalierRFAResponse,
  PalierRFACreate,
  MessageResponse,
  RecalculResponse,
} from './types';

// ========================================
// API LABORATOIRES
// ========================================

export const laboratoiresApi = {
  /**
   * Lister tous les laboratoires
   *
   * GET /api/v1/laboratoires/
   */
  async list(actif?: boolean): Promise<LaboratoireResponse[]> {
    const params = actif !== undefined ? `?actif=${actif}` : '';
    return http.get<LaboratoireResponse[]>(`/laboratoires/${params}`);
  },

  /**
   * Obtenir un laboratoire par ID
   *
   * GET /api/v1/laboratoires/{id}
   */
  async getById(id: number): Promise<LaboratoireResponse> {
    return http.get<LaboratoireResponse>(`/laboratoires/${id}`);
  },

  /**
   * Creer un nouveau laboratoire
   *
   * POST /api/v1/laboratoires/
   */
  async create(data: LaboratoireCreate): Promise<LaboratoireResponse> {
    return http.post<LaboratoireResponse>('/laboratoires/', data);
  },

  /**
   * Modifier un laboratoire
   *
   * PUT /api/v1/laboratoires/{id}
   */
  async update(id: number, data: LaboratoireCreate): Promise<LaboratoireResponse> {
    return http.put<LaboratoireResponse>(`/laboratoires/${id}`, data);
  },

  /**
   * Supprimer un laboratoire
   *
   * DELETE /api/v1/laboratoires/{id}
   */
  async delete(id: number): Promise<MessageResponse> {
    return http.delete<MessageResponse>(`/laboratoires/${id}`);
  },

  // ========================================
  // ACCORDS COMMERCIAUX
  // ========================================

  /**
   * Lister les accords d'un laboratoire
   *
   * GET /api/v1/laboratoires/{id}/accords
   */
  async listAccords(laboratoireId: number, actif?: boolean): Promise<AccordCommercialResponse[]> {
    const params = actif !== undefined ? `?actif=${actif}` : '';
    return http.get<AccordCommercialResponse[]>(
      `/laboratoires/${laboratoireId}/accords${params}`
    );
  },

  /**
   * Obtenir un accord commercial par ID
   *
   * GET /api/v1/laboratoires/{laboId}/accords/{accordId}
   */
  async getAccord(laboratoireId: number, accordId: number): Promise<AccordCommercialResponse> {
    return http.get<AccordCommercialResponse>(
      `/laboratoires/${laboratoireId}/accords/${accordId}`
    );
  },

  /**
   * Creer un nouvel accord commercial
   *
   * POST /api/v1/laboratoires/{id}/accords
   */
  async createAccord(laboratoireId: number, data: AccordCommercialCreate): Promise<AccordCommercialResponse> {
    return http.post<AccordCommercialResponse>(
      `/laboratoires/${laboratoireId}/accords`,
      data
    );
  },

  /**
   * Modifier un accord commercial
   *
   * PUT /api/v1/laboratoires/{laboId}/accords/{accordId}
   */
  async updateAccord(
    laboratoireId: number,
    accordId: number,
    data: AccordCommercialCreate
  ): Promise<AccordCommercialResponse> {
    return http.put<AccordCommercialResponse>(
      `/laboratoires/${laboratoireId}/accords/${accordId}`,
      data
    );
  },

  /**
   * Supprimer un accord commercial
   *
   * DELETE /api/v1/laboratoires/{laboId}/accords/{accordId}
   */
  async deleteAccord(laboratoireId: number, accordId: number): Promise<MessageResponse> {
    return http.delete<MessageResponse>(
      `/laboratoires/${laboratoireId}/accords/${accordId}`
    );
  },

  // ========================================
  // PALIERS RFA
  // ========================================

  /**
   * Lister les paliers RFA d'un accord
   *
   * GET /api/v1/laboratoires/{laboId}/accords/{accordId}/paliers
   */
  async listPaliers(
    laboratoireId: number,
    accordId: number
  ): Promise<PalierRFAResponse[]> {
    return http.get<PalierRFAResponse[]>(
      `/laboratoires/${laboratoireId}/accords/${accordId}/paliers`
    );
  },

  /**
   * Ajouter un palier RFA
   *
   * POST /api/v1/laboratoires/{laboId}/accords/{accordId}/paliers
   */
  async createPalier(
    laboratoireId: number,
    accordId: number,
    data: PalierRFACreate
  ): Promise<PalierRFAResponse> {
    return http.post<PalierRFAResponse>(
      `/laboratoires/${laboratoireId}/accords/${accordId}/paliers`,
      data
    );
  },

  /**
   * Supprimer un palier RFA
   *
   * DELETE /api/v1/laboratoires/{laboId}/accords/{accordId}/paliers/{palierId}
   */
  async deletePalier(
    laboratoireId: number,
    accordId: number,
    palierId: number
  ): Promise<MessageResponse> {
    return http.delete<MessageResponse>(
      `/laboratoires/${laboratoireId}/accords/${accordId}/paliers/${palierId}`
    );
  },

  // ========================================
  // RECALCUL & TEMPLATES
  // ========================================

  /**
   * Recalculer toutes les factures d'un labo apres modification d'un accord
   *
   * POST /api/v1/laboratoires/{id}/recalculer
   */
  async recalculer(laboratoireId: number): Promise<RecalculResponse> {
    return http.post<RecalculResponse>(
      `/laboratoires/${laboratoireId}/recalculer`
    );
  },

  /**
   * Initialiser les 6 laboratoires pre-configures avec accords
   *
   * POST /api/v1/laboratoires/init-templates
   */
  async initTemplates(): Promise<MessageResponse> {
    return http.post<MessageResponse>('/laboratoires/init-templates');
  },
};
