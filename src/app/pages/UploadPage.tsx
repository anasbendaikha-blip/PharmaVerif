/**
 * PharmaVerif - Page Upload de Facture
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Page complete de workflow upload :
 *  1. Selection du fournisseur
 *  2. Drag & drop de la facture (DropZone)
 *  3. Progression multi-etapes (UploadProgress)
 *  4. Apercu du resultat (FilePreview) ou erreur (ErrorDisplay)
 *  5. Toasts contextuels a chaque etape
 *
 * Flow utilisateur :
 *  Pharmacien arrive -> Zone D&D vide -> Glisse facture ->
 *  Zone bleue (drag-over) -> Drop -> Validation -> Progression 4 etapes ->
 *  Toast resultat -> FilePreview avec actions
 */

import { useState, useCallback } from 'react';
import {
  Upload,
  FileCheck,
  Building2,
  FileText,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

import { PageHeader } from '../components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { EmptyState } from '../components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';

import { DropZone } from '../components/upload/DropZone';
import { UploadProgress } from '../components/upload/UploadProgress';
import { FilePreview } from '../components/upload/FilePreview';
import { ErrorDisplay } from '../components/upload/ErrorDisplay';

import { useToast } from '../hooks/useToast';
import { useFileUpload } from '../hooks/useFileUpload';
import type { UploadResult, UploadError } from '../hooks/useFileUpload';

import { db } from '../data/database';
import { formatCurrency } from '../utils/formatNumber';

// ========================================
// TYPES
// ========================================

interface UploadPageProps {
  onNavigate: (page: string) => void;
}

// ========================================
// COMPONENT
// ========================================

export function UploadPage({ onNavigate }: UploadPageProps) {
  const { toast } = useToast();
  const [selectedFournisseurId, setSelectedFournisseurId] = useState<string>('');

  const fournisseurs = db.getActiveFournisseurs();

  // ---- Callbacks toast ----
  const handleComplete = useCallback(
    (result: UploadResult) => {
      if (result.anomaliesCount && result.anomaliesCount > 0) {
        toast.warning(
          `${result.anomaliesCount} anomalie${result.anomaliesCount > 1 ? 's' : ''} detectee${result.anomaliesCount > 1 ? 's' : ''}`,
          `Montant recuperable : ${formatCurrency(result.montantRecuperable ?? 0)}`,
          {
            action: {
              label: 'Voir details',
              onClick: () => onNavigate('factures'),
            },
          }
        );
      } else {
        toast.success(
          'Facture conforme',
          `${result.linesCount ?? 0} lignes verifiees — aucun ecart detecte`,
          {
            action: {
              label: 'Voir le rapport',
              onClick: () => onNavigate('factures'),
            },
          }
        );
      }
    },
    [toast, onNavigate]
  );

  const handleError = useCallback(
    (error: UploadError) => {
      toast.error(error.title, error.message, {
        action: {
          label: 'Aide',
          onClick: () => onNavigate('contact'),
        },
      });
    },
    [toast, onNavigate]
  );

  // ---- Hook upload ----
  const {
    state: uploadState,
    startUpload,
    cancel,
    reset,
    retry,
  } = useFileUpload({
    onComplete: handleComplete,
    onError: handleError,
    simulateErrors: false,
  });

  // ---- Handlers ----
  const handleFileSelect = useCallback(
    (file: File) => {
      if (!selectedFournisseurId) {
        toast.warning(
          'Selectionnez un fournisseur',
          'Choisissez le fournisseur de la facture avant de l\'importer.'
        );
        return;
      }

      toast.info('Import en cours...', `Fichier : ${file.name}`);
      startUpload(file);
    },
    [selectedFournisseurId, startUpload, toast]
  );

  const handleViewDetails = useCallback(() => {
    onNavigate('factures');
  }, [onNavigate]);

  const handleDownloadPdf = useCallback(() => {
    toast.success('Rapport PDF telecharge', 'Le fichier a ete enregistre dans vos telechargements.');
  }, [toast]);

  const handleChooseFile = useCallback(() => {
    reset();
  }, [reset]);

  const handleContactSupport = useCallback(() => {
    onNavigate('contact');
  }, [onNavigate]);

  // ---- Computed state ----
  const isIdle = uploadState.step === 'idle';
  const isProcessing = uploadState.isProcessing;
  const isComplete = uploadState.step === 'complete' && uploadState.progress >= 100;
  const isError = uploadState.step === 'error';
  const fournisseurSelected = selectedFournisseurId !== '';

  // ---- Fournisseur selectionne ----
  const selectedFournisseur = fournisseurs.find(
    (f) => f.id.toString() === selectedFournisseurId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Importer une facture"
        description="Deposez votre facture pour lancer la verification automatique"
        icon={<Upload className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onNavigate('verification')}>
              <FileCheck className="h-4 w-4" />
              Mode avance
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ========================================= */}
        {/* LEFT COLUMN — Configuration (2/5)         */}
        {/* ========================================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1 : Fournisseur */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-blue-600" />
                1. Fournisseur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label htmlFor="fournisseur-upload">Selectionnez le fournisseur</Label>
                <Select
                  value={selectedFournisseurId}
                  onValueChange={setSelectedFournisseurId}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="fournisseur-upload">
                    <SelectValue placeholder="Choisir un fournisseur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fournisseurs.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.nom}
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({f.type_fournisseur})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Conditions rapides */}
                {selectedFournisseur && (
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">
                      Conditions {selectedFournisseur.type_fournisseur === 'grossiste' ? 'grossiste' : 'laboratoire'} :
                    </p>
                    {selectedFournisseur.type_fournisseur === 'grossiste' ? (
                      <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5">
                        <li>Remise base : {selectedFournisseur.remise_base}%</li>
                        <li>Cooperation : {selectedFournisseur.cooperation_commerciale}%</li>
                        <li>Escompte : {selectedFournisseur.escompte}%</li>
                        {selectedFournisseur.franco > 0 && (
                          <li>Franco : {formatCurrency(selectedFournisseur.franco)}</li>
                        )}
                      </ul>
                    ) : (
                      <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5">
                        {selectedFournisseur.remise_gamme_actif && <li>Remise gamme active</li>}
                        {selectedFournisseur.remise_quantite_actif && <li>Remise quantite active</li>}
                        {selectedFournisseur.rfa_actif && <li>RFA active</li>}
                        {!selectedFournisseur.remise_gamme_actif && !selectedFournisseur.remise_quantite_actif && !selectedFournisseur.rfa_actif && (
                          <li>Conditions specifiques uniquement</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 2 : Upload zone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-blue-600" />
                2. Facture
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isIdle && (
                <DropZone
                  onFileSelect={handleFileSelect}
                  disabled={!fournisseurSelected || isProcessing}
                  accept={['.pdf', '.xml', '.xlsx', '.xls', '.csv']}
                  enableCamera
                />
              )}

              {isProcessing && uploadState.file && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50">
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {uploadState.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Traitement en cours...
                    </p>
                  </div>
                </div>
              )}

              {(isComplete || isError) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  className="w-full"
                >
                  <Upload className="h-4 w-4" />
                  Importer une autre facture
                </Button>
              )}

              {/* Hint quand pas de fournisseur */}
              {!fournisseurSelected && isIdle && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Selectionnez d'abord un fournisseur ci-dessus
                </p>
              )}
            </CardContent>
          </Card>

          {/* Lien vers mode avance */}
          <Alert variant="info">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Mode avance disponible</AlertTitle>
            <AlertDescription>
              Pour le traitement par lot ou des options avancees, utilisez la{' '}
              <button
                onClick={() => onNavigate('verification')}
                className="underline font-medium hover:no-underline"
              >
                page de verification
              </button>.
            </AlertDescription>
          </Alert>
        </div>

        {/* ========================================= */}
        {/* RIGHT COLUMN — Results (3/5)              */}
        {/* ========================================= */}
        <div className="lg:col-span-3">
          {/* IDLE — Empty state */}
          {isIdle && (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <EmptyState
                icon={<FileCheck className="h-8 w-8 text-muted-foreground/50" />}
                title="Aucune facture importee"
                description="Commencez par selectionner un fournisseur puis deposez votre facture (PDF, Excel ou CSV) pour lancer la verification automatique."
              >
                <div className="flex flex-wrap gap-2 mt-2">
                  {['CERP', 'OCP', 'Alliance', 'Sanofi', 'Biogaran'].map((name) => (
                    <span
                      key={name}
                      className="inline-block px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                    >
                      {name}
                    </span>
                  ))}
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                    +3
                  </span>
                </div>
              </EmptyState>
            </Card>
          )}

          {/* PROCESSING — Progress bar */}
          {isProcessing && (
            <UploadProgress
              step={uploadState.step}
              progress={uploadState.progress}
              subSteps={uploadState.subSteps}
              file={uploadState.file}
              canCancel={uploadState.canCancel}
              onCancel={cancel}
            />
          )}

          {/* ERROR — Error display */}
          {isError && uploadState.error && (
            <ErrorDisplay
              error={uploadState.error}
              onRetry={retry}
              onChooseFile={handleChooseFile}
              onContactSupport={handleContactSupport}
            />
          )}

          {/* COMPLETE — File preview */}
          {isComplete && uploadState.result && uploadState.file && (
            <FilePreview
              file={uploadState.file}
              result={uploadState.result}
              onViewDetails={handleViewDetails}
              onDownloadPdf={handleDownloadPdf}
              onReset={reset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
