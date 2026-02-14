/**
 * PharmaVerif - Utilitaires de validation
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Fonctions de validation partagees :
 *  - Force du mot de passe (score 0-4)
 *  - Validation email
 *  - Validation SIRET (14 chiffres, algorithme de Luhn)
 */

// ========================================
// TYPES
// ========================================

export interface PasswordStrength {
  /** Score global : 0 (tres faible) a 4 (tres fort) */
  score: 0 | 1 | 2 | 3 | 4;
  /** Label lisible en francais */
  label: string;
  /** Classe de couleur Tailwind (pour les barres) */
  color: string;
  /** Liste des criteres avec leur etat */
  checks: PasswordCheck[];
}

export interface PasswordCheck {
  /** Libelle du critere */
  label: string;
  /** Critere satisfait ou non */
  met: boolean;
}

// ========================================
// MOT DE PASSE
// ========================================

const PASSWORD_CHECKS = [
  {
    label: '8 caracteres minimum',
    test: (p: string) => p.length >= 8,
  },
  {
    label: 'Une lettre majuscule',
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    label: 'Un chiffre',
    test: (p: string) => /[0-9]/.test(p),
  },
  {
    label: 'Un caractere special (!@#$...)',
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

const STRENGTH_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Tres faible', color: 'bg-red-500' },
  1: { label: 'Faible', color: 'bg-orange-500' },
  2: { label: 'Moyen', color: 'bg-yellow-500' },
  3: { label: 'Fort', color: 'bg-green-500' },
  4: { label: 'Tres fort', color: 'bg-emerald-500' },
};

/**
 * Calcule la force d'un mot de passe.
 * Score base sur 4 criteres : longueur >= 8, majuscule, chiffre, special.
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: '',
      color: '',
      checks: PASSWORD_CHECKS.map((c) => ({ label: c.label, met: false })),
    };
  }

  const checks: PasswordCheck[] = PASSWORD_CHECKS.map((c) => ({
    label: c.label,
    met: c.test(password),
  }));

  const score = Math.min(4, checks.filter((c) => c.met).length) as 0 | 1 | 2 | 3 | 4;
  const { label, color } = STRENGTH_LABELS[score];

  return { score, label, color, checks };
}

/**
 * Verifie si le mot de passe satisfait les criteres minimaux.
 * En mode API : 8 chars + majuscule + chiffre
 * En mode localStorage : 6 chars minimum
 */
export function isPasswordValid(password: string, strict = true): boolean {
  if (strict) {
    // Mode API : criteres stricts
    return (
      password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
    );
  }
  // Mode localStorage : criteres relaxes
  return password.length >= 6;
}

// ========================================
// EMAIL
// ========================================

/**
 * Valide le format d'une adresse email.
 * Regex simple mais suffisante pour la plupart des cas.
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

// ========================================
// SIRET
// ========================================

/**
 * Valide un numero SIRET (14 chiffres, algorithme de Luhn).
 * Utilise pour l'onboarding pharmacie.
 */
export function isValidSIRET(siret: string): boolean {
  // Nettoyage : retirer espaces et tirets
  const cleaned = siret.replace(/[\s-]/g, '');

  // Doit etre exactement 14 chiffres
  if (!/^\d{14}$/.test(cleaned)) return false;

  // Algorithme de Luhn
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleaned[i], 10);
    // Doubler les chiffres aux positions paires (index 0, 2, 4, ...)
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  return sum % 10 === 0;
}

// ========================================
// NOM
// ========================================

/**
 * Valide un nom complet (au moins 2 caracteres, pas que des espaces).
 */
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && /[a-zA-ZÀ-ÿ]/.test(trimmed);
}
