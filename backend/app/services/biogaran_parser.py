"""
PharmaVerif - Parser de factures Biogaran (Direct Labo via CSP)
================================================================
Prototype standalone pour extraction automatique des données
de factures PDF Biogaran et calcul des remises attendues.

Auteur: Anas Josseus
Date: Février 2026
"""

import pdfplumber
import re
import json
from dataclasses import dataclass, field, asdict
from typing import Optional
from pathlib import Path


# ─────────────────────────────────────────────────────────────
# MODÈLE DE DONNÉES
# ─────────────────────────────────────────────────────────────

@dataclass
class LigneFacture:
    """Une ligne de produit sur la facture."""
    cip13: str
    designation: str
    numero_lot: str
    quantite: int
    prix_unitaire_ht: float
    remise_pct: float
    prix_unitaire_apres_remise: float
    montant_ht: float
    taux_tva: float
    # Champs calculés
    montant_brut: float = 0.0
    montant_remise: float = 0.0
    categorie: str = ""  # REMBOURSABLE_STANDARD, REMBOURSABLE_FAIBLE_MARGE, NON_REMBOURSABLE
    tranche: str = ""    # A, B, ou OTC

    def __post_init__(self):
        self.montant_brut = round(self.quantite * self.prix_unitaire_ht, 2)
        self.montant_remise = round(self.montant_brut - self.montant_ht, 2)
        self._classify()

    def _classify(self):
        """Classifie la ligne selon le taux TVA et le taux de remise."""
        if self.taux_tva == 2.10:
            # Spécialité remboursable
            if self.remise_pct <= 2.50:
                self.categorie = "REMBOURSABLE_FAIBLE_MARGE"
                self.tranche = "B"
            else:
                self.categorie = "REMBOURSABLE_STANDARD"
                self.tranche = "A"
        else:
            # Non remboursable (TVA 5.50% ou 10%)
            self.categorie = "NON_REMBOURSABLE"
            self.tranche = "OTC"


@dataclass
class MetadonneeFacture:
    """Métadonnées extraites de l'en-tête de la facture."""
    numero_facture: str = ""
    date_facture: str = ""
    date_commande: str = ""
    date_livraison: str = ""
    ref_commande: str = ""
    numero_livraison: str = ""
    numero_client: str = ""
    nom_client: str = ""
    adresse_client: str = ""
    tva_client: str = ""
    mode_paiement: str = ""
    delai_paiement: str = ""
    date_exigibilite: str = ""
    montant_net_a_payer: float = 0.0
    total_tva: float = 0.0
    page_count: int = 0


@dataclass
class AnalyseRemise:
    """Résultat de l'analyse des remises pour une facture."""
    # Tranche A
    tranche_a_brut: float = 0.0
    tranche_a_remise_facture: float = 0.0
    tranche_a_net: float = 0.0
    tranche_a_nb_lignes: int = 0
    tranche_a_pct_du_total: float = 0.0
    tranche_a_taux_remise_moyen: float = 0.0
    tranche_a_cible: float = 57.0
    tranche_a_rfa_attendue: float = 0.0
    # Tranche B
    tranche_b_brut: float = 0.0
    tranche_b_remise_facture: float = 0.0
    tranche_b_net: float = 0.0
    tranche_b_nb_lignes: int = 0
    tranche_b_pct_du_total: float = 0.0
    tranche_b_taux_remise_moyen: float = 0.0
    tranche_b_cible: float = 27.5
    tranche_b_rfa_attendue: float = 0.0
    # OTC
    otc_brut: float = 0.0
    otc_remise_facture: float = 0.0
    otc_net: float = 0.0
    otc_nb_lignes: int = 0
    otc_taux_remise_moyen: float = 0.0
    # Totaux
    total_brut: float = 0.0
    total_remise_facture: float = 0.0
    total_net: float = 0.0
    total_rfa_attendue: float = 0.0
    remise_totale_cible_pct: float = 0.0
    # Détail taux remise Tranche A
    detail_taux_tranche_a: dict = field(default_factory=dict)


