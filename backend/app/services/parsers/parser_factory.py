"""
PharmaVerif - Factory de Parsers
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Detection automatique du fournisseur et instanciation du bon parser.
Pipeline complet : detection + parsing + sortie normalisee.
"""

import pdfplumber
from pathlib import Path
from typing import List, Dict, Optional, Type, Tuple

from app.services.parsers.base_parser import BaseInvoiceParser
from app.services.parsers.models import FournisseurInfo, ParsedInvoice
from app.services.parsers.biogaran_parser import BiogaranParser
from app.services.parsers.generic_parser import GenericParser


# ========================================
# REGISTRE DES PARSERS
# ========================================

# Tous les parsers disponibles, ordonnes par priorite
PARSER_REGISTRY: List[Type[BaseInvoiceParser]] = [
    BiogaranParser,
    # Futurs parsers :
    # TevaParser,
    # MylanParser,
    # SandozParser,
    # CerpParser,
    # OcpParser,
    # AllianceParser,
]

# Mots-cles de detection par fournisseur (pour les fournisseurs sans parser dedie)
SUPPLIER_KEYWORDS: Dict[str, Dict] = {
    "biogaran": {
        "keywords": ["BIOGARAN", "CSP", "CENTRE SPECIALITES PHARMACEUTIQUES",
                      "CENTRE SPÉCIALITÉS PHARMACEUTIQUES"],
        "type": "laboratoire",
        "parser_id": "biogaran",
    },
    "teva": {
        "keywords": ["TEVA SANTE", "TEVA PHARMA", "TEVA SANTÉ"],
        "type": "laboratoire",
        "parser_id": "generic",
    },
    "mylan": {
        "keywords": ["MYLAN", "VIATRIS"],
        "type": "laboratoire",
        "parser_id": "generic",
    },
    "sandoz": {
        "keywords": ["SANDOZ", "NOVARTIS"],
        "type": "laboratoire",
        "parser_id": "generic",
    },
    "cerp": {
        "keywords": ["CERP", "CERP ROUEN", "CERP RHIN"],
        "type": "grossiste",
        "parser_id": "generic",
    },
    "ocp": {
        "keywords": ["OCP REPARTITION", "OCP RÉPARTITION", "OCP"],
        "type": "grossiste",
        "parser_id": "generic",
    },
    "alliance": {
        "keywords": ["ALLIANCE HEALTHCARE", "ALLIANCE HEALTH"],
        "type": "grossiste",
        "parser_id": "generic",
    },
}


# ========================================
# DETECTION DU FOURNISSEUR
# ========================================

def detect_supplier(pdf_path: str) -> FournisseurInfo:
    """
    Detecte le fournisseur a partir du texte du PDF.

    1. Extrait le texte des 2 premieres pages
    2. Teste chaque parser enregistre (score de correspondance)
    3. Si aucun parser dedie ne matche, cherche dans SUPPLIER_KEYWORDS
    4. Fallback sur "Fournisseur non reconnu"

    Returns:
        FournisseurInfo avec nom, type, parser_id et confiance
    """
    text = _extract_text_for_detection(pdf_path)
    text_upper = text.upper()

    # 1. Tester les parsers enregistres
    best_parser: Optional[Type[BaseInvoiceParser]] = None
    best_score = 0.0

    for parser_cls in PARSER_REGISTRY:
        score = parser_cls.matches(text)
        if score > best_score:
            best_score = score
            best_parser = parser_cls

    if best_parser and best_score >= 0.5:
        return FournisseurInfo(
            nom=best_parser.PARSER_NAME,
            type=best_parser.FOURNISSEUR_TYPE,
            detecte_auto=True,
            parser_id=best_parser.PARSER_ID,
            confiance=best_score,
        )

    # 2. Chercher dans les mots-cles connus
    for supplier_id, config in SUPPLIER_KEYWORDS.items():
        matches = sum(1 for kw in config["keywords"] if kw.upper() in text_upper)
        if matches > 0:
            confiance = min(1.0, matches / len(config["keywords"]))
            return FournisseurInfo(
                nom=supplier_id.title(),
                type=config["type"],
                detecte_auto=True,
                parser_id=config["parser_id"],
                confiance=confiance,
            )

    # 3. Fallback
    return FournisseurInfo(
        nom="Fournisseur non reconnu",
        type="inconnu",
        detecte_auto=False,
        parser_id="generic",
        confiance=0.0,
    )


