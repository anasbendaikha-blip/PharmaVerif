/**
 * PharmaVerif - Page de connexion (Split-Screen)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Layout split-screen professionnel :
 *  - Panel gauche : branding + features (visible lg+)
 *  - Panel droit : formulaire de connexion
 *
 * Fonctionnalites :
 *  - Show/hide password toggle
 *  - Remember me (localStorage vs sessionStorage)
 *  - Lien mot de passe oublie
 *  - Lien vers inscription
 *  - Messages d'erreur en francais
 *  - Support dark mode + responsive
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  FileCheck,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { isApiMode } from '../api/config';
import { pharmacyApi } from '../api/pharmacyApi';
import { toast } from 'sonner';
import { AUTH_ERRORS } from '../utils/authErrors';

// ========================================
// FEATURES DATA (panel gauche)
// ========================================

const FEATURES = [
  {
    icon: Shield,
    title: 'Verification automatisee',
    description: 'Detection intelligente des anomalies et ecarts de prix sur vos factures.',
  },
  {
    icon: FileCheck,
    title: 'Conformite garantie',
    description: 'Controle systematique des marges, remises et conditions commerciales.',
  },
  {
    icon: TrendingUp,
    title: 'Suivi en temps reel',
    description: 'Tableaux de bord et rapports detailles pour piloter votre activite.',
  },
];

// ========================================
// COMPONENT
// ========================================

export function LoginPage() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();
  const { resolvedTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Clear errors au montage
  useEffect(() => {
    clearError();
  }, [clearError]);

  // ---- Submit handler ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await login(email, password, rememberMe);
    if (success) {
      toast.success(AUTH_ERRORS.LOGIN_SUCCESS);

      // En mode API, verifier si l'onboarding est complete
      if (isApiMode()) {
        try {
          const pharmacy = await pharmacyApi.getMyPharmacy();
          if (!pharmacy.onboarding_completed) {
            navigate('/onboarding');
            setIsLoading(false);
            return;
          }
        } catch {
          // Erreur — on continue vers le dashboard
        }
      }

      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* ============================================ */}
      {/* PANEL GAUCHE — Branding (hidden sur mobile)  */}
      {/* ============================================ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
        {/* Motif decoratif */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400 rounded-full blur-2xl" />
        </div>

        {/* Contenu */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo en haut */}
          <div>
            <Logo variant="horizontal" theme="dark" size="lg" />
          </div>

          {/* Features au centre */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold leading-tight">
                Simplifiez la verification
                <br />
                de vos factures
              </h2>
              <p className="mt-3 text-blue-100 text-lg">
                La plateforme de reference pour les pharmaciens.
              </p>
            </div>

            <div className="space-y-6">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-blue-100" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm text-blue-200 mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer panel gauche */}
          <p className="text-xs text-blue-300">
            &copy; 2026 PharmaVerif — Tous droits reserves
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* PANEL DROIT — Formulaire de connexion         */}
      {/* ============================================ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile (visible uniquement < lg) */}
          <div className="lg:hidden text-center">
            <div className="flex justify-center mb-3">
              <Logo variant="icon" theme={resolvedTheme} size="xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PharmaVerif</h1>
          </div>

          {/* Header formulaire */}
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Connexion
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Accedez a votre espace de verification de factures
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
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Adresse email</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                placeholder="vous@pharmacie.fr"
                autoComplete="email"
                required
              />
            </div>

            {/* Password avec show/hide */}
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="h-4 w-4" />}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Se souvenir de moi
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Mot de passe oublie ?
              </Link>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
            >
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>

          {/* Separateur inscription */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-800 px-4 text-gray-500 dark:text-gray-400">
                Pas encore de compte ?
              </span>
            </div>
          </div>

          {/* Lien inscription */}
          <Link
            to="/signup"
            className="flex items-center justify-center w-full h-11 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Creer un compte gratuitement
          </Link>

          {/* Footer mode */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-500">
            {isApiMode()
              ? 'Connecte au serveur PharmaVerif'
              : 'Prototype — Donnees stockees localement dans votre navigateur'}
          </p>
        </div>
      </div>
    </div>
  );
}
