/**
 * PharmaVerif - Hook useToast
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Wrapper enrichi autour de sonner pour PharmaVerif :
 *  - API simplifiee : toast.success(), toast.warning(), toast.error(), toast.info()
 *  - Durees par defaut adaptees au contexte pharma (erreurs persistantes)
 *  - Actions intégrées (boutons dans le toast)
 *  - ARIA live regions incluses
 *
 * Usage :
 *   const { toast } = useToast();
 *   toast.success('Facture conforme', '47 lignes verifiees');
 *   toast.warning('3 anomalies', 'Montant : 145 EUR', { action: { label: 'Voir', onClick: fn } });
 *   toast.error('Echec parsing', 'Format non reconnu', { action: { label: 'Reessayer', onClick: fn } });
 */

import { toast as sonnerToast, ExternalToast } from 'sonner';

// ========================================
// TYPES
// ========================================

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  /** Duree en ms (override le defaut par type) */
  duration?: number;
  /** Bouton d'action dans le toast */
  action?: ToastAction;
  /** Fermer le toast au clic sur l'action */
  dismissOnAction?: boolean;
}

interface ToastAPI {
  /** Succes — auto-dismiss 5s */
  success: (title: string, description?: string, options?: ToastOptions) => string | number;
  /** Attention — auto-dismiss 7s, action recommandee */
  warning: (title: string, description?: string, options?: ToastOptions) => string | number;
  /** Erreur — persistant (pas d'auto-dismiss), action requise */
  error: (title: string, description?: string, options?: ToastOptions) => string | number;
  /** Info — auto-dismiss 5s */
  info: (title: string, description?: string, options?: ToastOptions) => string | number;
  /** Fermer un toast par ID */
  dismiss: (id?: string | number) => void;
  /** Fermer tous les toasts */
  dismissAll: () => void;
}

// ========================================
// DUREES PAR DEFAUT (ms)
// ========================================

const DURATIONS = {
  success: 5000,
  warning: 7000,
  error: Infinity, // Persistant — le pharmacien DOIT lire
  info: 5000,
} as const;

// ========================================
// HELPER : convertir ToastOptions en ExternalToast sonner
// ========================================

function buildSonnerOptions(
  description?: string,
  options?: ToastOptions,
  defaultDuration?: number
): ExternalToast {
  const sonnerOpts: ExternalToast = {};

  if (description) {
    sonnerOpts.description = description;
  }

  sonnerOpts.duration = options?.duration ?? defaultDuration;

  if (options?.action) {
    sonnerOpts.action = {
      label: options.action.label,
      onClick: options.action.onClick,
    };
  }

  return sonnerOpts;
}

// ========================================
// HOOK
// ========================================

export function useToast(): { toast: ToastAPI } {
  const toast: ToastAPI = {
    success(title, description, options) {
      return sonnerToast.success(title, buildSonnerOptions(description, options, DURATIONS.success));
    },

    warning(title, description, options) {
      return sonnerToast.warning(title, buildSonnerOptions(description, options, DURATIONS.warning));
    },

    error(title, description, options) {
      return sonnerToast.error(title, buildSonnerOptions(description, options, DURATIONS.error));
    },

    info(title, description, options) {
      return sonnerToast.info(title, buildSonnerOptions(description, options, DURATIONS.info));
    },

    dismiss(id) {
      sonnerToast.dismiss(id);
    },

    dismissAll() {
      sonnerToast.dismiss();
    },
  };

  return { toast };
}

/**
 * API statique pour usage hors composant (dans des handlers de service, etc.)
 * Memes signatures que le hook.
 */
export const pharmaToast = {
  success(title: string, description?: string, options?: ToastOptions) {
    return sonnerToast.success(title, buildSonnerOptions(description, options, DURATIONS.success));
  },
  warning(title: string, description?: string, options?: ToastOptions) {
    return sonnerToast.warning(title, buildSonnerOptions(description, options, DURATIONS.warning));
  },
  error(title: string, description?: string, options?: ToastOptions) {
    return sonnerToast.error(title, buildSonnerOptions(description, options, DURATIONS.error));
  },
  info(title: string, description?: string, options?: ToastOptions) {
    return sonnerToast.info(title, buildSonnerOptions(description, options, DURATIONS.info));
  },
  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },
  dismissAll() {
    sonnerToast.dismiss();
  },
};
