/**
 * PharmaVerif - Module API Rebate Engine
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * API-only — pas de fallback localStorage.
 * CRUD Templates, Agreements, Schedules, Preview, Dashboard, Audit, Stats.
 */

import { http } from './httpClient';
import type {
  RebateTemplateResponse,
  LaboratoryAgreementResponse,
  LaboratoryAgreementCreateRequest,
  LaboratoryAgreementUpdateRequest,
  AgreementVersionHistoryResponse,
  InvoiceRebateScheduleResponse,
  PreviewRequest,
  PreviewResponse,
  MonthlyRebateDashboardResponse,
  ConditionalBonusDashboardResponse,
  AgreementAuditLogResponse,
  RebateStatsResponse,
  MessageResponse,
} from './types';

// ========================================
// TYPES LOCAUX
// ========================================

export interface AgreementsListParams {
  laboratoire_id?: number;
  statut?: string;
  skip?: number;
  limit?: number;
}

export interface SchedulesListParams {
  agreement_id?: number;
  statut?: string;
  skip?: number;
  limit?: number;
}

export interface TemplateCreateRequest {
  name: string;
  description?: string | null;
  template_type?: string;
  laboratoire_nom: string;
  structure: Record<string, unknown>;
  tiers?: Record<string, unknown>[];
  taux_escompte?: number;
  delai_escompte_jours?: number;
  taux_cooperation?: number;
  gratuites_ratio?: string | null;
  gratuites_seuil_qte?: number;
  scope?: string;
}

export interface TemplateUpdateRequest {
  name?: string;
  description?: string | null;
  structure?: Record<string, unknown>;
  tiers?: Record<string, unknown>[];
  taux_escompte?: number;
  taux_cooperation?: number;
  actif?: boolean;
}

// ========================================
// API REBATE ENGINE
// ========================================

