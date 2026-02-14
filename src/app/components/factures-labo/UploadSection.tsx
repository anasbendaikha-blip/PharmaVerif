/**
 * PharmaVerif - Section upload facture labo
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Zone drag-drop pour upload de PDF facture laboratoire.
 */

import { useState, useRef } from 'react';
import { Upload, FlaskConical, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import { facturesLaboApi } from '../../api/facturesLabo';
import { formatCurrency } from '../../utils/formatNumber';
import type { UploadLaboResponse } from '../../api/types';

interface UploadSectionProps {
  onUploadSuccess: () => void;
}

export function UploadSection({ onUploadSuccess }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadLaboResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // laboratoireId = 1 (Biogaran par défaut, seedé au démarrage backend)
      const result = await facturesLaboApi.upload(file, 1);
      setUploadResult(result);

      if (result.success) {
        toast.success(`Facture analysée : ${result.facture?.nb_lignes || 0} lignes`);
        onUploadSuccess();
      } else {
        toast.error(result.message || "Erreur lors de l'analyse");
      }
    } catch (err: unknown) {
      const httpErr = err as { message?: string };
      toast.error(httpErr.message || "Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input pour permettre le re-upload du même fichier
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5 text-blue-600" />
          Upload facture laboratoire
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Analyse de la facture en cours...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <FlaskConical className="h-10 w-10 text-gray-400" />
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  Glissez un PDF de facture Biogaran ici
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ou cliquez pour sélectionner un fichier
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Résultat de l'upload */}
        {uploadResult && uploadResult.success && uploadResult.facture && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Facture analysée avec succès
              </div>
              {/* Badge fournisseur détecté */}
              {uploadResult.fournisseur && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  uploadResult.fournisseur.detecte_auto && uploadResult.fournisseur.confiance >= 0.5
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                }`}>
                  {uploadResult.fournisseur.detecte_auto && uploadResult.fournisseur.confiance >= 0.5 ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {uploadResult.fournisseur.detecte_auto
                    ? `${uploadResult.fournisseur.nom}`
                    : 'Parser générique'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">N° Facture</p>
                <p className="font-medium dark:text-white">{uploadResult.facture.numero_facture}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Lignes</p>
                <p className="font-medium dark:text-white">{uploadResult.facture.nb_lignes}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Montant brut</p>
                <p className="font-medium dark:text-white">
                  {formatCurrency(uploadResult.facture.montant_brut_ht)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">RFA attendue</p>
                <p className="font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(uploadResult.facture.rfa_attendue)}
                </p>
              </div>
            </div>
            {uploadResult.warnings && uploadResult.warnings.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
                <p className="font-medium mb-1">Avertissements :</p>
                {uploadResult.warnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
