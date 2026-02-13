/**
 * PharmaVerif - Module API Pharmacie (Tenant)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Client API pour la gestion multi-tenant des pharmacies.
 */

import { http } from './httpClient';
import type {
  PharmacyResponse,
  PharmacyUpdate,
  PharmacyStats,
  RegisterWithPharmacyRequest,
  RegisterWithPharmacyResponse,
  MessageResponse,
} from './types';

// ========================================
// API PHARMACIE
// ========================================

export const pharmacyApi = {
  /**
   * Obtenir les informations de la pharmacie courante
   *
   * GET /api/v1/pharmacy/me
   */
  async getMyPharmacy(): Promise<PharmacyResponse> {
    return http.get<PharmacyResponse>('/pharmacy/me');
  },

  /**
   * Modifier les informations de la pharmacie courante
   *
   * PUT /api/v1/pharmacy/me
   */
  async updateMyPharmacy(data: PharmacyUpdate): Promise<PharmacyResponse> {
    return http.put<PharmacyResponse>('/pharmacy/me', data);
  },

  /**
   * Lister les utilisateurs de la pharmacie courante
   *
   * GET /api/v1/pharmacy/me/users
   */
  async getPharmacyUsers(): Promise<unknown[]> {
    return http.get<unknown[]>('/pharmacy/me/users');
  },

  /**
   * Obtenir les statistiques de la pharmacie courante
   *
   * GET /api/v1/pharmacy/me/stats
   */
  async getPharmacyStats(): Promise<PharmacyStats> {
    return http.get<PharmacyStats>('/pharmacy/me/stats');
  },

  /**
   * Inscription d'une nouvelle pharmacie + utilisateur admin
   *
   * POST /api/v1/auth/register-pharmacy
   */
  async registerWithPharmacy(
    data: RegisterWithPharmacyRequest
  ): Promise<RegisterWithPharmacyResponse> {
    return http.post<RegisterWithPharmacyResponse>(
      '/auth/register-pharmacy',
      data
    );
  },
};
