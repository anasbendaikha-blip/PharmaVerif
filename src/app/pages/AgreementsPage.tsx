/**
 * PharmaVerif - Page Accords Commerciaux (Rebate Engine)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Page complete : liste groupee par laboratoire, stats, detail,
 * creation/modification d'accords, historique des versions.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/page-header';
import { StatCard } from '../components/ui/stat-card';
import { StatusBadge } from '../components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Handshake,
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Play,
  History,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { rebateApi } from '../api/rebateApi';
import { laboratoiresApi } from '../api/laboratoiresApi';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { AgreementForm } from '../components/Agreements/AgreementForm';
import { formatCurrency, formatPercentage, formatDateShortFR } from '../utils/formatNumber';
import type {
  LaboratoryAgreementResponse,
  RebateTemplateResponse,
  RebateStatsResponse,
  AgreementVersionHistoryResponse,
  LaboratoireResponse,
  AgreementStatusType,
} from '../api/types';

// ========================================
// HELPERS
// ========================================

function getStatusVariant(statut: AgreementStatusType): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (statut) {
    case 'actif':
      return 'success';
    case 'brouillon':
      return 'warning';
    case 'suspendu':
      return 'error';
    case 'expire':
    case 'archive':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function getStatusLabel(statut: AgreementStatusType): string {
  const labels: Record<string, string> = {
    brouillon: 'Brouillon',
    actif: 'Actif',
    suspendu: 'Suspendu',
    expire: 'Expire',
    archive: 'Archive',
  };
  return labels[statut] || statut;
}

// ========================================
// PROPS
// ========================================

interface AgreementsPageProps {
  onNavigate: (page: string) => void;
}

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export function AgreementsPage({ onNavigate }: AgreementsPageProps) {
  // Liste
  const [agreements, setAgreements] = useState<LaboratoryAgreementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RebateStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filtres
  const [filterLabo, setFilterLabo] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');

  // Referentiels
  const [labos, setLabos] = useState<LaboratoireResponse[]>([]);
  const [templates, setTemplates] = useState<RebateTemplateResponse[]>([]);

  // Detail
  const [selectedAgreement, setSelectedAgreement] = useState<LaboratoryAgreementResponse | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [versionHistory, setVersionHistory] = useState<AgreementVersionHistoryResponse | null>(null);

  // Formulaire
  const [showForm, setShowForm] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<LaboratoryAgreementResponse | null>(null);

  // Suppression
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // ========================================
  // CHARGEMENT
  // ========================================

  const loadAgreements = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (filterLabo !== 'all') params.laboratoire_id = Number(filterLabo);
      if (filterStatut !== 'all') params.statut = filterStatut;

      const result = await rebateApi.listAgreements(params as never);
      setAgreements(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement des accords';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filterLabo, filterStatut]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const result = await rebateApi.getStats();
      setStats(result);
    } catch {
      // Stats non-critique
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    laboratoiresApi.list().then(setLabos).catch(() => {});
    rebateApi.listTemplates(true).then(setTemplates).catch(() => {});
  }, []);

  // ========================================
  // ACTIONS
  // ========================================

  const handleViewDetail = async (agreement: LaboratoryAgreementResponse) => {
    setSelectedAgreement(agreement);
    setShowDetail(true);
    try {
      const history = await rebateApi.getAgreementHistory(agreement.id);
      setVersionHistory(history);
    } catch {
      setVersionHistory(null);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await rebateApi.activateAgreement(id);
      toast.success('Accord active avec succes');
      loadAgreements();
      loadStats();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'activation';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(deleteTargetId);
      await rebateApi.deleteAgreement(deleteTargetId);
      toast.success('Accord supprime');
      setShowDeleteDialog(false);
      if (showDetail && selectedAgreement?.id === deleteTargetId) {
        setShowDetail(false);
        setSelectedAgreement(null);
      }
      setDeleteTargetId(null);
      loadAgreements();
      loadStats();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAgreement(null);
    loadAgreements();
    loadStats();
  };

  const handleEdit = (agreement: LaboratoryAgreementResponse) => {
    setEditingAgreement(agreement);
    setShowForm(true);
    setShowDetail(false);
  };

  // ========================================
  // GROUPER PAR LABORATOIRE
  // ========================================

  const groupedByLabo = agreements.reduce<Record<string, {
    labo_nom: string;
    labo_id: number;
    agreements: LaboratoryAgreementResponse[];
  }>>((acc, ag) => {
    const key = String(ag.laboratoire_id);
    if (!acc[key]) {
      acc[key] = {
        labo_nom: ag.laboratoire_nom || `Labo #${ag.laboratoire_id}`,
        labo_id: ag.laboratoire_id,
        agreements: [],
      };
    }
    acc[key].agreements.push(ag);
    return acc;
  }, {});

  // ========================================
  // RENDER : Formulaire
  // ========================================

  if (showForm) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={editingAgreement ? 'Modifier l\'accord' : 'Nouvel accord commercial'}
          description={editingAgreement ? `Modification de "${editingAgreement.nom}"` : 'Configurer un nouvel accord de remises echelonnees'}
          icon={<Handshake className="h-5 w-5" />}
          actions={
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditingAgreement(null); }}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          }
        />
        <AgreementForm
          templates={templates}
          labos={labos}
          editingAgreement={editingAgreement}
          onSuccess={handleFormSuccess}
          onCancel={() => { setShowForm(false); setEditingAgreement(null); }}
        />
      </div>
    );
  }

  // ========================================
  // RENDER : Detail
  // ========================================

  if (showDetail && selectedAgreement) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={selectedAgreement.nom}
          description={`${selectedAgreement.laboratoire_nom || 'Laboratoire'} — Version ${selectedAgreement.version}`}
          icon={<Handshake className="h-5 w-5" />}
          actions={
            <div className="flex gap-2">
              {selectedAgreement.statut === 'brouillon' && (
                <Button size="sm" onClick={() => handleActivate(selectedAgreement.id)}>
                  <Play className="h-4 w-4 mr-1" />
                  Activer
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleEdit(selectedAgreement)}>
                <FileText className="h-4 w-4 mr-1" />
                Modifier
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowDetail(false); setSelectedAgreement(null); }}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
            </div>
          }
        />

        {/* Stats accord */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Statut"
            value={getStatusLabel(selectedAgreement.statut)}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant={selectedAgreement.statut === 'actif' ? 'green' : 'default'}
          />
          <StatCard
            label="CA Cumule"
            value={formatCurrency(selectedAgreement.ca_cumule)}
            icon={<BarChart3 className="h-5 w-5" />}
            variant="blue"
          />
          <StatCard
            label="Remise Cumulee"
            value={formatCurrency(selectedAgreement.remise_cumulee)}
            icon={<Handshake className="h-5 w-5" />}
            variant="purple"
          />
          <StatCard
            label="Avancement"
            value={formatPercentage(selectedAgreement.avancement_pct)}
            icon={<BarChart3 className="h-5 w-5" />}
            variant="orange"
            subtitle={selectedAgreement.objectif_ca_annuel ? `Objectif: ${formatCurrency(selectedAgreement.objectif_ca_annuel)}` : undefined}
          />
        </div>

        {/* Info accord */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Informations de l'accord</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Template</p>
                <p className="font-medium">{selectedAgreement.template_nom || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date debut</p>
                <p className="font-medium">{formatDateShortFR(selectedAgreement.date_debut)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date fin</p>
                <p className="font-medium">{selectedAgreement.date_fin ? formatDateShortFR(selectedAgreement.date_fin) : 'Indefinie'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reference externe</p>
                <p className="font-medium">{selectedAgreement.reference_externe || '-'}</p>
              </div>
              {selectedAgreement.taux_escompte != null && selectedAgreement.taux_escompte > 0 && (
                <div>
                  <p className="text-muted-foreground">Escompte</p>
                  <p className="font-medium">{formatPercentage(selectedAgreement.taux_escompte)}</p>
                </div>
              )}
              {selectedAgreement.taux_cooperation != null && selectedAgreement.taux_cooperation > 0 && (
                <div>
                  <p className="text-muted-foreground">Cooperation commerciale</p>
                  <p className="font-medium">{formatPercentage(selectedAgreement.taux_cooperation)}</p>
                </div>
              )}
              {selectedAgreement.notes && (
                <div className="md:col-span-2">
                  <p className="text-muted-foreground">Notes</p>
                  <p className="font-medium">{selectedAgreement.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuration des tranches */}
        {selectedAgreement.agreement_config?.tranche_configurations && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Configuration des tranches</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(selectedAgreement.agreement_config.tranche_configurations).map(([trancheKey, config]) => (
                  <Card key={trancheKey} className="border-dashed">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-3">
                        {trancheKey === 'tranche_A' ? 'Tranche A (generiques)' : 'Tranche B (non-generiques)'}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Plafond RFA : <span className="font-medium text-foreground">{formatPercentage((config.max_rebate || 0) * 100)}</span>
                      </p>
                      {config.stages && Object.entries(config.stages).map(([stageId, stageConfig]) => (
                        <div key={stageId} className="flex justify-between items-center py-1.5 border-b border-dashed last:border-b-0">
                          <span className="text-sm text-muted-foreground">{stageId}</span>
                          <span className="text-sm font-medium">
                            {stageConfig.rate != null && formatPercentage(stageConfig.rate * 100)}
                            {stageConfig.incremental_rate != null && ` (+${formatPercentage(stageConfig.incremental_rate * 100)})`}
                            {stageConfig.cumulative_rate != null && ` = ${formatPercentage(stageConfig.cumulative_rate * 100)}`}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historique des versions */}
        {versionHistory && versionHistory.versions.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des versions
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date debut</TableHead>
                    <TableHead>Date fin</TableHead>
                    <TableHead>Factures</TableHead>
                    <TableHead>Date creation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versionHistory.versions.map((v) => (
                    <TableRow key={v.version}>
                      <TableCell className="font-medium">v{v.version}</TableCell>
                      <TableCell>
                        <StatusBadge
                          label={getStatusLabel(v.statut as AgreementStatusType)}
                          variant={getStatusVariant(v.statut as AgreementStatusType)}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell>{formatDateShortFR(v.date_debut)}</TableCell>
                      <TableCell>{v.date_fin ? formatDateShortFR(v.date_fin) : '-'}</TableCell>
                      <TableCell>{v.invoices_count}</TableCell>
                      <TableCell>{formatDateShortFR(v.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ========================================
  // RENDER : Liste
  // ========================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accords Commerciaux"
        description="Gestion des accords de remises echelonnees avec les laboratoires"
        icon={<Handshake className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => { loadAgreements(); loadStats(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nouvel accord
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Accords actifs"
          value={stats?.agreements_actifs ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="green"
          loading={statsLoading}
        />
        <StatCard
          label="CA Cumule Total"
          value={stats ? formatCurrency(stats.ca_cumule_total) : '-'}
          icon={<BarChart3 className="h-5 w-5" />}
          variant="blue"
          loading={statsLoading}
        />
        <StatCard
          label="Remises Prevues"
          value={stats ? formatCurrency(stats.remises_prevues_total) : '-'}
          icon={<Handshake className="h-5 w-5" />}
          variant="purple"
          loading={statsLoading}
        />
        <StatCard
          label="Echeances en retard"
          value={stats?.echeances_en_retard ?? 0}
          icon={<AlertCircle className="h-5 w-5" />}
          variant={stats && stats.echeances_en_retard > 0 ? 'red' : 'default'}
          loading={statsLoading}
        />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterLabo} onValueChange={(v) => { setFilterLabo(v); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Laboratoire" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les laboratoires</SelectItem>
            {labos.map(l => (
              <SelectItem key={l.id} value={String(l.id)}>{l.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatut} onValueChange={(v) => { setFilterStatut(v); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="actif">Actif</SelectItem>
            <SelectItem value="suspendu">Suspendu</SelectItem>
            <SelectItem value="expire">Expire</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste groupee par laboratoire */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Chargement des accords...
          </CardContent>
        </Card>
      ) : Object.keys(groupedByLabo).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Handshake className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">Aucun accord trouve</p>
            <p className="text-sm">Creez un nouvel accord pour commencer a suivre vos remises echelonnees.</p>
            <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Creer un accord
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByLabo).map(([key, group]) => (
          <Card key={key}>
            <CardHeader>
              <h3 className="text-lg font-semibold">{group.labo_nom}</h3>
              <p className="text-sm text-muted-foreground">
                {group.agreements.length} accord{group.agreements.length > 1 ? 's' : ''}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Accord</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">CA Cumule</TableHead>
                    <TableHead className="text-right">Remise Cumulee</TableHead>
                    <TableHead className="text-right">Avancement</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.agreements.map(ag => (
                    <TableRow key={ag.id}>
                      <TableCell className="font-medium">{ag.nom}</TableCell>
                      <TableCell className="text-muted-foreground">{ag.template_nom || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge
                          label={getStatusLabel(ag.statut)}
                          variant={getStatusVariant(ag.statut)}
                          size="sm"
                          pulse={ag.statut === 'actif'}
                        />
                      </TableCell>
                      <TableCell>v{ag.version}</TableCell>
                      <TableCell>
                        <span className="text-xs">
                          {formatDateShortFR(ag.date_debut)}
                          {ag.date_fin && ` - ${formatDateShortFR(ag.date_fin)}`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(ag.ca_cumule)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(ag.remise_cumulee)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${Math.min(ag.avancement_pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums">{formatPercentage(ag.avancement_pct, 0)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetail(ag)} title="Detail">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {ag.statut === 'brouillon' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleActivate(ag.id)} title="Activer">
                                <Play className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setDeleteTargetId(ag.id); setShowDeleteDialog(true); }}
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Dialog suppression */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Supprimer l'accord"
        description="Cette action est irreversible. L'accord sera supprime definitivement."
        confirmLabel="Supprimer"
        variant="destructive"
        loading={deleting !== null}
        onConfirm={handleDelete}
      />
    </div>
  );
}
