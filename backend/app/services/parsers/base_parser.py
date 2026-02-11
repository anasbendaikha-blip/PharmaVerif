"""
PharmaVerif - Classe abstraite BaseInvoiceParser
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Toute implementation de parser doit heriter de cette classe
et implementer les methodes abstraites.
"""

import pdfplumber
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Tuple, Dict, Optional

from app.services.parsers.models import (
    FournisseurInfo,
    LigneFacture,
    MetadonneeFacture,
    TotauxFacture,
    TrancheAnalyse,
    WarningInfo,
    ParsedInvoice,
)


class BaseInvoiceParser(ABC):
    """
    Classe abstraite pour les parsers de factures PDF.

    Chaque fournisseur (Biogaran, Teva, Mylan, etc.) implemente
    son propre parser en heritant de cette classe.

    Le pipeline standard est :
    1. parse() -> orchestrateur
    2. extract_header() -> metadonnees
    3. extract_lines() -> lignes de produits
    4. classify_lines() -> classification A/B/OTC
    5. extract_totals() -> totaux (optionnel, sinon calcules)
    6. validate() -> verification de coherence
    """

    # Identifiant unique du parser
    PARSER_ID: str = "base"
    PARSER_NAME: str = "Parser de base"
    PARSER_VERSION: str = "1.0.0"

    # Mots-cles pour la detection automatique
    DETECTION_KEYWORDS: List[str] = []

    # Type de fournisseur
    FOURNISSEUR_TYPE: str = "inconnu"  # "laboratoire", "grossiste"

    def __init__(self, cible_tranche_a: float = 57.0, cible_tranche_b: float = 27.5):
        self.cible_tranche_a = cible_tranche_a
        self.cible_tranche_b = cible_tranche_b

    def parse(self, pdf_path: str) -> ParsedInvoice:
        """
        Pipeline complet de parsing.

        1. Ouvre le PDF
        2. Extrait l'en-tete
        3. Extrait les lignes
        4. Classifie les lignes
        5. Extrait/calcule les totaux
        6. Valide la coherence

        Returns:
            ParsedInvoice: Resultat normalise
        """
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"Fichier non trouve: {pdf_path}")

        with pdfplumber.open(str(pdf_path)) as pdf:
            # Etape 1 : En-tete
            metadata = self.extract_header(pdf)

            # Etape 2 : Lignes
            lignes, sections, warnings = self.extract_lines(pdf)

            # Etape 3 : Classification
            lignes = self.classify_lines(lignes)

            # Etape 4 : Totaux
            totaux = self.extract_totals(pdf, lignes)

        # Construire le resultat normalise
        result = ParsedInvoice(
            fournisseur=FournisseurInfo(
                nom=self.PARSER_NAME,
                type=self.FOURNISSEUR_TYPE,
                detecte_auto=True,
                parser_id=self.PARSER_ID,
                confiance=1.0,
            ),
            metadata=metadata,
            lignes=lignes,
            totaux=totaux,
            sections=sections,
            warnings=warnings,
        )

        # Calculer tranches et totaux depuis les lignes
        result.compute_tranches(self.cible_tranche_a, self.cible_tranche_b)
        if totaux.brut_ht == 0.0:
            result.compute_totaux()

        # Etape 5 : Validation
        validation_warnings = self.validate(result)
        result.warnings.extend(validation_warnings)

        return result

    # ========================================
    # METHODES ABSTRAITES
    # ========================================

    @abstractmethod
    def extract_header(self, pdf) -> MetadonneeFacture:
        """
        Extraire les metadonnees de l'en-tete.

        Args:
            pdf: Instance pdfplumber.PDF

        Returns:
            MetadonneeFacture
        """
        ...

    @abstractmethod
    def extract_lines(self, pdf) -> Tuple[List[LigneFacture], Dict, List[WarningInfo]]:
        """
        Extraire les lignes de produits de toutes les pages.

        Args:
            pdf: Instance pdfplumber.PDF

        Returns:
            Tuple (lignes, sections, warnings)
        """
        ...

    # ========================================
    # METHODES AVEC IMPLEMENTATION PAR DEFAUT
    # ========================================

    def classify_lines(self, lignes: List[LigneFacture]) -> List[LigneFacture]:
        """
        Classifier les lignes en tranches A/B/OTC.
        Implementation par defaut basee sur TVA + remise.
        Peut etre surchargee par un parser specifique.
        """
        for l in lignes:
            if not l.tranche:
                l._classify()
        return lignes

    def extract_totals(self, pdf, lignes: List[LigneFacture]) -> TotauxFacture:
        """
        Extraire les totaux depuis le PDF ou les calculer.
        Implementation par defaut : calcul depuis les lignes.
        """
        totaux = TotauxFacture()
        if lignes:
            totaux.brut_ht = round(sum(l.montant_brut for l in lignes), 2)
            totaux.remises = round(sum(l.montant_remise for l in lignes), 2)
            totaux.net_ht = round(sum(l.montant_ht for l in lignes), 2)
        return totaux

    def validate(self, result: ParsedInvoice) -> List[WarningInfo]:
        """
        Verification de coherence.
        Retourne des warnings supplementaires.
        """
        warnings = []

        # Verifier que le numero de facture est present
        if not result.metadata.numero_facture:
            warnings.append(WarningInfo(
                type="error",
                message="Numero de facture non detecte"
            ))

        # Verifier coherence totaux vs somme des lignes
        if result.lignes and result.totaux.brut_ht > 0:
            sum_brut = sum(l.montant_brut for l in result.lignes)
            ecart = abs(sum_brut - result.totaux.brut_ht)
            if ecart > 1.0:
                warnings.append(WarningInfo(
                    type="warning",
                    message=f"Ecart brut HT: total={result.totaux.brut_ht:.2f}, somme lignes={sum_brut:.2f}, ecart={ecart:.2f}"
                ))

        # Verifier que des lignes ont ete extraites
        if not result.lignes:
            warnings.append(WarningInfo(
                type="error",
                message="Aucune ligne de produit extraite"
            ))

        return warnings

    @classmethod
    def matches(cls, text: str) -> float:
        """
        Score de correspondance du parser avec le texte du PDF.
        Retourne un score entre 0.0 et 1.0.
        """
        if not cls.DETECTION_KEYWORDS:
            return 0.0

        text_upper = text.upper()
        matches = sum(1 for kw in cls.DETECTION_KEYWORDS if kw.upper() in text_upper)
        return min(1.0, matches / max(1, len(cls.DETECTION_KEYWORDS) * 0.5))
