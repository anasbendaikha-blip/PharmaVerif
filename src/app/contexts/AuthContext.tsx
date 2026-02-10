/**
 * PharmaVerif - Contexte d'authentification (dual-mode)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Mode API (VITE_API_URL défini) : auth JWT via backend FastAPI
 * Mode localStorage (VITE_API_URL vide) : auth locale SHA-256 (démo)
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { isApiMode } from '../api/config';
import { http, setStoredToken, getStoredToken, clearStoredToken } from '../api/httpClient';
import type { LoginResponse, BackendUser } from '../api/types';

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
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
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
            localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(userData));
          } catch {
            // Token expiré ou invalide → clear silencieusement
            clearStoredToken();
            localStorage.removeItem(STORAGE_KEYS.session);
          }
        }
      } else {
        // Mode localStorage : restaurer depuis le storage
        try {
          const session = localStorage.getItem(STORAGE_KEYS.session);
          if (session) {
            const parsed = JSON.parse(session);
            setUser({ name: parsed.name, email: parsed.email });
          }
        } catch {
          localStorage.removeItem(STORAGE_KEYS.session);
        }
      }
      setIsLoading(false);
    }

    restoreSession();
  }, []);

  // ==================== LOGIN ====================

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
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
        localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(userData));

        return true;
      } catch (err: unknown) {
        const httpErr = err as { message?: string; status?: number };
        if (httpErr.status === 401) {
          setError('Email ou mot de passe incorrect');
        } else {
          setError(httpErr.message || 'Erreur de connexion au serveur');
        }
        return false;
      }
    } else {
      // Mode localStorage : auth locale SHA-256
      const users = getStoredUsers();
      const hash = await hashPassword(password);
      const found = users.find((u) => u.email === email && u.passwordHash === hash);

      if (!found) {
        setError('Email ou mot de passe incorrect');
        return false;
      }

      const userData = { name: found.name, email: found.email };
      setUser(userData);
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(userData));
      return true;
    }
  };

  // ==================== REGISTER ====================

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setError(null);

    if (!name || !email || !password) {
      setError('Veuillez remplir tous les champs');
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
        localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(userData));

        return true;
      } catch (err: unknown) {
        const httpErr = err as { message?: string; detail?: string };
        setError(httpErr.detail || httpErr.message || "Erreur lors de l'inscription");
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
        setError('Un compte existe déjà avec cet email');
        return false;
      }

      const hash = await hashPassword(password);
      users.push({ name, email, passwordHash: hash });
      saveStoredUsers(users);

      const userData = { name, email };
      setUser(userData);
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(userData));
      return true;
    }
  };

  // ==================== LOGOUT ====================

  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEYS.session);

    // En mode API, supprimer aussi le token JWT
    if (isApiMode()) {
      clearStoredToken();
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, error }}
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
