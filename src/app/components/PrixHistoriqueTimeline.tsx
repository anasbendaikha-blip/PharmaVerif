/**
 * PharmaVerif - PrixHistoriqueTimeline Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Timeline avancee d'evolution des prix d'un produit :
 *  - Detection automatique des variations suspectes (>10%)
 *  - CustomDot : cercle rouge pour points suspects, bleu sinon
 *  - CustomTooltip : prix, variation %, source facture, badge suspect
 *  - ReferenceLine : prix moyen en pointille
 *  - Stats Cards (min/max/moy/variation moyenne)
 *  - Liste des variations suspectes avec action suggeree
 *  - Point selectionne avec details complets
 *  - Export Excel
 *  - Dark mode / responsive
 */

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  X,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { CHART_PALETTE } from './ui/chart-colors';
import {
  formatCurrency,
  formatPercentage,
  formatDateShortFR,
  formatMonthShort,
} from '../utils/formatNumber';
import {
  detectPrixVariations,
  type PrixVariationPoint,
  type PrixTimelineStats,
} from '../utils/emacCalculs';
import { exportPrixHistoriqueToExcel } from '../utils/excelExport';
import type { PrixHistoriqueEntry } from './PrixHistoriqueChart';

// ========================================
// TYPES
// ========================================

interface PrixHistoriqueTimelineProps {
  /** Code CIP du produit (optionnel) */
  cipCode?: string;
  /** Designation du produit */
  designation: string;
  /** Donnees historique prix brutes */
  historique: PrixHistoriqueEntry[];
  /** Seuil de variation suspecte en % (defaut: 10) */
  seuilSuspect?: number;
  /** Hauteur du graphique en px (defaut: 350) */
  height?: number;
  /** Classe CSS additionnelle */
  className?: string;
}

// ========================================
// COMPONENT
// ========================================

