/**
 * PharmaVerif - Page de vérification de factures
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { AnomalieCard } from '../components/AnomalieCard';
import { BatchProgress, BatchFileStatus } from '../components/BatchProgress';
import { BatchResults } from '../components/BatchResults';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileDown,
  Files,
  FileText,
} from 'lucide-react';
import { db } from '../data/database';
import {
  genererFactureAleatoire,
  verifyFacture,
  convertParsedToFacture,
} from '../utils/verificationLogic';
import { parseInvoiceFile, validateParsedInvoice } from '../utils/fileParser';
import { Facture, Anomalie } from '../types';
import { exportVerificationReport } from '../utils/pdfExport';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/formatNumber';

interface VerificationPageProps {
  onNavigate: (page: string) => void;
}

interface BatchResultItem {
  fileName: string;
  facture?: Facture;
  anomalies: Anomalie[];
  error?: string;
}

export function VerificationPage({ onNavigate }: VerificationPageProps) {
  // Mode toggle
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Single mode state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFournisseurId, setSelectedFournisseurId] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [currentFacture, setCurrentFacture] = useState<Facture | null>(null);
  const [anomaliesDetectees, setAnomaliesDetectees] = useState<Anomalie[]>([]);

  // Batch mode state
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchFileStatuses, setBatchFileStatuses] = useState<BatchFileStatus[]>([]);
  const [batchCurrent, setBatchCurrent] = useState(0);
  const [batchComplete, setBatchComplete] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResultItem[]>([]);

  const fournisseurs = db.getActiveFournisseurs();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setVerificationComplete(false);
  };

  const handleBatchFilesSelect = (files: File[]) => {
    setBatchFiles((prev) => [...prev, ...files]);
    setBatchComplete(false);
    setBatchResults([]);
  };

  // Process a single file and return results
  const processFile = async (file: File, grossisteId: number): Promise<BatchResultItem> => {
    try {
      const parsingResult = await parseInvoiceFile(file);

      let facture: Facture;

      if (parsingResult.success && parsingResult.data) {
        const validation = validateParsedInvoice(parsingResult.data);
        if (!validation.valid) {
          // Continue with partial data
        }
        facture = convertParsedToFacture(parsingResult.data, grossisteId);
      } else {
        // Fallback to simulated data
        facture = genererFactureAleatoire(grossisteId);
      }

      const savedFacture = db.createFacture(facture);
      const fournisseur = db.getFournisseurById(savedFacture.fournisseur_id);
      if (!fournisseur) throw new Error('Fournisseur non trouvé');

      const anomalies = verifyFacture(savedFacture, fournisseur);

      anomalies.forEach((anomalie) => {
        db.createAnomalie({ ...anomalie, facture_id: savedFacture.id });
      });

      const statut = anomalies.length > 0 ? 'anomalie' : 'conforme';
      db.updateFacture(savedFacture.id, { statut_verification: statut });

      return {
        fileName: file.name,
        facture: savedFacture,
        anomalies,
      };
    } catch (error) {
      return {
        fileName: file.name,
        anomalies: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  };

  const handleVerification = async () => {
    if (!selectedFile || !selectedFournisseurId) return;

    setIsVerifying(true);
    setVerificationComplete(false);

    try {
      // Parse the real file
      const parsingResult = await parseInvoiceFile(selectedFile);

      let facture: Facture;

      if (parsingResult.success && parsingResult.data) {
        const validation = validateParsedInvoice(parsingResult.data);

        if (!validation.valid) {
          toast.warning('Attention : Données de facture incomplètes', {
            description: validation.errors.join(' • '),
          });
        }

        toast.success('Fichier analysé avec succès', {
          description: `${parsingResult.data.metadata.lignes_total} lignes détectées • Format: ${parsingResult.data.metadata.format_detecte.toUpperCase()}`,
        });

        facture = convertParsedToFacture(parsingResult.data, parseInt(selectedFournisseurId));
      } else {
        if (parsingResult.warnings && parsingResult.warnings.length > 0) {
          toast.error(parsingResult.error || 'Erreur de parsing', {
            description: parsingResult.warnings.join(' • '),
          });
        } else {
          toast.error(parsingResult.error || 'Impossible de lire le fichier');
        }

        toast.info('Utilisation de données simulées pour la démonstration', {
          description: 'Uploadez un fichier Excel ou CSV pour analyser vos vraies données',
        });

        facture = genererFactureAleatoire(parseInt(selectedFournisseurId));
      }

      const savedFacture = db.createFacture(facture);
      const fournisseur = db.getFournisseurById(savedFacture.fournisseur_id);
      if (!fournisseur) throw new Error('Fournisseur non trouvé');

      const anomalies = verifyFacture(savedFacture, fournisseur);

      anomalies.forEach((anomalie) => {
        db.createAnomalie({ ...anomalie, facture_id: savedFacture.id });
      });

      const statut = anomalies.length > 0 ? 'anomalie' : 'conforme';
      db.updateFacture(savedFacture.id, { statut_verification: statut });

      setCurrentFacture(savedFacture);
      setAnomaliesDetectees(anomalies);
      setVerificationComplete(true);

      if (anomalies.length === 0) {
        toast.success('Facture conforme !', {
          description: 'Toutes les remises sont correctement appliquées.',
        });
      } else {
        const montantTotal = anomalies.reduce((sum, a) => sum + a.montant_ecart, 0);
        toast.warning(`${anomalies.length} anomalie(s) détectée(s)`, {
          description: `Montant récupérable : ${formatCurrency(montantTotal)}`,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      toast.error('Erreur lors de la vérification', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBatchVerification = async () => {
    if (batchFiles.length === 0 || !selectedFournisseurId) return;

    setBatchProcessing(true);
    setBatchComplete(false);
    setBatchCurrent(0);
    setBatchResults([]);

    // Initialize file statuses
    const statuses: BatchFileStatus[] = batchFiles.map((f) => ({
      fileName: f.name,
      status: 'pending' as const,
    }));
    setBatchFileStatuses(statuses);

    const results: BatchResultItem[] = [];

    for (let i = 0; i < batchFiles.length; i++) {
      // Update status to parsing
      statuses[i] = { ...statuses[i], status: 'parsing' };
      setBatchFileStatuses([...statuses]);
      setBatchCurrent(i);

      // Small delay for UI update
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Update status to verifying
      statuses[i] = { ...statuses[i], status: 'verifying' };
      setBatchFileStatuses([...statuses]);

      const result = await processFile(batchFiles[i], parseInt(selectedFournisseurId));
      results.push(result);

      // Update status to done or error
      statuses[i] = {
        ...statuses[i],
        status: result.error ? 'error' : 'done',
        error: result.error,
      };
      setBatchFileStatuses([...statuses]);
      setBatchCurrent(i + 1);
    }

    setBatchResults(results);
    setBatchComplete(true);
    setBatchProcessing(false);

    // Summary toast
    const totalAnomalies = results.reduce((sum, r) => sum + r.anomalies.length, 0);
    const totalErrors = results.filter((r) => r.error).length;
    const totalConformes = results.filter((r) => r.facture && r.anomalies.length === 0).length;

    if (totalErrors > 0) {
      toast.warning(`Traitement terminé avec ${totalErrors} erreur(s)`, {
        description: `${results.length - totalErrors} factures traitées, ${totalAnomalies} anomalies détectées`,
      });
    } else if (totalAnomalies > 0) {
      const montantTotal = results.reduce(
        (sum, r) => sum + r.anomalies.reduce((s, a) => s + a.montant_ecart, 0),
        0
      );
      toast.warning(`${totalAnomalies} anomalie(s) sur ${results.length} factures`, {
        description: `Montant récupérable : ${formatCurrency(montantTotal)}`,
      });
    } else {
      toast.success(`${totalConformes} factures conformes !`, {
        description: 'Aucune anomalie détectée sur le lot.',
      });
    }
  };

  const handleExportPDF = async () => {
    if (!currentFacture || !selectedFournisseurId) return;

    setIsExporting(true);

    try {
      const fournisseur = db.getFournisseurById(parseInt(selectedFournisseurId));
      if (!fournisseur) throw new Error('Fournisseur non trouvé');

      await exportVerificationReport({
        facture: currentFacture,
        anomalies: anomaliesDetectees,
        fournisseur,
      });

      toast.success('Rapport PDF téléchargé avec succès !', {
        description: 'Le fichier a été enregistré dans vos téléchargements.',
      });
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      toast.error('Erreur lors de la génération du PDF', {
        description: 'Veuillez réessayer ou contacter le support.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSelectedFournisseurId('');
    setVerificationComplete(false);
    setCurrentFacture(null);
    setAnomaliesDetectees([]);
    setBatchFiles([]);
    setBatchProcessing(false);
    setBatchFileStatuses([]);
    setBatchCurrent(0);
    setBatchComplete(false);
    setBatchResults([]);
  };

  const handleModeSwitch = (newMode: 'single' | 'batch') => {
    handleReset();
    setMode(newMode);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button variant="ghost" onClick={() => onNavigate('home')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Vérification de facture
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Importez votre facture pour détecter les anomalies
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => handleModeSwitch('single')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px]
                  ${mode === 'single' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Unitaire</span>
              </button>
              <button
                onClick={() => handleModeSwitch('batch')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[40px]
                  ${mode === 'batch' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <Files className="h-4 w-4" />
                <span className="hidden sm:inline">Lot</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Upload Section */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Sélectionner le fournisseur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="fournisseur">Fournisseur</Label>
                  <Select value={selectedFournisseurId} onValueChange={setSelectedFournisseurId}>
                    <SelectTrigger id="fournisseur">
                      <SelectValue placeholder="Choisir un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {fournisseurs.map((g) => (
                        <SelectItem key={g.id} value={g.id.toString()}>
                          {g.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedFournisseurId && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Conditions :
                    </p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      {(() => {
                        const fournisseur = fournisseurs.find(
                          (g) => g.id.toString() === selectedFournisseurId
                        ) as any;
                        if (!fournisseur) return null;
                        const typeFourn = fournisseur.type_fournisseur || 'grossiste';
                        if (typeFourn === 'grossiste') {
                          return (
                            <>
                              <li>• Remise de base : {fournisseur.remise_base}%</li>
                              <li>
                                • Coopération commerciale : {fournisseur.cooperation_commerciale}%
                              </li>
                              <li>• Escompte : {fournisseur.escompte}%</li>
                              <li>• Franco : {fournisseur.franco}€</li>
                            </>
                          );
                        } else if (typeFourn === 'laboratoire') {
                          return (
                            <>
                              {fournisseur.remise_gamme_actif && <li>• Remise gamme active</li>}
                              {fournisseur.remise_quantite_actif && <li>• Remise quantité active</li>}
                              {fournisseur.rfa_actif && <li>• RFA active</li>}
                            </>
                          );
                        } else {
                          return <li>• Conditions spécifiques uniquement</li>;
                        }
                      })()}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  2. {mode === 'single' ? 'Importer la facture' : 'Importer les factures'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mode === 'single' ? (
                  <FileUpload onFileSelect={handleFileSelect} />
                ) : (
                  <FileUpload
                    onFileSelect={() => {}}
                    onFilesSelect={handleBatchFilesSelect}
                    multiple
                  />
                )}
              </CardContent>
            </Card>

            {mode === 'single' ? (
              <Button
                onClick={handleVerification}
                disabled={!selectedFile || !selectedFournisseurId || isVerifying}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Vérification en cours...
                  </>
                ) : (
                  'Lancer la vérification'
                )}
              </Button>
            ) : (
              <Button
                onClick={handleBatchVerification}
                disabled={batchFiles.length === 0 || !selectedFournisseurId || batchProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {batchProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <Files className="h-5 w-5 mr-2" />
                    Vérifier {batchFiles.length} fichier{batchFiles.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}

            {(verificationComplete || batchComplete) && (
              <Button onClick={handleReset} variant="outline" className="w-full">
                Nouvelle vérification
              </Button>
            )}
          </div>

          {/* Right Column - Results Section */}
          <div className="lg:col-span-2">
            {/* ===== SINGLE MODE RESULTS ===== */}
            {mode === 'single' && (
              <>
                {!verificationComplete && !isVerifying && (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center py-16">
                      <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        En attente de vérification
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Sélectionnez un fournisseur et importez une facture pour commencer
                      </p>
                    </CardContent>
                  </Card>
                )}

                {isVerifying && (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center py-16">
                      <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Analyse en cours...
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Vérification des remises et détection des anomalies
                      </p>
                    </CardContent>
                  </Card>
                )}

                {verificationComplete && currentFacture && (
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <Card
                      className={
                        anomaliesDetectees.length === 0 ? 'border-green-500' : 'border-orange-500'
                      }
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {anomaliesDetectees.length === 0 ? (
                            <div className="bg-green-100 p-3 rounded-lg">
                              <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                          ) : (
                            <div className="bg-orange-100 p-3 rounded-lg">
                              <AlertCircle className="h-8 w-8 text-orange-600" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                              {anomaliesDetectees.length === 0
                                ? 'Aucune anomalie détectée'
                                : `${anomaliesDetectees.length} anomalie${anomaliesDetectees.length > 1 ? 's' : ''} détectée${anomaliesDetectees.length > 1 ? 's' : ''}`}
                            </h3>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Facture</p>
                                <p className="font-medium">{currentFacture.numero}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Montant total
                                </p>
                                <p className="font-medium">
                                  {formatCurrency(currentFacture.net_a_payer)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                                <p className="font-medium">
                                  {new Date(currentFacture.date).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                              {anomaliesDetectees.length > 0 && (
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Montant récupérable
                                  </p>
                                  <p className="font-medium text-red-600">
                                    {formatCurrency(
                                      anomaliesDetectees.reduce(
                                        (sum, a) => sum + a.montant_ecart,
                                        0
                                      )
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Anomalies List */}
                    {anomaliesDetectees.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Détails des anomalies
                        </h3>
                        <div className="space-y-4">
                          {anomaliesDetectees.map((anomalie) => (
                            <AnomalieCard key={anomalie.id} anomalie={anomalie} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Export PDF Button */}
                    <Button
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Exportation en cours...
                        </>
                      ) : (
                        <>
                          <FileDown className="h-5 w-5 mr-2" />
                          Exporter le rapport PDF
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* ===== BATCH MODE RESULTS ===== */}
            {mode === 'batch' && (
              <>
                {!batchProcessing && !batchComplete && (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center py-16">
                      <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Files className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Mode traitement par lot
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Importez plusieurs fichiers puis lancez la vérification groupée
                      </p>
                    </CardContent>
                  </Card>
                )}

                {batchProcessing && (
                  <BatchProgress
                    files={batchFileStatuses}
                    current={batchCurrent}
                    total={batchFiles.length}
                  />
                )}

                {batchComplete && <BatchResults results={batchResults} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
