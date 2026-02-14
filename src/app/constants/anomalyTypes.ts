/**
 * PharmaVerif - Constantes des types d'anomalies
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Source unique de verite pour les labels, icones, couleurs et actions suggerees
 * de chaque type d'anomalie. Couvre les deux systemes :
 *  - Anomalies grossiste (frontend localStorage) : type_anomalie de src/app/types.ts
 *  - Anomalies labo (backend API) : TypeAnomalieLabo de src/app/api/types.ts
 *  - Anomalies EMAC (backend API) : TypeAnomalieEMAC de src/app/api/types.ts
 *
 * Utilisation :
 *   import { ANOMALIE_META, SEVERITE_META, getAnomalieMeta } from '@/constants/anomalyTypes';
 */

import {
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Calculator,
  ShieldAlert,
  Package,
  FileX,
  Percent,
  Receipt,
  Scale,
  Clock,
  Gift,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';

// ========================================
// SEVERITE
// ========================================

export interface SeveriteMeta {
  label: string;
  labelShort: string;
  color: string;          // Tailwind text color
  bgColor: string;        // Tailwind bg color
  borderColor: string;    // Tailwind border color
  darkBgColor: string;    // Tailwind dark bg
  darkTextColor: string;  // Tailwind dark text
  dotColor: string;       // pour StatusBadge
  priority: number;       // tri : 1 = plus critique
}

/**
 * Metadata de severite — couvre les deux nomenclatures :
 *  - Frontend : 'erreur' | 'warning' | 'info'
 *  - Backend  : 'critical' | 'opportunity' | 'info'
 */
export const SEVERITE_META: Record<string, SeveriteMeta> = {
  // Frontend (grossiste)
  erreur: {
    label: 'Erreur',
    labelShort: 'Élevée',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    darkBgColor: 'dark:bg-red-900/20',
    darkTextColor: 'dark:text-red-400',
    dotColor: 'bg-red-500',
    priority: 1,
  },
  // Backend (labo/EMAC)
  critical: {
    label: 'Critique',
    labelShort: 'Critique',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    darkBgColor: 'dark:bg-red-900/20',
    darkTextColor: 'dark:text-red-400',
    dotColor: 'bg-red-500',
    priority: 1,
  },
  warning: {
    label: 'Avertissement',
    labelShort: 'Moyenne',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    darkBgColor: 'dark:bg-orange-900/20',
    darkTextColor: 'dark:text-orange-400',
    dotColor: 'bg-orange-500',
    priority: 2,
  },
  opportunity: {
    label: 'Opportunité',
    labelShort: 'Opportunité',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    darkBgColor: 'dark:bg-amber-900/20',
    darkTextColor: 'dark:text-amber-400',
    dotColor: 'bg-amber-500',
    priority: 2,
  },
  info: {
    label: 'Information',
    labelShort: 'Faible',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    darkBgColor: 'dark:bg-blue-900/20',
    darkTextColor: 'dark:text-blue-400',
    dotColor: 'bg-blue-500',
    priority: 3,
  },
};

// ========================================
// ANOMALIE METADATA
// ========================================

export interface AnomalieMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  actionSuggeree: string;
  categorie: 'remise' | 'prix' | 'calcul' | 'condition' | 'rfa' | 'emac' | 'autre';
}

/**
 * Metadata pour chaque type d'anomalie — couvre les 3 systemes :
 *  - Grossiste : remise_manquante, ecart_calcul, etc.
 *  - Labo : remise_ecart, escompte_manquant, etc.
 *  - EMAC : ecart_ca, ecart_rfa, ecart_cop, etc.
 */