def _extract_text_for_detection(pdf_path: str) -> str:
    """Extrait le texte des premieres pages pour la detection."""
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        return ""

    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            text = ""
            for page in pdf.pages[:2]:
                text += (page.extract_text() or "") + "\n"
            return text
    except Exception:
        return ""


# ========================================
# FACTORY
# ========================================

def get_parser(supplier_id: str) -> BaseInvoiceParser:
    """
    Retourne l'instance du parser pour un fournisseur donne.

    Args:
        supplier_id: ID du parser (ex: "biogaran", "generic")

    Returns:
        Instance du parser
    """
    # Chercher dans le registre
    for parser_cls in PARSER_REGISTRY:
        if parser_cls.PARSER_ID == supplier_id:
            return parser_cls()

    # Fallback generique
    return GenericParser()


def get_parser_for_supplier(fournisseur: FournisseurInfo) -> BaseInvoiceParser:
    """
    Retourne le parser adapte pour un fournisseur detecte.

    Args:
        fournisseur: FournisseurInfo detecte

    Returns:
        Instance du parser
    """
    return get_parser(fournisseur.parser_id)


# ========================================
# PIPELINE COMPLET
# ========================================

def parse_invoice(pdf_path: str) -> ParsedInvoice:
    """
    Pipeline complet de parsing d'une facture.

    1. Detecte le fournisseur
    2. Instancie le bon parser
    3. Parse le PDF
    4. Retourne le resultat normalise

    Args:
        pdf_path: Chemin vers le fichier PDF

    Returns:
        ParsedInvoice: Resultat normalise avec fournisseur detecte
    """
    # 1. Detecter le fournisseur
    fournisseur = detect_supplier(pdf_path)

    # 2. Instancier le parser
    parser = get_parser_for_supplier(fournisseur)

    # 3. Parser le PDF
    result = parser.parse(pdf_path)

    # 4. Mettre a jour le fournisseur dans le resultat
    result.fournisseur = fournisseur

    return result


# ========================================
# UTILITAIRES
# ========================================

def get_available_parsers() -> List[Dict]:
    """
    Retourne la liste des parsers disponibles.

    Returns:
        Liste de dicts avec id, name, version, type, keywords
    """
    parsers = []

    for parser_cls in PARSER_REGISTRY:
        parsers.append({
            "id": parser_cls.PARSER_ID,
            "name": parser_cls.PARSER_NAME,
            "version": parser_cls.PARSER_VERSION,
            "type": parser_cls.FOURNISSEUR_TYPE,
            "keywords": parser_cls.DETECTION_KEYWORDS,
            "dedicated": True,
        })

    # Ajouter les fournisseurs connus sans parser dedie
    registered_ids = {p.PARSER_ID for p in PARSER_REGISTRY}
    for supplier_id, config in SUPPLIER_KEYWORDS.items():
        if config["parser_id"] not in registered_ids or config["parser_id"] == "generic":
            parsers.append({
                "id": supplier_id,
                "name": supplier_id.title(),
                "version": "generic",
                "type": config["type"],
                "keywords": config["keywords"],
                "dedicated": False,
            })

    # Ajouter le generique
    parsers.append({
        "id": "generic",
        "name": "Parser Generique",
        "version": GenericParser.PARSER_VERSION,
        "type": "inconnu",
        "keywords": [],
        "dedicated": False,
    })

    return parsers
