/**
 * PharmaVerif - RapportPDFPreview Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Preview d'un rapport PDF avant telecharger/imprimer :
 *  - Metadata du rapport (type, date, facture, fournisseur)
 *  - Resume du contenu (nombre d'anomalies, montant, statut)
 *  - Boutons d'action : telecharger, imprimer, envoyer par email (placeholder)
 *  - Etat de chargement
 *  - Support des 3 types de rapports : facture grossiste, facture labo, EMAC
 */

import { useState } from 'react';
import {
  Download,
  Printer,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { StatusBadge, getFactureStatusVariant } from './ui/status-badge';
import { formatCurrency, formatDateShortFR } from '../utils/formatNumber';
import { cn } from './ui/utils';

// ========================================
// TYPES
// ========================================

export type RapportType = 'facture_grossiste' | 'facture_labo' | 'emac' | 'reclamation';

interface RapportMetadata {
  /** Type de rapport */
  type: RapportType;
  /** Titre du rapport */
  title: string;
  /** Numero de facture / reference */
  reference: string;
  /** Nom du fournisseur ou laboratoire */
  fournisseur: string;
  /** Date du document */
  dateDocument: string;
  /** Statut de verification */
  statut: string;
  /** Nombre d'anomalies */
  nbAnomalies: number;
  /** Montant total HT */
  montantHT?: number;
  /** Montant recuperable */
  montantRecuperable?: number;
  /** Date de generation du rapport */
  dateGeneration?: string;
}

interface RapportPDFPreviewProps {
  /** Metadata du rapport */
  metadata: RapportMetadata;
  /** Callback pour telecharger le PDF */
  onDownload: () => Promise<void>;
  /** Callback pour imprimer (optionnel) */
  onPrint?: () => Promise<void>;
  /** Callback pour envoyer par email (optionnel, placeholder) */
  onEmail?: () => Promise<void>;
  /** URL de preview en ligne (optionnel) */
  previewUrl?: string;
  /** Classe CSS additionnelle */
  className?: string;
}

// ========================================
// LABEL MAP
// ========================================

const RAPPORT_TYPE_LABELS: Record<RapportType, string> = {
  facture_grossiste: 'Rapport de vérification — Facture Grossiste',
  facture_labo: 'Rapport de vérification — Facture Laboratoire',
  emac: 'Rapport EMAC — Vérification triangulaire',
  reclamation: 'Lettre de réclamation',
};

const RAPPORT_TYPE_ICONS: Record<RapportType, string> = {
  facture_grossiste: '📋',
  facture_labo: '🧪',
  emac: '📊',
  reclamation: '✉️',
};

// ========================================
// COMPONENT
// ========================================

export function RapportPDFPreview({
  metadata,
  onDownload,
  onPrint,
  onEmail,
  previewUrl,
  className,
}: RapportPDFPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!onPrint) return;
    setPrinting(true);
    try {
      await onPrint();
    } finally {
      setPrinting(false);
    }
  };

  const handleEmail = async () => {
    if (!onEmail) return;
    setEmailing(true);
    try {
      await onEmail();
    } finally {
      setEmailing(false);
    }
  };

  const typeLabel = RAPPORT_TYPE_LABELS[metadata.type] || 'Rapport';
  const typeIcon = RAPPORT_TYPE_ICONS[metadata.type] || '📄';
  const statusVariant = getFactureStatusVariant(metadata.statut);
  const statusLabel = metadata.statut
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header accent */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600" />

      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-xl">{typeIcon}</span>
          {metadata.title || typeLabel}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {typeLabel}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetadataRow label="Référence" value={metadata.reference} />
          <MetadataRow label="Fournisseur" value={metadata.fournisseur} />
          <MetadataRow label="Date document" value={formatDateShortFR(metadata.dateDocument)} />
          <MetadataRow label="Date rapport" value={
            metadata.dateGeneration
              ? formatDateShortFR(metadata.dateGeneration)
              : new Date().toLocaleDateString('fr-FR')
          } />
        </div>

        {/* Status + anomalies */}
        <div className="flex flex-wrap items-center gap-3 py-3 border-y border-border">
          <StatusBadge
            label={statusLabel}
            variant={statusVariant}
            size="md"
            dot
            pulse={metadata.statut === 'en_cours' || metadata.statut === 'en_attente'}
          />

          <div className="flex items-center gap-1.5 text-sm">
            {metadata.nbAnomalies > 0 ? (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {metadata.nbAnomalies} anomalie{metadata.nbAnomalies > 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Aucune anomalie
                </span>
              </>
            )}
          </div>
        </div>

        {/* Financial summary */}
        {(metadata.montantHT !== undefined || metadata.montantRecuperable !== undefined) && (
          <div className="grid grid-cols-2 gap-3">
            {metadata.montantHT !== undefined && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Montant HT</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(metadata.montantHT)}
                </p>
              </div>
            )}
            {metadata.montantRecuperable !== undefined && metadata.montantRecuperable > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide">Récupérable</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(metadata.montantRecuperable)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 min-w-[140px] gap-2"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? 'Génération...' : 'Télécharger PDF'}
          </Button>

          {onPrint && (
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={printing}
              className="gap-2"
            >
              {printing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Imprimer
            </Button>
          )}

          {onEmail && (
            <Button
              variant="outline"
              onClick={handleEmail}
              disabled={emailing}
              className="gap-2"
            >
              {emailing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Email
            </Button>
          )}

          {previewUrl && (
            <Button
              variant="ghost"
              asChild
              className="gap-2"
            >
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Ouvrir
              </a>
            </Button>
          )}
        </div>

        {/* Generation timestamp */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3" />
          <span>
            Dernière génération : {metadata.dateGeneration
              ? formatDateShortFR(metadata.dateGeneration)
              : 'Jamais'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// SUB-COMPONENTS
// ========================================

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium text-foreground truncate">{value}</p>
    </div>
  );
}
