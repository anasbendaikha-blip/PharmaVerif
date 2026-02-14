/**
 * PharmaVerif - Page Demo / Tests Visuels
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Page de demonstration des composants UI dans differents scenarios :
 *  - Dashboard avec beaucoup d'anomalies vs peu
 *  - Tableau avec filtres actifs
 *  - Etats vides, loading, erreurs
 *
 * Accessible via /demo (sans authentification requise).
 */

import { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  Loader2,
  Inbox,
  Search,
  Eye,
  ShieldCheck,
  Activity,
  Banknote,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

import { PageHeader } from '../components/ui/page-header';
import { StatCard } from '../components/ui/stat-card';
import { DataTable, type DataTableColumn } from '../components/ui/data-table';
import { StatusBadge, getFactureStatusVariant } from '../components/ui/status-badge';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CHART_PALETTE } from '../components/ui/chart-colors';
import { cn } from '../components/ui/utils';
import { formatCurrency } from '../utils/formatNumber';

// ========================================
// TYPES LOCAUX
// ========================================

interface DemoFacture {
  id: number;
  numero: string;
  date: string;
  fournisseur: string;
  montant_brut_ht: number;
  net_a_payer: number;
  statut_verification: 'conforme' | 'anomalie' | 'non_verifie';
  nb_anomalies: number;
}

type DemoScenario = 'beaucoup-anomalies' | 'peu-anomalies' | 'loading' | 'vide' | 'erreur';

// ========================================
// DONNEES MOCK POUR LES SCENARIOS
// ========================================

const SCENARIO_BEAUCOUP: DemoFacture[] = [
  { id: 1, numero: 'FAC-CERP-2026-001', date: '2026-02-10', fournisseur: 'CERP Rouen', montant_brut_ht: 18500, net_a_payer: 17200, statut_verification: 'anomalie', nb_anomalies: 3 },
  { id: 2, numero: 'FAC-OCP-2026-002', date: '2026-02-09', fournisseur: 'OCP', montant_brut_ht: 22300, net_a_payer: 20100, statut_verification: 'anomalie', nb_anomalies: 2 },
  { id: 3, numero: 'FAC-ALL-2026-001', date: '2026-02-08', fournisseur: 'Alliance Healthcare', montant_brut_ht: 15600, net_a_payer: 14800, statut_verification: 'conforme', nb_anomalies: 0 },
  { id: 4, numero: 'FAC-PHX-2026-003', date: '2026-02-07', fournisseur: 'Phoenix Pharma', montant_brut_ht: 9800, net_a_payer: 8900, statut_verification: 'anomalie', nb_anomalies: 1 },
  { id: 5, numero: 'FAC-SAN-2026-001', date: '2026-02-06', fournisseur: 'Sanofi', montant_brut_ht: 7200, net_a_payer: 7200, statut_verification: 'anomalie', nb_anomalies: 4 },
  { id: 6, numero: 'FAC-BIO-2026-002', date: '2026-02-05', fournisseur: 'Biogaran', montant_brut_ht: 4500, net_a_payer: 4200, statut_verification: 'anomalie', nb_anomalies: 2 },
  { id: 7, numero: 'FAC-CERP-2026-004', date: '2026-02-04', fournisseur: 'CERP Rouen', montant_brut_ht: 21000, net_a_payer: 19500, statut_verification: 'conforme', nb_anomalies: 0 },
  { id: 8, numero: 'FAC-OCP-2026-005', date: '2026-02-03', fournisseur: 'OCP', montant_brut_ht: 16400, net_a_payer: 15200, statut_verification: 'anomalie', nb_anomalies: 1 },
];

