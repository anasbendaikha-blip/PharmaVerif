/**
 * PharmaVerif - Module API Historique des Prix
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * API-only — necessite le backend FastAPI.
 * Historique des prix, comparaison fournisseurs, alertes et economies.
 */

import { http } from './httpClient';
import type {
  HistoriquePrixListResponse,
  ComparaisonProduitResponse,
  TopProduitsResponse,
  AlertesPrixResponse,
  EconomiesPotentiellesResponse,
  RechercheProduitResponse,
} from './types';

// ========================================
// API HISTORIQUE PRIX
// ========================================

export const historiquePrixApi = {
  /**
   * Historique des prix pour un produit (CIP13)
   *
   * GET /api/v1/prix/historique/{cip13}
   */
  async getHistorique(
    cip13: string,
    params?: {
      laboratoire_id?: number;
      date_debut?: string;
      date_fin?: string;
    }
  ): Promise<HistoriquePrixListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.laboratoire_id) searchParams.set('laboratoire_id', String(params.laboratoire_id));
    if (params?.date_debut) searchParams.set('date_debut', params.date_debut);
    if (params?.date_fin) searchParams.set('date_fin', params.date_fin);
    const query = searchParams.toString();
    return http.get<HistoriquePrixListResponse>(
      `/prix/historique/${cip13}${query ? `?${query}` : ''}`
    );
  },

  /**
   * Comparaison multi-fournisseurs pour un produit
   *
   * GET /api/v1/prix/comparaison?cip13=...
   */
  async getComparaison(
    cip13: string,
    annee?: number
  ): Promise<ComparaisonProduitResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('cip13', cip13);
    if (annee) searchParams.set('annee', String(annee));
    return http.get<ComparaisonProduitResponse>(
      `/prix/comparaison?${searchParams.toString()}`
    );
  },

  /**
   * Top produits par volume ou montant
   *
   * GET /api/v1/prix/top-produits
   */
  async getTopProduits(params?: {
    critere?: 'montant' | 'quantite';
    limit?: number;
    laboratoire_id?: number;
    annee?: number;
  }): Promise<TopProduitsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.critere) searchParams.set('critere', params.critere);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.laboratoire_id) searchParams.set('laboratoire_id', String(params.laboratoire_id));
    if (params?.annee) searchParams.set('annee', String(params.annee));
    const query = searchParams.toString();
    return http.get<TopProduitsResponse>(
      `/prix/top-produits${query ? `?${query}` : ''}`
    );
  },

  /**
   * Alertes prix (hausses, concurrent moins cher, conditions expirant)
   *
   * GET /api/v1/prix/alertes
   */
  async getAlertes(params?: {
    laboratoire_id?: number;
    seuil_hausse_pct?: number;
    seuil_concurrent_pct?: number;
  }): Promise<AlertesPrixResponse> {
    const searchParams = new URLSearchParams();
    if (params?.laboratoire_id) searchParams.set('laboratoire_id', String(params.laboratoire_id));
    if (params?.seuil_hausse_pct) searchParams.set('seuil_hausse_pct', String(params.seuil_hausse_pct));
    if (params?.seuil_concurrent_pct) searchParams.set('seuil_concurrent_pct', String(params.seuil_concurrent_pct));
    const query = searchParams.toString();
    return http.get<AlertesPrixResponse>(
      `/prix/alertes${query ? `?${query}` : ''}`
    );
  },

  /**
   * Economies potentielles en changeant de fournisseur
   *
   * GET /api/v1/prix/economies-potentielles
   */
  async getEconomiesPotentielles(params?: {
    laboratoire_id?: number;
    annee?: number;
    seuil_ecart_pct?: number;
  }): Promise<EconomiesPotentiellesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.laboratoire_id) searchParams.set('laboratoire_id', String(params.laboratoire_id));
    if (params?.annee) searchParams.set('annee', String(params.annee));
    if (params?.seuil_ecart_pct) searchParams.set('seuil_ecart_pct', String(params.seuil_ecart_pct));
    const query = searchParams.toString();
    return http.get<EconomiesPotentiellesResponse>(
      `/prix/economies-potentielles${query ? `?${query}` : ''}`
    );
  },

  /**
   * Rechercher des produits dans l'historique
   *
   * GET /api/v1/prix/recherche?q=...
   */
  async recherche(
    q: string,
    limit?: number
  ): Promise<RechercheProduitResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', q);
    if (limit) searchParams.set('limit', String(limit));
    return http.get<RechercheProduitResponse>(
      `/prix/recherche?${searchParams.toString()}`
    );
  },
};
