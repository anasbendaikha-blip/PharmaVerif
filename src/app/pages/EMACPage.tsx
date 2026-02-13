/**
 * PharmaVerif - Page EMAC (Etats Mensuels des Avantages Commerciaux)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Page complete : liste paginee, detail avec triangle de verification,
 * formulaire de saisie manuelle, upload Excel/CSV.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  Info,
  ChevronLeft,
  ChevronRight,
  X,
  TriangleAlert,
  FileSpreadsheet,
  Check,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { emacApi } from '../api/emacApi';
import { rapportsApi } from '../api/rapportsApi';
import { laboratoiresApi } from '../api/laboratoiresApi';
import type {
  EMACResponse,
  LaboratoireResponse,
  TriangleVerificationResponse,
  TriangleVerificationItem,
  AnomalieEMACResponse,
  EMACCreateManuel,
  StatutVerificationEMAC,
} from '../api/types';

// ========================================
// HELPERS
// ========================================

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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

function getSeveriteIcon(severite: string) {
  switch (severite) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
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
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      toast.error(message);
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
      const message = err instanceof Error ? err.message : 'Erreur';
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cet EMAC ?')) return;
    try {
      setDeleting(id);
      await emacApi.delete(id);
      toast.success('EMAC supprime');
      if (showDetail && selectedEmac?.id === id) {
        setShowDetail(false);
        setSelectedEmac(null);
      }
      loadEmacs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur';
      toast.error(message);
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
                            onClick={() => handleDelete(emac.id)}
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

  // Grouper anomalies
  const anomalies = triangle?.anomalies || emac.anomalies_emac || [];
  const grouped = useMemo(() => ({
    critical: anomalies.filter(a => a.severite === 'critical'),
    warning: anomalies.filter(a => a.severite === 'warning'),
    info: anomalies.filter(a => a.severite === 'info'),
  }), [anomalies]);

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
                  const msg = err instanceof Error ? err.message : 'Erreur';
                  toast.error(msg);
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

          {/* Triangle de verification */}
          {triangle && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TriangleAlert className="h-5 w-5 text-purple-600" />
                  Triangle de verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Element</TableHead>
                      <TableHead className="text-right">EMAC (declare)</TableHead>
                      <TableHead className="text-right">Factures (reel)</TableHead>
                      <TableHead className="text-right">Conditions (attendu)</TableHead>
                      <TableHead className="text-right">Ecart</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {triangle.lignes.map((ligne, i) => (
                      <TriangleLigne key={i} ligne={ligne} />
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      {triangle.nb_conformes} conforme(s)
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {triangle.nb_ecarts} ecart(s)
                    </span>
                  </div>
                  {triangle.montant_recouvrable > 0 && (
                    <div className="text-sm font-semibold text-green-600">
                      Montant recouvrable : {formatCurrency(triangle.montant_recouvrable)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anomalies */}
          {anomalies.length > 0 && (
            <div className="space-y-4">
              {/* Critical */}
              {grouped.critical.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Anomalies critiques ({grouped.critical.length})
                  </h3>
                  <div className="space-y-2">
                    {grouped.critical.map(a => <AnomalieCard key={a.id} anomalie={a} />)}
                  </div>
                </div>
              )}

              {/* Warning */}
              {grouped.warning.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Alertes ({grouped.warning.length})
                  </h3>
                  <div className="space-y-2">
                    {grouped.warning.map(a => <AnomalieCard key={a.id} anomalie={a} />)}
                  </div>
                </div>
              )}

              {/* Info */}
              {grouped.info.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    Informations ({grouped.info.length})
                  </h3>
                  <div className="space-y-2">
                    {grouped.info.map(a => <AnomalieCard key={a.id} anomalie={a} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detail avantages */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniCard label="RFA" value={emac.rfa_declaree} />
            <MiniCard label="COP" value={emac.cop_declaree} />
            <MiniCard label="Remises diff." value={emac.remises_differees_declarees} />
            <MiniCard label="Autres" value={emac.autres_avantages} />
            <MiniCard label="Factures matchees" value={emac.nb_factures_matched} isCurrency={false} />
          </div>

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

function MiniCard({ label, value, isCurrency = true }: {
  label: string;
  value: number;
  isCurrency?: boolean;
}) {
  return (
    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold font-mono">
        {isCurrency ? formatCurrency(value) : value}
      </p>
    </div>
  );
}

function TriangleLigne({ ligne }: { ligne: TriangleVerificationItem }) {
  const isTotal = ligne.label === 'TOTAL AVANTAGES';
  const ecart = ligne.ecart_emac_factures || ligne.ecart_emac_conditions;
  return (
    <TableRow className={isTotal ? 'font-bold bg-gray-50 dark:bg-gray-800' : ''}>
      <TableCell className={isTotal ? 'font-bold' : ''}>{ligne.label}</TableCell>
      <TableCell className="text-right font-mono">{formatCurrency(ligne.valeur_emac)}</TableCell>
      <TableCell className="text-right font-mono">
        {ligne.valeur_factures !== null ? formatCurrency(ligne.valeur_factures) : '-'}
      </TableCell>
      <TableCell className="text-right font-mono">
        {ligne.valeur_conditions !== null ? formatCurrency(ligne.valeur_conditions) : '-'}
      </TableCell>
      <TableCell className="text-right font-mono">
        {ecart !== null && ecart !== undefined ? (
          <span className={Math.abs(ecart) > 1 ? 'text-red-600 font-semibold' : ''}>
            {ecart > 0 ? '+' : ''}{formatCurrency(ecart)}
            {ligne.ecart_pct !== null && ` (${ligne.ecart_pct}%)`}
          </span>
        ) : '-'}
      </TableCell>
      <TableCell className="text-center">
        {ligne.conforme ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
        )}
      </TableCell>
    </TableRow>
  );
}

function AnomalieCard({ anomalie }: { anomalie: AnomalieEMACResponse }) {
  return (
    <div className={`p-3 rounded-lg border ${
      anomalie.severite === 'critical'
        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
        : anomalie.severite === 'warning'
        ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
        : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
    }`}>
      <div className="flex items-start gap-2">
        {getSeveriteIcon(anomalie.severite)}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {anomalie.description}
          </p>
          {anomalie.montant_ecart > 0 && (
            <p className="text-xs font-mono mt-1 text-gray-600 dark:text-gray-400">
              Ecart : {formatCurrency(anomalie.montant_ecart)}
            </p>
          )}
          {anomalie.action_suggeree && (
            <p className="text-xs mt-1 text-gray-500 dark:text-gray-500 italic">
              {anomalie.action_suggeree}
            </p>
          )}
        </div>
        {anomalie.resolu && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
            <Check className="h-3 w-3" /> Resolu
          </span>
        )}
      </div>
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
      const message = err instanceof Error ? err.message : 'Erreur';
      toast.error(message);
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
      const message = err instanceof Error ? err.message : 'Erreur upload';
      toast.error(message);
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
