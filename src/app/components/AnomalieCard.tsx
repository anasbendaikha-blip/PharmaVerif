/**
 * PharmaVerif - AnomalieCard Component (v2)
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Carte d'anomalie unifiee pour les 3 systemes :
 *  - Anomalies grossiste (frontend localStorage)
 *  - Anomalies labo (backend API)
 *  - Anomalies EMAC (backend API)
 *
 * Fonctionnalites :
 *  - Icone contextuelle selon le type d'anomalie
 *  - Badge de severite colore (critique/warning/info)
 *  - Impact financier mis en evidence
 *  - Action suggeree (expandable)
 *  - Infos produit/facture optionnelles
 *  - Indicateur resolu/non-resolu
 *  - Support dark mode
 *  - Responsive (compact sur mobile)
 */

import { useState, createElement } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Lightbulb } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { StatusBadge } from './ui/status-badge';
import { formatCurrency, formatDateShortFR } from '../utils/formatNumber';
import { getAnomalieMeta, getSeveriteMeta } from '../constants/anomalyTypes';
import { cn } from './ui/utils';

// ========================================
// TYPES
// ========================================

/** Props generiques — accepte n'importe quel objet anomalie */
interface AnomalieCardProps {
  /** Type d'anomalie (cle dans ANOMALIE_META) */
  typeAnomalie: string;
  /** Severite : 'erreur' | 'warning' | 'info' | 'critical' | 'opportunity' */
  severite: string;
  /** Description de l'anomalie */
  description: string;
  /** Montant de l'ecart financier */
  montantEcart: number;
  /** Date de creation (ISO string) */
  createdAt?: string;
  /** Action suggeree (override la valeur par defaut des constants) */
  actionSuggeree?: string | null;
  /** Numero de la facture concernee */
  numeroFacture?: string;
  /** Nom du fournisseur/laboratoire */
  nomFournisseur?: string;
  /** Designation du produit (si applicable) */
  designationProduit?: string;
  /** CIP13 du produit (si applicable) */
  cip13?: string;
  /** Anomalie resolue ? */
  resolu?: boolean;
  /** Date de resolution */
  resoluAt?: string | null;
  /** Note de resolution */
  noteResolution?: string | null;
  /** Callback quand on clique sur l'anomalie */
  onClick?: () => void;
  /** Classe CSS additionnelle */
  className?: string;
  /** Variante d'affichage */
  variant?: 'default' | 'compact';
}

/**
 * Props simplifiees pour passer directement un objet Anomalie (grossiste)
 */
interface AnomalieCardFromGrossisteProps {
  anomalie: {
    type_anomalie: string;
    niveau_severite?: string;
    description: string;
    montant_ecart: number;
    created_at: string;
    facture?: {
      numero: string;
      fournisseur?: { nom: string } | null;
      grossiste?: { nom: string } | null;
    } | null;
  };
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

/**
 * Props simplifiees pour un objet AnomalieFactureLabo (backend API)
 */
interface AnomalieCardFromLaboProps {
  anomalieLabo: {
    type_anomalie: string;
    severite: string;
    description: string;
    montant_ecart: number;
    action_suggeree?: string | null;
    resolu: boolean;
    resolu_at?: string | null;
    note_resolution?: string | null;
    created_at: string;
  };
  numeroFacture?: string;
  nomLaboratoire?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

// ========================================
// COMPONENT
// ========================================

export function AnomalieCard(props: AnomalieCardProps | AnomalieCardFromGrossisteProps | AnomalieCardFromLaboProps) {
  // --- Normaliser les props ---
  const normalized = normalizeProps(props);
  const [showAction, setShowAction] = useState(false);

  const meta = getAnomalieMeta(normalized.typeAnomalie);
  const sevMeta = getSeveriteMeta(normalized.severite);
  const isCompact = normalized.variant === 'compact';

  const IconComponent = meta.icon;
  const actionText = normalized.actionSuggeree || meta.actionSuggeree;

  // --- Variant badge pour StatusBadge ---
  const badgeVariant = sevMeta.priority === 1 ? 'error' as const
    : sevMeta.priority === 2 ? 'warning' as const
    : 'info' as const;

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        normalized.resolu
          ? 'opacity-60 border-green-200 dark:border-green-800'
          : 'hover:shadow-md hover:border-border/80',
        normalized.onClick && 'cursor-pointer',
        normalized.className
      )}
      onClick={normalized.onClick}
    >
      <CardContent className={cn(isCompact ? 'p-4' : 'p-6')}>
        {/* Header : Icon + Title + Badge */}
        <div className="flex items-start gap-3 mb-3">
          {/* Icon */}
          <div
            className={cn(
              'flex-shrink-0 rounded-lg flex items-center justify-center',
              isCompact ? 'p-1.5' : 'p-2',
              sevMeta.bgColor,
              sevMeta.color,
              sevMeta.darkBgColor,
              sevMeta.darkTextColor
            )}
          >
            {createElement(IconComponent, {
              className: cn(isCompact ? 'h-4 w-4' : 'h-5 w-5'),
            })}
          </div>

