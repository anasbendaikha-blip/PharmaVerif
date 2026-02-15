/**
 * PharmaVerif - Page EMAC (Etats Mensuels des Avantages Commerciaux)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Page complete : liste paginee, detail avec triangle de verification,
 * formulaire de saisie manuelle, upload Excel/CSV.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/page-header';
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
  ClipboardList,
  Upload,
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { emacApi } from '../api/emacApi';
import { rapportsApi } from '../api/rapportsApi';
import { laboratoiresApi } from '../api/laboratoiresApi';
import { getErrorMessage } from '../api/httpClient';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import type {
  EMACResponse,
  LaboratoireResponse,
  TriangleVerificationResponse,
  EMACCreateManuel,
  StatutVerificationEMAC,
} from '../api/types';
import { EMACComparisonEnhanced } from '../components/EMACComparisonEnhanced';
import { formatCurrency } from '../utils/formatNumber';

// ========================================
// HELPERS
// ========================================

function formatPeriode(debut: string, fin: string): string {
  const d = new Date(debut);
  const mois = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return mois.charAt(0).toUpperCase() + mois.slice(1);
}

function getStatutBadge(statut: StatutVerificationEMAC) {
  const map: Record<string, { label: string; className: string }> = {
    non_verifie: { label: 'Non verifie', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    en_cours: { label: 'En cours', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    conforme: { label: 'Conforme', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    ecart_detecte: { label: 'Ecart detecte', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    anomalie: { label: 'Anomalie', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  };
  const info = map[statut] || map.non_verifie;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.className}`}>
      {statut === 'conforme' && <CheckCircle2 className="h-3 w-3" />}
      {statut === 'ecart_detecte' && <AlertTriangle className="h-3 w-3" />}
      {statut === 'anomalie' && <AlertCircle className="h-3 w-3" />}
      {info.label}
    </span>
  );
}

// ========================================
// PROPS
// ========================================

interface EMACPageProps {
  onNavigate: (page: string) => void;
}

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export function EMACPage({ onNavigate }: EMACPageProps) {
  // Liste
  const [emacs, setEmacs] = useState<EMACResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [filterLabo, setFilterLabo] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');

  // Laboratoires
  const [labos, setLabos] = useState<LaboratoireResponse[]>([]);

  // Detail / Triangle
  const [selectedEmac, setSelectedEmac] = useState<EMACResponse | null>(null);
  const [triangle, setTriangle] = useState<TriangleVerificationResponse | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Formulaire saisie manuelle
  const [showForm, setShowForm] = useState(false);

  // Upload
  const [showUpload, setShowUpload] = useState(false);

  // Loading states
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ========================================
  // CHARGEMENT
  // ========================================

  const loadEmacs = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { page, page_size: 20 };
      if (filterLabo !== 'all') params.laboratoire_id = Number(filterLabo);
      if (filterStatut !== 'all') params.statut = filterStatut;

      const result = await emacApi.list(params as never);
      setEmacs(result.emacs);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  }, [page, filterLabo, filterStatut]);

  useEffect(() => {
    loadEmacs();
  }, [loadEmacs]);

  useEffect(() => {
    laboratoiresApi.list().then(setLabos).catch(() => {});
  }, []);

  // ========================================
  // ACTIONS
  // ========================================

  const handleViewDetail = async (emac: EMACResponse) => {
    setSelectedEmac(emac);
    setShowDetail(true);
    try {
      const tri = await emacApi.getTriangle(emac.id);
      setTriangle(tri);
    } catch {
      setTriangle(null);
    }
  };

  const handleVerify = async (emacId: number) => {
    try {
      setVerifying(true);
      const tri = await emacApi.verify(emacId);
      setTriangle(tri);
      toast.success('Verification terminee');
      loadEmacs();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur'));
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(deleteTargetId);
      await emacApi.delete(deleteTargetId);
      toast.success('EMAC supprime');
      setShowDeleteDialog(false);
      if (showDetail && selectedEmac?.id === deleteTargetId) {
        setShowDetail(false);
        setSelectedEmac(null);
      }
      setDeleteTargetId(null);
      loadEmacs();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur'));
    } finally {
      setDeleting(null);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="EMAC"
        description="Etats Mensuels des Avantages Commerciaux"
        icon={<ClipboardList className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Importer
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Saisie manuelle
            </Button>
          </>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterLabo} onValueChange={(v) => { setFilterLabo(v); setPage(1); }}>
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

        <Select value={filterStatut} onValueChange={(v) => { setFilterStatut(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="non_verifie">Non verifie</SelectItem>
            <SelectItem value="conforme">Conforme</SelectItem>
            <SelectItem value="ecart_detecte">Ecart detecte</SelectItem>
            <SelectItem value="anomalie">Anomalie</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => loadEmacs()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Laboratoire</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">CA declare</TableHead>
                <TableHead className="text-right">Total avantages</TableHead>
                <TableHead className="text-right">Solde</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Anomalies</TableHead>
                <TableHead className="text-right">Recouvrable</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : emacs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    Aucun EMAC trouve. Importez ou saisissez un EMAC.
                  </TableCell>
                </TableRow>
              ) : (
                emacs.map(emac => {
                  const laboNom = emac.laboratoire?.nom || labos.find(l => l.id === emac.laboratoire_id)?.nom || `Labo #${emac.laboratoire_id}`;
                  return (
                    <TableRow key={emac.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => handleViewDetail(emac)}>
                      <TableCell className="font-medium">{formatPeriode(emac.periode_debut, emac.periode_fin)}</TableCell>
                      <TableCell>{laboNom}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{emac.reference || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(emac.ca_declare)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(emac.total_avantages_declares)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {emac.solde_a_percevoir > 0 ? (
                          <span className="text-amber-600 font-semibold">{formatCurrency(emac.solde_a_percevoir)}</span>
                        ) : (
                          formatCurrency(emac.solde_a_percevoir)
                        )}
                      </TableCell>
                      <TableCell>{getStatutBadge(emac.statut_verification as StatutVerificationEMAC)}</TableCell>
                      <TableCell className="text-right">
                        {emac.nb_anomalies > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            {emac.nb_anomalies}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {emac.montant_recouvrable > 0 ? (
                          <span className="text-green-600 font-semibold">{formatCurrency(emac.montant_recouvrable)}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetail(emac)} title="Detail">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTargetId(emac.id);
                              setShowDeleteDialog(true);
                            }}
                            disabled={deleting === emac.id}
                            title="Supprimer"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            Page {page} / {totalPages} ({total} resultats)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal Detail + Triangle */}
      {showDetail && selectedEmac && (
        <EMACDetailModal
          emac={selectedEmac}
          triangle={triangle}
          labos={labos}
          onClose={() => { setShowDetail(false); setSelectedEmac(null); setTriangle(null); }}
          onVerify={() => handleVerify(selectedEmac.id)}
          verifying={verifying}
        />
      )}

      {/* Modal Saisie Manuelle */}
      {showForm && (
        <EMACFormModal
          labos={labos}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); loadEmacs(); }}
        />
      )}

      {/* Modal Upload */}
      {showUpload && (
        <EMACUploadModal
          labos={labos}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); loadEmacs(); }}
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
        title="Supprimer cet EMAC ?"
        description="Les verifications et anomalies associees seront egalement supprimees."
        itemName={
          deleteTargetId
            ? `EMAC ${emacs.find((e) => e.id === deleteTargetId)?.reference || formatPeriode(
                emacs.find((e) => e.id === deleteTargetId)?.periode_debut || '',
                emacs.find((e) => e.id === deleteTargetId)?.periode_fin || ''
              )}`
            : undefined
        }
        loading={deleting !== null}
      />
    </div>
  );
}

