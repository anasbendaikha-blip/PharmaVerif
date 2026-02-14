/**
 * PharmaVerif - PrixHistoriqueChart Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Graphique d'evolution des prix d'un produit dans le temps :
 *  - Multi-fournisseurs (une ligne par labo, couleur distincte)
 *  - Tooltip avec formatage EUR
 *  - Axes avec labels francais
 *  - Responsive (hauteur configurable)
 *  - Stats min/max/moy optionnelles
 *  - Empty state quand pas de donnees
 *  - Support dark mode
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CHART_PALETTE } from './ui/chart-colors';
import { formatCurrency, formatDateShortFR } from '../utils/formatNumber';
import { cn } from './ui/utils';

// ========================================
// TYPES
// ========================================

export interface PrixHistoriqueEntry {
  /** Date de la facture (ISO string) */
  date_facture: string;
  /** Prix unitaire net */
  prix_unitaire_net: number;
  /** ID du laboratoire */
  laboratoire_id: number;
  /** Nom du laboratoire */
  laboratoire_nom: string | null;
  /** Prix unitaire brut (optionnel) */
  prix_unitaire_brut?: number;
  /** Remise en % (optionnel) */
  remise_pct?: number;
}

interface PrixHistoriqueChartProps {
  /** Designation du produit (titre du graphique) */
  designation: string;
  /** Donnees d'historique */
  historique: PrixHistoriqueEntry[];
  /** Hauteur du graphique en px */
  height?: number;
  /** Afficher les cartes min/max/moy */
  showStats?: boolean;
  /** Prix min (calcule automatiquement si non fourni) */
  prixMin?: number;
  /** Prix max (calcule automatiquement si non fourni) */
  prixMax?: number;
  /** Prix moyen (calcule automatiquement si non fourni) */
  prixMoyen?: number;
  /** Classe CSS additionnelle */
  className?: string;
  /** Afficher le titre dans un CardHeader */
  showTitle?: boolean;
}

// ========================================
// COMPONENT
// ========================================

export function PrixHistoriqueChart({
  designation,
  historique,
  height = 350,
  showStats = false,
  prixMin: prixMinProp,
  prixMax: prixMaxProp,
  prixMoyen: prixMoyenProp,
  className,
  showTitle = true,
}: PrixHistoriqueChartProps) {
  // --- Transformer les donnees pour Recharts ---
  const { chartData, labos } = useMemo(() => {
    if (!historique || historique.length === 0) return { chartData: [], labos: [] };

    const dateMap = new Map<string, Record<string, number>>();
    const laboSet = new Set<string>();

    for (const entry of historique) {
      const dateKey = entry.date_facture;
      const laboNom = entry.laboratoire_nom || `Labo #${entry.laboratoire_id}`;
      laboSet.add(laboNom);

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }
      dateMap.get(dateKey)![laboNom] = entry.prix_unitaire_net;
    }

    const data = Array.from(dateMap.entries())
      .map(([dateStr, values]) => ({
        date: formatDateShortFR(dateStr),
        dateSort: dateStr,
        ...values,
      }))
      .sort((a, b) => a.dateSort.localeCompare(b.dateSort));

    return { chartData: data, labos: Array.from(laboSet) };
  }, [historique]);

  // --- Calcul stats si pas fournies ---
  const stats = useMemo(() => {
    if (!showStats) return null;
    const prices = historique.map((e) => e.prix_unitaire_net);
    if (prices.length === 0) return null;
    return {
      min: prixMinProp ?? Math.min(...prices),
      max: prixMaxProp ?? Math.max(...prices),
      moy: prixMoyenProp ?? prices.reduce((a, b) => a + b, 0) / prices.length,
    };
  }, [historique, showStats, prixMinProp, prixMaxProp, prixMoyenProp]);

  // --- Empty state ---
  if (chartData.length === 0) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Évolution du prix
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Pas assez de données pour le graphique</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Prix min</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.min)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Prix max</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(stats.max)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Prix moyen</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(stats.moy)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Évolution du prix — {designation}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => `${v.toFixed(2)} \u20AC`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
                labelStyle={{ fontWeight: 'bold' }}
                contentStyle={{
                  backgroundColor: 'var(--color-card, #fff)',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {labos.map((labo, idx) => (
                <Line
                  key={labo}
                  type="monotone"
                  dataKey={labo}
                  name={labo}
                  stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
