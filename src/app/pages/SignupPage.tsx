/**
 * PharmaVerif - Page d'inscription (Split-Screen)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Layout split-screen professionnel :
 *  - Panel gauche : branding + features (visible lg+)
 *  - Panel droit : formulaire d'inscription
 *
 * Fonctionnalites :
 *  - Indicateur de force du mot de passe (4 barres)
 *  - Checklist des criteres de securite
 *  - Validation en temps reel (email, confirmation mdp)
 *  - Show/hide password toggle
 *  - Messages d'erreur en francais
 *  - Support dark mode + responsive
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
  X,
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
import { toast } from 'sonner';
import { AUTH_ERRORS } from '../utils/authErrors';
import { calculatePasswordStrength, isValidEmail, type PasswordStrength } from '../utils/validation';
import { cn } from '../components/ui/utils';

// ========================================
// FEATURES DATA (panel gauche)
// ========================================

const FEATURES = [
  {
    icon: Shield,
    title: 'Securite renforcee',
    description: 'Vos donnees sont chiffrees et protegees selon les normes en vigueur.',
  },
  {
    icon: FileCheck,
    title: 'Prise en main rapide',
    description: 'Interface intuitive concue pour les professionnels de la pharmacie.',
  },
  {
    icon: TrendingUp,
    title: 'Essai gratuit',
    description: 'Testez toutes les fonctionnalites sans engagement.',
  },
];

// ========================================
// PASSWORD STRENGTH METER
// ========================================

const STRENGTH_BAR_COLORS: Record<number, string> = {
  0: 'bg-gray-200 dark:bg-gray-700',
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-emerald-500',
};

const STRENGTH_TEXT_COLORS: Record<number, string> = {
  0: 'text-gray-400 dark:text-gray-500',
  1: 'text-red-600 dark:text-red-400',
  2: 'text-orange-600 dark:text-orange-400',
  3: 'text-yellow-600 dark:text-yellow-400',
  4: 'text-emerald-600 dark:text-emerald-400',
};

function PasswordStrengthMeter({ strength }: { strength: PasswordStrength }) {
  if (!strength.label) return null;

  return (
    <div className="mt-3 space-y-3">
      {/* Barres */}
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                i < strength.score
                  ? STRENGTH_BAR_COLORS[strength.score]
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          ))}
        </div>
        <p className={cn('text-xs font-medium', STRENGTH_TEXT_COLORS[strength.score])}>
          {strength.label}
        </p>
      </div>

      {/* Criteres */}
      <ul className="space-y-1">
        {strength.checks.map((check) => (
          <li
            key={check.label}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              check.met
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {check.met ? (
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ========================================
// COMPONENT
// ========================================

export function SignupPage() {
  const navigate = useNavigate();
  const { register, error, clearError } = useAuth();
  const { resolvedTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation state (affiches apres interaction)
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Password strength
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Validation derivee
  const emailError = emailTouched && email && !isValidEmail(email);
  const confirmError = confirmTouched && confirmPassword && password !== confirmPassword;
  const canSubmit =
    name.trim().length >= 2 &&
    isValidEmail(email) &&
    password.length >= (isApiMode() ? 8 : 6) &&
    password === confirmPassword;

  // Clear errors au montage
  useEffect(() => {
    clearError();
  }, [clearError]);

  // ---- Submit handler ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(AUTH_ERRORS.PASSWORDS_MISMATCH);
      return;
    }

    setIsLoading(true);
    const success = await register(name.trim(), email.trim(), password);
    if (success) {
      toast.success(AUTH_ERRORS.REGISTER_SUCCESS);

      // En mode API, toujours aller vers l'onboarding apres inscription
      if (isApiMode()) {
        navigate('/onboarding');
        setIsLoading(false);
        return;
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
                Rejoignez PharmaVerif
              </h2>
              <p className="mt-3 text-blue-100 text-lg">
                Creez votre compte et commencez a verifier vos factures en quelques minutes.
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
      {/* PANEL DROIT — Formulaire d'inscription        */}
      {/* ============================================ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="w-full max-w-md space-y-6">
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
              Creer un compte
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Commencez a verifier vos factures en quelques minutes
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom complet */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Nom complet</Label>
              <Input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User className="h-4 w-4" />}
                placeholder="Dr. Martin Dupont"
                autoComplete="name"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Adresse email</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                icon={<Mail className="h-4 w-4" />}
                placeholder="vous@pharmacie.fr"
                autoComplete="email"
                error={emailError || false}
                required
              />
              {emailError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {AUTH_ERRORS.INVALID_EMAIL}
                </p>
              )}
            </div>

            {/* Password avec strength meter */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="h-4 w-4" />}
                  placeholder="Creez un mot de passe securise"
                  autoComplete="new-password"
                  className="pr-11"
                  required
                  minLength={isApiMode() ? 8 : 6}
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

              {/* Strength meter */}
              <PasswordStrengthMeter strength={strength} />
            </div>

            {/* Confirmation password */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="signup-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setConfirmTouched(true)}
                  icon={<Lock className="h-4 w-4" />}
                  placeholder="Retapez votre mot de passe"
                  autoComplete="new-password"
                  className="pr-11"
                  error={confirmError || false}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {AUTH_ERRORS.PASSWORDS_MISMATCH}
                </p>
              )}
              {confirmTouched && confirmPassword && !confirmError && password === confirmPassword && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Les mots de passe correspondent
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 mt-2"
            >
              {isLoading ? 'Creation du compte...' : 'Creer mon compte'}
            </Button>
          </form>

          {/* Separateur connexion */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-800 px-4 text-gray-500 dark:text-gray-400">
                Deja un compte ?
              </span>
            </div>
          </div>

          {/* Lien connexion */}
          <Link
            to="/login"
            className="flex items-center justify-center w-full h-11 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Se connecter
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
