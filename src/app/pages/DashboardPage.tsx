/**
 * PharmaVerif - Tableau de bord (Redesign Prompt 9)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Layout :
 *  - PageHeader + filtre periode
 *  - 4 StatCards (factures, anomalies, RFA, conformite)
 *  - Anomalies recentes + graphique evolution (2 colonnes)
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  FileText,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Download,
  FileDown,
  ClipboardList,
  LayoutDashboard,
  FileCheck,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
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
import { emacApi } from '../api/emacApi';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';
import { OnboardingBanner } from '../components/OnboardingBanner';
import { useNavigate } from 'react-router-dom';
import type { EMACDashboardStats } from '../api/types';

// ========================================
// CONSTANTS
// ========================================

const ANOMALIE_COLORS: Record<string, string> = {
  remise_manquante: '#f59e0b',
  ecart_calcul: '#ef4444',
  remise_incorrecte: '#8b5cf6',
  franco_non_respecte: '#3b82f6',
  prix_suspect: '#ec4899',
  remise_volume_manquante: '#14b8a6',
  condition_non_respectee: '#6366f1',
  rfa_non_appliquee: '#a855f7',
};

const ANOMALIE_LABELS: Record<string, string> = {
  remise_manquante: 'Remise manquante',
  ecart_calcul: 'Ecart de calcul',
  remise_incorrecte: 'Remise incorrecte',
  franco_non_respecte: 'Franco non respecte',
  prix_suspect: 'Prix suspect',
  remise_volume_manquante: 'Remise volume manquante',
  condition_non_respectee: 'Condition non respectee',
  rfa_non_appliquee: 'RFA non appliquee',
};

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
  const [filtreType, setFiltreType] = useState<string>('tous');
  const [factures, setFactures] = useState<Facture[]>([]);
  const [anomalies, setAnomalies] = useState<Anomalie[]>([]);
  const [stats, setStats] = useState({
    total_factures: 0,
    total_anomalies: 0,
    economies_potentielles: 0,
    taux_conformite: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [emacStats, setEmacStats] = useState<EMACDashboardStats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [facturesData, statsData, anomaliesData] = await Promise.all([
        ApiClient.getFactures(),
        ApiClient.getStats(),
        ApiClient.getAnomalies(),
      ]);

      setFactures(facturesData);
      setStats(statsData);
      setAnomalies(anomaliesData);

      if (isApiMode()) {
        try {
          const eStats = await emacApi.getDashboardStats();
          setEmacStats(eStats);
        } catch {
          // EMAC non disponible
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des donnees:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const anomaliesFiltrees = anomalies.filter((a) => {
    if (filtreType !== 'tous' && a.type_anomalie !== filtreType) return false;
    return true;
  });

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

      {/* ===== PAGE HEADER ===== */}
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de vos verifications et anomalies detectees"
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
        }
      />

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Factures verifiees"
          value={stats.total_factures}
          icon={<FileText className="h-5 w-5" />}
          variant="blue"
          loading={loading}
        />
        <StatCard
          label="Anomalies detectees"
          value={stats.total_anomalies}
          icon={<AlertCircle className="h-5 w-5" />}
          variant="orange"
          loading={loading}
        />
        <StatCard
          label="Montant recuperable"
          value={formatCurrency(stats.economies_potentielles)}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="green"
          loading={loading}
        />
        <StatCard
          label="Taux de conformite"
          value={formatPercentage(stats.taux_conformite)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="purple"
          loading={loading}
        />
      </div>

      {/* ===== CHARTS SECTION ===== */}
      {(anomalies.length > 0 || factures.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Repartition par type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Repartition des anomalies</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
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
              {barData.some((d) => d.montant > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
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
                      fill="#3b82f6"
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

      {/* ===== EMAC SECTION (API mode) ===== */}
      {isApiMode() && emacStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                EMAC — Avantages Commerciaux
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('emac')}
              >
                Voir tout
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">EMAC enregistres</p>
                <p className="text-2xl font-bold text-foreground">{emacStats.total_emacs}</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                <p className="text-xs text-amber-600 dark:text-amber-400">En attente</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {emacStats.emacs_non_verifies}
                  {emacStats.nb_emacs_manquants > 0 && (
                    <span className="text-sm ml-1">(+{emacStats.nb_emacs_manquants} manquants)</span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                <p className="text-xs text-blue-600 dark:text-blue-400">Solde a percevoir</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(emacStats.total_solde_a_percevoir)}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-xs text-green-600 dark:text-green-400">Montant recouvrable</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(emacStats.total_montant_recouvrable)}
                </p>
              </div>
            </div>
            {emacStats.emacs_ecart > 0 && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {emacStats.emacs_ecart} EMAC avec ecarts detectes
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== ANOMALIES RECENTES + FILTRE ===== */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Anomalies{' '}
            <span className="text-muted-foreground font-normal text-sm">
              ({anomaliesFiltrees.length} trouvee{anomaliesFiltrees.length > 1 ? 's' : ''})
            </span>
          </h2>
          <Select value={filtreType} onValueChange={setFiltreType}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les types</SelectItem>
              <SelectItem value="remise_manquante">Remise manquante</SelectItem>
              <SelectItem value="ecart_calcul">Ecart de calcul</SelectItem>
              <SelectItem value="remise_incorrecte">Remise incorrecte</SelectItem>
              <SelectItem value="franco_non_respecte">Franco non respecte</SelectItem>
              <SelectItem value="prix_suspect">Prix suspect</SelectItem>
              <SelectItem value="remise_volume_manquante">Remise volume manquante</SelectItem>
              <SelectItem value="condition_non_respectee">Condition non respectee</SelectItem>
              <SelectItem value="rfa_non_appliquee">RFA non appliquee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {anomaliesFiltrees.length > 0 ? (
          <div className="grid gap-4">
            {anomaliesFiltrees.slice(0, 5).map((anomalie) => (
              <AnomalieCard key={anomalie.id} anomalie={anomalie} />
            ))}
            {anomaliesFiltrees.length > 5 && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => onNavigate('verification')}
                  className="gap-2"
                >
                  <FileCheck className="h-4 w-4" />
                  Voir toutes les anomalies ({anomaliesFiltrees.length})
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20 w-fit mx-auto mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="font-medium text-foreground">Aucune anomalie trouvee</p>
              <p className="text-sm text-muted-foreground mt-1">
                Verifiez des factures pour voir les resultats ici
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== DERNIERES FACTURES (DataTable) ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Dernieres factures analysees</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('verification')}
            className="gap-2"
          >
            <FileCheck className="h-4 w-4" />
            Verifier une facture
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
