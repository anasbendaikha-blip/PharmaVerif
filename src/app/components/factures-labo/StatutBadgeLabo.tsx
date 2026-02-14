/**
 * PharmaVerif - Badge statut facture labo
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { BarChart3, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { PILL_STYLES, getFactureLaboStatut } from '../../utils/statusColors';

const STATUT_CONFIG: Record<string, { icon: typeof BarChart3; label: string }> = {
  analysee: { icon: BarChart3, label: 'Analysée' },
  conforme: { icon: CheckCircle2, label: 'Conforme' },
  ecart_rfa: { icon: AlertTriangle, label: 'Écart RFA' },
  verifiee: { icon: CheckCircle2, label: 'Vérifiée' },
};

export function StatutBadgeLabo({ statut }: { statut: string }) {
  const config = STATUT_CONFIG[statut];
  const Icon = config?.icon || Clock;
  const label = config?.label || 'Non vérifié';
  const color = getFactureLaboStatut(statut);

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${PILL_STYLES[color]}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
