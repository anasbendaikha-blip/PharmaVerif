/**
 * PharmaVerif - Contexte d'authentification (dual-mode)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Mode API (VITE_API_URL défini) : auth JWT via backend FastAPI
 * Mode localStorage (VITE_API_URL vide) : auth locale SHA-256 (démo)
 *
 * Fonctionnalités :
 *  - Login / Register / Logout
 *  - Remember Me (localStorage persistant vs sessionStorage)
 *  - clearError() pour effacer les erreurs au changement de page
 *  - Restauration de session au démarrage
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { isApiMode } from '../api/config';
import { http, setStoredToken, getStoredToken, clearStoredToken } from '../api/httpClient';
import type { LoginResponse, BackendUser } from '../api/types';
import { AUTH_ERRORS, extractAuthError } from '../utils/authErrors';

// ========================================
// TYPES
// ========================================

interface User {
  name: string;
  email: string;
  // Champs supplémentaires en mode API
  id?: number;
  nom?: string;
  prenom?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ========================================
// LOCALSTORAGE MODE (démo)
// ========================================

const STORAGE_KEYS = {
  session: 'pharmaverif_session',
  users: 'pharmaverif_users',
};

// Hash simple pour le prototype (SHA-256 via SubtleCrypto)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'pharmaverif_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface StoredUser {
  name: string;
  email: string;
  passwordHash: string;
}

function getStoredUsers(): StoredUser[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.users);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]): void {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

// ========================================
// SESSION STORAGE HELPERS
// ========================================

/**
 * Sauvegarde la session dans le storage approprié selon rememberMe.
 * - rememberMe = true → localStorage (persistant entre sessions navigateur)
 * - rememberMe = false → sessionStorage (perdu à la fermeture)
 */
function saveSession(userData: User, rememberMe: boolean): void {
  const json = JSON.stringify(userData);
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEYS.session, json);
    sessionStorage.removeItem(STORAGE_KEYS.session);
  } else {
    sessionStorage.setItem(STORAGE_KEYS.session, json);
    localStorage.removeItem(STORAGE_KEYS.session);
  }
}

/**
 * Restaure la session depuis sessionStorage (priorité) ou localStorage.
 */
function restoreSessionFromStorage(): User | null {
  try {
    const sessionData =
      sessionStorage.getItem(STORAGE_KEYS.session) ||
      localStorage.getItem(STORAGE_KEYS.session);
    if (sessionData) {
      return JSON.parse(sessionData);
    }
  } catch {
    // Nettoyage en cas de JSON invalide
    sessionStorage.removeItem(STORAGE_KEYS.session);
    localStorage.removeItem(STORAGE_KEYS.session);
  }
  return null;
}

/**
 * Nettoie la session de tous les storages.
 */
function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEYS.session);
  localStorage.removeItem(STORAGE_KEYS.session);
}

// ========================================
// HELPERS
// ========================================

/**
 * Convertir un BackendUser en User frontend
 */
function backendUserToUser(backendUser: BackendUser): User {
  return {
    name: `${backendUser.prenom} ${backendUser.nom}`,
    email: backendUser.email,
    id: backendUser.id,
    nom: backendUser.nom,
    prenom: backendUser.prenom,
    role: backendUser.role,
  };
}

/**
 * Splitter un "nom complet" en prenom et nom pour le backend
 * Ex: "Martin Dupont" → { prenom: "Martin", nom: "Dupont" }
 * Ex: "Martin" → { prenom: "Martin", nom: "Martin" }
 */
function splitName(fullName: string): { prenom: string; nom: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { prenom: parts[0], nom: parts[0] };
  }
  return {
    prenom: parts[0],
    nom: parts.slice(1).join(' '),
  };
}

