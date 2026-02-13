/**
 * PharmaVerif - Onboarding Step 1 : Votre Pharmacie
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Formulaire infos pharmacie (nom, SIRET, adresse, titulaire).
 * Pre-rempli depuis les donnees existantes.
 * Sauvegarde via pharmacyApi.updateMyPharmacy().
 */

import { useState, useEffect } from 'react';
import { Store, MapPin, FileText, User } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { pharmacyApi } from '../../api/pharmacyApi';
import type { PharmacyResponse } from '../../api/types';
import { toast } from 'sonner';

// ========================================
// TYPES
// ========================================

interface StepPharmacieProps {
  pharmacyData: PharmacyResponse | null;
  onComplete: (data: PharmacyResponse) => void;
  onSkip: () => void;
}

// ========================================
// COMPONENT
// ========================================

export function StepPharmacie({ pharmacyData, onComplete, onSkip }: StepPharmacieProps) {
  const [nom, setNom] = useState('');
  const [siret, setSiret] = useState('');
  const [adresse, setAdresse] = useState('');
  const [titulaire, setTitulaire] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill from existing data
  useEffect(() => {
    if (pharmacyData) {
      setNom(pharmacyData.nom || '');
      setSiret(pharmacyData.siret || '');
      setAdresse(pharmacyData.adresse || '');
      setTitulaire(pharmacyData.titulaire || '');
    }
  }, [pharmacyData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nom.trim()) {
      toast.error('Le nom de la pharmacie est requis');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await pharmacyApi.updateMyPharmacy({
        nom: nom.trim(),
        siret: siret.trim() || null,
        adresse: adresse.trim() || null,
        titulaire: titulaire.trim() || null,
      });
      toast.success('Informations pharmacie enregistrees');
      onComplete(updated);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
    setIsSaving(false);
  };

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
          <Store className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          Votre Pharmacie
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Renseignez les informations de votre officine
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nom */}
        <div>
          <Label htmlFor="onb-nom" className="text-gray-700 dark:text-gray-300">
            Nom de la pharmacie <span className="text-red-500">*</span>
          </Label>
          <div className="relative mt-1">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="onb-nom"
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
              placeholder="Pharmacie du Centre"
              required
            />
          </div>
        </div>

        {/* SIRET */}
        <div>
          <Label htmlFor="onb-siret" className="text-gray-700 dark:text-gray-300">
            SIRET
          </Label>
          <div className="relative mt-1">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="onb-siret"
              type="text"
              value={siret}
              onChange={(e) => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
              placeholder="12345678901234"
              maxLength={14}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">14 chiffres</p>
        </div>

        {/* Adresse */}
        <div>
          <Label htmlFor="onb-adresse" className="text-gray-700 dark:text-gray-300">
            Adresse
          </Label>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <textarea
              id="onb-adresse"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px] resize-none"
              placeholder="12 Rue de la Sante, 75013 Paris"
              rows={2}
            />
          </div>
        </div>

        {/* Titulaire */}
        <div>
          <Label htmlFor="onb-titulaire" className="text-gray-700 dark:text-gray-300">
            Titulaire
          </Label>
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="onb-titulaire"
              type="text"
              value={titulaire}
              onChange={(e) => setTitulaire(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
              placeholder="Dr. Martin Dupont"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSaving}
            className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
          >
            {isSaving ? 'Enregistrement...' : 'Suivant'}
          </Button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Passer cette etape
          </button>
        </div>
      </form>
    </div>
  );
}
