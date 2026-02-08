/**
 * PharmaVerif - Main Application
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { useState, useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { VerificationPage } from './pages/VerificationPage';
import { DashboardPage } from './pages/DashboardPage';
import { MentionsLegalesPage } from './pages/MentionsLegalesPage';
import { ContactPage } from './pages/ContactPage';
import { Footer } from './components/Footer';
import { initializeDatabase } from './api/endpoints';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  // Initialiser la base de données au démarrage (équivalent startup event FastAPI)
  useEffect(() => {
    initializeDatabase();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'verification':
        return <VerificationPage onNavigate={handleNavigate} />;
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'mentions-legales':
        return <MentionsLegalesPage onNavigate={handleNavigate} />;
      case 'contact':
        return <ContactPage onNavigate={handleNavigate} />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {renderPage()}
      </div>
      <Footer onNavigate={handleNavigate} />
      <Toaster richColors position="top-right" />
    </div>
  );
}