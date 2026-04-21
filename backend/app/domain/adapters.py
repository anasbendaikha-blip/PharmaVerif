"""
PharmaVerif — Adaptateurs ORM <-> domain.

EXCEPTION ARCHITECTURALE : c'est le SEUL fichier du domain/ qui importe les
modeles SQLAlchemy. Il vit ici pour simplifier le refactoring progressif ;
une fois la bascule terminee, il sera deplace dans `app/infrastructure/`.

Ce module fournit UNIQUEMENT des fonctions de conversion :
  ORM SQLAlchemy  ->  dataclasses domain (Input)
  dataclasses domain (Output)  ->  ORM SQLAlchemy (pour persistance)

Aucune logique metier ici.

Note : le module est documente et testable isolement, mais les routes ne
l'appellent pas encore. La bascule des routes sur le domain sera faite
dans une tache dediee (phase 1-5-follow-up) avec tests de non-regression
au niveau API.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Iterable, Optional

# --- Modeles SQLAlchemy (infrastructure) ---
from app.models_labo import (
    AccordCommercial,
    AnomalieFactureLabo,
    FactureLabo,
    LigneFactureLabo,
    PalierRFA,
)
from app.models_rebate import LaboratoryAgreement

# --- Dataclasses domain (Input) ---
from app.domain.verification.inputs import (
    ConditionsCommercialesInput,
    FactureInput,
    LigneFactureInput,
    PalierRFAInput,
)
from app.domain.verification.models import (
    Anomalie,
    Severite,
    TypeVerification,
)
from app.domain.rebate.inputs import (
    AccordRebateInput,
    LigneFactureRebateInput,
)


# ==================================================================
# ORM  ->  Inputs  (VERIFICATION)
# ==================================================================

def _to_decimal(value) -> Decimal:
    """Convertit un Float SQLAlchemy (ou None) en Decimal."""
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def palier_rfa_orm_to_input(palier: PalierRFA) -> PalierRFAInput:
    return PalierRFAInput(
        seuil_min=_to_decimal(palier.seuil_min),
        seuil_max=_to_decimal(palier.seuil_max) if palier.seuil_max is not None else None,
        taux_rfa=_to_decimal(palier.taux_rfa),
        description=palier.description,
    )


def accord_to_conditions_input(
    accord: Optional[AccordCommercial],
    cumul_rfa_annuel: Decimal = Decimal("0"),
) -> Optional[ConditionsCommercialesInput]:
    """
    Projette un AccordCommercial ORM vers les conditions domain.
    `cumul_rfa_annuel` doit etre precalcule par l'infra (requete DB
    aggregee) et passe en parametre — le domain ne requete pas la DB.
    """
    if accord is None:
        return None
    return ConditionsCommercialesInput(
        tranche_a_cible=_to_decimal(accord.tranche_a_cible),
        tranche_b_cible=_to_decimal(accord.tranche_b_cible),
        otc_cible=_to_decimal(accord.otc_cible),
        escompte_applicable=bool(accord.escompte_applicable),
        escompte_pct=_to_decimal(accord.escompte_pct),
        escompte_delai_jours=accord.escompte_delai_jours or 30,
        franco_seuil_ht=_to_decimal(accord.franco_seuil_ht),
        franco_frais_port=_to_decimal(accord.franco_frais_port),
        gratuites_applicable=bool(accord.gratuites_applicable),
        gratuites_seuil_qte=accord.gratuites_seuil_qte or 0,
        gratuites_ratio=accord.gratuites_ratio or "",
        paliers_rfa=[palier_rfa_orm_to_input(p) for p in (accord.paliers_rfa or [])],
        cumul_rfa_annuel=cumul_rfa_annuel,
    )


def ligne_labo_orm_to_verification_input(ligne: LigneFactureLabo) -> LigneFactureInput:
    return LigneFactureInput(
        cip13=ligne.cip13,
        designation=ligne.designation,
        quantite=ligne.quantite,
        prix_unitaire=_to_decimal(ligne.prix_unitaire_ht),
        prix_unitaire_apres_remise=_to_decimal(ligne.prix_unitaire_apres_remise),
        remise_pct=_to_decimal(ligne.remise_pct),
        montant_ht=_to_decimal(ligne.montant_ht),
        montant_brut=_to_decimal(ligne.montant_brut),
        tva_taux=_to_decimal(ligne.taux_tva),
        tranche=ligne.tranche,
        ligne_id=ligne.id,
    )


def facture_labo_to_verification_input(
    facture: FactureLabo,
    accord: Optional[AccordCommercial] = None,
    cumul_rfa_annuel: Decimal = Decimal("0"),
) -> FactureInput:
    """
    Construit un FactureInput a partir des modeles ORM.

    Pre-requis : `facture.lignes` doit etre charge (Session.refresh ou
    eager loading). Si `accord` est None, les checks qui en dependent
    seront skippes (cf regles du domain).
    """
    return FactureInput(
        numero=facture.numero_facture,
        date_facture=facture.date_facture,
        laboratoire_nom=facture.laboratoire.nom if facture.laboratoire else "",
        montant_brut_ht=_to_decimal(facture.montant_brut_ht),
        montant_net_ht=_to_decimal(facture.montant_net_ht),
        tranche_a_brut=_to_decimal(facture.tranche_a_brut),
        tranche_a_remise=_to_decimal(facture.tranche_a_remise),
        tranche_b_brut=_to_decimal(facture.tranche_b_brut),
        tranche_b_remise=_to_decimal(facture.tranche_b_remise),
        otc_brut=_to_decimal(facture.otc_brut),
        otc_remise=_to_decimal(facture.otc_remise),
        delai_paiement=facture.delai_paiement,
        lignes=[ligne_labo_orm_to_verification_input(l) for l in (facture.lignes or [])],
        conditions=accord_to_conditions_input(accord, cumul_rfa_annuel),
        facture_id=facture.id,
    )


# ==================================================================
# Outputs domain  ->  ORM (persistance)
# ==================================================================

# Mapping severite domain -> legacy (utilise par les routes et Pydantic schemas).
_SEVERITE_DOMAIN_TO_LEGACY = {
    Severite.CRITIQUE: "critical",
    Severite.AVERTISSEMENT: "warning",
    Severite.INFO: "info",
    Severite.OPTIMISATION: "opportunity",
}

# Mapping TypeVerification domain -> `type_anomalie` legacy (string lowercase).
_TYPE_DOMAIN_TO_LEGACY = {
    TypeVerification.REMISES_TRANCHE: "remise_ecart",
    TypeVerification.ESCOMPTE: "escompte_manquant",
    TypeVerification.FRANCO_PORT: "franco_seuil",
    TypeVerification.RFA_PROGRESSION: "rfa_palier",
    TypeVerification.GRATUITES: "gratuite_manquante",
    TypeVerification.TVA_COHERENCE: "tva_incoherence",
    TypeVerification.CALCUL_ARITHMETIQUE: "calcul_arithmetique",
}


def anomalie_domain_to_orm(anomalie: Anomalie, facture_id: int) -> AnomalieFactureLabo:
    """
    Reconstitue un AnomalieFactureLabo ORM a partir d'une Anomalie domain
    pour la persistance. `facture_id` doit etre fourni (le domain n'en connait pas).
    """
    ligne_id = anomalie.details.get("ligne_id") if anomalie.details else None
    return AnomalieFactureLabo(
        facture_id=facture_id,
        type_anomalie=_TYPE_DOMAIN_TO_LEGACY[anomalie.type_verification],
        severite=_SEVERITE_DOMAIN_TO_LEGACY[anomalie.severite],
        description=anomalie.description,
        montant_ecart=float(anomalie.montant_impact) if anomalie.montant_impact is not None else 0.0,
        action_suggeree=anomalie.action_suggeree,
        ligne_id=ligne_id,
    )


def anomalies_domain_to_orm(
    anomalies: Iterable[Anomalie], facture_id: int
) -> list[AnomalieFactureLabo]:
    """Helper batch : convertit une liste d'Anomalie domain en ORM."""
    return [anomalie_domain_to_orm(a, facture_id) for a in anomalies]


# ==================================================================
# ORM  ->  Inputs  (REBATE)
# ==================================================================

def ligne_labo_to_rebate_input(ligne: LigneFactureLabo) -> LigneFactureRebateInput:
    return LigneFactureRebateInput(
        cip13=ligne.cip13,
        designation=ligne.designation,
        quantite=ligne.quantite,
        prix_unitaire_ht=_to_decimal(ligne.prix_unitaire_ht),
        montant_net_ht=_to_decimal(ligne.montant_ht),
        montant_brut_ht=_to_decimal(ligne.montant_brut),
        taux_remise=_to_decimal(ligne.remise_pct),
        taux_tva=_to_decimal(ligne.taux_tva),
    )


def laboratory_agreement_to_rebate_input(
    agreement: LaboratoryAgreement,
    *,
    taux_tranche_a: Decimal,
    taux_tranche_b: Decimal,
    taux_otc: Decimal,
    seuil_remise: Decimal = Decimal("2.5"),
    versement_immediat_pct: Decimal = Decimal("0"),
    versement_m1_pct: Decimal = Decimal("0"),
    versement_m2_pct: Decimal = Decimal("0"),
) -> AccordRebateInput:
    """
    Projette un LaboratoryAgreement ORM vers AccordRebateInput.

    Les TAUX ne sont PAS lus automatiquement depuis `agreement.agreement_config`
    car la structure est libre (JSON). Ils doivent etre extraits et passes
    explicitement par l'appelant (route ou service). Cette contrainte garantit
    qu'aucun taux fantome n'arrive jusqu'au calculateur.

    La resolution `agreement_config -> taux_tranche_*` fera l'objet d'un helper
    dedie dans la tache de bascule routes (phase 1-5-follow-up), une fois que
    le schema JSON sera fige.
    """
    return AccordRebateInput(
        accord_id=agreement.id,
        accord_nom=agreement.nom,
        laboratoire_nom=agreement.laboratoire.nom if agreement.laboratoire else "",
        seuil_remise=seuil_remise,
        taux_tranche_a=taux_tranche_a,
        taux_tranche_b=taux_tranche_b,
        taux_otc=taux_otc,
        versement_immediat_pct=versement_immediat_pct,
        versement_m1_pct=versement_m1_pct,
        versement_m2_pct=versement_m2_pct,
    )