export const rebateApi = {
  // ------------------------------------------
  // TEMPLATES
  // ------------------------------------------

  /**
   * Liste tous les templates de remise
   *
   * GET /api/v1/rebate/templates
   */
  async listTemplates(activeOnly?: boolean): Promise<RebateTemplateResponse[]> {
    const params = activeOnly !== undefined ? `?actif=${activeOnly}` : '';
    return http.get<RebateTemplateResponse[]>(`/rebate/templates${params}`);
  },

  /**
   * Detail d'un template par ID
   *
   * GET /api/v1/rebate/templates/{id}
   */
  async getTemplate(id: number): Promise<RebateTemplateResponse> {
    return http.get<RebateTemplateResponse>(`/rebate/templates/${id}`);
  },

  /**
   * Creer un nouveau template
   *
   * POST /api/v1/rebate/templates
   */
  async createTemplate(data: TemplateCreateRequest): Promise<RebateTemplateResponse> {
    return http.post<RebateTemplateResponse>('/rebate/templates', data);
  },

  /**
   * Modifier un template
   *
   * PUT /api/v1/rebate/templates/{id}
   */
  async updateTemplate(id: number, data: TemplateUpdateRequest): Promise<RebateTemplateResponse> {
    return http.put<RebateTemplateResponse>(`/rebate/templates/${id}`, data);
  },

  /**
   * Supprimer un template
   *
   * DELETE /api/v1/rebate/templates/{id}
   */
  async deleteTemplate(id: number): Promise<MessageResponse> {
    return http.delete<MessageResponse>(`/rebate/templates/${id}`);
  },

  // ------------------------------------------
  // AGREEMENTS (Accords commerciaux)
  // ------------------------------------------

  /**
   * Liste les accords avec filtres optionnels
   *
   * GET /api/v1/rebate/agreements
   */
  async listAgreements(params?: AgreementsListParams): Promise<LaboratoryAgreementResponse[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return http.get<LaboratoryAgreementResponse[]>(
      `/rebate/agreements${query ? `?${query}` : ''}`
    );
  },

  /**
   * Detail d'un accord par ID
   *
   * GET /api/v1/rebate/agreements/{id}
   */
  async getAgreement(id: number): Promise<LaboratoryAgreementResponse> {
    return http.get<LaboratoryAgreementResponse>(`/rebate/agreements/${id}`);
  },

  /**
   * Creer un nouvel accord
   *
   * POST /api/v1/rebate/agreements
   */
  async createAgreement(data: LaboratoryAgreementCreateRequest): Promise<LaboratoryAgreementResponse> {
    return http.post<LaboratoryAgreementResponse>('/rebate/agreements', data);
  },

  /**
   * Modifier un accord (versionne si actif)
   *
   * PUT /api/v1/rebate/agreements/{id}
   */
  async updateAgreement(id: number, data: LaboratoryAgreementUpdateRequest): Promise<LaboratoryAgreementResponse> {
    return http.put<LaboratoryAgreementResponse>(`/rebate/agreements/${id}`, data);
  },

  /**
   * Activer un accord (passe de brouillon a actif)
   *
   * POST /api/v1/rebate/agreements/{id}/activate
   */
  async activateAgreement(id: number): Promise<LaboratoryAgreementResponse> {
    return http.post<LaboratoryAgreementResponse>(`/rebate/agreements/${id}/activate`, {});
  },

  /**
   * Historique des versions d'un accord
   *
   * GET /api/v1/rebate/agreements/{id}/history
   */
  async getAgreementHistory(id: number): Promise<AgreementVersionHistoryResponse> {
    return http.get<AgreementVersionHistoryResponse>(`/rebate/agreements/${id}/history`);
  },

  /**
   * Supprimer un accord (brouillon uniquement)
   *
   * DELETE /api/v1/rebate/agreements/{id}
   */
  async deleteAgreement(id: number): Promise<MessageResponse> {
    return http.delete<MessageResponse>(`/rebate/agreements/${id}`);
  },

  // ------------------------------------------
  // SCHEDULES (Calendriers de remises)
  // ------------------------------------------

  /**
   * Calculer le calendrier de remises pour une facture
   *
   * POST /api/v1/rebate/invoices/{id}/schedule
   */
  async calculateSchedule(factureId: number): Promise<InvoiceRebateScheduleResponse> {
    return http.post<InvoiceRebateScheduleResponse>(`/rebate/invoices/${factureId}/schedule`, {});
  },

  /**
   * Obtenir le calendrier existant pour une facture
   *
   * GET /api/v1/rebate/invoices/{id}/schedule
   */
  async getScheduleByInvoice(factureId: number): Promise<InvoiceRebateScheduleResponse> {
    return http.get<InvoiceRebateScheduleResponse>(`/rebate/invoices/${factureId}/schedule`);
  },

  /**
   * Lister tous les calendriers avec filtres
   *
   * GET /api/v1/rebate/schedules
   */
  async listSchedules(params?: SchedulesListParams): Promise<InvoiceRebateScheduleResponse[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return http.get<InvoiceRebateScheduleResponse[]>(
      `/rebate/schedules${query ? `?${query}` : ''}`
    );
  },

  /**
   * Forcer le recalcul du calendrier pour une facture
   *
   * POST /api/v1/rebate/invoices/{id}/force-recalcul
   */
  async forceRecalculate(factureId: number): Promise<InvoiceRebateScheduleResponse> {
    return http.post<InvoiceRebateScheduleResponse>(`/rebate/invoices/${factureId}/force-recalcul`, {});
  },

  // ------------------------------------------
  // PREVIEW (Previsualisation)
  // ------------------------------------------

  /**
   * Previsualiser un accord sans le persister
   *
   * POST /api/v1/rebate/preview
   */
  async preview(data: PreviewRequest): Promise<PreviewResponse> {
    return http.post<PreviewResponse>('/rebate/preview', data);
  },

  // ------------------------------------------
  // DASHBOARD
  // ------------------------------------------

  /**
   * Dashboard mensuel des remises attendues
   *
   * GET /api/v1/rebate/dashboard/monthly
   */
  async getDashboardMonthly(month?: string): Promise<MonthlyRebateDashboardResponse> {
    const params = month ? `?month=${month}` : '';
    return http.get<MonthlyRebateDashboardResponse>(`/rebate/dashboard/monthly${params}`);
  },

  /**
   * Dashboard des primes conditionnelles
   *
   * GET /api/v1/rebate/dashboard/conditional-bonuses
   */
  async getConditionalBonuses(year?: number): Promise<ConditionalBonusDashboardResponse> {
    const params = year ? `?year=${year}` : '';
    return http.get<ConditionalBonusDashboardResponse>(
      `/rebate/dashboard/conditional-bonuses${params}`
    );
  },

  // ------------------------------------------
  // AUDIT
  // ------------------------------------------

  /**
   * Journal d'audit pour un accord
   *
   * GET /api/v1/rebate/agreements/{id}/audit
   */
  async getAuditLogs(agreementId: number): Promise<AgreementAuditLogResponse[]> {
    return http.get<AgreementAuditLogResponse[]>(`/rebate/agreements/${agreementId}/audit`);
  },

  // ------------------------------------------
  // STATS
  // ------------------------------------------

  /**
   * Statistiques globales du Rebate Engine
   *
   * GET /api/v1/rebate/stats
   */
  async getStats(): Promise<RebateStatsResponse> {
    return http.get<RebateStatsResponse>('/rebate/stats');
  },
};