const SCENARIO_PEU: DemoFacture[] = [
  { id: 1, numero: 'FAC-CERP-2026-001', date: '2026-02-10', fournisseur: 'CERP Rouen', montant_brut_ht: 18500, net_a_payer: 17200, statut_verification: 'conforme', nb_anomalies: 0 },
  { id: 2, numero: 'FAC-OCP-2026-002', date: '2026-02-09', fournisseur: 'OCP', montant_brut_ht: 22300, net_a_payer: 20800, statut_verification: 'conforme', nb_anomalies: 0 },
  { id: 3, numero: 'FAC-ALL-2026-001', date: '2026-02-08', fournisseur: 'Alliance Healthcare', montant_brut_ht: 15600, net_a_payer: 14800, statut_verification: 'conforme', nb_anomalies: 0 },
  { id: 4, numero: 'FAC-PHX-2026-003', date: '2026-02-07', fournisseur: 'Phoenix Pharma', montant_brut_ht: 9800, net_a_payer: 9500, statut_verification: 'conforme', nb_anomalies: 0 },
  { id: 5, numero: 'FAC-SAN-2026-001', date: '2026-02-06', fournisseur: 'Sanofi', montant_brut_ht: 7200, net_a_payer: 7200, statut_verification: 'conforme', nb_anomalies: 0 },
  { id: 6, numero: 'FAC-BIO-2026-002', date: '2026-02-05', fournisseur: 'Biogaran', montant_brut_ht: 4500, net_a_payer: 4350, statut_verification: 'anomalie', nb_anomalies: 1 },
  { id: 7, numero: 'FAC-CERP-2026-004', date: '2026-02-04', fournisseur: 'CERP Rouen', montant_brut_ht: 21000, net_a_payer: 19500, statut_verification: 'conforme', nb_anomalies: 0 },
  { id: 8, numero: 'FAC-OCP-2026-005', date: '2026-02-03', fournisseur: 'OCP', montant_brut_ht: 16400, net_a_payer: 15400, statut_verification: 'conforme', nb_anomalies: 0 },
];

// Donnees graphiques — beaucoup d'anomalies
const CHART_BEAUCOUP_EVOLUTION = [
  { mois: 'Sep', factures: 42, anomalies: 18, montant: 380000 },
  { mois: 'Oct', factures: 48, anomalies: 22, montant: 420000 },
  { mois: 'Nov', factures: 45, anomalies: 25, montant: 395000 },
  { mois: 'Dec', factures: 50, anomalies: 28, montant: 450000 },
  { mois: 'Jan', factures: 55, anomalies: 32, montant: 480000 },
  { mois: 'Fev', factures: 52, anomalies: 30, montant: 460000 },
];

// Donnees graphiques — peu d'anomalies
const CHART_PEU_EVOLUTION = [
  { mois: 'Sep', factures: 42, anomalies: 3, montant: 380000 },
  { mois: 'Oct', factures: 48, anomalies: 2, montant: 420000 },
  { mois: 'Nov', factures: 45, anomalies: 4, montant: 395000 },
  { mois: 'Dec', factures: 50, anomalies: 1, montant: 450000 },
  { mois: 'Jan', factures: 55, anomalies: 2, montant: 480000 },
  { mois: 'Fev', factures: 52, anomalies: 1, montant: 460000 },
];

const PIE_BEAUCOUP = [
  { name: 'Remise manquante', value: 45 },
  { name: 'Ecart calcul', value: 25 },
  { name: 'Franco non respecte', value: 15 },
  { name: 'Prix suspect', value: 10 },
  { name: 'Autre', value: 5 },
];

const PIE_PEU = [
  { name: 'Remise manquante', value: 3 },
  { name: 'Ecart calcul', value: 1 },
];

const BAR_BEAUCOUP = [
  { fournisseur: 'CERP', anomalies: 28, montant: 4500 },
  { fournisseur: 'OCP', anomalies: 22, montant: 3800 },
  { fournisseur: 'Alliance', anomalies: 18, montant: 2900 },
  { fournisseur: 'Phoenix', anomalies: 15, montant: 2200 },
  { fournisseur: 'Sanofi', anomalies: 12, montant: 1800 },
  { fournisseur: 'Biogaran', anomalies: 8, montant: 1200 },
];

const BAR_PEU = [
  { fournisseur: 'CERP', anomalies: 2, montant: 150 },
  { fournisseur: 'OCP', anomalies: 1, montant: 80 },
  { fournisseur: 'Alliance', anomalies: 0, montant: 0 },
  { fournisseur: 'Phoenix', anomalies: 1, montant: 120 },
  { fournisseur: 'Sanofi', anomalies: 0, montant: 0 },
  { fournisseur: 'Biogaran', anomalies: 0, montant: 0 },
];

