/**
 * PharmaVerif - Page de vérification de factures
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { AnomalieCard } from '../components/AnomalieCard';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, FileDown, FileSpreadsheet } from 'lucide-react';
import { db } from '../data/database';
import { genererFactureAleatoire, verifyFacture, convertParsedToFacture } from '../utils/verificationLogic';
import { parseInvoiceFile, validateParsedInvoice } from '../utils/fileParser';
import { Facture, Anomalie } from '../types';
import { exportVerificationReport } from '../utils/pdfExport';
import { toast } from 'sonner';
import { Logo } from '../components/Logo';
import { formatCurrency } from '../utils/formatNumber';

interface VerificationPageProps {
  onNavigate: (page: string) => void;
}

export function VerificationPage({ onNavigate }: VerificationPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedGrossisteId, setSelectedGrossisteId] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [currentFacture, setCurrentFacture] = useState<Facture | null>(null);
  const [anomaliesDetectees, setAnomaliesDetectees] = useState<Anomalie[]>([]);

  const grossistes = db.getAllGrossistes();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setVerificationComplete(false);
  };

  const handleVerification = async () => {
    if (!selectedFile || !selectedGrossisteId) return;

    setIsVerifying(true);
    setVerificationComplete(false);

    try {
      // NOUVEAU : Tenter de parser le fichier réel
      const parsingResult = await parseInvoiceFile(selectedFile);

      let facture: Facture;

      if (parsingResult.success && parsingResult.data) {
        // ✅ Parsing réussi - utiliser les vraies données du fichier
        const validation = validateParsedInvoice(parsingResult.data);
        
        if (!validation.valid) {
          // Afficher les erreurs de validation
          toast.warning('Attention : Données de facture incomplètes', {
            description: validation.errors.join(' • ')
          });
        }

        // Afficher les infos de parsing
        toast.success('Fichier analysé avec succès', {
          description: `${parsingResult.data.metadata.lignes_total} lignes détectées • Format: ${parsingResult.data.metadata.format_detecte.toUpperCase()}`
        });

        // Convertir en facture
        facture = convertParsedToFacture(parsingResult.data, parseInt(selectedGrossisteId));
      } else {
        // ❌ Parsing échoué - utiliser les données simulées
        if (parsingResult.warnings && parsingResult.warnings.length > 0) {
          toast.error(parsingResult.error || 'Erreur de parsing', {
            description: parsingResult.warnings.join(' • ')
          });
        } else {
          toast.error(parsingResult.error || 'Impossible de lire le fichier');
        }

        // Générer une facture aléatoire pour la démo
        toast.info('Utilisation de données simulées pour la démonstration', {
          description: 'Uploadez un fichier Excel ou CSV pour analyser vos vraies données'
        });
        
        facture = genererFactureAleatoire(parseInt(selectedGrossisteId));
      }

      // Sauvegarder la facture en base
      const savedFacture = db.createFacture(facture);
      
      // Obtenir le grossiste
      const grossiste = db.getGrossisteById(savedFacture.grossiste_id);
      if (!grossiste) {
        throw new Error('Grossiste non trouvé');
      }
      
      // Vérifier la facture avec la logique métier
      const anomalies = verifyFacture(savedFacture, grossiste);
      
      // Sauvegarder les anomalies en base
      anomalies.forEach((anomalie) => {
        db.createAnomalie({
          ...anomalie,
          facture_id: savedFacture.id,
        });
      });
      
      // Mettre à jour le statut de la facture
      const statut = anomalies.length > 0 ? 'anomalie' : 'conforme';
      db.updateFacture(savedFacture.id, { statut_verification: statut });
      
      setCurrentFacture(savedFacture);
      setAnomaliesDetectees(anomalies);
      setVerificationComplete(true);

      // Toast final
      if (anomalies.length === 0) {
        toast.success('Facture conforme !', {
          description: 'Toutes les remises sont correctement appliquées.'
        });
      } else {
        const montantTotal = anomalies.reduce((sum, a) => sum + a.montant_ecart, 0);
        toast.warning(`${anomalies.length} anomalie(s) détectée(s)`, {
          description: `Montant récupérable : ${formatCurrency(montantTotal)}`
        });
      }

    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      toast.error('Erreur lors de la vérification', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportPDF = async () => {
    if (!currentFacture || !selectedGrossisteId) return;

    setIsExporting(true);

    try {
      const grossiste = db.getGrossisteById(parseInt(selectedGrossisteId));
      if (!grossiste) {
        throw new Error('Grossiste non trouvé');
      }

      // Générer et télécharger le PDF
      await exportVerificationReport({
        facture: currentFacture,
        anomalies: anomaliesDetectees,
        grossiste: grossiste,
      });

      toast.success('Rapport PDF téléchargé avec succès !', {
        description: 'Le fichier a été enregistré dans vos téléchargements.',
      });
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error('Erreur lors de la génération du PDF', {
        description: 'Veuillez réessayer ou contacter le support.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSelectedGrossisteId('');
    setVerificationComplete(false);
    setCurrentFacture(null);
    setAnomaliesDetectees([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => onNavigate('home')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vérification de facture</h1>
              <p className="text-gray-600">Importez votre facture pour détecter les anomalies</p>
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
                <CardTitle>1. Sélectionner le grossiste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="grossiste">Grossiste pharmaceutique</Label>
                  <Select value={selectedGrossisteId} onValueChange={setSelectedGrossisteId}>
                    <SelectTrigger id="grossiste">
                      <SelectValue placeholder="Choisir un grossiste" />
                    </SelectTrigger>
                    <SelectContent>
                      {grossistes.map((g) => (
                        <SelectItem key={g.id} value={g.id.toString()}>
                          {g.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedGrossisteId && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-2">Remises standard :</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {(() => {
                        const grossiste = grossistes.find((g) => g.id.toString() === selectedGrossisteId);
                        if (!grossiste) return null;
                        return (
                          <>
                            <li>• Remise de base : {grossiste.remise_base}%</li>
                            <li>• Coopération commerciale : {grossiste.cooperation_commerciale}%</li>
                            <li>• Escompte : {grossiste.escompte}%</li>
                            <li>• Franco : {grossiste.franco}€</li>
                          </>
                        );
                      })()}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Importer la facture</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload onFileSelect={handleFileSelect} />
              </CardContent>
            </Card>

            <Button
              onClick={handleVerification}
              disabled={!selectedFile || !selectedGrossisteId || isVerifying}
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

            {verificationComplete && (
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full"
              >
                Nouvelle vérification
              </Button>
            )}
          </div>

          {/* Right Column - Results Section */}
          <div className="lg:col-span-2">
            {!verificationComplete && !isVerifying && (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    En attente de vérification
                  </h3>
                  <p className="text-gray-600">
                    Sélectionnez un grossiste et importez une facture pour commencer
                  </p>
                </CardContent>
              </Card>
            )}

            {isVerifying && (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Analyse en cours...
                  </h3>
                  <p className="text-gray-600">
                    Vérification des remises et détection des anomalies
                  </p>
                </CardContent>
              </Card>
            )}

            {verificationComplete && currentFacture && (
              <div className="space-y-6">
                {/* Summary Card */}
                <Card className={anomaliesDetectees.length === 0 ? 'border-green-500' : 'border-orange-500'}>
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
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {anomaliesDetectees.length === 0
                            ? 'Aucune anomalie détectée'
                            : `${anomaliesDetectees.length} anomalie${anomaliesDetectees.length > 1 ? 's' : ''} détectée${anomaliesDetectees.length > 1 ? 's' : ''}`}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-sm text-gray-600">Facture</p>
                            <p className="font-medium">{currentFacture.numero}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Montant total</p>
                            <p className="font-medium">{formatCurrency(currentFacture.net_a_payer)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="font-medium">
                              {new Date(currentFacture.date).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          {anomaliesDetectees.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-600">Montant récupérable</p>
                              <p className="font-medium text-red-600">
                                {formatCurrency(anomaliesDetectees
                                  .reduce((sum, a) => sum + a.montant_ecart, 0))}
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
          </div>
        </div>
      </div>
    </div>
  );
}