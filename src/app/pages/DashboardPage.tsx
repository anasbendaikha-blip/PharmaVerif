/**
 * PharmaVerif - Tableau de bord (Monitoring & Actions)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Layout :
 *  - PageHeader + CTA "Verifier une nouvelle facture"
 *  - 4 StatCards avec tendances mensuelles
 *  - Alertes prioritaires (ecarts > seuil critique)
 *  - Charts (repartition anomalies + montants par fournisseur)
 *  - Anomalies recentes (5 dernieres, sans filtre)
 *  - Dernieres factures analysees (DataTable)
 */

import { useState, useEffect, useMemo } from 'react';
import { AnomalieCard } from '../components/AnomalieCard';
import { PageHeader } from '../components/ui/page-header';
import { StatCard } from '../components/ui/stat-card';
import { DataTable, type DataTableColumn } from '../components/ui/data-table';
import { StatusBadge, getFactureStatusVariant } from '../components/ui/status-badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { SkeletonChart } from '../components/ui/skeleton';
import {
  FileText,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  FileDown,
  LayoutDashboard,
  FileCheck,
  Loader2,
  Plus,
  Bell,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ApiClient } from '../api/client';
import { Facture, Anomalie } from '../types';
import { exportVerificationReport } from '../utils/pdfExport';
import { db } from '../data/database';
import { toast } from 'sonner';
import { formatCurrency, formatPercentage, formatDateShortFR } from '../utils/formatNumber';
import { isApiMode } from '../api/config';
import { getErrorMessage } from '../api/httpClient';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';
import { OnboardingBanner } from '../components/OnboardingBanner';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import { CHART_PALETTE, getChartColor } from '../components/ui/chart-colors';
import { useWindowSize } from '../hooks/useWindowSize';
import { ANOMALIE_LABELS } from '../constants/anomalyTypes';

/** Couleurs anomalies utilisant la palette centralisee */
const ANOMALIE_COLORS: Record<string, string> = Object.fromEntries(
  Object.keys(ANOMALIE_LABELS).map((key, i) => [key, getChartColor(i)])
);

/** Seuil pour les alertes prioritaires (en euros) */
const SEUIL_ALERTE_PRIORITAIRE = 500;

