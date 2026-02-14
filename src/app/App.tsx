/**
 * PharmaVerif - Main Application
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Architecture de routes a deux niveaux :
 *  - Routes "bare" (sans AppLayout) : /login, /onboarding
 *  - Routes "app" (avec AppLayout) : toutes les autres
 *
 * Les pages API-only sont filtrees dans la navigation (pas dans le router).
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { VerificationPage } from './pages/VerificationPage';
import { DashboardPage } from './pages/DashboardPage';
import { MentionsLegalesPage } from './pages/MentionsLegalesPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ReportsPage } from './pages/ReportsPage';
import { FournisseursPage } from './pages/FournisseursPage';
import { FacturesLaboPage } from './pages/FacturesLaboPage';
import { EMACPage } from './pages/EMACPage';
import { AnalysePrixPage } from './pages/AnalysePrixPage';
import { MaPharmacePage } from './pages/MaPharmacePage';
import { FacturesPage } from './pages/FacturesPage';
import { DemoPage } from './pages/DemoPage';
import { UploadPage } from './pages/UploadPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout';
import { initializeDatabase } from './api/endpoints';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * Scroll to top on route change
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

/**
 * Routes "app" rendues DANS AppLayout (sidebar + header + footer)
 */
function AppLayoutRoutes() {
  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    const routes: Record<string, string> = {
      home: '/',
      verification: '/verification',
      dashboard: '/dashboard',
      reports: '/reports',
      fournisseurs: '/fournisseurs',
      factures: '/factures',
      'factures-labo': '/factures-labo',
      emac: '/emac',
      'analyse-prix': '/analyse-prix',
      pharmacie: '/pharmacie',
      upload: '/upload',
      demo: '/demo',
      'mentions-legales': '/mentions-legales',
      contact: '/contact',
      login: '/login',
    };
    navigate(routes[page] || '/');
  };

  return (
    <AppLayout>
      <ErrorBoundary level="route">
      <Routes>
        <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
        <Route
          path="/verification"
          element={
            <ProtectedRoute>
              <VerificationPage onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fournisseurs"
          element={
            <ProtectedRoute>
              <FournisseursPage onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/factures"
          element={
            <ProtectedRoute>
              <FacturesPage onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/factures-labo"
          element={
            <ProtectedRoute>
              <FacturesLaboPage onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/emac"
          element={
            <ProtectedRoute>
              <EMACPage onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyse-prix"
          element={
            <ProtectedRoute>
              <AnalysePrixPage onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pharmacie"
          element={
            <ProtectedRoute>
              <MaPharmacePage onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage onNavigate={handleNavigate} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/demo"
          element={<DemoPage onNavigate={handleNavigate} />}
        />
        <Route
          path="/mentions-legales"
          element={<MentionsLegalesPage onNavigate={handleNavigate} />}
        />
        <Route path="/contact" element={<ContactPage onNavigate={handleNavigate} />} />
        <Route path="*" element={<HomePage onNavigate={handleNavigate} />} />
      </Routes>
      </ErrorBoundary>
    </AppLayout>
  );
}

/**
 * Routes principales — deux niveaux :
 *  1. Routes bare (login, onboarding) sans sidebar/header
 *  2. Routes app avec AppLayout
 */
function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Routes BARE — pas d'AppLayout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Routes APP — avec AppLayout (sidebar + header + footer) */}
        <Route path="/*" element={<AppLayoutRoutes />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}

export default function App() {
  // Initialiser la base de donnees au demarrage
  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary level="app">
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}
