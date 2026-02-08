/**
 * PharmaVerif - Contexte d'authentification
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

interface User {
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const session = localStorage.getItem(STORAGE_KEYS.session);
      if (session) {
        const parsed = JSON.parse(session);
        return { name: parsed.name, email: parsed.email };
      }
    } catch {
      localStorage.removeItem(STORAGE_KEYS.session);
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return false;
    }

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
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setError(null);

    if (!name || !email || !password) {
      setError('Veuillez remplir tous les champs');
      return false;
    }

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
  };

  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEYS.session);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, error }}>
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
