/**
 * PharmaVerif - Hook useFileUpload
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Hook de gestion d'upload avec progression multi-etapes :
 *  - Validation fichier (format, taille)
 *  - Progression 0-100% avec 4 etapes distinctes
 *  - Sous-etapes avec checklist progressive
 *  - Gestion d'erreurs contextualisee
 *  - Annulation possible
 *
 * Etapes :
 *  1. Upload (0-25%)      — envoi du fichier
 *  2. Parsing (25-50%)    — lecture et extraction
 *  3. Verification (50-75%) — analyse des remises
 *  4. Rapport (75-100%)   — generation du resultat
 */

import { useState, useCallback, useRef } from 'react';

// ========================================
// TYPES
// ========================================

export type UploadStep = 'idle' | 'upload' | 'parsing' | 'verification' | 'complete' | 'error';

export interface SubStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

export interface UploadError {
  type: 'file_too_large' | 'format_invalid' | 'parsing_failed' | 'server_error' | 'unknown';
  title: string;
  message: string;
  details?: string[];
  suggestion?: string;
}

export interface UploadResult {
  success: boolean;
  invoiceId?: number;
  invoiceNumber?: string;
  linesCount?: number;
  anomaliesCount?: number;
  montantRecuperable?: number;
  error?: UploadError;
}

export interface UploadState {
  /** Etape courante */
  step: UploadStep;
  /** Progression globale 0-100 */
  progress: number;
  /** Sous-etapes de l'etape courante */
  subSteps: SubStep[];
  /** Fichier en cours de traitement */
  file: File | null;
  /** Erreur eventuelle */
  error: UploadError | null;
  /** Resultat final */
  result: UploadResult | null;
  /** Upload en cours ? */
  isProcessing: boolean;
  /** Upload annulable ? */
  canCancel: boolean;
}

interface UseFileUploadOptions {
  /** Taille max en bytes (defaut : 10 MB) */
  maxSize?: number;
  /** Formats acceptes (defaut : PDF, XML, XLSX, CSV) */
  acceptedFormats?: string[];
  /** Simuler des erreurs aleatoires (defaut: false, pour dev) */
  simulateErrors?: boolean;
  /** Callback quand l'upload termine */
  onComplete?: (result: UploadResult) => void;
  /** Callback quand une erreur survient */
  onError?: (error: UploadError) => void;
}

// ========================================
// CONSTANTES
// ========================================

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_FORMATS = ['.pdf', '.xml', '.xlsx', '.xls', '.csv'];

const FORMAT_NAMES: Record<string, string> = {
  '.pdf': 'PDF',
  '.xml': 'XML (Factur-X)',
  '.xlsx': 'Excel (.xlsx)',
  '.xls': 'Excel (.xls)',
  '.csv': 'CSV',
};

// ========================================
// SUB-STEPS DEFINITIONS
// ========================================

function getSubStepsForStep(step: UploadStep): SubStep[] {
  switch (step) {
    case 'upload':
      return [{ label: 'Envoi du fichier...', status: 'active' }];
    case 'parsing':
      return [
        { label: 'En-tete identifiee', status: 'pending' },
        { label: 'Lignes produits detectees', status: 'pending' },
        { label: 'Extraction des donnees', status: 'pending' },
      ];
    case 'verification':
      return [
        { label: 'Prix unitaires verifies', status: 'pending' },
        { label: 'Remises calculees', status: 'pending' },
        { label: 'Comparaison conditions', status: 'pending' },
      ];
    case 'complete':
      return [{ label: 'Verification terminee', status: 'done' }];
    default:
      return [];
  }
}

