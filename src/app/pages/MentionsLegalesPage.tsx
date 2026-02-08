/**
 * PharmaVerif - Mentions Légales Page
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Logo } from '../components/Logo';

interface MentionsLegalesPageProps {
  onNavigate: (page: string) => void;
}

export function MentionsLegalesPage({ onNavigate }: MentionsLegalesPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="horizontal" />
            <Button
              variant="ghost"
              onClick={() => onNavigate('home')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Mentions Légales</h1>

          {/* Éditeur du site */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded"></span>
              Éditeur du site
            </h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Nom :</strong> Anas BENDAIKHA</p>
              <p><strong>Application :</strong> PharmaVerif</p>
              <p><strong>Version :</strong> Prototype (Démonstration)</p>
              <p><strong>Email :</strong> <a href="mailto:contact@pharmaverif.demo" className="text-blue-600 hover:underline">contact@pharmaverif.demo</a></p>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded"></span>
              Propriété intellectuelle
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                L'ensemble du contenu de cette application (structure, design, code source, textes, graphiques, logos, 
                et fonctionnalités) est la propriété exclusive de <strong>Anas BENDAIKHA</strong> et est protégé par 
                les lois françaises et internationales relatives à la propriété intellectuelle.
              </p>
              <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-4">
                <strong className="text-amber-800">⚠️ Droits réservés :</strong> Toute reproduction, distribution, 
                modification, adaptation, retransmission ou publication de ces différents éléments est strictement 
                interdite sans l'accord écrit préalable de l'auteur.
              </p>
            </div>
          </section>

          {/* Hébergement */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded"></span>
              Hébergement
            </h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Type :</strong> Application locale (Prototype de démonstration)</p>
              <p><strong>Environnement :</strong> Développement / Présentation</p>
              <p className="text-sm text-gray-600 italic">
                Cette version prototype fonctionne en local et n'est pas déployée sur un serveur public.
              </p>
            </div>
          </section>

          {/* Protection des données */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded"></span>
              Protection des données personnelles
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Dans le cadre de ce prototype de démonstration, <strong>aucune donnée personnelle réelle n'est collectée</strong>. 
                Toutes les données affichées sont des exemples générés automatiquement à des fins de démonstration.
              </p>
              <p className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-4">
                <strong className="text-blue-800">🛡️ RGPD :</strong> En cas de déploiement en production, l'application 
                serait conforme au Règlement Général sur la Protection des Données (RGPD) et respecterait les droits 
                des utilisateurs (accès, rectification, suppression des données).
              </p>
            </div>
          </section>

          {/* Limitation de responsabilité */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded"></span>
              Limitation de responsabilité
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Ce logiciel est fourni en l'état, à titre de <strong>prototype de démonstration</strong>. 
                L'auteur ne peut être tenu responsable des dommages directs ou indirects résultant de l'utilisation 
                de cette application.
              </p>
              <p>
                Les informations fournies par l'application sont générées automatiquement à des fins d'illustration 
                et ne constituent pas des conseils professionnels. Pour toute décision d'ordre pharmaceutique ou 
                financier, consultez un professionnel qualifié.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded"></span>
              Contact
            </h2>
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border border-blue-200">
              <p className="text-gray-700 mb-3">
                Pour toute question relative à cette application, à son utilisation ou pour toute demande de licence :
              </p>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-gray-800">
                  <span className="font-semibold">📧 Email :</span>
                  <a href="mailto:contact@pharmaverif.demo" className="text-blue-600 hover:underline">
                    contact@pharmaverif.demo
                  </a>
                </p>
                <p className="flex items-center gap-2 text-gray-800">
                  <span className="font-semibold">💼 Auteur :</span>
                  Anas BENDAIKHA
                </p>
              </div>
            </div>
          </section>

          {/* Copyright */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} PharmaVerif - Tous droits réservés
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Dernière mise à jour : Février 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}