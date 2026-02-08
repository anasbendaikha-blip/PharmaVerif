/**
 * PharmaVerif - Types TypeScript
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 * 
 * Définitions des types et interfaces pour l'application.
 */

// Modèle Grossiste
export interface Grossiste {
  id: number;
  nom: string; // unique
  remise_base: number; // taux de remise de base en %
  cooperation_commerciale: number; // taux coopération en %
  escompte: number; // taux escompte en %
  franco: number; // montant minimum sans frais de port
}

// Modèle Facture
export interface Facture {
  id: number;
  numero: string;
  date: string; // ISO date string
  grossiste_id: number; // foreign key vers Grossiste
  montant_brut_ht: number;
  remises_ligne_a_ligne: number;
  remises_pied_facture: number;
  net_a_payer: number;
  statut_verification: 'non_verifie' | 'conforme' | 'anomalie';
  created_at: string; // ISO datetime string
  // Relations
  grossiste?: Grossiste;
  lignes?: LigneFacture[];
  anomalies?: Anomalie[];
}

// Modèle LigneFacture (pour détail des lignes)
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

// Modèle Anomalie
export interface Anomalie {
  id: number;
  facture_id: number; // foreign key vers Facture
  type_anomalie: 'remise_manquante' | 'ecart_calcul' | 'remise_incorrecte' | 'prix_suspect' | 'franco_non_respecte';
  description: string;
  montant_ecart: number;
  created_at: string; // ISO datetime string
  // Relations
  facture?: Facture;
}

// Stats globales
export interface StatsGlobal {
  totalFactures: number;
  anomaliesDetectees: number;
  montantRecuperable: number;
  tauxConformite: number;
}