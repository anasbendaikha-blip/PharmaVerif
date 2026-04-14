"""
PharmaVerif — Domain models pour le calcul des RFA.

ZERO dependance SQLAlchemy / FastAPI / base de donnees.

---

TAUX DE REFERENCE (valides Mustafa, mars 2026 — documentation uniquement) :
  - Tranche A : TVA 2.10% + remise facture  > 2.5% → 55% RFA total
  - Tranche B : TVA 2.10% + remise facture <= 2.5% → 25% RFA total
  - OTC       : TVA != 2.10%                        → 57% (deja percu via facture)

Ces taux ne sont PAS hardcodes ici. Ils vivent dans LaboratoryAgreement en DB
et sont passes au calculateur en parametre.

---

BUG CONNU (cf tests/test_rebate_engine_characterization.py) :
Le code actuel INVERSE les labels A/B :
  - "tranche_A" (code) = remise BASSE (<=2.5%)  == Tranche B (spec)
  - "tranche_B" (code) = remise HAUTE ( >2.5%)  == Tranche A (spec)
Le domain layer utilise les LABELS SPEC (A = haute, B = basse). L'adapter
entre le moteur actuel et ce domain fera la translation A<->B en phase 2.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum
from typing import Optional


class TrancheType(str, Enum):
    """
    Classification spec (pas le nommage du code legacy) :
      - TRANCHE_A   : remise haute (> 2.5%), taux RFA eleve (~55%)
      - TRANCHE_B   : remise basse (<= 2.5%), taux RFA bas (~25%)
      - OTC         : TVA != 2.10%, exclu du schedule standard (57% deja percu)
      - NON_ELIGIBLE: ligne sans classification (ex: TVA manquante)
    """
    TRANCHE_A = "TRANCHE_A"
    TRANCHE_B = "TRANCHE_B"
    OTC = "OTC"
    NON_ELIGIBLE = "NON_ELIGIBLE"


@dataclass
class LigneRebate:
    """Resultat du calcul RFA pour une ligne de facture."""
    cip13: str
    designation: str
    tranche: TrancheType
    montant_net_ht: Decimal
    taux_remise: Decimal   # taux de remise deja applique sur la facture (en %)
    taux_rfa: Decimal      # taux RFA applicable (lu depuis l'accord, en %)
    montant_rfa: Decimal   # = montant_net_ht * taux_rfa / 100
    tva_taux: Decimal      # pour classification : 2.10 = generique


@dataclass
class RebateResult:
    """
    Resultat complet du calcul RFA pour une facture.

    Tous les montants sont en EUR, arrondis a 2 decimales cote calculateur.
    L'`accord_nom` et `accord_id` permettent de retracer la source des taux.
    """
    lignes: list[LigneRebate] = field(default_factory=list)

    # Ventilation par tranche (montants HT eligibles, pas la RFA)
    total_tranche_a: Decimal = Decimal("0.00")
    total_tranche_b: Decimal = Decimal("0.00")
    total_otc: Decimal = Decimal("0.00")

    # RFA calculee par tranche
    rfa_tranche_a: Decimal = Decimal("0.00")
    rfa_tranche_b: Decimal = Decimal("0.00")
    rfa_otc: Decimal = Decimal("0.00")  # 57% deja percu via remise facture

    # Synthese
    total_rfa_due: Decimal = Decimal("0.00")  # somme rfa_tranche_a/b/otc
    deja_percu: Decimal = Decimal("0.00")     # remises deja integrees (dont OTC)
    remontee: Decimal = Decimal("0.00")       # reste a toucher = due - deja_percu

    # Metadonnees tracabilite
    accord_nom: str = ""
    accord_id: Optional[int] = None
    nombre_lignes_eligible: int = 0
    nombre_lignes_otc: int = 0
