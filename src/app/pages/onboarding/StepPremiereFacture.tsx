/**
 * PharmaVerif - Onboarding Step 3 : Votre Premiere Facture
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Upload PDF + analyse automatique.
 * Selecteur de laboratoire + zone drag-and-drop.
 * C'est l'etape la plus "skippable".
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, FlaskConical } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { facturesLaboApi } from '../../api/facturesLabo';
import { laboratoiresApi } from '../../api/laboratoiresApi';
import type { LaboratoireResponse, UploadLaboResponse } from '../../api/types';
import { formatCurrency } from '../../utils/formatNumber';
import { toast } from 'sonner';

// ========================================
// TYPES
// ========================================

interface StepPremiereFactureProps {
  availableLabs: LaboratoireResponse[];
  onComplete: (result: UploadLaboResponse) => void;
  onSkip: () => void;
}

// ========================================
// COMPONENT
// ========================================

export function StepPremiereFacture({ availableLabs, onComplete, onSkip }: StepPremiereFactureProps) {
  const [labs, setLabs] = useState<LaboratoireResponse[]>(availableLabs);
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<UploadLaboResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If no labs passed from step 2 (e.g. user skipped), load them
  useEffect(() => {
    if (availableLabs.length === 0) {
      laboratoiresApi.list(true).then((allLabs) => {
        setLabs(allLabs);
        if (allLabs.length > 0) setSelectedLabId(allLabs[0].id);
      }).catch(() => {});
    } else {
      if (availableLabs.length > 0 && !selectedLabId) {
        setSelectedLabId(availableLabs[0].id);
      }
    }
  }, [availableLabs, selectedLabId]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Seuls les fichiers PDF sont acceptes');
      return;
    }

    if (!selectedLabId) {
      toast.error('Selectionnez un laboratoire');
      return;
    }

    setIsUploading(true);
    try {
      const uploadResult = await facturesLaboApi.upload(file, selectedLabId);
      setResult(uploadResult);
      toast.success('Facture analysee avec succes !');
      // Don't auto-advance — let user see result and click "Suivant"
    } catch {
      toast.error("Erreur lors de l'analyse de la facture");
    }
    setIsUploading(false);
  }, [selectedLabId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
          <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          Votre Premiere Facture
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Uploadez un PDF de facture laboratoire pour decouvrir l'analyse automatique
        </p>
      </div>

      {/* Result view */}
      {result ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Facture analysee avec succes !
              </p>
              {result.facture && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                  N° {result.facture.numero_facture} &mdash; {result.facture.nb_lignes} lignes &mdash; {formatCurrency(result.facture.montant_brut_ht)}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="button"
              onClick={() => onComplete(result)}
              className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
            >
              Voir les resultats
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Lab selector */}
          {labs.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Laboratoire
              </label>
              <div className="relative">
                <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={selectedLabId ?? ''}
                  onChange={(e) => setSelectedLabId(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] appearance-none"
                >
                  <option value="" disabled>Selectionnez un laboratoire</option>
                  {labs.map((lab) => (
                    <option key={lab.id} value={lab.id}>{lab.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl border-2 border-dashed cursor-pointer transition-all
              ${isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
              }
              ${isUploading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
            />

            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Analyse en cours...
                </p>
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Glissez un PDF ici
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  ou cliquez pour parcourir
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Passer cette etape &rarr;
            </button>
          </div>
        </>
      )}
    </div>
  );
}
