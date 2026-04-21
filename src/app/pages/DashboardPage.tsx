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
import { AlertBanner } from '../components/dashboard/AlertBanner';
import { AnomalyTable, type AnomalyRow } from '../components/dashboard/AnomalyTable';
import { VerificationEnginePanel } from '../components/dashboard/VerificationEnginePanel';
import { TopSuppliersCard } from '../components/dashboard/TopSuppliersCard';
import { RecoveryChart } from '../components/dashboard/RecoveryChart';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
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
import { rapportsApi } from '../api/rapportsApi';
import { db } from '../data/database';
import { toast } from 'sonner';
import { formatCurrency, formatPercentage, formatDateShortFR } from '../utils/formatNumber';
import { isApiMode } from '../api/config';
import { getErrorMessage } from '../api/httpClient';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';
import { useAuth } from '../contexts/AuthContext';
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
  const { user } = useAuth();
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
      // Backend genere le PDF (phase-3) — remplace l'ancien jsPDF cote client.
      await rapportsApi.downloadFactureVerification(factureId);
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

      {/* ===== DASHBOARD HEADER — données réelles du contexte auth ===== */}
      <DashboardHeader
        pharmacyName="Tableau de bord"
        userName={user?.name || user?.nom && user?.prenom ? `${user.prenom} ${user.nom}` : 'Utilisateur'}
        userRole={user?.role}
      />

      {/* ═══════════════════════════════════════════════════════════════
          DÉCISION B (21 avril 2026) — Désactivation des composants mock.
          Tout ce qui suit est commenté car alimenté par mock data
          (ApiClient wraps localStorage, pas le vrai backend PostgreSQL).

          Sera réactivé composant par composant quand l'endpoint
          GET /api/v1/dashboard retournera les vraies agrégations.

          Composants désactivés :
            - 4 KPI cards (stats viennent de ApiClient.getStats → mock localStorage)
            - AlertBanner (CERP 1284€ fictif)
            - AnomalyTable Top 5 (5 anomalies inventées)
            - VerificationEnginePanel (7 règles hardcodées)
            - TopSuppliersCard (5 fournisseurs fictifs)
            - RecoveryChart 12 mois (données inventées)
            - Charts (donut, bar, line — tous mock)
            - Alertes prioritaires (écarts OCP inventés)
            - Anomalies récentes (mock localStorage)
            - DataTable factures (mock localStorage)

          Composants conservés :
            - DashboardHeader (structural)
            - Sidebar + navigation (structural)
            - Placeholder d'onboarding ci-dessous
          ═══════════════════════════════════════════════════════════════ */}

      {/* ===== PLACEHOLDER HONNÊTE — en attendant les vraies données ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-pv-ink-100/70 rounded-xl p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-pv-ink-50 grid place-items-center">
              <FileCheck className="h-6 w-6 text-pv-ink-500" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-pv-ink-900">
                Bienvenue sur PharmaVerif
              </h2>
              <p className="mt-2 text-[14px] text-pv-slate-600 leading-relaxed">
                Votre espace de vérification de factures pharmaceutiques est prêt.
                Déposez vos factures laboratoire pour débloquer les analyses avancées :
                détection d'anomalies, suivi des RFA, vérification EMAC, et statistiques fournisseurs.
              </p>
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={() => navigate('/factures-labo')}
                  className="gap-2 bg-pv-ink-900 hover:bg-pv-ink-800 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Déposer une facture
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/verification')}
                  className="gap-2"
                >
                  <FileCheck className="h-4 w-4" />
                  Vérifier manuellement
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-pv-ink-100/70 rounded-xl p-6 shadow-sm">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-pv-slate-500">
            Moteur de vérification
          </h3>
          <p className="mt-2 text-[28px] font-semibold text-pv-ink-900">7 règles</p>
          <p className="mt-1 text-[13px] text-pv-slate-500">actives et prêtes</p>
          <div className="mt-4 space-y-1.5 text-[12px] text-pv-slate-600">
            <p>✓ Remises par tranche (A/B/OTC)</p>
            <p>✓ Escompte non appliqué</p>
            <p>✓ Franco de port</p>
            <p>✓ RFA progression</p>
            <p>✓ Gratuités et ratios</p>
            <p>✓ Cohérence TVA</p>
            <p>✓ Calcul arithmétique</p>
          </div>
        </div>
      </div>

      {/*
      ═══ DÉBUT SECTION DÉSACTIVÉE — KPI CARDS (mock data) ═══
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      ... [4 KPI cards commentées - alimentées par ApiClient.getStats() mock] ...
      </div>
      ═══ FIN KPI CARDS ═══
      */}

      {/*
      ═══ DÉBUT SECTION DÉSACTIVÉE — ALERT BANNER + ANOMALY TABLE + PANELS (mock data) ═══
      <AlertBanner ... /> — CERP 1284€ fictif
      <AnomalyTable anomalies={[...]} /> — 5 anomalies inventées
      <VerificationEnginePanel /> — stats hardcodées
      <TopSuppliersCard /> — fournisseurs fictifs
      <RecoveryChart /> — 12 mois inventés
      ═══ FIN SECTION ═══
      */}

      {/* ===== SECTION DÉSACTIVÉE — Les sections originales ci-dessous sont aussi mock ===== */}
      {/* Les charts (Répartition anomalies, Montants par fournisseur, Évolution mensuelle),
          alertes prioritaires, anomalies récentes et DataTable factures utilisent tous
          ApiClient (mock localStorage). Désactivés en bloc. */}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DÉCISION B — DEAD CODE (mock data) — 21 avril 2026
   ═══════════════════════════════════════════════════════════════════════
   Tout le code ci-dessous est du dashboard historique alimenté par mock
   data (ApiClient → localStorage, pas le vrai backend PostgreSQL).
   Conservé pour référence et réactivation future quand
   GET /api/v1/dashboard retournera les vraies agrégations.

   Pour réactiver : supprimer le `function _DISABLED_DashboardLegacy`
   et reintégrer les sections voulues dans DashboardPage ci-dessus.
   ═══════════════════════════════════════════════════════════════════════ */
