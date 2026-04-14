"""
PharmaVerif — Donnees d'entree du moteur de verification (domain).

Ces dataclasses sont le CONTRAT entre :
  - la couche infrastructure (SQLAlchemy, routes FastAPI) qui construit les
    FactureInput a partir des modeles ORM ;
  - la couche domain qui ne connait RIEN a la base.

ZERO dependance SQLAlchemy / FastAPI. Stdlib uniquement.

Alignement avec les modeles legacy :
  - FactureInput            <-> FactureLabo        (app/models_labo.py)
  - LigneFactureInput       <-> LigneFactureLabo
  - PalierRFAInput          <-> PalierRFA
  - ConditionsCommercialesInput <-> AccordCommercial
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Optional


@dataclass
class LigneFactureInput:
    """Une ligne de facture a verifier."""
    cip13: str
    designation: str
    quantite: int
    prix_unitaire: Decimal                 # PU HT avant remise (= prix_unitaire_ht)
    prix_unitaire_apres_remise: Decimal     # PU HT apres remise
    remise_pct: Decimal                     # taux de remise en %, ex 5.00
    montant_ht: Decimal                     # net HT de la ligne
    montant_brut: Decimal                   # = quantite * prix_unitaire
    tva_taux: Decimal                       # ex Decimal("2.10")
    tranche: Optional[str] = None           # "A" | "B" | "OTC" (conventions legacy)
    ligne_id: Optional[int] = None          # cle technique utile pour details


@dataclass
class PalierRFAInput:
    """Un palier RFA dans les conditions commerciales."""
    seuil_min: Decimal
    taux_rfa: Decimal                       # en %, ex Decimal("2.0")
    seuil_max: Optional[Decimal] = None     # None = pas de plafond
    description: Optional[str] = None


@dataclass
class ConditionsCommercialesInput:
    """
    Conditions negociees avec le laboratoire (projection de AccordCommercial).
    Tous les champs ont des defauts neutres pour faciliter les tests ciblant
    un seul check a la fois.
    """
    # Cibles de remise par tranche (en %)
    tranche_a_cible: Decimal = Decimal("0")
    tranche_b_cible: Decimal = Decimal("0")
    otc_cible: Decimal = Decimal("0")

    # Escompte
    escompte_applicable: bool = False
    escompte_pct: Decimal = Decimal("0")
    escompte_delai_jours: int = 30

    # Franco de port
    franco_seuil_ht: Decimal = Decimal("0")
    franco_frais_port: Decimal = Decimal("0")

    # Gratuites
    gratuites_applicable: bool = False
    gratuites_seuil_qte: int = 0
    gratuites_ratio: str = ""               # ex "10+1"

    # RFA (paliers annuels)
    paliers_rfa: list[PalierRFAInput] = field(default_factory=list)
    # Cumul d'achats HT de l'annee en cours (precalcule par l'infra).
    cumul_rfa_annuel: Decimal = Decimal("0")


@dataclass
class FactureInput:
    """Une facture complete a verifier."""
    numero: str
    date_facture: date
    laboratoire_nom: str
    montant_brut_ht: Decimal
    montant_net_ht: Decimal

    # Ventilation par tranche (calculee par le parser en amont)
    tranche_a_brut: Decimal = Decimal("0")
    tranche_a_remise: Decimal = Decimal("0")
    tranche_b_brut: Decimal = Decimal("0")
    tranche_b_remise: Decimal = Decimal("0")
    otc_brut: Decimal = Decimal("0")
    otc_remise: Decimal = Decimal("0")

    # Chaine brute du delai de paiement (ex "30 jours", "60J"). Regex-parsed.
    delai_paiement: Optional[str] = None

    lignes: list[LigneFactureInput] = field(default_factory=list)
    conditions: Optional[ConditionsCommercialesInput] = None

    # Cle technique (pour remonter dans details d'anomalie).
    facture_id: Optional[int] = None
