/**
 * PharmaVerif - Widget Calendrier Remises (Rebate Schedule)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Widget integre dans la vue detail d'une facture laboratoire.
 * Affiche le calendrier des remises echelonnees :
 *  - Ventilation par tranche A/B
 *  - Progression des conditions
 *  - Timeline des echeances
 *  - Reconciliation montants attendus / recus
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { StatusBadge } from '../ui/status-badge';
import {
  Calendar,
  Calculator,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Loader2,
  Handshake,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { rebateApi } from '../../api/rebateApi';
import { formatCurrency, formatPercentage, formatDateShortFR, formatDateMediumFR } from '../../utils/formatNumber';
import {
  getEntryStatusVariant,
  getEntryStatusLabel,
  getPaymentMethodLabel,
  getStageLabel,
} from '../../utils/rebateLabels';
import type {
  InvoiceRebateScheduleResponse,
  RebateEntry,
  ConditionProgress,
} from '../../api/types';

// ========================================
// TYPES
// ========================================

interface RebateScheduleWidgetProps {
  factureLaboId: number;
  /** Montant total HT de la facture (pour affichage reference) */
  montantHt?: number;
  /** Laboratoire nom (pour l'en-tete) */
  laboratoireNom?: string;
}

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export function RebateScheduleWidget({
  factureLaboId,
  montantHt,
  laboratoireNom,
}: RebateScheduleWidgetProps) {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<InvoiceRebateScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // ========================================
  // CHARGEMENT
  // ========================================

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setNotFound(false);
      const result = await rebateApi.getScheduleByInvoice(factureLaboId);
      setSchedule(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('404') || message.includes('not found') || message.includes('Aucun')) {
        setNotFound(true);
      }
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  }, [factureLaboId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // ========================================
  // ACTIONS
  // ========================================

  const handleCalculate = async () => {
    try {
      setCalculating(true);
      const result = await rebateApi.calculateSchedule(factureLaboId);
      setSchedule(result);
      setNotFound(false);
      toast.success('Calendrier de remises calcule');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors du calcul';
      toast.error(message);
    } finally {
      setCalculating(false);
    }
  };

  const handleForceRecalculate = async () => {
    try {
      setCalculating(true);
      const result = await rebateApi.forceRecalculate(factureLaboId);
      setSchedule(result);
      toast.success('Calendrier recalcule');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors du recalcul';
      toast.error(message);
    } finally {
      setCalculating(false);
    }
  };

  // ========================================
  // PARSE rebate_entries
  // ========================================

  const entries: RebateEntry[] = (() => {
    if (!schedule?.rebate_entries) return [];
    // rebate_entries peut etre un objet avec des cles ou directement un array
    const raw = schedule.rebate_entries;
    if (Array.isArray(raw)) return raw as unknown as RebateEntry[];
    if (typeof raw === 'object' && raw !== null) {
      // Si c'est un dict avec des cles stage_id
      const values = Object.values(raw);
      if (values.length > 0 && typeof values[0] === 'object') {
        return values as unknown as RebateEntry[];
      }
    }
    return [];
  })();

  // ========================================
  // RENDER : Loading
  // ========================================

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
          Chargement du calendrier...
        </CardContent>
      </Card>
    );
  }

  // ========================================
  // RENDER : Pas de calendrier
  // ========================================

  if (notFound || !schedule) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendrier des remises
          </h3>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Handshake className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium mb-1">
            {notFound
              ? 'Aucun calendrier de remises pour cette facture'
              : 'Impossible de charger le calendrier'}
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
            {notFound
              ? 'Verifiez qu\'un accord commercial est actif pour ce laboratoire, puis calculez les remises M0/M+1.'
              : 'Une erreur est survenue. Reessayez ou verifiez la configuration des accords.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              onClick={handleCalculate}
              disabled={calculating}
            >
              {calculating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4 mr-1" />
              )}
              Calculer les remises
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/agreements')}
            >
              <Handshake className="h-4 w-4 mr-1" />
              Voir les accords
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ========================================
  // RENDER : Calendrier complet
  // ========================================

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendrier des remises
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {schedule.laboratoire_nom || laboratoireNom || 'Laboratoire'}
              {' — '}
              Accord v{schedule.agreement_version}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              label={schedule.statut === 'prevu' ? 'En cours' : schedule.statut === 'recu' ? 'Recu' : schedule.statut}
              variant={
                schedule.statut === 'recu' ? 'success' :
                schedule.statut === 'ecart' ? 'error' :
                'info'
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleForceRecalculate}
              disabled={calculating}
              title="Recalculer"
            >
              {calculating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Montants resume */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Montant facture HT</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(schedule.invoice_amount || montantHt)}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">RFA attendue</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">
              {formatCurrency(schedule.total_rfa_expected)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(schedule.total_rfa_percentage * 100)}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Montant recu</p>
            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {schedule.montant_recu != null ? formatCurrency(schedule.montant_recu) : '-'}
            </p>
          </div>
          <div className={`rounded-lg p-3 text-center ${
            schedule.ecart && schedule.ecart !== 0
              ? 'bg-red-50 dark:bg-red-900/20'
              : 'bg-gray-50 dark:bg-gray-800'
          }`}>
            <p className="text-xs text-muted-foreground mb-1">Ecart</p>
            <p className={`text-sm font-bold ${
              schedule.ecart && schedule.ecart !== 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground'
            }`}>
              {schedule.ecart != null ? formatCurrency(schedule.ecart) : '-'}
            </p>
          </div>
        </div>

        {/* Ventilation par tranche */}
        {schedule.tranche_breakdown && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-2">Ventilation par tranche</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(schedule.tranche_breakdown).map(([key, val]) => {
                const data = val as Record<string, unknown>;
                return (
                  <div key={key} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {key === 'tranche_A' ? 'Tranche A (generiques)' : 'Tranche B (non-generiques)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Montant brut</span>
                        <p className="font-medium">{formatCurrency(data.montant_brut as number)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">% du total</span>
                        <p className="font-medium">{formatPercentage((data.pct_total as number) || 0)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline des etapes */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Echeances des remises</h4>
          <div className="space-y-2">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune echeance calculee
              </p>
            ) : (
              entries.map((entry, index) => (
                <div
                  key={entry.stage_id || index}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {/* Icone statut */}
                  <div className="shrink-0 mt-0.5">
                    {entry.status === 'received' || entry.status === 'recu' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : entry.status === 'late' || entry.status === 'en_retard' ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-500" />
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{entry.stage_label}</p>
                        <p className="text-xs text-muted-foreground">
                          {getPaymentMethodLabel(entry.payment_method)}
                          {entry.is_conditional && ' (conditionnel)'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums">{formatCurrency(entry.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          Cumul : {formatPercentage(entry.cumulative_rate * 100)}
                        </p>
                      </div>
                    </div>

                    {/* Ventilation Tranche A / B */}
                    {(entry.tranche_A_amount > 0 || entry.tranche_B_amount > 0) && (
                      <div className="flex gap-4 mt-1.5 text-xs">
                        {entry.tranche_A_amount > 0 && (
                          <span className="text-blue-600 dark:text-blue-400">
                            A : {formatCurrency(entry.tranche_A_amount)}
                          </span>
                        )}
                        {entry.tranche_B_amount > 0 && (
                          <span className="text-purple-600 dark:text-purple-400">
                            B : {formatCurrency(entry.tranche_B_amount)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Date + statut */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        Echeance : {formatDateMediumFR(entry.expected_date)}
                      </span>
                      <StatusBadge
                        label={getEntryStatusLabel(entry.status)}
                        variant={getEntryStatusVariant(entry.status)}
                        size="sm"
                      />
                    </div>

                    {/* Reconciliation */}
                    {entry.actual_amount != null && (
                      <div className="mt-2 flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800 rounded p-2">
                        <span>Recu : {formatCurrency(entry.actual_amount)}</span>
                        {entry.received_date && (
                          <span className="text-muted-foreground">le {formatDateShortFR(entry.received_date)}</span>
                        )}
                        {entry.variance != null && entry.variance !== 0 && (
                          <span className={entry.variance > 0 ? 'text-green-600' : 'text-red-600'}>
                            (ecart : {formatCurrency(entry.variance)})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Condition progress */}
                    {entry.is_conditional && entry.condition && (
                      <ConditionProgressBar condition={entry.condition} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// SOUS-COMPOSANT : Barre de progression condition
// ========================================

function ConditionProgressBar({ condition }: { condition: ConditionProgress }) {
  const pct = Math.min(condition.current_percentage, 100);
  const isLikely = condition.is_likely_met;

  return (
    <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Condition : {condition.type === 'annual_volume' ? 'Volume annuel' : condition.type}
        </span>
        <span className={`font-medium ${isLikely ? 'text-green-600' : 'text-amber-600'}`}>
          {formatPercentage(pct)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isLikely ? 'bg-green-500' : pct < 50 ? 'bg-red-500' : 'bg-amber-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{formatCurrency(condition.current_value)}</span>
        <span className="flex items-center gap-1">
          <ArrowRight className="h-3 w-3" />
          {formatCurrency(condition.threshold)}
        </span>
      </div>

      {condition.projection_year_end != null && (
        <p className="mt-1 text-xs text-muted-foreground">
          Projection fin d'annee : {formatCurrency(condition.projection_year_end)}
          {condition.confidence && ` (confiance : ${condition.confidence})`}
        </p>
      )}
    </div>
  );
}
