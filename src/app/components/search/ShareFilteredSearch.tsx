/**
 * PharmaVerif - ShareFilteredSearch Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Bouton pour copier le lien de la recherche filtree :
 *  - Copie l'URL courante (qui contient les filtres)
 *  - Feedback visuel "Lien copie !" pendant 2s
 *  - Fallback si clipboard API non disponible
 */

import { useState, useCallback } from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface ShareFilteredSearchProps {
  className?: string;
}

export function ShareFilteredSearch({ className }: ShareFilteredSearchProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    try {
      const url = window.location.href;

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback pour HTTP ou navigateurs anciens
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      toast.success('Lien copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  }, []);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopyLink}
      className={className}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-600" />
          <span className="hidden sm:inline">Copié !</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Partager</span>
        </>
      )}
    </Button>
  );
}
