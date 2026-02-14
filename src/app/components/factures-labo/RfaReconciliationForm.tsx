/**
 * PharmaVerif - Formulaire réconciliation RFA
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Formulaire pour saisir le montant RFA reçu et comparer à l'attendu.
 */

import { useState } from 'react';
import { Euro, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { facturesLaboApi } from '../../api/facturesLabo';
import { formatCurrency } from '../../utils/formatNumber';
import type { FactureLaboResponse } from '../../api/types';

interface RfaReconciliationFormProps {
  facture: FactureLaboResponse;
  onRefresh: () => void;
}

export function RfaReconciliationForm({ facture, onRefresh }: RfaReconciliationFormProps) {
  const [rfaInput, setRfaInput] = useState('');
  const [isUpdatingRfa, setIsUpdatingRfa] = useState(false);

  const handleUpdateRfa = async () => {
    const rfaValue = parseFloat(rfaInput);
    if (isNaN(rfaValue) || rfaValue < 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    setIsUpdatingRfa(true);
    try {
      const result = await facturesLaboApi.updateRfa(facture.id, rfaValue);
      toast.success(result.message || 'RFA mise à jour');
      onRefresh();
    } catch (err: unknown) {
      const httpErr = err as { message?: string };
      toast.error(httpErr.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsUpdatingRfa(false);
    }
  };

  return (
    <div className="px-6 pb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Réconciliation RFA
      </h3>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            RFA reçue (€)
          </label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={rfaInput}
              onChange={(e) => setRfaInput(e.target.value)}
              placeholder={`Attendue : ${facture.rfa_attendue.toFixed(2)} €`}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            />
          </div>
        </div>
        <Button
          onClick={handleUpdateRfa}
          disabled={isUpdatingRfa || !rfaInput}
          className="bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
        >
          {isUpdatingRfa ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Valider RFA'
          )}
        </Button>
      </div>
      {facture.rfa_recue !== null && (
        <div className="mt-3 flex items-center gap-4 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            RFA reçue : <strong className="dark:text-white">{formatCurrency(facture.rfa_recue)}</strong>
          </span>
          {facture.ecart_rfa !== null && (
            <span
              className={`font-medium ${
                Math.abs(facture.ecart_rfa) < 0.01
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              Écart : {formatCurrency(facture.ecart_rfa)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
