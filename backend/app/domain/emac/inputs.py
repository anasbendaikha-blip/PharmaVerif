"""
PharmaVerif — Donnees d'entree de la verification EMAC (domain).

ZERO dependance SQLAlchemy / FastAPI. Stdlib uniquement.

Le verificateur recoit :
  - EMACInput       : les montants DECLARES par le laboratoire.
  - FacturesRefInput: ce que les factures REELLES et les conditions negociees
                      produisent comme attendu (CA reel, RFA attendue, COP attendue).

La construction de ces inputs a partir de SQLAlchemy est du ressort de la couche
infrastructure (routes/services/emac.py).
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Optional


@dataclass
class EMACInput:
    """Document EMAC declare par le laboratoire (projection de EMAC)."""
    emac_id: int
    reference: str
    laboratoire_nom: str
    periode_debut: date
    periode_fin: date

    # Montants DECLARES (tels quels dans le document EMAC)
    ca_declare: Decimal = Decimal("0")
    rfa_declaree: Decimal = Decimal("0")
    cop_declaree: Decimal = Decimal("0")
    remises_differees_declarees: Decimal = Decimal("0")
    autres_avantages: Decimal = Decimal("0")
    total_avantages_declares: Decimal = Decimal("0")

    # Deja credite / reste a percevoir
    montant_deja_verse: Decimal = Decimal("0")


@dataclass
class FacturesRefInput:
    """
    Reference "verite" pour la periode : CA reel issu des factures et
    RFA/COP attendues derivees des conditions negociees. Calcules par
    la couche infra (agregation DB) avant appel du verificateur.
    """
    # Extrait des factures labo sur la periode
    ca_reel: Decimal = Decimal("0")
    nombre_factures: int = 0

    # Attendu calcule depuis l'accord + les factures (via RebateCalculator)
    rfa_attendue: Decimal = Decimal("0")
    cop_attendue: Decimal = Decimal("0")

    # Contexte libre (breakdown par facture/labo/type) pour remonter dans details
    breakdown: dict = field(default_factory=dict)
