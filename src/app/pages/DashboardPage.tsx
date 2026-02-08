/**
 * PharmaVerif - Tableau de bord
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { useState, useEffect } from 'react';
import { StatCard } from '../components/StatCard';
import { AnomalieCard } from '../components/AnomalieCard';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  ArrowLeft,
  FileText,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Download,
  FileDown,
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { Facture, Anomalie } from '../types';
import { exportVerificationReport } from '../utils/pdfExport';
import { db } from '../data/database';
import { toast } from 'sonner';
import { Logo } from '../components/Logo';
import { formatCurrency, formatPercentage } from '../utils/formatNumber';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [filtreStatut, setFiltreStatut] = useState<string>('tous');
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

  // Charger les données via l'API au montage du composant
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

  const handleExportFacturePDF = async (factureId: number) => {
    setExportingId(factureId);

    try {
      const facture = factures.find((f) => f.id === factureId);
      if (!facture) {
        throw new Error('Facture non trouvée');
      }

      const grossiste = db.getGrossisteById(facture.grossiste_id);
      if (!grossiste) {
        throw new Error('Grossiste non trouvé');
      }

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
      console.error('Erreur lors de l\'export PDF:', error);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Button 
                  variant="ghost" 
                  onClick={() => onNavigate('home')} 
                  className="gap-1 -ml-2 h-auto p-1 text-gray-600 hover:text-gray-900"
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
              <p className="text-gray-600">Vue d'ensemble de vos vérifications</p>
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
            trend={{ value: 12.5, isPositive: true }}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
          />
          <StatCard
            title="Anomalies détectées"
            value={stats.total_anomalies}
            icon={AlertCircle}
            trend={{ value: 8.2, isPositive: false }}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
          />
          <StatCard
            title="Montant récupérable"
            value={formatCurrency(stats.economies_potentielles)}
            icon={TrendingUp}
            trend={{ value: 23.1, isPositive: true }}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          />
          <StatCard
            title="Taux de conformité"
            value={formatPercentage(stats.taux_conformite)}
            icon={CheckCircle2}
            trend={{ value: 3.4, isPositive: true }}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
          />
        </div>

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
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Statut</label>
                    <Select value={filtreStatut} onValueChange={setFiltreStatut}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Tous</SelectItem>
                        <SelectItem value="nouvelle">Nouvelles</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="resolue">Résolues</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type d'anomalie</label>
                    <Select value={filtreType} onValueChange={setFiltreType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Tous</SelectItem>
                        <SelectItem value="erreur_facturation">Erreur de facturation</SelectItem>
                        <SelectItem value="erreur_prix">Erreur de prix</SelectItem>
                        <SelectItem value="erreur_quantite">Erreur de quantité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anomalies List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {anomaliesFiltrees.length} anomalie{anomaliesFiltrees.length > 1 ? 's' : ''} trouvée
                  {anomaliesFiltrees.length > 1 ? 's' : ''}
                </h2>
              </div>
              <div className="grid gap-4">
                {anomaliesFiltrees.map((anomalie) => (
                  <AnomalieCard key={anomalie.id} anomalie={anomalie} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Factures Tab */}
          <TabsContent value="factures" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Factures récentes</CardTitle>
              </CardHeader>
              <CardContent>
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
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
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
              </CardContent>
            </Card>

            {/* Add more factures for demo */}
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600 mb-4">
                  Importez plus de factures pour voir l'historique complet
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