// ========================================
// MODAL DETAIL + TRIANGLE
// ========================================

function EMACDetailModal({
  emac,
  triangle,
  labos,
  onClose,
  onVerify,
  verifying,
}: {
  emac: EMACResponse;
  triangle: TriangleVerificationResponse | null;
  labos: LaboratoireResponse[];
  onClose: () => void;
  onVerify: () => void;
  verifying: boolean;
}) {
  const laboNom = emac.laboratoire?.nom || labos.find(l => l.id === emac.laboratoire_id)?.nom || 'Inconnu';

  // Anomalies pour le composant enrichi
  const anomalies = triangle?.anomalies || emac.anomalies_emac || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 sm:rounded-xl rounded-none shadow-xl w-full max-w-4xl sm:my-8 my-0 min-h-[100dvh] sm:min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              EMAC - {laboNom}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatPeriode(emac.periode_debut, emac.periode_fin)}
              {emac.reference && ` | Ref: ${emac.reference}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatutBadge(emac.statut_verification as StatutVerificationEMAC)}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  toast.info('Generation du PDF EMAC...');
                  await rapportsApi.downloadEmacReport(emac.id);
                  toast.success('PDF EMAC telecharge');
                } catch (err: unknown) {
                  toast.error(getErrorMessage(err, 'Erreur'));
                }
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onVerify} disabled={verifying}>
              <RefreshCw className={`h-4 w-4 mr-1 ${verifying ? 'animate-spin' : ''}`} />
              Re-verifier
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Resume montants */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MontantCard label="CA declare" value={emac.ca_declare} />
            <MontantCard label="Total avantages" value={emac.total_avantages_declares} />
            <MontantCard label="Deja verse" value={emac.montant_deja_verse} />
            <MontantCard
              label="Solde a percevoir"
              value={emac.solde_a_percevoir}
              highlight={emac.solde_a_percevoir > 0}
              highlightColor="amber"
            />
          </div>

          {/* Triangle de verification enrichi */}
          {triangle && (
            <EMACComparisonEnhanced
              triangle={triangle}
              emac={emac}
              anomalies={anomalies}
            />
          )}

          {/* Notes */}
          {emac.notes && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
              <strong>Notes :</strong> {emac.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// SUB-COMPONENTS
// ========================================

function MontantCard({ label, value, highlight, highlightColor }: {
  label: string;
  value: number;
  highlight?: boolean;
  highlightColor?: string;
}) {
  const colorClass = highlight
    ? highlightColor === 'green' ? 'text-green-600' : 'text-amber-600'
    : 'text-gray-900 dark:text-white';
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-lg font-bold font-mono ${colorClass}`}>{formatCurrency(value)}</p>
    </div>
  );
}


