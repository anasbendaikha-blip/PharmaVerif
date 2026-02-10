import { Anomalie } from '../types';
import { AlertTriangle, TrendingDown, DollarSign, Calculator, ShieldAlert, Package, FileX } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { formatCurrency } from '../utils/formatNumber';

interface AnomalieCardProps {
  anomalie: Anomalie;
}

export function AnomalieCard({ anomalie }: AnomalieCardProps) {
  const getGraviteFromMontant = (montant: number) => {
    if (montant > 500) return 'elevee';
    if (montant > 100) return 'moyenne';
    return 'faible';
  };

  const gravite = anomalie.niveau_severite
    ? (anomalie.niveau_severite === 'erreur' ? 'elevee' : anomalie.niveau_severite === 'warning' ? 'moyenne' : 'faible')
    : getGraviteFromMontant(anomalie.montant_ecart);

  const getGraviteColor = (gravite: string) => {
    switch (gravite) {
      case 'elevee':
        return 'bg-red-100 text-red-800';
      case 'moyenne':
        return 'bg-orange-100 text-orange-800';
      case 'faible':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'remise_manquante':
        return <TrendingDown className="h-5 w-5" />;
      case 'remise_incorrecte':
        return <AlertTriangle className="h-5 w-5" />;
      case 'prix_suspect':
        return <DollarSign className="h-5 w-5" />;
      case 'ecart_calcul':
        return <Calculator className="h-5 w-5" />;
      case 'franco_non_respecte':
        return <ShieldAlert className="h-5 w-5" />;
      case 'remise_volume_manquante':
        return <Package className="h-5 w-5" />;
      case 'condition_non_respectee':
        return <ShieldAlert className="h-5 w-5" />;
      case 'rfa_non_appliquee':
        return <FileX className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'remise_manquante':
        return 'Remise manquante';
      case 'remise_incorrecte':
        return 'Remise incorrecte';
      case 'prix_suspect':
        return 'Prix suspect';
      case 'ecart_calcul':
        return 'Écart de calcul';
      case 'franco_non_respecte':
        return 'Franco non respecté';
      case 'remise_volume_manquante':
        return 'Remise volume manquante';
      case 'condition_non_respectee':
        return 'Condition non respectée';
      case 'rfa_non_appliquee':
        return 'RFA non appliquée';
      default:
        return type;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className={`${getGraviteColor(gravite)} p-2 rounded-lg flex-shrink-0`}>
              {getTypeIcon(anomalie.type_anomalie)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {getTypeLabel(anomalie.type_anomalie)}
                </h3>
                <Badge variant="outline" className={getGraviteColor(gravite)}>
                  {gravite === 'elevee' ? 'Élevée' : gravite === 'moyenne' ? 'Moyenne' : 'Faible'}
                </Badge>
              </div>
              {anomalie.facture && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {anomalie.facture.numero} - {anomalie.facture.fournisseur?.nom || anomalie.facture.grossiste?.nom}
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-4">{anomalie.description}</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Impact financier :</span>
            <span className="font-semibold text-red-600">
              {formatCurrency(anomalie.montant_ecart)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Date de détection :</span>
            <span className="text-gray-900 dark:text-gray-100">
              {new Date(anomalie.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
