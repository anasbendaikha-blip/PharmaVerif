/**
 * PharmaVerif - Formulaire de gestion des conditions specifiques
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 */

import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Plus, X, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../../data/database';
import { formatCurrency, formatPercentage } from '../../utils/formatNumber';
import {
  ConditionSpecifique,
  TypeCondition,
  ConditionParametres,
  ConditionFormData,
  SeuilRow,
  GammeRow,
  CONDITION_LABELS,
  EMPTY_CONDITION,
  typeBadgeClasses,
  statusBadgeClasses,
} from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConditionsFormProps {
  fournisseurId: number;
  conditions: ConditionSpecifique[];
  onConditionsChange: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConditionsForm({
  fournisseurId,
  conditions,
  onConditionsChange,
}: ConditionsFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ConditionFormData>(EMPTY_CONDITION);
  const [seuils, setSeuils] = useState<SeuilRow[]>([{ min: 0, max: undefined, taux: 0 }]);
  const [gammes, setGammes] = useState<GammeRow[]>([{ nom: '', taux: 0 }]);

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  const resetForm = () => {
    setFormData(EMPTY_CONDITION);
    setSeuils([{ min: 0, max: undefined, taux: 0 }]);
    setGammes([{ nom: '', taux: 0 }]);
  };

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = () => {
    if (!formData.nom.trim()) {
      toast.error('Le nom de la condition est obligatoire');
      return;
    }

    let parametres: ConditionParametres = {};

    switch (formData.type_condition) {
      case 'remise_volume':
        parametres = {
          seuils: seuils.map((s) => ({ min: s.min, max: s.max, taux: s.taux })),
        };
        break;
      case 'franco_seuil':
        parametres = {
          seuil_montant: formData.parametres.seuil_montant || 0,
        };
        break;
      case 'rfa':
        parametres = {
          objectif_annuel: formData.parametres.objectif_annuel || 0,
          taux_rfa: formData.parametres.taux_rfa || 0,
        };
        break;
      case 'remise_gamme':
        parametres = {
          gammes: gammes.map((g) => ({ nom: g.nom, taux: g.taux })),
        };
        break;
      case 'escompte_conditionnel':
        parametres = {
          taux: formData.parametres.taux || 0,
          delai_jours: formData.parametres.delai_jours || 0,
        };
        break;
      default:
        parametres = formData.parametres;
        break;
    }

    db.createCondition({
      fournisseur_id: fournisseurId,
      type_condition: formData.type_condition,
      nom: formData.nom.trim(),
      description: formData.description,
      parametres,
      actif: true,
    });

    toast.success('Condition ajoutee');
    resetForm();
    setShowForm(false);
    onConditionsChange();
  };

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  const handleDelete = (condId: number) => {
    db.deleteCondition(condId);
    toast.success('Condition supprimee');
    onConditionsChange();
  };

  // -------------------------------------------------------------------------
  // Condition parametres sub-form
  // -------------------------------------------------------------------------

  const renderParametres = () => {
    switch (formData.type_condition) {
      case 'remise_volume':
        return (
          <div className="space-y-3">
            <Label className="text-gray-700 dark:text-gray-300">
              Seuils de remise volume
            </Label>
            <div className="space-y-2">
              {seuils.map((seuil, idx) => (
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
                        const next = [...seuils];
                        next[idx] = { ...next[idx], min: parseFloat(e.target.value) || 0 };
                        setSeuils(next);
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
                        const next = [...seuils];
                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                        next[idx] = { ...next[idx], max: val };
                        setSeuils(next);
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
                        const next = [...seuils];
                        next[idx] = { ...next[idx], taux: parseFloat(e.target.value) || 0 };
                        setSeuils(next);
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 h-8 w-8 p-0"
                    onClick={() => {
                      if (seuils.length > 1) {
                        setSeuils(seuils.filter((_, i) => i !== idx));
                      }
                    }}
                    disabled={seuils.length <= 1}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSeuils([...seuils, { min: 0, max: undefined, taux: 0 }])}
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
              value={formData.parametres.seuil_montant || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  parametres: {
                    ...formData.parametres,
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
                value={formData.parametres.objectif_annuel || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parametres: {
                      ...formData.parametres,
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
                value={formData.parametres.taux_rfa || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parametres: {
                      ...formData.parametres,
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
              {gammes.map((gamme, idx) => (
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
                        const next = [...gammes];
                        next[idx] = { ...next[idx], nom: e.target.value };
                        setGammes(next);
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
                        const next = [...gammes];
                        next[idx] = { ...next[idx], taux: parseFloat(e.target.value) || 0 };
                        setGammes(next);
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 h-8 w-8 p-0"
                    onClick={() => {
                      if (gammes.length > 1) {
                        setGammes(gammes.filter((_, i) => i !== idx));
                      }
                    }}
                    disabled={gammes.length <= 1}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGammes([...gammes, { nom: '', taux: 0 }])}
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
                value={formData.parametres.taux || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parametres: {
                      ...formData.parametres,
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
                value={formData.parametres.delai_jours || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parametres: {
                      ...formData.parametres,
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
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? (
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
      {showForm && (
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
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Type</Label>
              <Select
                value={formData.type_condition}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
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
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* Dynamic parametres */}
          {renderParametres()}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSave}
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
                      <span>Seuil: {formatCurrency(cond.parametres.seuil_montant)}</span>
                    )}
                  {cond.type_condition === 'rfa' && (
                    <span>
                      Objectif: {formatCurrency(cond.parametres.objectif_annuel || 0)} / Taux:{' '}
                      {formatPercentage(cond.parametres.taux_rfa || 0)}
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
                      Taux: {formatPercentage(cond.parametres.taux || 0)} / Delai:{' '}
                      {cond.parametres.delai_jours}j
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 h-8 w-8 p-0 shrink-0"
                onClick={() => handleDelete(cond.id)}
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
  );
}
