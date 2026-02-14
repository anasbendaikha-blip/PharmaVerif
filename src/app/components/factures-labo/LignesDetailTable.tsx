/**
 * PharmaVerif - Tableau détail des lignes facture
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Tableau pliable avec filtres par tranche et anomalies.
 */

import { useState, useMemo } from 'react';
import { FileText, AlertTriangle, CheckCircle2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatNumber';
import { PILL_STYLES, getTrancheSemantic } from '../../utils/statusColors';
import type { LigneFactureLaboResponse } from '../../api/types';
import type { LigneVerification } from './verification';

interface RecalcTotals {
  brut: number;
  remise: number;
  net: number;
}

interface LignesDetailTableProps {
  lignes: LigneFactureLaboResponse[];
  verifications: LigneVerification[];
  anomalyCount: number;
  recalcTotals: RecalcTotals | null;
  isLoading: boolean;
}

export function LignesDetailTable({
  lignes,
  verifications,
  anomalyCount,
  recalcTotals,
  isLoading,
}: LignesDetailTableProps) {
  const [showLignes, setShowLignes] = useState(false);
  const [lignesFilter, setLignesFilter] = useState<string>('all');

  const filteredVerifications = useMemo(() => {
    if (lignesFilter === 'all') return verifications;
    if (lignesFilter === 'anomalies') return verifications.filter((v) => !v.isOk);
    return verifications.filter((v) => v.ligne.tranche === lignesFilter);
  }, [verifications, lignesFilter]);

  return (
    <div className="px-6 pb-4">
      <button
        onClick={() => setShowLignes(!showLignes)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Détail des lignes ({lignes.length})
          {anomalyCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              {anomalyCount} anomalie{anomalyCount > 1 ? 's' : ''}
            </span>
          )}
        </span>
        {showLignes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showLignes && (
        <div className="mt-3">
          {/* Filtres */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {['all', 'A', 'B', 'OTC', 'anomalies'].map((f) => (
              <button
                key={f}
                onClick={() => setLignesFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  lignesFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'all'
                  ? `Toutes (${lignes.length})`
                  : f === 'anomalies'
                    ? `Anomalies (${anomalyCount})`
                    : f === 'A'
                      ? `Tranche A (${lignes.filter((l) => l.tranche === 'A').length})`
                      : f === 'B'
                        ? `Tranche B (${lignes.filter((l) => l.tranche === 'B').length})`
                        : `OTC (${lignes.filter((l) => l.tranche === 'OTC').length})`}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">CIP13</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Désignation</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Qté</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">PU HT</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Rem %</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">PU apr. rem.</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Mt HT</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">TVA</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Tranche</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVerifications.map((v, idx) => (
                    <tr
                      key={v.ligne.id}
                      className={`border-b dark:border-gray-700/50 ${
                        !v.isOk
                          ? 'bg-amber-50 dark:bg-amber-900/10'
                          : idx % 2 === 0
                            ? 'bg-white dark:bg-gray-800'
                            : 'bg-gray-50/50 dark:bg-gray-800/50'
                      }`}
                      title={v.anomalies.length > 0 ? v.anomalies.join('\n') : 'OK'}
                    >
                      <td className="py-1.5 px-2 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {v.ligne.cip13}
                      </td>
                      <td className="py-1.5 px-2 dark:text-white max-w-[200px] truncate" title={v.ligne.designation}>
                        {v.ligne.designation}
                      </td>
                      <td className="py-1.5 px-2 text-center dark:text-white">{v.ligne.quantite}</td>
                      <td className="py-1.5 px-2 text-right dark:text-white">{v.ligne.prix_unitaire_ht.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-right font-medium">
                        <span className={
                          v.ligne.remise_pct > 2.5
                            ? 'text-green-600 dark:text-green-400'
                            : v.ligne.remise_pct > 0
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-400'
                        }>
                          {v.ligne.remise_pct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right dark:text-white">{v.ligne.prix_unitaire_apres_remise.toFixed(4)}</td>
                      <td className="py-1.5 px-2 text-right font-medium dark:text-white">{v.ligne.montant_ht.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-center text-gray-600 dark:text-gray-400">{v.ligne.taux_tva.toFixed(2)}%</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${PILL_STYLES[getTrancheSemantic(v.ligne.tranche)]}`}>
                          {v.ligne.tranche}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {v.isOk ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto" />
                        ) : (
                          <div className="group relative">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mx-auto cursor-help" />
                            <div className="absolute bottom-full right-0 mb-1 w-64 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                              {v.anomalies.map((a, i) => (
                                <p key={i} className="mb-0.5">• {a}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totaux des lignes */}
                {filteredVerifications.length > 0 && lignesFilter === 'all' && recalcTotals && (
                  <tfoot>
                    <tr className="bg-gray-100 dark:bg-gray-700 font-semibold text-xs">
                      <td className="py-2 px-2 dark:text-white" colSpan={2}>
                        Total ({lignes.length} lignes)
                      </td>
                      <td className="py-2 px-2 text-center dark:text-white">
                        {lignes.reduce((s, l) => s + l.quantite, 0)}
                      </td>
                      <td className="py-2 px-2" colSpan={2}></td>
                      <td className="py-2 px-2 text-right dark:text-white">
                        Brut : {formatCurrency(recalcTotals.brut)}
                      </td>
                      <td className="py-2 px-2 text-right dark:text-white">
                        {formatCurrency(recalcTotals.net)}
                      </td>
                      <td className="py-2 px-2" colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
