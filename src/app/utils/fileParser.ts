/**
 * PharmaVerif - Parser de fichiers de factures
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 *
 * Parse les fichiers Excel/CSV pour extraire les données de factures.
 */

import * as XLSX from 'xlsx';

/**
 * Représente une ligne de facture extraite
 */
export interface LigneFactureParsee {
  designation: string;
  code_produit?: string;
  quantite: number;
  prix_unitaire_ht: number;
  remise_pourcent?: number;
  remise_montant?: number;
  total_ligne_ht: number;
}

/**
 * Données complètes d'une facture parsée
 */
export interface FactureParsee {
  numero: string;
  date: string;
  grossiste?: string;
  lignes: LigneFactureParsee[];
  total_brut_ht: number;
  total_remises_lignes: number;
  remises_pied_facture?: number;
  net_a_payer: number;
  metadata: {
    format_detecte: 'excel' | 'csv';
    colonnes_detectees: string[];
    lignes_total: number;
  };
}

/**
 * Résultat du parsing
 */
export interface ParsingResult {
  success: boolean;
  data?: FactureParsee;
  error?: string;
  warnings?: string[];
}

/**
 * Configuration des colonnes attendues (mapping flexible)
 */
const COLUMN_MAPPINGS = {
  designation: [
    'désignation',
    'designation',
    'produit',
    'libellé',
    'libelle',
    'article',
    'description',
  ],
  code: ['code', 'code produit', 'code_produit', 'référence', 'reference', 'ref'],
  quantite: ['quantité', 'quantite', 'qté', 'qte', 'qty', 'nb'],
  prix_unitaire: ['prix unitaire', 'prix_unitaire', 'pu', 'p.u.', 'prix ht', 'prix', 'unit price'],
  remise_pourcent: ['remise %', 'remise', 'remise%', 'taux remise', 'discount %', '%remise'],
  remise_montant: ['montant remise', 'remise €', 'remise euro', 'remise montant'],
  total_ligne: ['total', 'total ligne', 'total ht', 'montant', 'montant ht', 'total_ht'],
};

/**
 * Normalise le nom d'une colonne pour matching
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[éèê]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[_\s-]+/g, ' ');
}

/**
 * Trouve l'index d'une colonne dans les headers
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map((h) => normalizeColumnName(h));

  for (const name of possibleNames) {
    const normalizedName = normalizeColumnName(name);
    const index = normalizedHeaders.findIndex(
      (h) => h.includes(normalizedName) || normalizedName.includes(h)
    );
    if (index !== -1) return index;
  }

  return -1;
}

/**
 * Extrait un nombre depuis une valeur (gère les formats français)
 */
function extractNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const str = String(value)
    .replace(/\s/g, '') // Supprimer espaces
    .replace(/,/g, '.') // Virgule -> point
    .replace(/[^\d.-]/g, ''); // Garder que chiffres, point, moins

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse une date depuis différents formats
 */
function parseDate(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0];

  // Si c'est déjà une date Excel (nombre)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // Si c'est une string, essayer de parser
  const str = String(value);
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Détecte si une ligne est une ligne de données ou un header/footer
 */
function isDataRow(row: any[], headers: string[]): boolean {
  // Vérifier qu'il y a des données numériques
  const hasNumbers = row.some((cell) => typeof cell === 'number' || !isNaN(extractNumber(cell)));

  // Vérifier que ce n'est pas un total
  const firstCell = String(row[0] || '').toLowerCase();
  const isTotalRow =
    firstCell.includes('total') ||
    firstCell.includes('sous-total') ||
    firstCell.includes('net à payer');

  return hasNumbers && !isTotalRow;
}

/**
 * Parse un fichier Excel (.xlsx)
 */
