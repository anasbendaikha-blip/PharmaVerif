/**
 * PharmaVerif - EMACComparison Component
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Tableau de verification triangulaire EMAC vs Factures vs Conditions :
 *  - 3 colonnes de montants (declare, reel, attendu)
 *  - Colonne ecart avec mise en evidence
 *  - Indicateur conforme/ecart par ligne
 *  - Resume : nb conformes, nb ecarts, montant recouvrable
 *  - Ligne TOTAL en gras
 *  - Dark mode / responsive
 */

import { CheckCircle2, AlertCircle, Triangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { formatCurrency } from '../utils/formatNumber';
import { cn } from './ui/utils';

// ========================================
// TYPES
// ========================================

export interface TriangleItem {
  label: string;
  valeur_emac: number;
  valeur_factures: number | null;
  valeur_conditions: number | null;
  ecart_emac_factures: number | null;
  ecart_emac_conditions: number | null;
  ecart_pct: number | null;
  conforme: boolean;
}

interface EMACComparisonProps {
  /** Lignes du triangle de verification */
  lignes: TriangleItem[];
  /** Nombre de lignes conformes */
  nbConformes: number;
  /** Nombre d'ecarts detectes */
  nbEcarts: number;
  /** Montant total recouvrable */
  montantRecouvrable: number;
  /** Montant total d'ecart */
  montantTotalEcart?: number;
  /** Nom du laboratoire */
  laboratoireNom?: string;
  /** Periode concernee */
  periode?: string;
  /** Afficher le titre dans un CardHeader */
  showTitle?: boolean;
  /** Titre custom */
  title?: string;
  /** Classe CSS additionnelle */
  className?: string;
}

// ========================================
// COMPONENT
// ========================================

export function EMACComparison({
  lignes,
  nbConformes,
  nbEcarts,
  montantRecouvrable,
  montantTotalEcart,
  laboratoireNom,
  periode,
  showTitle = true,
  title = 'Triangle de vérification',
  className,
}: EMACComparisonProps) {
  if (!lignes || lignes.length === 0) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Triangle className="h-5 w-5 text-purple-600" />
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Triangle className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Aucune donnée de vérification disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Triangle className="h-5 w-5 text-purple-600" />
            {title}
            {laboratoireNom && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                — {laboratoireNom}
                {periode && ` (${periode})`}
              </span>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élément</TableHead>
                <TableHead className="text-right">EMAC (déclaré)</TableHead>
                <TableHead className="text-right">Factures (réel)</TableHead>
                <TableHead className="text-right">Conditions (attendu)</TableHead>
                <TableHead className="text-right">Écart</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((ligne, i) => (
                <TriangleLigne key={i} ligne={ligne} />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary footer */}
        <div className="flex flex-wrap items-center justify-between mt-4 pt-4 border-t border-border gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              {nbConformes} conforme{nbConformes > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              {nbEcarts} écart{nbEcarts > 1 ? 's' : ''}
            </span>
            {montantTotalEcart !== undefined && montantTotalEcart > 0 && (
              <span className="text-muted-foreground">
                Écart total : <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(montantTotalEcart)}</span>
              </span>
            )}
          </div>
          {montantRecouvrable > 0 && (
            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
              Montant recouvrable : {formatCurrency(montantRecouvrable)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// SUB-COMPONENT
// ========================================

function TriangleLigne({ ligne }: { ligne: TriangleItem }) {
  const isTotal = ligne.label === 'TOTAL AVANTAGES' || ligne.label.toLowerCase().includes('total');
  const ecart = ligne.ecart_emac_factures ?? ligne.ecart_emac_conditions;
  const hasSignificantEcart = ecart !== null && ecart !== undefined && Math.abs(ecart) > 1;

  return (
    <TableRow className={cn(isTotal && 'font-bold bg-muted/50')}>
      <TableCell className={cn(isTotal && 'font-bold')}>
        {ligne.label}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {formatCurrency(ligne.valeur_emac)}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {ligne.valeur_factures !== null ? formatCurrency(ligne.valeur_factures) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {ligne.valeur_conditions !== null ? formatCurrency(ligne.valeur_conditions) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {ecart !== null && ecart !== undefined ? (
          <span className={cn(hasSignificantEcart && 'text-red-600 dark:text-red-400 font-semibold')}>
            {ecart > 0 ? '+' : ''}{formatCurrency(ecart)}
            {ligne.ecart_pct !== null && (
              <span className="text-xs ml-1 text-muted-foreground">
                ({ligne.ecart_pct > 0 ? '+' : ''}{ligne.ecart_pct}%)
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {ligne.conforme ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
        )}
      </TableCell>
    </TableRow>
  );
}
