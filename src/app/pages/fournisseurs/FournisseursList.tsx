/**
 * PharmaVerif - Liste des fournisseurs avec filtres et grille de cartes
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 */

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Building2,
  Edit,
  Trash2,
  Eye,
  FlaskConical,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { db } from '../../data/database';
import { formatCurrency, formatPercentage } from '../../utils/formatNumber';
import {
  Fournisseur,
  TypeFournisseur,
  TYPE_LABELS,
  typeBadgeClasses,
  statusBadgeClasses,
} from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FournisseursListProps {
  fournisseurs: Fournisseur[];
  filterType: string;
  filterStatus: string;
  onFilterTypeChange: (v: string) => void;
  onFilterStatusChange: (v: string) => void;
  onOpenDetails: (f: Fournisseur) => void;
  onOpenEdit: (f: Fournisseur) => void;
  onDelete: (id: number) => void;
  confirmDeleteId: number | null;
  onConfirmDeleteChange: (id: number | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Component
// ---------------------------------------------------------------------------

export function FournisseursList({
  fournisseurs,
  filterType,
  filterStatus,
  onFilterTypeChange,
  onFilterStatusChange,
  onOpenDetails,
  onOpenEdit,
  onDelete,
  confirmDeleteId,
  onConfirmDeleteChange,
}: FournisseursListProps) {
  const filtered = fournisseurs.filter((f) => {
    if (filterType !== 'tous' && f.type_fournisseur !== filterType) return false;
    if (filterStatus === 'actif' && !f.actif) return false;
    return true;
  });

  const byType = (type: TypeFournisseur) =>
    filtered.filter((f) => f.type_fournisseur === type);

  // -------------------------------------------------------------------------
  // Render a single fournisseur card
  // -------------------------------------------------------------------------

  const renderCard = (f: Fournisseur) => {
    const condCount = db.getConditionsByFournisseur(f.id).filter((c) => c.actif).length;

    return (
      <Card key={f.id} className="relative group transition-shadow hover:shadow-lg">
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
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPercentage(f.remise_base)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cooperation comm.</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPercentage(f.cooperation_commerciale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Escompte</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPercentage(f.escompte)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Franco</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(f.franco)}
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
              onClick={() => onOpenDetails(f)}
            >
              <Eye className="h-3.5 w-3.5" />
              Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => onOpenEdit(f)}
            >
              <Edit className="h-3.5 w-3.5" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              onClick={() => onConfirmDeleteChange(f.id)}
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
                onClick={() => onConfirmDeleteChange(null)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(f.id)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
  };

  // -------------------------------------------------------------------------
  // Card grid with empty state
  // -------------------------------------------------------------------------

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
    return list.map(renderCard);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Type</Label>
              <Select value={filterType} onValueChange={onFilterTypeChange}>
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
              <Select value={filterStatus} onValueChange={onFilterStatusChange}>
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

      {/* Tabs by type */}
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
    </>
  );
}
