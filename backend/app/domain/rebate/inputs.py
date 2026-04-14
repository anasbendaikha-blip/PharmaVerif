"""
PharmaVerif — Donnees d'entree du calculateur RFA (domain).

ZERO dependance SQLAlchemy / FastAPI / DB. Les taux et seuils viennent
TOUS de l'accord commercial en base — jamais hardcodes ici.

Alignement legacy :
  - AccordRebateInput <-> LaboratoryAgreement.agreement_config (models_rebate)
  - LigneFactureRebateInput <-> LigneFactureLabo (subset)
"""

from dataclasses import dataclass
from decimal import Decimal


@dataclass
class LigneFactureRebateInput:
    """Une ligne de facture pour le calcul RFA (vue minimale)."""
    cip13: str
    designation: str
    quantite: int
    prix_unitaire_ht: Decimal
    montant_net_ht: Decimal      # apres remise de facture
    montant_brut_ht: Decimal     # avant remise de facture (= qte * pu)
    taux_remise: Decimal         # en %, ex Decimal("5.0")
    taux_tva: Decimal            # en %, ex Decimal("2.10")


@dataclass
class AccordRebateInput:
    """
    Parametres de l'accord commercial pour le calcul RFA.

    Tous les taux/seuils viennent de la DB (LaboratoryAgreement.agreement_config).
    AUCUNE valeur par defaut sur les taux : la construction d'un accord doit
    etre explicite pour garantir qu'aucun calcul ne tourne sur des taux fantomes.
    """
    accord_id: int
    accord_nom: str
    laboratoire_nom: str

    # Seuil de classification A/B sur la remise de facture (en %).
    # Typiquement 2.5 % (plafond reglementaire pour distinguer remise
    # "simple" vs remise "de volume").
    seuil_remise: Decimal

    # Taux RFA par tranche (en %). AUCUN default — la construction doit etre
    # explicite. Valeurs de reference spec (mars 2026, Mustafa) :
    #   tranche A = 55 %  (remise > seuil)
    #   tranche B = 25 %  (remise <= seuil)
    #   OTC       = 57 %  (deja integre dans la remise facture)
    taux_tranche_a: Decimal
    taux_tranche_b: Decimal
    taux_otc: Decimal

    # TVA de reference pour classifier un produit comme "generique" (remboursable).
    # 2.10 % en France a mars 2026 — modifiable pour scenarios de test.
    tva_generique: Decimal = Decimal("2.10")

    # Calendrier de versement : portion deja percue (etapes a delai 0 mois).
    # Les deux autres portions servent a decomposer la remontee entre M+1 et M+2.
    # Tous en % du taux total de la tranche. Par defaut neutre (tout en remontee).
    versement_immediat_pct: Decimal = Decimal("0")
    versement_m1_pct: Decimal = Decimal("0")
    versement_m2_pct: Decimal = Decimal("0")
