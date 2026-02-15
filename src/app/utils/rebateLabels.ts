/**
 * PharmaVerif - Utilitaire Labels Rebate Engine
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Labels partages pour les stages M0/M+1, methodes de paiement,
 * et couleurs de statut du Rebate Engine.
 */

// ========================================
// LABELS DES ETAPES (STAGES)
// ========================================

const STAGE_LABELS: Record<string, string> = {
  immediate: 'M0 — Remise directe sur facture',
  m1_rebate: 'M+1 — Remontee differee',
  m2_rebate: 'M+2 — Remontee differee',
  m3_rebate: 'M+3 — Remontee differee',
  annual_bonus: 'Prime annuelle (conditionnelle)',
  escompte: 'Escompte',
  rfa: 'RFA',
};

/**
 * Convertit un stage_id brut en label lisible.
 * Ex: "immediate" -> "M0 — Remise directe sur facture"
 *     "m1_rebate" -> "M+1 — Remontee differee"
 */
export function getStageLabel(stageId: string): string {
  if (STAGE_LABELS[stageId]) return STAGE_LABELS[stageId];
  // Fallback: detecter le pattern m{N}_rebate ou m{N}_*
  const match = stageId.match(/^m(\d+)/i);
  if (match) return `M+${match[1]} — Remontee differee`;
  // Dernier recours : retourner l'id tel quel avec majuscule
  return stageId.charAt(0).toUpperCase() + stageId.slice(1).replace(/_/g, ' ');
}

/**
 * Version courte du label (pour les tableaux compacts).
 * Ex: "immediate" -> "M0"
 *     "m1_rebate" -> "M+1"
 */
export function getStageLabelShort(stageId: string): string {
  const short: Record<string, string> = {
    immediate: 'M0',
    m1_rebate: 'M+1',
    m2_rebate: 'M+2',
    m3_rebate: 'M+3',
    annual_bonus: 'Prime annuelle',
    escompte: 'Escompte',
    rfa: 'RFA',
  };
  if (short[stageId]) return short[stageId];
  const match = stageId.match(/^m(\d+)/i);
  if (match) return `M+${match[1]}`;
  return stageId;
}

// ========================================
// LABELS DES METHODES DE PAIEMENT
// ========================================

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  invoice_deduction: 'Deduction facture',
  emac_transfer: 'Virement EMAC',
  year_end_transfer: 'Virement fin d\'annee',
  credit_note: 'Avoir',
};

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] || method;
}

/**
 * Icone Lucide associee a la methode de paiement.
 * Retourne le nom de l'icone pour usage conditionnel.
 */
export function getPaymentMethodIconName(method: string): 'CheckCircle2' | 'Clock' | 'Calendar' | 'FileText' {
  switch (method) {
    case 'invoice_deduction':
      return 'CheckCircle2';  // Recu immediatement
    case 'emac_transfer':
      return 'Clock';          // En attente
    case 'year_end_transfer':
      return 'Calendar';       // Annuel
    case 'credit_note':
      return 'FileText';       // Avoir
    default:
      return 'Clock';
  }
}

// ========================================
// COULEURS / VARIANTS DES STATUTS
// ========================================

export function getEntryStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'received':
    case 'recu':
      return 'success';
    case 'pending':
    case 'prevu':
      return 'info';
    case 'late':
    case 'en_retard':
      return 'error';
    case 'partial':
    case 'ecart':
      return 'warning';
    case 'conditional':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function getEntryStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: 'Recu',
    recu: 'Recu',
    pending: 'Prevu',
    prevu: 'Prevu',
    late: 'En retard',
    en_retard: 'En retard',
    partial: 'Partiel',
    ecart: 'Ecart',
    conditional: 'Conditionnel',
    not_applicable: 'N/A',
  };
  return labels[status] || status;
}

/**
 * Couleur CSS Tailwind pour un statut donne.
 * Pour usage dans les bg-*, text-*, border-*.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'received':
    case 'recu':
      return 'green';
    case 'pending':
    case 'prevu':
      return 'blue';
    case 'late':
    case 'en_retard':
      return 'red';
    case 'conditional':
      return 'amber';
    default:
      return 'gray';
  }
}
