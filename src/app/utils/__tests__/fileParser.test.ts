import { describe, it, expect } from 'vitest';
import { validateParsedInvoice } from '../fileParser';
import type { FactureParsee } from '../fileParser';

function createParsedInvoice(overrides: Partial<FactureParsee> = {}): FactureParsee {
  return {
    numero: 'FAC-2026-001',
    date: '2026-01-15',
    grossiste: 'CERP Rouen',
    lignes: [
      {
        designation: 'DOLIPRANE 1000MG',
        code_produit: '3400935926661',
        quantite: 10,
        prix_unitaire_ht: 2.15,
        remise_pourcent: 3,
        total_ligne_ht: 20.85,
      },
    ],
    total_brut_ht: 21.5,
    total_remises_lignes: 0.65,
    remises_pied_facture: 0,
    net_a_payer: 20.85,
    metadata: {
      format_detecte: 'excel',
      colonnes_detectees: ['Désignation', 'Quantité', 'Prix unitaire', 'Total HT'],
      lignes_total: 1,
    },
    ...overrides,
  };
}

describe('validateParsedInvoice', () => {
  it('valide une facture correcte', () => {
    const data = createParsedInvoice();
    const result = validateParsedInvoice(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejette un numéro de facture trop court', () => {
    const data = createParsedInvoice({ numero: 'AB' });
    const result = validateParsedInvoice(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Numéro de facture invalide ou manquant');
  });

  it('rejette un numéro de facture vide', () => {
    const data = createParsedInvoice({ numero: '' });
    const result = validateParsedInvoice(data);
    expect(result.valid).toBe(false);
  });

  it('rejette une facture sans lignes', () => {
    const data = createParsedInvoice({ lignes: [] });
    const result = validateParsedInvoice(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Aucune ligne de facture détectée');
  });

  it('rejette un montant brut HT négatif ou nul', () => {
    const data = createParsedInvoice({ total_brut_ht: 0 });
    const result = validateParsedInvoice(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Montant brut HT invalide');
  });

  it('rejette un net à payer négatif ou nul', () => {
    const data = createParsedInvoice({ net_a_payer: -10 });
    const result = validateParsedInvoice(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Net à payer invalide');
  });

  it('détecte une incohérence de calcul > 5%', () => {
    // Net calculé = 21.5 - 0.65 - 0 = 20.85
    // Net facture = 25 → écart = |20.85 - 25| / 25 * 100 = 16.6%
    const data = createParsedInvoice({ net_a_payer: 25 });
    const result = validateParsedInvoice(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Incohérence'))).toBe(true);
  });

  it('accepte une incohérence de calcul < 5%', () => {
    // Net calculé = 20.85, net facture = 21.5 → écart = |20.85-21.5|/21.5*100 = 3.02%
    const data = createParsedInvoice({ net_a_payer: 21.5 });
    const result = validateParsedInvoice(data);
    // Pas d'erreur d'incohérence
    expect(result.errors.some((e) => e.includes('Incohérence'))).toBe(false);
  });

  it('peut accumuler plusieurs erreurs', () => {
    const data = createParsedInvoice({
      numero: '',
      lignes: [],
      total_brut_ht: 0,
      net_a_payer: 0,
    });
    const result = validateParsedInvoice(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
