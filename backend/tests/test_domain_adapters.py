"""
Tests de parite des adaptateurs ORM <-> domain.

Prouvent que :
  - facture_labo_to_verification_input() + VerificationEngine (domain) produit
    les MEMES anomalies (nombre + types + severites) que le VerificationEngine
    legacy de services/verification_engine.py, sur les memes donnees ORM.
  - anomalies_domain_to_orm() reconstitue des AnomalieFactureLabo coherentes
    pour la persistance.

Ces tests constituent le filet de securite pour la bascule future des routes
(phase 1-5-follow-up).
"""

from datetime import date
from decimal import Decimal

import pytest

from app.models import User
from app.models_labo import (
    AccordCommercial,
    AnomalieFactureLabo,
    FactureLabo,
    LigneFactureLabo,
    PalierRFA,
)
from app.services.verification_engine import VerificationEngine as LegacyEngine

from app.domain.verification.engine import VerificationEngine as DomainEngine
from app.domain.verification.models import Severite, TypeVerification
from app.domain.adapters import (
    _SEVERITE_DOMAIN_TO_LEGACY,
    _TYPE_DOMAIN_TO_LEGACY,
    anomalies_domain_to_orm,
    facture_labo_to_verification_input,
)


# ------------------------------------------------------------------
# Fixtures locales (reprennent les conftest deja en place : db, pharmacy,
# laboratoire — definis dans tests/conftest.py).
# ------------------------------------------------------------------

@pytest.fixture
def user(db, pharmacy):
    u = User(
        email="adapter-test@example.com",
        hashed_password="x",
        nom="T", prenom="U",
        pharmacy_id=pharmacy.id,
    )
    db.add(u); db.commit(); db.refresh(u)
    return u


@pytest.fixture
def accord(db, laboratoire):
    a = AccordCommercial(
        laboratoire_id=laboratoire.id,
        nom="Accord Parite",
        date_debut=date(2026, 1, 1),
        date_fin=date(2026, 12, 31),
        tranche_a_cible=30.0, tranche_b_cible=15.0, otc_cible=5.0,
        escompte_applicable=True, escompte_pct=2.5, escompte_delai_jours=30,
        franco_seuil_ht=300.0, franco_frais_port=15.0,
        gratuites_applicable=True, gratuites_seuil_qte=10, gratuites_ratio="10+1",
        actif=True,
    )
    db.add(a); db.commit(); db.refresh(a)
    return a


def _make_facture_orm(db, user, lab, pharm, **kw):
    f = FactureLabo(
        user_id=user.id, pharmacy_id=pharm.id, laboratoire_id=lab.id,
        numero_facture=kw.pop("numero", "ADAPT-001"),
        date_facture=kw.pop("date_facture", date(2026, 6, 1)),
        montant_brut_ht=kw.pop("montant_brut_ht", 500.0),
        montant_net_ht=kw.pop("montant_net_ht", 400.0),
        total_remise_facture=100.0,
        tranche_a_brut=kw.pop("tranche_a_brut", 0.0),
        tranche_a_remise=kw.pop("tranche_a_remise", 0.0),
        tranche_b_brut=kw.pop("tranche_b_brut", 0.0),
        tranche_b_remise=kw.pop("tranche_b_remise", 0.0),
        otc_brut=0.0, otc_remise=0.0,
        delai_paiement=kw.pop("delai_paiement", None),
    )
    db.add(f); db.commit(); db.refresh(f)
    return f


def _make_ligne_orm(db, facture, **kw):
    pu = kw.get("prix_unitaire_ht", 10.0)
    rem = kw.get("remise_pct", 0.0)
    qte = kw.get("quantite", 1)
    pu_ar = kw.get("prix_unitaire_apres_remise", round(pu * (1 - rem / 100), 4))
    mt_ht = kw.get("montant_ht", round(pu_ar * qte, 2))
    mt_brut = kw.get("montant_brut", round(pu * qte, 2))
    l = LigneFactureLabo(
        facture_id=facture.id,
        cip13=kw.get("cip13", "3400900000001"),
        designation=kw.get("designation", "PARACETAMOL"),
        quantite=qte,
        prix_unitaire_ht=pu, remise_pct=rem,
        prix_unitaire_apres_remise=pu_ar,
        montant_ht=mt_ht, taux_tva=kw.get("taux_tva", 2.10),
        montant_brut=mt_brut, montant_remise=round(mt_brut - mt_ht, 2),
        tranche=kw.get("tranche", "A"),
    )
    db.add(l); db.commit(); db.refresh(l)
    return l


# ==================================================================
# Parite : legacy vs domain sur scenarios types
# ==================================================================

