/**
 * PharmaVerif - Page Accords Commerciaux (Rebate Engine)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Page complete : liste groupee par laboratoire, stats M0/M+1,
 * detail avec onglets (Accord / Calendriers / Audit),
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  BarChart3,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { rebateApi } from '../api/rebateApi';
import { laboratoiresApi } from '../api/laboratoiresApi';
import { getErrorMessage } from '../api/httpClient';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { AgreementForm } from '../components/Agreements/AgreementForm';
import { formatCurrency, formatPercentage, formatDateShortFR } from '../utils/formatNumber';
import {
  getStageLabel,
  getStageLabelShort,
  getPaymentMethodLabel,
  getEntryStatusVariant,
  getEntryStatusLabel,
} from '../utils/rebateLabels';
import type {
  LaboratoryAgreementResponse,
  RebateTemplateResponse,
  RebateStatsResponse,
  AgreementVersionHistoryResponse,
  LaboratoireResponse,
  AgreementStatusType,
  RemonteesSummaryResponse,
  InvoiceRebateScheduleResponse,
  RebateEntry,
  AgreementAuditLogResponse,
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

  // Remontees M0/M+1
  const [remontees, setRemontees] = useState<RemonteesSummaryResponse | null>(null);
  const [remonteesLoading, setRemonteesLoading] = useState(true);

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
  const [detailSchedules, setDetailSchedules] = useState<InvoiceRebateScheduleResponse[]>([]);
  const [detailSchedulesLoading, setDetailSchedulesLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AgreementAuditLogResponse[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

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
      toast.error(getErrorMessage(err, 'Erreur de chargement des accords'));
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

  const loadRemontees = useCallback(async () => {
    try {
      setRemonteesLoading(true);
      const result = await rebateApi.getRemonteesSummary();
      setRemontees(result);
    } catch {
      // Non-critique
    } finally {
      setRemonteesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  useEffect(() => {
    loadStats();
    loadRemontees();
  }, [loadStats, loadRemontees]);

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
    // Charger historique des versions
    try {
      const history = await rebateApi.getAgreementHistory(agreement.id);
      setVersionHistory(history);
    } catch {
      setVersionHistory(null);
    }
  };

  const loadDetailSchedules = useCallback(async (agreementId: number) => {
    try {
      setDetailSchedulesLoading(true);
      const result = await rebateApi.listSchedules({ agreement_id: agreementId });
      setDetailSchedules(result);
    } catch {
      setDetailSchedules([]);
    } finally {
      setDetailSchedulesLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async (agreementId: number) => {
    try {
      setAuditLogsLoading(true);
      const result = await rebateApi.getAuditLogs(agreementId);
      setAuditLogs(result);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLogsLoading(false);
    }
  }, []);

  const handleActivate = async (id: number) => {
    try {
      await rebateApi.activateAgreement(id);
      toast.success('Accord active avec succes');
      loadAgreements();
      loadStats();
      loadRemontees();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur lors de l\'activation'));
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
      loadRemontees();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur lors de la suppression'));
    } finally {
      setDeleting(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAgreement(null);
    loadAgreements();
    loadStats();
    loadRemontees();
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
  // PARSE rebate_entries d'un schedule
  // ========================================

  function parseEntries(schedule: InvoiceRebateScheduleResponse): RebateEntry[] {
    const raw = schedule.rebate_entries;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as unknown as RebateEntry[];
    if (typeof raw === 'object' && raw !== null) {
      const values = Object.values(raw);
      if (values.length > 0 && typeof values[0] === 'object') {
        return values as unknown as RebateEntry[];
      }
    }
    return [];
  }

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
  // RENDER : Detail (avec onglets)
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

        {/* Onglets : Accord / Calendriers M0-M+1 / Audit */}
        <Tabs defaultValue="accord" onValueChange={(val) => {
          if (val === 'calendriers' && detailSchedules.length === 0) {
            loadDetailSchedules(selectedAgreement.id);
          }
          if (val === 'audit' && auditLogs.length === 0) {
            loadAuditLogs(selectedAgreement.id);
          }
        }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="accord">
              <Handshake className="h-4 w-4 mr-1.5" />
              Accord
            </TabsTrigger>
            <TabsTrigger value="calendriers">
              <Calendar className="h-4 w-4 mr-1.5" />
              Calendriers M0/M+1
            </TabsTrigger>
            <TabsTrigger value="audit">
              <History className="h-4 w-4 mr-1.5" />
              Audit
            </TabsTrigger>
          </TabsList>

          {/* --- Onglet 1 : Accord --- */}
          <TabsContent value="accord" className="space-y-4 mt-4">
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

            {/* Configuration des tranches — avec labels lisibles */}
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
                            <div key={stageId} className="flex justify-between items-center py-2 border-b border-dashed last:border-b-0">
                              <div className="flex items-center gap-2">
                                {stageId === 'immediate' ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                ) : stageId === 'annual_bonus' ? (
                                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                                )}
                                <span className="text-sm font-medium">{getStageLabel(stageId)}</span>
                              </div>
                              <span className="text-sm font-medium tabular-nums">
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
          </TabsContent>

          {/* --- Onglet 2 : Calendriers M0/M+1 --- */}
          <TabsContent value="calendriers" className="space-y-4 mt-4">
            {detailSchedulesLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Chargement des calendriers...
                </CardContent>
              </Card>
            ) : detailSchedules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium mb-1">Aucun calendrier de remises</p>
                  <p className="text-sm">Les calendriers seront crees automatiquement lors de l'import des factures.</p>
                </CardContent>
              </Card>
            ) : (
              detailSchedules.map((schedule) => {
                const entries = parseEntries(schedule);
                return (
                  <Card key={schedule.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">
                            Facture {schedule.facture_labo_id ? `#${schedule.facture_labo_id}` : '-'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {schedule.invoice_date ? formatDateShortFR(schedule.invoice_date) : '-'}
                            {' '}• Montant : {formatCurrency(schedule.invoice_amount || 0)}
                            {' '}• RFA : {formatCurrency(schedule.total_rfa_expected)} ({formatPercentage(schedule.total_rfa_percentage * 100)})
                          </p>
                        </div>
                        <StatusBadge
                          label={getEntryStatusLabel(schedule.statut)}
                          variant={getEntryStatusVariant(schedule.statut)}
                          size="sm"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Etape</TableHead>
                            <TableHead>Mode de paiement</TableHead>
                            <TableHead className="text-right">Tranche A</TableHead>
                            <TableHead className="text-right">Tranche B</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Echeance</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entries.map((entry, idx) => (
                            <TableRow key={entry.stage_id || idx}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {entry.payment_method === 'invoice_deduction' ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                  ) : entry.is_conditional ? (
                                    <Calendar className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                  ) : (
                                    <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                  )}
                                  <span className="font-medium text-sm">{entry.stage_label || getStageLabel(entry.stage_id)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {getPaymentMethodLabel(entry.payment_method)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm">
                                {formatCurrency(entry.tranche_A_amount)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm">
                                {formatCurrency(entry.tranche_B_amount)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-medium text-sm">
                                {formatCurrency(entry.total_amount)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {entry.expected_date ? formatDateShortFR(entry.expected_date) : '-'}
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  label={getEntryStatusLabel(entry.status)}
                                  variant={getEntryStatusVariant(entry.status)}
                                  size="sm"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* --- Onglet 3 : Audit --- */}
          <TabsContent value="audit" className="space-y-4 mt-4">
            {auditLogsLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Chargement du journal d'audit...
                </CardContent>
              </Card>
            ) : auditLogs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium mb-1">Aucune entree d'audit</p>
                  <p className="text-sm">Le journal enregistre les modifications, activations et changements de version.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Utilisateur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{formatDateShortFR(log.created_at)}</TableCell>
                          <TableCell>
                            <StatusBadge
                              label={log.action}
                              variant={log.action === 'creation' ? 'success' : log.action === 'activation' ? 'info' : 'neutral'}
                              size="sm"
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{log.description || '-'}</TableCell>
                          <TableCell className="text-sm">#{log.user_id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ========================================
  // RENDER : Liste
  // ========================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Remises & Remontees"
        description="Gestion des remises echelonnees M0/M+1 et suivi des remontees"
        icon={<Handshake className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => { loadAgreements(); loadStats(); loadRemontees(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nouvel accord
            </Button>
          </>
        }
      />

      {/* Stats generales */}
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

      {/* Section M0/M+1 — Ventilation des remontees */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ventilation M0 / M+1 / M+2
          </h3>
          <p className="text-sm text-muted-foreground">
            Synthese des remises directes et remontees differees sur toutes vos factures
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-3 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-xs text-muted-foreground">M0 — Remises directes</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400 tabular-nums">
                {remonteesLoading ? '...' : formatCurrency(remontees?.total_m0_received ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xs text-muted-foreground">M+1 — En attente</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                {remonteesLoading ? '...' : formatCurrency(remontees?.total_m1_pending ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-3 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-xs text-muted-foreground">M+1 — Recues</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400 tabular-nums">
                {remonteesLoading ? '...' : formatCurrency(remontees?.total_m1_received ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-indigo-50 dark:bg-indigo-950/30 p-3 text-center">
              <ArrowRight className="h-5 w-5 mx-auto mb-1 text-indigo-600" />
              <p className="text-xs text-muted-foreground">M+2 — En attente</p>
              <p className="text-lg font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                {remonteesLoading ? '...' : formatCurrency(remontees?.total_m2_pending ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-amber-600" />
              <p className="text-xs text-muted-foreground">Primes conditionnelles</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                {remonteesLoading ? '...' : formatCurrency(remontees?.total_conditional ?? 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des prochaines remontees et en retard */}
      {!remonteesLoading && remontees && (
        (remontees.late_remontees.length > 0 || remontees.upcoming_remontees.length > 0) && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Prochaines remontees
                {remontees.count_late > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {remontees.count_late} en retard
                  </span>
                )}
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Laboratoire</TableHead>
                    <TableHead>Facture</TableHead>
                    <TableHead>Etape</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Echeance</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* En retard d'abord (rouge) */}
                  {remontees.late_remontees.slice(0, 10).map((entry, idx) => (
                    <TableRow key={`late-${idx}`} className="bg-red-50/50 dark:bg-red-950/20">
                      <TableCell className="font-medium text-sm">{entry.laboratoire_nom}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.facture_numero || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                          <span className="text-sm">{getStageLabelShort(entry.stage_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{getPaymentMethodLabel(entry.payment_method)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-sm">{formatCurrency(entry.total_amount)}</TableCell>
                      <TableCell className="text-sm text-red-600 dark:text-red-400 font-medium">
                        {entry.expected_date ? formatDateShortFR(entry.expected_date) : '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label="En retard" variant="error" size="sm" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Prochaines */}
                  {remontees.upcoming_remontees.slice(0, 10).map((entry, idx) => (
                    <TableRow key={`upcoming-${idx}`}>
                      <TableCell className="font-medium text-sm">{entry.laboratoire_nom}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.facture_numero || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          <span className="text-sm">{getStageLabelShort(entry.stage_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{getPaymentMethodLabel(entry.payment_method)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-sm">{formatCurrency(entry.total_amount)}</TableCell>
                      <TableCell className="text-sm">
                        {entry.expected_date ? formatDateShortFR(entry.expected_date) : '-'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={getEntryStatusLabel(entry.status)}
                          variant={getEntryStatusVariant(entry.status)}
                          size="sm"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      )}

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
            <p className="text-sm">Creez un nouvel accord pour commencer a suivre vos remises echelonnees M0/M+1.</p>
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
