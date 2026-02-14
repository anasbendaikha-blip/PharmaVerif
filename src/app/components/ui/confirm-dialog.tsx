/**
 * PharmaVerif - ConfirmDialog Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Dialog modal de confirmation pour actions destructives :
 *  - Rendu via createPortal (isole du DOM parent)
 *  - Backdrop semi-transparent avec clic pour fermer
 *  - Icone d'avertissement + titre + description
 *  - Highlight du nom de l'element concerne
 *  - Boutons Annuler / Confirmer
 *  - Escape ferme le dialog
 *  - Focus automatique sur Annuler (securite)
 *  - Etat loading pendant la suppression
 *  - Animation d'entree/sortie
 *  - Responsive : full-width sur mobile, centree sur desktop
 *  - Touch targets 44px sur les boutons
 */

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './button';
import { cn } from './utils';

// ========================================
// TYPES
// ========================================

interface ConfirmDialogProps {
  /** Controle la visibilite du dialog */
  open: boolean;
  /** Callback pour fermer le dialog (cancel, escape, backdrop) */
  onClose: () => void;
  /** Callback de confirmation (action destructive) */
  onConfirm: () => void;
  /** Titre du dialog */
  title: string;
  /** Description detaillee */
  description?: string;
  /** Nom de l'element concerne (affiche en surbrillance) */
  itemName?: string;
  /** Texte du bouton de confirmation */
  confirmLabel?: string;
  /** Texte du bouton d'annulation */
  cancelLabel?: string;
  /** Variante visuelle */
  variant?: 'danger' | 'warning';
  /** Affiche un spinner sur le bouton de confirmation */
  loading?: boolean;
}

// ========================================
// COMPONENT
// ========================================

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ---- Escape key handler ----
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    },
    [onClose, loading]
  );

  // ---- Bind/unbind escape ----
  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Bloquer le scroll du body
      document.body.style.overflow = 'hidden';
      // Focus sur le bouton Annuler (securite)
      setTimeout(() => cancelRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  // ---- Ne rien rendre si ferme ----
  if (!open) return null;

  // ---- Couleurs selon variante ----
  const iconBg = variant === 'danger'
    ? 'bg-red-100 dark:bg-red-900/30'
    : 'bg-orange-100 dark:bg-orange-900/30';
  const iconColor = variant === 'danger'
    ? 'text-red-600 dark:text-red-400'
    : 'text-orange-600 dark:text-orange-400';
  const warningColor = variant === 'danger'
    ? 'text-red-600 dark:text-red-400'
    : 'text-orange-600 dark:text-orange-400';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? 'confirm-dialog-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={!loading ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        ref={dialogRef}
        className={cn(
          'relative z-10 w-full max-w-md bg-card rounded-xl shadow-2xl',
          'border border-border',
          'transform transition-all',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', iconBg)}>
              <AlertTriangle className={cn('h-6 w-6', iconColor)} />
            </div>
          </div>

          {/* Title */}
          <h3
            id="confirm-dialog-title"
            className="text-lg font-semibold text-foreground text-center mb-2"
          >
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p
              id="confirm-dialog-description"
              className="text-sm text-muted-foreground text-center mb-4"
            >
              {description}
            </p>
          )}

          {/* Item name highlight */}
          {itemName && (
            <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4 text-center">
              <span className="font-semibold text-foreground text-sm">{itemName}</span>
            </div>
          )}

          {/* Warning */}
          <p className={cn('text-xs text-center', warningColor)}>
            Cette action est irreversible
          </p>
        </div>

        {/* Actions */}
        <div className="bg-muted/30 px-6 py-4 flex gap-3 rounded-b-xl border-t border-border">
          <Button
            ref={cancelRef}
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Suppression...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
