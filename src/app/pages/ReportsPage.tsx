/**
 * PharmaVerif - Page Rapports & Historique
 * Copyright (c) 2026 Anas BENDAIKHA
 *
 * DÉSACTIVÉ 2026-04-21 — Décision P0 navigation.
 * Cette page affichait des KPIs et charts basés sur seed localStorage
 * (db.getAllFactures, db.getAllAnomalies). Les chiffres ne correspondaient
 * pas à la réalité backend PostgreSQL.
 *
 * Code original : 344 lignes, conservé dans git history (commit précédent).
 * Pour réactiver : restaurer et brancher sur un endpoint
 * GET /api/v1/rapports/dashboard (à créer).
 */

import { FileBarChart } from 'lucide-react';

interface ReportsPageProps {
  onNavigate?: (page: string) => void;
}

export function ReportsPage({ onNavigate }: ReportsPageProps) {
  return (
    <div className="space-y-6">
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-white border border-pv-ink-100/70 rounded-xl p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-pv-ink-50 grid place-items-center">
              <FileBarChart className="h-6 w-6 text-pv-ink-500" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold text-pv-ink-900">
                Rapports
              </h1>
              <p className="mt-2 text-[14px] text-pv-slate-600 leading-relaxed">
                Les rapports de synthèse seront disponibles dès que suffisamment
                de factures auront été traitées par le moteur de vérification.
                Vous pouvez dès à présent exporter un rapport PDF pour chaque
                facture individuelle depuis la page <strong>Factures</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
