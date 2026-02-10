/**
 * PharmaVerif - Configuration API
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Détermine si l'app fonctionne en mode API (backend réel) ou localStorage (démo).
 */

/**
 * URL de base du backend (vide = mode localStorage)
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL || '';

/**
 * URL complète du préfixe API v1
 */
export const API_V1_URL: string = API_BASE_URL ? `${API_BASE_URL}/api/v1` : '';

/**
 * Retourne true quand VITE_API_URL est défini et non-vide.
 *
 * En mode API :
 * - L'auth utilise le backend JWT (login, register, /me)
 * - La page Factures Labo est disponible (upload PDF, analyse RFA)
 *
 * En mode localStorage :
 * - L'auth utilise SHA-256 + localStorage (comportement actuel)
 * - Les pages existantes fonctionnent normalement
 * - La page Factures Labo n'apparaît pas dans le menu
 */
export function isApiMode(): boolean {
  return API_V1_URL.length > 0;
}
