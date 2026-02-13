/**
 * PharmaVerif - Modal de detail d'un fournisseur
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 */

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Building2, FlaskConical, Package, X, Edit, RefreshCw } from 'lucide-react';
import { isApiMode } from '../../api/config';
import { formatCurrency, formatPercentage, formatDateShortFR } from '../../utils/formatNumber';
import { ConditionsForm } from './ConditionsForm';
import {
  Fournisseur,
  ConditionSpecifique,
  TypeFournisseur,
  TYPE_LABELS,
  typeBadgeClasses,
  statusBadgeClasses,
} from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FournisseurDetailProps {
  fournisseur: Fournisseur;
  conditions: ConditionSpecifique[];
  onClose: () => void;
  onEdit: () => void;
  onConditionsChange: () => void;
  onRecalculer: (id: number) => void;
  recalculLoading: boolean;
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

export function FournisseurDetail({
  fournisseur,
  conditions,
  onClose,
  onEdit,
  onConditionsChange,
  onRecalculer,
  recalculLoading,
}: FournisseurDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />

      {/* Dialog */}
      <Card className="relative z-10 w-full max-w-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 shadow-xl sm:rounded-xl rounded-none">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {typeIcon(fournisseur.type_fournisseur)}
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {fournisseur.nom}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={typeBadgeClasses(fournisseur.type_fournisseur)}>
                    {TYPE_LABELS[fournisseur.type_fournisseur]}
                  </Badge>
                  <Badge className={statusBadgeClasses(fournisseur.actif)}>
                    {fournisseur.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
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
                  {fournisseur.id}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {TYPE_LABELS[fournisseur.type_fournisseur]}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Cree le</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDateShortFR(fournisseur.created_at)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Modifie le</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDateShortFR(fournisseur.updated_at)}
                </p>
              </div>
              {fournisseur.notes && (
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Notes</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {fournisseur.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Grossiste parameters */}
          {fournisseur.type_fournisseur === 'grossiste' && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Parametres grossiste
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <span className="text-gray-500 dark:text-gray-400">Remise base</span>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatPercentage(fournisseur.remise_base)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <span className="text-gray-500 dark:text-gray-400">Coop. comm.</span>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatPercentage(fournisseur.cooperation_commerciale)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <span className="text-gray-500 dark:text-gray-400">Escompte</span>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatPercentage(fournisseur.escompte)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <span className="text-gray-500 dark:text-gray-400">Franco</span>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(fournisseur.franco)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Laboratoire parameters */}
          {fournisseur.type_fournisseur === 'laboratoire' && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Parametres laboratoire
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge
                  className={
                    fournisseur.remise_gamme_actif
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }
                >
                  Remise gamme: {fournisseur.remise_gamme_actif ? 'Active' : 'Inactive'}
                </Badge>
                <Badge
                  className={
                    fournisseur.remise_quantite_actif
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }
                >
                  Remise quantite:{' '}
                  {fournisseur.remise_quantite_actif ? 'Active' : 'Inactive'}
                </Badge>
                <Badge
                  className={
                    fournisseur.rfa_actif
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }
                >
                  RFA: {fournisseur.rfa_actif ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          )}

          {/* Conditions specifiques */}
          <ConditionsForm
            fournisseurId={fournisseur.id}
            conditions={conditions}
            onConditionsChange={onConditionsChange}
          />

          {/* Modal actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            {isApiMode() && fournisseur.type_fournisseur === 'laboratoire' && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => onRecalculer(fournisseur.id)}
                disabled={recalculLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${recalculLoading ? 'animate-spin' : ''}`} />
                {recalculLoading ? 'Recalcul...' : 'Recalculer les factures'}
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={onEdit}
            >
              <Edit className="h-3.5 w-3.5" />
              Modifier
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