@dataclass
class FactureBiogaran:
    """Facture Biogaran parsée et analysée."""
    metadata: MetadonneeFacture
    lignes: list  # List[LigneFacture]
    analyse: AnalyseRemise
    sections: dict = field(default_factory=dict)  # Sections détectées
    warnings: list = field(default_factory=list)


# ─────────────────────────────────────────────────────────────
# PARSER
# ─────────────────────────────────────────────────────────────

class BiogranInvoiceParser:
    """
    Parser de factures PDF Biogaran (Direct Labo via CSP).
    
    Gère :
    - Factures multi-pages
    - Sections REMBOURSÉES et NON REMBOURSÉES
    - Classification automatique en Tranche A / B / OTC
    - Calcul des RFA attendues
    """

    # Regex patterns
    INVOICE_NUM_PATTERN = re.compile(r'N° facture\s*:\s*([A-Z0-9]+\d{4,})')
    INVOICE_DATE_PATTERN = re.compile(r'Date facture\s*:\s*(\d{2}/\d{2}/\d{4})')
    ORDER_DATE_PATTERN = re.compile(r'Date de commande\s*:\s*(\d{2}/\d{2}/\d{4})')
    DELIVERY_DATE_PATTERN = re.compile(r'Date de livraison\s*:\s*(\d{2}/\d{2}/\d{4})')
    ORDER_REF_PATTERN = re.compile(r'Réf\. commande\s*:\s*(\S+)')
    DELIVERY_NUM_PATTERN = re.compile(r'Numéro de livraison\s*:\s*(\S+)')
    CLIENT_NUM_PATTERN = re.compile(r'N° CLIENT\s+(\d+)')
    NET_A_PAYER_PATTERN = re.compile(r'(\d[\d\s]*\d?,\d{2})\s*€')
    PAYMENT_MODE_PATTERN = re.compile(r'Mode\s*:\s*(.+?)(?:\s+Délai|$)')
    PAYMENT_DELAY_PATTERN = re.compile(r'Délai\s*:\s*(.+?)(?:\s|$)')
    EXIGIBLE_PATTERN = re.compile(r'Exigible le\s*:\s*(\d{2}/\d{2}/\d{4})')
    TVA_CLIENT_PATTERN = re.compile(r'TVA:\s*(FR\s*\d{2}\s*\d{3}\s*\d{3}\s*\d{3})')
    CIP_PATTERN = re.compile(r'^34\d{11}$|^36\d{11}$')

    # Section markers
    SECTION_REMBOURSEES = "SPÉCIALITÉS REMBOURSÉES"
    SECTION_NON_REMBOURSEES = "SPÉCIALITÉS NON REMBOURSÉES"

    def __init__(self, cible_tranche_a: float = 57.0, cible_tranche_b: float = 27.5):
        self.cible_tranche_a = cible_tranche_a
        self.cible_tranche_b = cible_tranche_b

    def parse(self, pdf_path: str) -> FactureBiogaran:
        """Parse un fichier PDF de facture Biogaran."""
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"Fichier non trouvé: {pdf_path}")

        with pdfplumber.open(str(pdf_path)) as pdf:
            metadata = self._extract_metadata(pdf)
            lignes, sections, warnings = self._extract_lines(pdf)

        analyse = self._analyze(lignes)

        return FactureBiogaran(
            metadata=metadata,
            lignes=lignes,
            analyse=analyse,
            sections=sections,
            warnings=warnings,
        )

    def _extract_metadata(self, pdf) -> MetadonneeFacture:
        """Extrait les métadonnées de l'en-tête."""
        meta = MetadonneeFacture()
        meta.page_count = len(pdf.pages)

        # On travaille sur la première et dernière page
        first_page_text = pdf.pages[0].extract_text() or ""
        last_page_text = pdf.pages[-1].extract_text() or ""

        # En-tête (première page)
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

        # Extraire nom et adresse client depuis le texte
        lines = first_page_text.split('\n')
        for i, line in enumerate(lines):
            if 'PHARMACIE' in line:
                meta.nom_client = line.strip()
                # Les lignes suivantes sont l'adresse
                addr_lines = []
                for j in range(i + 1, min(i + 4, len(lines))):
                    if lines[j].strip() and not lines[j].strip().startswith('TVA'):
                        addr_lines.append(lines[j].strip())
                    else:
                        break
                meta.adresse_client = ', '.join(addr_lines)
                break

        # Pied de page (dernière page)
        last_tables = pdf.pages[-1].extract_tables()
        for table in last_tables:
            for row in table:
                if row:
                    row_text = ' '.join([str(c) for c in row if c])
                    # Net à payer
                    if '€' in row_text and ('NET' in row_text or any(c and '€' in str(c) for c in row)):
                        for cell in row:
                            if cell and '€' in str(cell):
                                amount_str = str(cell).replace('€', '').replace(' ', '').replace('\xa0', '').strip()
                                try:
                                    meta.montant_net_a_payer = float(amount_str.replace(',', '.'))
                                except ValueError:
                                    pass
                    # Mode paiement
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

        # Total TVA from last page table
        for table in last_tables:
            for row in table:
                if row and len(row) >= 4:
                    row_text = ' '.join([str(c) for c in row if c])
                    if 'TOTAL TVA' in row_text:
                        # Next row has the values
                        pass
                    # Try to find TVA total
                    try:
                        if row[-1] and re.match(r'\d+\.\d{2}', str(row[-1])):
                            val = float(str(row[-1]))
                            if 0 < val < 200:  # Reasonable TVA range
                                meta.total_tva = val
                    except (ValueError, TypeError):
                        pass

        # Also try extracting from table 3 which has structured invoice info
        for table in pdf.pages[0].extract_tables():
            for row in table:
                if row:
                    row_text = ' '.join([str(c) for c in row if c])
                    # Look for invoice number pattern like 4L51211978 or 4L60102163
                    inv_match = re.search(r'\b(4[A-Z]\d{8,})\b', row_text)
                    if inv_match and not meta.numero_facture:
                        meta.numero_facture = inv_match.group(1)
                    # Look for dates in FACTURE table
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

    def _extract_lines(self, pdf) -> tuple:
        """Extrait toutes les lignes de produits de toutes les pages."""
        all_lines = []
        sections = {}
        warnings = []
        current_section = "INCONNU"

        for page_idx, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            
            # Find the product table (the one with CIP header)
            for table in tables:
                if not table or len(table) < 2:
                    continue

                header_row = table[0]
                if not header_row:
                    continue
                header_text = ' '.join([str(c) for c in header_row if c])

                if 'CIP' not in header_text:
                    continue

                # This is the product table - process data rows
                for row in table[1:]:
                    if not row or not row[0]:
                        continue

                    # The data comes as newline-separated values in each cell
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

                    # Process each line
                    # First pass: detect section headers in CIP column
                    # Sometimes "PÉCIALITÉS R" or "NON REMBOURSÉES" leaks into CIP col
                    raw_pairs = list(zip(cips, descs)) if len(cips) == len(descs) else []
                    
                    # Filter CIPs to only valid ones (13 digits starting with 34 or 36)
                    valid_indices = []
                    clean_cips = []
                    skipped_desc_indices = set()
                    
                    for i, cip in enumerate(cips):
                        cip_clean = cip.strip().replace(' ', '')
                        # Check if this "CIP" is actually a section header fragment
                        if any(marker in cip_clean.upper() for marker in 
                               ['PÉCIALITÉS', 'EMBOURSÉES', 'REMBOURSÉ', 'COMP', 'TOTAL']):
                            skipped_desc_indices.add(i)
                            continue
                        if re.match(r'^(34|36)\d{11}$', cip_clean):
                            valid_indices.append(i)
                            clean_cips.append(cip_clean)

                    # Clean descriptions: remove section headers and align with valid CIPs
                    clean_descs = []
                    for i, d in enumerate(descs):
                        d_stripped = d.strip()
                        d_upper = d_stripped.upper()
                        if any(marker in d_upper for marker in 
                               ['EMBOURSÉES', 'PÉCIALITÉS', 'NON REMBOURSÉ', 
                                'TOTAL QTES', 'TE CCP', 'COMP']):
                            # But first check for section change
                            if 'NON REMBOURSÉ' in d_upper:
                                current_section = self.SECTION_NON_REMBOURSEES
                            continue
                        # Also skip entries that start with "ON REMBOURSÉES" (truncated)
                        if d_upper.startswith('ON REMBOURSÉ'):
                            current_section = self.SECTION_NON_REMBOURSEES
                            continue
                        if d_stripped:
                            clean_descs.append(d_stripped)

                    # Clean other columns (remove non-numeric junk like COMP, TE CCP...)
                    def clean_numeric_list(values, expected_count):
                        """Extract valid numeric values from a list."""
                        result = []
                        for v in values:
                            v = v.strip()
                            try:
                                result.append(float(v))
                            except ValueError:
                                continue
                        return result

                    clean_qtys = clean_numeric_list(qtys, len(clean_cips))
                    clean_prixs = clean_numeric_list(prixs, len(clean_cips))
                    clean_remises = clean_numeric_list(remises, len(clean_cips))
                    clean_prix_ars = clean_numeric_list(prix_ars, len(clean_cips))
                    clean_montants = clean_numeric_list(montants, len(clean_cips))
                    clean_tvas = clean_numeric_list(tvas, len(clean_cips))
                    clean_lots = [l.strip() for l in lots if l.strip() and not l.strip().startswith('2004')]

                    n = len(clean_cips)

                    # Validate alignment
                    if not (len(clean_descs) == n == len(clean_qtys) == len(clean_prixs) ==
                            len(clean_remises) == len(clean_prix_ars) == len(clean_montants) == len(clean_tvas)):
                        # Try to fix common misalignments
                        min_len = min(n, len(clean_descs), len(clean_qtys), len(clean_prixs),
                                      len(clean_remises), len(clean_prix_ars), len(clean_montants),
                                      len(clean_tvas))
                        if min_len > 0 and min_len >= n - 1:
                            # Close enough, truncate to shortest
                            n = min_len
                            warnings.append(
                                f"Page {page_idx+1}: alignment ajusté à {n} lignes "
                                f"(CIP={len(clean_cips)}, desc={len(clean_descs)}, "
                                f"qty={len(clean_qtys)})"
                            )
                        else:
                            warnings.append(
                                f"Page {page_idx+1}: ERREUR d'alignement - "
                                f"CIP={len(clean_cips)}, desc={len(clean_descs)}, "
                                f"qty={len(clean_qtys)}, prix={len(clean_prixs)}, "
                                f"remise={len(clean_remises)}, montant={len(clean_montants)}, "
                                f"tva={len(clean_tvas)}"
                            )
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
                            warnings.append(
                                f"Page {page_idx+1}, ligne {i}: erreur de parsing - {e}"
                            )

        return all_lines, sections, warnings

    def _analyze(self, lignes: list) -> AnalyseRemise:
        """Analyse les remises et calcule les RFA attendues."""
        analyse = AnalyseRemise()
        analyse.tranche_a_cible = self.cible_tranche_a
        analyse.tranche_b_cible = self.cible_tranche_b

        tranche_a = [l for l in lignes if l.tranche == "A"]
        tranche_b = [l for l in lignes if l.tranche == "B"]
        otc = [l for l in lignes if l.tranche == "OTC"]

        # Tranche A
        analyse.tranche_a_nb_lignes = len(tranche_a)
        analyse.tranche_a_brut = round(sum(l.montant_brut for l in tranche_a), 2)
        analyse.tranche_a_remise_facture = round(sum(l.montant_remise for l in tranche_a), 2)
        analyse.tranche_a_net = round(sum(l.montant_ht for l in tranche_a), 2)
        if analyse.tranche_a_brut > 0:
            analyse.tranche_a_taux_remise_moyen = round(
                analyse.tranche_a_remise_facture / analyse.tranche_a_brut * 100, 2
            )
            analyse.tranche_a_rfa_attendue = round(
                analyse.tranche_a_brut * (self.cible_tranche_a / 100) - analyse.tranche_a_remise_facture, 2
            )

        # Tranche B
        analyse.tranche_b_nb_lignes = len(tranche_b)
        analyse.tranche_b_brut = round(sum(l.montant_brut for l in tranche_b), 2)
        analyse.tranche_b_remise_facture = round(sum(l.montant_remise for l in tranche_b), 2)
        analyse.tranche_b_net = round(sum(l.montant_ht for l in tranche_b), 2)
        if analyse.tranche_b_brut > 0:
            analyse.tranche_b_taux_remise_moyen = round(
                analyse.tranche_b_remise_facture / analyse.tranche_b_brut * 100, 2
            )
            analyse.tranche_b_rfa_attendue = round(
                analyse.tranche_b_brut * (self.cible_tranche_b / 100) - analyse.tranche_b_remise_facture, 2
            )

        # OTC
        analyse.otc_nb_lignes = len(otc)
        analyse.otc_brut = round(sum(l.montant_brut for l in otc), 2)
        analyse.otc_remise_facture = round(sum(l.montant_remise for l in otc), 2)
        analyse.otc_net = round(sum(l.montant_ht for l in otc), 2)
        if analyse.otc_brut > 0:
            analyse.otc_taux_remise_moyen = round(
                analyse.otc_remise_facture / analyse.otc_brut * 100, 2
            )

        # Totaux
        analyse.total_brut = round(analyse.tranche_a_brut + analyse.tranche_b_brut + analyse.otc_brut, 2)
        analyse.total_remise_facture = round(
            analyse.tranche_a_remise_facture + analyse.tranche_b_remise_facture + analyse.otc_remise_facture, 2
        )
        analyse.total_net = round(analyse.tranche_a_net + analyse.tranche_b_net + analyse.otc_net, 2)
        analyse.total_rfa_attendue = round(
            max(0, analyse.tranche_a_rfa_attendue) + max(0, analyse.tranche_b_rfa_attendue), 2
        )

        # Pourcentages
        if analyse.total_brut > 0:
            analyse.tranche_a_pct_du_total = round(analyse.tranche_a_brut / analyse.total_brut * 100, 1)
            analyse.tranche_b_pct_du_total = round(analyse.tranche_b_brut / analyse.total_brut * 100, 1)
            total_remise_cible = analyse.total_remise_facture + analyse.total_rfa_attendue
            analyse.remise_totale_cible_pct = round(total_remise_cible / analyse.total_brut * 100, 1)

        # Détail taux remise Tranche A
        taux_detail = {}
        for l in tranche_a:
            taux = l.remise_pct
            if taux not in taux_detail:
                taux_detail[taux] = {"nb_lignes": 0, "brut": 0.0, "remise": 0.0}
            taux_detail[taux]["nb_lignes"] += 1
            taux_detail[taux]["brut"] = round(taux_detail[taux]["brut"] + l.montant_brut, 2)
            taux_detail[taux]["remise"] = round(taux_detail[taux]["remise"] + l.montant_remise, 2)
        analyse.detail_taux_tranche_a = dict(sorted(taux_detail.items()))

        return analyse


