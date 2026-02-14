/**
 * PharmaVerif - SavedSearches Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Gestion des recherches sauvegardees (localStorage) :
 *  - Liste des recherches avec nom + date
 *  - Clic pour charger une recherche
 *  - Suppression avec hover reveal
 *  - Modal de sauvegarde (nom)
 *  - Empty state
 */

import { useState, useCallback } from 'react';
import { Bookmark, Trash2, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../ui/utils';
import { toast } from 'sonner';
import type { InvoiceFilters, SavedSearch } from '../../types/filters';
import {
  loadSavedSearches,
  saveSearch,
  deleteSavedSearch,
} from '../../utils/filterUtils';
import { formatDateShortFR } from '../../utils/formatNumber';

// ========================================
// TYPES
// ========================================

interface SavedSearchesProps {
  /** Filtres actuels (pour la sauvegarde) */
  currentFilters: InvoiceFilters;
  /** Callback pour charger une recherche sauvegardee */
  onLoadSearch: (filters: InvoiceFilters) => void;
  /** Classe CSS additionnelle */
  className?: string;
}

// ========================================
// COMPONENT
// ========================================

export function SavedSearches({
  currentFilters,
  onLoadSearch,
  className,
}: SavedSearchesProps) {
  const [searches, setSearches] = useState<SavedSearch[]>(() => loadSavedSearches());
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    saveSearch(saveName.trim(), currentFilters);
    setSearches(loadSavedSearches());
    setSaveName('');
    setShowSaveInput(false);
    toast.success(`Recherche "${saveName.trim()}" sauvegardée`);
  }, [saveName, currentFilters]);

  const handleDelete = useCallback((id: number) => {
    deleteSavedSearch(id);
    setSearches(loadSavedSearches());
    toast.success('Recherche supprimée');
  }, []);

  const handleLoad = useCallback((search: SavedSearch) => {
    onLoadSearch(search.filters);
    toast.success(`Recherche "${search.name}" chargée`);
  }, [onLoadSearch]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-muted-foreground" />
            Recherches sauvegardées
          </CardTitle>
          {!showSaveInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaveInput(true)}
              className="gap-1.5 h-7 text-xs text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Sauvegarder
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Save input */}
        {showSaveInput && (
          <div className="flex gap-2 mb-3">
            <Input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Nom de la recherche..."
              className="flex-1 h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setShowSaveInput(false);
              }}
              autoFocus
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="h-8 px-3 text-xs"
            >
              OK
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaveInput(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* List */}
        {searches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune recherche sauvegardée
          </p>
        ) : (
          <div className="space-y-1">
            {searches.map((search) => (
              <div
                key={search.id}
                className={cn(
                  'flex items-center justify-between gap-2',
                  'px-2 py-1.5 rounded-md',
                  'hover:bg-muted group',
                  'transition-colors cursor-pointer'
                )}
                onClick={() => handleLoad(search)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {search.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateShortFR(search.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(search.id);
                  }}
                  className={cn(
                    'opacity-0 group-hover:opacity-100',
                    'text-muted-foreground hover:text-destructive',
                    'transition-opacity p-1'
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