// ========================================
// COLONNES DATATABLE
// ========================================

const demoColumns: DataTableColumn<DemoFacture>[] = [
  {
    key: 'numero',
    header: 'Numero',
    sortable: true,
    render: (row) => (
      <span className="font-mono text-xs font-medium">{row.numero}</span>
    ),
  },
  {
    key: 'date',
    header: 'Date',
    sortable: true,
    accessor: 'date',
    hideOnMobile: true,
  },
  {
    key: 'fournisseur',
    header: 'Fournisseur',
    sortable: true,
    accessor: 'fournisseur',
  },
  {
    key: 'montant_brut_ht',
    header: 'Montant HT',
    align: 'right',
    sortable: true,
    render: (row) => (
      <span className="font-mono tabular-nums">{formatCurrency(row.montant_brut_ht)}</span>
    ),
    hideOnMobile: true,
  },
  {
    key: 'net_a_payer',
    header: 'Net a payer',
    align: 'right',
    sortable: true,
    render: (row) => (
      <span className="font-mono tabular-nums">{formatCurrency(row.net_a_payer)}</span>
    ),
  },
  {
    key: 'statut',
    header: 'Statut',
    align: 'center',
    render: (row) => (
      <StatusBadge
        label={row.statut_verification === 'conforme' ? 'Conforme' : row.statut_verification === 'anomalie' ? 'Anomalie' : 'Non verifie'}
        variant={getFactureStatusVariant(row.statut_verification)}
        dot
      />
    ),
  },
  {
    key: 'anomalies',
    header: 'Anomalies',
    align: 'center',
    render: (row) =>
      row.nb_anomalies > 0 ? (
        <Badge variant="destructive">{row.nb_anomalies}</Badge>
      ) : (
        <span className="text-muted-foreground text-xs">-</span>
      ),
    hideOnMobile: true,
  },
];

// ========================================
// SECTION TITLE
// ========================================

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mt-12 mb-6 flex items-center gap-3', className)}>
      <div className="h-px flex-1 bg-border" />
      <h2 className="text-lg font-semibold text-foreground shrink-0">{children}</h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ========================================
// SCENARIO SELECTOR
// ========================================