# ─────────────────────────────────────────────────────────────
# AFFICHAGE
# ─────────────────────────────────────────────────────────────

def print_report(facture: FactureBiogaran):
    """Affiche un rapport complet de la facture parsée."""
    m = facture.metadata
    a = facture.analyse

    print("\n" + "═" * 72)
    print("  PHARMAVERIF — ANALYSE DE FACTURE BIOGARAN")
    print("═" * 72)

    # Métadonnées
    print(f"\n{'─ FACTURE ─':─^72}")
    print(f"  N° facture     : {m.numero_facture}")
    print(f"  Date facture   : {m.date_facture}")
    print(f"  Date commande  : {m.date_commande}")
    print(f"  N° client      : {m.numero_client}")
    print(f"  Client         : {m.nom_client}")
    print(f"  Pages          : {m.page_count}")
    print(f"  Mode paiement  : {m.mode_paiement} ({m.delai_paiement})")
    print(f"  Exigible le    : {m.date_exigibilite}")
    print(f"  Net à payer    : {m.montant_net_a_payer:>10.2f}€ TTC")

    # Lignes
    print(f"\n{'─ LIGNES EXTRAITES ─':─^72}")
    print(f"  Total lignes : {len(facture.lignes)}")
    for section, cips in facture.sections.items():
        print(f"  Section '{section}' : {len(cips)} produits")

    # Tableau des lignes (résumé)
    print(f"\n  {'CIP13':<15} {'Désignation':<35} {'Qté':>4} {'PU HT':>7} {'Rem%':>5} {'Mt HT':>8} {'Tr':>3}")
    print(f"  {'─'*15} {'─'*35} {'─'*4} {'─'*7} {'─'*5} {'─'*8} {'─'*3}")
    for l in facture.lignes:
        name = l.designation[:35]
        print(f"  {l.cip13:<15} {name:<35} {l.quantite:>4} {l.prix_unitaire_ht:>7.2f} {l.remise_pct:>5.1f} {l.montant_ht:>8.2f} {l.tranche:>3}")

    # Analyse par tranche
    print(f"\n{'─ ANALYSE PAR TRANCHE ─':─^72}")

    if a.tranche_a_nb_lignes > 0:
        print(f"\n  TRANCHE A — Remboursables standard (cible {a.tranche_a_cible}%)")
        print(f"  {'Nb lignes':<25} : {a.tranche_a_nb_lignes}")
        print(f"  {'Montant brut HT':<25} : {a.tranche_a_brut:>10.2f}€  ({a.tranche_a_pct_du_total}% du total)")
        print(f"  {'Remise sur facture':<25} : {a.tranche_a_remise_facture:>10.2f}€  ({a.tranche_a_taux_remise_moyen}% moyen)")
        print(f"  {'Montant net facturé':<25} : {a.tranche_a_net:>10.2f}€")
        print(f"  {'RFA attendue':<25} : {a.tranche_a_rfa_attendue:>10.2f}€  (delta vers {a.tranche_a_cible}%)")

        if a.detail_taux_tranche_a:
            print(f"\n  Détail par taux de remise sur facture :")
            for taux, detail in a.detail_taux_tranche_a.items():
                print(f"    {taux:>5.1f}% : {detail['nb_lignes']:>2} lignes, "
                      f"brut {detail['brut']:>8.2f}€, remise {detail['remise']:>8.2f}€")

    if a.tranche_b_nb_lignes > 0:
        print(f"\n  TRANCHE B — Remboursables faible marge (cible {a.tranche_b_cible}%)")
        print(f"  {'Nb lignes':<25} : {a.tranche_b_nb_lignes}")
        print(f"  {'Montant brut HT':<25} : {a.tranche_b_brut:>10.2f}€  ({a.tranche_b_pct_du_total}% du total)")
        print(f"  {'Remise sur facture':<25} : {a.tranche_b_remise_facture:>10.2f}€  ({a.tranche_b_taux_remise_moyen}% moyen)")
        print(f"  {'Montant net facturé':<25} : {a.tranche_b_net:>10.2f}€")
        print(f"  {'RFA attendue':<25} : {a.tranche_b_rfa_attendue:>10.2f}€  (delta vers {a.tranche_b_cible}%)")

    if a.otc_nb_lignes > 0:
        print(f"\n  OTC — Non remboursables (remise directe sur facture)")
        print(f"  {'Nb lignes':<25} : {a.otc_nb_lignes}")
        print(f"  {'Montant brut HT':<25} : {a.otc_brut:>10.2f}€")
        print(f"  {'Remise sur facture':<25} : {a.otc_remise_facture:>10.2f}€  ({a.otc_taux_remise_moyen}% moyen)")
        print(f"  {'Montant net facturé':<25} : {a.otc_net:>10.2f}€")
        print(f"  {'RFA attendue':<25} :       0.00€  (remise déjà appliquée)")

    # Synthèse
    print(f"\n{'─ SYNTHÈSE ─':─^72}")
    print(f"  {'Montant brut total HT':<30} : {a.total_brut:>10.2f}€")
    print(f"  {'Remise sur facture totale':<30} : {a.total_remise_facture:>10.2f}€  "
          f"({a.total_remise_facture/a.total_brut*100:.1f}%)" if a.total_brut > 0 else "")
    print(f"  {'Montant net facturé':<30} : {a.total_net:>10.2f}€")
    print(f"  {'RFA attendue (à percevoir)':<30} : {a.total_rfa_attendue:>10.2f}€")
    total_remise = a.total_remise_facture + a.total_rfa_attendue
    print(f"  {'Remise totale cible':<30} : {total_remise:>10.2f}€  ({a.remise_totale_cible_pct}%)")
    print(f"\n  {'Répartition réelle':<30} : Tranche A {a.tranche_a_pct_du_total}% / "
          f"Tranche B {a.tranche_b_pct_du_total}%  (annoncé 80/20)")

    ecart_pct = a.tranche_a_pct_du_total - 80.0
    if abs(ecart_pct) > 2:
        direction = "moins" if ecart_pct < 0 else "plus"
        print(f"  ⚠️  ALERTE : {abs(ecart_pct):.1f} points de {direction} en Tranche A que la moyenne annoncée")
        if ecart_pct < 0:
            # Calculate impact
            # If it was 80/20, what would the RFA be?
            hypothetical_a = a.total_brut * 0.80
            hypothetical_b = a.total_brut * 0.20
            hypothetical_rfa = (hypothetical_a * 0.57 + hypothetical_b * 0.275) - a.total_remise_facture
            impact = hypothetical_rfa - a.total_rfa_attendue
            print(f"        Impact estimé : ~{impact:.0f}€ de RFA en moins sur cette facture")

    # Warnings
    if facture.warnings:
        print(f"\n{'─ AVERTISSEMENTS ─':─^72}")
        for w in facture.warnings:
            print(f"  ⚠️  {w}")

    print("\n" + "═" * 72)


def export_json(facture: FactureBiogaran, output_path: str):
    """Exporte la facture parsée en JSON."""
    data = {
        "metadata": asdict(facture.metadata),
        "lignes": [asdict(l) for l in facture.lignes],
        "analyse": asdict(facture.analyse),
        "sections": {k: v for k, v in facture.sections.items()},
        "warnings": facture.warnings,
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n✅ Export JSON : {output_path}")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    # Parse les deux factures de test
    parser = BiogranInvoiceParser(cible_tranche_a=57.0, cible_tranche_b=27.5)

    test_files = [
        "/mnt/user-data/uploads/facture_Biogaran_1.pdf",
        "/mnt/user-data/uploads/facture_Biogaran_2.pdf",
    ]

    for pdf_path in test_files:
        if Path(pdf_path).exists():
            print(f"\n\n{'🔍 PARSING':=^72}")
            print(f"  Fichier : {Path(pdf_path).name}")
            
            facture = parser.parse(pdf_path)
            print_report(facture)

            # Export JSON
            json_path = f"/home/claude/{Path(pdf_path).stem}_parsed.json"
            export_json(facture, json_path)
        else:
            print(f"❌ Fichier non trouvé : {pdf_path}")