def _compare_counts(legacy_anomalies, domain_result):
    """
    Normalise et compare : on verifie que (type_anomalie, severite) comptes
    sont identiques entre legacy et domain apres mapping.
    """
    legacy_keys = sorted((a.type_anomalie, a.severite) for a in legacy_anomalies)

    # domain : anomalies + optimisations (le domain separe, le legacy non)
    all_domain = domain_result.anomalies + domain_result.optimisations
    domain_keys = sorted(
        (
            _TYPE_DOMAIN_TO_LEGACY[a.type_verification],
            _SEVERITE_DOMAIN_TO_LEGACY[a.severite],
        )
        for a in all_domain
    )
    return legacy_keys, domain_keys


def test_parite_remises_ecart(db, user, laboratoire, pharmacy, accord):
    """Tranche A 20% vs cible 30% → 1 critical des deux cotes."""
    f = _make_facture_orm(
        db, user, laboratoire, pharmacy,
        tranche_a_brut=1000.0, tranche_a_remise=200.0,
    )
    legacy = LegacyEngine(db, pharmacy_id=pharmacy.id).verify(f, accord)
    fi = facture_labo_to_verification_input(f, accord)
    domain = DomainEngine().verify(fi)

    lk, dk = _compare_counts(legacy, domain)
    assert lk == dk
    # Meme montant d'ecart (aux arrondis pres)
    legacy_total = sum(a.montant_ecart for a in legacy if a.severite == "critical")
    domain_total = float(sum(
        (a.montant_impact or Decimal("0")) for a in domain.anomalies
    ))
    assert abs(legacy_total - domain_total) < 0.05


def test_parite_escompte_opportunity(db, user, laboratoire, pharmacy, accord):
    """Escompte dispo → 1 opportunity des deux cotes."""
    f = _make_facture_orm(db, user, laboratoire, pharmacy, montant_net_ht=400.0)
    legacy = LegacyEngine(db, pharmacy_id=pharmacy.id).verify(f, accord)
    fi = facture_labo_to_verification_input(f, accord)
    domain = DomainEngine().verify(fi)

    lk, dk = _compare_counts(legacy, domain)
    assert lk == dk


def test_parite_gratuites_manquantes(db, user, laboratoire, pharmacy, accord):
    f = _make_facture_orm(db, user, laboratoire, pharmacy)
    _make_ligne_orm(db, f, cip13="3400900000001", designation="DOLIPRANE",
                    quantite=20, prix_unitaire_ht=5.0, remise_pct=10.0)
    db.refresh(f)
    legacy = LegacyEngine(db, pharmacy_id=pharmacy.id).verify(f, accord)
    fi = facture_labo_to_verification_input(f, accord)
    domain = DomainEngine().verify(fi)

    lk, dk = _compare_counts(legacy, domain)
    assert lk == dk


def test_parite_rfa_progression(db, user, laboratoire, pharmacy, accord):
    db.add_all([
        PalierRFA(accord_id=accord.id, seuil_min=0, seuil_max=50000, taux_rfa=2.0),
        PalierRFA(accord_id=accord.id, seuil_min=50000, taux_rfa=3.0),
    ])
    db.commit(); db.refresh(accord)
    f = _make_facture_orm(
        db, user, laboratoire, pharmacy,
        montant_brut_ht=48000.0, montant_net_ht=45000.0,
    )
    legacy = LegacyEngine(db, pharmacy_id=pharmacy.id).verify(f, accord)

    # Pour le domain, on doit passer explicitement le cumul (48k) :
    fi = facture_labo_to_verification_input(
        f, accord, cumul_rfa_annuel=Decimal("48000"),
    )
    domain = DomainEngine().verify(fi)

    lk, dk = _compare_counts(legacy, domain)
    assert lk == dk


# ==================================================================
# Persistance : anomalies domain -> ORM
# ==================================================================

def test_anomalies_domain_to_orm_persistable(db, user, laboratoire, pharmacy, accord):
    """Les anomalies domain converties en ORM sont flushables sans erreur SQL."""
    f = _make_facture_orm(
        db, user, laboratoire, pharmacy,
        tranche_a_brut=1000.0, tranche_a_remise=200.0,
    )
    fi = facture_labo_to_verification_input(f, accord)
    domain = DomainEngine().verify(fi)

    orm_anomalies = anomalies_domain_to_orm(
        domain.anomalies + domain.optimisations, facture_id=f.id,
    )
    for a in orm_anomalies:
        db.add(a)
    db.commit()

    # On retrouve bien les anomalies en base, avec type_anomalie et severite
    # au format legacy (strings lowercase).
    saved = db.query(AnomalieFactureLabo).filter(
        AnomalieFactureLabo.facture_id == f.id
    ).all()
    assert len(saved) == len(orm_anomalies) > 0
    assert all(a.severite in ("critical", "warning", "info", "opportunity") for a in saved)
    assert all(a.type_anomalie for a in saved)
