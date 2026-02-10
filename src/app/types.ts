/**
 * PharmaVerif - Types TypeScript
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Définitions des types et interfaces pour l'application.
 */

// ==================== ENUMS / UNIONS ====================

export type TypeFournisseur = 'grossiste' | 'laboratoire' | 'autre';

export type TypeCondition =
  | 'remise_volume'
  | 'remise_gamme'
  | 'remise_produit'
  | 'escompte_conditionnel'
  | 'franco_seuil'
  | 'rfa'
  | 'autre';

export type NiveauSeverite = 'info' | 'warning' | 'erreur';

// ==================== CONDITION SPECIFIQUE ====================

export interface ConditionParametres {
  seuils?: Array<{ min: number; max?: number; taux: number }>;
  gammes?: Array<{ nom: string; taux: number }>;
  taux?: number;
  produits?: Array<{ cip: string; nom: string; taux: number }>;
  seuil_montant?: number;
  delai_jours?: number;
  objectif_annuel?: number;
  taux_rfa?: number;
  [key: string]: unknown;
}

export interface ConditionSpecifique {
  id: number;
  fournisseur_id: number;
  type_condition: TypeCondition;
  nom: string;
  description: string;
  parametres: ConditionParametres;
  actif: boolean;
  date_debut?: string;
  date_fin?: string;
  created_at: string;
  updated_at: string;
}

// ==================== FOURNISSEUR ====================

export interface Fournisseur {
  id: number;
  nom: string;
  type_fournisseur: TypeFournisseur;
  // Conditions de base (grossiste)
  remise_base: number;
  cooperation_commerciale: number;
  escompte: number;
  franco: number;
  // Activation labo
  remise_gamme_actif: boolean;
  remise_quantite_actif: boolean;
  rfa_actif: boolean;
  // Commun
  actif: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  // Relations
  conditions_specifiques?: ConditionSpecifique[];
}

/** @deprecated Utiliser Fournisseur */
export type Grossiste = Fournisseur;

// ==================== FACTURE ====================

export interface Facture {
  id: number;
  numero: string;
  date: string;
  fournisseur_id: number;
  /** @deprecated Utiliser fournisseur_id */
  grossiste_id?: number;
  montant_brut_ht: number;
  remises_ligne_a_ligne: number;
  remises_pied_facture: number;
  net_a_payer: number;
  statut_verification: 'non_verifie' | 'conforme' | 'anomalie';
  created_at: string;
  // Relations
  fournisseur?: Fournisseur;
  /** @deprecated Utiliser fournisseur */
  grossiste?: Fournisseur;
  lignes?: LigneFacture[];
  anomalies?: Anomalie[];
}

// ==================== LIGNE FACTURE ====================

export interface LigneFacture {
  id: number;
  facture_id: number;
  produit: string;
  cip: string;
  quantite: number;
  prix_unitaire: number;
  remise_appliquee: number;
  montant_ht: number;
}

// ==================== ANOMALIE ====================

export interface Anomalie {
  id: number;
  facture_id: number;
  type_anomalie:
    | 'remise_manquante'
    | 'ecart_calcul'
    | 'remise_incorrecte'
    | 'prix_suspect'
    | 'franco_non_respecte'
    | 'remise_volume_manquante'
    | 'condition_non_respectee'
    | 'rfa_non_appliquee';
  description: string;
  montant_ecart: number;
  niveau_severite: NiveauSeverite;
  condition_id?: number;
  created_at: string;
  // Relations
  facture?: Facture;
}

// ==================== STATS ====================

export interface StatsGlobal {
  totalFactures: number;
  anomaliesDetectees: number;
  montantRecuperable: number;
  tauxConformite: number;
}
