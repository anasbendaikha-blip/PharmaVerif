/**
 * PharmaVerif - Page Analyse des Prix
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Page complete : recherche produits, graphique evolution prix (recharts),
 * comparaison multi-fournisseurs, top produits, alertes, economies potentielles.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Search,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  Info,
  PiggyBank,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  ShieldAlert,
  Bell,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { historiquePrixApi } from '../api/historiquePrixApi';
import type {
  HistoriquePrixListResponse,
  ComparaisonProduitResponse,
  TopProduitsResponse,
  AlertesPrixResponse,
  EconomiesPotentiellesResponse,
  RechercheProduitItem,
  AlertePrixItem,
} from '../api/types';
import { CHART_PALETTE } from '../components/ui/chart-colors';
import { formatCurrency, formatDateShortFR, formatSignedPercentage } from '../utils/formatNumber';

interface AnalysePrixPageProps {
  onNavigate: (page: string) => void;
}

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export function AnalysePrixPage({ onNavigate }: AnalysePrixPageProps) {
  // Onglet actif
  const [activeTab, setActiveTab] = useState<'recherche' | 'top' | 'alertes' | 'economies'>('recherche');

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RechercheProduitItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Produit selectionne
  const [selectedCip, setSelectedCip] = useState<string | null>(null);
  const [historique, setHistorique] = useState<HistoriquePrixListResponse | null>(null);
  const [comparaison, setComparaison] = useState<ComparaisonProduitResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Top produits
  const [topProduits, setTopProduits] = useState<TopProduitsResponse | null>(null);
  const [topCritere, setTopCritere] = useState<'montant' | 'quantite'>('montant');
  const [loadingTop, setLoadingTop] = useState(false);

  // Alertes
  const [alertes, setAlertes] = useState<AlertesPrixResponse | null>(null);
  const [loadingAlertes, setLoadingAlertes] = useState(false);

  // Economies
  const [economies, setEconomies] = useState<EconomiesPotentiellesResponse | null>(null);
  const [loadingEconomies, setLoadingEconomies] = useState(false);

  // ========================================
  // RECHERCHE
  // ========================================

  const handleSearch = useCallback(async () => {
    if (searchQuery.length < 2) return;
    setIsSearching(true);
    try {
      const result = await historiquePrixApi.recherche(searchQuery, 20);
      setSearchResults(result.produits);
      if (result.produits.length === 0) {
        toast.info('Aucun produit trouve pour cette recherche');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur recherche';
      toast.error(message);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // ========================================
  // CHARGER DETAIL PRODUIT
  // ========================================

  const loadProductDetail = useCallback(async (cip13: string) => {
    setSelectedCip(cip13);
    setLoadingDetail(true);
    try {
      const [hist, comp] = await Promise.all([
        historiquePrixApi.getHistorique(cip13),
        historiquePrixApi.getComparaison(cip13).catch(() => null),
      ]);
      setHistorique(hist);
      setComparaison(comp);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur chargement';
      toast.error(message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ========================================
  // CHARGER TOP PRODUITS
  // ========================================

  const loadTopProduits = useCallback(async () => {
    setLoadingTop(true);
    try {
      const result = await historiquePrixApi.getTopProduits({ critere: topCritere, limit: 20 });
      setTopProduits(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur chargement';
      toast.error(message);
    } finally {
      setLoadingTop(false);
    }
  }, [topCritere]);

  // ========================================
  // CHARGER ALERTES
  // ========================================

  const loadAlertes = useCallback(async () => {
    setLoadingAlertes(true);
    try {
      const result = await historiquePrixApi.getAlertes();
      setAlertes(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur chargement';
      toast.error(message);
    } finally {
      setLoadingAlertes(false);
    }
  }, []);

  // ========================================
  // CHARGER ECONOMIES
  // ========================================

  const loadEconomies = useCallback(async () => {
    setLoadingEconomies(true);
    try {
      const result = await historiquePrixApi.getEconomiesPotentielles();
      setEconomies(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur chargement';
      toast.error(message);
    } finally {
      setLoadingEconomies(false);
    }
  }, []);

  // ========================================
  // EFFETS
  // ========================================

  useEffect(() => {
    if (activeTab === 'top') loadTopProduits();
    if (activeTab === 'alertes') loadAlertes();
    if (activeTab === 'economies') loadEconomies();
  }, [activeTab, loadTopProduits, loadAlertes, loadEconomies]);

  // ========================================
  // DONNEES CHART
  // ========================================

  const chartData = useMemo(() => {
    if (!historique) return [];

    // Grouper par date et laboratoire pour multi-lignes
    const dateMap = new Map<string, Record<string, number>>();
    const labos = new Set<string>();

    for (const entry of historique.historique) {
      const dateKey = entry.date_facture;
      const laboNom = entry.laboratoire_nom || `Labo #${entry.laboratoire_id}`;
      labos.add(laboNom);

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }
      const data = dateMap.get(dateKey)!;
      data[laboNom] = entry.prix_unitaire_net;
    }

    return Array.from(dateMap.entries())
      .map(([dateStr, values]) => ({
        date: formatDateShortFR(dateStr),
        dateSort: dateStr,
        ...values,
      }))
      .sort((a, b) => a.dateSort.localeCompare(b.dateSort));
  }, [historique]);

  const chartLabos = useMemo(() => {
    if (!historique) return [];
    const set = new Set<string>();
    for (const entry of historique.historique) {
      set.add(entry.laboratoire_nom || `Labo #${entry.laboratoire_id}`);
    }
    return Array.from(set);
  }, [historique]);

  // ========================================
  // RENDU - ONGLETS
  // ========================================

  const tabs = [
    { id: 'recherche' as const, label: 'Recherche & Historique', icon: <Search className="h-4 w-4" /> },
    { id: 'top' as const, label: 'Top Produits', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'alertes' as const, label: 'Alertes', icon: <Bell className="h-4 w-4" /> },
    { id: 'economies' as const, label: 'Economies', icon: <PiggyBank className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyse des Prix"
        description="Historique, comparaison et alertes sur les prix fournisseurs"
        icon={<TrendingUp className="h-5 w-5" />}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center
              ${activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'recherche' && (
        <div className="space-y-6">
          {/* Barre de recherche */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par CIP13 ou nom de produit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching || searchQuery.length < 2}>
                  {isSearching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Rechercher</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultats de recherche */}
          {searchResults.length > 0 && !selectedCip && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Resultats ({searchResults.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CIP13</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead className="text-right">Prix moyen</TableHead>
                      <TableHead className="text-center">Achats</TableHead>
                      <TableHead className="text-center">Fournisseurs</TableHead>
                      <TableHead>Dernier achat</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((p) => (
                      <TableRow
                        key={p.cip13}
                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10"
                        onClick={() => loadProductDetail(p.cip13)}
                      >
                        <TableCell className="font-mono text-sm">{p.cip13}</TableCell>
                        <TableCell className="max-w-[250px] truncate">{p.designation}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.prix_moyen)}</TableCell>
                        <TableCell className="text-center">{p.nb_achats}</TableCell>
                        <TableCell className="text-center">{p.nb_fournisseurs}</TableCell>
                        <TableCell>{formatDateShortFR(p.derniere_date)}</TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Detail produit selectionne */}
          {selectedCip && (
            <div className="space-y-6">
              {/* Bouton retour */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedCip(null); setHistorique(null); setComparaison(null); }}
              >
                &larr; Retour aux resultats
              </Button>

              {loadingDetail ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
                    <p className="text-gray-500">Chargement...</p>
                  </CardContent>
                </Card>
              ) : historique ? (
                <>
                  {/* Statistiques */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-gray-500 uppercase">CIP13</p>
                        <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">{historique.cip13}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-gray-500 uppercase">Achats</p>
                        <p className="text-lg font-bold text-blue-600">{historique.nb_enregistrements}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-gray-500 uppercase">Prix min</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(historique.prix_min)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-gray-500 uppercase">Prix max</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(historique.prix_max)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3 text-center">
                        <p className="text-xs text-gray-500 uppercase">Prix moyen</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(historique.prix_moyen)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Graphique evolution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Evolution du prix - {historique.designation}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12 }}
                              tickMargin={8}
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v) => `${v.toFixed(2)} \u20AC`}
                            />
                            <Tooltip
                              formatter={(value: number) => [formatCurrency(value), '']}
                              labelStyle={{ fontWeight: 'bold' }}
                            />
                            <Legend />
                            {chartLabos.map((labo, idx) => (
                              <Line
                                key={labo}
                                type="monotone"
                                dataKey={labo}
                                stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                                connectNulls
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-center text-gray-500 py-8">Pas assez de donnees pour le graphique</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Comparaison fournisseurs */}
                  {comparaison && comparaison.fournisseurs.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-green-600" />
                          Comparaison fournisseurs ({comparaison.nb_fournisseurs})
                          {comparaison.meilleur_fournisseur && (
                            <span className="ml-auto text-sm font-normal text-green-600">
                              Meilleur : {comparaison.meilleur_fournisseur} ({formatCurrency(comparaison.meilleur_prix_net || 0)})
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fournisseur</TableHead>
                              <TableHead className="text-right">Prix brut</TableHead>
                              <TableHead className="text-right">Remise</TableHead>
                              <TableHead className="text-right">Prix net</TableHead>
                              <TableHead className="text-right">Cout net reel</TableHead>
                              <TableHead className="text-right">Evolution</TableHead>
                              <TableHead className="text-center">Achats</TableHead>
                              <TableHead className="text-right">Volume total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comparaison.fournisseurs.map((f, idx) => (
                              <TableRow
                                key={f.laboratoire_id}
                                className={idx === 0 ? 'bg-green-50 dark:bg-green-900/10' : ''}
                              >
                                <TableCell className="font-medium">
                                  {idx === 0 && <span className="text-green-600 mr-1">&#9733;</span>}
                                  {f.laboratoire_nom}
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(f.dernier_prix_brut)}</TableCell>
                                <TableCell className="text-right">{f.remise_pct.toFixed(1)}%</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(f.dernier_prix_net)}</TableCell>
                                <TableCell className="text-right">
                                  {f.cout_net_reel != null ? formatCurrency(f.cout_net_reel) : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {f.evolution_pct != null ? (
                                    <span className={`inline-flex items-center gap-1 ${f.evolution_pct > 0 ? 'text-red-600' : f.evolution_pct < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                      {f.evolution_pct > 0 ? <ArrowUpRight className="h-3 w-3" /> : f.evolution_pct < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                      {formatSignedPercentage(f.evolution_pct)}
                                    </span>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-center">{f.nb_achats}</TableCell>
                                <TableCell className="text-right">{f.quantite_totale} u.</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {comparaison.ecart_max_pct != null && comparaison.ecart_max_pct > 0 && (
                          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Ecart maximal entre fournisseurs : {comparaison.ecart_max_pct.toFixed(1)}%
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Historique detaille */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Historique detaille</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Fournisseur</TableHead>
                              <TableHead className="text-right">PU brut</TableHead>
                              <TableHead className="text-right">Remise</TableHead>
                              <TableHead className="text-right">PU net</TableHead>
                              <TableHead className="text-right">Cout net reel</TableHead>
                              <TableHead className="text-center">Qte</TableHead>
                              <TableHead>Tranche</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {historique.historique.map((h) => (
                              <TableRow key={h.id}>
                                <TableCell>{formatDateShortFR(h.date_facture)}</TableCell>
                                <TableCell>{h.laboratoire_nom || '-'}</TableCell>
                                <TableCell className="text-right">{formatCurrency(h.prix_unitaire_brut)}</TableCell>
                                <TableCell className="text-right">{h.remise_pct.toFixed(1)}%</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(h.prix_unitaire_net)}</TableCell>
                                <TableCell className="text-right">
                                  {h.cout_net_reel != null ? formatCurrency(h.cout_net_reel) : '-'}
                                </TableCell>
                                <TableCell className="text-center">{h.quantite}</TableCell>
                                <TableCell>
                                  {h.tranche ? (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                      ${h.tranche === 'A' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                        h.tranche === 'B' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                      {h.tranche}
                                    </span>
                                  ) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">Aucune donnee trouvee pour ce produit</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Etat initial */}
          {searchResults.length === 0 && !selectedCip && (
            <Card>
              <CardContent className="py-16 text-center">
                <Search className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Recherchez un produit
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Saisissez un code CIP13 ou un nom de produit pour voir l'evolution de son prix
                  et comparer les offres entre fournisseurs.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Onglet Top Produits */}
      {activeTab === 'top' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top produits par {topCritere === 'montant' ? 'montant' : 'quantite'}
            </h2>
            <div className="flex gap-2">
              <Button
                variant={topCritere === 'montant' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTopCritere('montant')}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Montant
              </Button>
              <Button
                variant={topCritere === 'quantite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTopCritere('quantite')}
              >
                <Package className="h-4 w-4 mr-1" />
                Quantite
              </Button>
              <Button variant="outline" size="sm" onClick={loadTopProduits} disabled={loadingTop}>
                <RefreshCw className={`h-4 w-4 ${loadingTop ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {loadingTop ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
                <p className="text-gray-500">Chargement...</p>
              </CardContent>
            </Card>
          ) : topProduits && topProduits.produits.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>CIP13</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead className="text-right">
                        {topCritere === 'montant' ? 'Montant HT' : 'Quantite'}
                      </TableHead>
                      <TableHead className="text-right">Prix moyen</TableHead>
                      <TableHead className="text-center">Achats</TableHead>
                      <TableHead className="text-center">Fournisseurs</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProduits.produits.map((p, idx) => (
                      <TableRow key={p.cip13}>
                        <TableCell className="font-bold text-gray-400">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{p.cip13}</TableCell>
                        <TableCell className="max-w-[250px] truncate">{p.designation}</TableCell>
                        <TableCell className="text-right font-medium">
                          {topCritere === 'montant'
                            ? formatCurrency(p.montant_total_ht)
                            : `${p.quantite_totale} u.`}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(p.prix_moyen_net)}</TableCell>
                        <TableCell className="text-center">{p.nb_achats}</TableCell>
                        <TableCell className="text-center">{p.nb_fournisseurs}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveTab('recherche');
                              loadProductDetail(p.cip13);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Aucune donnee disponible
                </h3>
                <p className="text-gray-500">
                  Importez des factures laboratoires pour voir les top produits.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Onglet Alertes */}
      {activeTab === 'alertes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alertes prix
            </h2>
            <Button variant="outline" size="sm" onClick={loadAlertes} disabled={loadingAlertes}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingAlertes ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {/* Compteurs */}
          {alertes && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-gray-500 uppercase">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{alertes.nb_alertes}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-red-500 uppercase">Critiques</p>
                  <p className="text-2xl font-bold text-red-600">{alertes.nb_critical}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-amber-500 uppercase">Attention</p>
                  <p className="text-2xl font-bold text-amber-600">{alertes.nb_warning}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-blue-500 uppercase">Info</p>
                  <p className="text-2xl font-bold text-blue-600">{alertes.nb_info}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {loadingAlertes ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
                <p className="text-gray-500">Chargement des alertes...</p>
              </CardContent>
            </Card>
          ) : alertes && alertes.alertes.length > 0 ? (
            <div className="space-y-3">
              {alertes.alertes.map((alerte, idx) => (
                <AlerteCard key={idx} alerte={alerte} onViewProduct={(cip) => {
                  setActiveTab('recherche');
                  loadProductDetail(cip);
                }} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <ShieldAlert className="h-12 w-12 mx-auto text-green-300 dark:text-green-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Aucune alerte
                </h3>
                <p className="text-gray-500">
                  Tous les prix sont stables et aucune opportunite detectee.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Onglet Economies */}
      {activeTab === 'economies' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Economies potentielles
            </h2>
            <Button variant="outline" size="sm" onClick={loadEconomies} disabled={loadingEconomies}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingEconomies ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {loadingEconomies ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
                <p className="text-gray-500">Calcul des economies...</p>
              </CardContent>
            </Card>
          ) : economies ? (
            <>
              {/* Resume */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200 dark:border-green-800">
                  <CardContent className="pt-6 pb-4 text-center">
                    <PiggyBank className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="text-sm text-gray-500">Economie totale annuelle estimee</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">
                      {formatCurrency(economies.economie_totale_annuelle)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 pb-4 text-center">
                    <Package className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-sm text-gray-500">Produits optimisables</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">
                      {economies.nb_produits_optimisables}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Table economies */}
              {economies.economies.length > 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Fournisseur actuel</TableHead>
                          <TableHead className="text-right">Prix actuel</TableHead>
                          <TableHead>Meilleur fournisseur</TableHead>
                          <TableHead className="text-right">Meilleur prix</TableHead>
                          <TableHead className="text-right">Ecart</TableHead>
                          <TableHead className="text-right">Vol. annuel</TableHead>
                          <TableHead className="text-right">Economie/an</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {economies.economies.map((e, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div>
                                <span className="font-mono text-xs text-gray-500">{e.cip13}</span>
                                <p className="text-sm truncate max-w-[200px]">{e.designation}</p>
                              </div>
                            </TableCell>
                            <TableCell>{e.fournisseur_actuel}</TableCell>
                            <TableCell className="text-right">{formatCurrency(e.prix_actuel_net)}</TableCell>
                            <TableCell className="text-green-600 font-medium">{e.meilleur_fournisseur}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">{formatCurrency(e.meilleur_prix_net)}</TableCell>
                            <TableCell className="text-right text-red-600">-{e.ecart_pct.toFixed(1)}%</TableCell>
                            <TableCell className="text-right">{e.quantite_annuelle} u.</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(e.economie_annuelle)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <PiggyBank className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Aucune economie detectee
                    </h3>
                    <p className="text-gray-500">
                      Les prix sont deja optimises ou il faut plus de donnees multi-fournisseurs.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}


// ========================================
// COMPOSANT ALERTE CARD
// ========================================

function AlerteCard({
  alerte,
  onViewProduct,
}: {
  alerte: AlertePrixItem;
  onViewProduct: (cip: string) => void;
}) {
  const severiteConfig = {
    critical: {
      bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
      icon: <Info className="h-5 w-5 text-blue-600" />,
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
  };

  const config = severiteConfig[alerte.severite] || severiteConfig.info;

  const typeLabels: Record<string, string> = {
    hausse_prix: 'Hausse de prix',
    concurrent_moins_cher: 'Concurrent moins cher',
    condition_expire: 'Condition expire',
  };

  return (
    <Card className={`border ${config.bg}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          {config.icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badge}`}>
                {typeLabels[alerte.type_alerte] || alerte.type_alerte}
              </span>
              <span className="text-xs text-gray-500">{formatDateShortFR(alerte.date_detection)}</span>
              <span className="text-xs text-gray-500">- {alerte.laboratoire_nom}</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white">{alerte.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              {alerte.prix_ancien != null && (
                <span>Ancien : {formatCurrency(alerte.prix_ancien)}</span>
              )}
              {alerte.prix_nouveau != null && (
                <span>Nouveau : {formatCurrency(alerte.prix_nouveau)}</span>
              )}
              {alerte.ecart_pct != null && (
                <span className={alerte.ecart_pct > 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatSignedPercentage(alerte.ecart_pct)}
                </span>
              )}
              {alerte.economie_potentielle != null && alerte.economie_potentielle > 0 && (
                <span className="text-green-600 font-medium">
                  Economie : {formatCurrency(alerte.economie_potentielle)}
                </span>
              )}
            </div>
          </div>
          {alerte.cip13 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewProduct(alerte.cip13)}
              className="shrink-0"
            >
              Voir
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