// ========================================
// MODAL SAISIE MANUELLE
// ========================================

function EMACFormModal({
  labos,
  onClose,
  onSuccess,
}: {
  labos: LaboratoireResponse[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EMACCreateManuel>({
    laboratoire_id: labos[0]?.id || 0,
    reference: '',
    periode_debut: new Date().toISOString().slice(0, 7) + '-01',
    periode_fin: '',
    type_periode: 'mensuel',
    ca_declare: 0,
    rfa_declaree: 0,
    cop_declaree: 0,
    remises_differees_declarees: 0,
    autres_avantages: 0,
    montant_deja_verse: 0,
    mode_reglement: '',
    notes: '',
  });

  // Auto-calcul de la fin de periode
  useEffect(() => {
    if (form.periode_debut) {
      const d = new Date(form.periode_debut);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setForm(f => ({ ...f, periode_fin: lastDay.toISOString().slice(0, 10) }));
    }
  }, [form.periode_debut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.laboratoire_id) {
      toast.error('Selectionnez un laboratoire');
      return;
    }
    try {
      setSaving(true);
      await emacApi.createManual(form);
      toast.success('EMAC cree avec succes');
      onSuccess();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: unknown) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Saisie manuelle EMAC</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Laboratoire + Periode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Laboratoire</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={form.laboratoire_id}
                onChange={e => updateField('laboratoire_id', Number(e.target.value))}
              >
                {labos.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={form.reference || ''}
                onChange={e => updateField('reference', e.target.value)}
                placeholder="EMAC-2026-01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Debut de periode</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={form.periode_debut}
                onChange={e => updateField('periode_debut', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fin de periode</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={form.periode_fin}
                onChange={e => updateField('periode_fin', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Montants declares */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Montants declares</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="CA declare" value={form.ca_declare || 0} onChange={v => updateField('ca_declare', v)} />
              <NumberField label="RFA declaree" value={form.rfa_declaree || 0} onChange={v => updateField('rfa_declaree', v)} />
              <NumberField label="COP declaree" value={form.cop_declaree || 0} onChange={v => updateField('cop_declaree', v)} />
              <NumberField label="Remises differees" value={form.remises_differees_declarees || 0} onChange={v => updateField('remises_differees_declarees', v)} />
              <NumberField label="Autres avantages" value={form.autres_avantages || 0} onChange={v => updateField('autres_avantages', v)} />
              <NumberField label="Montant deja verse" value={form.montant_deja_verse || 0} onChange={v => updateField('montant_deja_verse', v)} />
            </div>
          </div>

          {/* Mode reglement + Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode de reglement</label>
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={form.mode_reglement || ''}
                onChange={e => updateField('mode_reglement', e.target.value)}
              >
                <option value="">Non specifie</option>
                <option value="virement">Virement</option>
                <option value="avoir">Avoir</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={form.notes || ''}
                onChange={e => updateField('notes', e.target.value)}
                placeholder="Notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        step="0.01"
        min="0"
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono"
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

// ========================================
// MODAL UPLOAD
// ========================================

function EMACUploadModal({
  labos,
  onClose,
  onSuccess,
}: {
  labos: LaboratoireResponse[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [laboId, setLaboId] = useState(labos[0]?.id || 0);
  const [periodeDebut, setPeriodeDebut] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [periodeFin, setPeriodeFin] = useState('');

  useEffect(() => {
    if (periodeDebut) {
      const d = new Date(periodeDebut);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setPeriodeFin(lastDay.toISOString().slice(0, 10));
    }
  }, [periodeDebut]);

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selectionnez un fichier');
      return;
    }
    try {
      setUploading(true);
      const result = await emacApi.upload(file, laboId, periodeDebut, periodeFin);
      if (result.success) {
        toast.success(result.message);
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach(w => toast.warning(w));
        }
        onSuccess();
      } else {
        toast.error(result.message);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur upload'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 sm:rounded-xl rounded-none shadow-xl w-full max-w-lg max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            Importer un EMAC
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Laboratoire</label>
            <select
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              value={laboId}
              onChange={e => setLaboId(Number(e.target.value))}
            >
              {labos.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Debut</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={periodeDebut}
                onChange={e => setPeriodeDebut(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fin</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={periodeFin}
                onChange={e => setPeriodeFin(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fichier (Excel / CSV)</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="emac-file-input"
              />
              <label htmlFor="emac-file-input" className="cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {file ? file.name : 'Cliquez ou glissez un fichier'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Formats : .xlsx, .xls, .csv</p>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? 'Import en cours...' : 'Importer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
