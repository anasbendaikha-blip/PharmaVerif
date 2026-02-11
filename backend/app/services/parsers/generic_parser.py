"""
PharmaVerif - Parser Generique (Fallback)
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Parser generique qui tente une extraction basique avec pdfplumber
pour les fournisseurs non reconnus. Extrait ce qu'il peut et
signale les limites via des warnings.
"""

import re
from typing import List, Tuple, Dict

from app.services.parsers.base_parser import BaseInvoiceParser
from app.services.parsers.models import (
    FournisseurInfo,
    LigneFacture,
    MetadonneeFacture,
    TotauxFacture,
    WarningInfo,
    ParsedInvoice,
)


class GenericParser(BaseInvoiceParser):
    """
    Parser generique pour les factures de fournisseurs non reconnus.

    Tente une extraction basique :
    - Recherche le numero de facture dans le texte
    - Recherche les dates
    - Tente d'identifier les tableaux de produits via CIP13
    - Classification par defaut TVA -> tranche

    Score de confiance faible pour signaler que le resultat
    peut etre incomplet ou inexact.
    """

    PARSER_ID = "generic"
    PARSER_NAME = "Parser Generique"
    PARSER_VERSION = "1.0.0"
    FOURNISSEUR_TYPE = "inconnu"
    DETECTION_KEYWORDS = []  # Pas de mots-cles — c'est le fallback

    # Patterns generiques
    FACTURE_NUM_PATTERNS = [
        re.compile(r'(?:N°?\s*(?:de\s+)?facture|Facture\s*N°?)\s*:?\s*([A-Z0-9][\w\-]{4,})', re.IGNORECASE),
        re.compile(r'\b(4[A-Z]\d{8,})\b'),  # Pattern Biogaran-like
        re.compile(r'\b(FA[\-/]?\d{6,})\b', re.IGNORECASE),  # Pattern FA-XXXXXX
        re.compile(r'\b(\d{8,12})\b'),  # Numero long
    ]
    DATE_PATTERN = re.compile(r'(\d{2}/\d{2}/\d{4})')
    CIP_PATTERN = re.compile(r'^(34|36)\d{11}$')
    AMOUNT_PATTERN = re.compile(r'(\d[\d\s]*\d?,\d{2})')

    def parse(self, pdf_path: str) -> ParsedInvoice:
        """Override parse pour definir le fournisseur comme generic."""
        result = super().parse(pdf_path)
        result.fournisseur = FournisseurInfo(
            nom="Fournisseur non reconnu",
            type="inconnu",
            detecte_auto=False,
            parser_id="generic",
            confiance=0.3,
        )
        result.warnings.insert(0, WarningInfo(
            type="warning",
            message="Fournisseur non reconnu — parser generique utilise. Resultats potentiellement incomplets."
        ))
        return result

    # ========================================
    # EXTRACT HEADER
    # ========================================

    def extract_header(self, pdf) -> MetadonneeFacture:
        """Extraction generique des metadonnees."""
        meta = MetadonneeFacture()
        meta.page_count = len(pdf.pages)

        # Concatener le texte des premieres pages
        text = ""
        for page in pdf.pages[:2]:
            text += (page.extract_text() or "") + "\n"

        # Numero de facture
        for pattern in self.FACTURE_NUM_PATTERNS:
            m = pattern.search(text)
            if m:
                candidate = m.group(1).strip()
                if len(candidate) >= 5:
                    meta.numero_facture = candidate
                    break

        # Dates
        dates = self.DATE_PATTERN.findall(text)
        if dates:
            meta.date_facture = dates[0]
        if len(dates) > 1:
            meta.date_commande = dates[1]
        if len(dates) > 2:
            meta.date_livraison = dates[2]

        # Client
        lines = text.split('\n')
        for line in lines:
            if 'PHARMACIE' in line.upper():
                meta.nom_client = line.strip()
                break

        # Numero client
        client_match = re.search(r'(?:N°?\s*client|Client\s*N°?)\s*:?\s*(\d+)', text, re.IGNORECASE)
        if client_match:
            meta.numero_client = client_match.group(1)

        return meta

    # ========================================
    # EXTRACT LINES
    # ========================================

    def extract_lines(self, pdf) -> Tuple[List[LigneFacture], Dict, List[WarningInfo]]:
        """
        Extraction generique des lignes de produits.
        Cherche les CIP13 dans les tableaux et tente de mapper les colonnes.
        """
        all_lines: List[LigneFacture] = []
        sections: Dict[str, list] = {}
        warnings: List[WarningInfo] = []

        for page_idx, page in enumerate(pdf.pages):
            tables = page.extract_tables()

            for table in tables:
                if not table or len(table) < 2:
                    continue

                # Identifier les colonnes par les headers
                header = table[0]
                if not header:
                    continue

                # Map column indices
                col_map = self._detect_columns(header)

                if col_map.get('cip') is None:
                    # Pas de colonne CIP identifiee — essayer de trouver les CIP dans les donnees
                    col_map = self._detect_columns_from_data(table)
                    if col_map.get('cip') is None:
                        continue

                # Extraire les lignes
                for row_idx, row in enumerate(table[1:], 1):
                    if not row:
                        continue

                    try:
                        cip_val = self._get_cell(row, col_map.get('cip'))
                        if not cip_val:
                            continue

                        # Valider le CIP
                        cip_clean = cip_val.strip().replace(' ', '')
                        if not self.CIP_PATTERN.match(cip_clean):
                            continue

                        ligne = LigneFacture(
                            cip13=cip_clean,
                            designation=self._get_cell(row, col_map.get('designation'), ""),
                            numero_lot=self._get_cell(row, col_map.get('lot'), ""),
                            quantite=self._parse_int(self._get_cell(row, col_map.get('quantite'))),
                            prix_unitaire_ht=self._parse_float(self._get_cell(row, col_map.get('prix'))),
                            remise_pct=self._parse_float(self._get_cell(row, col_map.get('remise'))),
                            prix_unitaire_apres_remise=self._parse_float(self._get_cell(row, col_map.get('prix_ar'))),
                            montant_ht=self._parse_float(self._get_cell(row, col_map.get('montant'))),
                            taux_tva=self._parse_float(self._get_cell(row, col_map.get('tva'))),
                        )

                        if ligne.quantite > 0 and ligne.prix_unitaire_ht > 0:
                            all_lines.append(ligne)
                            sections.setdefault("GENERIQUE", []).append(ligne.cip13)

                    except Exception as e:
                        warnings.append(WarningInfo(
                            type="error",
                            message=f"Page {page_idx+1}, row {row_idx}: erreur extraction - {e}",
                            page=page_idx + 1,
                            ligne=row_idx,
                        ))

        if not all_lines:
            warnings.append(WarningInfo(
                type="error",
                message="Aucune ligne de produit avec CIP13 valide trouvee dans les tableaux"
            ))

        return all_lines, sections, warnings

    # ========================================
    # HELPERS
    # ========================================

    def _detect_columns(self, header: list) -> Dict[str, int]:
        """Detecte les colonnes par les noms dans le header."""
        col_map: Dict[str, int] = {}
        patterns = {
            'cip': ['CIP', 'CODE', 'EAN'],
            'designation': ['DESIGNATION', 'PRODUIT', 'LIBELLE', 'DÉSIGNATION'],
            'lot': ['LOT', 'N° LOT'],
            'quantite': ['QTE', 'QUANTITE', 'QUANTITÉ', 'QTÉ'],
            'prix': ['PRIX', 'PU', 'P.U.', 'UNIT'],
            'remise': ['REMISE', 'REM', 'REMI', '%'],
            'prix_ar': ['APRES', 'APR', 'NET'],
            'montant': ['MONTANT', 'MT', 'TOTAL'],
            'tva': ['TVA', 'TX TVA', 'TAUX'],
        }

        for idx, cell in enumerate(header):
            if not cell:
                continue
            cell_upper = str(cell).upper().strip()
            for key, keywords in patterns.items():
                if key not in col_map:
                    for kw in keywords:
                        if kw in cell_upper:
                            col_map[key] = idx
                            break

        return col_map

    def _detect_columns_from_data(self, table: list) -> Dict[str, int]:
        """Detecte les colonnes CIP en scannant les donnees."""
        col_map: Dict[str, int] = {}

        for row in table[1:5]:  # Scanner les premieres lignes de donnees
            if not row:
                continue
            for idx, cell in enumerate(row):
                if not cell:
                    continue
                cell_str = str(cell).strip().replace(' ', '')
                if self.CIP_PATTERN.match(cell_str):
                    col_map['cip'] = idx
                    # Heuristique: les colonnes adjacentes
                    if idx + 1 < len(row):
                        col_map['designation'] = idx + 1
                    return col_map

        return col_map

    def _get_cell(self, row: list, idx, default=None):
        """Recupere une cellule en securite."""
        if idx is None or idx >= len(row):
            return default
        val = row[idx]
        return str(val).strip() if val else (default or "")

    def _parse_float(self, val) -> float:
        """Parse un float depuis une string."""
        if not val:
            return 0.0
        try:
            clean = str(val).replace(',', '.').replace(' ', '').replace('\xa0', '')
            return float(clean)
        except (ValueError, TypeError):
            return 0.0

    def _parse_int(self, val) -> int:
        """Parse un int depuis une string."""
        if not val:
            return 0
        try:
            return int(float(str(val).replace(',', '.').replace(' ', '')))
        except (ValueError, TypeError):
            return 0
