/**
 * PharmaVerif - Page de gestion des fournisseurs
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 */

import { useState, useCallback } from 'react';
import {
  Fournisseur,
  ConditionSpecifique,
  TypeFournisseur,
  TypeCondition,
  ConditionParametres,
} from '../types';
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
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Building2,
  Plus,
  X,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  Settings,
  FlaskConical,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types locaux
// ---------------------------------------------------------------------------

interface FournisseursPageProps {
  onNavigate: (page: string) => void;
}

interface FournisseurFormData {
  nom: string;
  type_fournisseur: TypeFournisseur;
  notes: string;
  actif: boolean;
  remise_base: number;
  cooperation_commerciale: number;
  escompte: number;
  franco: number;
  remise_gamme_actif: boolean;
  remise_quantite_actif: boolean;
  rfa_actif: boolean;
}

interface ConditionFormData {
  type_condition: TypeCondition;
  nom: string;
  description: string;
  parametres: ConditionParametres;
}

interface SeuilRow {
  min: number;
  max?: number;
  taux: number;
}

interface GammeRow {
  nom: string;
  taux: number;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<TypeFournisseur, string> = {
  grossiste: 'Grossiste',
  laboratoire: 'Laboratoire',
  autre: 'Autre',
};

const CONDITION_LABELS: Record<TypeCondition, string> = {
  remise_volume: 'Remise volume',
  remise_gamme: 'Remise gamme',
  remise_produit: 'Remise produit',
  escompte_conditionnel: 'Escompte conditionnel',
  franco_seuil: 'Franco seuil',
  rfa: 'RFA',
  autre: 'Autre',
};

const EMPTY_FORM: FournisseurFormData = {
  nom: '',
  type_fournisseur: 'grossiste',
  notes: '',
  actif: true,
  remise_base: 0,
  cooperation_commerciale: 0,
  escompte: 0,
  franco: 0,
  remise_gamme_actif: false,
  remise_quantite_actif: false,
  rfa_actif: false,
};

const EMPTY_CONDITION: ConditionFormData = {
  type_condition: 'remise_volume',
  nom: '',
  description: '',
  parametres: {},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function typeBadgeClasses(type: TypeFournisseur): string {
  switch (type) {
    case 'grossiste':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'laboratoire':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

function statusBadgeClasses(actif: boolean): string {
  return actif
    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
}

function typeIcon(type: TypeFournisseur) {
  switch (type) {
    case 'grossiste':
      return <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    case 'laboratoire':
      return <FlaskConical className="h-5 w-5 text-violet-600 dark:text-violet-400" />;
    default:
      return <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
  }
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

  // Condition form
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [conditionForm, setConditionForm] = useState<ConditionFormData>(EMPTY_CONDITION);
  const [conditionSeuils, setConditionSeuils] = useState<SeuilRow[]>([{ min: 0, max: undefined, taux: 0 }]);
  const [conditionGammes, setConditionGammes] = useState<GammeRow[]>([{ nom: '', taux: 0 }]);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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
  // Filtering
  // -------------------------------------------------------------------------

  const filteredFournisseurs = fournisseurs.filter((f) => {
    if (filterType !== 'tous' && f.type_fournisseur !== filterType) return false;
    if (filterStatus === 'actif' && !f.actif) return false;
    return true;
  });

  const byType = (type: TypeFournisseur) =>
    filteredFournisseurs.filter((f) => f.type_fournisseur === type);

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

  const handleDelete = (id: number) => {
    const f = fournisseurs.find((x) => x.id === id);
    if (!f) return;
    db.deleteFournisseur(id);
    toast.success(`Fournisseur "${f.nom}" supprime`);
    setConfirmDeleteId(null);
    loadData();

    // If the deleted fournisseur was open in details, close details
    if (selectedFournisseur?.id === id) {
      setShowDetailsModal(false);
      setSelectedFournisseur(null);
    }
  };

  // -------------------------------------------------------------------------
  // Details modal
  // -------------------------------------------------------------------------

  const openDetails = (f: Fournisseur) => {
    setSelectedFournisseur(f);
    loadConditions(f.id);
    setShowConditionForm(false);
    setShowDetailsModal(true);
  };

  // -------------------------------------------------------------------------
  // Condition CRUD handlers
  // -------------------------------------------------------------------------

  const resetConditionForm = () => {
    setConditionForm(EMPTY_CONDITION);
    setConditionSeuils([{ min: 0, max: undefined, taux: 0 }]);
    setConditionGammes([{ nom: '', taux: 0 }]);
  };

  const handleSaveCondition = () => {
    if (!selectedFournisseur) return;
    if (!conditionForm.nom.trim()) {
      toast.error('Le nom de la condition est obligatoire');
      return;
    }

    let parametres: ConditionParametres = {};

    switch (conditionForm.type_condition) {
      case 'remise_volume':
        parametres = {
          seuils: conditionSeuils.map((s) => ({
            min: s.min,
            max: s.max,
            taux: s.taux,
          })),
        };
        break;
      case 'franco_seuil':
        parametres = {
          seuil_montant: conditionForm.parametres.seuil_montant || 0,
        };
        break;
      case 'rfa':
        parametres = {
          objectif_annuel: conditionForm.parametres.objectif_annuel || 0,
          taux_rfa: conditionForm.parametres.taux_rfa || 0,
        };
        break;
      case 'remise_gamme':
        parametres = {
          gammes: conditionGammes.map((g) => ({ nom: g.nom, taux: g.taux })),
        };
        break;
      case 'escompte_conditionnel':
        parametres = {
          taux: conditionForm.parametres.taux || 0,
          delai_jours: conditionForm.parametres.delai_jours || 0,
        };
        break;
      default:
        parametres = conditionForm.parametres;
        break;
    }

    db.createCondition({
      fournisseur_id: selectedFournisseur.id,
      type_condition: conditionForm.type_condition,
      nom: conditionForm.nom.trim(),
      description: conditionForm.description,
      parametres,
      actif: true,
    });

    toast.success('Condition ajoutee');
    resetConditionForm();
    setShowConditionForm(false);
    loadConditions(selectedFournisseur.id);
  };

  const handleDeleteCondition = (condId: number) => {
    if (!selectedFournisseur) return;
    db.deleteCondition(condId);
    toast.success('Condition supprimee');
    loadConditions(selectedFournisseur.id);
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderFournisseurCard = (f: Fournisseur) => {
    const condCount = db.getConditionsByFournisseur(f.id).filter((c) => c.actif).length;

    return (
      <Card key={f.id} className="relative group">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              {typeIcon(f.type_fournisseur)}
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {f.nom}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className={typeBadgeClasses(f.type_fournisseur)}>
                    {TYPE_LABELS[f.type_fournisseur]}
                  </Badge>
                  <Badge className={statusBadgeClasses(f.actif)}>
                    {f.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Key info */}
          <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400 mb-4">
            {f.type_fournisseur === 'grossiste' && (
              <>
                <div className="flex justify-between">
                  <span>Remise de base</span>
                  <span className="font-medium text-gray-900 dark:text-white">{f.remise_base}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Cooperation comm.</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {f.cooperation_commerciale}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Escompte</span>
                  <span className="font-medium text-gray-900 dark:text-white">{f.escompte}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Franco</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {f.franco.toFixed(2)} &euro;
                  </span>
                </div>
              </>
            )}
            {f.type_fournisseur === 'laboratoire' && (
              <>
                <div className="flex justify-between">
                  <span>Conditions actives</span>
                  <span className="font-medium text-gray-900 dark:text-white">{condCount}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {f.remise_gamme_actif && (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[11px]">
                      Remise gamme
                    </Badge>
                  )}
                  {f.remise_quantite_actif && (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[11px]">
                      Remise quantite
                    </Badge>
                  )}
                  {f.rfa_actif && (
                    <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 text-[11px]">
                      RFA
                    </Badge>
                  )}
                </div>
              </>
            )}
            {f.type_fournisseur === 'autre' && (
              <div className="flex justify-between">
                <span>Conditions actives</span>
                <span className="font-medium text-gray-900 dark:text-white">{condCount}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => openDetails(f)}
            >
              <Eye className="h-3.5 w-3.5" />
              Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => openEditModal(f)}
            >
              <Edit className="h-3.5 w-3.5" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              onClick={() => setConfirmDeleteId(f.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>

        {/* Delete confirmation overlay */}
        {confirmDeleteId === f.id && (
          <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 rounded-xl flex flex-col items-center justify-center z-10 p-6">
            <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-white text-center mb-1">
              Supprimer &laquo; {f.nom} &raquo; ?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
              Cette action est irreversible.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteId(null)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(f.id)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
  };

  const renderCardGrid = (list: Fournisseur[]) => {
    if (list.length === 0) {
      return (
        <div className="col-span-full text-center py-12">
          <Building2 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Aucun fournisseur dans cette categorie
          </p>
        </div>
      );
    }
    return list.map(renderFournisseurCard);
  };

  // -------------------------------------------------------------------------
  // Condition parametres sub-form
  // -------------------------------------------------------------------------

  const renderConditionParametres = () => {
    switch (conditionForm.type_condition) {
      case 'remise_volume':
        return (
          <div className="space-y-3">
            <Label className="text-gray-700 dark:text-gray-300">
              Seuils de remise volume
            </Label>
            <div className="space-y-2">
              {conditionSeuils.map((seuil, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
                >
                  <div>
                    {idx === 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Min</span>
                    )}
                    <input
                      type="number"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white"
                      value={seuil.min}
                      onChange={(e) => {
                        const next = [...conditionSeuils];
                        next[idx] = { ...next[idx], min: parseFloat(e.target.value) || 0 };
                        setConditionSeuils(next);
                      }}
                    />
                  </div>
                  <div>
                    {idx === 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Max</span>
                    )}
                    <input
                      type="number"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white"
                      placeholder="Illimite"
                      value={seuil.max ?? ''}
                      onChange={(e) => {
                        const next = [...conditionSeuils];
                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                        next[idx] = { ...next[idx], max: val };
                        setConditionSeuils(next);
                      }}
                    />
                  </div>
                  <div>
                    {idx === 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Taux (%)</span>
                    )}
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white"
                      value={seuil.taux}
                      onChange={(e) => {
                        const next = [...conditionSeuils];
                        next[idx] = { ...next[idx], taux: parseFloat(e.target.value) || 0 };
                        setConditionSeuils(next);
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 h-8 w-8 p-0"
                    onClick={() => {
                      if (conditionSeuils.length > 1) {
                        setConditionSeuils(conditionSeuils.filter((_, i) => i !== idx));
                      }
                    }}
                    disabled={conditionSeuils.length <= 1}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setConditionSeuils([...conditionSeuils, { min: 0, max: undefined, taux: 0 }])
              }
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un seuil
            </Button>
          </div>
        );

      case 'franco_seuil':
        return (
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">
              Seuil montant (&euro;)
            </Label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              value={conditionForm.parametres.seuil_montant || ''}
              onChange={(e) =>
                setConditionForm({
                  ...conditionForm,
                  parametres: {
                    ...conditionForm.parametres,
                    seuil_montant: parseFloat(e.target.value) || 0,
                  },
                })
              }
            />
          </div>
        );

      case 'rfa':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">
                Objectif annuel (&euro;)
              </Label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                value={conditionForm.parametres.objectif_annuel || ''}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    parametres: {
                      ...conditionForm.parametres,
                      objectif_annuel: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Taux RFA (%)</Label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                value={conditionForm.parametres.taux_rfa || ''}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    parametres: {
                      ...conditionForm.parametres,
                      taux_rfa: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>
        );

      case 'remise_gamme':
        return (
          <div className="space-y-3">
            <Label className="text-gray-700 dark:text-gray-300">Gammes</Label>
            <div className="space-y-2">
              {conditionGammes.map((gamme, idx) => (
                <div key={idx} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-end">
                  <div>
                    {idx === 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Nom</span>
                    )}
                    <input
                      type="text"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white"
                      value={gamme.nom}
                      onChange={(e) => {
                        const next = [...conditionGammes];
                        next[idx] = { ...next[idx], nom: e.target.value };
                        setConditionGammes(next);
                      }}
                    />
                  </div>
                  <div>
                    {idx === 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Taux (%)</span>
                    )}
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white"
                      value={gamme.taux}
                      onChange={(e) => {
                        const next = [...conditionGammes];
                        next[idx] = { ...next[idx], taux: parseFloat(e.target.value) || 0 };
                        setConditionGammes(next);
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 h-8 w-8 p-0"
                    onClick={() => {
                      if (conditionGammes.length > 1) {
                        setConditionGammes(conditionGammes.filter((_, i) => i !== idx));
                      }
                    }}
                    disabled={conditionGammes.length <= 1}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConditionGammes([...conditionGammes, { nom: '', taux: 0 }])}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une gamme
            </Button>
          </div>
        );

      case 'escompte_conditionnel':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Taux (%)</Label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                value={conditionForm.parametres.taux || ''}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    parametres: {
                      ...conditionForm.parametres,
                      taux: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Delai (jours)</Label>
              <input
                type="number"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                value={conditionForm.parametres.delai_jours || ''}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    parametres: {
                      ...conditionForm.parametres,
                      delai_jours: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ============== Header ============== */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                Gestion des fournisseurs
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {fournisseurs.length} fournisseur{fournisseurs.length > 1 ? 's' : ''} enregistre
                {fournisseurs.length > 1 ? 's' : ''}
              </p>
            </div>
            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={openCreateModal}
            >
              <Plus className="h-4 w-4" />
              Ajouter un fournisseur
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ============== Filter bar ============== */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les types</SelectItem>
                    <SelectItem value="grossiste">Grossiste</SelectItem>
                    <SelectItem value="laboratoire">Laboratoire</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">Statut</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actifs uniquement</SelectItem>
                    <SelectItem value="tous">Tous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============== Tabs ============== */}
        <Tabs defaultValue="grossistes" className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="grossistes" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Grossistes ({byType('grossiste').length})
            </TabsTrigger>
            <TabsTrigger value="laboratoires" className="gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" />
              Laboratoires ({byType('laboratoire').length})
            </TabsTrigger>
            <TabsTrigger value="autres" className="gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Autres ({byType('autre').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grossistes">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderCardGrid(byType('grossiste'))}
            </div>
          </TabsContent>

          <TabsContent value="laboratoires">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderCardGrid(byType('laboratoire'))}
            </div>
          </TabsContent>

          <TabsContent value="autres">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderCardGrid(byType('autre'))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
          <Card className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 shadow-xl">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={() => {
              setShowDetailsModal(false);
              setSelectedFournisseur(null);
            }}
          />

          {/* Dialog */}
          <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 shadow-xl">
            <CardHeader className="border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {typeIcon(selectedFournisseur.type_fournisseur)}
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedFournisseur.nom}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={typeBadgeClasses(selectedFournisseur.type_fournisseur)}>
                        {TYPE_LABELS[selectedFournisseur.type_fournisseur]}
                      </Badge>
                      <Badge className={statusBadgeClasses(selectedFournisseur.actif)}>
                        {selectedFournisseur.actif ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedFournisseur(null);
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Informations generales */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Informations generales
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">ID</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedFournisseur.id}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Type</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {TYPE_LABELS[selectedFournisseur.type_fournisseur]}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Cree le</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedFournisseur.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Modifie le</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedFournisseur.updated_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {selectedFournisseur.notes && (
                    <div className="col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">Notes</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedFournisseur.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Grossiste parameters */}
              {selectedFournisseur.type_fournisseur === 'grossiste' && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Parametres grossiste
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                      <span className="text-gray-500 dark:text-gray-400">Remise base</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedFournisseur.remise_base}%
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                      <span className="text-gray-500 dark:text-gray-400">Coop. comm.</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedFournisseur.cooperation_commerciale}%
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                      <span className="text-gray-500 dark:text-gray-400">Escompte</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedFournisseur.escompte}%
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                      <span className="text-gray-500 dark:text-gray-400">Franco</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedFournisseur.franco.toFixed(2)} &euro;
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Laboratoire parameters */}
              {selectedFournisseur.type_fournisseur === 'laboratoire' && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Parametres laboratoire
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={
                        selectedFournisseur.remise_gamme_actif
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }
                    >
                      Remise gamme: {selectedFournisseur.remise_gamme_actif ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge
                      className={
                        selectedFournisseur.remise_quantite_actif
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }
                    >
                      Remise quantite:{' '}
                      {selectedFournisseur.remise_quantite_actif ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge
                      className={
                        selectedFournisseur.rfa_actif
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }
                    >
                      RFA: {selectedFournisseur.rfa_actif ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Conditions specifiques */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Conditions specifiques ({conditions.length})
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      resetConditionForm();
                      setShowConditionForm(!showConditionForm);
                    }}
                  >
                    {showConditionForm ? (
                      <>
                        <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                        Fermer
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter
                      </>
                    )}
                  </Button>
                </div>

                {/* Condition creation form */}
                {showConditionForm && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nouvelle condition
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 dark:text-gray-300">Nom *</Label>
                        <input
                          type="text"
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Nom de la condition"
                          value={conditionForm.nom}
                          onChange={(e) =>
                            setConditionForm({ ...conditionForm, nom: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-700 dark:text-gray-300">Type</Label>
                        <Select
                          value={conditionForm.type_condition}
                          onValueChange={(v) =>
                            setConditionForm({
                              ...conditionForm,
                              type_condition: v as TypeCondition,
                              parametres: {},
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(CONDITION_LABELS) as TypeCondition[]).map((tc) => (
                              <SelectItem key={tc} value={tc}>
                                {CONDITION_LABELS[tc]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-gray-700 dark:text-gray-300">Description</Label>
                      <textarea
                        rows={2}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Description optionnelle..."
                        value={conditionForm.description}
                        onChange={(e) =>
                          setConditionForm({ ...conditionForm, description: e.target.value })
                        }
                      />
                    </div>

                    {/* Dynamic parametres */}
                    {renderConditionParametres()}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowConditionForm(false);
                          resetConditionForm();
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleSaveCondition}
                      >
                        Ajouter la condition
                      </Button>
                    </div>
                  </div>
                )}

                {/* Conditions list */}
                {conditions.length > 0 ? (
                  <div className="space-y-2">
                    {conditions.map((cond) => (
                      <div
                        key={cond.id}
                        className="flex items-start justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {cond.nom}
                            </span>
                            <Badge className={typeBadgeClasses(
                              cond.type_condition === 'remise_volume' || cond.type_condition === 'franco_seuil'
                                ? 'grossiste'
                                : cond.type_condition === 'remise_gamme' || cond.type_condition === 'rfa'
                                  ? 'laboratoire'
                                  : 'autre'
                            )}>
                              {CONDITION_LABELS[cond.type_condition]}
                            </Badge>
                            <Badge className={statusBadgeClasses(cond.actif)}>
                              {cond.actif ? 'Actif' : 'Inactif'}
                            </Badge>
                          </div>
                          {cond.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                              {cond.description}
                            </p>
                          )}
                          {/* Parametres summary */}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {cond.type_condition === 'remise_volume' &&
                              cond.parametres.seuils && (
                                <span>
                                  {cond.parametres.seuils.length} seuil
                                  {cond.parametres.seuils.length > 1 ? 'x' : ''}
                                </span>
                              )}
                            {cond.type_condition === 'franco_seuil' &&
                              cond.parametres.seuil_montant !== undefined && (
                                <span>Seuil: {cond.parametres.seuil_montant} &euro;</span>
                              )}
                            {cond.type_condition === 'rfa' && (
                              <span>
                                Objectif: {cond.parametres.objectif_annuel} &euro; / Taux:{' '}
                                {cond.parametres.taux_rfa}%
                              </span>
                            )}
                            {cond.type_condition === 'remise_gamme' &&
                              cond.parametres.gammes && (
                                <span>
                                  {cond.parametres.gammes.length} gamme
                                  {cond.parametres.gammes.length > 1 ? 's' : ''}
                                </span>
                              )}
                            {cond.type_condition === 'escompte_conditionnel' && (
                              <span>
                                Taux: {cond.parametres.taux}% / Delai:{' '}
                                {cond.parametres.delai_jours}j
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 h-8 w-8 p-0 shrink-0"
                          onClick={() => handleDeleteCondition(cond.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
                    Aucune condition specifique
                  </div>
                )}
              </div>

              {/* Modal actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedFournisseur(null);
                  }}
                >
                  Fermer
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    setShowDetailsModal(false);
                    openEditModal(selectedFournisseur);
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
