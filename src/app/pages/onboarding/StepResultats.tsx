/**
 * PharmaVerif - Onboarding Step 4 : Vos Resultats
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Ecran "Effet WOW" : affiche les resultats d'analyse avec
 * compteurs animes et montants recouvrables.
 * Si l'upload a ete skippe, affiche un resume de bienvenue.
 */

import { useState, useEffect, useRef } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, FlaskConical, Store } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { UploadLaboResponse } from '../../api/types';
import { formatCurrency } from '../../utils/formatNumber';

// ========================================
// TYPES
// ========================================

interface StepResultatsProps {
  uploadResult: UploadLaboResponse | null;
  pharmacyName: string;
  selectedLabsCount: number;
  onComplete: () => void;
}

// ========================================
// ANIMATED COUNTER HOOK
// ========================================

function useAnimatedCounter(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    startTimeRef.current = null;

    function animate(timestamp: number) {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target * 100) / 100);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return value;
}

// ========================================
// COMPONENT
// ========================================

export function StepResultats({ uploadResult, pharmacyName, selectedLabsCount, onComplete }: StepResultatsProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  const facture = uploadResult?.facture;
  const verification = uploadResult?.verification;

  const montantBrut = useAnimatedCounter(facture?.montant_brut_ht ?? 0);
  const rfaAttendue = useAnimatedCounter(facture?.rfa_attendue ?? 0);
  const ecartTotal = useAnimatedCounter(verification?.montant_total_ecart ?? 0);

  const handleFinish = async () => {
    setIsCompleting(true);
    await onComplete();
    // onComplete handles navigation
  };

  // ====== WOW VIEW (upload completed) ======
  if (uploadResult && facture) {
    return (
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 mb-4 animate-pulse">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Vos Resultats
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Voici ce que PharmaVerif a detecte sur votre facture
          </p>
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Montant brut */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              Montant brut analyse
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(montantBrut)}
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
              {facture.nb_lignes} lignes de produits
            </p>
          </div>

          {/* RFA attendue */}
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
              RFA attendue
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(rfaAttendue)}
            </p>
            <p className="text-xs text-green-500 dark:text-green-400 mt-1">
              Remise de fin d'annee calculee
            </p>
          </div>
        </div>

        {/* Ecart total (WOW headline) */}
        {verification && verification.montant_total_ecart > 0 && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 mb-6 text-center">
            <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              Montant potentiellement recouvrable
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {formatCurrency(ecartTotal)}
            </p>
          </div>
        )}

        {/* Anomalies summary */}
        {verification && verification.nb_anomalies > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {verification.nb_critical > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                {verification.nb_critical} critique{verification.nb_critical > 1 ? 's' : ''}
              </span>
            )}
            {verification.nb_opportunity > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <TrendingUp className="h-3.5 w-3.5" />
                {verification.nb_opportunity} opportunite{verification.nb_opportunity > 1 ? 's' : ''}
              </span>
            )}
            {verification.nb_info > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {verification.nb_info} info{verification.nb_info > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        <Button
          type="button"
          onClick={handleFinish}
          disabled={isCompleting}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-h-[48px] text-base font-semibold"
        >
          {isCompleting ? 'Finalisation...' : 'Terminer la configuration'}
        </Button>
      </div>
    );
  }

  // ====== WELCOME VIEW (upload skipped) ======
  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 mb-4">
          <CheckCircle className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Votre pharmacie est configuree !
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Vous etes pret a utiliser PharmaVerif
        </p>
      </div>

      {/* Summary cards */}
      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
          <Store className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pharmacie</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{pharmacyName}</p>
          </div>
          <CheckCircle className="h-4 w-4 text-green-500 ml-auto shrink-0" />
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
          <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Laboratoires</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedLabsCount > 0
                ? `${selectedLabsCount} laboratoire${selectedLabsCount > 1 ? 's' : ''} configure${selectedLabsCount > 1 ? 's' : ''}`
                : 'Aucun laboratoire selectionne'}
            </p>
          </div>
          {selectedLabsCount > 0 && <CheckCircle className="h-4 w-4 text-green-500 ml-auto shrink-0" />}
        </div>
      </div>

      {/* Next step hint */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Prochaine etape :</strong> Uploadez votre premiere facture laboratoire depuis le tableau de bord pour decouvrir l'analyse automatique de PharmaVerif.
        </p>
      </div>

      {/* CTA */}
      <Button
        type="button"
        onClick={handleFinish}
        disabled={isCompleting}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-h-[48px] text-base font-semibold"
      >
        {isCompleting ? 'Finalisation...' : 'Acceder au tableau de bord'}
      </Button>
    </div>
  );
}
