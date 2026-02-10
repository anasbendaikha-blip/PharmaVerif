/**
 * Client API pour consommer les endpoints
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import * as endpoints from './endpoints';
import { Fournisseur, Grossiste, ConditionSpecifique, Facture, Anomalie, TypeFournisseur } from '../types';

/**
 * Délai simulé pour imiter la latence réseau (100-300ms)
 */
function simulateNetworkDelay(): Promise<void> {
  const delay = 100 + Math.random() * 200;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Client API avec gestion d'erreurs
 */
export class ApiClient {
  // ==================== FOURNISSEURS ====================

  /**
   * GET /api/fournisseurs
   */
  static async getFournisseurs(type?: TypeFournisseur): Promise<Fournisseur[]> {
    await simulateNetworkDelay();
    const response = await endpoints.getFournisseurs(type);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la récupération des fournisseurs');
    }

    return response.data;
  }

  /**
   * GET /api/fournisseurs/{id}
   */
  static async getFournisseurById(id: number): Promise<Fournisseur> {
    await simulateNetworkDelay();
    const response = await endpoints.getFournisseurById(id);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la récupération du fournisseur');
    }

    return response.data;
  }

  /**
   * POST /api/fournisseurs
   */
  static async createFournisseur(data: Omit<Fournisseur, 'id' | 'created_at' | 'updated_at'>): Promise<Fournisseur> {
    await simulateNetworkDelay();
    const response = await endpoints.createFournisseur(data);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la création du fournisseur');
    }

    return response.data;
  }

  /**
   * PUT /api/fournisseurs/{id}
   */
  static async updateFournisseur(id: number, data: Partial<Omit<Fournisseur, 'id' | 'created_at'>>): Promise<Fournisseur> {
    await simulateNetworkDelay();
    const response = await endpoints.updateFournisseur(id, data);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la mise à jour du fournisseur');
    }

    return response.data;
  }

  /**
   * DELETE /api/fournisseurs/{id}
   */
  static async deleteFournisseur(id: number): Promise<{ message: string }> {
    await simulateNetworkDelay();
    const response = await endpoints.deleteFournisseur(id);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la suppression du fournisseur');
    }

    return response.data;
  }

  // ==================== CONDITIONS ====================

  /**
   * GET /api/fournisseurs/{id}/conditions
   */
  static async getConditions(fournisseurId: number): Promise<ConditionSpecifique[]> {
    await simulateNetworkDelay();
    const response = await endpoints.getConditions(fournisseurId);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la récupération des conditions');
    }

    return response.data;
  }

  /**
   * POST /api/conditions
   */
  static async createCondition(data: Omit<ConditionSpecifique, 'id' | 'created_at' | 'updated_at'>): Promise<ConditionSpecifique> {
    await simulateNetworkDelay();
    const response = await endpoints.createCondition(data);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la création de la condition');
    }

    return response.data;
  }

  /**
   * PUT /api/conditions/{id}
   */
  static async updateCondition(id: number, data: Partial<Omit<ConditionSpecifique, 'id' | 'created_at'>>): Promise<ConditionSpecifique> {
    await simulateNetworkDelay();
    const response = await endpoints.updateCondition(id, data);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la mise à jour de la condition');
    }

    return response.data;
  }

  /**
   * DELETE /api/conditions/{id}
   */
  static async deleteCondition(id: number): Promise<{ message: string }> {
    await simulateNetworkDelay();
    const response = await endpoints.deleteCondition(id);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la suppression de la condition');
    }

    return response.data;
  }

  // ==================== GROSSISTES (retrocompat) ====================

  /**
   * @deprecated Utiliser getFournisseurs('grossiste')
   */
  static async getGrossistes(): Promise<Grossiste[]> {
    return this.getFournisseurs('grossiste');
  }

  // ==================== FACTURES ====================

  /**
   * POST /api/factures
   */
  static async createFacture(data: {
    numero: string;
    date: string;
    fournisseur_id?: number;
    grossiste_id?: number;
    montant_brut_ht: number;
    remises_ligne_a_ligne: number;
    remises_pied_facture: number;
    net_a_payer: number;
  }): Promise<Facture> {
    await simulateNetworkDelay();
    const response = await endpoints.createFacture(data);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la création de la facture');
    }

    return response.data;
  }

  /**
   * POST /api/factures/{facture_id}/verify
   */
  static async verifyFacture(factureId: number): Promise<endpoints.VerifyFactureResponse> {
    await simulateNetworkDelay();
    const response = await endpoints.verifyFactureById(factureId);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la vérification de la facture');
    }

    return response.data;
  }

  /**
   * GET /api/factures
   */
  static async getFactures(): Promise<Facture[]> {
    await simulateNetworkDelay();
    const response = await endpoints.getFactures();

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la récupération des factures');
    }

    return response.data;
  }

  /**
   * GET /api/factures/{facture_id}
   */
  static async getFactureById(factureId: number): Promise<Facture> {
    await simulateNetworkDelay();
    const response = await endpoints.getFactureById(factureId);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la récupération de la facture');
    }

    return response.data;
  }

  /**
   * DELETE /api/factures/{facture_id}
   */
  static async deleteFacture(factureId: number): Promise<{ message: string }> {
    await simulateNetworkDelay();
    const response = await endpoints.deleteFacture(factureId);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la suppression de la facture');
    }

    return response.data;
  }

  /**
   * GET /api/stats
   */
  static async getStats(): Promise<endpoints.StatsResponse> {
    await simulateNetworkDelay();
    const response = await endpoints.getStats();

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la récupération des statistiques');
    }

    return response.data;
  }

  /**
   * GET /api/anomalies
   */
  static async getAnomalies(type?: string): Promise<Anomalie[]> {
    await simulateNetworkDelay();
    const response = await endpoints.getAnomalies(type);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la récupération des anomalies');
    }

    return response.data;
  }
}
