/**
 * PharmaVerif - Messages d'erreur d'authentification
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Messages d'erreur en francais, contextualises et non techniques.
 * Utilises par AuthContext, LoginPage, SignupPage, ForgotPasswordPage.
 */

// ========================================
// MESSAGES D'ERREUR
// ========================================

export const AUTH_ERRORS = {
  // Connexion
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect. Verifiez vos identifiants.',
  ACCOUNT_LOCKED: 'Compte temporairement bloque. Reessayez dans quelques minutes.',
  SESSION_EXPIRED: 'Votre session a expire. Veuillez vous reconnecter.',

  // Inscription
  EMAIL_EXISTS: 'Un compte existe deja avec cette adresse email.',
  WEAK_PASSWORD: 'Le mot de passe ne respecte pas les criteres de securite.',
  PASSWORDS_MISMATCH: 'Les mots de passe ne correspondent pas.',

  // Validation
  EMPTY_FIELDS: 'Veuillez remplir tous les champs obligatoires.',
  INVALID_EMAIL: 'Veuillez saisir une adresse email valide.',
  INVALID_NAME: 'Veuillez saisir votre nom complet.',

  // Reseau
  NETWORK_ERROR: 'Impossible de joindre le serveur. Verifiez votre connexion.',
  SERVER_ERROR: 'Une erreur est survenue. Veuillez reessayer.',
  TIMEOUT_ERROR: 'Le serveur met trop de temps a repondre. Reessayez.',

  // Succes
  REGISTER_SUCCESS: 'Compte cree avec succes !',
  LOGIN_SUCCESS: 'Connexion reussie !',
  RESET_EMAIL_SENT:
    'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.',
  PASSWORD_RESET_SUCCESS: 'Mot de passe reinitialise avec succes.',
} as const;

export type AuthErrorKey = keyof typeof AUTH_ERRORS;

// ========================================
// HELPER — HTTP status → message francais
// ========================================

/**
 * Convertit un code HTTP en message d'erreur francais contextualise.
 * Evite d'exposer des details techniques a l'utilisateur.
 */
export function getAuthError(status: number, fallback?: string): string {
  switch (status) {
    case 400:
      return AUTH_ERRORS.EMPTY_FIELDS;
    case 401:
      return AUTH_ERRORS.INVALID_CREDENTIALS;
    case 403:
      return AUTH_ERRORS.ACCOUNT_LOCKED;
    case 404:
      return AUTH_ERRORS.INVALID_CREDENTIALS; // Ne pas reveler que l'email n'existe pas
    case 409:
      return AUTH_ERRORS.EMAIL_EXISTS;
    case 422:
      return AUTH_ERRORS.WEAK_PASSWORD;
    case 429:
      return AUTH_ERRORS.ACCOUNT_LOCKED;
    case 408:
    case 504:
      return AUTH_ERRORS.TIMEOUT_ERROR;
    case 500:
    case 502:
    case 503:
      return AUTH_ERRORS.SERVER_ERROR;
    default:
      return fallback || AUTH_ERRORS.SERVER_ERROR;
  }
}

/**
 * Detecte si une erreur est une erreur reseau (pas de reponse HTTP).
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  const err = error as { status?: number; message?: string };
  if (!err.status && err.message?.includes('network')) {
    return true;
  }
  return false;
}

/**
 * Extrait un message d'erreur francais depuis n'importe quel type d'erreur.
 */
export function extractAuthError(error: unknown): string {
  if (isNetworkError(error)) {
    return AUTH_ERRORS.NETWORK_ERROR;
  }

  const err = error as { status?: number; message?: string; detail?: string };

  if (err.status) {
    return getAuthError(err.status, err.detail || err.message);
  }

  return err.detail || err.message || AUTH_ERRORS.SERVER_ERROR;
}
