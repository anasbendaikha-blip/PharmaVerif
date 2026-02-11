"""
PharmaVerif - Parser Biogaran (Direct Labo via CSP)
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Parser specialise pour les factures PDF Biogaran.
Herite de BaseInvoiceParser et implemente l'extraction specifique
au format Biogaran / CSP (Centre Specialites Pharmaceutiques).
"""

import re
from typing import List, Tuple, Dict

from app.services.parsers.base_parser import BaseInvoiceParser
from app.services.parsers.models import (
    LigneFacture,
    MetadonneeFacture,
    TotauxFacture,
    WarningInfo,
)


class BiogaranParser(BaseInvoiceParser):
    """
    Parser de factures PDF Biogaran (Direct Labo via CSP).

    Gere :
    - Factures multi-pages
    - Sections SPECIALITES REMBOURSEES et NON REMBOURSEES
    - Cellules PDF avec valeurs separees par des sauts de ligne
    - Classification automatique en Tranche A / B / OTC
    - Calcul des RFA attendues
    """

    # Identite du parser
    PARSER_ID = "biogaran"
    PARSER_NAME = "Biogaran"
    PARSER_VERSION = "2.0.0"
    FOURNISSEUR_TYPE = "laboratoire"

    # Mots-cles pour la detection automatique
    DETECTION_KEYWORDS = [
        "BIOGARAN",
        "CSP",
        "CENTRE SPECIALITES PHARMACEUTIQUES",
        "CENTRE SPÉCIALITÉS PHARMACEUTIQUES",
    ]

    # Regex patterns specifiques Biogaran
    INVOICE_NUM_PATTERN = re.compile(r'N° facture\s*:\s*([A-Z0-9]+\d{4,})')
    INVOICE_DATE_PATTERN = re.compile(r'Date facture\s*:\s*(\d{2}/\d{2}/\d{4})')
    ORDER_DATE_PATTERN = re.compile(r'Date de commande\s*:\s*(\d{2}/\d{2}/\d{4})')
    DELIVERY_DATE_PATTERN = re.compile(r'Date de livraison\s*:\s*(\d{2}/\d{2}/\d{4})')
    ORDER_REF_PATTERN = re.compile(r'Réf\.\s*commande\s*:\s*(\S+)')
    DELIVERY_NUM_PATTERN = re.compile(r'Numéro de livraison\s*:\s*(\S+)')
    CLIENT_NUM_PATTERN = re.compile(r'N° CLIENT\s+(\d+)')
    PAYMENT_MODE_PATTERN = re.compile(r'Mode\s*:\s*(.+?)(?:\s+Délai|$)')
    PAYMENT_DELAY_PATTERN = re.compile(r'Délai\s*:\s*(.+?)(?:\s|$)')
    EXIGIBLE_PATTERN = re.compile(r'Exigible le\s*:\s*(\d{2}/\d{2}/\d{4})')
    TVA_CLIENT_PATTERN = re.compile(r'TVA:\s*(FR\s*\d{2}\s*\d{3}\s*\d{3}\s*\d{3})')

    # Section markers
    SECTION_REMBOURSEES = "SPÉCIALITÉS REMBOURSÉES"
    SECTION_NON_REMBOURSEES = "SPÉCIALITÉS NON REMBOURSÉES"

    # ========================================
    # EXTRACT HEADER
    # ========================================

    def extract_header(self, pdf) -> MetadonneeFacture:
        """Extrait les metadonnees de l'en-tete Biogaran."""
        meta = MetadonneeFacture()
        meta.page_count = len(pdf.pages)

        first_page_text = pdf.pages[0].extract_text() or ""
        # last_page_text not stored but used for footer extraction below

        # En-tete (premiere page) - regex extraction
        for pattern, attr in [
            (self.INVOICE_NUM_PATTERN, 'numero_facture'),
            (self.INVOICE_DATE_PATTERN, 'date_facture'),
            (self.ORDER_DATE_PATTERN, 'date_commande'),
            (self.DELIVERY_DATE_PATTERN, 'date_livraison'),
            (self.ORDER_REF_PATTERN, 'ref_commande'),
            (self.DELIVERY_NUM_PATTERN, 'numero_livraison'),
        ]:
            m = pattern.search(first_page_text)
            if m:
                setattr(meta, attr, m.group(1).strip())

        # Client
        m = self.CLIENT_NUM_PATTERN.search(first_page_text)
        if m:
            meta.numero_client = m.group(1)

        m = self.TVA_CLIENT_PATTERN.search(first_page_text)
        if m:
            meta.tva_client = m.group(1)

        # Extraire nom et adresse client
        lines = first_page_text.split('\n')
        for i, line in enumerate(lines):
            if 'PHARMACIE' in line:
                meta.nom_client = line.strip()
                addr_lines = []
                for j in range(i + 1, min(i + 4, len(lines))):
                    if lines[j].strip() and not lines[j].strip().startswith('TVA'):
                        addr_lines.append(lines[j].strip())
                    else:
                        break
                meta.adresse_client = ', '.join(addr_lines)
                break

        # Pied de page (derniere page) - mode paiement, exigibilite
        last_tables = pdf.pages[-1].extract_tables()
        for table in last_tables:
            for row in table:
                if row:
                    row_text = ' '.join([str(c) for c in row if c])
                    if 'Mode' in row_text:
                        m = self.PAYMENT_MODE_PATTERN.search(row_text)
                        if m:
                            meta.mode_paiement = m.group(1).strip()
                        m = self.PAYMENT_DELAY_PATTERN.search(row_text)
                        if m:
                            meta.delai_paiement = m.group(1).strip()
                        m = self.EXIGIBLE_PATTERN.search(row_text)
                        if m:
                            meta.date_exigibilite = m.group(1)

        # Fallback : extraction depuis les tableaux structures de la page 1
        for table in pdf.pages[0].extract_tables():
            for row in table:
                if row:
                    row_text = ' '.join([str(c) for c in row if c])
                    # Numero facture pattern 4L60102163
                    inv_match = re.search(r'\b(4[A-Z]\d{8,})\b', row_text)
                    if inv_match and not meta.numero_facture:
                        meta.numero_facture = inv_match.group(1)
                    if 'Date facture' in row_text and not meta.date_facture:
                        dm = re.search(r'(\d{2}/\d{2}/\d{4})', row_text)
                        if dm:
                            meta.date_facture = dm.group(1)
                    if 'Date de commande' in row_text and not meta.date_commande:
                        dm = re.findall(r'(\d{2}/\d{2}/\d{4})', row_text)
                        if dm:
                            meta.date_commande = dm[0]
                        if len(dm) > 1 and not meta.date_livraison:
                            meta.date_livraison = dm[1]

        return meta

    # ========================================
    # EXTRACT LINES
    # ========================================

    def extract_lines(self, pdf) -> Tuple[List[LigneFacture], Dict, List[WarningInfo]]:
        """Extrait toutes les lignes de produits de toutes les pages."""
        all_lines: List[LigneFacture] = []
        sections: Dict[str, list] = {}
        warnings: List[WarningInfo] = []
        current_section = "INCONNU"

        for page_idx, page in enumerate(pdf.pages):
            tables = page.extract_tables()

            for table in tables:
                if not table or len(table) < 2:
                    continue

                header_row = table[0]
                if not header_row:
                    continue
                header_text = ' '.join([str(c) for c in header_row if c])

                if 'CIP' not in header_text:
                    continue

                # Process product table data rows
                for row in table[1:]:
                    if not row or not row[0]:
                        continue

                    # Extract columns (newline-separated values in each cell)
                    cip_col = str(row[0]) if row[0] else ""
                    desc_col = str(row[1]) if len(row) > 1 and row[1] else ""
                    lot_col = str(row[2]) if len(row) > 2 and row[2] else ""
                    qty_col = str(row[3]) if len(row) > 3 and row[3] else ""
                    prix_col = str(row[4]) if len(row) > 4 and row[4] else ""
                    remise_col = str(row[5]) if len(row) > 5 and row[5] else ""
                    prix_ar_col = str(row[6]) if len(row) > 6 and row[6] else ""
                    montant_col = str(row[7]) if len(row) > 7 and row[7] else ""
                    tva_col = str(row[8]) if len(row) > 8 and row[8] else ""

                    # Split by newlines
                    cips = cip_col.split('\n')
                    descs = desc_col.split('\n')
                    lots = lot_col.split('\n')
                    qtys = qty_col.split('\n')
                    prixs = prix_col.split('\n')
                    remises = remise_col.split('\n')
                    prix_ars = prix_ar_col.split('\n')
                    montants = montant_col.split('\n')
                    tvas = tva_col.split('\n')

                    # Detect section markers in descriptions
                    for desc in descs:
                        desc_clean = desc.strip().upper()
                        if 'EMBOURSÉES' in desc_clean and 'NON' not in desc_clean:
                            current_section = self.SECTION_REMBOURSEES
                        elif 'NON REMBOURSÉES' in desc_clean or 'NON REMBOURSEES' in desc_clean:
                            current_section = self.SECTION_NON_REMBOURSEES

                    # Filter CIPs to only valid ones (13 digits starting with 34 or 36)
                    clean_cips = []
                    for cip in cips:
                        cip_clean = cip.strip().replace(' ', '')
                        if any(marker in cip_clean.upper() for marker in
                               ['PÉCIALITÉS', 'EMBOURSÉES', 'REMBOURSÉ', 'COMP', 'TOTAL']):
                            continue
                        if re.match(r'^(34|36)\d{11}$', cip_clean):
                            clean_cips.append(cip_clean)

                    # Clean descriptions
                    clean_descs = []
                    for d in descs:
                        d_stripped = d.strip()
                        d_upper = d_stripped.upper()
                        if any(marker in d_upper for marker in
                               ['EMBOURSÉES', 'PÉCIALITÉS', 'NON REMBOURSÉ',
                                'TOTAL QTES', 'TE CCP', 'COMP']):
                            if 'NON REMBOURSÉ' in d_upper:
                                current_section = self.SECTION_NON_REMBOURSEES
                            continue
                        if d_upper.startswith('ON REMBOURSÉ'):
                            current_section = self.SECTION_NON_REMBOURSEES
                            continue
                        if d_stripped:
                            clean_descs.append(d_stripped)

                    # Clean numeric columns
                    def clean_numeric_list(values):
                        result = []
                        for v in values:
                            v = v.strip()
                            try:
                                result.append(float(v))
                            except ValueError:
                                continue
                        return result

                    clean_qtys = clean_numeric_list(qtys)
                    clean_prixs = clean_numeric_list(prixs)
                    clean_remises = clean_numeric_list(remises)
                    clean_prix_ars = clean_numeric_list(prix_ars)
                    clean_montants = clean_numeric_list(montants)
                    clean_tvas = clean_numeric_list(tvas)
                    clean_lots = [l.strip() for l in lots if l.strip() and not l.strip().startswith('2004')]

                    n = len(clean_cips)

                    # Validate alignment
                    if not (len(clean_descs) == n == len(clean_qtys) == len(clean_prixs) ==
                            len(clean_remises) == len(clean_prix_ars) == len(clean_montants) == len(clean_tvas)):
                        min_len = min(n, len(clean_descs), len(clean_qtys), len(clean_prixs),
                                      len(clean_remises), len(clean_prix_ars), len(clean_montants),
                                      len(clean_tvas))
                        if min_len > 0 and min_len >= n - 1:
                            n = min_len
                            warnings.append(WarningInfo(
                                type="alignment",
                                message=f"Page {page_idx+1}: alignment ajuste a {n} lignes "
                                        f"(CIP={len(clean_cips)}, desc={len(clean_descs)}, qty={len(clean_qtys)})",
                                page=page_idx + 1,
                            ))
                        else:
                            warnings.append(WarningInfo(
                                type="error",
                                message=f"Page {page_idx+1}: ERREUR d'alignement - "
                                        f"CIP={len(clean_cips)}, desc={len(clean_descs)}, "
                                        f"qty={len(clean_qtys)}, prix={len(clean_prixs)}, "
                                        f"remise={len(clean_remises)}, montant={len(clean_montants)}, "
                                        f"tva={len(clean_tvas)}",
                                page=page_idx + 1,
                            ))
                            n = min(n, len(clean_descs), len(clean_qtys), len(clean_prixs),
                                    len(clean_remises), len(clean_prix_ars), len(clean_montants),
                                    len(clean_tvas))

                    # Pad lots if needed
                    while len(clean_lots) < n:
                        clean_lots.append("")

                    for i in range(n):
                        try:
                            ligne = LigneFacture(
                                cip13=clean_cips[i],
                                designation=clean_descs[i],
                                numero_lot=clean_lots[i] if i < len(clean_lots) else "",
                                quantite=int(clean_qtys[i]),
                                prix_unitaire_ht=clean_prixs[i],
                                remise_pct=clean_remises[i],
                                prix_unitaire_apres_remise=clean_prix_ars[i],
                                montant_ht=clean_montants[i],
                                taux_tva=clean_tvas[i],
                            )

                            # Track section
                            if current_section not in sections:
                                sections[current_section] = []
                            sections[current_section].append(ligne.cip13)

                            all_lines.append(ligne)

                        except (ValueError, IndexError) as e:
                            warnings.append(WarningInfo(
                                type="error",
                                message=f"Page {page_idx+1}, ligne {i}: erreur de parsing - {e}",
                                page=page_idx + 1,
                                ligne=i,
                            ))

        return all_lines, sections, warnings

    # ========================================
    # EXTRACT TOTALS (depuis les tableaux PDF)
    # ========================================

    def extract_totals(self, pdf, lignes: List[LigneFacture]) -> TotauxFacture:
        """
        Extrait les totaux depuis les tableaux PDF de la derniere page.
        Fallback sur calcul depuis les lignes si extraction echoue.
        """
        totaux = TotauxFacture()

        # Calculer depuis les lignes (source de verite)
        if lignes:
            totaux.brut_ht = round(sum(l.montant_brut for l in lignes), 2)
            totaux.remises = round(sum(l.montant_remise for l in lignes), 2)
            totaux.net_ht = round(sum(l.montant_ht for l in lignes), 2)

        # Tenter d'extraire le TTC depuis la derniere page
        try:
            last_tables = pdf.pages[-1].extract_tables()
            for table in last_tables:
                for row in table:
                    if row:
                        row_text = ' '.join([str(c) for c in row if c])
                        # Net a payer TTC
                        if '€' in row_text and ('NET' in row_text or any(c and '€' in str(c) for c in row)):
                            for cell in row:
                                if cell and '€' in str(cell):
                                    amount_str = str(cell).replace('€', '').replace(' ', '').replace('\xa0', '').strip()
                                    try:
                                        totaux.ttc = float(amount_str.replace(',', '.'))
                                    except ValueError:
                                        pass
                        # Total TVA
                        try:
                            if row[-1] and re.match(r'\d+\.\d{2}', str(row[-1])):
                                val = float(str(row[-1]))
                                if 0 < val < 200:
                                    totaux.total_tva = val
                        except (ValueError, TypeError):
                            pass
        except Exception:
            pass

        return totaux
