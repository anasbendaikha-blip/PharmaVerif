/**
 * PharmaVerif - Page Factures Laboratoires
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Page dédiée à l'upload, l'analyse et la gestion des factures laboratoires.
 * Fonctionnalité API-only (nécessite le backend FastAPI).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  ChevronDown,
  ChevronUp,
  Info,
  Settings,
  Download,
  FileWarning,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { facturesLaboApi } from '../api/facturesLabo';
import { rapportsApi } from '../api/rapportsApi';
import { ConditionsCommercialesForm } from '../components/ConditionsCommercialesForm';
import type {
  FactureLaboResponse,
  LigneFactureLaboResponse,
  AnalyseRemiseResponse,
  UploadLaboResponse,
  AnomalieFactureLaboResponse,
  VerificationLaboResponse,
  RFAProgressionResponse,
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
    case 'verifiee':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
          <CheckCircle2 className="h-3 w-3" />
          Vérifiée
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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Facture analysée avec succès
              </div>
              {/* Badge fournisseur détecté */}
              {uploadResult.fournisseur && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  uploadResult.fournisseur.detecte_auto && uploadResult.fournisseur.confiance >= 0.5
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                }`}>
                  {uploadResult.fournisseur.detecte_auto && uploadResult.fournisseur.confiance >= 0.5 ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {uploadResult.fournisseur.detecte_auto
                    ? `${uploadResult.fournisseur.nom}`
                    : 'Parser générique'}
                </span>
              )}
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
// VÉRIFICATIONS LIGNE PAR LIGNE
// ========================================

interface LigneVerification {
  ligne: LigneFactureLaboResponse;
  anomalies: string[];
  isOk: boolean;
}

function verifyLigne(l: LigneFactureLaboResponse): LigneVerification {
  const anomalies: string[] = [];

  // 1. Vérifier PU × (1 - remise%) ≈ PU après remise (tolérance 0.01€)
  const expectedPuAr = l.prix_unitaire_ht * (1 - l.remise_pct / 100);
  if (Math.abs(expectedPuAr - l.prix_unitaire_apres_remise) > 0.02) {
    anomalies.push(
      `PU après remise: attendu ${expectedPuAr.toFixed(4)}€, affiché ${l.prix_unitaire_apres_remise.toFixed(4)}€`
    );
  }

  // 2. Vérifier PU après remise × Qté ≈ Montant HT (tolérance 0.02€)
  const expectedMontantHt = l.prix_unitaire_apres_remise * l.quantite;
  if (Math.abs(expectedMontantHt - l.montant_ht) > 0.02) {
    anomalies.push(
      `Montant HT: attendu ${expectedMontantHt.toFixed(2)}€, affiché ${l.montant_ht.toFixed(2)}€`
    );
  }

  // 3. Vérifier montant_brut = PU HT × Qté
  const expectedBrut = l.prix_unitaire_ht * l.quantite;
  if (Math.abs(expectedBrut - l.montant_brut) > 0.02) {
    anomalies.push(
      `Montant brut: attendu ${expectedBrut.toFixed(2)}€, calculé ${l.montant_brut.toFixed(2)}€`
    );
  }

  // 4. Vérifier cohérence TVA et tranche
  if (l.taux_tva === 2.1 && l.tranche === 'OTC') {
    anomalies.push(`TVA 2.10% classée OTC (devrait être A ou B)`);
  }
  if ((l.taux_tva === 5.5 || l.taux_tva === 10.0) && (l.tranche === 'A' || l.tranche === 'B')) {
    anomalies.push(`TVA ${l.taux_tva}% classée ${l.tranche} (devrait être OTC)`);
  }

  return {
    ligne: l,
    anomalies,
    isOk: anomalies.length === 0,
  };
}

interface TvaDetail {
  taux: number;
  nbLignes: number;
  baseHt: number;
  montantTva: number;
}

function computeTvaBreakdown(lignes: LigneFactureLaboResponse[]): TvaDetail[] {
  const map = new Map<number, { nbLignes: number; baseHt: number }>();
  for (const l of lignes) {
    const existing = map.get(l.taux_tva) || { nbLignes: 0, baseHt: 0 };
    existing.nbLignes += 1;
    existing.baseHt += l.montant_ht;
    map.set(l.taux_tva, existing);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([taux, data]) => ({
      taux,
      nbLignes: data.nbLignes,
      baseHt: data.baseHt,
      montantTva: data.baseHt * (taux / 100),
    }));
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
  const [lignes, setLignes] = useState<LigneFactureLaboResponse[]>([]);
  const [isLoadingAnalyse, setIsLoadingAnalyse] = useState(true);
  const [isLoadingLignes, setIsLoadingLignes] = useState(true);
  const [rfaInput, setRfaInput] = useState('');
  const [isUpdatingRfa, setIsUpdatingRfa] = useState(false);
  const [showLignes, setShowLignes] = useState(false);
  const [lignesFilter, setLignesFilter] = useState<string>('all');
  const [anomalies, setAnomalies] = useState<AnomalieFactureLaboResponse[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [rfaProgression, setRfaProgression] = useState<RFAProgressionResponse | null>(null);
  const [showAnomalies, setShowAnomalies] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [analyseData, lignesData, anomaliesData] = await Promise.all([
          facturesLaboApi.getAnalyse(facture.id),
          facturesLaboApi.getLignes(facture.id),
          facturesLaboApi.getAnomalies(facture.id),
        ]);
        setAnalyse(analyseData);
        setLignes(lignesData);
        setAnomalies(anomaliesData);

        // Charger la progression RFA si un labo est associe
        if (facture.laboratoire_id) {
          try {
            const progression = await facturesLaboApi.getRfaProgression(facture.laboratoire_id);
            setRfaProgression(progression);
          } catch {
            // Non bloquant
          }
        }
      } catch {
        toast.error("Erreur lors du chargement de l'analyse");
      } finally {
        setIsLoadingAnalyse(false);
        setIsLoadingLignes(false);
      }
    }
    loadData();
  }, [facture.id, facture.laboratoire_id]);

  // Vérifications ligne par ligne
  const verifications = useMemo(() => lignes.map(verifyLigne), [lignes]);

  const anomalyCount = useMemo(
    () => verifications.filter((v) => !v.isOk).length,
    [verifications]
  );

  // Totaux recalculés depuis les lignes
  const recalcTotals = useMemo(() => {
    if (lignes.length === 0) return null;
    const brut = lignes.reduce((s, l) => s + l.montant_brut, 0);
    const remise = lignes.reduce((s, l) => s + l.montant_remise, 0);
    const net = lignes.reduce((s, l) => s + l.montant_ht, 0);
    return { brut, remise, net };
  }, [lignes]);

  // TVA breakdown
  const tvaBreakdown = useMemo(() => computeTvaBreakdown(lignes), [lignes]);

  // Filtrage des lignes affichées
  const filteredVerifications = useMemo(() => {
    if (lignesFilter === 'all') return verifications;
    if (lignesFilter === 'anomalies') return verifications.filter((v) => !v.isOk);
    return verifications.filter((v) => v.ligne.tranche === lignesFilter);
  }, [verifications, lignesFilter]);

  // Groupement des anomalies par severite
  const anomalyGroups = useMemo(() => ({
    critical: anomalies.filter(a => a.severite === 'critical' && !a.resolu),
    opportunity: anomalies.filter(a => a.severite === 'opportunity' && !a.resolu),
    info: anomalies.filter(a => a.severite === 'info' && !a.resolu),
    resolved: anomalies.filter(a => a.resolu),
  }), [anomalies]);

  const totalAnomalies = anomalyGroups.critical.length + anomalyGroups.opportunity.length + anomalyGroups.info.length;

  // Labels et icones des types d'anomalies
  const getAnomalieTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      remise_ecart: 'Ecart de remise',
      escompte_manquant: 'Escompte non applique',
      franco_seuil: 'Franco de port',
      rfa_palier: 'Progression RFA',
      gratuite_manquante: 'Gratuite manquante',
      tva_incoherence: 'Incoherence TVA',
      calcul_arithmetique: 'Erreur arithmetique',
    };
    return labels[type] || type;
  };

  const getSeveriteColor = (severite: string) => {
    switch (severite) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'opportunity': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  const handleReVerify = async () => {
    setIsVerifying(true);
    try {
      const result = await facturesLaboApi.verify(facture.id);
      setAnomalies(result.anomalies);
      toast.success(result.message);
      onRefresh();
    } catch (err: unknown) {
      const httpErr = err as { message?: string };
      toast.error(httpErr.message || 'Erreur lors de la verification');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResolveAnomalie = async (anomalieId: number) => {
    try {
      await facturesLaboApi.resolveAnomalie(anomalieId, true, 'Resolu manuellement');
      setAnomalies(prev => prev.map(a =>
        a.id === anomalieId ? { ...a, resolu: true, resolu_at: new Date().toISOString() } : a
      ));
      toast.success('Anomalie marquee comme resolue');
    } catch {
      toast.error('Erreur lors de la resolution');
    }
  };

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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold dark:text-white">
              Facture {facture.numero_facture}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(facture.date_facture)} • {facture.nb_lignes} lignes • {facture.nb_pages}{' '}
              pages
              {anomalyCount > 0 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                  • {anomalyCount} anomalie{anomalyCount > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  toast.info('Generation du PDF...');
                  await rapportsApi.downloadFactureVerification(facture.id);
                  toast.success('PDF telecharge');
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Erreur';
                  toast.error(msg);
                }
              }}
              className="text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              PDF
            </Button>
            {anomalies.filter(a => !a.resolu).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    toast.info('Generation de la reclamation...');
                    await rapportsApi.downloadReclamation({
                      laboratoire_id: facture.laboratoire_id,
                      facture_ids: [facture.id],
                    });
                    toast.success('Reclamation PDF telecharge');
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Erreur';
                    toast.error(msg);
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700 border-red-200"
              >
                <FileWarning className="h-3.5 w-3.5 mr-1" />
                Reclamer
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReVerify}
              disabled={isVerifying}
              className="text-xs"
            >
              {isVerifying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              )}
              Re-verifier
            </Button>
            {getStatutBadge(facture.statut)}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Résumé financier — avec comparaison lignes */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Montant brut HT</p>
            <p className="text-lg font-bold dark:text-white">
              {formatCurrency(facture.montant_brut_ht)}
            </p>
            {recalcTotals && Math.abs(recalcTotals.brut - facture.montant_brut_ht) > 0.05 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5" title="Somme recalculée depuis les lignes">
                Lignes : {formatCurrency(recalcTotals.brut)}
              </p>
            )}
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total remises</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(facture.total_remise_facture)}
            </p>
            {recalcTotals && Math.abs(recalcTotals.remise - facture.total_remise_facture) > 0.05 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5" title="Somme recalculée depuis les lignes">
                Lignes : {formatCurrency(recalcTotals.remise)}
              </p>
            )}
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Net HT</p>
            <p className="text-lg font-bold dark:text-white">
              {formatCurrency(facture.montant_net_ht)}
            </p>
            {recalcTotals && Math.abs(recalcTotals.net - facture.montant_net_ht) > 0.05 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5" title="Somme recalculée depuis les lignes">
                Lignes : {formatCurrency(recalcTotals.net)}
              </p>
            )}
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
                    <span className="font-semibold text-gray-700 dark:text-gray-300 w-16">
                      {t.tranche === 'A' ? 'Tranche A' : t.tranche === 'B' ? 'Tranche B' : 'OTC'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {t.nb_lignes} lignes • {formatPercent(t.pct_ca)} du CA
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-gray-400">Brut</p>
                      <p className="font-medium dark:text-white">{formatCurrency(t.montant_brut)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Remise</p>
                      <p className="font-medium dark:text-white">{formatCurrency(t.montant_remise)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Taux réel</p>
                      <p className={`font-medium ${
                        Math.abs(t.ecart_taux) > 2
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {formatPercent(t.taux_remise_reel)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Cible</p>
                      <p className="font-medium text-gray-500 dark:text-gray-400">
                        {formatPercent(t.taux_remise_cible)}
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
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="dark:text-white">
                      {formatCurrency(analyse.montant_brut_total)}
                    </p>
                  </div>
                  <div>
                    <p className="dark:text-white">
                      {formatCurrency(analyse.montant_remise_total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-orange-600 dark:text-orange-400">
                      {formatPercent(analyse.taux_remise_global)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">—</p>
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

        {/* Détail TVA */}
        {tvaBreakdown.length > 0 && (
          <div className="px-6 pb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Détail TVA
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Taux TVA</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Lignes</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Base HT</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Montant TVA</th>
                  </tr>
                </thead>
                <tbody>
                  {tvaBreakdown.map((tv) => (
                    <tr key={tv.taux} className="border-b dark:border-gray-700/50">
                      <td className="py-2 px-3 font-medium dark:text-white">{tv.taux.toFixed(2)} %</td>
                      <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">{tv.nbLignes}</td>
                      <td className="py-2 px-3 text-right dark:text-white">{formatCurrency(tv.baseHt)}</td>
                      <td className="py-2 px-3 text-right dark:text-white">{formatCurrency(tv.montantTva)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-gray-50 dark:bg-gray-700/30">
                    <td className="py-2 px-3 dark:text-white">Total</td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">{lignes.length}</td>
                    <td className="py-2 px-3 text-right dark:text-white">
                      {formatCurrency(tvaBreakdown.reduce((s, t) => s + t.baseHt, 0))}
                    </td>
                    <td className="py-2 px-3 text-right dark:text-white">
                      {formatCurrency(tvaBreakdown.reduce((s, t) => s + t.montantTva, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dashboard Anomalies */}
        {anomalies.length > 0 && (
          <div className="px-6 pb-4">
            <button
              onClick={() => setShowAnomalies(!showAnomalies)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Verification ({totalAnomalies} anomalie{totalAnomalies > 1 ? 's' : ''})
                {anomalyGroups.critical.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    {anomalyGroups.critical.length} critique{anomalyGroups.critical.length > 1 ? 's' : ''}
                  </span>
                )}
                {anomalyGroups.opportunity.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {anomalyGroups.opportunity.length} opportunite{anomalyGroups.opportunity.length > 1 ? 's' : ''}
                  </span>
                )}
              </span>
              {showAnomalies ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAnomalies && (
              <div className="mt-3 space-y-4">
                {/* Critical */}
                {anomalyGroups.critical.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      CRITIQUE ({anomalyGroups.critical.length})
                    </h4>
                    <div className="space-y-2">
                      {anomalyGroups.critical.map((a) => (
                        <div key={a.id} className={`p-3 rounded-lg border text-sm ${getSeveriteColor('critical')}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs mb-0.5">{getAnomalieTypeLabel(a.type_anomalie)}</p>
                              <p className="text-xs opacity-90">{a.description}</p>
                              {a.montant_ecart > 0 && (
                                <p className="text-xs font-bold mt-1">Impact : {formatCurrency(a.montant_ecart)}</p>
                              )}
                              {a.action_suggeree && (
                                <p className="text-[10px] mt-1 opacity-75 italic">{a.action_suggeree}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleResolveAnomalie(a.id)}
                              className="flex-shrink-0 text-[10px] px-2 py-1 rounded bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
                              title="Marquer comme resolu"
                            >
                              Resolu
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opportunities */}
                {anomalyGroups.opportunity.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                      <Euro className="h-3.5 w-3.5" />
                      OPPORTUNITES ({anomalyGroups.opportunity.length})
                    </h4>
                    <div className="space-y-2">
                      {anomalyGroups.opportunity.map((a) => (
                        <div key={a.id} className={`p-3 rounded-lg border text-sm ${getSeveriteColor('opportunity')}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs mb-0.5">{getAnomalieTypeLabel(a.type_anomalie)}</p>
                              <p className="text-xs opacity-90">{a.description}</p>
                              {a.montant_ecart > 0 && (
                                <p className="text-xs font-bold mt-1">Economie potentielle : {formatCurrency(a.montant_ecart)}</p>
                              )}
                              {a.action_suggeree && (
                                <p className="text-[10px] mt-1 opacity-75 italic">{a.action_suggeree}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleResolveAnomalie(a.id)}
                              className="flex-shrink-0 text-[10px] px-2 py-1 rounded bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
                              title="Marquer comme resolu"
                            >
                              Resolu
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info */}
                {anomalyGroups.info.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      INFORMATIONS ({anomalyGroups.info.length})
                    </h4>
                    <div className="space-y-2">
                      {anomalyGroups.info.map((a) => (
                        <div key={a.id} className={`p-3 rounded-lg border text-sm ${getSeveriteColor('info')}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs mb-0.5">{getAnomalieTypeLabel(a.type_anomalie)}</p>
                            <p className="text-xs opacity-90">{a.description}</p>
                            {a.action_suggeree && (
                              <p className="text-[10px] mt-1 opacity-75 italic">{a.action_suggeree}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conformes summary */}
                {totalAnomalies === 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Toutes les verifications sont conformes</span>
                    </div>
                  </div>
                )}

                {/* Resolved count */}
                {anomalyGroups.resolved.length > 0 && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {anomalyGroups.resolved.length} anomalie{anomalyGroups.resolved.length > 1 ? 's' : ''} resolue{anomalyGroups.resolved.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Conformes banner quand pas d'anomalies */}
        {anomalies.length === 0 && !isLoadingAnalyse && (
          <div className="px-6 pb-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Verification conforme — aucune anomalie detectee</span>
              </div>
            </div>
          </div>
        )}

        {/* Progression RFA */}
        {rfaProgression && rfaProgression.palier_suivant && (
          <div className="px-6 pb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Progression RFA {rfaProgression.annee}
            </h3>
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Cumul achats : <strong className="text-gray-900 dark:text-white">{formatCurrency(rfaProgression.cumul_achats_ht)}</strong>
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  RFA estimee : <strong className="text-blue-600 dark:text-blue-400">{formatCurrency(rfaProgression.rfa_estimee_annuelle)}</strong>
                  {' '}({rfaProgression.taux_rfa_actuel.toFixed(1)}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, rfaProgression.progression_pct)}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                  {rfaProgression.progression_pct.toFixed(0)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  Palier actuel : {rfaProgression.palier_actuel
                    ? `${rfaProgression.palier_actuel.description || rfaProgression.palier_actuel.taux_rfa + '%'}`
                    : 'Aucun'}
                </span>
                <span>
                  Prochain : {rfaProgression.palier_suivant.description || rfaProgression.palier_suivant.taux_rfa + '%'}
                  {' '}(reste {formatCurrency(rfaProgression.montant_restant_prochain_palier || 0)})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tableau détaillé des lignes */}
        <div className="px-6 pb-4">
          <button
            onClick={() => setShowLignes(!showLignes)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Détail des lignes ({lignes.length})
              {anomalyCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  {anomalyCount} anomalie{anomalyCount > 1 ? 's' : ''}
                </span>
              )}
            </span>
            {showLignes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showLignes && (
            <div className="mt-3">
              {/* Filtres */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {['all', 'A', 'B', 'OTC', 'anomalies'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLignesFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      lignesFilter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {f === 'all'
                      ? `Toutes (${lignes.length})`
                      : f === 'anomalies'
                        ? `Anomalies (${anomalyCount})`
                        : f === 'A'
                          ? `Tranche A (${lignes.filter((l) => l.tranche === 'A').length})`
                          : f === 'B'
                            ? `Tranche B (${lignes.filter((l) => l.tranche === 'B').length})`
                            : `OTC (${lignes.filter((l) => l.tranche === 'OTC').length})`}
                  </button>
                ))}
              </div>

              {isLoadingLignes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                        <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">CIP13</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Désignation</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Qté</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">PU HT</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Rem %</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">PU apr. rem.</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Mt HT</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">TVA</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Tranche</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVerifications.map((v, idx) => (
                        <tr
                          key={v.ligne.id}
                          className={`border-b dark:border-gray-700/50 ${
                            !v.isOk
                              ? 'bg-amber-50 dark:bg-amber-900/10'
                              : idx % 2 === 0
                                ? 'bg-white dark:bg-gray-800'
                                : 'bg-gray-50/50 dark:bg-gray-800/50'
                          }`}
                          title={v.anomalies.length > 0 ? v.anomalies.join('\n') : 'OK'}
                        >
                          <td className="py-1.5 px-2 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {v.ligne.cip13}
                          </td>
                          <td className="py-1.5 px-2 dark:text-white max-w-[200px] truncate" title={v.ligne.designation}>
                            {v.ligne.designation}
                          </td>
                          <td className="py-1.5 px-2 text-center dark:text-white">{v.ligne.quantite}</td>
                          <td className="py-1.5 px-2 text-right dark:text-white">{v.ligne.prix_unitaire_ht.toFixed(2)}</td>
                          <td className="py-1.5 px-2 text-right font-medium">
                            <span className={
                              v.ligne.remise_pct > 2.5
                                ? 'text-green-600 dark:text-green-400'
                                : v.ligne.remise_pct > 0
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-gray-400'
                            }>
                              {v.ligne.remise_pct.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right dark:text-white">{v.ligne.prix_unitaire_apres_remise.toFixed(4)}</td>
                          <td className="py-1.5 px-2 text-right font-medium dark:text-white">{v.ligne.montant_ht.toFixed(2)}</td>
                          <td className="py-1.5 px-2 text-center text-gray-600 dark:text-gray-400">{v.ligne.taux_tva.toFixed(2)}%</td>
                          <td className="py-1.5 px-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              v.ligne.tranche === 'A'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : v.ligne.tranche === 'B'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                              {v.ligne.tranche}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {v.isOk ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto" />
                            ) : (
                              <div className="group relative">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mx-auto cursor-help" />
                                <div className="absolute bottom-full right-0 mb-1 w-64 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                                  {v.anomalies.map((a, i) => (
                                    <p key={i} className="mb-0.5">• {a}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totaux des lignes */}
                    {filteredVerifications.length > 0 && lignesFilter === 'all' && recalcTotals && (
                      <tfoot>
                        <tr className="bg-gray-100 dark:bg-gray-700 font-semibold text-xs">
                          <td className="py-2 px-2 dark:text-white" colSpan={2}>
                            Total ({lignes.length} lignes)
                          </td>
                          <td className="py-2 px-2 text-center dark:text-white">
                            {lignes.reduce((s, l) => s + l.quantite, 0)}
                          </td>
                          <td className="py-2 px-2" colSpan={2}></td>
                          <td className="py-2 px-2 text-right dark:text-white">
                            Brut : {formatCurrency(recalcTotals.brut)}
                          </td>
                          <td className="py-2 px-2 text-right dark:text-white">
                            {formatCurrency(recalcTotals.net)}
                          </td>
                          <td className="py-2 px-2" colSpan={3}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
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
  const [showConditions, setShowConditions] = useState(false);

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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FlaskConical className="h-8 w-8 text-purple-600" />
            Factures Laboratoires
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Upload, analyse et reconciliation RFA des factures Biogaran
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
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
        </div>
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
                          {formatDate(f.date_facture)}
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
                          {f.anomalies_labo && f.anomalies_labo.length > 0 ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              f.anomalies_labo.some(a => a.severite === 'critical' && !a.resolu)
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : f.anomalies_labo.some(a => a.severite === 'opportunity' && !a.resolu)
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                              {f.anomalies_labo.filter(a => !a.resolu).length}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              0
                            </span>
                          )}
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

      {/* Modal conditions commerciales */}
      {showConditions && (
        <ConditionsCommercialesForm
          laboratoireId={1}
          onClose={() => setShowConditions(false)}
          onSaved={() => loadFactures()}
        />
      )}
    </div>
  );
}