// ========================================
// PROVIDER
// ========================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restauration de session au démarrage
  useEffect(() => {
    async function restoreSession() {
      if (isApiMode()) {
        // Mode API : vérifier le token JWT
        const token = getStoredToken();
        if (token) {
          try {
            const backendUser = await http.get<BackendUser>('/auth/me');
            const userData = backendUserToUser(backendUser);
            setUser(userData);
            // Mettre à jour les deux storages potentiels
            const existingSession = restoreSessionFromStorage();
            if (existingSession) {
              // Garder le storage où la session existait déjà
              const inSession = sessionStorage.getItem(STORAGE_KEYS.session);
              if (inSession) {
                sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(userData));
              } else {
                localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(userData));
              }
            } else {
              localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(userData));
            }
          } catch {
            // Token expiré ou invalide → clear silencieusement
            clearStoredToken();
            clearSession();
          }
        }
      } else {
        // Mode localStorage : restaurer depuis le storage
        const stored = restoreSessionFromStorage();
        if (stored) {
          setUser({ name: stored.name, email: stored.email });
        }
      }
      setIsLoading(false);
    }

    restoreSession();
  }, []);

  // ==================== CLEAR ERROR ====================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==================== LOGIN ====================

  const login = useCallback(
    async (email: string, password: string, rememberMe = true): Promise<boolean> => {
      setError(null);

      if (!email || !password) {
        setError(AUTH_ERRORS.EMPTY_FIELDS);
        return false;
      }

      if (isApiMode()) {
        // Mode API : authentification JWT
        try {
          const response = await http.post<LoginResponse>('/auth/login', {
            email,
            password,
          });

          // Stocker le token JWT
          setStoredToken(response.token.access_token);

          // Construire l'objet User
          const userData = backendUserToUser(response.user);
          setUser(userData);
          saveSession(userData, rememberMe);

          return true;
        } catch (err: unknown) {
          setError(extractAuthError(err));
          return false;
        }
      } else {
        // Mode localStorage : auth locale SHA-256
        const users = getStoredUsers();
        const hash = await hashPassword(password);
        const found = users.find((u) => u.email === email && u.passwordHash === hash);

        if (!found) {
          setError(AUTH_ERRORS.INVALID_CREDENTIALS);
          return false;
        }

        const userData = { name: found.name, email: found.email };
        setUser(userData);
        saveSession(userData, rememberMe);
        return true;
      }
    },
    []
  );

  // ==================== REGISTER ====================

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      setError(null);

      if (!name || !email || !password) {
        setError(AUTH_ERRORS.EMPTY_FIELDS);
        return false;
      }

      if (isApiMode()) {
        // Mode API : inscription via backend
        try {
          const { prenom, nom } = splitName(name);

          // Le backend register retourne un UserResponse (pas de token auto)
          // On fait register puis login
          await http.post<BackendUser>('/auth/register', {
            email,
            password,
            nom,
            prenom,
          });

          // Après inscription réussie, on se connecte pour obtenir le token
          const loginResponse = await http.post<LoginResponse>('/auth/login', {
            email,
            password,
          });

          setStoredToken(loginResponse.token.access_token);
          const userData = backendUserToUser(loginResponse.user);
          setUser(userData);
          saveSession(userData, true); // Toujours remember après inscription

          return true;
        } catch (err: unknown) {
          setError(extractAuthError(err));
          return false;
        }
      } else {
        // Mode localStorage : inscription locale
        if (password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères');
          return false;
        }

        const users = getStoredUsers();
        if (users.find((u) => u.email === email)) {
          setError(AUTH_ERRORS.EMAIL_EXISTS);
          return false;
        }

        const hash = await hashPassword(password);
        users.push({ name, email, passwordHash: hash });
        saveStoredUsers(users);

        const userData = { name, email };
        setUser(userData);
        saveSession(userData, true); // Toujours remember après inscription
        return true;
      }
    },
    []
  );

  // ==================== LOGOUT ====================

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    clearSession();

    // En mode API, supprimer aussi le token JWT
    if (isApiMode()) {
      clearStoredToken();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        clearError,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
