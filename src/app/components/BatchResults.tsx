/**
 * PharmaVerif - Batch Processing Results
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Anomalie, Facture } from '../types';
import { formatCurrency } from '../utils/formatNumber';

interface BatchResultItem {
  fileName: string;
  facture?: Facture;
  anomalies: Anomalie[];
  error?: string;
}

interface BatchResultsProps {
  results: BatchResultItem[];
}

export function BatchResults({ results }: BatchResultsProps) {
  const totalFactures = results.filter((r) => r.facture).length;
  const totalAnomalies = results.reduce((sum, r) => sum + r.anomalies.length, 0);
  const totalConformes = results.filter((r) => r.facture && r.anomalies.length === 0).length;
  const totalMontant = results.reduce(
    (sum, r) => sum + r.anomalies.reduce((s, a) => s + a.montant_ecart, 0),
    0
  );
  const totalErrors = results.filter((r) => r.error).length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalFactures}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Factures traitées</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalConformes}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Conformes</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{totalAnomalies}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Anomalies</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalMontant)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Récupérable</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual results */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg dark:text-white">Détail par fichier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {result.fileName}
                    </p>
                    {result.facture && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {result.facture.numero} — {formatCurrency(result.facture.montant_brut_ht)}{' '}
                        HT
                      </p>
                    )}
                    {result.error && (
                      <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {result.error ? (
                    <Badge variant="destructive">Erreur</Badge>
                  ) : result.anomalies.length === 0 ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conforme
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {result.anomalies.length} anomalie{result.anomalies.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalErrors > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              {totalErrors} fichier{totalErrors > 1 ? 's' : ''} en erreur
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