export const ANOMALIE_META: Record<string, AnomalieMeta> = {
  // ---- Anomalies Grossiste (frontend) ----
  remise_manquante: {
    label: 'Remise manquante',
    description: 'Une remise prevue par les conditions commerciales n\'a pas ete appliquee.',
    icon: TrendingDown,
    actionSuggeree: 'Verifier les conditions et contacter le grossiste pour regularisation.',
    categorie: 'remise',
  },
  remise_incorrecte: {
    label: 'Remise incorrecte',
    description: 'Le taux de remise applique differe du taux convenu.',
    icon: AlertTriangle,
    actionSuggeree: 'Comparer avec le bareme contractuel et demander un avoir.',
    categorie: 'remise',
  },
  ecart_calcul: {
    label: 'Écart de calcul',
    description: 'Une erreur arithmetique a ete detectee sur la facture.',
    icon: Calculator,
    actionSuggeree: 'Verifier les calculs ligne par ligne et signaler l\'erreur.',
    categorie: 'calcul',
  },
  prix_suspect: {
    label: 'Prix suspect',
    description: 'Le prix unitaire semble anormal par rapport a l\'historique.',
    icon: DollarSign,
    actionSuggeree: 'Comparer avec l\'historique des prix et demander justification.',
    categorie: 'prix',
  },
  franco_non_respecte: {
    label: 'Franco non respecté',
    description: 'Le seuil de franco de port n\'a pas ete atteint mais les frais ne sont pas factures.',
    icon: ShieldAlert,
    actionSuggeree: 'Verifier le montant de la commande vs le seuil de franco.',
    categorie: 'condition',
  },
  remise_volume_manquante: {
    label: 'Remise volume manquante',
    description: 'La remise liee au volume d\'achat n\'a pas ete appliquee.',
    icon: Package,
    actionSuggeree: 'Verifier le cumul des achats et appliquer le palier correspondant.',
    categorie: 'remise',
  },
  condition_non_respectee: {
    label: 'Condition non respectée',
    description: 'Une condition commerciale specifique n\'a pas ete respectee.',
    icon: ShieldAlert,
    actionSuggeree: 'Revoir les termes du contrat et contacter le fournisseur.',
    categorie: 'condition',
  },
  rfa_non_appliquee: {
    label: 'RFA non appliquée',
    description: 'La remise de fin d\'annee prevue n\'a pas ete creditee.',
    icon: FileX,
    actionSuggeree: 'Verifier le cumul annuel et envoyer une demande de versement de RFA.',
    categorie: 'rfa',
  },

  // ---- Anomalies Labo (backend API) ----
  remise_ecart: {
    label: 'Écart de remise',
    description: 'Le taux de remise applique ne correspond pas aux conditions de l\'accord.',
    icon: Percent,
    actionSuggeree: 'Comparer le taux facture avec l\'accord commercial et demander regularisation.',
    categorie: 'remise',
  },
  escompte_manquant: {
    label: 'Escompte manquant',
    description: 'L\'escompte pour paiement rapide n\'a pas ete applique.',
    icon: Clock,
    actionSuggeree: 'Verifier le delai de paiement et reclamer l\'escompte convenu.',
    categorie: 'condition',
  },
  franco_seuil: {
    label: 'Seuil de franco',
    description: 'La commande est sous le seuil de franco de port.',
    icon: ShieldAlert,
    actionSuggeree: 'Regrouper les commandes pour atteindre le franco ou negocier les frais.',
    categorie: 'condition',
  },
  rfa_palier: {
    label: 'Palier RFA',
    description: 'Le palier de RFA applique ne correspond pas au cumul d\'achats.',
    icon: BarChart3,
    actionSuggeree: 'Verifier le cumul annuel et le palier RFA correspondant.',
    categorie: 'rfa',
  },
  gratuite_manquante: {
    label: 'Gratuité manquante',
    description: 'Les unites gratuites prevues n\'ont pas ete livrées.',
    icon: Gift,
    actionSuggeree: 'Verifier les quantites commandees et reclamer les gratuites.',
    categorie: 'condition',
  },
  tva_incoherence: {
    label: 'Incohérence TVA',
    description: 'Le taux de TVA applique semble incorrect pour ce produit.',
    icon: Receipt,
    actionSuggeree: 'Verifier la categorie du produit et le taux de TVA applicable.',
    categorie: 'calcul',
  },
  calcul_arithmetique: {
    label: 'Erreur arithmétique',
    description: 'Une erreur de calcul a ete detectee sur une ligne ou un total.',
    icon: Calculator,
    actionSuggeree: 'Recalculer manuellement et signaler l\'ecart au laboratoire.',
    categorie: 'calcul',
  },

  // ---- Anomalies EMAC (backend API) ----
  ecart_ca: {
    label: 'Écart CA',
    description: 'Le chiffre d\'affaires declare dans l\'EMAC differe du cumul des factures.',
    icon: Scale,
    actionSuggeree: 'Rapprocher le CA EMAC avec le cumul des factures de la periode.',
    categorie: 'emac',
  },
  ecart_rfa: {
    label: 'Écart RFA',
    description: 'La RFA declaree dans l\'EMAC differe du montant calcule.',
    icon: BarChart3,
    actionSuggeree: 'Recalculer la RFA selon les paliers et contester l\'ecart.',
    categorie: 'emac',
  },
  ecart_cop: {
    label: 'Écart COP',
    description: 'La cooperation commerciale declaree ne correspond pas aux conditions.',
    icon: Receipt,
    actionSuggeree: 'Verifier les engagements COP et demander une justification.',
    categorie: 'emac',
  },
  emac_manquant: {
    label: 'EMAC manquant',
    description: 'Aucun EMAC recu pour une periode avec des factures.',
    icon: FileX,
    actionSuggeree: 'Contacter le laboratoire pour demander l\'envoi de l\'EMAC.',
    categorie: 'emac',
  },
  montant_non_verse: {
    label: 'Montant non versé',
    description: 'Un montant declare dans l\'EMAC n\'a pas ete effectivement verse.',
    icon: DollarSign,
    actionSuggeree: 'Relancer le laboratoire pour le versement du solde.',
    categorie: 'emac',
  },
  condition_non_appliquee: {
    label: 'Condition non appliquée',
    description: 'Une condition prevue dans l\'accord n\'apparait pas dans l\'EMAC.',
    icon: ShieldAlert,
    actionSuggeree: 'Comparer l\'EMAC avec l\'accord commercial et demander correction.',
    categorie: 'emac',
  },
  calcul_incoherent: {
    label: 'Calcul incohérent',
    description: 'Les totaux de l\'EMAC ne sont pas coherents entre eux.',
    icon: Calculator,
    actionSuggeree: 'Verifier l\'addition des lignes et signaler l\'incoherence.',
    categorie: 'emac',
  },
};

// ========================================
// HELPERS
// ========================================

/**
 * Recupere la metadata d'un type d'anomalie (avec fallback)
 */
export function getAnomalieMeta(typeAnomalie: string): AnomalieMeta {
  return ANOMALIE_META[typeAnomalie] ?? {
    label: typeAnomalie.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
    description: 'Anomalie detectee lors de la verification.',
    icon: AlertTriangle,
    actionSuggeree: 'Verifier manuellement et contacter le fournisseur si necessaire.',
    categorie: 'autre' as const,
  };
}

/**
 * Recupere la metadata de severite (avec fallback)
 */
export function getSeveriteMeta(severite: string): SeveriteMeta {
  return SEVERITE_META[severite] ?? SEVERITE_META.info;
}

/**
 * Labels simples pour les filtres / selects (retrocompatible)
 */
export const ANOMALIE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ANOMALIE_META).map(([key, meta]) => [key, meta.label])
);

/**
 * Labels simples de severite (retrocompatible)
 */
export const SEVERITE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(SEVERITE_META).map(([key, meta]) => [key, meta.label])
);
