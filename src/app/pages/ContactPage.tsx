/**
 * PharmaVerif - Contact Page
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { ArrowLeft, Mail, MessageSquare, Shield, Briefcase } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Logo } from '../components/Logo';
import { Card, CardContent } from '../components/ui/card';

interface ContactPageProps {
  onNavigate: (page: string) => void;
}

export function ContactPage({ onNavigate }: ContactPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="horizontal" />
            <Button variant="ghost" onClick={() => onNavigate('home')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Contactez-nous</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Une question sur PharmaVerif ? Intéressé par une licence d'utilisation ? N'hésitez pas à
            nous contacter.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Email Contact */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Email</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Pour toute question générale ou demande d'information
                  </p>
                  <a
                    href="mailto:contact@pharmaverif.demo"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    contact@pharmaverif.demo
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Contact */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Licences & Partenariats
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Pour une demande de licence ou un partenariat commercial
                  </p>
                  <a
                    href="mailto:business@pharmaverif.demo"
                    className="text-green-600 hover:underline font-medium"
                  >
                    business@pharmaverif.demo
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Support Technique
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Pour toute assistance technique ou signalement de bug
                  </p>
                  <a
                    href="mailto:support@pharmaverif.demo"
                    className="text-orange-600 hover:underline font-medium"
                  >
                    support@pharmaverif.demo
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Protection */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Protection des Données
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Pour exercer vos droits RGPD (accès, rectification, suppression)
                  </p>
                  <a
                    href="mailto:dpo@pharmaverif.demo"
                    className="text-purple-600 hover:underline font-medium"
                  >
                    dpo@pharmaverif.demo
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Developer Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                À propos du développeur
              </h2>
              <div className="max-w-2xl mx-auto space-y-3 text-gray-700 dark:text-gray-300">
                <p>
                  <strong>PharmaVerif</strong> a été développé par <strong>Anas BENDAIKHA</strong>
                  dans le cadre d'un projet de démonstration de compétences en développement web.
                </p>
                <p className="text-sm">
                  Cette application prototype illustre la conception d'un système intelligent de
                  vérification de factures pharmaceutiques avec détection automatique d'anomalies.
                </p>
              </div>
              <div className="mt-6 pt-6 border-t border-blue-200">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <strong>Auteur :</strong> Anas BENDAIKHA
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Portfolio :</strong>{' '}
                  <a
                    href="https://www.votre-portfolio.com"
                    className="text-blue-600 hover:underline"
                  >
                    www.votre-portfolio.com
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <p className="text-sm text-amber-800 text-center">
            <strong>Note importante :</strong> Cette version est un prototype de démonstration. Les
            adresses email affichées sont fictives et à titre d'illustration uniquement.
          </p>
        </div>
      </div>
    </div>
  );
}
