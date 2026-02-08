/**
 * PharmaVerif - Export PDF
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits réservés.
 * 
 * Génère des rapports PDF professionnels pour les factures vérifiées.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Facture, Anomalie, Grossiste } from '../types';

// Déclaration des types pour jsPDF AutoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

/**
 * Couleurs du thème PharmaVerif
 */
const COLORS = {
  primary: [37, 99, 235], // Bleu
  success: [16, 185, 129], // Vert
  warning: [245, 158, 11], // Orange
  danger: [239, 68, 68], // Rouge
  gray: {
    dark: [31, 41, 55],
    medium: [107, 114, 128],
    light: [229, 231, 235],
  },
};

/**
 * Formate un nombre en euros
 */
function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Formate une date en français
 */
function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Dessine le header du PDF avec le logo
 */
function drawHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.width;

  // Rectangle de fond bleu
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Logo texte "PharmaVerif"
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaVerif', 15, 20);

  // Sous-titre
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Vérification intelligente de factures pharmaceutiques', 15, 28);

  // Titre du document à droite
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, pageWidth - titleWidth - 15, 25);

  // Ligne de séparation
  doc.setDrawColor(...COLORS.gray.light);
  doc.setLineWidth(0.5);
  doc.line(15, 45, pageWidth - 15, 45);
}

/**
 * Dessine le footer du PDF
 */
function drawFooter(doc: jsPDF, pageNumber: number) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Ligne de séparation
  doc.setDrawColor(...COLORS.gray.light);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

  // Texte du footer
  doc.setTextColor(...COLORS.gray.medium);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Date de génération
  const generationDate = formatDate(new Date());
  doc.text(`Généré le ${generationDate}`, 15, pageHeight - 12);

  // Numéro de page
  doc.text(
    `Page ${pageNumber}`,
    pageWidth - 15 - doc.getTextWidth(`Page ${pageNumber}`),
    pageHeight - 12
  );

  // Mention "Document confidentiel"
  doc.setFontSize(8);
  doc.text(
    'Document confidentiel - PharmaVerif © 2026',
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );
}

/**
 * Traduit le type d'anomalie en texte lisible
 */
function getAnomalieTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    remise_manquante: 'Remise manquante',
    remise_incorrecte: 'Remise incorrecte',
    cooperation_manquante: 'Coopération commerciale manquante',
    escompte_manquant: 'Escompte manquant',
    franco_non_respecte: 'Franco non respecté',
    ecart_calcul: 'Écart de calcul',
    prix_suspect: 'Prix suspect',
  };
  return labels[type] || type;
}

/**
 * Options pour la génération du PDF
 */
export interface PDFExportOptions {
  facture: Facture;
  anomalies: Anomalie[];
  grossiste: Grossiste;
}

/**
 * Génère un PDF de rapport de vérification
 */
