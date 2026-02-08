import { describe, it, expect } from 'vitest';
import { formatNumber, formatCurrency, formatPercentage } from '../formatNumber';

describe('formatNumber', () => {
  it('formate un nombre simple avec 2 décimales', () => {
    expect(formatNumber(123.45)).toBe('123.45');
  });

  it('ajoute des espaces pour les milliers', () => {
    expect(formatNumber(1234.56)).toBe('1 234.56');
  });

  it('gère les millions', () => {
    expect(formatNumber(1234567.89)).toBe('1 234 567.89');
  });

  it('gère zéro', () => {
    expect(formatNumber(0)).toBe('0.00');
  });

  it('gère les nombres négatifs', () => {
    expect(formatNumber(-1234.56)).toBe('-1 234.56');
  });

  it('respecte le nombre de décimales demandé', () => {
    expect(formatNumber(12.5, 1)).toBe('12.5');
    expect(formatNumber(12.5, 0)).toBe('13'); // arrondi
    expect(formatNumber(12.555, 3)).toBe('12.555');
  });

  it('complète avec des zéros pour les décimales', () => {
    expect(formatNumber(100, 2)).toBe('100.00');
  });

  it('gère les petits nombres', () => {
    expect(formatNumber(0.99)).toBe('0.99');
    expect(formatNumber(5)).toBe('5.00');
  });
});

describe('formatCurrency', () => {
  it('ajoute le symbole € avec un espace', () => {
    expect(formatCurrency(1234.56)).toBe('1 234.56 €');
  });

  it('gère zéro euros', () => {
    expect(formatCurrency(0)).toBe('0.00 €');
  });

  it('respecte les décimales personnalisées', () => {
    expect(formatCurrency(99.9, 1)).toBe('99.9 €');
  });

  it('gère les grands montants', () => {
    expect(formatCurrency(123456.78)).toBe('123 456.78 €');
  });
});

describe('formatPercentage', () => {
  it('ajoute le symbole % avec 1 décimale par défaut', () => {
    expect(formatPercentage(12.5)).toBe('12.5%');
  });

  it('gère 100%', () => {
    expect(formatPercentage(100)).toBe('100.0%');
  });

  it('gère 0%', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('respecte les décimales personnalisées', () => {
    expect(formatPercentage(12.55, 2)).toBe('12.55%');
  });
});
