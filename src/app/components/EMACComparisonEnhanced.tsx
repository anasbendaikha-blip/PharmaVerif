/**
 * PharmaVerif - EMACComparisonEnhanced Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Composant avance de verification triangulaire EMAC :
 *  - 3 Stats cards (EMAC declare, Factures calculees, Ecart total)
 *  - Bouton export Excel
 *  - Triangle de verification (reutilise EMACComparison)
 *  - Rows expandables avec classification + action suggeree
 *  - Detail avantages (RFA, COP, Remises, Autres, Factures matchees)
 *  - Anomalies groupees par severite (critical / warning / info)
 *  - Dark mode / responsive
 */

import { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Triangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { EMACComparison } from './EMACComparison';
import { formatCurrency, formatPercentage } from '../utils/formatNumber';
import {
  buildEMACComparisonData,
  getEcartExplanation,
  type EMACComparisonRow,
} from '../utils/emacCalculs';
import { exportEMACToExcel } from '../utils/excelExport';
import type {
  TriangleVerificationResponse,
  EMACResponse,
  AnomalieEMACResponse,
} from '../api/types';

// ========================================
// TYPES
// ========================================

interface EMACComparisonEnhancedProps {
  /** Triangle de verification (de l'API) */
  triangle: TriangleVerificationResponse;
  /** EMAC complet (pour les details avantages) */
  emac: EMACResponse;
  /** Anomalies EMAC */
  anomalies: AnomalieEMACResponse[];
  /** Seuil d'ecart en % (defaut: 5) */
  seuilEcart?: number;
  /** Classe CSS additionnelle */
  className?: string;
}

// ========================================
// COMPONENT
// ========================================

export function EMACComparisonEnhanced({
  triangle,
  emac,
  anomalies,
  seuilEcart = 5,
  className,
}: EMACComparisonEnhancedProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // --- Donnees enrichies ---
  const { rows, totaux } = useMemo(
    () => buildEMACComparisonData(triangle, seuilEcart),
    [triangle, seuilEcart]
  );

  // --- Anomalies groupees ---
  const grouped = useMemo(() => ({
    critical: anomalies.filter((a) => a.severite === 'critical'),
    warning: anomalies.filter((a) => a.severite === 'warning'),
    info: anomalies.filter((a) => a.severite === 'info'),
  }), [anomalies]);

  // --- Export Excel ---
  const handleExportExcel = () => {
    exportEMACToExcel(
      rows,
      totaux,
      emac.periode_debut,
      triangle.laboratoire_nom
    );
  };

  const hasSignificantEcart = Math.abs(totaux.ecartTotal) > 1;
  const nonConformeRows = rows.filter((r) => !r.isTotal && r.statut !== 'conforme');

  return (
    <div className={cn('space-y-5', className)}>
      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCardSimple
          label="EMAC Total Declare"
          value={formatCurrency(totaux.emacTotal)}
          colorClass="text-blue-600 dark:text-blue-400"
          bgClass="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCardSimple
          label="Factures Calculees"
          value={formatCurrency(totaux.facturesTotal)}
          colorClass="text-green-600 dark:text-green-400"
          bgClass="bg-green-50 dark:bg-green-900/20"
        />
        <StatCardSimple
          label="Ecart Total"
          value={`${totaux.ecartTotal > 0 ? '+' : ''}${formatCurrency(totaux.ecartTotal)}`}
          subtitle={`${totaux.ecartTotalPct > 0 ? '+' : ''}${formatPercentage(totaux.ecartTotalPct)}`}
          colorClass={
            hasSignificantEcart
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          }
          bgClass={
            hasSignificantEcart
              ? 'bg-red-50 dark:bg-red-900/20'
              : 'bg-gray-50 dark:bg-gray-800'
          }
        />
      </div>

      {/* ===== TRIANGLE + EXPORT ===== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Triangle className="h-5 w-5 text-purple-600" />
              Triangle de verification
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reutilise le composant EMACComparison existant */}
          <EMACComparison
            lignes={triangle.lignes}
            nbConformes={triangle.nb_conformes}
            nbEcarts={triangle.nb_ecarts}
            montantRecouvrable={triangle.montant_recouvrable}
            montantTotalEcart={triangle.montant_total_ecart}
            laboratoireNom={triangle.laboratoire_nom}
            periode={triangle.periode}
            showTitle={false}
          />
        </CardContent>
      </Card>

      {/* ===== ROWS EXPANDABLES (ecarts) ===== */}
      {nonConformeRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Ecarts detectes ({nonConformeRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nonConformeRows.map((row) => (
              <EcartExpandableRow
                key={row.label}
                row={row}
                isExpanded={expandedRow === row.label}
                onToggle={() =>
                  setExpandedRow(expandedRow === row.label ? null : row.label)
                }
                nbFacturesMatched={emac.nb_factures_matched}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ===== DETAIL AVANTAGES ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Detail des avantages declares
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <AvantageCard
              label="RFA"
              declare={emac.rfa_declaree}
              calcule={emac.rfa_attendue_calculee}
              ecart={emac.ecart_rfa}
            />
            <AvantageCard
              label="COP"
              declare={emac.cop_declaree}
              calcule={emac.cop_attendue_calculee}
              ecart={emac.ecart_cop}
            />
            <MiniStatCard
              label="Remises diff."
              value={formatCurrency(emac.remises_differees_declarees)}
            />
            <MiniStatCard
              label="Autres"
              value={formatCurrency(emac.autres_avantages)}
            />
            <MiniStatCard
              label="Factures matchees"
              value={String(emac.nb_factures_matched)}
              isCurrency={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* ===== ANOMALIES GROUPEES ===== */}
      {anomalies.length > 0 && (
        <div className="space-y-4">
          {/* Critical */}
          {grouped.critical.length > 0 && (
            <AnomalieGroup
              title={`Anomalies critiques (${grouped.critical.length})`}
              icon={<AlertCircle className="h-4 w-4" />}
              colorClass="text-red-600 dark:text-red-400"
              anomalies={grouped.critical}
            />
          )}

          {/* Warning */}
          {grouped.warning.length > 0 && (
            <AnomalieGroup
              title={`Alertes (${grouped.warning.length})`}
              icon={<AlertTriangle className="h-4 w-4" />}
              colorClass="text-amber-600 dark:text-amber-400"
              anomalies={grouped.warning}
            />
          )}

          {/* Info */}
          {grouped.info.length > 0 && (
            <AnomalieGroup
              title={`Informations (${grouped.info.length})`}
              icon={<Info className="h-4 w-4" />}
              colorClass="text-blue-600 dark:text-blue-400"
              anomalies={grouped.info}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ========================================
// SUB-COMPONENTS
// ========================================

function StatCardSimple({
  label,
  value,
  subtitle,
  colorClass,
  bgClass,
}: {
  label: string;
  value: string;
  subtitle?: string;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={cn('text-center p-4 rounded-lg', bgClass)}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={cn('text-xl font-bold font-mono', colorClass)}>{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

function EcartExpandableRow({
  row,
  isExpanded,
  onToggle,
  nbFacturesMatched,
}: {
  row: EMACComparisonRow;
  isExpanded: boolean;
  onToggle: () => void;
  nbFacturesMatched: number;
}) {
  const explanation = getEcartExplanation(row);
  const isSousDeclaration = row.statut === 'sous-declaration';

  return (
    <div
      className={cn(
        'border rounded-lg transition-colors',
        isSousDeclaration
          ? 'border-red-200 dark:border-red-800'
          : 'border-amber-200 dark:border-amber-800'
      )}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3',
          'hover:bg-muted/50 transition-colors text-left'
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isSousDeclaration ? (
            <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
          ) : (
            <TrendingUp className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <span className="font-medium text-foreground">{row.label}</span>
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              isSousDeclaration
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            )}
          >
            {isSousDeclaration ? 'Sous-declaration' : 'Sur-declaration'}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={cn(
              'font-mono font-semibold text-sm',
              isSousDeclaration ? 'text-red-600' : 'text-amber-600'
            )}
          >
            {row.ecart > 0 ? '+' : ''}
            {formatCurrency(row.ecart)}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">
          {/* Explanation */}
          <div
            className={cn(
              'border-l-4 p-3 rounded-r-lg text-sm',
              isSousDeclaration
                ? 'bg-red-50 border-red-500 dark:bg-red-900/10'
                : 'bg-amber-50 border-amber-500 dark:bg-amber-900/10'
            )}
          >
            <h4 className="font-semibold text-foreground mb-1">
              {isSousDeclaration ? '\u26A0\uFE0F' : '\uD83D\uDCCA'} {explanation.title}
            </h4>
            <p className="text-muted-foreground">{explanation.description}</p>
            {explanation.action && (
              <p className="mt-2">
                <strong
                  className={
                    isSousDeclaration
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }
                >
                  Action :
                </strong>{' '}
                <span className="text-muted-foreground">
                  {explanation.action}
                </span>
              </p>
            )}
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 p-2.5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-0.5">
                EMAC declare
              </p>
              <p className="text-sm font-semibold font-mono text-foreground">
                {formatCurrency(row.emacDeclare)}
              </p>
            </div>
            <div className="bg-muted/50 p-2.5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-0.5">
                Factures
              </p>
              <p className="text-sm font-semibold font-mono text-foreground">
                {formatCurrency(row.facturesCalcule)}
              </p>
            </div>
            <div className="bg-muted/50 p-2.5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-0.5">
                Ecart (%)
              </p>
              <p
                className={cn(
                  'text-sm font-semibold font-mono',
                  Math.abs(row.ecartPourcent) > 5
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-foreground'
                )}
              >
                {row.ecartPourcent > 0 ? '+' : ''}
                {formatPercentage(row.ecartPourcent)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AvantageCard({
  label,
  declare,
  calcule,
  ecart,
}: {
  label: string;
  declare: number;
  calcule: number | null;
  ecart: number | null;
}) {
  const hasEcart = ecart !== null && ecart !== undefined && Math.abs(ecart) > 1;
  return (
    <div className="p-2.5 bg-muted/30 rounded-lg text-center">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold font-mono text-foreground">
        {formatCurrency(declare)}
      </p>
      {calcule !== null && calcule !== undefined && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Attendu : {formatCurrency(calcule)}
        </p>
      )}
      {hasEcart && (
        <p
          className={cn(
            'text-[10px] font-medium mt-0.5',
            ecart! < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          )}
        >
          {ecart! > 0 ? '+' : ''}
          {formatCurrency(ecart!)}
        </p>
      )}
    </div>
  );
}

function MiniStatCard({
  label,
  value,
  isCurrency = true,
}: {
  label: string;
  value: string;
  isCurrency?: boolean;
}) {
  return (
    <div className="p-2.5 bg-muted/30 rounded-lg text-center">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold font-mono text-foreground">{value}</p>
    </div>
  );
}

function AnomalieGroup({
  title,
  icon,
  colorClass,
  anomalies,
}: {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  anomalies: AnomalieEMACResponse[];
}) {
  return (
    <div>
      <h3 className={cn('text-sm font-semibold mb-2 flex items-center gap-1', colorClass)}>
        {icon}
        {title}
      </h3>
      <div className="space-y-2">
        {anomalies.map((anomalie) => (
          <AnomalieDetailCard key={anomalie.id} anomalie={anomalie} />
        ))}
      </div>
    </div>
  );
}

function AnomalieDetailCard({ anomalie }: { anomalie: AnomalieEMACResponse }) {
  const borderClass =
    anomalie.severite === 'critical'
      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      : anomalie.severite === 'warning'
        ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
        : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';

  const severiteIcon =
    anomalie.severite === 'critical' ? (
      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
    ) : anomalie.severite === 'warning' ? (
      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
    ) : (
      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
    );

  return (
    <div className={cn('p-3 rounded-lg border', borderClass)}>
      <div className="flex items-start gap-2">
        {severiteIcon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {anomalie.description}
          </p>
          {anomalie.montant_ecart > 0 && (
            <p className="text-xs font-mono mt-1 text-muted-foreground">
              Ecart : {formatCurrency(anomalie.montant_ecart)}
            </p>
          )}
          {anomalie.action_suggeree && (
            <p className="text-xs mt-1.5 text-muted-foreground italic">
              {anomalie.action_suggeree}
            </p>
          )}
          {anomalie.resolu && (
            <p className="text-xs mt-1.5 text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Resolu
              {anomalie.note_resolution && ` — ${anomalie.note_resolution}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
