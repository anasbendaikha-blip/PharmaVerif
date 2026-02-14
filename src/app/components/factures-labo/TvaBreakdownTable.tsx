/**
 * PharmaVerif - Tableau détail TVA
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { Info } from 'lucide-react';
import { formatCurrency } from '../../utils/formatNumber';
import type { TvaDetail } from './verification';

interface TvaBreakdownTableProps {
  tvaBreakdown: TvaDetail[];
  totalLignes: number;
}

export function TvaBreakdownTable({ tvaBreakdown, totalLignes }: TvaBreakdownTableProps) {
  if (tvaBreakdown.length === 0) return null;

  return (
    <div className="px-6 pb-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <Info className="h-4 w-4" />
        Détail TVA
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Taux TVA</th>
              <th className="text-center py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Lignes</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Base HT</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Montant TVA</th>
            </tr>
          </thead>
          <tbody>
            {tvaBreakdown.map((tv) => (
              <tr key={tv.taux} className="border-b dark:border-gray-700/50">
                <td className="py-2 px-3 font-medium dark:text-white">{tv.taux.toFixed(2)} %</td>
                <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">{tv.nbLignes}</td>
                <td className="py-2 px-3 text-right dark:text-white">{formatCurrency(tv.baseHt)}</td>
                <td className="py-2 px-3 text-right dark:text-white">{formatCurrency(tv.montantTva)}</td>
              </tr>
            ))}
            <tr className="font-semibold bg-gray-50 dark:bg-gray-700/30">
              <td className="py-2 px-3 dark:text-white">Total</td>
              <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">{totalLignes}</td>
              <td className="py-2 px-3 text-right dark:text-white">
                {formatCurrency(tvaBreakdown.reduce((s, t) => s + t.baseHt, 0))}
              </td>
              <td className="py-2 px-3 text-right dark:text-white">
                {formatCurrency(tvaBreakdown.reduce((s, t) => s + t.montantTva, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
