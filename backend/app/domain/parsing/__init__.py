"""
PharmaVerif — Package Parsers (domain layer).

Architecture modulaire pour le parsing de factures PDF de differents
fournisseurs pharmaceutiques. Copie du package services/parsers/ dans
le domain (Strangler Fig) : les parsers etaient deja sans dependance
SQLAlchemy ou FastAPI, le deplacement est direct.

Mapping fichiers :
  services/parsers/base_parser.py    -> domain/parsing/base.py
  services/parsers/models.py         -> domain/parsing/models.py
  services/parsers/biogaran_parser.py-> domain/parsing/biogaran.py
  services/parsers/generic_parser.py -> domain/parsing/generic.py
  services/parsers/parser_factory.py -> domain/parsing/factory.py
"""

from app.domain.parsing.base import BaseInvoiceParser
from app.domain.parsing.factory import (
    detect_supplier,
    get_available_parsers,
    get_parser,
    parse_invoice,
)
from app.domain.parsing.models import (
    FournisseurInfo,
    LigneFacture,
    ParsedInvoice,
    TotauxFacture,
    TrancheAnalyse,
    WarningInfo,
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
