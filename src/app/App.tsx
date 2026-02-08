/**
 * PharmaVerif - Main Application
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { VerificationPage } from './pages/VerificationPage';
import { DashboardPage } from './pages/DashboardPage';
import { MentionsLegalesPage } from './pages/MentionsLegalesPage';
import { ContactPage } from './pages/ContactPage';
import { Footer } from './components/Footer';
import { initializeDatabase } from './api/endpoints';
import { Toaster } from './components/ui/sonner';

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
 * Layout principal avec navigation par routes
 */
function AppLayout() {
  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    const routes: Record<string, string> = {
      'home': '/',
      'verification': '/verification',
      'dashboard': '/dashboard',
      'mentions-legales': '/mentions-legales',
      'contact': '/contact',
    };
    navigate(routes[page] || '/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
          <Route path="/verification" element={<VerificationPage onNavigate={handleNavigate} />} />
          <Route path="/dashboard" element={<DashboardPage onNavigate={handleNavigate} />} />
          <Route path="/mentions-legales" element={<MentionsLegalesPage onNavigate={handleNavigate} />} />
          <Route path="/contact" element={<ContactPage onNavigate={handleNavigate} />} />
          <Route path="*" element={<HomePage onNavigate={handleNavigate} />} />
        </Routes>
      </div>
      <Footer onNavigate={handleNavigate} />
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default function App() {
  // Initialiser la base de données au démarrage
  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