async function parseExcelFile(file: File): Promise<ParsingResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    // Prendre la première feuille
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convertir en JSON (array de arrays)
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    if (data.length === 0) {
      return { success: false, error: 'Le fichier Excel est vide' };
    }

    // Trouver la ligne de headers (généralement la première ligne non-vide)
    let headerRowIndex = 0;
    while (headerRowIndex < data.length && data[headerRowIndex].every((cell) => !cell)) {
      headerRowIndex++;
    }

    const headers: string[] = data[headerRowIndex].map((h) => String(h || ''));

    // Détecter les colonnes importantes
    const colIndexes = {
      designation: findColumnIndex(headers, COLUMN_MAPPINGS.designation),
      code: findColumnIndex(headers, COLUMN_MAPPINGS.code),
      quantite: findColumnIndex(headers, COLUMN_MAPPINGS.quantite),
      prix_unitaire: findColumnIndex(headers, COLUMN_MAPPINGS.prix_unitaire),
      remise_pourcent: findColumnIndex(headers, COLUMN_MAPPINGS.remise_pourcent),
      remise_montant: findColumnIndex(headers, COLUMN_MAPPINGS.remise_montant),
      total_ligne: findColumnIndex(headers, COLUMN_MAPPINGS.total_ligne),
    };

    // Vérifier qu'on a au moins les colonnes essentielles
    if (colIndexes.designation === -1 || colIndexes.total_ligne === -1) {
      return {
        success: false,
        error: 'Colonnes obligatoires manquantes. Besoin de : Désignation et Total',
        warnings: [
          `Colonnes détectées : ${headers.join(', ')}`,
          'Veuillez vérifier que votre fichier contient bien les colonnes "Désignation" et "Total"',
        ],
      };
    }

    // Parser les lignes de données
    const lignes: LigneFactureParsee[] = [];
    let total_brut_ht = 0;
    let total_remises_lignes = 0;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];

      if (!isDataRow(row, headers)) continue;

      const designation = String(row[colIndexes.designation] || '').trim();
      if (!designation || designation.length < 2) continue;

      const quantite = colIndexes.quantite !== -1 ? extractNumber(row[colIndexes.quantite]) : 1;

      const prix_unitaire_ht =
        colIndexes.prix_unitaire !== -1 ? extractNumber(row[colIndexes.prix_unitaire]) : 0;

      const total_ligne_ht = extractNumber(row[colIndexes.total_ligne]);

      const remise_pourcent =
        colIndexes.remise_pourcent !== -1
          ? extractNumber(row[colIndexes.remise_pourcent])
          : undefined;

      const remise_montant =
        colIndexes.remise_montant !== -1
          ? extractNumber(row[colIndexes.remise_montant])
          : undefined;

      // Calculer le brut si on a quantité et prix unitaire
      const brut_ligne = prix_unitaire_ht > 0 ? prix_unitaire_ht * quantite : total_ligne_ht;
      const remise_ligne = remise_montant || (brut_ligne * (remise_pourcent || 0)) / 100;

      total_brut_ht += brut_ligne;
      total_remises_lignes += remise_ligne;

      lignes.push({
        designation,
        code_produit: colIndexes.code !== -1 ? String(row[colIndexes.code] || '') : undefined,
        quantite,
        prix_unitaire_ht,
        remise_pourcent,
        remise_montant,
        total_ligne_ht,
      });
    }

    // Chercher les infos de facture dans les premières lignes
    let numero = `FAC-${Date.now()}`;
    let dateFacture = new Date().toISOString().split('T')[0];
    let grossiste = '';

    // Scanner les premières lignes pour trouver numéro et date
    for (let i = 0; i < Math.min(10, headerRowIndex); i++) {
      const row = data[i];
      const firstCell = String(row[0] || '').toLowerCase();

      if (
        firstCell.includes('facture') ||
        firstCell.includes('n°') ||
        firstCell.includes('numero')
      ) {
        numero = String(row[1] || row[0] || numero).replace(/[^a-zA-Z0-9-]/g, '');
      }

      if (firstCell.includes('date')) {
        dateFacture = parseDate(row[1] || row[0]);
      }

      if (firstCell.includes('grossiste') || firstCell.includes('fournisseur')) {
        grossiste = String(row[1] || row[0] || '');
      }
    }

    // Chercher remises pied de facture et net à payer
    let remises_pied = 0;
    let net_a_payer = total_brut_ht - total_remises_lignes;

    for (let i = data.length - 1; i >= Math.max(data.length - 10, headerRowIndex); i--) {
      const row = data[i];
      const firstCell = String(row[0] || '').toLowerCase();

      if (firstCell.includes('net à payer') || firstCell.includes('total ttc')) {
        net_a_payer = extractNumber(row[row.length - 1] || row[1]);
      }

      if (firstCell.includes('remise') && firstCell.includes('pied')) {
        remises_pied = extractNumber(row[row.length - 1] || row[1]);
      }
    }

    return {
      success: true,
      data: {
        numero,
        date: dateFacture,
        grossiste,
        lignes,
        total_brut_ht,
        total_remises_lignes,
        remises_pied_facture: remises_pied,
        net_a_payer,
        metadata: {
          format_detecte: 'excel',
          colonnes_detectees: headers.filter((h) => h),
          lignes_total: lignes.length,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors du parsing Excel : ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  }
}

/**
 * Parse un fichier CSV
 */
async function parseCSVFile(file: File): Promise<ParsingResult> {
  try {
    const text = await file.text();

    // Détecter le séparateur (virgule, point-virgule, tabulation)
    const separators = [';', ',', '\t'];
    const firstLine = text.split('\n')[0];
    const separator = separators.reduce((best, sep) =>
      firstLine.split(sep).length > firstLine.split(best).length ? sep : best
    );

    // Parser avec XLSX (qui gère aussi les CSV)
    const workbook = XLSX.read(text, {
      type: 'string',
      raw: false,
      FS: separator,
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    // Même logique que Excel
    return parseExcelFile(new File([text], file.name, { type: 'text/csv' }));
  } catch (error) {
    return {
      success: false,
      error: `Erreur lors du parsing CSV : ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  }
}

/**
 * Fonction principale de parsing
 */
export async function parseInvoiceFile(file: File): Promise<ParsingResult> {
  const fileName = file.name.toLowerCase();

  // Vérifier le type de fichier
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcelFile(file);
  } else if (fileName.endsWith('.csv')) {
    return parseCSVFile(file);
  } else if (fileName.endsWith('.pdf')) {
    return {
      success: false,
      error: 'Les fichiers PDF nécessitent un backend avec OCR',
      warnings: [
        'Pour analyser des PDF, il faut :',
        '1. Convertir le PDF en Excel/CSV manuellement',
        '2. Ou implémenter un backend avec OCR (Tesseract, AWS Textract, etc.)',
        '3. Utilisez plutôt un export Excel de votre logiciel de gestion',
      ],
    };
  } else {
    return {
      success: false,
      error: `Format de fichier non supporté : ${fileName}`,
      warnings: ['Formats acceptés : .xlsx, .xls, .csv'],
    };
  }
}

/**
 * Valide les données parsées
 */
export function validateParsedInvoice(data: FactureParsee): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.numero || data.numero.length < 3) {
    errors.push('Numéro de facture invalide ou manquant');
  }

  if (data.lignes.length === 0) {
    errors.push('Aucune ligne de facture détectée');
  }

  if (data.total_brut_ht <= 0) {
    errors.push('Montant brut HT invalide');
  }

  if (data.net_a_payer <= 0) {
    errors.push('Net à payer invalide');
  }

  // Vérifier cohérence des calculs
  const calculatedNet =
    data.total_brut_ht - data.total_remises_lignes - (data.remises_pied_facture || 0);
  const ecartPourcent = Math.abs(((calculatedNet - data.net_a_payer) / data.net_a_payer) * 100);

  if (ecartPourcent > 5) {
    errors.push(
      `Incohérence détectée : Net calculé (${calculatedNet.toFixed(2)}€) vs Net facture (${data.net_a_payer.toFixed(2)}€)`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
