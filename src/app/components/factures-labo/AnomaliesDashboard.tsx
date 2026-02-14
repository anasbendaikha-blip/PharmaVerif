/**
 * PharmaVerif - Dashboard anomalies facture labo
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Affiche les anomalies groupées par sévérité (critical, opportunity, info)
 * avec possibilité de résoudre individuellement.
 */

import { useState, useMemo } from 'react';
import { AlertTriangle, Euro, Info, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatNumber';
import { BANNER_STYLES, PILL_STYLES, SECTION_HEADER_COLORS, getFactureLaboSeverity } from '../../utils/statusColors';
import { ANOMALIE_TYPE_LABELS } from './verification';
import type { AnomalieFactureLaboResponse } from '../../api/types';

// ========================================
// HELPERS
// ========================================

function getAnomalieTypeLabel(type: string): string {
  return ANOMALIE_TYPE_LABELS[type] || type;
}

// ========================================
// SUB-COMPONENTS
// ========================================

function AnomalieCard({
  anomalie,
  severite,
  impactLabel,
  onResolve,
}: {
  anomalie: AnomalieFactureLaboResponse;
  severite: string;
  impactLabel?: string;
  onResolve: (id: number) => void;
}) {
  const color = getFactureLaboSeverity(severite);
  return (
    <div className={`p-3 rounded-lg border text-sm ${BANNER_STYLES[color]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs mb-0.5">{getAnomalieTypeLabel(anomalie.type_anomalie)}</p>
          <p className="text-xs opacity-90">{anomalie.description}</p>
          {anomalie.montant_ecart > 0 && impactLabel && (
            <p className="text-xs font-bold mt-1">{impactLabel} : {formatCurrency(anomalie.montant_ecart)}</p>
          )}
          {anomalie.action_suggeree && (
            <p className="text-[10px] mt-1 opacity-75 italic">{anomalie.action_suggeree}</p>
          )}
        </div>
        <button
          onClick={() => onResolve(anomalie.id)}
          className="flex-shrink-0 text-[10px] px-2 py-1 rounded bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
          title="Marquer comme resolu"
        >
          Resolu
        </button>
      </div>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

interface AnomaliesDashboardProps {
  anomalies: AnomalieFactureLaboResponse[];
  isLoadingAnalyse: boolean;
  onResolveAnomalie: (id: number) => void;
}

export function AnomaliesDashboard({ anomalies, isLoadingAnalyse, onResolveAnomalie }: AnomaliesDashboardProps) {
  const [showAnomalies, setShowAnomalies] = useState(true);

  const anomalyGroups = useMemo(() => ({
    critical: anomalies.filter(a => a.severite === 'critical' && !a.resolu),
    opportunity: anomalies.filter(a => a.severite === 'opportunity' && !a.resolu),
    info: anomalies.filter(a => a.severite === 'info' && !a.resolu),
    resolved: anomalies.filter(a => a.resolu),
  }), [anomalies]);

  const totalAnomalies = anomalyGroups.critical.length + anomalyGroups.opportunity.length + anomalyGroups.info.length;

  // No anomalies at all
  if (anomalies.length === 0 && !isLoadingAnalyse) {
    return (
      <div className="px-6 pb-4">
        <div className={`p-3 border rounded-lg text-sm ${BANNER_STYLES.success}`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Verification conforme — aucune anomalie detectee</span>
          </div>
        </div>
      </div>
    );
  }

  if (anomalies.length === 0) return null;

  return (
    <div className="px-6 pb-4">
      <button
        onClick={() => setShowAnomalies(!showAnomalies)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Verification ({totalAnomalies} anomalie{totalAnomalies > 1 ? 's' : ''})
          {anomalyGroups.critical.length > 0 && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PILL_STYLES.error}`}>
              {anomalyGroups.critical.length} critique{anomalyGroups.critical.length > 1 ? 's' : ''}
            </span>
          )}
          {anomalyGroups.opportunity.length > 0 && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PILL_STYLES.warning}`}>
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
              <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${SECTION_HEADER_COLORS.error}`}>
                <AlertTriangle className="h-3.5 w-3.5" />
                CRITIQUE ({anomalyGroups.critical.length})
              </h4>
              <div className="space-y-2">
                {anomalyGroups.critical.map((a) => (
                  <AnomalieCard
                    key={a.id}
                    anomalie={a}
                    severite="critical"
                    impactLabel="Impact"
                    onResolve={onResolveAnomalie}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Opportunities */}
          {anomalyGroups.opportunity.length > 0 && (
            <div>
              <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${SECTION_HEADER_COLORS.warning}`}>
                <Euro className="h-3.5 w-3.5" />
                OPPORTUNITES ({anomalyGroups.opportunity.length})
              </h4>
              <div className="space-y-2">
                {anomalyGroups.opportunity.map((a) => (
                  <AnomalieCard
                    key={a.id}
                    anomalie={a}
                    severite="opportunity"
                    impactLabel="Economie potentielle"
                    onResolve={onResolveAnomalie}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          {anomalyGroups.info.length > 0 && (
            <div>
              <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${SECTION_HEADER_COLORS.info}`}>
                <Info className="h-3.5 w-3.5" />
                INFORMATIONS ({anomalyGroups.info.length})
              </h4>
              <div className="space-y-2">
                {anomalyGroups.info.map((a) => (
                  <div key={a.id} className={`p-3 rounded-lg border text-sm ${BANNER_STYLES.info}`}>
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

          {/* All resolved */}
          {totalAnomalies === 0 && (
            <div className={`p-3 border rounded-lg text-sm ${BANNER_STYLES.success}`}>
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
  );
}
