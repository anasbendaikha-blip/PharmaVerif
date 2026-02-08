/**
 * PharmaVerif - Footer Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright & Developer */}
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              © {currentYear} PharmaVerif
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Développé par{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">Anas BENDAIKHA</span>
            </p>
          </div>

          {/* Version Badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
              Version Prototype
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => onNavigate?.('mentions-legales')}
              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Mentions légales
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={() => onNavigate?.('contact')}
              className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Contact
            </button>
          </div>
        </div>

        {/* Copyright Notice */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Tous droits réservés. Ce logiciel est protégé par les lois sur la propriété
            intellectuelle. Toute reproduction, distribution ou utilisation non autorisée est
            strictement interdite.
          </p>
        </div>
      </div>
    </footer>
  );
}
