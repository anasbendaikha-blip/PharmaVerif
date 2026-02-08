import { describe, it, expect } from 'vitest';
import {
  verifyFacture,
  calculerRemisesAttendues,
  getFactureConformiteSummary,
} from '../verificationLogic';
import { Facture, Grossiste } from '../../types';

// Fixtures de test
const grossisteTest: Grossiste = {
  id: 1,
  nom: 'CERP Rouen',
  remise_base: 3.0,
  cooperation_commerciale: 2.0,
  escompte: 0.5,
  franco: 1500.0,
};

function createFacture(overrides: Partial<Facture> = {}): Facture {
  return {
    id: 1,
    numero: 'FAC-TEST-001',
    date: '2026-01-15',
    grossiste_id: 1,
    montant_brut_ht: 10000,
    remises_ligne_a_ligne: 300, // 3% base
    remises_pied_facture: 250, // 2.5% (coop + escompte)
    net_a_payer: 9450, // 10000 - 300 - 250
    statut_verification: 'non_verifie',
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('verifyFacture', () => {
  describe('Factures conformes', () => {
    it('retourne 0 anomalies quand les remises sont correctes', () => {
      // Taux total attendu = 3% + 2% + 0.5% = 5.5%
      // Remise attendue = 10000 * 5.5% = 550€
      // Remise réelle = 300 + 250 = 550€ → conforme
      const facture = createFacture({
        remises_ligne_a_ligne: 300,
        remises_pied_facture: 250,
        net_a_payer: 9450,
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      expect(anomalies).toHaveLength(0);
    });

    it('tolère un écart de remise inférieur à 5€', () => {
      // Remise attendue = 550€, remise réelle = 546€ → écart 4€ < 5€ tolérance
      const facture = createFacture({
        remises_ligne_a_ligne: 296,
        remises_pied_facture: 250,
        net_a_payer: 9454,
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      expect(anomalies).toHaveLength(0);
    });

    it('tolère un écart net à payer inférieur à 1€', () => {
      // Net calculé = 10000 - 550 = 9450, net facturé = 9450.50 → écart 0.50€ < 1€
      const facture = createFacture({
        remises_ligne_a_ligne: 300,
        remises_pied_facture: 250,
        net_a_payer: 9450.5,
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      expect(anomalies).toHaveLength(0);
    });
  });

  describe('Détection de remise manquante', () => {
    it('détecte une remise manquante quand écart > 5€', () => {
      // Remise attendue = 550€, remise réelle = 400€ → écart 150€
      const facture = createFacture({
        remises_ligne_a_ligne: 200,
        remises_pied_facture: 200,
        net_a_payer: 9600,
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      const remiseManquante = anomalies.find((a) => a.type_anomalie === 'remise_manquante');
      expect(remiseManquante).toBeDefined();
      expect(remiseManquante!.montant_ecart).toBe(150);
    });

    it('détecte à la limite exacte de 5.01€', () => {
      // Remise attendue = 550€, remise réelle = 544.99€ → écart = 5.01€
      const facture = createFacture({
        remises_ligne_a_ligne: 294.99,
        remises_pied_facture: 250,
        net_a_payer: 9455.01,
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      const remiseManquante = anomalies.find((a) => a.type_anomalie === 'remise_manquante');
      expect(remiseManquante).toBeDefined();
    });
  });

  describe('Détection de remise excessive', () => {
    it('détecte une remise excessive', () => {
      // Remise attendue = 550€, remise réelle = 700€ → écart négatif -150€
      const facture = createFacture({
        remises_ligne_a_ligne: 400,
        remises_pied_facture: 300,
        net_a_payer: 9300,
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      const remiseIncorrecte = anomalies.find((a) => a.type_anomalie === 'remise_incorrecte');
      expect(remiseIncorrecte).toBeDefined();
      expect(remiseIncorrecte!.montant_ecart).toBe(150);
    });
  });

  describe('Détection écart de calcul', () => {
    it('détecte un écart net à payer > 1€', () => {
      // Net calculé = 10000 - 300 - 250 = 9450
      // Net facturé = 9470 → écart 20€
      const facture = createFacture({
        remises_ligne_a_ligne: 300,
        remises_pied_facture: 250,
        net_a_payer: 9470,
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      const ecartCalcul = anomalies.find((a) => a.type_anomalie === 'ecart_calcul');
      expect(ecartCalcul).toBeDefined();
      expect(ecartCalcul!.montant_ecart).toBe(20);
    });
  });

  describe('Détection franco non respecté', () => {
    it('détecte des frais de port suspects quand montant > franco', () => {
      // Montant = 10000 > franco 1500, mais net_a_payer > net calculé de > 5€
      const facture = createFacture({
        remises_ligne_a_ligne: 300,
        remises_pied_facture: 250,
        net_a_payer: 9465, // 15€ de plus que le net calculé (9450)
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      const franco = anomalies.find((a) => a.type_anomalie === 'franco_non_respecte');
      expect(franco).toBeDefined();
      expect(franco!.montant_ecart).toBe(15);
    });

    it('ne détecte pas de franco si montant < seuil', () => {
      const facture = createFacture({
        montant_brut_ht: 1000, // < 1500 franco
        remises_ligne_a_ligne: 30,
        remises_pied_facture: 25,
        net_a_payer: 960,
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      const franco = anomalies.find((a) => a.type_anomalie === 'franco_non_respecte');
      expect(franco).toBeUndefined();
    });
  });

  describe('Détection prix suspect', () => {
    it('détecte une remise ligne anormalement faible', () => {
      const facture = createFacture({
        lignes: [
          {
            id: 1,
            facture_id: 1,
            produit: 'DOLIPRANE 1000MG',
            cip: '3400935926661',
            quantite: 100,
            prix_unitaire: 10,
            remise_appliquee: 1.0, // < base 3% - 0.5% = 2.5%
            montant_ht: 990,
          },
        ],
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      const prixSuspect = anomalies.find((a) => a.type_anomalie === 'prix_suspect');
      expect(prixSuspect).toBeDefined();
      // écart = 100 * 10 * (3 - 1) / 100 = 20€ > seuil 10€
      expect(prixSuspect!.montant_ecart).toBe(20);
    });

    it('ne détecte pas si écart par ligne < 10€', () => {
      const facture = createFacture({
        lignes: [
          {
            id: 1,
            facture_id: 1,
            produit: 'PETIT PRODUIT',
            cip: '123',
            quantite: 2,
            prix_unitaire: 5,
            remise_appliquee: 1.0,
            montant_ht: 9.9,
          },
        ],
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      const prixSuspect = anomalies.find((a) => a.type_anomalie === 'prix_suspect');
      expect(prixSuspect).toBeUndefined();
    });
  });

  describe('Anomalies multiples', () => {
    it('peut détecter plusieurs anomalies sur une même facture', () => {
      // Remise manquante + écart calcul + franco
      const facture = createFacture({
        montant_brut_ht: 10000,
        remises_ligne_a_ligne: 200, // manquante (attendu ~300)
        remises_pied_facture: 100, // manquante (attendu ~250)
        net_a_payer: 9800, // écart + franco possible
      });

      const anomalies = verifyFacture(facture, grossisteTest);
      expect(anomalies.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('calculerRemisesAttendues', () => {
  it('calcule correctement les remises attendues', () => {
    const facture = createFacture({ montant_brut_ht: 10000 });
    // 10000 * (3 + 2 + 0.5) / 100 = 550€
    expect(calculerRemisesAttendues(facture, grossisteTest)).toBe(550);
  });

  it('gère un montant brut de 0', () => {
    const facture = createFacture({ montant_brut_ht: 0 });
    expect(calculerRemisesAttendues(facture, grossisteTest)).toBe(0);
  });

  it('arrondit à 2 décimales', () => {
    const facture = createFacture({ montant_brut_ht: 1234.567 });
    const result = calculerRemisesAttendues(facture, grossisteTest);
    const decimalPart = result.toString().split('.')[1] || '';
    expect(decimalPart.length).toBeLessThanOrEqual(2);
  });
});

describe('getFactureConformiteSummary', () => {
  it('retourne "conforme" pour une facture sans anomalies', () => {
    const facture = createFacture({
      remises_ligne_a_ligne: 300,
      remises_pied_facture: 250,
      net_a_payer: 9450,
    });

    const summary = getFactureConformiteSummary(facture, grossisteTest);
    expect(summary).toContain('conforme');
  });

  it("retourne le nombre d'anomalies et le montant pour une facture non conforme", () => {
    const facture = createFacture({
      remises_ligne_a_ligne: 200,
      remises_pied_facture: 100,
      net_a_payer: 9700,
    });

    const summary = getFactureConformiteSummary(facture, grossisteTest);
    expect(summary).toContain('anomalie');
    expect(summary).toContain('€');
  });
});