export async function generateVerificationPDF(
  options: PDFExportOptions
): Promise<jsPDF> {
  const { facture, anomalies, grossiste } = options;

  // Créer le document PDF (A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  let currentY = 55;

  // ========== HEADER ==========
  drawHeader(doc, 'Rapport de Vérification');

  // ========== SECTION: INFORMATIONS GÉNÉRALES ==========
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.gray.dark);
  doc.text('Informations de la facture', 15, currentY);
  currentY += 10;

  // Encadré avec les informations principales
  doc.setFillColor(248, 250, 252); // Gris très clair
  doc.rect(15, currentY - 5, pageWidth - 30, 35, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray.dark);

  const infoData = [
    ['Numéro de facture:', facture.numero],
    ['Grossiste:', grossiste.nom],
    ['Date de facture:', formatDate(facture.date)],
    ['Montant brut HT:', formatEuro(facture.montant_brut_ht)],
  ];

  infoData.forEach(([label, value], index) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, currentY + index * 8);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 70, currentY + index * 8);
  });

  currentY += 45;

  // ========== SECTION: REMISES APPLIQUÉES ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.gray.dark);
  doc.text('Remises appliquées', 15, currentY);
  currentY += 8;

  const remisesData = [
    ['Remises ligne à ligne', formatEuro(facture.remises_ligne_a_ligne || 0)],
    ['Remises pied de facture', formatEuro(facture.remises_pied_facture || 0)],
    [
      'Total des remises',
      formatEuro(
        (facture.remises_ligne_a_ligne || 0) +
          (facture.remises_pied_facture || 0)
      ),
    ],
    ['Net à payer', formatEuro(facture.net_a_payer)],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Montant']],
    body: remisesData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.gray.dark,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 15, right: 15 },
  });

  currentY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : currentY + 50;

  // ========== SECTION: RÉSULTAT DE LA VÉRIFICATION ==========
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.gray.dark);
  doc.text('Résultat de la vérification', 15, currentY);
  currentY += 10;

  // Badge de statut
  const isConforme = anomalies.length === 0;
  const statusColor = isConforme ? COLORS.success : COLORS.warning;
  const statusText = isConforme ? 'CONFORME' : `${anomalies.length} ANOMALIE(S) DÉTECTÉE(S)`;

  doc.setFillColor(...statusColor);
  doc.roundedRect(15, currentY - 5, 60, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, 17, currentY + 3);

  currentY += 15;

  // ========== SECTION: ANOMALIES DÉTECTÉES ==========
  if (anomalies.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.gray.dark);
    doc.text('Détail des anomalies', 15, currentY);
    currentY += 8;

    // Tableau des anomalies
    const anomaliesData = anomalies.map((anomalie, index) => [
      `${index + 1}`,
      getAnomalieTypeLabel(anomalie.type_anomalie),
      anomalie.description,
      formatEuro(anomalie.montant_ecart),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Type', 'Description', 'Écart']],
      body: anomaliesData,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.warning,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.gray.dark,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 90 },
        3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 15, right: 15 },
      alternateRowStyles: {
        fillColor: [255, 251, 235], // Jaune très clair
      },
    });

    currentY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : currentY + 60;

    // Total des écarts
    const totalEcart = anomalies.reduce(
      (sum, a) => sum + a.montant_ecart,
      0
    );

    doc.setFillColor(...COLORS.danger);
    doc.rect(15, currentY, pageWidth - 30, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DES ÉCONOMIES POTENTIELLES:', 20, currentY + 7);
    doc.text(
      formatEuro(totalEcart),
      pageWidth - 20 - doc.getTextWidth(formatEuro(totalEcart)),
      currentY + 7
    );

    currentY += 20;

    // ========== SECTION: RECOMMANDATIONS ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.gray.dark);
    doc.text('Recommandations', 15, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray.medium);

    const recommendations = [
      '• Contacter votre grossiste pour demander un avoir sur le montant de l\'écart détecté.',
      '• Conserver ce rapport comme justificatif pour votre contestation.',
      '• Vérifier que les conditions contractuelles sont à jour dans notre système.',
      '• Suivre régulièrement vos factures pour éviter la récurrence de ces anomalies.',
    ];

    recommendations.forEach((rec, index) => {
      const lines = doc.splitTextToSize(rec, pageWidth - 35);
      doc.text(lines, 20, currentY + index * 8);
    });

    currentY += 40;
  } else {
    // Cas conforme - Message de félicitations
    doc.setFillColor(240, 253, 244); // Vert très clair
    doc.rect(15, currentY, pageWidth - 30, 30, 'F');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.success);
    doc.text('✓ Facture conforme', 20, currentY + 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray.dark);
    doc.text(
      'Aucune anomalie détectée. Toutes les remises contractuelles ont été correctement appliquées.',
      20,
      currentY + 18
    );

    currentY += 40;
  }

  // ========== SECTION: CONDITIONS CONTRACTUELLES ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.gray.dark);
  doc.text('Conditions contractuelles de référence', 15, currentY);
  currentY += 8;

  const conditionsData = [
    ['Remise de base', `${grossiste.remise_base}%`],
    ['Coopération commerciale', `${grossiste.cooperation_commerciale}%`],
    ['Escompte', `${grossiste.escompte}%`],
    ['Franco (port gratuit)', formatEuro(grossiste.franco)],
    [
      'Remise totale théorique',
      `${(
        grossiste.remise_base +
        grossiste.cooperation_commerciale +
        grossiste.escompte
      ).toFixed(2)}%`,
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Condition', 'Taux / Montant']],
    body: conditionsData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.gray.dark,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 15, right: 15 },
  });

  // ========== FOOTER ==========
  drawFooter(doc, 1);

  return doc;
}

/**
 * Télécharge le PDF généré
 */
export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

/**
 * Génère et télécharge le rapport de vérification
 */
export async function exportVerificationReport(
  options: PDFExportOptions
): Promise<void> {
  const { facture } = options;

  // Générer le PDF
  const doc = await generateVerificationPDF(options);

  // Créer le nom de fichier
  const filename = `Rapport_Verification_${facture.numero.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  // Télécharger
  downloadPDF(doc, filename);
}