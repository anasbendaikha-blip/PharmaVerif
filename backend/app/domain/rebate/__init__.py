"""Domain models + calculateur de remises de fin d'annee (RFA)."""

from app.domain.rebate.calculator import RebateCalculator
from app.domain.rebate.inputs import AccordRebateInput, LigneFactureRebateInput
from app.domain.rebate.models import LigneRebate, RebateResult, TrancheType

__all__ = [
    "RebateCalculator",
    "AccordRebateInput",
    "LigneFactureRebateInput",
    "LigneRebate",
    "RebateResult",
    "TrancheType",
]
