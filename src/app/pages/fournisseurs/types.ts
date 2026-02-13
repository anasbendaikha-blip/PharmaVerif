/**
 * PharmaVerif - Types et constantes pour la gestion des fournisseurs
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 */

import {
  Fournisseur,
  ConditionSpecifique,
  TypeFournisseur,
  TypeCondition,
  ConditionParametres,
} from '../../types';

// ---------------------------------------------------------------------------
// Form data types
// ---------------------------------------------------------------------------

export interface FournisseurFormData {
  nom: string;
  type_fournisseur: TypeFournisseur;
  notes: string;
  actif: boolean;
  remise_base: number;
  cooperation_commerciale: number;
  escompte: number;
  franco: number;
  remise_gamme_actif: boolean;
  remise_quantite_actif: boolean;
  rfa_actif: boolean;
}

export interface ConditionFormData {
  type_condition: TypeCondition;
  nom: string;
  description: string;
  parametres: ConditionParametres;
}

export interface SeuilRow {
  min: number;
  max?: number;
  taux: number;
}

export interface GammeRow {
  nom: string;
  taux: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TYPE_LABELS: Record<TypeFournisseur, string> = {
  grossiste: 'Grossiste',
  laboratoire: 'Laboratoire',
  autre: 'Autre',
};

export const CONDITION_LABELS: Record<TypeCondition, string> = {
  remise_volume: 'Remise volume',
  remise_gamme: 'Remise gamme',
  remise_produit: 'Remise produit',
  escompte_conditionnel: 'Escompte conditionnel',
  franco_seuil: 'Franco seuil',
  rfa: 'RFA',
  autre: 'Autre',
};

export const EMPTY_FORM: FournisseurFormData = {
  nom: '',
  type_fournisseur: 'grossiste',
  notes: '',
  actif: true,
  remise_base: 0,
  cooperation_commerciale: 0,
  escompte: 0,
  franco: 0,
  remise_gamme_actif: false,
  remise_quantite_actif: false,
  rfa_actif: false,
};

export const EMPTY_CONDITION: ConditionFormData = {
  type_condition: 'remise_volume',
  nom: '',
  description: '',
  parametres: {},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function typeBadgeClasses(type: TypeFournisseur): string {
  switch (type) {
    case 'grossiste':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'laboratoire':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

export function statusBadgeClasses(actif: boolean): string {
  return actif
    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
}

// Re-export types used by sub-components
export type { Fournisseur, ConditionSpecifique, TypeFournisseur, TypeCondition, ConditionParametres };
