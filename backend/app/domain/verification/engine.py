"""
PharmaVerif — Moteur de verification (domain).

Orchestre les 7 regles de check et compose un VerificationResult.
Sans dependance SQLAlchemy / FastAPI / DB.

Usage :
    from app.domain.verification.engine import VerificationEngine
    from app.domain.verification.inputs import FactureInput, ...

    engine = VerificationEngine()
    result = engine.verify(facture_input)  # FactureInput -> VerificationResult
"""

import time
from decimal import Decimal

from app.domain.verification.inputs import FactureInput
from app.domain.verification.models import (
    Severite,
    VerificationResult,
)
from app.domain.verification.rules import (
    RegleCalculArithmetique,
    RegleEscompte,
    RegleFrancoDePort,
    RegleGratuites,
    RegleRemisesParTranche,
    RegleRFAProgression,
    RegleTVACoherence,
    RegleVerification,
)


class VerificationEngine:
    """Moteur de verification de factures pharmaceutiques (domain-pure)."""

    def __init__(self, regles: list[RegleVerification] | None = None):
        # Permet l'injection d'une liste custom (tests, extension).
        self.regles: list[RegleVerification] = regles or [
            RegleRemisesParTranche(),
            RegleEscompte(),
            RegleFrancoDePort(),
            RegleRFAProgression(),
            RegleGratuites(),
            RegleTVACoherence(),
            RegleCalculArithmetique(),
        ]

    def verify(self, facture: FactureInput) -> VerificationResult:
        """Execute toutes les regles et compose le resultat."""
        start = time.perf_counter()
        result = VerificationResult(nombre_verifications=len(self.regles))

        for regle in self.regles:
            anomalies, conformes = regle.verify(facture)
            for a in anomalies:
                if a.severite == Severite.OPTIMISATION:
                    result.optimisations.append(a)
                else:
                    result.anomalies.append(a)
            result.conformes.extend(conformes)

        total = Decimal("0.00")
        for a in result.anomalies:
            if a.montant_impact is not None:
                total += a.montant_impact
        result.montant_total_anomalies = total.quantize(Decimal("0.01"))

        result.duree_ms = (time.perf_counter() - start) * 1000
        return result
