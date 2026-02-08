// Données simulées pour PharmaVerif (équivalent de la base de données)
import { Grossiste, Facture, Anomalie, StatsGlobal, LigneFacture } from '../types';

// Grossistes par défaut (équivalent de init_db())
export const grossistes: Grossiste[] = [
  {
    id: 1,
    nom: 'CERP Rouen',
    remise_base: 3.0,
    cooperation_commerciale: 1.5,
    escompte: 1.0,
    franco: 1500.0,
  },
  {
    id: 2,
    nom: 'OCP',
    remise_base: 2.5,
    cooperation_commerciale: 2.0,
    escompte: 1.0,
    franco: 2000.0,
  },
  {
    id: 3,
    nom: 'Alliance Healthcare',
    remise_base: 3.5,
    cooperation_commerciale: 1.0,
    escompte: 0.5,
    franco: 1800.0,
  },
];

// Lignes de facture exemples
export const lignesFactures: LigneFacture[] = [
  {
    id: 1,
    facture_id: 1,
    produit: 'DOLIPRANE 1000MG 8 CPR',
    cip: '3400935926661',
    quantite: 50,
    prix_unitaire: 2.15,
    remise_appliquee: 2.0,
    montant_ht: 105.35,
  },
  {
    id: 2,
    facture_id: 1,
    produit: 'SPASFON 80MG 30 CPR',
    cip: '3400933989668',
    quantite: 30,
    prix_unitaire: 5.80,
    remise_appliquee: 1.5,
    montant_ht: 171.33,
  },
  {
    id: 3,
    facture_id: 2,
    produit: 'EFFERALGAN 500MG 16 CPR',
    cip: '3400936111431',
    quantite: 40,
    prix_unitaire: 2.40,
    remise_appliquee: 2.0,
    montant_ht: 94.08,
  },
  {
    id: 4,
    facture_id: 2,
    produit: 'IBUPROFENE 400MG 30 CPR',
    cip: '3400934457081',
    quantite: 25,
    prix_unitaire: 3.50,
    remise_appliquee: 2.5,
    montant_ht: 85.31,
  },
];

// Factures exemples
export const facturesExemples: Facture[] = [
  {
    id: 1,
    numero: 'FAC2026-00234',
    date: '2026-02-05',
    grossiste_id: 2, // OCP
    montant_brut_ht: 5500.0,
    remises_ligne_a_ligne: 110.0,
    remises_pied_facture: 82.5,
    net_a_payer: 5307.5,
    statut_verification: 'anomalie',
    created_at: '2026-02-05T10:30:00',
    lignes: lignesFactures.filter((l) => l.facture_id === 1),
  },
  {
    id: 2,
    numero: 'FAC2026-00235',
    date: '2026-02-04',
    grossiste_id: 1, // CERP Rouen
    montant_brut_ht: 3200.0,
    remises_ligne_a_ligne: 64.0,
    remises_pied_facture: 48.0,
    net_a_payer: 3088.0,
    statut_verification: 'anomalie',
    created_at: '2026-02-04T14:20:00',
    lignes: lignesFactures.filter((l) => l.facture_id === 2),
  },
  {
    id: 3,
    numero: 'FAC2026-00180',
    date: '2026-02-03',
    grossiste_id: 3, // Alliance Healthcare
    montant_brut_ht: 2800.0,
    remises_ligne_a_ligne: 98.0,
    remises_pied_facture: 42.0,
    net_a_payer: 2660.0,
    statut_verification: 'conforme',
    created_at: '2026-02-03T09:15:00',
  },
];

// Anomalies exemples
export const anomaliesExemples: Anomalie[] = [
  {
    id: 1,
    facture_id: 1,
    type_anomalie: 'remise_manquante',
    description: 'Remise base OCP (2.5%) non appliquée sur certaines lignes',
    montant_ecart: 124.51,
    created_at: '2026-02-06T08:00:00',
  },
  {
    id: 2,
    facture_id: 1,
    type_anomalie: 'ecart_calcul',
    description: 'Écart entre remises pied de facture attendues et appliquées',
    montant_ecart: 62.25,
    created_at: '2026-02-06T08:00:00',
  },
  {
    id: 3,
    facture_id: 2,
    type_anomalie: 'remise_manquante',
    description: 'Coopération commerciale CERP (1.5%) non appliquée',
    montant_ecart: 48.0,
    created_at: '2026-02-05T10:30:00',
  },
  {
    id: 4,
    facture_id: 2,
    type_anomalie: 'franco_non_respecte',
    description: 'Frais de port facturés alors que franco (1500€) dépassé',
    montant_ecart: 15.0,
    created_at: '2026-02-05T10:30:00',
  },
];

// Stats globales
export const statsGlobales: StatsGlobal = {
  totalFactures: 127,
  anomaliesDetectees: 18,
  montantRecuperable: 2847.35,
  tauxConformite: 85.8,
};

// Fonction utilitaire pour obtenir un grossiste par ID
export function getGrossisteById(id: number): Grossiste | undefined {
  return grossistes.find((g) => g.id === id);
}

// Fonction utilitaire pour obtenir un grossiste par nom
export function getGrossisteByNom(nom: string): Grossiste | undefined {
  return grossistes.find((g) => g.nom === nom);
}

// Fonction utilitaire pour enrichir les factures avec les données du grossiste
export function enrichirFactureAvecGrossiste(facture: Facture): Facture {
  return {
    ...facture,
    grossiste: getGrossisteById(facture.grossiste_id),
  };
}

// Fonction utilitaire pour enrichir les anomalies avec les données de facture
export function enrichirAnomalieAvecFacture(anomalie: Anomalie): Anomalie {
  const facture = facturesExemples.find((f) => f.id === anomalie.facture_id);
  return {
    ...anomalie,
    facture: facture ? enrichirFactureAvecGrossiste(facture) : undefined,
  };
}
