/**
 * PharmaVerif - Client HTTP pour communication API
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Wrapper autour de fetch natif — pas de dépendance externe.
 * Gère : JWT, erreurs, 401 redirect, uploads multipart.
 */

import { API_V1_URL } from './config';

// ========================================
// TOKEN MANAGEMENT
// ========================================

const TOKEN_KEY = 'pharmaverif_token';

/**
 * Récupérer le token JWT stocké
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Stocker le token JWT
 */
export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Supprimer le token JWT
 */
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ========================================
// TYPES
// ========================================

export interface HttpError {
  status: number;
  message: string;
  detail?: string;
}

// ========================================
// CORE FETCH WRAPPER
// ========================================

/**
 * Fonction interne pour effectuer une requête HTTP
 *
 * - Attache automatiquement le JWT si présent
 * - Gère les erreurs réseau et HTTP
 * - Redirige vers /login en cas de 401
 * - Ne set pas Content-Type pour FormData (multipart)
 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_V1_URL}${path}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Ne pas set Content-Type pour FormData (le browser le fait avec le boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw {
      status: 0,
      message: 'Erreur de connexion au serveur. Vérifiez votre connexion internet.',
    } as HttpError;
  }

  // 401 → session expirée, redirect login
  if (response.status === 401) {
    clearStoredToken();
    localStorage.removeItem('pharmaverif_session');
    // Ne pas rediriger si déjà sur la page login
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw {
      status: 401,
      message: 'Session expirée. Veuillez vous reconnecter.',
    } as HttpError;
  }

  // Autres erreurs HTTP
  if (!response.ok) {
    let errorBody: Record<string, unknown> = {};
    try {
      errorBody = await response.json();
    } catch {
      // Le body n'est pas du JSON
    }
    throw {
      status: response.status,
      message:
        (errorBody.detail as string) ||
        (errorBody.message as string) ||
        (errorBody.error as string) ||
        `Erreur ${response.status}`,
      detail:
        typeof errorBody.detail === 'string'
          ? errorBody.detail
          : JSON.stringify(errorBody.detail),
    } as HttpError;
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ========================================
// PUBLIC API
// ========================================

export const http = {
  /**
   * GET request
   */
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' });
  },

  /**
   * POST request (JSON body)
   */
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  /**
   * PUT request (JSON body)
   */
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  /**
   * PATCH request (JSON body)
   */
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  /**
   * DELETE request
   */
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },

  /**
   * Upload un fichier via multipart/form-data
   *
   * Ne pas setter Content-Type — le browser le fait automatiquement
   * avec le boundary correct.
   */
  upload<T>(path: string, formData: FormData): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: formData,
    });
  },
};
