"""Domain models du calculateur de remises de fin d'annee (RFA)."""

from app.domain.rebate.models import (
    LigneRebate,
    RebateResult,
    TrancheType,
)

__all__ = ["LigneRebate", "RebateResult", "TrancheType"]
