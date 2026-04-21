"""
PharmaVerif — Donnees d'entree de la verification par tranches.

Le document de tranche (aussi appele "periode commerciale") est envoye par
le grossiste (CERP, OCP, Alliance, …) chaque mois. Il recapitule les
montants par tranche :
  - Tranche A : generiques avec remise > seuil (typ. > 2.5%)
  - Tranche B : generiques avec remise <= seuil
  - OTC       : produits non-generiques (TVA != 2.10%)

PharmaVerif recalcule ces totaux a partir des factures individuelles du
mois et les compare a ce que le grossiste declare.

ZERO dependance SQLAlchemy / FastAPI.
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional


@dataclass
class DocumentTrancheInput:
    """Document de tranche declare par le grossiste (source grossiste)."""
    grossiste: str               # Ex: "CERP Rouen", "OCP", "Alliance Healthcare"
    mois: date                   # Premier jour du mois concerne

    # Montants DECLARES par le grossiste
    montant_tranche_a_declare: Decimal
    montant_tranche_b_declare: Decimal
    montant_otc_declare: Decimal
    montant_total_declare: Decimal

    # Metadonnees optionnelles (souvent fournies dans le recap)
    nb_lignes_tranche_a: Optional[int] = None
    nb_lignes_tranche_b: Optional[int] = None
    nb_lignes_otc: Optional[int] = None
    remise_moyenne_declare: Optional[Decimal] = None

    # Reference du document (pour remonter dans les anomalies)
    reference: Optional[str] = None


@dataclass
class FacturesMoisInput:
    """Factures du mois agregees et recalculees par PharmaVerif."""
    grossiste: str
    mois: date

    # Montants CALCULES a partir des factures individuelles
    montant_tranche_a_calcule: Decimal
    montant_tranche_b_calcule: Decimal
    montant_otc_calcule: Decimal
    montant_total_calcule: Decimal

    # Comptages
    nb_factures: int = 0
    nb_lignes_tranche_a: int = 0
    nb_lignes_tranche_b: int = 0
    nb_lignes_otc: int = 0

    remise_moyenne_calcule: Optional[Decimal] = None
