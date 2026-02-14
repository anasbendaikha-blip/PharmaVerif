/**
 * PharmaVerif - Analyse par tranche + résumé financier
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Affiche le résumé financier (brut, remises, net, RFA)
 * et la ventilation par tranche A/B/OTC.
 */

import { Loader2 } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../utils/formatNumber';
import type { FactureLaboResponse, AnalyseRemiseResponse } from '../../api/types';

interface RecalcTotals {
  brut: number;
  remise: number;
  net: number;
}

interface FinancialSummaryProps {
  facture: FactureLaboResponse;
  recalcTotals: RecalcTotals | null;
}

/**
 * Résumé financier : 4 cards (brut, remises, net, RFA)
 * avec comparaison lignes recalculées si écart détecté.
 */
export function FinancialSummary({ facture, recalcTotals }: FinancialSummaryProps) {
  return (
    <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400">Montant brut HT</p>
        <p className="text-lg font-bold dark:text-white">
          {formatCurrency(facture.montant_brut_ht)}
        </p>
        {recalcTotals && Math.abs(recalcTotals.brut - facture.montant_brut_ht) > 0.05 && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5" title="Somme recalculée depuis les lignes">
            Lignes : {formatCurrency(recalcTotals.brut)}
          </p>
        )}
      </div>
      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400">Total remises</p>
        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
          {formatCurrency(facture.total_remise_facture)}
        </p>
        {recalcTotals && Math.abs(recalcTotals.remise - facture.total_remise_facture) > 0.05 && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5" title="Somme recalculée depuis les lignes">
            Lignes : {formatCurrency(recalcTotals.remise)}
          </p>
        )}
      </div>
      <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400">Net HT</p>
        <p className="text-lg font-bold dark:text-white">
          {formatCurrency(facture.montant_net_ht)}
        </p>
        {recalcTotals && Math.abs(recalcTotals.net - facture.montant_net_ht) > 0.05 && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5" title="Somme recalculée depuis les lignes">
            Lignes : {formatCurrency(recalcTotals.net)}
          </p>
        )}
      </div>
      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400">RFA attendue</p>
        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {formatCurrency(facture.rfa_attendue)}
        </p>
      </div>
    </div>
  );
}

interface AnalyseTrancheSectionProps {
  analyse: AnalyseRemiseResponse | null;
  isLoading: boolean;
}

/**
 * Analyse par tranche A/B/OTC avec totaux.
 */
export function AnalyseTrancheSection({ analyse, isLoading }: AnalyseTrancheSectionProps) {
  return (
    <div className="px-6 pb-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Analyse par tranche
      </h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : analyse ? (
        <div className="space-y-2">
          {analyse.tranches.map((t) => (
            <div
              key={t.tranche}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-700 dark:text-gray-300 w-16">
                  {t.tranche === 'A' ? 'Tranche A' : t.tranche === 'B' ? 'Tranche B' : 'OTC'}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {t.nb_lignes} lignes • {formatPercentage(t.pct_ca, 2)} du CA
                </span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-xs text-gray-400">Brut</p>
                  <p className="font-medium dark:text-white">{formatCurrency(t.montant_brut)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Remise</p>
                  <p className="font-medium dark:text-white">{formatCurrency(t.montant_remise)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Taux réel</p>
                  <p className={`font-medium ${
                    Math.abs(t.ecart_taux) > 2
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {formatPercentage(t.taux_remise_reel, 2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Cible</p>
                  <p className="font-medium text-gray-500 dark:text-gray-400">
                    {formatPercentage(t.taux_remise_cible, 2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">RFA</p>
                  <p className="font-medium text-blue-600 dark:text-blue-400">
                    {formatCurrency(t.rfa_attendue)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm font-semibold border border-blue-200 dark:border-blue-800">
            <span className="text-blue-700 dark:text-blue-300">TOTAL</span>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="dark:text-white">
                  {formatCurrency(analyse.montant_brut_total)}
                </p>
              </div>
              <div>
                <p className="dark:text-white">
                  {formatCurrency(analyse.montant_remise_total)}
                </p>
              </div>
              <div>
                <p className="text-orange-600 dark:text-orange-400">
                  {formatPercentage(analyse.taux_remise_global, 2)}
                </p>
              </div>
              <div>
                <p className="text-gray-400">—</p>
              </div>
              <div>
                <p className="text-blue-600 dark:text-blue-400">
                  {formatCurrency(analyse.rfa_totale_attendue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Analyse non disponible</p>
      )}
    </div>
  );
}
