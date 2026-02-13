/**
 * PharmaVerif - Client API Rapports PDF
 * Copyright (c) 2026 Anas BENDAIKHA
 * Tous droits reserves.
 *
 * Client pour la generation et le telechargement de rapports PDF.
 * Tous les endpoints retournent des fichiers PDF en streaming.
 */

import { API_V1_URL } from './config';
import { getStoredToken } from './httpClient';

const BASE = '/rapports';

/**
 * Telecharge un fichier PDF depuis l'API
 * Utilise fetch natif car le httpClient ne gere pas les blobs.
 */
async function downloadPdf(path: string, defaultFilename: string): Promise<void> {
  const url = `${API_V1_URL}${path}`;
  const token = getStoredToken();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let errorMessage = `Erreur ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorBody.message || errorMessage;
    } catch {
      // pas du JSON
    }
    throw new Error(errorMessage);
  }

  const blob = await response.blob();

  // Extraire le nom du fichier du header Content-Disposition
  const disposition = response.headers.get('Content-Disposition');
  let filename = defaultFilename;
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) {
      filename = match[1];
    }
  }

  // Declencher le telechargement
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

/**
 * Telecharge un PDF via POST (pour les requetes avec body)
 */
async function downloadPdfPost(path: string, body: unknown, defaultFilename: string): Promise<void> {
  const url = `${API_V1_URL}${path}`;
  const token = getStoredToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = `Erreur ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorBody.message || errorMessage;
    } catch {
      // pas du JSON
    }
    throw new Error(errorMessage);
  }

  const blob = await response.blob();

  const disposition = response.headers.get('Content-Disposition');
  let filename = defaultFilename;
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) {
      filename = match[1];
    }
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

// ========================================
// INTERFACE RECLAMATION
// ========================================

export interface ReclamationRequest {
  laboratoire_id: number;
  anomalie_ids?: number[];
  facture_ids?: number[];
  pharmacie_nom?: string;
  pharmacie_adresse?: string;
  objet?: string;
  texte_intro?: string;
  texte_conclusion?: string;
  signataire?: string;
}

// ========================================
// API RAPPORTS
// ========================================

export const rapportsApi = {
  /**
   * Rapport 1 : Synthese de verification par facture
   */
  downloadFactureVerification(factureId: number): Promise<void> {
    return downloadPdf(
      `${BASE}/facture/${factureId}/pdf`,
      `PharmaVerif_Verification_${factureId}.pdf`
    );
  },

  /**
   * Rapport 2 : Rapport mensuel par fournisseur
   */
  downloadRapportMensuel(laboratoireId: number, mois: number, annee: number): Promise<void> {
    return downloadPdf(
      `${BASE}/fournisseur/${laboratoireId}/mensuel?mois=${mois}&annee=${annee}`,
      `PharmaVerif_Rapport_${laboratoireId}_${String(mois).padStart(2, '0')}_${annee}.pdf`
    );
  },

  /**
   * Rapport 3 : Reclamation fournisseur
   */
  downloadReclamation(data: ReclamationRequest): Promise<void> {
    return downloadPdfPost(
      `${BASE}/reclamation`,
      data,
      `PharmaVerif_Reclamation_${data.laboratoire_id}.pdf`
    );
  },

  /**
   * Rapport 4 : Rapport EMAC
   */
  downloadEmacReport(emacId: number): Promise<void> {
    return downloadPdf(
      `${BASE}/emac/${emacId}/pdf`,
      `PharmaVerif_EMAC_${emacId}.pdf`
    );
  },
};
