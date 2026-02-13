/**
 * PharmaVerif - Page Rapports & Historique
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { PageHeader } from '../components/ui/page-header';
import { StatCard } from '../components/ui/stat-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { FileBarChart, TrendingUp, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Badge } from '../components/ui/badge';
import { db } from '../data/database';
import { Facture, Anomalie, Fournisseur } from '../types';
import { formatCurrency, formatPercentage } from '../utils/formatNumber';

interface ReportsPageProps {
  onNavigate: (page: string) => void;
}

export function ReportsPage({ onNavigate: _onNavigate }: ReportsPageProps) {
  const [factures] = useState<Facture[]>(() => db.getAllFactures());
  const [anomalies] = useState<Anomalie[]>(() => db.getAllAnomalies());
  const [periode, setPeriode] = useState('30');

  // Filter by period
  const filteredFactures = useMemo(() => {
    const now = new Date();
    const days = parseInt(periode);
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return factures.filter((f) => new Date(f.created_at) >= cutoff);
  }, [factures, periode]);

  const filteredAnomalies = useMemo(() => {
    const now = new Date();
    const days = parseInt(periode);
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return anomalies.filter((a) => new Date(a.created_at) >= cutoff);
  }, [anomalies, periode]);

  // KPIs
  const kpis = useMemo(() => {
    const totalFactures = filteredFactures.length;
    const totalAnomalies = filteredAnomalies.length;
    const montantRecuperable = filteredAnomalies.reduce((sum, a) => sum + a.montant_ecart, 0);
    const conformes = filteredFactures.filter((f) => f.statut_verification === 'conforme').length;
    const tauxConformite = totalFactures > 0 ? (conformes / totalFactures) * 100 : 0;

    return { totalFactures, totalAnomalies, montantRecuperable, tauxConformite };
  }, [filteredFactures, filteredAnomalies]);

  // Timeline data for LineChart
  const timelineData = useMemo(() => {
    const days = parseInt(periode);
    const data: { date: string; anomalies: number; factures: number; montant: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dateLabel = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      const dayFactures = filteredFactures.filter(
        (f) => f.created_at.split('T')[0] === dateStr
      ).length;
      const dayAnomalies = filteredAnomalies.filter((a) => a.created_at.split('T')[0] === dateStr);
      const dayMontant = dayAnomalies.reduce((sum, a) => sum + a.montant_ecart, 0);

      data.push({
        date: dateLabel,
        anomalies: dayAnomalies.length,
        factures: dayFactures,
        montant: parseFloat(dayMontant.toFixed(2)),
      });
    }

    // Show only every Nth point to avoid clutter
    const step = Math.max(1, Math.floor(data.length / 15));
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [filteredFactures, filteredAnomalies, periode]);

  // Cumulative data for AreaChart
  const cumulativeData = useMemo(() => {
    let cumul = 0;
    return timelineData.map((d) => {
      cumul += d.montant;
      return { ...d, cumulatif: parseFloat(cumul.toFixed(2)) };
    });
  }, [timelineData]);

  // Stats by fournisseur
  const fournisseurStats = useMemo(() => {
    const fournisseurs = db.getAllFournisseurs();
    return fournisseurs.map((g) => {
      const gFactures = filteredFactures.filter((f) => f.fournisseur_id === g.id);
      const gAnomalies = filteredAnomalies.filter((a) =>
        gFactures.some((f) => f.id === a.facture_id)
      );
      const montant = gAnomalies.reduce((sum, a) => sum + a.montant_ecart, 0);
      const conformes = gFactures.filter((f) => f.statut_verification === 'conforme').length;
      const taux = gFactures.length > 0 ? (conformes / gFactures.length) * 100 : 0;

      return {
        id: g.id,
        nom: g.nom,
        type_fournisseur: (g as any).type_fournisseur || 'grossiste',
        factures: gFactures.length,
        anomalies: gAnomalies.length,
        montant: parseFloat(montant.toFixed(2)),
        tauxConformite: parseFloat(taux.toFixed(1)),
      };
    });
  }, [filteredFactures, filteredAnomalies]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Rapports & Historique"
        description="Analyse des tendances et suivi des performances"
        icon={<FileBarChart className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={periode} onValueChange={setPeriode}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
                <SelectItem value="365">12 derniers mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Factures"
          value={kpis.totalFactures}
          icon={<FileBarChart className="h-5 w-5" />}
          variant="blue"
        />
        <StatCard
          label="Anomalies"
          value={kpis.totalAnomalies}
          icon={<AlertCircle className="h-5 w-5" />}
          variant="orange"
        />
        <StatCard
          label="Recuperable"
          value={formatCurrency(kpis.montantRecuperable)}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="red"
        />
        <StatCard
          label="Conformite"
          value={formatPercentage(kpis.tauxConformite)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="green"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
          {/* Anomalies Timeline */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-base dark:text-white">Anomalies détectées</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineData.some((d) => d.anomalies > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="anomalies"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Anomalies"
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="factures"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Factures"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 dark:text-gray-500">
                  Aucune donnée pour cette période
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cumulative Savings */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-base dark:text-white">
                Montants récupérés (cumulé)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cumulativeData.some((d) => d.cumulatif > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      formatter={(value: number) => [formatCurrency(value), 'Cumule']}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulatif"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Montant cumulé (€)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-gray-400 dark:text-gray-500">
                  Aucune donnée pour cette période
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Table by fournisseur */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-base dark:text-white">Récapitulatif par fournisseur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="dark:text-gray-300">Fournisseur</TableHead>
                    <TableHead className="dark:text-gray-300 hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-right dark:text-gray-300 hidden sm:table-cell">Factures</TableHead>
                    <TableHead className="text-right dark:text-gray-300 hidden md:table-cell">Anomalies</TableHead>
                    <TableHead className="text-right dark:text-gray-300">
                      Montant récupérable
                    </TableHead>
                    <TableHead className="text-right dark:text-gray-300">Conformité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fournisseurStats.map((g) => (
                    <TableRow key={g.nom}>
                      <TableCell className="font-medium dark:text-white">{g.nom}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={
                          g.type_fournisseur === 'grossiste' ? 'text-blue-700 border-blue-300 bg-blue-50' :
                          g.type_fournisseur === 'laboratoire' ? 'text-violet-700 border-violet-300 bg-violet-50' :
                          'text-gray-700 border-gray-300 bg-gray-50'
                        }>
                          {g.type_fournisseur}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right dark:text-gray-300 hidden sm:table-cell">{g.factures}</TableCell>
                      <TableCell className="text-right dark:text-gray-300 hidden md:table-cell">{g.anomalies}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(g.montant)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            g.tauxConformite >= 80
                              ? 'text-green-600'
                              : g.tauxConformite >= 50
                                ? 'text-orange-600'
                                : 'text-red-600'
                          }
                        >
                          {formatPercentage(g.tauxConformite)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {fournisseurStats.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-gray-500 dark:text-gray-400 py-8"
                      >
                        Aucune donnée disponible
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
