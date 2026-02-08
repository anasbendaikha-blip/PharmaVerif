/**
 * Client API pour consommer les endpoints
 * Simule des appels HTTP avec Promise pour reproduire le comportement asynchrone
 */

import * as endpoints from './endpoints';
import { Grossiste, Facture, Anomalie } from '../types';

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
  /**
   * GET /api/grossistes
   */
  static async getGrossistes(): Promise<Grossiste[]> {
    await simulateNetworkDelay();
    const response = await endpoints.getGrossistes();

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erreur lors de la récupération des grossistes');
    }

    return response.data;
  }

  /**
   * POST /api/factures
   */
  static async createFacture(data: {
    numero: string;
    date: string;
    grossiste_id: number;
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
