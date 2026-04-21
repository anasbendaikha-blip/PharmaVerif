"""
PharmaVerif — Verification par tranches (document grossiste vs factures).

Cross-reference le document mensuel envoye par le grossiste (recap par
tranche A/B/OTC) avec la somme des factures individuelles recalculees par
PharmaVerif. Detecte les manipulations documentees par ADONIS :
  - Sous-declaration Tranche A (moins de RFA a payer)
  - Sur-declaration Tranche B
  - Reclassement generique -> OTC
  - Arrondis systematiquement en faveur du grossiste
"""

from app.domain.tranche.inputs import DocumentTrancheInput, FacturesMoisInput
from app.domain.tranche.models import (
    EcartTranche,
    SeveriteEcart,
    TrancheVerificationResult,
    TypeEcartTranche,
)
from app.domain.tranche.verifier import TrancheVerifier

__all__ = [
    "DocumentTrancheInput",
    "FacturesMoisInput",
    "EcartTranche",
    "SeveriteEcart",
    "TrancheVerificationResult",
    "TypeEcartTranche",
    "TrancheVerifier",
]
