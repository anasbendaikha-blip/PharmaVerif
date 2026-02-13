/**
 * PharmaVerif - Onboarding Step 2 : Vos Laboratoires
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Selection de laboratoires depuis les templates pre-configures.
 * Cree les templates au mount puis affiche une grille de cartes checkbox.
 * Les labos decoches sont desactives (actif=false).
 */

import { useState, useEffect } from 'react';
import { FlaskConical, CheckSquare, Square, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { laboratoiresApi } from '../../api/laboratoiresApi';
import type { LaboratoireResponse } from '../../api/types';
import { toast } from 'sonner';

// ========================================
// TYPES
// ========================================

interface StepLaboratoiresProps {
  onComplete: (selectedLabs: LaboratoireResponse[]) => void;
  onSkip: () => void;
}

// ========================================
// COMPONENT
// ========================================

export function StepLaboratoires({ onComplete, onSkip }: StepLaboratoiresProps) {
  const [labs, setLabs] = useState<LaboratoireResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load labs on mount
  useEffect(() => {
    async function loadLabs() {
      try {
        // Init templates (idempotent — may fail if already created)
        try {
          await laboratoiresApi.initTemplates();
        } catch {
          // Templates already exist, that's fine
        }

        // List all labs
        const allLabs = await laboratoiresApi.list();
        setLabs(allLabs);

        // All checked by default
        setSelectedIds(new Set(allLabs.map((l) => l.id)));
      } catch {
        toast.error('Erreur lors du chargement des laboratoires');
      }
      setIsLoading(false);
    }

    loadLabs();
  }, []);

  const toggleLab = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === labs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(labs.map((l) => l.id)));
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      // Deactivate unchecked labs
      const deactivatePromises = labs
        .filter((l) => !selectedIds.has(l.id))
        .map((l) => laboratoiresApi.update(l.id, { nom: l.nom, actif: false }));

      await Promise.all(deactivatePromises);

      const selected = labs.filter((l) => selectedIds.has(l.id));
      toast.success(`${selected.length} laboratoire${selected.length > 1 ? 's' : ''} configure${selected.length > 1 ? 's' : ''}`);
      onComplete(selected);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
    setIsSaving(false);
  };

  const allSelected = selectedIds.size === labs.length;

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-3">
          <FlaskConical className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          Vos Laboratoires
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Selectionnez les laboratoires avec lesquels vous travaillez
        </p>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-3" />
          <p className="text-sm text-gray-500">Chargement des laboratoires...</p>
        </div>
      ) : (
        <>
          {/* Toggle all */}
          {labs.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedIds.size} / {labs.length} selectionne{selectedIds.size > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {allSelected ? 'Tout deselectionner' : 'Tout selectionner'}
              </button>
            </div>
          )}

          {/* Labs grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {labs.map((lab) => {
              const isSelected = selectedIds.has(lab.id);
              return (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => toggleLab(lab.id)}
                  className={`
                    flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left min-h-[60px]
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Square className="h-5 w-5 shrink-0 text-gray-400" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {lab.nom}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                      {lab.type}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Empty state */}
          {labs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Aucun laboratoire disponible</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="button"
              onClick={handleSubmit}
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
        </>
      )}
    </div>
  );
}
