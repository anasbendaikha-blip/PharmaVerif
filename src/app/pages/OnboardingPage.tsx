/**
 * PharmaVerif - Onboarding Wizard Page
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Wizard de premiere configuration en 4 etapes :
 *  1. Votre Pharmacie — infos pharmacie
 *  2. Vos Laboratoires — selection depuis templates
 *  3. Votre Premiere Facture — upload PDF + analyse auto
 *  4. Vos Resultats — effet WOW avec montants recouvrables
 *
 * Cette page est rendue HORS AppLayout (pas de sidebar/header).
 * API-only : redirige vers /dashboard en mode localStorage.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useTheme } from '../contexts/ThemeContext';
import { isApiMode } from '../api/config';
import { pharmacyApi } from '../api/pharmacyApi';
import type { PharmacyResponse, LaboratoireResponse, UploadLaboResponse } from '../api/types';
import { StepIndicator } from '../components/ui/step-indicator';
import { StepPharmacie } from './onboarding/StepPharmacie';
import { StepLaboratoires } from './onboarding/StepLaboratoires';
import { StepPremiereFacture } from './onboarding/StepPremiereFacture';
import { StepResultats } from './onboarding/StepResultats';
import { toast } from 'sonner';

// ========================================
// CONSTANTS
// ========================================

const STEPS = [
  { label: 'Pharmacie', description: 'Vos informations' },
  { label: 'Laboratoires', description: 'Vos partenaires' },
  { label: 'Facture', description: 'Premier upload' },
  { label: 'Resultats', description: 'Decouverte' },
];

// ========================================
// COMPONENT
// ========================================

export function OnboardingPage() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [pharmacyData, setPharmacyData] = useState<PharmacyResponse | null>(null);
  const [selectedLabs, setSelectedLabs] = useState<LaboratoireResponse[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadLaboResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ====== MOUNT: Check API mode & fetch pharmacy ======
  useEffect(() => {
    if (!isApiMode()) {
      navigate('/dashboard', { replace: true });
      return;
    }

    async function init() {
      try {
        const pharmacy = await pharmacyApi.getMyPharmacy();
        if (pharmacy.onboarding_completed) {
          navigate('/dashboard', { replace: true });
          return;
        }
        setPharmacyData(pharmacy);
      } catch {
        // Si erreur (pas de pharmacie), on continue quand meme
      }
      setIsLoading(false);
    }

    init();
  }, [navigate]);

  // ====== STEP NAVIGATION ======
  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleSkip = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, []);

  // ====== STEP CALLBACKS ======
  const handlePharmacyComplete = useCallback((data: PharmacyResponse) => {
    setPharmacyData(data);
    handleNext();
  }, [handleNext]);

  const handleLabsComplete = useCallback((labs: LaboratoireResponse[]) => {
    setSelectedLabs(labs);
    handleNext();
  }, [handleNext]);

  const handleUploadComplete = useCallback((result: UploadLaboResponse) => {
    setUploadResult(result);
    handleNext();
  }, [handleNext]);

  const handleFinish = useCallback(async () => {
    try {
      await pharmacyApi.updateMyPharmacy({ onboarding_completed: true });
      toast.success('Configuration terminee !');
      navigate('/dashboard', { replace: true });
    } catch {
      toast.error('Erreur lors de la finalisation');
    }
  }, [navigate]);

  // ====== LOADING ======
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // ====== RENDER ======
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-3">
            <Logo variant="icon" theme={resolvedTheme} size="xl" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Bienvenue sur PharmaVerif
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configurez votre espace en quelques etapes
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={STEPS} currentStep={currentStep} className="mb-6 sm:mb-8" />

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {currentStep === 1 && (
            <StepPharmacie
              pharmacyData={pharmacyData}
              onComplete={handlePharmacyComplete}
              onSkip={handleSkip}
            />
          )}
          {currentStep === 2 && (
            <StepLaboratoires
              onComplete={handleLabsComplete}
              onSkip={handleSkip}
            />
          )}
          {currentStep === 3 && (
            <StepPremiereFacture
              availableLabs={selectedLabs}
              onComplete={handleUploadComplete}
              onSkip={handleSkip}
            />
          )}
          {currentStep === 4 && (
            <StepResultats
              uploadResult={uploadResult}
              pharmacyName={pharmacyData?.nom || 'Votre pharmacie'}
              selectedLabsCount={selectedLabs.length}
              onComplete={handleFinish}
            />
          )}
        </div>

        {/* Navigation — Precedent button (only step 2-3) */}
        {currentStep > 1 && currentStep < 4 && (
          <div className="mt-4 text-center">
            <button
              onClick={handlePrev}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              &larr; Etape precedente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
