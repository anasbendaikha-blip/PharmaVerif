/**
 * PharmaVerif - Page de vérification de factures
 * Copyright (c) 2026 Anas BENDAIKHA
 *
 * DÉSACTIVÉ 2026-04-21 — Décision P0 navigation.
 * Cette page affichait des fournisseurs mockés via localStorage (db.getActiveFournisseurs).
 * Remplacée par un placeholder honnête en attendant le branchement sur le backend
 * (endpoint /api/v1/verification ou flux /factures-labo/upload+verify).
 *
 * Code original : 663 lignes, conservé dans git history (commit précédent).
 * Pour réactiver : restaurer depuis git history et brancher sur httpClient.
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ShieldCheck, Upload } from 'lucide-react';

interface VerificationPageProps {
  onNavigate?: (page: string) => void;
}

export function VerificationPage({ onNavigate }: VerificationPageProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-white border border-pv-ink-100/70 rounded-xl p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-pv-ink-50 grid place-items-center">
              <ShieldCheck className="h-6 w-6 text-pv-ink-500" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold text-pv-ink-900">
                Module de vérification
              </h1>
              <p className="mt-2 text-[14px] text-pv-slate-600 leading-relaxed">
                La vérification automatique de vos factures est disponible
                via la page <strong>Factures</strong>. Déposez un PDF de facture
                laboratoire pour lancer l'analyse par le moteur de vérification
                (7 règles : remises, escompte, franco, RFA, gratuités, TVA, arithmétique).
              </p>
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={() => navigate('/factures-labo')}
                  className="gap-2 bg-pv-ink-900 hover:bg-pv-ink-800 text-white"
                >
                  <Upload className="h-4 w-4" />
                  Déposer une facture
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