const SCENARIOS: Array<{ key: DemoScenario; label: string; icon: React.ReactNode }> = [
  { key: 'beaucoup-anomalies', label: 'Beaucoup d\'anomalies', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'peu-anomalies', label: 'Peu d\'anomalies', icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: 'loading', label: 'Loading', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  { key: 'vide', label: 'Etats vides', icon: <Inbox className="h-4 w-4" /> },
  { key: 'erreur', label: 'Erreurs', icon: <XCircle className="h-4 w-4" /> },
];

// ========================================
// MAIN COMPONENT
// ========================================

interface DemoPageProps {
  onNavigate: (page: string) => void;
}

export function DemoPage({ onNavigate }: DemoPageProps) {
  const [scenario, setScenario] = useState<DemoScenario>('beaucoup-anomalies');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const isBeaucoup = scenario === 'beaucoup-anomalies';
  const isPeu = scenario === 'peu-anomalies';
  const isLoading = scenario === 'loading';
  const isVide = scenario === 'vide';
  const isErreur = scenario === 'erreur';

  const currentData = isBeaucoup ? SCENARIO_BEAUCOUP : isPeu ? SCENARIO_PEU : [];
  const evolutionData = isBeaucoup ? CHART_BEAUCOUP_EVOLUTION : CHART_PEU_EVOLUTION;
  const pieData = isBeaucoup ? PIE_BEAUCOUP : PIE_PEU;
  const barData = isBeaucoup ? BAR_BEAUCOUP : BAR_PEU;

  // Filtres simules
  const filteredData = activeFilter
    ? currentData.filter((f) =>
        activeFilter === 'conforme'
          ? f.statut_verification === 'conforme'
          : activeFilter === 'anomalie'
            ? f.statut_verification === 'anomalie'
            : true
      )
    : currentData;

  // KPIs
  const totalFactures = isBeaucoup ? 55 : isPeu ? 52 : 0;
  const totalAnomalies = isBeaucoup ? 155 : isPeu ? 13 : 0;
  const montantRecuperable = isBeaucoup ? 16420 : isPeu ? 350 : 0;
  const tauxConformite = isBeaucoup ? 43.6 : isPeu ? 96.2 : 0;

  return (
    <div className="space-y-0">
      {/* HEADER */}
      <PageHeader
        title="Tests Visuels"
        description="Demonstration des composants PharmaVerif dans differents scenarios"
        icon={<Eye className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            Retour au Dashboard
          </Button>
        }
      />

      {/* SCENARIO SELECTOR */}
      <div className="bg-card border rounded-xl p-4 mb-8">
        <p className="text-sm font-medium text-muted-foreground mb-3">Scenario actif :</p>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <Button
              key={s.key}
              variant={scenario === s.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setScenario(s.key);
                setActiveFilter(null);
              }}
            >
              {s.icon}
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ====================================================== */}
      {/* SECTION 1 : DASHBOARD STATS CARDS                      */}
      {/* ====================================================== */}
      <SectionTitle>1. Dashboard - StatCards</SectionTitle>

      {isErreur ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>
            Impossible de charger les statistiques. Verifiez votre connexion et reessayez.
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setScenario('beaucoup-anomalies')}>
                Reessayer
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total factures"
            value={isLoading ? 0 : totalFactures}
            icon={<FileText className="h-5 w-5" />}
            variant="blue"
            trend={isBeaucoup ? '+8 ce mois' : isPeu ? '+3 ce mois' : undefined}
            trendDirection="up"
            loading={isLoading}
          />
          <StatCard
            label="Taux de conformite"
            value={isLoading ? '' : `${tauxConformite}%`}
            icon={<ShieldCheck className="h-5 w-5" />}
            variant={isBeaucoup ? 'red' : 'green'}
            trend={isBeaucoup ? '-5.2% ce mois' : isPeu ? '+1.8% ce mois' : undefined}
            trendDirection={isBeaucoup ? 'down' : 'up'}
            loading={isLoading}
          />
          <StatCard
            label="Anomalies detectees"
            value={isLoading ? 0 : totalAnomalies}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant={isBeaucoup ? 'red' : 'green'}
            trend={isBeaucoup ? '+32 ce mois' : isPeu ? '-2 ce mois' : undefined}
            trendDirection={isBeaucoup ? 'up' : 'down'}
            loading={isLoading}
            subtitle={isBeaucoup ? 'En hausse constante' : isPeu ? 'Tres peu d\'ecarts' : undefined}
          />
          <StatCard
            label="Montant recuperable"
            value={isLoading ? '' : formatCurrency(montantRecuperable)}
            icon={<Banknote className="h-5 w-5" />}
            variant={isBeaucoup ? 'orange' : 'green'}
            trend={isBeaucoup ? '+3 200 EUR ce mois' : isPeu ? '+50 EUR ce mois' : undefined}
            trendDirection="up"
            loading={isLoading}
          />
        </div>
      )}

      {/* Etat vide — aucune donnee */}
      {isVide && (
        <div className="mt-4">
          <Alert variant="info">
            <Inbox className="h-4 w-4" />
            <AlertTitle>Aucune donnee disponible</AlertTitle>
            <AlertDescription>
              Commencez par importer vos premieres factures pour voir apparaitre les statistiques.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* ====================================================== */}
      {/* SECTION 2 : CHARTS                                     */}
      {/* ====================================================== */}
      <SectionTitle>2. Dashboard - Graphiques</SectionTitle>

      {isErreur ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Evolution mensuelle</h3>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <XCircle className="h-10 w-10 text-destructive/50 mb-3" />
              <p className="text-sm font-medium text-destructive">Erreur de chargement des graphiques</p>
              <p className="text-xs text-muted-foreground mt-1">ERR_NETWORK: Timeout apres 30s</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setScenario('beaucoup-anomalies')}>
                Reessayer
              </Button>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Repartition par type</h3>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <XCircle className="h-10 w-10 text-destructive/50 mb-3" />
              <p className="text-sm font-medium text-destructive">Impossible de charger les donnees</p>
              <p className="text-xs text-muted-foreground mt-1">HTTP 500: Internal Server Error</p>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Loading skeleton for charts */}
          <div className="bg-card border rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-6" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="bg-card border rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-6" />
            <div className="flex items-center justify-center h-64">
              <div className="h-48 w-48 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          </div>
        </div>
      ) : isVide ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Evolution mensuelle</h3>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune donnee a afficher</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Les graphiques apparaitront apres l'import de factures</p>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Repartition des anomalies</h3>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune anomalie detectee</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LineChart — Evolution mensuelle */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">
              Evolution mensuelle
              {isBeaucoup && (
                <Badge variant="destructive" className="ml-2">Tendance critique</Badge>
              )}
              {isPeu && (
                <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">Bonne sante</Badge>
              )}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="factures" stroke={CHART_PALETTE[0]} strokeWidth={2} name="Factures" />
                  <Line yAxisId="left" type="monotone" dataKey="anomalies" stroke={CHART_PALETTE[1]} strokeWidth={2} name="Anomalies" />
                  <Line yAxisId="right" type="monotone" dataKey="montant" stroke={CHART_PALETTE[3]} strokeWidth={2} strokeDasharray="5 5" name="Montant (EUR)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PieChart — Repartition anomalies */}
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Repartition des anomalies par type</h3>
            {pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <CheckCircle2 className="h-10 w-10 text-green-500/50 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune anomalie</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BarChart — Anomalies par fournisseur (seulement pour beaucoup/peu) */}
      {(isBeaucoup || isPeu) && (
        <div className="bg-card border rounded-xl p-6 mt-6">
          <h3 className="text-sm font-semibold mb-4">
            Anomalies par fournisseur
            {isBeaucoup && <span className="text-xs font-normal text-muted-foreground ml-2">(tous presentent des ecarts)</span>}
            {isPeu && <span className="text-xs font-normal text-muted-foreground ml-2">(ecarts isoles)</span>}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="fournisseur" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="anomalies" fill={CHART_PALETTE[1]} radius={[4, 4, 0, 0]} name="Anomalies" />
                <Bar dataKey="montant" fill={CHART_PALETTE[2]} radius={[4, 4, 0, 0]} name="Montant ecart (EUR)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* SECTION 3 : TABLEAU AVEC FILTRES                       */}
      {/* ====================================================== */}
      <SectionTitle>3. Tableau - Filtres actifs</SectionTitle>

      {/* Barre de filtres simulee */}
      {!isErreur && (
        <div className="bg-card border rounded-xl p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une facture..."
                className="pl-9"
                readOnly
              />
            </div>

            {/* Status chips */}
            <div className="flex gap-2">
              <Button
                variant={activeFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(null)}
              >
                Toutes
                <Badge variant="secondary" className="ml-1.5">
                  {currentData.length}
                </Badge>
              </Button>
              <Button
                variant={activeFilter === 'conforme' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(activeFilter === 'conforme' ? null : 'conforme')}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Conformes
                <Badge variant="secondary" className="ml-1.5">
                  {currentData.filter((f) => f.statut_verification === 'conforme').length}
                </Badge>
              </Button>
              <Button
                variant={activeFilter === 'anomalie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(activeFilter === 'anomalie' ? null : 'anomalie')}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                Anomalies
                <Badge variant="secondary" className="ml-1.5">
                  {currentData.filter((f) => f.statut_verification === 'anomalie').length}
                </Badge>
              </Button>
            </div>
          </div>

          {/* Active filter tag */}
          {activeFilter && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Filtre actif :</span>
              <Badge variant="outline" className="gap-1">
                {activeFilter === 'conforme' ? 'Conformes' : 'Anomalies'}
                <button
                  className="ml-1 hover:text-foreground"
                  onClick={() => setActiveFilter(null)}
                >
                  x
                </button>
              </Badge>
              <span className="text-muted-foreground/70">
                — {filteredData.length} resultat{filteredData.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* DataTable */}
      {isErreur ? (
        <div className="bg-card border rounded-xl p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-3 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="font-semibold text-foreground">Erreur de chargement</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Une erreur est survenue lors du chargement des factures. Le serveur a retourne une erreur 500.
            </p>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs font-mono text-muted-foreground max-w-md text-left">
              <p>GET /api/v1/invoices?page=1&limit=20</p>
              <p className="text-destructive">HTTP 500 Internal Server Error</p>
              <p>Response: {'{"detail": "Database connection failed"}'}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setScenario('beaucoup-anomalies')}>
                Reessayer
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('contact')}>
                Contacter le support
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <DataTable<DemoFacture>
          data={filteredData}
          columns={demoColumns}
          rowKey={(row) => row.id}
          loading={isLoading}
          loadingRows={6}
          emptyMessage={isVide ? 'Aucune facture importee' : 'Aucune facture correspondante'}
          emptyDescription={
            isVide
              ? 'Importez vos premieres factures pour commencer la verification'
              : 'Modifiez vos filtres pour trouver des resultats'
          }
          emptyIcon={
            isVide ? (
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            ) : (
              <Search className="h-8 w-8 text-muted-foreground/50" />
            )
          }
          defaultSort={{ key: 'date', direction: 'desc' }}
        />
      )}

      {/* Pagination simulee (seulement pour beaucoup/peu) */}
      {(isBeaucoup || isPeu) && !activeFilter && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            Affichage de 1-{filteredData.length} sur {totalFactures} factures
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled>
              Precedent
            </Button>
            <Button variant="default" size="sm">1</Button>
            <Button variant="outline" size="sm">2</Button>
            <Button variant="outline" size="sm">3</Button>
            <Button variant="outline" size="sm">
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* SECTION 4 : COMPOSANTS ALERT (toutes variantes)        */}
      {/* ====================================================== */}
      <SectionTitle>4. Alertes - Toutes variantes</SectionTitle>

      <div className="space-y-3">
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Verification terminee</AlertTitle>
          <AlertDescription>
            Toutes les factures ont ete verifiees. Aucune anomalie detectee sur la derniere importation.
          </AlertDescription>
        </Alert>

        <Alert variant="info">
          <Activity className="h-4 w-4" />
          <AlertTitle>Mise a jour disponible</AlertTitle>
          <AlertDescription>
            Une nouvelle version du moteur de verification est disponible. Les nouveaux taux CERP 2026 ont ete mis a jour.
          </AlertDescription>
        </Alert>

        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ecarts detectes sur 3 factures</AlertTitle>
          <AlertDescription>
            Des ecarts mineurs (50-200 EUR) ont ete detectes sur les factures FAC-OCP-2026-005, FAC-PHX-2026-003 et FAC-BIO-2026-002.
            Verifiez les remises appliquees par rapport aux conditions negociees.
          </AlertDescription>
        </Alert>

        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Anomalies critiques</AlertTitle>
          <AlertDescription>
            5 factures presentent des ecarts superieurs a 500 EUR. Montant total recuperable : 3 280 EUR.
            Action immediate recommandee.
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                Voir les details
              </Button>
              <Button size="sm" variant="ghost">
                Ignorer
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <Alert>
          <FileText className="h-4 w-4" />
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>
            Le prochain import automatique est prevu le 15/02/2026 a 06:00.
            Les factures des 8 fournisseurs actifs seront verifiees automatiquement.
          </AlertDescription>
        </Alert>
      </div>

      {/* ====================================================== */}
      {/* SECTION 5 : STATUS BADGES                              */}
      {/* ====================================================== */}
      <SectionTitle>5. StatusBadges & Badges</SectionTitle>

      <div className="bg-card border rounded-xl p-6 space-y-6">
        {/* StatusBadge variants */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">StatusBadge — Variantes</h3>
          <div className="flex flex-wrap gap-3">
            <StatusBadge label="Conforme" variant="success" dot />
            <StatusBadge label="En attente" variant="warning" dot pulse />
            <StatusBadge label="Anomalie" variant="error" dot />
            <StatusBadge label="En cours" variant="info" dot pulse />
            <StatusBadge label="Non verifie" variant="neutral" dot />
          </div>
        </div>

        {/* StatusBadge sizes */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">StatusBadge — Tailles</h3>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label="Small" variant="success" size="sm" dot />
            <StatusBadge label="Medium" variant="info" size="md" dot />
          </div>
        </div>

        {/* Badge variants */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Badge — Variantes</h3>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* SECTION 6 : STAT CARDS — TOUTES VARIANTES              */}
      {/* ====================================================== */}
      <SectionTitle>6. StatCards - Toutes variantes</SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Default"
          value="1 234"
          icon={<FileText className="h-5 w-5" />}
          variant="default"
          trend="+12% ce mois"
          trendDirection="up"
        />
        <StatCard
          label="Blue"
          value="55"
          icon={<BarChart3 className="h-5 w-5" />}
          variant="blue"
          trend="+8 factures"
          trendDirection="up"
          subtitle="Total du mois en cours"
        />
        <StatCard
          label="Green (succes)"
          value="96,2%"
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="green"
          trend="+1.8% ce mois"
          trendDirection="up"
        />
        <StatCard
          label="Orange (attention)"
          value="15"
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="orange"
          trend="+3 ce mois"
          trendDirection="up"
        />
        <StatCard
          label="Red (critique)"
          value="5"
          icon={<XCircle className="h-5 w-5" />}
          variant="red"
          trend="+2 ce mois"
          trendDirection="up"
          subtitle="Action immediate requise"
        />
        <StatCard
          label="Purple"
          value="8"
          icon={<TrendingUp className="h-5 w-5" />}
          variant="purple"
          trend="Stable"
          trendDirection="neutral"
        />
      </div>

      {/* Loading skeleton */}
      <div className="mt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">StatCards — Loading state :</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="" value="" loading />
          <StatCard label="" value="" loading />
          <StatCard label="" value="" loading />
          <StatCard label="" value="" loading />
        </div>
      </div>

      {/* Clickable */}
      <div className="mt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">StatCards — Cliquables (hover pour voir) :</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Cliquez-moi"
            value="42"
            icon={<FileText className="h-5 w-5" />}
            variant="blue"
            onClick={() => alert('StatCard cliquee !')}
          />
          <StatCard
            label="Avec tendance"
            value="87%"
            icon={<TrendingUp className="h-5 w-5" />}
            variant="green"
            trend="+5%"
            trendDirection="up"
            onClick={() => alert('StatCard cliquee !')}
          />
        </div>
      </div>

      {/* ====================================================== */}
      {/* SECTION 7 : DATATABLE — EMPTY + LOADING                */}
      {/* ====================================================== */}
      <SectionTitle>7. DataTable - Etats speciaux</SectionTitle>

      <div className="space-y-6">
        {/* Loading */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Loading (skeleton) :</p>
          <DataTable<DemoFacture>
            data={[]}
            columns={demoColumns}
            loading={true}
            loadingRows={4}
          />
        </div>

        {/* Empty — default */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Etat vide (defaut) :</p>
          <DataTable<DemoFacture>
            data={[]}
            columns={demoColumns}
          />
        </div>

        {/* Empty — custom */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Etat vide (personnalise) :</p>
          <DataTable<DemoFacture>
            data={[]}
            columns={demoColumns}
            emptyMessage="Aucune facture trouvee"
            emptyDescription="Essayez de modifier vos criteres de recherche ou de reinitialiser les filtres"
            emptyIcon={<Search className="h-8 w-8 text-muted-foreground/50" />}
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-12 mb-8 text-center text-xs text-muted-foreground">
        <p>PharmaVerif — Page de tests visuels</p>
        <p className="mt-1">Utilisez le selecteur de scenarios en haut pour naviguer entre les differents etats.</p>
      </div>
    </div>
  );
}
