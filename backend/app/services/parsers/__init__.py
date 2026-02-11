"""
PharmaVerif - Package Parsers Multi-Fournisseurs
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Architecture modulaire pour le parsing de factures PDF
de differents fournisseurs pharmaceutiques.
"""

from app.services.parsers.models import (
    FournisseurInfo,
    LigneFacture,
    TrancheAnalyse,
    TotauxFacture,
    WarningInfo,
    ParsedInvoice,
)
from app.services.parsers.base_parser import BaseInvoiceParser
from app.services.parsers.parser_factory import (
    detect_supplier,
    get_parser,
    parse_invoice,
    get_available_parsers,
)

__all__ = [
    "FournisseurInfo",
    "LigneFacture",
    "TrancheAnalyse",
    "TotauxFacture",
    "WarningInfo",
    "ParsedInvoice",
    "BaseInvoiceParser",
    "detect_supplier",
    "get_parser",
    "parse_invoice",
    "get_available_parsers",
]
