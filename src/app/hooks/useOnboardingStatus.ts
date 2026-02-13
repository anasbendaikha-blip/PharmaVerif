/**
 * PharmaVerif - Hook useOnboardingStatus
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Verifie le statut d'onboarding de la pharmacie courante.
 * En mode localStorage (demo), retourne toujours isCompleted=true.
 */

import { useState, useEffect } from 'react';
import { isApiMode } from '../api/config';
import { pharmacyApi } from '../api/pharmacyApi';

interface OnboardingStatus {
  isLoading: boolean;
  isCompleted: boolean | null;
}

export function useOnboardingStatus(): OnboardingStatus {
  const [status, setStatus] = useState<OnboardingStatus>({
    isLoading: true,
    isCompleted: null,
  });

  useEffect(() => {
    // En mode localStorage, on skip l'onboarding completement
    if (!isApiMode()) {
      setStatus({ isLoading: false, isCompleted: true });
      return;
    }

    pharmacyApi
      .getMyPharmacy()
      .then((pharmacy) => {
        setStatus({
          isLoading: false,
          isCompleted: pharmacy.onboarding_completed,
        });
      })
      .catch(() => {
        // Erreur (pas de pharmacie, pas de token, etc.)
        setStatus({ isLoading: false, isCompleted: null });
      });
  }, []);

  return status;
}
