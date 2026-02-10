/**
 * PharmaVerif - Page Factures Laboratoires
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Page dédiée à l'upload, l'analyse et la gestion des factures laboratoires.
 * Fonctionnalité API-only (nécessite le backend FastAPI).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  Search,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Euro,
  BarChart3,
  X,
  Loader2,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { facturesLaboApi } from '../api/facturesLabo';
import type {
  FactureLaboResponse,
  AnalyseRemiseResponse,
  UploadLaboResponse,
} from '../api/types';

interface FacturesLaboPageProps {
  onNavigate: (page: string) => void;
}

// ========================================
// HELPERS
// ========================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)} %`;
}

function getStatutBadge(statut: string) {
  switch (statut) {
    case 'analysee':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          <BarChart3 className="h-3 w-3" />
          Analysée
        </span>
      );
    case 'conforme':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle2 className="h-3 w-3" />
          Conforme
        </span>
      );
    case 'ecart_rfa':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <AlertTriangle className="h-3 w-3" />
          Écart RFA
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          <Clock className="h-3 w-3" />
          Non vérifié
        </span>
      );
  }
}

// ========================================
// COMPOSANT UPLOAD
// ========================================

function UploadSection({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadLaboResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // laboratoireId = 1 (Biogaran par défaut, seedé au démarrage backend)
      const result = await facturesLaboApi.upload(file, 1);
      setUploadResult(result);

      if (result.success) {
        toast.success(`Facture analysée : ${result.facture?.nb_lignes || 0} lignes`);
        onUploadSuccess();
      } else {
        toast.error(result.message || "Erreur lors de l'analyse");
      }
    } catch (err: unknown) {
      const httpErr = err as { message?: string };
      toast.error(httpErr.message || "Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input pour permettre le re-upload du même fichier
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5 text-blue-600" />
          Upload facture laboratoire
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Analyse de la facture en cours...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <FlaskConical className="h-10 w-10 text-gray-400" />
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  Glissez un PDF de facture Biogaran ici
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ou cliquez pour sélectionner un fichier
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Résultat de l'upload */}
        {uploadResult && uploadResult.success && uploadResult.facture && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Facture analysée avec succès
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">N° Facture</p>
                <p className="font-medium dark:text-white">{uploadResult.facture.numero_facture}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Lignes</p>
                <p className="font-medium dark:text-white">{uploadResult.facture.nb_lignes}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Montant brut</p>
                <p className="font-medium dark:text-white">
                  {formatCurrency(uploadResult.facture.montant_brut_ht)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">RFA attendue</p>
                <p className="font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(uploadResult.facture.rfa_attendue)}
                </p>
              </div>
            </div>
            {uploadResult.warnings && uploadResult.warnings.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
                <p className="font-medium mb-1">Avertissements :</p>
                {uploadResult.warnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// COMPOSANT DÉTAIL / ANALYSE
// ========================================

function FactureDetail({
  facture,
  onClose,
  onRefresh,
}: {
  facture: FactureLaboResponse;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [analyse, setAnalyse] = useState<AnalyseRemiseResponse | null>(null);
  const [isLoadingAnalyse, setIsLoadingAnalyse] = useState(true);
  const [rfaInput, setRfaInput] = useState('');
  const [isUpdatingRfa, setIsUpdatingRfa] = useState(false);

  useEffect(() => {
    async function loadAnalyse() {
      try {
        const data = await facturesLaboApi.getAnalyse(facture.id);
        setAnalyse(data);
      } catch {
        toast.error("Erreur lors du chargement de l'analyse");
      } finally {
        setIsLoadingAnalyse(false);
      }
    }
    loadAnalyse();
  }, [facture.id]);

  const handleUpdateRfa = async () => {
    const rfaValue = parseFloat(rfaInput);
    if (isNaN(rfaValue) || rfaValue < 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    setIsUpdatingRfa(true);
    try {
      const result = await facturesLaboApi.updateRfa(facture.id, rfaValue);
      toast.success(result.message || 'RFA mise à jour');
      onRefresh();
    } catch (err: unknown) {
      const httpErr = err as { message?: string };
      toast.error(httpErr.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsUpdatingRfa(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold dark:text-white">
              Facture {facture.numero_facture}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(facture.date_facture)} • {facture.nb_lignes} lignes • {facture.nb_pages}{' '}
              pages
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatutBadge(facture.statut)}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Résumé financier */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Montant brut HT</p>
            <p className="text-lg font-bold dark:text-white">
              {formatCurrency(facture.montant_brut_ht)}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total remises</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(facture.total_remise_facture)}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net HT</p>
            <p className="text-lg font-bold dark:text-white">
              {formatCurrency(facture.montant_net_ht)}
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">RFA attendue</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(facture.rfa_attendue)}
            </p>
          </div>
        </div>

        {/* Analyse par tranches */}
        <div className="px-6 pb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Analyse par tranche
          </h3>
          {isLoadingAnalyse ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : analyse ? (
            <div className="space-y-2">
              {analyse.tranches.map((t) => (
                <div
                  key={t.tranche}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 w-24">
                      {t.tranche}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {t.nb_lignes} lignes
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-gray-400">Brut</p>
                      <p className="font-medium dark:text-white">{formatCurrency(t.montant_brut)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Remise</p>
                      <p className="font-medium text-orange-600 dark:text-orange-400">
                        {formatPercent(t.taux_remise_reel)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">RFA</p>
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        {formatCurrency(t.rfa_attendue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm font-semibold border border-blue-200 dark:border-blue-800">
                <span className="text-blue-700 dark:text-blue-300">TOTAL</span>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="dark:text-white">
                      {formatCurrency(analyse.montant_brut_total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-orange-600 dark:text-orange-400">
                      {formatPercent(analyse.taux_remise_global)}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600 dark:text-blue-400">
                      {formatCurrency(analyse.rfa_totale_attendue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Analyse non disponible</p>
          )}
        </div>

        {/* Réconciliation RFA */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Réconciliation RFA
          </h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                RFA reçue (€)
              </label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rfaInput}
                  onChange={(e) => setRfaInput(e.target.value)}
                  placeholder={`Attendue : ${facture.rfa_attendue.toFixed(2)} €`}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                />
              </div>
            </div>
            <Button
              onClick={handleUpdateRfa}
              disabled={isUpdatingRfa || !rfaInput}
              className="bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
            >
              {isUpdatingRfa ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Valider RFA'
              )}
            </Button>
          </div>
          {facture.rfa_recue !== null && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                RFA reçue : <strong className="dark:text-white">{formatCurrency(facture.rfa_recue)}</strong>
              </span>
              {facture.ecart_rfa !== null && (
                <span
                  className={`font-medium ${
                    Math.abs(facture.ecart_rfa) < 0.01
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  Écart : {formatCurrency(facture.ecart_rfa)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export function FacturesLaboPage({ onNavigate }: FacturesLaboPageProps) {
  const [factures, setFactures] = useState<FactureLaboResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacture, setSelectedFacture] = useState<FactureLaboResponse | null>(null);

  const pageSize = 10;

  const loadFactures = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await facturesLaboApi.list({
        page,
        page_size: pageSize,
        search: searchQuery || undefined,
      });
      setFactures(data.factures);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err: unknown) {
      const httpErr = err as { message?: string };
      toast.error(httpErr.message || 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadFactures();
  }, [loadFactures]);

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette facture ?')) return;
    try {
      await facturesLaboApi.delete(id);
      toast.success('Facture supprimée');
      loadFactures();
    } catch (err: unknown) {
      const httpErr = err as { message?: string };
      toast.error(httpErr.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-purple-600" />
          Factures Laboratoires
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload, analyse et réconciliation RFA des factures Biogaran
        </p>
      </div>

      {/* Upload */}
      <UploadSection onUploadSuccess={loadFactures} />

      {/* Liste des factures */}
      <Card className="mt-6 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              Factures analysées ({total})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[40px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : factures.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Aucune facture laboratoire</p>
              <p className="text-sm mt-1">Uploadez un PDF Biogaran pour commencer</p>
            </div>
          ) : (
            <>
              {/* Tableau */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        N° Facture
                      </th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        Date
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        Brut HT
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        RFA attendue
                      </th>
                      <th className="text-center py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        Lignes
                      </th>
                      <th className="text-center py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        Statut
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {factures.map((f) => (
                      <tr
                        key={f.id}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="py-3 px-3 font-medium dark:text-white">
                          {f.numero_facture}
                        </td>
                        <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                          {formatDate(f.date_facture)}
                        </td>
                        <td className="py-3 px-3 text-right dark:text-white">
                          {formatCurrency(f.montant_brut_ht)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-blue-600 dark:text-blue-400">
                          {formatCurrency(f.rfa_attendue)}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">
                          {f.nb_lignes}
                        </td>
                        <td className="py-3 px-3 text-center">{getStatutBadge(f.statut)}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFacture(f)}
                              title="Voir l'analyse"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(f.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Page {page} sur {totalPages} ({total} résultats)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal détail */}
      {selectedFacture && (
        <FactureDetail
          facture={selectedFacture}
          onClose={() => setSelectedFacture(null)}
          onRefresh={() => {
            loadFactures();
            setSelectedFacture(null);
          }}
        />
      )}
    </div>
  );
}
