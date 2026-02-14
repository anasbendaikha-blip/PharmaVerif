/**
 * PharmaVerif - Page de reinitialisation de mot de passe
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Deux etats :
 *  1. Formulaire : saisie de l'email
 *  2. Confirmation : message d'envoi du lien
 *
 * En mode API : appel POST /auth/forgot-password
 * En mode localStorage : simulation (affichage direct de la confirmation)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Logo } from '../components/Logo';
import { useTheme } from '../contexts/ThemeContext';
import { isApiMode } from '../api/config';
import { http } from '../api/httpClient';
import { AUTH_ERRORS } from '../utils/authErrors';
import { isValidEmail } from '../utils/validation';

// ========================================
// COMPONENT
// ========================================

export function ForgotPasswordPage() {
  const { resolvedTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Submit handler ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(AUTH_ERRORS.EMPTY_FIELDS);
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError(AUTH_ERRORS.INVALID_EMAIL);
      return;
    }

    setIsLoading(true);

    if (isApiMode()) {
      try {
        await http.post('/auth/forgot-password', { email: email.trim() });
      } catch {
        // On ne revele pas si l'email existe ou non (securite)
        // On affiche toujours la confirmation
      }
    } else {
      // Mode localStorage : simuler un delai
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setIsLoading(false);
    setIsSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Logo variant="icon" theme={resolvedTheme} size="xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PharmaVerif</h1>
        </div>

        {isSent ? (
          /* ======================================== */
          /* ETAT 2 : Confirmation d'envoi             */
          /* ======================================== */
          <div className="space-y-6">
            {/* Icone succes */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>

            {/* Message */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Email envoye !
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {AUTH_ERRORS.RESET_EMAIL_SENT}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                Verifiez egalement votre dossier spam.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                to="/login"
                className="flex items-center justify-center w-full h-11 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Retour a la connexion
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsSent(false);
                  setEmail('');
                }}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Utiliser une autre adresse email
              </button>
            </div>
          </div>
        ) : (
          /* ======================================== */
          /* ETAT 1 : Formulaire                       */
          /* ======================================== */
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Mot de passe oublie ?
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Saisissez votre adresse email et nous vous enverrons un lien pour reinitialiser
                votre mot de passe.
              </p>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Adresse email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                  placeholder="vous@pharmacie.fr"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
              >
                {isLoading ? 'Envoi en cours...' : 'Envoyer le lien de reinitialisation'}
              </Button>
            </form>

            {/* Retour connexion */}
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour a la connexion
            </Link>
          </div>
        )}

        {/* Footer mode */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-500">
          {isApiMode()
            ? 'Connecte au serveur PharmaVerif'
            : 'Prototype — Donnees stockees localement dans votre navigateur'}
        </p>
      </div>
    </div>
  );
}
