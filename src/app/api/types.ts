/**
 * PharmaVerif - Types pour l'API backend
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Ces types mirrorent les schémas Pydantic du backend FastAPI.
 * Séparé de src/app/types.ts (types frontend localStorage).
 */

// ========================================
// AUTHENTIFICATION
// ========================================

export interface BackendUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: 'admin' | 'pharmacien' | 'comptable' | 'lecture';
  actif: boolean;
  created_at: string;
  last_login: string | null;
}

export interface BackendToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: BackendUser;
  token: BackendToken;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role?: string;
  actif?: boolean;
}

// ========================================
// LABORATOIRES
// ========================================

export interface LaboratoireResponse {
  id: number;
  nom: string;
  type: string;
  actif: boolean;
  created_at: string;
}

// ========================================
// FACTURES LABORATOIRES
// ========================================

export interface LigneFactureLaboResponse {
  id: number;
  facture_id: number;
  cip13: string;
  designation: string;
  numero_lot: string | null;
  quantite: number;
  prix_unitaire_ht: number;
  remise_pct: number;
  prix_unitaire_apres_remise: number;
  montant_ht: number;
  taux_tva: number;
  montant_brut: number;
  montant_remise: number;
  categorie: string | null;
  tranche: string | null;
  created_at: string;
}

export interface FactureLaboResponse {
  id: number;
  user_id: number;
  laboratoire_id: number;
  numero_facture: string;
  date_facture: string;
  date_commande: string | null;
  date_livraison: string | null;
  numero_client: string | null;
  nom_client: string | null;
  montant_brut_ht: number;
  total_remise_facture: number;
  montant_net_ht: number;
  montant_ttc: number | null;
  tranche_a_brut: number;
  tranche_a_remise: number;
  tranche_a_pct_reel: number;
  tranche_b_brut: number;
  tranche_b_remise: number;
  tranche_b_pct_reel: number;
  otc_brut: number;
  otc_remise: number;
  rfa_attendue: number;
  rfa_recue: number | null;
  ecart_rfa: number | null;
  nb_lignes: number;
  nb_pages: number;
  statut: 'non_verifie' | 'analysee' | 'conforme' | 'ecart_rfa';
  created_at: string;
  warnings: string[] | null;
  laboratoire?: LaboratoireResponse | null;
  lignes: LigneFactureLaboResponse[];
}

export interface FactureLaboListResponse {
  factures: FactureLaboResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ========================================
// ANALYSE TRANCHES / REMISES
// ========================================

export interface AnalyseTrancheResponse {
  tranche: string;
  montant_brut: number;
  montant_remise: number;
  taux_remise_reel: number;
  taux_remise_cible: number;
  ecart_taux: number;
  rfa_attendue: number;
  nb_lignes: number;
  pct_ca: number;
}

export interface AnalyseRemiseResponse {
  tranches: AnalyseTrancheResponse[];
  rfa_totale_attendue: number;
  rfa_recue: number | null;
  ecart_rfa: number | null;
  montant_brut_total: number;
  montant_remise_total: number;
  taux_remise_global: number;
}

// ========================================
// FOURNISSEUR DÉTECTÉ
// ========================================

export interface FournisseurDetecte {
  nom: string;
  type: string;
  detecte_auto: boolean;
  parser_id: string;
  confiance: number;
}

// ========================================
// UPLOAD
// ========================================

export interface UploadLaboResponse {
  success: boolean;
  message: string;
  facture: FactureLaboResponse | null;
  analyse: AnalyseRemiseResponse | null;
  fournisseur: FournisseurDetecte | null;
  warnings: string[] | null;
}

// ========================================
// RFA
// ========================================

export interface RFAUpdateResponse {
  facture_id: number;
  rfa_attendue: number;
  rfa_recue: number;
  ecart_rfa: number;
  statut: string;
  message: string;
}

// ========================================
// GÉNÉRIQUES
// ========================================

export interface MessageResponse {
  message: string;
  success: boolean;
}
