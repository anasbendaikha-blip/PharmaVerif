/**
 * PharmaVerif - Page Factures (Tableau ameliore)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Page dediee a la consultation et gestion des factures :
 *  - 4 KPIs (total, conformes, anomalies, critiques)
 *  - Barre de filtres (recherche, statut chips, fournisseur, dates)
 *  - DataTable sortable avec selection et expansion
 *  - Pagination (20 par page)
 *  - Export PDF bulk des factures selectionnees
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../components/ui/page-header';
import { StatCard } from '../components/ui/stat-card';
import { DataTable, type DataTableColumn } from '../components/ui/data-table';
import { StatusBadge, getFactureStatusVariant } from '../components/ui/status-badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import {
  FileText,
  FileDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { Facture, Anomalie } from '../types';
import { exportVerificationReport } from '../utils/pdfExport';
import { db } from '../data/database';
import { toast } from 'sonner';
import { formatCurrency, formatDateShortFR } from '../utils/formatNumber';
import { cn } from '../components/ui/utils';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { ANOMALIE_LABELS, SEVERITE_LABELS } from '../constants/anomalyTypes';
import { useFilterState } from '../hooks/useFilterState';
import { SearchAndFilters } from '../components/search';
import { ShareFilteredSearch } from '../components/search/ShareFilteredSearch';
import { SavedSearches } from '../components/search/SavedSearches';
import { getUniqueFournisseurs } from '../utils/filterUtils';

// ========================================
// CONSTANTS
// ========================================

const PAGE_SIZE = 20;

// (Status labels now handled by SearchAndFilters component)

// ========================================
// COMPONENT
// ========================================

interface FacturesPageProps {
  onNavigate: (page: string) => void;
}

export function FacturesPage({ onNavigate }: FacturesPageProps) {
  // ==================== DATA STATE ====================
  const [factures, setFactures] = useState<Facture[]>([]);
  const [anomalies, setAnomalies] = useState<Anomalie[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [exportingBulk, setExportingBulk] = useState(false);

  // ==================== FILTER STATE (URL-synced) ====================
  const {
    filters,
    debouncedSearch,
    setFilter,
    setFilters,
    clearAll,
    filterChips,
    removeChip,
    activeCount,
    hasActiveFilters,
  } = useFilterState();

  // ==================== PAGINATION STATE ====================
  const [currentPage, setCurrentPage] = useState(1);

  // ==================== SELECTION STATE ====================
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ==================== EXPANSION STATE ====================
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ==================== DELETE STATE ====================
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ==================== LOAD DATA ====================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [facturesData, anomaliesData] = await Promise.all([
        ApiClient.getFactures(),
        ApiClient.getAnomalies(),
      ]);
      setFactures(facturesData);
      setAnomalies(anomaliesData);
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== COMPUTED VALUES ====================

  // Liste unique des fournisseurs (pour le multi-select)
  const fournisseursList = useMemo(() => getUniqueFournisseurs(factures), [factures]);

  // KPIs
  const kpis = useMemo(() => {
    const total = factures.length;
    const conformes = factures.filter((f) => f.statut_verification === 'conforme').length;
    const avecAnomalies = factures.filter((f) => f.statut_verification === 'anomalie').length;
    const critiques = factures.filter((f) => {
      const factureAnomalies = anomalies.filter((a) => a.facture_id === f.id);
      return factureAnomalies.some((a) => a.niveau_severite === 'erreur');
    }).length;
    return { total, conformes, anomalies: avecAnomalies, critiques };
  }, [factures, anomalies]);

  // Filtered factures (uses URL-synced filter state)
  const filteredFactures = useMemo(() => {
    let result = [...factures];

    // Search filter (fournisseur name or facture numero) — debounced
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter((f) => {
        const fournisseurName = (f.fournisseur?.nom || f.grossiste?.nom || '').toLowerCase();
        const numero = f.numero.toLowerCase();
        return fournisseurName.includes(q) || numero.includes(q);
      });
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'critique') {
        result = result.filter((f) => {
          const factureAnomalies = anomalies.filter((a) => a.facture_id === f.id);
          return factureAnomalies.some((a) => a.niveau_severite === 'erreur');
        });
      } else {
        result = result.filter((f) => f.statut_verification === filters.status);
      }
    }

    // Fournisseurs filter (multi-select)
    if (filters.fournisseurs.length > 0) {
      result = result.filter((f) => {
        const name = f.fournisseur?.nom || f.grossiste?.nom || '';
        return filters.fournisseurs.includes(name);
      });
    }

    // Montant range filter
    if (filters.montantMin !== undefined) {
      result = result.filter((f) => f.net_a_payer >= filters.montantMin!);
    }
    if (filters.montantMax !== undefined) {
      result = result.filter((f) => f.net_a_payer <= filters.montantMax!);
    }

    // Date range filter
    if (filters.dateDebut) {
      result = result.filter((f) => f.date >= filters.dateDebut!);
    }
    if (filters.dateFin) {
      result = result.filter((f) => f.date <= filters.dateFin!);
    }

    // Sort
    result.sort((a, b) => {
      let cmp: number;
      switch (filters.sortBy) {
        case 'montant':
          cmp = a.net_a_payer - b.net_a_payer;
          break;
        case 'fournisseur': {
          const nameA = a.fournisseur?.nom || a.grossiste?.nom || '';
          const nameB = b.fournisseur?.nom || b.grossiste?.nom || '';
          cmp = nameA.localeCompare(nameB, 'fr');
          break;
        }
        case 'date':
        default:
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
      }
      return filters.sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [factures, anomalies, debouncedSearch, filters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFactures.length / PAGE_SIZE));
  const paginatedFactures = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFactures.slice(start, start + PAGE_SIZE);
  }, [filteredFactures, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // ==================== HANDLERS ====================

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const pageIds = paginatedFactures.map((f) => f.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [paginatedFactures, selectedIds]);

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

  const handleBulkExport = async () => {
    if (selectedIds.size === 0) return;
    setExportingBulk(true);
    try {
      let exported = 0;
      for (const id of selectedIds) {
        const facture = factures.find((f) => f.id === id);
        if (!facture) continue;
        const fournisseur = db.getFournisseurById(facture.fournisseur_id);
        if (!fournisseur) continue;
        const factureAnomalies = anomalies.filter((a) => a.facture_id === id);
        await exportVerificationReport({ facture, anomalies: factureAnomalies, fournisseur });
        exported++;
      }
      toast.success(`${exported} rapport(s) PDF telecharge(s) !`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Erreur lors de l'export PDF bulk:", error);
      toast.error("Erreur lors de l'export groupé");
    } finally {
      setExportingBulk(false);
    }
  };

  // ---- Delete single facture ----
  const handleDeleteFacture = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await ApiClient.deleteFacture(deleteTargetId);
      toast.success('Facture supprimee');
      setShowDeleteDialog(false);
      // Retirer de la selection si necessaire
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTargetId);
        return next;
      });
      setDeleteTargetId(null);
      await loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- Batch delete ----
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      let deleted = 0;
      for (const id of selectedIds) {
        await ApiClient.deleteFacture(id);
        deleted++;
      }
      toast.success(`${deleted} facture(s) supprimee(s)`);
      setShowBulkDeleteDialog(false);
      setSelectedIds(new Set());
      await loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression groupee:', error);
      toast.error('Erreur lors de la suppression groupee');
    } finally {
      setIsDeleting(false);
    }
  };

  // ==================== TABLE COLUMNS ====================

  const factureColumns: DataTableColumn<Facture>[] = useMemo(
    () => [
      {
        key: 'selection',
        header: '',
        width: '44px',
        render: (row) => (
          <label className="flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selectedIds.has(row.id)}
              onChange={() => toggleSelection(row.id)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring accent-primary cursor-pointer"
            />
          </label>
        ),
      },
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        render: (row) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDateShortFR(row.date)}
          </span>
        ),
        sortFn: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      },
      {
        key: 'numero',
        header: 'N° Facture',
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
        width: '130px',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleExportFacturePDF(row.id);
              }}
              disabled={exportingId === row.id}
              className="gap-1.5 h-8"
              title="Exporter PDF"
            >
              {exportingId === row.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTargetId(row.id);
                setShowDeleteDialog(true);
              }}
              className="gap-1.5 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedId(expandedId === row.id ? null : row.id);
              }}
              className="gap-1.5 h-8"
              title="Details"
            >
              {expandedId === row.id ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ),
      },
    ],
    [selectedIds, exportingId, expandedId, toggleSelection] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Get anomalies for expanded row
  const getFactureAnomalies = (factureId: number) => {
    return anomalies.filter((a) => a.facture_id === factureId);
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* ===== PAGE HEADER ===== */}
      <PageHeader
        title="Factures"
        description="Consultez et gerez l'ensemble de vos factures verifiees"
        icon={<FileText className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowBulkDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Supprimer ({selectedIds.size})
                </span>
              </Button>
            )}
            <Button
              onClick={handleBulkExport}
              disabled={selectedIds.size === 0 || exportingBulk}
              className="gap-2"
            >
              {exportingBulk ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                Exporter {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} PDF
              </span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        }
      />

      {/* ===== KPIs ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total factures"
          value={kpis.total}
          icon={<FileText className="h-5 w-5" />}
          variant="blue"
          loading={loading}
          onClick={() => setFilter('status', 'all')}
        />
        <StatCard
          label="Conformes"
          value={kpis.conformes}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="green"
          loading={loading}
          onClick={() => setFilter('status', 'conforme')}
        />
        <StatCard
          label="Anomalies"
          value={kpis.anomalies}
          icon={<AlertCircle className="h-5 w-5" />}
          variant="orange"
          loading={loading}
          onClick={() => setFilter('status', 'anomalie')}
        />
        <StatCard
          label="Critiques"
          value={kpis.critiques}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="red"
          loading={loading}
          onClick={() => setFilter('status', 'critique')}
        />
      </div>

      {/* ===== SEARCH & FILTERS (URL-synced) ===== */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <SearchAndFilters
            filters={filters}
            onFiltersChange={setFilters}
            filterChips={filterChips}
            onRemoveChip={removeChip}
            hasActiveFilters={hasActiveFilters}
            activeCount={activeCount}
            onClearAll={clearAll}
            resultCount={filteredFactures.length}
            totalCount={factures.length}
            availableFournisseurs={fournisseursList}
            className="flex-1 min-w-0"
          />
          <div className="flex flex-col gap-2 shrink-0 pt-1">
            <ShareFilteredSearch />
          </div>
        </div>
        <SavedSearches
          currentFilters={filters}
          onLoadSearch={(savedFilters) => setFilters(savedFilters)}
        />
      </div>

      {/* ===== SELECT ALL / SELECTION INFO ===== */}
      {paginatedFactures.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  paginatedFactures.length > 0 &&
                  paginatedFactures.every((f) => selectedIds.has(f.id))
                }
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-border text-primary focus:ring-ring accent-primary cursor-pointer"
              />
              Tout selectionner ({paginatedFactures.length})
            </label>
            {selectedIds.size > 0 && (
              <span className="text-primary font-medium">
                {selectedIds.size} facture(s) selectionnee(s)
              </span>
            )}
          </div>
          <span>
            {filteredFactures.length} resultat{filteredFactures.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ===== DATA TABLE ===== */}
      <div>
        <DataTable
          data={paginatedFactures}
          columns={factureColumns}
          rowKey={(row) => row.id}
          loading={loading}
          loadingRows={6}
          emptyMessage="Aucune facture trouvee"
          emptyDescription={
            hasActiveFilters
              ? 'Essayez de modifier vos filtres de recherche'
              : 'Importez vos factures pour commencer'
          }
          emptyIcon={<FileText className="h-8 w-8 text-muted-foreground/50" />}
          defaultSort={{ key: 'date', direction: 'desc' }}
          onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
          rowClassName={(row) =>
            cn(
              expandedId === row.id && 'bg-muted/30',
              selectedIds.has(row.id) && 'bg-primary/5'
            )
          }
        />

        {/* ===== EXPANSION PANEL ===== */}
        {expandedId !== null && (
          <ExpandedRow
            facture={factures.find((f) => f.id === expandedId)}
            anomalies={getFactureAnomalies(expandedId)}
            onExport={() => handleExportFacturePDF(expandedId)}
            onClose={() => setExpandedId(null)}
            exporting={exportingId === expandedId}
          />
        )}
      </div>

      {/* ===== PAGINATION ===== */}
      {filteredFactures.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground hidden sm:block">
            Page {currentPage} sur {totalPages}
            {' '}&middot;{' '}
            {filteredFactures.length} facture{filteredFactures.length !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-muted-foreground sm:hidden">
            {currentPage}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Precedent</span>
            </Button>

            {/* Page numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="gap-1.5"
            >
              <span className="hidden sm:inline">Suivant</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== EMPTY STATE (no data at all) ===== */}
      {!loading && factures.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Aucune facture verifiee
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Commencez par importer et verifier vos premieres factures fournisseur
              pour voir les resultats ici.
            </p>
            <Button onClick={() => onNavigate('verification')} className="gap-2">
              <FileText className="h-4 w-4" />
              Verifier une facture
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ===== CONFIRM DIALOGS ===== */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteFacture}
        title="Supprimer cette facture ?"
        description="Toutes les verifications et anomalies associees seront egalement supprimees."
        itemName={
          deleteTargetId
            ? `Facture ${factures.find((f) => f.id === deleteTargetId)?.numero || ''}`
            : undefined
        }
        loading={isDeleting}
      />

      <ConfirmDialog
        open={showBulkDeleteDialog}
        onClose={() => setShowBulkDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        title={`Supprimer ${selectedIds.size} facture(s) ?`}
        description="Toutes les verifications et anomalies associees seront egalement supprimees."
        loading={isDeleting}
      />
    </div>
  );
}

// ========================================
// EXPANDED ROW SUB-COMPONENT
// ========================================

interface ExpandedRowProps {
  facture?: Facture;
  anomalies: Anomalie[];
  onExport: () => void;
  onClose: () => void;
  exporting: boolean;
}

function ExpandedRow({ facture, anomalies: rowAnomalies, onExport, onClose, exporting }: ExpandedRowProps) {
  if (!facture) return null;

  return (
    <Card className="mt-1 border-l-4 border-l-primary">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Facture {facture.numero}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {facture.fournisseur?.nom || facture.grossiste?.nom || 'Fournisseur inconnu'}
              {' '}&middot;{' '}
              {formatDateShortFR(facture.date)}
              {' '}&middot;{' '}
              {formatCurrency(facture.net_a_payer)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={exporting}
              className="gap-1.5"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              Exporter PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {rowAnomalies.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Anomalies detectees ({rowAnomalies.length})
            </p>
            {rowAnomalies.map((anomalie) => (
              <div
                key={anomalie.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <AlertCircle
                  className={cn(
                    'h-4 w-4 shrink-0 mt-0.5',
                    anomalie.niveau_severite === 'erreur'
                      ? 'text-destructive'
                      : anomalie.niveau_severite === 'warning'
                        ? 'text-warning'
                        : 'text-info'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {ANOMALIE_LABELS[anomalie.type_anomalie] || anomalie.type_anomalie}
                    </span>
                    <StatusBadge
                      label={SEVERITE_LABELS[anomalie.niveau_severite] || anomalie.niveau_severite}
                      variant={
                        anomalie.niveau_severite === 'erreur'
                          ? 'error'
                          : anomalie.niveau_severite === 'warning'
                            ? 'warning'
                            : 'info'
                      }
                      size="sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{anomalie.description}</p>
                  {anomalie.montant_ecart > 0 && (
                    <p className="text-xs font-medium text-destructive mt-1">
                      Ecart : {formatCurrency(anomalie.montant_ecart)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Alert variant="success">
            <CheckCircle2 className="size-4" />
            <AlertTitle>Aucune anomalie</AlertTitle>
            <AlertDescription>Cette facture est conforme.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
