/**
 * PharmaVerif - Barre de progression RFA
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Barre de progression vers le prochain palier RFA.
 */

import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatNumber';
import type { RFAProgressionResponse } from '../../api/types';

interface RfaProgressionBarProps {
  rfaProgression: RFAProgressionResponse;
}

export function RfaProgressionBar({ rfaProgression }: RfaProgressionBarProps) {
  if (!rfaProgression.palier_suivant) return null;

  return (
    <div className="px-6 pb-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Progression RFA {rfaProgression.annee}
      </h3>
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Cumul achats : <strong className="text-gray-900 dark:text-white">{formatCurrency(rfaProgression.cumul_achats_ht)}</strong>
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            RFA estimee : <strong className="text-blue-600 dark:text-blue-400">{formatCurrency(rfaProgression.rfa_estimee_annuelle)}</strong>
            {' '}({rfaProgression.taux_rfa_actuel.toFixed(1)}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, rfaProgression.progression_pct)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
            {rfaProgression.progression_pct.toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Palier actuel : {rfaProgression.palier_actuel
              ? `${rfaProgression.palier_actuel.description || rfaProgression.palier_actuel.taux_rfa + '%'}`
              : 'Aucun'}
          </span>
          <span>
            Prochain : {rfaProgression.palier_suivant.description || rfaProgression.palier_suivant.taux_rfa + '%'}
            {' '}(reste {formatCurrency(rfaProgression.montant_restant_prochain_palier || 0)})
          </span>
        </div>
      </div>
    </div>
  );
}
