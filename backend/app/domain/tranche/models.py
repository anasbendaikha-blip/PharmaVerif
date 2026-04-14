"""
PharmaVerif — Modeles de sortie de la verification par tranches.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum


class TypeEcartTranche(str, Enum):
    """Types d'ecarts detectables entre document et factures."""
    MONTANT_TRANCHE_A = "MONTANT_TRANCHE_A"
    MONTANT_TRANCHE_B = "MONTANT_TRANCHE_B"
    MONTANT_OTC = "MONTANT_OTC"
    MONTANT_TOTAL = "MONTANT_TOTAL"
    NB_LIGNES = "NB_LIGNES"
    REMISE_MOYENNE = "REMISE_MOYENNE"


class SeveriteEcart(str, Enum):
    """
    Severite d'un ecart :
      - CRITIQUE      : |ecart| > 5 % ET > 50 EUR  -> falsification probable
      - AVERTISSEMENT : |ecart| > 1 % ET > 10 EUR  -> a investiguer
      - MINEUR        : |ecart| > 1 EUR mais en-dessous des seuils ci-dessus
    Les ecarts <= 1 EUR en absolu sont consideres comme de l'arrondi et ne sont
    pas remontes.
    """
    CRITIQUE = "CRITIQUE"
    AVERTISSEMENT = "AVERTISSEMENT"
    MINEUR = "MINEUR"


@dataclass
class EcartTranche:
    """Un ecart detecte entre document de tranche et calcul PharmaVerif."""
    type_ecart: TypeEcartTranche
    severite: SeveriteEcart
    description: str

    montant_declare: Decimal    # Ce que le grossiste dit (document)
    montant_calcule: Decimal    # Ce que PharmaVerif calcule (factures)
    ecart_absolu: Decimal       # declare - calcule (signe conserve)
    ecart_pct: Decimal          # |ecart| / calcule * 100

    # True si le grossiste declare PLUS qu'attendu (paie plus) -> favorable pharmacien.
    favorable_pharmacien: bool = False


@dataclass
class TrancheVerificationResult:
    """Resultat complet de la verification par tranches."""
    grossiste: str
    mois: str  # format "YYYY-MM"

    ecarts: list[EcartTranche] = field(default_factory=list)

    # Synthese globale
    ecart_total_absolu: Decimal = Decimal("0")
    ecart_total_pct: Decimal = Decimal("0")

    # Verdict
    conforme: bool = True
    nb_ecarts_critiques: int = 0
    nb_ecarts_avertissement: int = 0

    # Impact financier = somme des ecarts DEFAVORABLES au pharmacien
    # (le grossiste sous-declare -> RFA potentiellement minoree).
    impact_financier: Decimal = Decimal("0")
