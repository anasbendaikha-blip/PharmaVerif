/**
 * PharmaVerif - Page Factures Laboratoires
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Page dédiée à l'upload, l'analyse et la gestion des factures laboratoires.
 * Fonctionnalité API-only (nécessite le backend FastAPI).
 *
 * Les sous-composants sont extraits dans components/factures-labo/.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Loader2,
  Settings,
  Download,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PageHeader } from '../components/ui/page-header';
import { toast } from 'sonner';
import { facturesLaboApi } from '../api/facturesLabo';
import { rapportsApi } from '../api/rapportsApi';
import { ConditionsCommercialesForm } from '../components/ConditionsCommercialesForm';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { UploadSection, FactureDetail, StatutBadgeLabo } from '../components/factures-labo';
import { formatCurrency, formatDateShortFR } from '../utils/formatNumber';
import { PILL_STYLES, getAnomalyCountSeverity } from '../utils/statusColors';
import type { FactureLaboResponse } from '../api/types';

interface FacturesLaboPageProps {
  onNavigate: (page: string) => void;
}

export function FacturesLaboPage({ onNavigate }: FacturesLaboPageProps) {
  const [factures, setFactures] = useState<FactureLaboResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacture, setSelectedFacture] = useState<FactureLaboResponse | null>(null);
  const [showConditions, setShowConditions] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await facturesLaboApi.delete(deleteTargetId);
      toast.success('Facture supprimee');
      setShowDeleteDialog(false);
      setDeleteTargetId(null);
      loadFactures();
    } catch (err: unknown) {
      const httpErr = err as { message?: string };
      toast.error(httpErr.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures Laboratoires"
        description="Upload, analyse et verification des factures labo"
        icon={<FlaskConical className="h-5 w-5" />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={async () => {
                const now = new Date();
                const mois = now.getMonth() + 1;
                const annee = now.getFullYear();
                // Utiliser le premier labo dispo (Biogaran = ID 1)
                const laboId = factures[0]?.laboratoire_id || 1;
                try {
                  toast.info('Generation du rapport mensuel...');
                  await rapportsApi.downloadRapportMensuel(laboId, mois, annee);
                  toast.success('Rapport mensuel telecharge');
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Erreur';
                  toast.error(msg);
                }
              }}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Rapport mensuel
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowConditions(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Conditions commerciales
            </Button>
          </>
        }
      />

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
                        Remises
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        Net HT
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        RFA attendue
                      </th>
                      <th className="text-center py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        Lignes
                      </th>
                      <th className="text-center py-3 px-3 font-medium text-gray-500 dark:text-gray-400">
                        Anomalies
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
                          {formatDateShortFR(f.date_facture)}
                        </td>
                        <td className="py-3 px-3 text-right dark:text-white">
                          {formatCurrency(f.montant_brut_ht)}
                        </td>
                        <td className="py-3 px-3 text-right text-orange-600 dark:text-orange-400">
                          {formatCurrency(f.total_remise_facture)}
                        </td>
                        <td className="py-3 px-3 text-right dark:text-white">
                          {formatCurrency(f.montant_net_ht)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-blue-600 dark:text-blue-400">
                          {formatCurrency(f.rfa_attendue)}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-600 dark:text-gray-400">
                          {f.nb_lignes}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            PILL_STYLES[getAnomalyCountSeverity(f.anomalies_labo || [])]
                          }`}>
                            {f.anomalies_labo ? f.anomalies_labo.filter(a => !a.resolu).length : 0}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <StatutBadgeLabo statut={f.statut} />
                        </td>
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
                              onClick={() => {
                                setDeleteTargetId(f.id);
                                setShowDeleteDialog(true);
                              }}
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

      {/* Modal conditions commerciales */}
      {showConditions && (
        <ConditionsCommercialesForm
          laboratoireId={1}
          onClose={() => setShowConditions(false)}
          onSaved={() => loadFactures()}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDelete}
        title="Supprimer cette facture ?"
        description="Toutes les lignes et analyses associees seront egalement supprimees."
        itemName={
          deleteTargetId
            ? `Facture ${factures.find((f) => f.id === deleteTargetId)?.numero_facture || ''}`
            : undefined
        }
        loading={isDeleting}
      />
    </div>
  );
}
