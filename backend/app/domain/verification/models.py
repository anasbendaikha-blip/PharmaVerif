"""
PharmaVerif — Domain models pour la verification de factures labo.

ZERO dependance SQLAlchemy / FastAPI / base de donnees. Uniquement stdlib.

Alignement avec le code actuel (backend/app/services/verification_engine.py) :
  - 7 types de checks : remises par tranche, escompte, franco, RFA progression,
    gratuites, TVA coherence, calculs arithmetiques.
  - Severites produites aujourd'hui par le moteur : "critical", "opportunity",
    "info" (strings lowercase cote SQLAlchemy). Le domain unifie les intitules
    en majuscules ; le mapping se fera dans un adapter (phase 2).
"""

from dataclasses import dataclass, field
from decimal import Decimal
from enum import Enum
from typing import Optional


class Severite(str, Enum):
    """
    Niveau de severite d'une anomalie.

    Mapping depuis les valeurs actuelles du verification_engine :
      - "critical"    → CRITIQUE
      - "opportunity" → OPTIMISATION
      - "info"        → INFO
    (Le label AVERTISSEMENT est reserve pour un usage futur — ecart significatif
    sans perte monetaire claire.)
    """
    CRITIQUE = "CRITIQUE"
    AVERTISSEMENT = "AVERTISSEMENT"
    INFO = "INFO"
    OPTIMISATION = "OPTIMISATION"


class TypeVerification(str, Enum):
    """Types de verifications effectuees par le moteur."""
    REMISES_TRANCHE = "REMISES_TRANCHE"        # check 1 : remise_ecart
    ESCOMPTE = "ESCOMPTE"                       # check 2 : escompte_manquant
    FRANCO_PORT = "FRANCO_PORT"                 # check 3 : franco_seuil
    RFA_PROGRESSION = "RFA_PROGRESSION"         # check 4 : rfa_palier
    GRATUITES = "GRATUITES"                     # check 5 : gratuite_manquante
    TVA_COHERENCE = "TVA_COHERENCE"             # check 6 : tva_incoherence
    CALCUL_ARITHMETIQUE = "CALCUL_ARITHMETIQUE" # check 7 : calcul_arithmetique


@dataclass
class Anomalie:
    """
    Une anomalie detectee sur une facture.

    Champs alignes sur AnomalieFactureLabo (models_labo.py) mais sans
    dependance ORM : `details` remplace les FKs optionnelles (ligne_id, etc.).
    """
    type_verification: TypeVerification
    severite: Severite
    description: str
    # Impact financier estime en EUR. None si non chiffrable.
    montant_impact: Optional[Decimal] = None
    # Action recommandee pour resoudre l'anomalie (equivalent action_suggeree).
    action_suggeree: Optional[str] = None
    # Details libres : ligne_id, cip13, tranche, taux_reel, taux_cible, etc.
    details: dict = field(default_factory=dict)


@dataclass
class ElementConforme:
    """
    Un element verifie et trouve conforme.

    Pas encore produit par le moteur actuel (qui ne remonte que les anomalies).
    Prevu pour phase 2 : structurer les "bonnes nouvelles" pour le rapport.
    """
    type_verification: TypeVerification
    description: str
    details: dict = field(default_factory=dict)


@dataclass
class VerificationResult:
    """
    Resultat complet d'une verification de facture.

    Les opportunites (Severite.OPTIMISATION) sont separees des anomalies
    vraies pour pouvoir les mettre en avant dans l'UI ("argent a gagner").
    """
    anomalies: list[Anomalie] = field(default_factory=list)
    conformes: list[ElementConforme] = field(default_factory=list)
    optimisations: list[Anomalie] = field(default_factory=list)

    # Montant cumule des impacts chiffres des anomalies (hors optimisations).
    montant_total_anomalies: Decimal = Decimal("0.00")

    # Nombre de checks executes (pour telemetrie / diagnostic).
    nombre_verifications: int = 0
    # Temps d'execution en ms (profiling).
    duree_ms: float = 0.0

    @property
    def score_confiance(self) -> float:
        """Score 0-100 base sur le ratio conformes / total verifie."""
        total = len(self.anomalies) + len(self.conformes) + len(self.optimisations)
        if total == 0:
            return 100.0
        return round(len(self.conformes) / total * 100, 1)

    @property
    def has_critical(self) -> bool:
        """True si au moins une anomalie critique."""
        return any(a.severite == Severite.CRITIQUE for a in self.anomalies)
