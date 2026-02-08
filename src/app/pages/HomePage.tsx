/**
 * PharmaVerif - Page d'accueil
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { useState, useEffect } from 'react';
import { FileCheck, TrendingUp, Shield, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ApiClient } from '../api/client';
import { formatCurrency, formatPercentage } from '../utils/formatNumber';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [stats, setStats] = useState({
    montantRecuperable: 0,
    tauxConformite: 0,
    anomaliesDetectees: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await ApiClient.getStats();
        setStats({
          montantRecuperable: data.economies_potentielles,
          tauxConformite: data.taux_conformite,
          anomaliesDetectees: data.total_anomalies,
        });
      } catch (error) {
        console.error('Erreur lors du chargement des stats:', error);
      }
    };
    loadStats();
  }, []);

  const features = [
    {
      icon: FileCheck,
      title: 'Vérification automatique',
      description: 'Analysez vos factures en quelques secondes pour détecter les anomalies',
    },
    {
      icon: TrendingUp,
      title: 'Récupération des remises',
      description: 'Identifiez les remises manquantes et optimisez vos achats',
    },
    {
      icon: Shield,
      title: 'Conformité garantie',
      description: 'Assurez-vous que vos grossistes respectent les accords commerciaux',
    },
    {
      icon: Clock,
      title: 'Gain de temps',
      description: 'Automatisez le contrôle qui prenait des heures manuellement',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-4 py-2 rounded-full mb-6">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Solution pour pharmacies françaises</span>
          </div>

          {/* Titre de l'application */}
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">PharmaVerif</h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Vérifiez automatiquement vos factures de grossistes pharmaceutiques et détectez les
            remises manquantes en quelques clics
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => onNavigate('verification')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg gap-2"
            >
              <FileCheck className="h-5 w-5" />
              <span>Vérifier une facture</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onNavigate('dashboard')}
              className="px-8 py-6 text-lg"
            >
              Voir le tableau de bord
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-bold text-blue-600 mb-2">
                {formatCurrency(stats.montantRecuperable)}
              </p>
              <p className="text-gray-600 dark:text-gray-400">Récupérables ce mois</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-green-200 dark:border-green-800">
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-bold text-green-600 mb-2">
                {formatPercentage(stats.tauxConformite)}
              </p>
              <p className="text-gray-600 dark:text-gray-400">Taux de conformité</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6 text-center">
              <p className="text-4xl font-bold text-orange-600 mb-2">{stats.anomaliesDetectees}</p>
              <p className="text-gray-600 dark:text-gray-400">Anomalies détectées</p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Pourquoi utiliser PharmaVerif ?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Prêt à optimiser vos achats pharmaceutiques ?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Commencez dès maintenant à vérifier vos factures et récupérez les remises qui vous
              sont dues
            </p>
            <Button
              size="lg"
              onClick={() => onNavigate('verification')}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg"
            >
              Démarrer la vérification
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