export function PrixHistoriqueTimeline({
  cipCode,
  designation,
  historique,
  seuilSuspect = 10,
  height = 350,
  className,
}: PrixHistoriqueTimelineProps) {
  const [selectedPoint, setSelectedPoint] = useState<PrixVariationPoint | null>(null);

  // --- Analyse des variations ---
  const { data, stats } = useMemo(
    () => detectPrixVariations(historique, seuilSuspect),
    [historique, seuilSuspect]
  );

  // --- Donnees pour Recharts ---
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      dateLabel: formatMonthShort(point.date),
    }));
  }, [data]);

  // --- Variations suspectes ---
  const suspectPoints = useMemo(
    () => data.filter((d) => d.isSuspect),
    [data]
  );

  // --- Export Excel ---
  const handleExportExcel = () => {
    exportPrixHistoriqueToExcel(designation, data, stats, cipCode);
  };

  // --- Empty state ---
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Historique des prix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Pas assez de donnees pour le graphique</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* ===== HEADER ===== */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Historique des prix
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {cipCode && `CIP ${cipCode} \u2022 `}
            {designation}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {suspectPoints.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold">
              <AlertTriangle className="h-3 w-3" />
              {suspectPoints.length} hausse{suspectPoints.length > 1 ? 's' : ''} suspecte{suspectPoints.length > 1 ? 's' : ''}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
        </div>
      </div>

      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard
          label="Prix moyen"
          value={formatCurrency(stats.prixMoyen)}
          bgClass="bg-muted/50"
          colorClass="text-foreground"
        />
        <StatsCard
          label="Prix min"
          value={formatCurrency(stats.prixMin)}
          bgClass="bg-green-50 dark:bg-green-900/20"
          colorClass="text-green-700 dark:text-green-400"
        />
        <StatsCard
          label="Prix max"
          value={formatCurrency(stats.prixMax)}
          bgClass="bg-red-50 dark:bg-red-900/20"
          colorClass="text-red-700 dark:text-red-400"
        />
        <StatsCard
          label="Variation moy."
          value={`${stats.variationMoyenne > 0 ? '+' : ''}${formatPercentage(stats.variationMoyenne)}`}
          bgClass={
            stats.variationMoyenne > 0
              ? 'bg-amber-50 dark:bg-amber-900/20'
              : 'bg-blue-50 dark:bg-blue-900/20'
          }
          colorClass={
            stats.variationMoyenne > 0
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-blue-700 dark:text-blue-400'
          }
        />
      </div>

      {/* ===== CHART ===== */}
      <Card>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={chartData}
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  setSelectedPoint(e.activePayload[0].payload as PrixVariationPoint);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => `${v.toFixed(2)} \u20AC`}
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
              />

              {/* Prix moyen reference line */}
              <ReferenceLine
                y={stats.prixMoyen}
                stroke="#9ca3af"
                strokeDasharray="5 5"
                label={{
                  value: `Moy: ${formatCurrency(stats.prixMoyen)}`,
                  position: 'right',
                  fontSize: 11,
                  fill: '#6b7280',
                }}
              />

              <Tooltip content={<PrixTooltip />} />

              <Line
                type="monotone"
                dataKey="prix"
                stroke={CHART_PALETTE[0]}
                strokeWidth={2}
                dot={<PrixCustomDot />}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ===== VARIATIONS SUSPECTES ===== */}
      {suspectPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Variations suspectes detectees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suspectPoints.map((point, index) => {
              const prevPoint = data[data.indexOf(point) - 1];
              return (
                <SuspectVariationCard
                  key={`${point.date}-${index}`}
                  point={point}
                  prevPrix={prevPoint?.prix}
                />
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ===== SELECTED POINT DETAIL ===== */}
      {selectedPoint && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Point selectionne : {formatDateShortFR(selectedPoint.date)}
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground">
                    Prix : <strong>{formatCurrency(selectedPoint.prix)}</strong>
                  </p>
                  {selectedPoint.variation !== 0 && (
                    <p className="text-foreground">
                      Variation :{' '}
                      <strong
                        className={
                          selectedPoint.variation > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }
                      >
                        {selectedPoint.variation > 0 ? '+' : ''}
                        {formatPercentage(selectedPoint.variation)}
                      </strong>
                    </p>
                  )}
                  {selectedPoint.laboratoireNom && (
                    <p className="text-muted-foreground">
                      Laboratoire : {selectedPoint.laboratoireNom}
                    </p>
                  )}
                  {selectedPoint.factureNumero && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1">
                      <FileText className="h-3 w-3" />
                      Facture {selectedPoint.factureNumero}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPoint(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========================================
// SUB-COMPONENTS
// ========================================

function StatsCard({
  label,
  value,
  bgClass,
  colorClass,
}: {
  label: string;
  value: string;
  bgClass: string;
  colorClass: string;
}) {
  return (
    <div className={cn('rounded-lg p-3', bgClass)}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={cn('text-base font-bold font-mono', colorClass)}>
        {value}
      </p>
    </div>
  );
}

// Custom Dot for Recharts — red for suspect, blue for normal
function PrixCustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: PrixVariationPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;

  if (payload.isSuspect) {
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="#ef4444"
          stroke="#fff"
          strokeWidth={2}
        />
        {/* Small triangle warning above */}
        <polygon
          points={`${cx},${cy - 14} ${cx - 5},${cy - 6} ${cx + 5},${cy - 6}`}
          fill="#ef4444"
          stroke="#fff"
          strokeWidth={1}
        />
      </g>
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={CHART_PALETTE[0]}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

// Custom Tooltip for Recharts
function PrixTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PrixVariationPoint }>;
}) {
  if (!active || !payload || !payload[0]) return null;

  const point = payload[0].payload;

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-lg shadow-lg p-3 min-w-[220px]',
        'text-card-foreground'
      )}
    >
      <p className="font-semibold text-foreground mb-2">
        {formatDateShortFR(point.date)}
      </p>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Prix unitaire</span>
          <span className="text-sm font-bold font-mono text-foreground">
            {formatCurrency(point.prix)}
          </span>
        </div>

        {point.variation !== 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Variation</span>
            <span
              className={cn(
                'text-xs font-semibold',
                point.variation > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              )}
            >
              {point.variation > 0 ? '+' : ''}
              {formatPercentage(point.variation)}
            </span>
          </div>
        )}

        {point.laboratoireNom && (
          <div className="pt-1.5 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {point.laboratoireNom}
            </p>
          </div>
        )}

        {point.isSuspect && (
          <div className="pt-1.5 border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
            <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Variation suspecte</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuspectVariationCard({
  point,
  prevPrix,
}: {
  point: PrixVariationPoint;
  prevPrix?: number;
}) {
  return (
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium text-foreground mb-1">
            {formatDateShortFR(point.date)}
          </p>
          <p className="text-sm text-muted-foreground">
            Prix passe de{' '}
            {prevPrix !== undefined && (
              <strong className="text-foreground">
                {formatCurrency(prevPrix)}
              </strong>
            )}
            {' '}a{' '}
            <strong className="text-foreground">
              {formatCurrency(point.prix)}
            </strong>
          </p>
          {point.laboratoireNom && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {point.laboratoireNom}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p
            className={cn(
              'text-lg font-bold',
              point.variation > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            )}
          >
            {point.variation > 0 ? '+' : ''}
            {formatPercentage(point.variation)}
          </p>
          <p className="text-xs text-muted-foreground">variation</p>
        </div>
      </div>

      {/* Action suggeree */}
      <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
        <p className="text-xs text-red-700 dark:text-red-400">
          <strong>Action suggeree :</strong> Verifiez aupres du fournisseur si cette{' '}
          {point.variation > 0 ? 'hausse' : 'baisse'} correspond a un changement
          tarifaire officiel.
        </p>
      </div>
    </div>
  );
}
