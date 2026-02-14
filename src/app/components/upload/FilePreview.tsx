/**
 * PharmaVerif - FilePreview Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Preview du fichier uploade avec infos utiles :
 *  - Nom fichier, taille, horodatage
 *  - Statut de verification
 *  - Nombre d'anomalies + montant recuperable
 *  - Actions : Voir details, Telecharger PDF
 */

import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Download,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { StatusBadge } from '../ui/status-badge';
import { cn } from '../ui/utils';
import { formatCurrency } from '../../utils/formatNumber';
import type { UploadResult } from '../../hooks/useFileUpload';

// ========================================
// TYPES
// ========================================

interface FilePreviewProps {
  /** Fichier original */
  file: File;
  /** Resultat de la verification */
  result: UploadResult;
  /** Callback voir details */
  onViewDetails?: () => void;
  /** Callback telecharger PDF */
  onDownloadPdf?: () => void;
  /** Callback recommencer */
  onReset?: () => void;
  /** Classe CSS */
  className?: string;
}

// ========================================
// HELPERS
// ========================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'PDF';
    case 'xml': return 'XML';
    case 'xlsx':
    case 'xls': return 'XLS';
    case 'csv': return 'CSV';
    default: return 'DOC';
  }
}

function timeSince(): string {
  return 'A l\'instant';
}

// ========================================
// COMPONENT
// ========================================

export function FilePreview({
  file,
  result,
  onViewDetails,
  onDownloadPdf,
  onReset,
  className,
}: FilePreviewProps) {
  const hasAnomalies = (result.anomaliesCount ?? 0) > 0;
  const isConforme = result.success && !hasAnomalies;

  return (
    <div
      className={cn(
        'bg-card border rounded-xl overflow-hidden transition-all duration-200',
        isConforme
          ? 'border-green-200 dark:border-green-800'
          : 'border-orange-200 dark:border-orange-800',
        className
      )}
    >
      {/* Header bande couleur */}
      <div
        className={cn(
          'h-1',
          isConforme ? 'bg-green-500' : 'bg-orange-500'
        )}
      />

      <div className="p-5 space-y-4">
        {/* Fichier info */}
        <div className="flex items-start gap-4">
          {/* Icone fichier */}
          <div
            className={cn(
              'shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center',
              isConforme
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-orange-50 dark:bg-orange-900/20'
            )}
          >
            <FileText
              className={cn(
                'h-6 w-6',
                isConforme ? 'text-green-600' : 'text-orange-600'
              )}
            />
            <span className="text-[9px] font-bold text-muted-foreground mt-0.5">
              {getFileIcon(file.name)}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{formatFileSize(file.size)}</span>
              <span className="text-muted-foreground/50">|</span>
              <Clock className="h-3 w-3" />
              <span>{timeSince()}</span>
            </div>
          </div>

          {/* Status badge */}
          <StatusBadge
            label={isConforme ? 'Conforme' : 'Anomalie'}
            variant={isConforme ? 'success' : 'warning'}
            dot
            size="md"
          />
        </div>

        {/* Resultats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {result.invoiceNumber && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Facture</p>
              <p className="text-sm font-mono font-semibold mt-0.5">{result.invoiceNumber}</p>
            </div>
          )}
          {result.linesCount != null && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Lignes</p>
              <p className="text-sm font-semibold mt-0.5">{result.linesCount} lignes</p>
            </div>
          )}
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Statut</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isConforme ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">Verifiee</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                    {result.anomaliesCount} anomalie{(result.anomaliesCount ?? 0) > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Montant recuperable si anomalies */}
        {hasAnomalies && (result.montantRecuperable ?? 0) > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Montant recuperable : {formatCurrency(result.montantRecuperable!)}
              </p>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">
                {result.anomaliesCount} ecart{(result.anomaliesCount ?? 0) > 1 ? 's' : ''} detecte{(result.anomaliesCount ?? 0) > 1 ? 's' : ''} sur cette facture
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {onViewDetails && (
            <Button variant="default" size="sm" onClick={onViewDetails} className="flex-1 sm:flex-none">
              <Eye className="h-4 w-4" />
              Voir details
            </Button>
          )}
          {onDownloadPdf && (
            <Button variant="outline" size="sm" onClick={onDownloadPdf} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4" />
              Telecharger PDF
            </Button>
          )}
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset} className="sm:ml-auto">
              <RotateCcw className="h-4 w-4" />
              Nouvelle verification
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
