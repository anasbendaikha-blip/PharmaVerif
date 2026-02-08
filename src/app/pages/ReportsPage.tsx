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
import { StatCard } from '../components/StatCard';
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
import { db } from '../data/database';
import { Facture, Anomalie } from '../types';
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

  // Stats by grossiste
  const grossisteStats = useMemo(() => {
    const grossistes = db.getAllGrossistes();
    return grossistes.map((g) => {
      const gFactures = filteredFactures.filter((f) => f.grossiste_id === g.id);
      const gAnomalies = filteredAnomalies.filter((a) =>
        gFactures.some((f) => f.id === a.facture_id)
      );
      const montant = gAnomalies.reduce((sum, a) => sum + a.montant_ecart, 0);
      const conformes = gFactures.filter((f) => f.statut_verification === 'conforme').length;
      const taux = gFactures.length > 0 ? (conformes / gFactures.length) * 100 : 0;

      return {
        nom: g.nom,
        factures: gFactures.length,
        anomalies: gAnomalies.length,
        montant: parseFloat(montant.toFixed(2)),
        tauxConformite: parseFloat(taux.toFixed(1)),
      };
    });
  }, [filteredFactures, filteredAnomalies]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileBarChart className="h-7 w-7 text-blue-600" />
              Rapports & Historique
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Analyse des tendances et suivi des performances
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-500" />
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
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Factures"
            value={kpis.totalFactures}
            icon={FileBarChart}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatCard
            title="Anomalies"
            value={kpis.totalAnomalies}
            icon={AlertCircle}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100 dark:bg-orange-900/30"
          />
          <StatCard
            title="Récupérable"
            value={formatCurrency(kpis.montantRecuperable)}
            icon={TrendingUp}
            iconColor="text-red-600"
            iconBgColor="bg-red-100 dark:bg-red-900/30"
          />
          <StatCard
            title="Conformité"
            value={formatPercentage(kpis.tauxConformite)}
            icon={CheckCircle2}
            iconColor="text-green-600"
            iconBgColor="bg-green-100 dark:bg-green-900/30"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
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
                      formatter={(value: number) => [`${value.toFixed(2)} €`, 'Cumulé']}
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

        {/* Table by grossiste */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-base dark:text-white">Récapitulatif par grossiste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="dark:text-gray-300">Grossiste</TableHead>
                    <TableHead className="text-right dark:text-gray-300">Factures</TableHead>
                    <TableHead className="text-right dark:text-gray-300">Anomalies</TableHead>
                    <TableHead className="text-right dark:text-gray-300">
                      Montant récupérable
                    </TableHead>
                    <TableHead className="text-right dark:text-gray-300">Conformité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grossisteStats.map((g) => (
                    <TableRow key={g.nom}>
                      <TableCell className="font-medium dark:text-white">{g.nom}</TableCell>
                      <TableCell className="text-right dark:text-gray-300">{g.factures}</TableCell>
                      <TableCell className="text-right dark:text-gray-300">{g.anomalies}</TableCell>
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
                  {grossisteStats.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
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
    </div>
  );
}
