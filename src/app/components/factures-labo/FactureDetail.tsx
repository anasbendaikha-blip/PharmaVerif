/**
 * PharmaVerif - Modal détail facture labo
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Modal composant le détail complet d'une facture labo :
 *  - Header avec actions (PDF, réclamation, re-vérification)
 *  - Résumé financier
 *  - Analyse par tranche
 *  - Détail TVA
 *  - Dashboard anomalies
 *  - Progression RFA
 *  - Tableau des lignes
 *  - Réconciliation RFA
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, CheckCircle2, Download, FileWarning } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { facturesLaboApi } from '../../api/facturesLabo';
import { rapportsApi } from '../../api/rapportsApi';
import { getErrorMessage } from '../../api/httpClient';
import { formatDateShortFR } from '../../utils/formatNumber';
import { verifyLigne, computeTvaBreakdown } from './verification';
import { StatutBadgeLabo } from './StatutBadgeLabo';
import { FinancialSummary, AnalyseTrancheSection } from './AnalyseTrancheSection';
import { TvaBreakdownTable } from './TvaBreakdownTable';
import { AnomaliesDashboard } from './AnomaliesDashboard';
import { RfaProgressionBar } from './RfaProgressionBar';
import { LignesDetailTable } from './LignesDetailTable';
import { RfaReconciliationForm } from './RfaReconciliationForm';
import { RebateScheduleWidget } from '../Verification/RebateScheduleWidget';
import type {
  FactureLaboResponse,
  LigneFactureLaboResponse,
  AnalyseRemiseResponse,
  AnomalieFactureLaboResponse,
  RFAProgressionResponse,
} from '../../api/types';

interface FactureDetailProps {
  facture: FactureLaboResponse;
  onClose: () => void;
  onRefresh: () => void;
}

export function FactureDetail({ facture, onClose, onRefresh }: FactureDetailProps) {
  const [analyse, setAnalyse] = useState<AnalyseRemiseResponse | null>(null);
  const [lignes, setLignes] = useState<LigneFactureLaboResponse[]>([]);
  const [isLoadingAnalyse, setIsLoadingAnalyse] = useState(true);
  const [isLoadingLignes, setIsLoadingLignes] = useState(true);
  const [anomalies, setAnomalies] = useState<AnomalieFactureLaboResponse[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [rfaProgression, setRfaProgression] = useState<RFAProgressionResponse | null>(null);

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
  const anomalyCount = useMemo(() => verifications.filter((v) => !v.isOk).length, [verifications]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 sm:rounded-2xl rounded-none shadow-2xl w-full max-w-6xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold dark:text-white">
              Facture {facture.numero_facture}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDateShortFR(facture.date_facture)} • {facture.nb_lignes} lignes • {facture.nb_pages}{' '}
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
                  toast.error(getErrorMessage(err, 'Erreur'));
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
                    toast.error(getErrorMessage(err, 'Erreur'));
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
            <StatutBadgeLabo statut={facture.statut} />
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Résumé financier */}
        <FinancialSummary facture={facture} recalcTotals={recalcTotals} />

        {/* Analyse par tranches */}
        <AnalyseTrancheSection analyse={analyse} isLoading={isLoadingAnalyse} />

        {/* Détail TVA */}
        <TvaBreakdownTable tvaBreakdown={tvaBreakdown} totalLignes={lignes.length} />

        {/* Dashboard Anomalies */}
        <AnomaliesDashboard
          anomalies={anomalies}
          isLoadingAnalyse={isLoadingAnalyse}
          onResolveAnomalie={handleResolveAnomalie}
        />

        {/* Progression RFA */}
        {rfaProgression && <RfaProgressionBar rfaProgression={rfaProgression} />}

        {/* Calendrier des remises echelonnees (Rebate Engine) */}
        <div className="px-6 pb-4">
          <RebateScheduleWidget
            factureLaboId={facture.id}
            montantHt={facture.montant_brut_ht}
            laboratoireNom={facture.laboratoire?.nom}
          />
        </div>

        {/* Tableau détaillé des lignes */}
        <LignesDetailTable
          lignes={lignes}
          verifications={verifications}
          anomalyCount={anomalyCount}
          recalcTotals={recalcTotals}
          isLoading={isLoadingLignes}
        />

        {/* Réconciliation RFA */}
        <RfaReconciliationForm facture={facture} onRefresh={onRefresh} />
      </div>
    </div>
  );
}
