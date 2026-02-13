/**
 * PharmaVerif - Formulaire Conditions Commerciales
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Formulaire de saisie/edition des conditions commerciales d'un accord
 * avec un laboratoire. 5 sections : Remises, Escompte, Franco, RFA, Gratuites.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Save,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Euro,
  Percent,
  Package,
  Truck,
  BarChart3,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { laboratoiresApi } from '../api/laboratoiresApi';
import type {
  LaboratoireResponse,
  AccordCommercialResponse,
  AccordCommercialCreate,
  PalierRFAResponse,
  PalierRFACreate,
} from '../api/types';

// ========================================
// HELPERS
// ========================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

interface ConditionsCommercialesFormProps {
  laboratoireId: number;
  onClose: () => void;
  onSaved?: () => void;
}

export function ConditionsCommercialesForm({
  laboratoireId,
  onClose,
  onSaved,
}: ConditionsCommercialesFormProps) {
  const [laboratoire, setLaboratoire] = useState<LaboratoireResponse | null>(null);
  const [accord, setAccord] = useState<AccordCommercialResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    remises: true,
    escompte: true,
    franco: true,
    rfa: true,
    gratuites: true,
  });

  // Formulaire
  const [form, setForm] = useState<AccordCommercialCreate>({
    nom: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: null,
    tranche_a_pct_ca: 80.0,
    tranche_a_cible: 57.0,
    tranche_b_pct_ca: 20.0,
    tranche_b_cible: 27.5,
    otc_cible: 0.0,
    bonus_dispo_max_pct: 10.0,
    bonus_seuil_pct: 95.0,
    escompte_pct: 0.0,
    escompte_delai_jours: 30,
    escompte_applicable: false,
    franco_seuil_ht: 0.0,
    franco_frais_port: 0.0,
    gratuites_seuil_qte: 0,
    gratuites_ratio: '',
    gratuites_applicable: false,
    actif: true,
  });

  // Paliers RFA
  const [paliers, setPaliers] = useState<PalierRFAResponse[]>([]);
  const [newPalier, setNewPalier] = useState<PalierRFACreate>({
    seuil_min: 0,
    seuil_max: null,
    taux_rfa: 0,
    description: '',
  });

  // Charger les donnees
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const labo = await laboratoiresApi.getById(laboratoireId);
      setLaboratoire(labo);

      // Charger l'accord actif
      const accords = await laboratoiresApi.listAccords(laboratoireId, true);
      if (accords.length > 0) {
        const activeAccord = accords[0];
        setAccord(activeAccord);
        setPaliers(activeAccord.paliers_rfa || []);

        // Pre-remplir le formulaire
        setForm({
          nom: activeAccord.nom,
          date_debut: activeAccord.date_debut,
          date_fin: activeAccord.date_fin,
          tranche_a_pct_ca: activeAccord.tranche_a_pct_ca,
          tranche_a_cible: activeAccord.tranche_a_cible,
          tranche_b_pct_ca: activeAccord.tranche_b_pct_ca,
          tranche_b_cible: activeAccord.tranche_b_cible,
          otc_cible: activeAccord.otc_cible,
          bonus_dispo_max_pct: activeAccord.bonus_dispo_max_pct,
          bonus_seuil_pct: activeAccord.bonus_seuil_pct,
          escompte_pct: activeAccord.escompte_pct,
          escompte_delai_jours: activeAccord.escompte_delai_jours,
          escompte_applicable: activeAccord.escompte_applicable,
          franco_seuil_ht: activeAccord.franco_seuil_ht,
          franco_frais_port: activeAccord.franco_frais_port,
          gratuites_seuil_qte: activeAccord.gratuites_seuil_qte,
          gratuites_ratio: activeAccord.gratuites_ratio,
          gratuites_applicable: activeAccord.gratuites_applicable,
          actif: activeAccord.actif,
        });
      }
    } catch {
      toast.error('Erreur lors du chargement des conditions');
    } finally {
      setIsLoading(false);
    }
  }, [laboratoireId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Sauvegarder
  const handleSave = async () => {
    if (!form.nom.trim()) {
      toast.error("Le nom de l'accord est obligatoire");
      return;
    }

    setIsSaving(true);
    try {
      if (accord) {
        // Mise a jour de l'accord existant
        const updated = await laboratoiresApi.updateAccord(laboratoireId, accord.id, form);
        setAccord(updated);
        toast.success('Conditions commerciales mises a jour');
      } else {
        // Creation d'un nouvel accord
        const created = await laboratoiresApi.createAccord(laboratoireId, form);
        setAccord(created);
        toast.success('Accord commercial cree');
      }
      onSaved?.();
    } catch (err: unknown) {
      const httpErr = err as { message?: string };
      toast.error(httpErr.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Paliers RFA
  const handleAddPalier = async () => {
    if (!accord) {
      toast.error("Sauvegardez d'abord l'accord avant d'ajouter des paliers");
      return;
    }
    if (newPalier.taux_rfa <= 0) {
      toast.error('Le taux RFA doit etre superieur a 0');
      return;
    }

    try {
      const created = await laboratoiresApi.createPalier(laboratoireId, accord.id, newPalier);
      setPaliers(prev => [...prev, created].sort((a, b) => a.seuil_min - b.seuil_min));
      setNewPalier({ seuil_min: 0, seuil_max: null, taux_rfa: 0, description: '' });
      toast.success('Palier RFA ajoute');
    } catch (err: unknown) {
      const httpErr = err as { message?: string };
      toast.error(httpErr.message || "Erreur lors de l'ajout du palier");
    }
  };

  const handleDeletePalier = async (palierId: number) => {
    if (!accord) return;
    try {
      await laboratoiresApi.deletePalier(laboratoireId, accord.id, palierId);
      setPaliers(prev => prev.filter(p => p.id !== palierId));
      toast.success('Palier supprime');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // ========================================
  // RENDER
  // ========================================

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Chargement des conditions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Conditions commerciales
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {laboratoire?.nom || 'Laboratoire'} — {accord ? 'Modifier' : 'Creer'} l&apos;accord
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Enregistrer
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Informations generales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Nom de l&apos;accord *
              </label>
              <input
                type="text"
                value={form.nom}
                onChange={e => updateField('nom', e.target.value)}
                placeholder="ex: Accord Biogaran 2025"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Date debut
              </label>
              <input
                type="date"
                value={form.date_debut}
                onChange={e => updateField('date_debut', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Date fin
              </label>
              <input
                type="date"
                value={form.date_fin || ''}
                onChange={e => updateField('date_fin', e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* ========== SECTION 1 : REMISES ========== */}
          <SectionAccordion
            title="Remises par tranche"
            icon={<Percent className="h-4 w-4" />}
            expanded={expandedSections.remises}
            onToggle={() => toggleSection('remises')}
            color="blue"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Tranche A */}
              <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Tranche A — Remboursables standard
                </h4>
                <NumberField
                  label="% CA theorique"
                  value={form.tranche_a_pct_ca || 0}
                  onChange={v => updateField('tranche_a_pct_ca', v)}
                  suffix="%"
                />
                <NumberField
                  label="Remise cible"
                  value={form.tranche_a_cible || 0}
                  onChange={v => updateField('tranche_a_cible', v)}
                  suffix="%"
                />
              </div>

              {/* Tranche B */}
              <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                  Tranche B — Faible marge
                </h4>
                <NumberField
                  label="% CA theorique"
                  value={form.tranche_b_pct_ca || 0}
                  onChange={v => updateField('tranche_b_pct_ca', v)}
                  suffix="%"
                />
                <NumberField
                  label="Remise cible"
                  value={form.tranche_b_cible || 0}
                  onChange={v => updateField('tranche_b_cible', v)}
                  suffix="%"
                />
              </div>
            </div>

            {/* OTC */}
            <div className="mt-3 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-3">
                OTC — Non remboursables
              </h4>
              <NumberField
                label="Remise cible OTC"
                value={form.otc_cible || 0}
                onChange={v => updateField('otc_cible', v)}
                suffix="%"
              />
            </div>
          </SectionAccordion>

          {/* ========== SECTION 2 : ESCOMPTE ========== */}
          <SectionAccordion
            title="Escompte"
            icon={<Euro className="h-4 w-4" />}
            expanded={expandedSections.escompte}
            onToggle={() => toggleSection('escompte')}
            color="emerald"
          >
            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.escompte_applicable || false}
                  onChange={e => updateField('escompte_applicable', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Escompte applicable
                </span>
              </label>
            </div>
            {form.escompte_applicable && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberField
                  label="Taux d'escompte"
                  value={form.escompte_pct || 0}
                  onChange={v => updateField('escompte_pct', v)}
                  suffix="%"
                  step={0.1}
                />
                <NumberField
                  label="Delai paiement"
                  value={form.escompte_delai_jours || 0}
                  onChange={v => updateField('escompte_delai_jours', Math.round(v))}
                  suffix="jours"
                  step={1}
                />
              </div>
            )}
          </SectionAccordion>

          {/* ========== SECTION 3 : FRANCO DE PORT ========== */}
          <SectionAccordion
            title="Franco de port"
            icon={<Truck className="h-4 w-4" />}
            expanded={expandedSections.franco}
            onToggle={() => toggleSection('franco')}
            color="orange"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField
                label="Seuil HT minimum"
                value={form.franco_seuil_ht || 0}
                onChange={v => updateField('franco_seuil_ht', v)}
                prefix={<Euro className="h-3.5 w-3.5" />}
                step={10}
              />
              <NumberField
                label="Frais de port"
                value={form.franco_frais_port || 0}
                onChange={v => updateField('franco_frais_port', v)}
                prefix={<Euro className="h-3.5 w-3.5" />}
                step={0.5}
              />
            </div>
            {(form.franco_seuil_ht || 0) > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Si la commande est inferieure a {formatCurrency(form.franco_seuil_ht || 0)},
                des frais de port de {formatCurrency(form.franco_frais_port || 0)} seront appliques.
              </p>
            )}
          </SectionAccordion>

          {/* ========== SECTION 4 : PALIERS RFA ========== */}
          <SectionAccordion
            title="Paliers RFA"
            icon={<BarChart3 className="h-4 w-4" />}
            expanded={expandedSections.rfa}
            onToggle={() => toggleSection('rfa')}
            color="indigo"
          >
            {/* Liste des paliers existants */}
            {paliers.length > 0 ? (
              <div className="space-y-2 mb-4">
                {paliers.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(p.seuil_min)} - {p.seuil_max ? formatCurrency(p.seuil_max) : '...'}
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {p.taux_rfa}%
                      </span>
                      {p.description && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({p.description})
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePalier(p.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Aucun palier RFA defini. Ajoutez des paliers pour la progression annuelle.
              </p>
            )}

            {/* Formulaire ajout palier */}
            {accord && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <h5 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-3">
                  Ajouter un palier
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Seuil min</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={newPalier.seuil_min}
                      onChange={e => setNewPalier(prev => ({ ...prev, seuil_min: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Seuil max</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={newPalier.seuil_max ?? ''}
                      onChange={e => setNewPalier(prev => ({ ...prev, seuil_max: e.target.value ? parseFloat(e.target.value) : null }))}
                      placeholder="illimite"
                      className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Taux RFA (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={newPalier.taux_rfa}
                      onChange={e => setNewPalier(prev => ({ ...prev, taux_rfa: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">Description</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newPalier.description || ''}
                        onChange={e => setNewPalier(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Palier..."
                        className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddPalier}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-[30px] px-2"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!accord && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                Enregistrez l&apos;accord d&apos;abord pour ajouter des paliers RFA.
              </div>
            )}
          </SectionAccordion>

          {/* ========== SECTION 5 : GRATUITES ========== */}
          <SectionAccordion
            title="Gratuites"
            icon={<Package className="h-4 w-4" />}
            expanded={expandedSections.gratuites}
            onToggle={() => toggleSection('gratuites')}
            color="teal"
          >
            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.gratuites_applicable || false}
                  onChange={e => updateField('gratuites_applicable', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Gratuites applicables
                </span>
              </label>
            </div>
            {form.gratuites_applicable && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberField
                  label="Seuil quantite"
                  value={form.gratuites_seuil_qte || 0}
                  onChange={v => updateField('gratuites_seuil_qte', Math.round(v))}
                  suffix="unites"
                  step={1}
                />
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Ratio gratuites
                  </label>
                  <input
                    type="text"
                    value={form.gratuites_ratio || ''}
                    onChange={e => updateField('gratuites_ratio', e.target.value)}
                    placeholder='ex: "10+1"'
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            {form.gratuites_applicable && (form.gratuites_seuil_qte || 0) > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Pour chaque {form.gratuites_seuil_qte} unites achetees ({form.gratuites_ratio}),
                une unite gratuite sera attendue sur la facture.
              </p>
            )}
          </SectionAccordion>

          {/* Resume */}
          {accord && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm font-medium mb-2">
                <CheckCircle2 className="h-4 w-4" />
                Accord actif : {accord.nom}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">Tranche A :</span> {form.tranche_a_cible}%
                </div>
                <div>
                  <span className="font-medium">Tranche B :</span> {form.tranche_b_cible}%
                </div>
                <div>
                  <span className="font-medium">Escompte :</span>{' '}
                  {form.escompte_applicable ? `${form.escompte_pct}%` : 'Non'}
                </div>
                <div>
                  <span className="font-medium">Franco :</span>{' '}
                  {(form.franco_seuil_ht || 0) > 0 ? formatCurrency(form.franco_seuil_ht || 0) : 'Non'}
                </div>
                <div>
                  <span className="font-medium">RFA :</span> {paliers.length} palier{paliers.length !== 1 ? 's' : ''}
                </div>
                <div>
                  <span className="font-medium">Gratuites :</span>{' '}
                  {form.gratuites_applicable ? form.gratuites_ratio : 'Non'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// SOUS-COMPOSANTS
// ========================================

function SectionAccordion({
  title,
  icon,
  expanded,
  onToggle,
  color,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="dark:bg-gray-800/50 dark:border-gray-700">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-t-lg"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && <CardContent className="pt-0 pb-4 px-4">{children}</CardContent>}
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  prefix,
  step = 0.01,
  min = 0,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  prefix?: React.ReactNode;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className={`w-full ${prefix ? 'pl-8' : 'pl-3'} ${suffix ? 'pr-14' : 'pr-3'} py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
