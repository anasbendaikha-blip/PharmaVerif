/**
 * PharmaVerif - Tableau de bord
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { useState, useEffect, useMemo } from 'react';
import { StatCard } from '../components/StatCard';
import { AnomalieCard } from '../components/AnomalieCard';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Download,
  FileDown,
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
import { formatCurrency, formatPercentage } from '../utils/formatNumber';

const ANOMALIE_COLORS: Record<string, string> = {
  remise_manquante: '#f59e0b',
  ecart_calcul: '#ef4444',
  remise_incorrecte: '#8b5cf6',
  franco_non_respecte: '#3b82f6',
  prix_suspect: '#ec4899',
};

const ANOMALIE_LABELS: Record<string, string> = {
  remise_manquante: 'Remise manquante',
  ecart_calcul: 'Écart de calcul',
  remise_incorrecte: 'Remise incorrecte',
  franco_non_respecte: 'Franco non respecté',
  prix_suspect: 'Prix suspect',
};

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
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
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Donnees pour le graphique Repartition par type d'anomalie (PieChart)
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

  // Donnees pour le graphique Montants par grossiste (BarChart)
  const barData = useMemo(() => {
    const grossistes = db.getAllGrossistes();
    return grossistes.map((g) => {
      const gFactures = factures.filter((f) => f.grossiste_id === g.id);
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
      if (!facture) throw new Error('Facture non trouvée');

      const grossiste = db.getGrossisteById(facture.grossiste_id);
      if (!grossiste) throw new Error('Grossiste non trouvé');

      const factureAnomalies = anomalies.filter((a) => a.facture_id === factureId);

      await exportVerificationReport({
        facture,
        anomalies: factureAnomalies,
        grossiste,
      });

      toast.success('Rapport PDF téléchargé !', {
        description: `Rapport pour la facture ${facture.numero}`,
      });
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExportingId(null);
    }
  };

  const anomaliesFiltrees = anomalies.filter((anomalie) => {
    if (filtreType !== 'tous' && anomalie.type_anomalie !== filtreType) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Button
                  variant="ghost"
                  onClick={() => onNavigate('home')}
                  className="gap-1 -ml-2 h-auto p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white"
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Vue d'ensemble de vos vérifications
              </p>
            </div>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4" />
              <span>Exporter le rapport</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Factures vérifiées"
            value={stats.total_factures}
            icon={FileText}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatCard
            title="Anomalies détectées"
            value={stats.total_anomalies}
            icon={AlertCircle}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
          />
          <StatCard
            title="Montant récupérable"
            value={formatCurrency(stats.economies_potentielles)}
            icon={TrendingUp}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          />
          <StatCard
            title="Taux de conformité"
            value={formatPercentage(stats.taux_conformite)}
            icon={CheckCircle2}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
          />
        </div>

        {/* Charts Section */}
        {(anomalies.length > 0 || factures.length > 0) && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Repartition par type */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition des anomalies</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-gray-400">
                    Aucune anomalie à afficher
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Montants par grossiste */}
            <Card>
              <CardHeader>
                <CardTitle>Montants récupérables par grossiste</CardTitle>
              </CardHeader>
              <CardContent>
                {barData.some((d) => d.montant > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(value: number) => [`${value.toFixed(2)} €`, 'Montant']}
                      />
                      <Bar
                        dataKey="montant"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        name="Montant récupérable (€)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-gray-400">
                    Aucune donnée à afficher
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="anomalies" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="factures">Factures</TabsTrigger>
          </TabsList>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type d'anomalie</label>
                  <Select value={filtreType} onValueChange={setFiltreType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous les types</SelectItem>
                      <SelectItem value="remise_manquante">Remise manquante</SelectItem>
                      <SelectItem value="ecart_calcul">Écart de calcul</SelectItem>
                      <SelectItem value="remise_incorrecte">Remise incorrecte</SelectItem>
                      <SelectItem value="franco_non_respecte">Franco non respecté</SelectItem>
                      <SelectItem value="prix_suspect">Prix suspect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Anomalies List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {anomaliesFiltrees.length} anomalie{anomaliesFiltrees.length > 1 ? 's' : ''}{' '}
                  trouvée
                  {anomaliesFiltrees.length > 1 ? 's' : ''}
                </h2>
              </div>
              {anomaliesFiltrees.length > 0 ? (
                <div className="grid gap-4">
                  {anomaliesFiltrees.map((anomalie) => (
                    <AnomalieCard key={anomalie.id} anomalie={anomalie} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Aucune anomalie trouvée</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Vérifiez des factures pour voir les résultats ici
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Factures Tab */}
          <TabsContent value="factures" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Factures récentes</CardTitle>
              </CardHeader>
              <CardContent>
                {factures.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numéro</TableHead>
                        <TableHead>Grossiste</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="text-right">Anomalies</TableHead>
                        <TableHead className="text-right">Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {factures.map((facture) => {
                        const factureAnomalies = facture.anomalies || [];
                        const hasAnomalies = factureAnomalies.length > 0;

                        return (
                          <TableRow key={facture.id}>
                            <TableCell className="font-medium">{facture.numero}</TableCell>
                            <TableCell>{facture.grossiste?.nom}</TableCell>
                            <TableCell>
                              {new Date(facture.date).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(facture.net_a_payer)}
                            </TableCell>
                            <TableCell className="text-right">
                              {hasAnomalies ? (
                                <span className="text-orange-600 font-medium">
                                  {factureAnomalies.length}
                                </span>
                              ) : (
                                <span className="text-gray-400">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {facture.statut_verification === 'conforme' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Conforme
                                </span>
                              ) : facture.statut_verification === 'anomalie' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Anomalie
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                                  Non vérifié
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportFacturePDF(facture.id)}
                                disabled={exportingId === facture.id}
                                className="gap-2"
                              >
                                {exportingId === facture.id ? (
                                  <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-600" />
                                    Export...
                                  </>
                                ) : (
                                  <>
                                    <FileDown className="h-4 w-4" />
                                    PDF
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Aucune facture vérifiée</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Importez des factures pour voir l'historique complet
                </p>
                <Button
                  onClick={() => onNavigate('verification')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Vérifier une nouvelle facture
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
