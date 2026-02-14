/**
 * PharmaVerif - Page de gestion des fournisseurs
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Refactored: sous-composants FournisseursList, FournisseurDetail, ConditionsForm
 */

import { useState, useCallback } from 'react';
import { Fournisseur, ConditionSpecifique, TypeFournisseur } from '../types';
import { db } from '../data/database';
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
import { PageHeader } from '../components/ui/page-header';
import { Building2, Plus, X, Settings, Database } from 'lucide-react';
import { toast } from 'sonner';
import { isApiMode } from '../api/config';
import { laboratoiresApi } from '../api/laboratoiresApi';
import { ConfirmDialog } from '../components/ui/confirm-dialog';

import { FournisseursList, FournisseurDetail } from './fournisseurs';
import {
  FournisseurFormData,
  EMPTY_FORM,
  TYPE_LABELS,
} from './fournisseurs/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FournisseursPageProps {
  onNavigate: (page: string) => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FournisseursPage({ onNavigate: _onNavigate }: FournisseursPageProps) {
  // Data
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(() => db.getAllFournisseurs());
  const [conditions, setConditions] = useState<ConditionSpecifique[]>([]);

  // Filters
  const [filterType, setFilterType] = useState<string>('tous');
  const [filterStatus, setFilterStatus] = useState<string>('actif');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);

  // Form state
  const [formData, setFormData] = useState<FournisseurFormData>(EMPTY_FORM);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // API actions loading states
  const [recalculLoading, setRecalculLoading] = useState(false);
  const [initTemplatesLoading, setInitTemplatesLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const loadData = useCallback(() => {
    const all = db.getAllFournisseurs();
    setFournisseurs(all);
  }, []);

  const loadConditions = useCallback((fournisseurId: number) => {
    const conds = db.getConditionsByFournisseur(fournisseurId);
    setConditions(conds);
  }, []);

  // -------------------------------------------------------------------------
  // Fournisseur CRUD handlers
  // -------------------------------------------------------------------------

  const openCreateModal = () => {
    setEditingFournisseur(null);
    setFormData(EMPTY_FORM);
    setShowFormModal(true);
  };

  const openEditModal = (f: Fournisseur) => {
    setEditingFournisseur(f);
    setFormData({
      nom: f.nom,
      type_fournisseur: f.type_fournisseur,
      notes: f.notes,
      actif: f.actif,
      remise_base: f.remise_base,
      cooperation_commerciale: f.cooperation_commerciale,
      escompte: f.escompte,
      franco: f.franco,
      remise_gamme_actif: f.remise_gamme_actif,
      remise_quantite_actif: f.remise_quantite_actif,
      rfa_actif: f.rfa_actif,
    });
    setShowFormModal(true);
  };

  const handleSave = () => {
    if (!formData.nom.trim()) {
      toast.error('Le nom du fournisseur est obligatoire');
      return;
    }

    if (editingFournisseur) {
      const updated = db.updateFournisseur(editingFournisseur.id, {
        nom: formData.nom.trim(),
        type_fournisseur: formData.type_fournisseur,
        notes: formData.notes,
        actif: formData.actif,
        remise_base: formData.remise_base,
        cooperation_commerciale: formData.cooperation_commerciale,
        escompte: formData.escompte,
        franco: formData.franco,
        remise_gamme_actif: formData.remise_gamme_actif,
        remise_quantite_actif: formData.remise_quantite_actif,
        rfa_actif: formData.rfa_actif,
      });
      if (updated) {
        toast.success(`Fournisseur "${updated.nom}" mis a jour`);
      }
    } else {
      const created = db.createFournisseur({
        nom: formData.nom.trim(),
        type_fournisseur: formData.type_fournisseur,
        notes: formData.notes,
        actif: formData.actif,
        remise_base: formData.remise_base,
        cooperation_commerciale: formData.cooperation_commerciale,
        escompte: formData.escompte,
        franco: formData.franco,
        remise_gamme_actif: formData.remise_gamme_actif,
        remise_quantite_actif: formData.remise_quantite_actif,
        rfa_actif: formData.rfa_actif,
      });
      toast.success(`Fournisseur "${created.nom}" cree`);
    }

    setShowFormModal(false);
    loadData();
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteId) return;
    const f = fournisseurs.find((x) => x.id === confirmDeleteId);
    if (!f) return;
    db.deleteFournisseur(confirmDeleteId);
    toast.success(`Fournisseur "${f.nom}" supprime`);
    setConfirmDeleteId(null);
    loadData();

    // If the deleted fournisseur was open in details, close details
    if (selectedFournisseur?.id === confirmDeleteId) {
      setShowDetailsModal(false);
      setSelectedFournisseur(null);
    }
  };

  // -------------------------------------------------------------------------
  // API actions (recalcul & init templates)
  // -------------------------------------------------------------------------

  const handleRecalculer = async (fournisseurId: number) => {
    setRecalculLoading(true);
    try {
      const res = await laboratoiresApi.recalculer(fournisseurId);
      if (res.erreurs > 0) {
        toast.warning(
          `${res.message} - ${res.succes} succes, ${res.erreurs} erreur(s) sur ${res.total} facture(s)`
        );
      } else {
        toast.success(
          `${res.message} - ${res.succes}/${res.total} facture(s) recalculee(s)`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Echec du recalcul : ${msg}`);
    } finally {
      setRecalculLoading(false);
    }
  };

  const handleInitTemplates = async () => {
    setInitTemplatesLoading(true);
    try {
      const res = await laboratoiresApi.initTemplates();
      toast.success(res.message || 'Templates laboratoires initialises');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Echec de l'initialisation : ${msg}`);
    } finally {
      setInitTemplatesLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Details modal
  // -------------------------------------------------------------------------

  const openDetails = (f: Fournisseur) => {
    setSelectedFournisseur(f);
    loadConditions(f.id);
    setShowDetailsModal(true);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Gestion des fournisseurs"
        description={`${fournisseurs.length} fournisseur${fournisseurs.length > 1 ? 's' : ''} enregistre${fournisseurs.length > 1 ? 's' : ''}`}
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            {isApiMode() && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleInitTemplates}
                disabled={initTemplatesLoading}
              >
                <Database className={`h-4 w-4 ${initTemplatesLoading ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">
                  {initTemplatesLoading ? 'Initialisation...' : 'Initialiser les templates labos'}
                </span>
              </Button>
            )}
            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={openCreateModal}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter un fournisseur</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </div>
        }
      />

      {/* List with filters and tabs */}
      <FournisseursList
        fournisseurs={fournisseurs}
        filterType={filterType}
        filterStatus={filterStatus}
        onFilterTypeChange={setFilterType}
        onFilterStatusChange={setFilterStatus}
        onOpenDetails={openDetails}
        onOpenEdit={openEditModal}
        onDelete={handleConfirmDelete}
        confirmDeleteId={confirmDeleteId}
        onConfirmDeleteChange={setConfirmDeleteId}
      />

      {/* ============================================================= */}
      {/* CREATE / EDIT MODAL                                            */}
      {/* ============================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={() => setShowFormModal(false)}
          />

          {/* Dialog */}
          <Card className="relative z-10 w-full max-w-lg max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 shadow-xl sm:rounded-xl rounded-none">
            <CardHeader className="border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingFournisseur ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFormModal(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              {/* Nom */}
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">Nom *</Label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom du fournisseur"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">Type de fournisseur</Label>
                <Select
                  value={formData.type_fournisseur}
                  onValueChange={(v) =>
                    setFormData({ ...formData, type_fournisseur: v as TypeFournisseur })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grossiste">Grossiste</SelectItem>
                    <SelectItem value="laboratoire">Laboratoire</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">Notes</Label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Notes optionnelles..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Actif */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="form-actif"
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                />
                <Label htmlFor="form-actif" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                  Fournisseur actif
                </Label>
              </div>

              {/* Grossiste-specific fields */}
              {formData.type_fournisseur === 'grossiste' && (
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Settings className="h-4 w-4" />
                    Parametres grossiste
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 dark:text-gray-300">Remise base (%)</Label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.remise_base}
                        onChange={(e) =>
                          setFormData({ ...formData, remise_base: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 dark:text-gray-300">Coop. comm. (%)</Label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.cooperation_commerciale}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cooperation_commerciale: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 dark:text-gray-300">Escompte (%)</Label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.escompte}
                        onChange={(e) =>
                          setFormData({ ...formData, escompte: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-700 dark:text-gray-300">Franco (&euro;)</Label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.franco}
                        onChange={(e) =>
                          setFormData({ ...formData, franco: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Laboratoire-specific fields */}
              {formData.type_fournisseur === 'laboratoire' && (
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Settings className="h-4 w-4" />
                    Parametres laboratoire
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="remise-gamme"
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        checked={formData.remise_gamme_actif}
                        onChange={(e) =>
                          setFormData({ ...formData, remise_gamme_actif: e.target.checked })
                        }
                      />
                      <Label htmlFor="remise-gamme" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                        Remise gamme active
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="remise-quantite"
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        checked={formData.remise_quantite_actif}
                        onChange={(e) =>
                          setFormData({ ...formData, remise_quantite_actif: e.target.checked })
                        }
                      />
                      <Label htmlFor="remise-quantite" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                        Remise quantite active
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="rfa-actif"
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        checked={formData.rfa_actif}
                        onChange={(e) =>
                          setFormData({ ...formData, rfa_actif: e.target.checked })
                        }
                      />
                      <Label htmlFor="rfa-actif" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                        RFA active
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button variant="outline" onClick={() => setShowFormModal(false)}>
                  Annuler
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSave}
                >
                  {editingFournisseur ? 'Enregistrer' : 'Creer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* DETAILS MODAL                                                  */}
      {/* ============================================================= */}
      {showDetailsModal && selectedFournisseur && (
        <FournisseurDetail
          fournisseur={selectedFournisseur}
          conditions={conditions}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedFournisseur(null);
          }}
          onEdit={() => {
            setShowDetailsModal(false);
            openEditModal(selectedFournisseur);
          }}
          onConditionsChange={() => loadConditions(selectedFournisseur.id)}
          onRecalculer={handleRecalculer}
          recalculLoading={recalculLoading}
        />
      )}

      {/* ============================================================= */}
      {/* DELETE CONFIRM DIALOG                                           */}
      {/* ============================================================= */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer ce fournisseur ?"
        description="Toutes les conditions commerciales associees seront egalement supprimees."
        itemName={
          confirmDeleteId
            ? fournisseurs.find((f) => f.id === confirmDeleteId)?.nom
            : undefined
        }
      />
    </div>
  );
}