// ========================================
// HOOK
// ========================================

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    acceptedFormats = DEFAULT_FORMATS,
    simulateErrors = false,
    onComplete,
    onError,
  } = options;

  const [state, setState] = useState<UploadState>({
    step: 'idle',
    progress: 0,
    subSteps: [],
    file: null,
    error: null,
    result: null,
    isProcessing: false,
    canCancel: false,
  });

  const cancelRef = useRef(false);

  // ---- Validation fichier ----
  const validateFile = useCallback(
    (file: File): UploadError | null => {
      // Verifier taille
      if (file.size > maxSize) {
        return {
          type: 'file_too_large',
          title: 'Fichier trop volumineux',
          message: `Taille : ${(file.size / (1024 * 1024)).toFixed(1)} MB (max : ${(maxSize / (1024 * 1024)).toFixed(0)} MB)`,
          suggestion: 'Compressez le PDF avant l\'envoi ou scindez le fichier.',
        };
      }

      // Verifier format
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFormats.includes(ext)) {
        return {
          type: 'format_invalid',
          title: 'Format de fichier non reconnu',
          message: `Format detecte : ${ext}`,
          details: [`Formats acceptes : ${acceptedFormats.map((f) => FORMAT_NAMES[f] || f).join(', ')}`],
          suggestion: 'Demandez a votre fournisseur une facture au format electronique.',
        };
      }

      return null;
    },
    [maxSize, acceptedFormats]
  );

  // ---- Helper : delay avec controle d'annulation ----
  const delay = useCallback((ms: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(!cancelRef.current);
      }, ms);
      // Cleanup si annule pendant l'attente
      if (cancelRef.current) {
        clearTimeout(timer);
        resolve(false);
      }
    });
  }, []);

  // ---- Helper : mise a jour sub-steps ----
  const updateSubStep = useCallback(
    (index: number, status: 'active' | 'done', currentSteps: SubStep[]): SubStep[] => {
      return currentSteps.map((s, i) => {
        if (i < index) return { ...s, status: 'done' as const };
        if (i === index) return { ...s, status };
        return s;
      });
    },
    []
  );

  // ---- Process Upload (mock avec delais realistes) ----
  const processUpload = useCallback(
    async (file: File) => {
      cancelRef.current = false;

      setState((s) => ({
        ...s,
        step: 'upload',
        progress: 0,
        subSteps: getSubStepsForStep('upload'),
        file,
        error: null,
        result: null,
        isProcessing: true,
        canCancel: true,
      }));

      // ----- ETAPE 1 : Upload (0 -> 25%) -----
      for (let p = 0; p <= 25; p += 5) {
        if (cancelRef.current) return;
        setState((s) => ({ ...s, progress: p }));
        await delay(200);
      }

      if (cancelRef.current) return;

      // ----- ETAPE 2 : Parsing (25 -> 50%) -----
      const parsingSteps = getSubStepsForStep('parsing');
      setState((s) => ({
        ...s,
        step: 'parsing',
        progress: 25,
        subSteps: parsingSteps,
      }));

      // Simuler erreur de parsing (20% chance en mode simulateErrors)
      if (simulateErrors && Math.random() < 0.2) {
        const parseError: UploadError = {
          type: 'parsing_failed',
          title: 'Impossible de lire la facture',
          message: 'Le fichier semble etre un PDF scanne (non recherchable).',
          details: [
            'PDF scanne (non recherchable)',
            'Fichier corrompu',
            'Format non standard',
          ],
          suggestion: 'Contactez votre fournisseur pour obtenir une facture au format electronique.',
        };
        setState((s) => ({
          ...s,
          step: 'error',
          error: parseError,
          isProcessing: false,
          canCancel: false,
        }));
        onError?.(parseError);
        return;
      }

      // Sub-step 1 : En-tete
      setState((s) => ({
        ...s,
        progress: 30,
        subSteps: updateSubStep(0, 'active', parsingSteps),
      }));
      await delay(800);
      if (cancelRef.current) return;

      const parsedSteps1 = updateSubStep(0, 'done', parsingSteps);
      setState((s) => ({
        ...s,
        progress: 37,
        subSteps: updateSubStep(1, 'active', parsedSteps1),
      }));
      await delay(1000);
      if (cancelRef.current) return;

      // Sub-step 2 : Lignes
      const parsedSteps2 = updateSubStep(1, 'done', parsedSteps1);
      setState((s) => ({
        ...s,
        progress: 43,
        subSteps: updateSubStep(2, 'active', parsedSteps2),
      }));
      await delay(700);
      if (cancelRef.current) return;

      // Sub-step 3 : Extraction
      const parsedSteps3 = updateSubStep(2, 'done', parsedSteps2);
      setState((s) => ({
        ...s,
        progress: 50,
        subSteps: parsedSteps3,
      }));

      // ----- ETAPE 3 : Verification (50 -> 75%) -----
      const verifySteps = getSubStepsForStep('verification');
      setState((s) => ({
        ...s,
        step: 'verification',
        progress: 50,
        subSteps: verifySteps,
      }));

      // Sub-step 1 : Prix
      setState((s) => ({
        ...s,
        progress: 55,
        subSteps: updateSubStep(0, 'active', verifySteps),
      }));
      await delay(800);
      if (cancelRef.current) return;

      const verifySteps1 = updateSubStep(0, 'done', verifySteps);
      setState((s) => ({
        ...s,
        progress: 62,
        subSteps: updateSubStep(1, 'active', verifySteps1),
      }));
      await delay(800);
      if (cancelRef.current) return;

      // Sub-step 2 : Remises
      const verifySteps2 = updateSubStep(1, 'done', verifySteps1);
      setState((s) => ({
        ...s,
        progress: 70,
        subSteps: updateSubStep(2, 'active', verifySteps2),
      }));
      await delay(700);
      if (cancelRef.current) return;

      // Sub-step 3 : Conditions
      const verifySteps3 = updateSubStep(2, 'done', verifySteps2);
      setState((s) => ({
        ...s,
        progress: 75,
        subSteps: verifySteps3,
      }));

      // Simuler erreur serveur (10% chance)
      if (simulateErrors && Math.random() < 0.1) {
        const serverError: UploadError = {
          type: 'server_error',
          title: 'Erreur de connexion',
          message: 'Le serveur ne repond pas. Verifiez votre connexion internet.',
          suggestion: 'Reessayez dans quelques instants.',
        };
        setState((s) => ({
          ...s,
          step: 'error',
          error: serverError,
          isProcessing: false,
          canCancel: false,
        }));
        onError?.(serverError);
        return;
      }

      // ----- ETAPE 4 : Rapport (75 -> 100%) -----
      setState((s) => ({
        ...s,
        step: 'complete',
        progress: 80,
        subSteps: getSubStepsForStep('complete'),
        canCancel: false,
      }));

      for (let p = 80; p <= 100; p += 5) {
        if (cancelRef.current) return;
        setState((s) => ({ ...s, progress: p }));
        await delay(100);
      }

      // Generer un resultat simule
      const anomaliesCount = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * 5) + 1;
      const result: UploadResult = {
        success: true,
        invoiceId: Math.floor(Math.random() * 1000) + 100,
        invoiceNumber: `FAC-${Date.now().toString(36).toUpperCase()}`,
        linesCount: Math.floor(Math.random() * 80) + 15,
        anomaliesCount,
        montantRecuperable: anomaliesCount > 0 ? Math.round(Math.random() * 800 + 50) : 0,
      };

      setState((s) => ({
        ...s,
        step: 'complete',
        progress: 100,
        result,
        isProcessing: false,
      }));

      onComplete?.(result);
    },
    [simulateErrors, delay, updateSubStep, onComplete, onError]
  );

  // ---- API publique ----

  const startUpload = useCallback(
    (file: File) => {
      // Valider d'abord
      const validationError = validateFile(file);
      if (validationError) {
        setState((s) => ({
          ...s,
          step: 'error',
          file,
          error: validationError,
          isProcessing: false,
          canCancel: false,
        }));
        onError?.(validationError);
        return;
      }

      processUpload(file);
    },
    [validateFile, processUpload, onError]
  );

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setState({
      step: 'idle',
      progress: 0,
      subSteps: [],
      file: null,
      error: null,
      result: null,
      isProcessing: false,
      canCancel: false,
    });
  }, []);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setState({
      step: 'idle',
      progress: 0,
      subSteps: [],
      file: null,
      error: null,
      result: null,
      isProcessing: false,
      canCancel: false,
    });
  }, []);

  const retry = useCallback(() => {
    if (state.file) {
      processUpload(state.file);
    }
  }, [state.file, processUpload]);

  return {
    state,
    startUpload,
    cancel,
    reset,
    retry,
    validateFile,
  };
}
