"""
PharmaVerif — Domain models pour la verification EMAC.

Verification triangulaire : factures labo <-> conditions negociees <-> EMAC
declare par le laboratoire. Objectif : detecter les ecarts entre ce que
la pharmacie devrait toucher (selon les conditions) et ce qui est reellement
paye / declare.

ZERO dependance SQLAlchemy / FastAPI.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional


@dataclass
class EcartEMAC:
    """Un ecart detecte dans la verification triangulaire."""
    type_ecart: str  # ex: "MONTANT_EMAC_VS_FACTURES", "LIGNE_MANQUANTE", ...
    description: str
    montant_attendu: Decimal
    montant_declare: Decimal
    ecart: Decimal                   # = montant_attendu - montant_declare
    seuil_alerte: bool = False       # True si ecart > tolerance
    # Contexte libre : cip13, date, accord_id, etc.
    details: dict = field(default_factory=dict)


@dataclass
class EMACVerificationResult:
    """Resultat complet de la verification EMAC."""
    ecarts: list[EcartEMAC] = field(default_factory=list)
    montant_total_attendu: Decimal = Decimal("0.00")
    montant_total_declare: Decimal = Decimal("0.00")
    ecart_total: Decimal = Decimal("0.00")
    conforme: bool = True

    # Tracabilite
    emac_id: Optional[int] = None
    periode: str = ""  # ex: "2026-03" ou "2026-T1"
    nombre_factures_considerees: int = 0

    @property
    def nb_ecarts_critiques(self) -> int:
        """Nombre d'ecarts au-dessus du seuil d'alerte."""
        return sum(1 for e in self.ecarts if e.seuil_alerte)
