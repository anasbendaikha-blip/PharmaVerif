/**
 * PharmaVerif - Formulaire Accord Commercial (Rebate Engine)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Formulaire de creation / modification d'un accord commercial :
 *  - Selection du template
 *  - Configuration des tranches A/B avec taux par etape
 *  - Preview en temps reel
 *  - Validation cumul <= plafond
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Calculator,
  Save,
  Eye,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { rebateApi } from '../../api/rebateApi';
import { getErrorMessage } from '../../api/httpClient';
import { formatCurrency, formatPercentage } from '../../utils/formatNumber';
import type {
  RebateTemplateResponse,
  LaboratoryAgreementResponse,
  LaboratoryAgreementCreateRequest,
  LaboratoryAgreementUpdateRequest,
  LaboratoireResponse,
  PreviewResponse,
  AgreementConfig,
  TrancheConfig,
  StageConfig,
  TemplateStage,
} from '../../api/types';

// ========================================
// TYPES
// ========================================

interface AgreementFormProps {
  templates: RebateTemplateResponse[];
  labos: LaboratoireResponse[];
  editingAgreement: LaboratoryAgreementResponse | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface TrancheFormState {
  max_rebate: number;
  stages: Record<string, {
    rate: number;
    incremental_rate: number;
    cumulative_rate: number;
    condition_threshold: number;
  }>;
}

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export function AgreementForm({
  templates,
  labos,
  editingAgreement,
  onSuccess,
  onCancel,
}: AgreementFormProps) {
  // Champs principaux
  const [nom, setNom] = useState(editingAgreement?.nom || '');
  const [laboratoireId, setLaboratoireId] = useState<string>(
    editingAgreement ? String(editingAgreement.laboratoire_id) : ''
  );
  const [templateId, setTemplateId] = useState<string>(
    editingAgreement?.template_id ? String(editingAgreement.template_id) : ''
  );
  const [dateDebut, setDateDebut] = useState(editingAgreement?.date_debut || '');
  const [dateFin, setDateFin] = useState(editingAgreement?.date_fin || '');
  const [referenceExterne, setReferenceExterne] = useState(editingAgreement?.reference_externe || '');
  const [notes, setNotes] = useState(editingAgreement?.notes || '');
  const [objectifCaAnnuel, setObjectifCaAnnuel] = useState<string>(
    editingAgreement?.objectif_ca_annuel ? String(editingAgreement.objectif_ca_annuel) : ''
  );
  const [tauxEscompte, setTauxEscompte] = useState<string>(
    editingAgreement?.taux_escompte != null ? String(editingAgreement.taux_escompte) : ''
  );
  const [tauxCooperation, setTauxCooperation] = useState<string>(
    editingAgreement?.taux_cooperation != null ? String(editingAgreement.taux_cooperation) : ''
  );
  const [activate, setActivate] = useState(false);

  // Configuration des tranches
  const [trancheA, setTrancheA] = useState<TrancheFormState>({
    max_rebate: 0.40,
    stages: {},
  });
  const [trancheB, setTrancheB] = useState<TrancheFormState>({
    max_rebate: 0.17,
    stages: {},
  });

  // Preview
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // Template selectionne
  const selectedTemplate = useMemo(
    () => templates.find(t => String(t.id) === templateId),
    [templates, templateId]
  );

  // ========================================
  // INIT : Charger config existante ou template
  // ========================================

  useEffect(() => {
    if (editingAgreement?.agreement_config?.tranche_configurations) {
      const config = editingAgreement.agreement_config.tranche_configurations;
      if (config.tranche_A) {
        setTrancheA({
          max_rebate: config.tranche_A.max_rebate,
          stages: Object.fromEntries(
            Object.entries(config.tranche_A.stages).map(([id, sc]) => [
              id,
              {
                rate: (sc.rate || 0) * 100,
                incremental_rate: (sc.incremental_rate || 0) * 100,
                cumulative_rate: (sc.cumulative_rate || 0) * 100,
                condition_threshold: sc.condition_threshold || 0,
              },
            ])
          ),
        });
      }
      if (config.tranche_B) {
        setTrancheB({
          max_rebate: config.tranche_B.max_rebate,
          stages: Object.fromEntries(
            Object.entries(config.tranche_B.stages).map(([id, sc]) => [
              id,
              {
                rate: (sc.rate || 0) * 100,
                incremental_rate: (sc.incremental_rate || 0) * 100,
                cumulative_rate: (sc.cumulative_rate || 0) * 100,
                condition_threshold: sc.condition_threshold || 0,
              },
            ])
          ),
        });
      }
    }
  }, [editingAgreement]);

  // Quand le template change, initialiser les stages vides
  useEffect(() => {
    if (!selectedTemplate?.structure?.stages) return;
    if (editingAgreement) return; // Ne pas ecraser une config existante

    const initStages = (defaultMaxRebate: number): TrancheFormState => ({
      max_rebate: defaultMaxRebate,
      stages: Object.fromEntries(
        selectedTemplate.structure!.stages.map((s: TemplateStage) => [
          s.stage_id,
          { rate: 0, incremental_rate: 0, cumulative_rate: 0, condition_threshold: 0 },
        ])
      ),
    });

    setTrancheA(initStages(0.40));
    setTrancheB(initStages(0.17));
  }, [selectedTemplate, editingAgreement]);

  // ========================================
  // CALCUL CUMUL
  // ========================================

  const calculateCumulative = useCallback((tranche: TrancheFormState): TrancheFormState => {
    if (!selectedTemplate?.structure?.stages) return tranche;

    const stages = { ...tranche.stages };
    let cumul = 0;

    for (const stage of selectedTemplate.structure.stages) {
      const s = stages[stage.stage_id];
      if (!s) continue;

      if (stage.rate_type === 'percentage') {
        cumul = s.rate;
      } else if (stage.rate_type === 'incremental_percentage') {
        cumul += s.incremental_rate;
      }
      stages[stage.stage_id] = { ...s, cumulative_rate: cumul };
    }

    return { ...tranche, stages };
  }, [selectedTemplate]);

  // Mettre a jour les cumuls a chaque changement de taux
  useEffect(() => {
    setTrancheA(prev => calculateCumulative(prev));
  }, [trancheA.stages, calculateCumulative]);

  useEffect(() => {
    setTrancheB(prev => calculateCumulative(prev));
  }, [trancheB.stages, calculateCumulative]);

  // ========================================
  // VALIDATION
  // ========================================

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!nom.trim()) errors.push('Le nom de l\'accord est requis');
    if (!laboratoireId) errors.push('Selectionnez un laboratoire');
    if (!templateId) errors.push('Selectionnez un template');
    if (!dateDebut) errors.push('La date de debut est requise');

    // Verifier cumuls vs plafonds
    if (selectedTemplate?.structure?.stages) {
      const lastStageA = Object.values(trancheA.stages).pop();
      const lastStageB = Object.values(trancheB.stages).pop();

      if (lastStageA && lastStageA.cumulative_rate / 100 > trancheA.max_rebate + 0.001) {
        errors.push(`Tranche A : cumul (${formatPercentage(lastStageA.cumulative_rate)}) depasse le plafond (${formatPercentage(trancheA.max_rebate * 100)})`);
      }
      if (lastStageB && lastStageB.cumulative_rate / 100 > trancheB.max_rebate + 0.001) {
        errors.push(`Tranche B : cumul (${formatPercentage(lastStageB.cumulative_rate)}) depasse le plafond (${formatPercentage(trancheB.max_rebate * 100)})`);
      }
    }

    return errors;
  }, [nom, laboratoireId, templateId, dateDebut, selectedTemplate, trancheA, trancheB]);

  // ========================================
  // BUILD CONFIG
  // ========================================

  const buildAgreementConfig = useCallback((): AgreementConfig => {
    const buildTrancheConfig = (
      tranche: TrancheFormState,
      label: string,
      criteria: Record<string, unknown>
    ): TrancheConfig => ({
      max_rebate: tranche.max_rebate,
      classification_criteria: criteria,
      stages: Object.fromEntries(
        Object.entries(tranche.stages).map(([stageId, s]) => [
          stageId,
          {
            rate: s.rate > 0 ? s.rate / 100 : null,
            incremental_rate: s.incremental_rate > 0 ? s.incremental_rate / 100 : null,
            cumulative_rate: s.cumulative_rate > 0 ? s.cumulative_rate / 100 : null,
            condition_threshold: s.condition_threshold > 0 ? s.condition_threshold : null,
          } as StageConfig,
        ])
      ),
    });

    return {
      template_id: templateId || null,
      tranche_configurations: {
        tranche_A: buildTrancheConfig(
          trancheA,
          'Generiques (TVA 2.10%)',
          { tva_rate: 2.10, description: 'Produits generiques — TVA 2.10%' }
        ),
        tranche_B: buildTrancheConfig(
          trancheB,
          'Non-generiques',
          { tva_rate_ne: 2.10, description: 'Produits non-generiques — TVA != 2.10%' }
        ),
      },
    };
  }, [templateId, trancheA, trancheB]);

  // ========================================
  // PREVIEW
  // ========================================

  const handlePreview = async () => {
    if (!templateId) return;
    try {
      setPreviewLoading(true);
      const result = await rebateApi.preview({
        template_id: Number(templateId),
        agreement_config: buildAgreementConfig(),
        simulation_amount: 10000,
        simulation_tranche: 'tranche_B',
      });
      setPreview(result);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur de previsualisation'));
    } finally {
      setPreviewLoading(false);
    }
  };

  // ========================================
  // SUBMIT
  // ========================================

  const handleSubmit = async () => {
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    try {
      setSubmitting(true);

      if (editingAgreement) {
        const updateData: LaboratoryAgreementUpdateRequest = {
          agreement_config: buildAgreementConfig(),
          objectif_ca_annuel: objectifCaAnnuel ? Number(objectifCaAnnuel) : null,
          taux_escompte: tauxEscompte ? Number(tauxEscompte) : null,
          taux_cooperation: tauxCooperation ? Number(tauxCooperation) : null,
          date_fin: dateFin || null,
          reference_externe: referenceExterne || null,
          notes: notes || null,
          reason: 'Modification depuis le formulaire frontend',
        };
        await rebateApi.updateAgreement(editingAgreement.id, updateData);
        toast.success('Accord mis a jour');
      } else {
        const createData: LaboratoryAgreementCreateRequest = {
          laboratoire_id: Number(laboratoireId),
          template_id: Number(templateId),
          nom: nom.trim(),
          agreement_config: buildAgreementConfig(),
          objectif_ca_annuel: objectifCaAnnuel ? Number(objectifCaAnnuel) : null,
          taux_escompte: tauxEscompte ? Number(tauxEscompte) : null,
          taux_cooperation: tauxCooperation ? Number(tauxCooperation) : null,
          date_debut: dateDebut,
          date_fin: dateFin || null,
          reference_externe: referenceExterne || null,
          notes: notes || null,
          activate,
        };
        await rebateApi.createAgreement(createData);
        toast.success(activate ? 'Accord cree et active' : 'Accord cree en brouillon');
      }

      onSuccess();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur lors de l\'enregistrement'));
    } finally {
      setSubmitting(false);
    }
  };

  // ========================================
  // RENDER : Configuration d'une tranche
  // ========================================

  const renderTrancheConfig = (
    label: string,
    tranche: TrancheFormState,
    setTranche: React.Dispatch<React.SetStateAction<TrancheFormState>>
  ) => {
    if (!selectedTemplate?.structure?.stages) return null;

    const isOverMax = (() => {
      const lastStage = Object.values(tranche.stages).pop();
      return lastStage ? (lastStage.cumulative_rate / 100) > tranche.max_rebate + 0.001 : false;
    })();

    return (
      <Card className={isOverMax ? 'border-red-300 dark:border-red-800' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{label}</h4>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Plafond RFA</Label>
              <Input
                type="number"
                className="w-20 h-8 text-xs"
                value={tranche.max_rebate * 100}
                onChange={(e) => setTranche(prev => ({
                  ...prev,
                  max_rebate: Number(e.target.value) / 100,
                }))}
                min={0}
                max={100}
                step={0.1}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {selectedTemplate.structure!.stages.map((stage: TemplateStage) => {
              const s = tranche.stages[stage.stage_id] || { rate: 0, incremental_rate: 0, cumulative_rate: 0, condition_threshold: 0 };

              return (
                <div key={stage.stage_id} className="flex items-center gap-3 py-2 border-b border-dashed last:border-b-0">
                  {/* Label + delay */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{stage.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {stage.delay_months === 0 ? 'Immediat' : `M+${stage.delay_months}`}
                      {' — '}
                      {stage.payment_method === 'invoice_deduction' ? 'Deduction facture'
                        : stage.payment_method === 'emac_transfer' ? 'Virement EMAC'
                        : stage.payment_method === 'year_end_transfer' ? 'Virement fin d\'annee'
                        : stage.payment_method === 'credit_note' ? 'Avoir'
                        : stage.payment_method}
                    </p>
                  </div>

                  {/* Input taux */}
                  {stage.rate_type === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className="w-20 h-8 text-xs text-right"
                        value={s.rate || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTranche(prev => ({
                            ...prev,
                            stages: {
                              ...prev.stages,
                              [stage.stage_id]: { ...s, rate: val },
                            },
                          }));
                        }}
                        min={0}
                        max={100}
                        step={0.01}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  )}

                  {stage.rate_type === 'incremental_percentage' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">+</span>
                      <Input
                        type="number"
                        className="w-20 h-8 text-xs text-right"
                        value={s.incremental_rate || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTranche(prev => ({
                            ...prev,
                            stages: {
                              ...prev.stages,
                              [stage.stage_id]: { ...s, incremental_rate: val },
                            },
                          }));
                        }}
                        min={0}
                        max={100}
                        step={0.01}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  )}

                  {stage.rate_type === 'conditional_percentage' && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className="w-20 h-8 text-xs text-right"
                        value={s.incremental_rate || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTranche(prev => ({
                            ...prev,
                            stages: {
                              ...prev.stages,
                              [stage.stage_id]: { ...s, incremental_rate: val },
                            },
                          }));
                        }}
                        min={0}
                        max={100}
                        step={0.01}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                      {stage.conditions?.[0] && (
                        <>
                          <span className="text-xs text-muted-foreground mx-1">si CA &ge;</span>
                          <Input
                            type="number"
                            className="w-24 h-8 text-xs text-right"
                            value={s.condition_threshold || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setTranche(prev => ({
                                ...prev,
                                stages: {
                                  ...prev.stages,
                                  [stage.stage_id]: { ...s, condition_threshold: val },
                                },
                              }));
                            }}
                            min={0}
                            step={1000}
                          />
                          <span className="text-xs text-muted-foreground">&euro;</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Cumul affiché */}
                  <div className={`text-xs font-medium min-w-[60px] text-right ${
                    (s.cumulative_rate / 100) > tranche.max_rebate + 0.001
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    = {formatPercentage(s.cumulative_rate)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barre plafond */}
          <div className="mt-4 pt-3 border-t">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Cumul</span>
              <span className={isOverMax ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                {formatPercentage(Object.values(tranche.stages).pop()?.cumulative_rate || 0)}
                {' / '}
                {formatPercentage(tranche.max_rebate * 100)}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOverMax ? 'bg-red-500' : 'bg-green-500'}`}
                style={{
                  width: `${Math.min(
                    ((Object.values(tranche.stages).pop()?.cumulative_rate || 0) / 100 / tranche.max_rebate) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
            {isOverMax && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Cumul depasse le plafond RFA
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-6">
      {/* Informations generales */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Informations generales</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom de l'accord *</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: Accord Biogaran 2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="labo">Laboratoire *</Label>
              <Select value={laboratoireId} onValueChange={setLaboratoireId} disabled={!!editingAgreement}>
                <SelectTrigger id="labo">
                  <SelectValue placeholder="Choisir un laboratoire" />
                </SelectTrigger>
                <SelectContent>
                  {labos.map(l => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Template de remise *</Label>
              <Select value={templateId} onValueChange={setTemplateId} disabled={!!editingAgreement}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Choisir un template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nom} ({t.laboratoire_nom})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_debut">Date de debut *</Label>
              <Input
                id="date_debut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                disabled={!!editingAgreement}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_fin">Date de fin</Label>
              <Input
                id="date_fin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ref">Reference externe</Label>
              <Input
                id="ref"
                value={referenceExterne}
                onChange={(e) => setReferenceExterne(e.target.value)}
                placeholder="Ex: ACC-2026-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objectif">Objectif CA annuel</Label>
              <Input
                id="objectif"
                type="number"
                value={objectifCaAnnuel}
                onChange={(e) => setObjectifCaAnnuel(e.target.value)}
                placeholder="Ex: 50000"
                min={0}
                step={1000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="escompte">Escompte (%)</Label>
              <Input
                id="escompte"
                type="number"
                value={tauxEscompte}
                onChange={(e) => setTauxEscompte(e.target.value)}
                placeholder="Ex: 2.5"
                min={0}
                max={100}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooperation">Cooperation commerciale (%)</Label>
              <Input
                id="cooperation"
                type="number"
                value={tauxCooperation}
                onChange={(e) => setTauxCooperation(e.target.value)}
                placeholder="Ex: 1.0"
                min={0}
                max={100}
                step={0.1}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes internes..."
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration des tranches */}
      {selectedTemplate?.structure?.stages && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderTrancheConfig('Tranche A — Generiques (TVA 2.10%)', trancheA, setTrancheA)}
            {renderTrancheConfig('Tranche B — Non-generiques', trancheB, setTrancheB)}
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Previsualisation
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={previewLoading || validationErrors.length > 0}
                >
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-1" />
                  )}
                  Simuler (10 000 &euro; HT)
                </Button>
              </div>
            </CardHeader>
            {preview && (
              <CardContent>
                {/* Validations */}
                {preview.validations && preview.validations.length > 0 && (
                  <div className="mb-4 space-y-1">
                    {preview.validations.map((v, i) => (
                      <div key={i} className={`flex items-center gap-2 text-xs ${
                        v.type === 'error' ? 'text-red-600' : v.type === 'warning' ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {v.type === 'error' ? <AlertCircle className="h-3 w-3" /> :
                         v.type === 'warning' ? <AlertTriangle className="h-3 w-3" /> :
                         <CheckCircle2 className="h-3 w-3" />}
                        {v.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Entries */}
                <div className="space-y-2">
                  {preview.entries.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-dashed last:border-b-0">
                      <div>
                        <p className="text-sm font-medium">{entry.stage_label}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.payment_method === 'invoice_deduction' ? 'Deduction facture' : entry.payment_method}
                          {entry.is_conditional && ' (conditionnel)'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(entry.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          Cumul : {formatCurrency(entry.cumulative_amount)}
                          {' ('}{formatPercentage(entry.cumulative_rate * 100)}{')'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 pt-3 border-t flex justify-between items-center">
                  <span className="font-semibold">RFA totale attendue</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(preview.total_rfa)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({formatPercentage(preview.total_rfa_percentage * 100)})
                    </span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Erreurs de validation</h4>
          <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i} className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <div className="flex items-center gap-3">
          {!editingAgreement && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activate}
                onChange={(e) => setActivate(e.target.checked)}
                className="rounded border-gray-300"
              />
              Activer immediatement
            </label>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || validationErrors.length > 0}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {editingAgreement ? 'Enregistrer les modifications' : 'Creer l\'accord'}
          </Button>
        </div>
      </div>
    </div>
  );
}