          {/* Title + Source */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                'font-semibold text-foreground',
                isCompact ? 'text-sm' : 'text-base'
              )}>
                {meta.label}
              </h3>
              <StatusBadge
                label={sevMeta.labelShort}
                variant={badgeVariant}
                size="sm"
                dot
              />
              {normalized.resolu && (
                <StatusBadge
                  label="Résolu"
                  variant="success"
                  size="sm"
                  icon={<CheckCircle2 className="h-3 w-3" />}
                />
              )}
            </div>

            {/* Source info (facture + fournisseur) */}
            {(normalized.numeroFacture || normalized.nomFournisseur) && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {[normalized.numeroFacture, normalized.nomFournisseur]
                  .filter(Boolean)
                  .join(' — ')}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className={cn(
          'text-muted-foreground mb-3',
          isCompact ? 'text-xs line-clamp-2' : 'text-sm'
        )}>
          {normalized.description}
        </p>

        {/* Product info (if available) */}
        {normalized.designationProduit && !isCompact && (
          <div className="bg-muted/50 rounded-md px-3 py-2 mb-3 text-sm">
            <span className="text-muted-foreground">Produit : </span>
            <span className="font-medium text-foreground">
              {normalized.designationProduit}
              {normalized.cip13 && (
                <span className="text-muted-foreground ml-1">({normalized.cip13})</span>
              )}
            </span>
          </div>
        )}

        {/* Financial impact + Date */}
        <div className={cn(
          'flex items-center justify-between',
          isCompact ? 'text-xs' : 'text-sm',
          'mb-2'
        )}>
          <span className="text-muted-foreground">Impact financier</span>
          <span className={cn(
            'font-semibold',
            normalized.montantEcart > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
          )}>
            {formatCurrency(normalized.montantEcart)}
          </span>
        </div>

        {normalized.createdAt && !isCompact && (
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Détecté le</span>
            <span className="text-foreground">
              {formatDateShortFR(normalized.createdAt)}
            </span>
          </div>
        )}

        {/* Resolution note */}
        {normalized.resolu && normalized.noteResolution && !isCompact && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-md px-3 py-2 mb-2 text-sm">
            <span className="text-green-700 dark:text-green-400 font-medium">Résolution : </span>
            <span className="text-green-600 dark:text-green-300">{normalized.noteResolution}</span>
            {normalized.resoluAt && (
              <span className="text-green-500 dark:text-green-500 text-xs ml-2">
                ({formatDateShortFR(normalized.resoluAt)})
              </span>
            )}
          </div>
        )}

        {/* Action suggeree (expandable) */}
        {actionText && !isCompact && !normalized.resolu && (
          <div className="mt-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAction(!showAction);
              }}
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium w-full text-left',
                'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
                'transition-colors'
              )}
            >
              <Lightbulb className="h-4 w-4 flex-shrink-0" />
              <span>Action suggérée</span>
              {showAction ? (
                <ChevronUp className="h-3.5 w-3.5 ml-auto" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-auto" />
              )}
            </button>
            {showAction && (
              <p className="mt-2 text-sm text-muted-foreground pl-6">
                {actionText}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// NORMALIZER
// ========================================

interface NormalizedProps {
  typeAnomalie: string;
  severite: string;
  description: string;
  montantEcart: number;
  createdAt?: string;
  actionSuggeree?: string | null;
  numeroFacture?: string;
  nomFournisseur?: string;
  designationProduit?: string;
  cip13?: string;
  resolu?: boolean;
  resoluAt?: string | null;
  noteResolution?: string | null;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

function normalizeProps(props: AnomalieCardProps | AnomalieCardFromGrossisteProps | AnomalieCardFromLaboProps): NormalizedProps {
  // --- Grossiste shorthand ---
  if ('anomalie' in props) {
    const a = props.anomalie;
    return {
      typeAnomalie: a.type_anomalie,
      severite: a.niveau_severite || 'info',
      description: a.description,
      montantEcart: a.montant_ecart,
      createdAt: a.created_at,
      actionSuggeree: null,
      numeroFacture: a.facture?.numero,
      nomFournisseur: a.facture?.fournisseur?.nom || a.facture?.grossiste?.nom || undefined,
      onClick: props.onClick,
      className: props.className,
      variant: props.variant,
    };
  }

  // --- Labo shorthand ---
  if ('anomalieLabo' in props) {
    const a = props.anomalieLabo;
    return {
      typeAnomalie: a.type_anomalie,
      severite: a.severite,
      description: a.description,
      montantEcart: a.montant_ecart,
      createdAt: a.created_at,
      actionSuggeree: a.action_suggeree,
      numeroFacture: props.numeroFacture,
      nomFournisseur: props.nomLaboratoire,
      resolu: a.resolu,
      resoluAt: a.resolu_at,
      noteResolution: a.note_resolution,
      onClick: props.onClick,
      className: props.className,
      variant: props.variant,
    };
  }

  // --- Explicit props ---
  return props as NormalizedProps;
}
