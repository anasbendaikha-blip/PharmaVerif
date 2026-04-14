"""Domain models + moteur de verification de factures laboratoires."""

from app.domain.verification.engine import VerificationEngine
from app.domain.verification.inputs import (
    ConditionsCommercialesInput,
    FactureInput,
    LigneFactureInput,
    PalierRFAInput,
)
from app.domain.verification.models import (
    Anomalie,
    ElementConforme,
    Severite,
    TypeVerification,
    VerificationResult,
)

__all__ = [
    # Engine
    "VerificationEngine",
    # Inputs
    "FactureInput",
    "LigneFactureInput",
    "PalierRFAInput",
    "ConditionsCommercialesInput",
    # Outputs
    "Anomalie",
    "ElementConforme",
    "Severite",
    "TypeVerification",
    "VerificationResult",
]