// ========================================
// COMPONENT
// ========================================

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const navigate = useNavigate();
  const { isCompleted: onboardingCompleted } = useOnboardingStatus();
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem('pharmaverif_onboarding_banner_dismissed') === 'true'
  );
  const [factures, setFactures] = useState<Facture[]>([]);
  const [anomalies, setAnomalies] = useState<Anomalie[]>([]);
  const [stats, setStats] = useState({
    total_factures: 0,
    total_anomalies: 0,
    economies_potentielles: 0,
    taux_conformite: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);

  // Responsive chart dimensions
  const { width: viewportWidth } = useWindowSize();
  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth < 1024;
  const chartHeight = isMobile ? 200 : isTablet ? 260 : 300;
  const pieChartHeight = isMobile ? 220 : 280;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [facturesData, statsData, anomaliesData] = await Promise.all([
        ApiClient.getFactures(),
        ApiClient.getStats(),
        ApiClient.getAnomalies(),
      ]);

      setFactures(facturesData);
      setStats(statsData);
      setAnomalies(anomaliesData);
    } catch (err) {
      console.error('Erreur lors du chargement des donnees:', err);
      const message = getErrorMessage(err, 'Erreur lors du chargement des donnees');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== COMPUTED VALUES ====================

  // Tendances mensuelles (mois courant vs mois precedent)
  const trends = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const isThisMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    };
    const isLastMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
    };

    const facturesThisMonth = factures.filter((f) => isThisMonth(f.date));
    const facturesLastMonth = factures.filter((f) => isLastMonth(f.date));

    const anomaliesThisMonth = anomalies.filter((a) => isThisMonth(a.created_at || a.date || ''));
    const anomaliesLastMonth = anomalies.filter((a) => isLastMonth(a.created_at || a.date || ''));

    const ecartThisMonth = anomaliesThisMonth.reduce((s, a) => s + a.montant_ecart, 0);
    const ecartLastMonth = anomaliesLastMonth.reduce((s, a) => s + a.montant_ecart, 0);

    const computeTrend = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0
          ? { text: `+${current} ce mois`, direction: 'up' as const }
          : { text: 'Stable', direction: 'neutral' as const };
      }
      const pct = Math.round(((current - previous) / previous) * 100);
      if (pct === 0) return { text: 'Stable', direction: 'neutral' as const };
      return {
        text: `${pct > 0 ? '+' : ''}${pct}% vs mois prec.`,
        direction: pct > 0 ? ('up' as const) : ('down' as const),
      };
    };

    return {
      factures: computeTrend(facturesThisMonth.length, facturesLastMonth.length),
      anomalies: computeTrend(anomaliesThisMonth.length, anomaliesLastMonth.length),
      ecart: computeTrend(ecartThisMonth, ecartLastMonth),
    };
  }, [factures, anomalies]);

  // Alertes prioritaires (ecarts > seuil)
  const alertesPrioritaires = useMemo(() => {
    return anomalies
      .filter((a) => a.montant_ecart >= SEUIL_ALERTE_PRIORITAIRE)
      .sort((a, b) => b.montant_ecart - a.montant_ecart)
      .slice(0, 3);
  }, [anomalies]);

  // Pie chart data
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    anomalies.forEach((a) => {
      counts[a.type_anomalie] = (counts[a.type_anomalie] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: ANOMALIE_LABELS[type] || type,
      value: count,
      color: ANOMALIE_COLORS[type] || '#6b7280',
    }));
  }, [anomalies]);

  // Bar chart data
  const barData = useMemo(() => {
    const fournisseurs = db.getAllFournisseurs();
    return fournisseurs.map((g) => {
      const gFactures = factures.filter((f) => f.fournisseur_id === g.id);
      const gAnomalies = anomalies.filter((a) => gFactures.some((f) => f.id === a.facture_id));
      const montantRecuperable = gAnomalies.reduce((sum, a) => sum + a.montant_ecart, 0);
      return {
        name: g.nom,
        factures: gFactures.length,
        anomalies: gAnomalies.length,
        montant: parseFloat(montantRecuperable.toFixed(2)),
      };
    });
  }, [factures, anomalies]);

  // 5 anomalies les plus recentes
  const anomaliesRecentes = useMemo(() => {
    return [...anomalies]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0).getTime();
        const dateB = new Date(b.created_at || b.date || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [anomalies]);

  // Evolution mensuelle (6 derniers mois) pour LineChart
  const monthlyEvolutionData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; year: number; month: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    return months.map(({ key, label, year, month }) => {
      const monthFactures = factures.filter((f) => {
        const fd = new Date(f.date);
        return fd.getFullYear() === year && fd.getMonth() === month;
      });
      const monthAnomalies = anomalies.filter((a) => {
        const ad = new Date(a.created_at || a.date || '');
        return ad.getFullYear() === year && ad.getMonth() === month;
      });
      const montant = monthFactures.reduce((sum, f) => sum + f.net_a_payer, 0);

      return {
        mois: label,
        factures: monthFactures.length,
        anomalies: monthAnomalies.length,
        montant: parseFloat(montant.toFixed(2)),
      };
    });
  }, [factures, anomalies]);

  const handleExportFacturePDF = async (factureId: number) => {
    setExportingId(factureId);
    try {
      const facture = factures.find((f) => f.id === factureId);
      if (!facture) throw new Error('Facture non trouvee');
      const fournisseur = db.getFournisseurById(facture.fournisseur_id);
      if (!fournisseur) throw new Error('Fournisseur non trouve');
      const factureAnomalies = anomalies.filter((a) => a.facture_id === factureId);
      await exportVerificationReport({ facture, anomalies: factureAnomalies, fournisseur });
      toast.success('Rapport PDF telecharge !', {
        description: `Rapport pour la facture ${facture.numero}`,
      });
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      toast.error('Erreur lors de la generation du PDF');
    } finally {
      setExportingId(null);
    }
  };

  // DataTable columns for factures
  const factureColumns: DataTableColumn<Facture>[] = useMemo(
    () => [
      {
        key: 'numero',
        header: 'Numero',
        accessor: 'numero',
        sortable: true,
        render: (row) => (
          <span className="font-medium text-foreground">{row.numero}</span>
        ),
      },
      {
        key: 'fournisseur',
        header: 'Fournisseur',
        sortable: true,
        hideOnMobile: true,
        render: (row) => (
          <span className="text-muted-foreground">
            {row.fournisseur?.nom || row.grossiste?.nom || '\u2014'}
          </span>
        ),
        sortFn: (a, b) => {
          const nameA = a.fournisseur?.nom || a.grossiste?.nom || '';
          const nameB = b.fournisseur?.nom || b.grossiste?.nom || '';
          return nameA.localeCompare(nameB, 'fr');
        },
      },
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        hideOnMobile: true,
        render: (row) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDateShortFR(row.date)}
          </span>
        ),
        sortFn: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      },
      {
        key: 'montant',
        header: 'Montant HT',
        align: 'right' as const,
        sortable: true,
        render: (row) => (
          <span className="font-medium tabular-nums">{formatCurrency(row.net_a_payer)}</span>
        ),
        sortFn: (a, b) => a.net_a_payer - b.net_a_payer,
      },
      {
        key: 'anomalies_count',
        header: 'Anomalies',
        align: 'center' as const,
        hideOnMobile: true,
        render: (row) => {
          const count = row.anomalies?.length || 0;
          return count > 0 ? (
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs font-bold">
              {count}
            </span>
          ) : (
            <span className="text-muted-foreground/50">0</span>
          );
        },
      },
      {
        key: 'statut',
        header: 'Statut',
        align: 'center' as const,
        render: (row) => {
          const statut = row.statut_verification || 'non_verifie';
          const label =
            statut === 'conforme'
              ? 'Conforme'
              : statut === 'anomalie'
                ? 'Anomalie'
                : 'Non verifie';
          return (
            <StatusBadge
              label={label}
              variant={getFactureStatusVariant(statut)}
            />
          );
        },
      },
      {
        key: 'actions',
        header: '',
        align: 'right' as const,
        width: '60px',
        render: (row) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleExportFacturePDF(row.id);
            }}
            disabled={exportingId === row.id}
            className="gap-1.5 h-8"
          >
            {exportingId === row.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
          </Button>
        ),
      },
    ],
    [exportingId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="space-y-6">
      {/* ===== ONBOARDING BANNER ===== */}
      {isApiMode() && onboardingCompleted === false && !bannerDismissed && (
        <OnboardingBanner
          onConfigure={() => navigate('/onboarding')}
          onDismiss={() => {
            setBannerDismissed(true);
            sessionStorage.setItem('pharmaverif_onboarding_banner_dismissed', 'true');
          }}
        />
      )}

      {/* ===== PAGE HEADER + CTA ===== */}
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de vos verifications et anomalies detectees"
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <Button
            onClick={() => onNavigate('verification')}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Verifier une nouvelle facture</span>
            <span className="sm:hidden">Verifier</span>
          </Button>
        }
      />

      {/* ===== STAT CARDS WITH TRENDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Factures verifiees"
          value={stats.total_factures}
          icon={<FileText className="h-5 w-5" />}
          variant="blue"
          loading={loading}
          trend={trends.factures.text}
          trendDirection={trends.factures.direction}
        />
        <StatCard
          label="Anomalies detectees"
          value={stats.total_anomalies}
          icon={<AlertCircle className="h-5 w-5" />}
          variant="orange"
          loading={loading}
          trend={trends.anomalies.text}
          trendDirection={trends.anomalies.direction}
        />
        <StatCard
          label="Montant recuperable"
          value={formatCurrency(stats.economies_potentielles)}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="green"
          loading={loading}
          trend={trends.ecart.text}
          trendDirection={trends.ecart.direction}
        />
        <StatCard
          label="Taux de conformite"
          value={formatPercentage(stats.taux_conformite)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="purple"
          loading={loading}
        />
      </div>

      {/* ===== ERROR STATE ===== */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="shrink-0 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ===== ALERTES PRIORITAIRES ===== */}
      {alertesPrioritaires.length > 0 && (
        <Card className="border-red-200 dark:border-red-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="relative">
                  <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                </div>
                Alertes prioritaires
              </CardTitle>
              {anomalies.filter((a) => a.montant_ecart >= SEUIL_ALERTE_PRIORITAIRE).length > 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('verification')}
                  className="gap-1.5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                >
                  Voir toutes les alertes
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertesPrioritaires.map((alerte) => {
                const facture = factures.find((f) => f.id === alerte.facture_id);
                return (
                  <div
                    key={alerte.id}
                    className="flex items-center justify-between gap-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {alerte.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Facture {facture?.numero || `#${alerte.facture_id}`}
                          {' '}&middot;{' '}
                          Impact : {formatCurrency(alerte.montant_ecart)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
                      onClick={() => onNavigate('verification')}
                    >
                      Traiter
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== CHARTS SECTION ===== */}
      {(loading || anomalies.length > 0 || factures.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Repartition par type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Repartition des anomalies</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonChart height={pieChartHeight} variant="pie" />
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={pieChartHeight}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 35 : 50}
                      outerRadius={isMobile ? 65 : 85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  Aucune anomalie a afficher
                </div>
              )}
            </CardContent>
          </Card>

          {/* Montants par fournisseur */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Montants recuperables par fournisseur</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonChart height={chartHeight} variant="bar" />
              ) : barData.some((d) => d.montant > 0) ? (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart data={barData} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 10, bottom: isMobile ? 5 : 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? 'end' : 'middle'}
                      height={isMobile ? 60 : 30}
                      className="fill-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} className="fill-muted-foreground" />
                    <RechartsTooltip
                      formatter={(value: number) => [formatCurrency(value), 'Montant']}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                    <Bar
                      dataKey="montant"
                      fill={CHART_PALETTE[0]}
                      radius={[4, 4, 0, 0]}
                      name="Montant recuperable"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  Aucune donnee a afficher
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== EVOLUTION MENSUELLE (LineChart) ===== */}
      {(loading || factures.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonChart height={chartHeight} variant="line" />
            ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={monthlyEvolutionData} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="mois"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  interval={isMobile ? 1 : 0}
                  className="fill-muted-foreground"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  className="fill-muted-foreground"
                  allowDecimals={false}
                />
                {!isMobile && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                    tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`}
                  />
                )}
                <RechartsTooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'Montant HT') return [formatCurrency(value), name];
                    return [value, name];
                  }}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="factures"
                  name="Factures"
                  stroke={CHART_PALETTE[0]}
                  strokeWidth={2}
                  dot={{ r: isMobile ? 3 : 4 }}
                  activeDot={{ r: isMobile ? 4 : 6 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="anomalies"
                  name="Anomalies"
                  stroke={CHART_PALETTE[1]}
                  strokeWidth={2}
                  dot={{ r: isMobile ? 3 : 4 }}
                  activeDot={{ r: isMobile ? 4 : 6 }}
                />
                <Line
                  yAxisId={isMobile ? 'left' : 'right'}
                  type="monotone"
                  dataKey="montant"
                  name="Montant HT"
                  stroke={CHART_PALETTE[3]}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: isMobile ? 2 : 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== ANOMALIES RECENTES (simplifie) ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Anomalies recentes{' '}
            <span className="text-muted-foreground font-normal text-sm">
              ({anomalies.length} au total)
            </span>
          </h2>
          {anomalies.length > 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('verification')}
              className="gap-2"
            >
              Voir toutes
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {anomaliesRecentes.length > 0 ? (
          <div className="grid gap-4">
            {anomaliesRecentes.map((anomalie) => (
              <AnomalieCard key={anomalie.id} anomalie={anomalie} />
            ))}
          </div>
        ) : (
          <Alert variant="success">
            <CheckCircle2 className="size-4" />
            <AlertTitle>Aucune anomalie detectee</AlertTitle>
            <AlertDescription>Toutes les factures recentes sont conformes.</AlertDescription>
          </Alert>
        )}
      </div>

      {/* ===== DERNIERES FACTURES (DataTable) ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Dernieres factures analysees</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/factures')}
            className="gap-2"
          >
            <FileCheck className="h-4 w-4" />
            Voir toutes les factures
          </Button>
        </div>

        <DataTable
          data={factures}
          columns={factureColumns}
          rowKey={(row) => row.id}
          loading={loading}
          loadingRows={4}
          emptyMessage="Aucune facture verifiee"
          emptyDescription="Importez vos factures pour commencer l'analyse"
          emptyIcon={<FileText className="h-8 w-8 text-muted-foreground/50" />}
          defaultSort={{ key: 'date', direction: 'desc' }}
        />
      </div>
    </div>
  );
}
