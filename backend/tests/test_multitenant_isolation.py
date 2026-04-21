"""
Test d'integration multi-tenant.

Cree 2 pharmacies avec leurs propres factures/EMAC/agreements, puis verifie
que chaque repository ne peut en AUCUNE maniere exposer les donnees de
l'autre tenant :
  - list()                    : compte et contenu
  - get()                     : acces direct par id (etranger -> None)
  - get_or_404                : leve RepositoryError sur id etranger
  - exists                    : False sur id etranger
  - get_with_lignes           : None sur id etranger
  - get_lignes                : [] sur id etranger
  - list_anomalies_non_resolues : [] sur id etranger
  - delete                    : False sur id etranger (la donnee reste)
  - query()                   : chainer des filtres custom ne "re-ouvre"
                                 pas l'acces a l'autre tenant
  - create()                  : ecrase un pharmacy_id fourni par le caller

Test complementaire a tests/test_repositories.py (qui teste chaque repo
unitairement) : ici on simule un scenario "production" complet.
"""

from datetime import date
from decimal import Decimal

import pytest

from app.infrastructure.repositories.base import RepositoryError
from app.infrastructure.repositories.emac_repo import EMACRepository
from app.infrastructure.repositories.grossiste_repo import GrossisteRepository
from app.infrastructure.repositories.invoice_repo import InvoiceLaboRepository
from app.infrastructure.repositories.lab_repo import LaboratoireRepository
from app.infrastructure.repositories.rebate_repo import RebateRepository
from app.models import Grossiste, Pharmacy, User
from app.models_emac import EMAC
from app.models_labo import (
    AnomalieFactureLabo,
    FactureLabo,
    Laboratoire,
    LigneFactureLabo,
)
from app.models_rebate import (
    AgreementStatus,
    LaboratoryAgreement,
    RebateTemplate,
    RebateType,
)


# ------------------------------------------------------------------
# Fixture : monde complet avec 2 tenants
# ------------------------------------------------------------------

@pytest.fixture
def world(db):
    """
    Genere un "monde" de test avec 2 pharmacies independantes.

    Contenu de chaque pharmacy : 1 user, 1 labo, 1 grossiste, 1 facture + ligne
    + anomalie non resolue, 1 EMAC, 1 agreement actif.
    """
    # Pharmacies
    p1 = Pharmacy(nom="Pharmacie Alpha", siret="11111111111111", titulaire="Alice")
    p2 = Pharmacy(nom="Pharmacie Beta",  siret="22222222222222", titulaire="Bob")
    db.add_all([p1, p2]); db.commit()
    db.refresh(p1); db.refresh(p2)

    # Users, labos, grossistes
    u1 = User(email="alice@ex.com", hashed_password="x", nom="A", prenom="L", pharmacy_id=p1.id)
    u2 = User(email="bob@ex.com",   hashed_password="x", nom="B", prenom="O", pharmacy_id=p2.id)
    db.add_all([u1, u2]); db.commit(); db.refresh(u1); db.refresh(u2)

    lab1 = Laboratoire(nom="LabAlpha", type="generique", actif=True, pharmacy_id=p1.id)
    lab2 = Laboratoire(nom="LabBeta",  type="generique", actif=True, pharmacy_id=p2.id)
    db.add_all([lab1, lab2]); db.commit(); db.refresh(lab1); db.refresh(lab2)

    gro1 = Grossiste(nom="GrossisteAlpha", pharmacy_id=p1.id)
    gro2 = Grossiste(nom="GrossisteBeta",  pharmacy_id=p2.id)
    db.add_all([gro1, gro2]); db.commit(); db.refresh(gro1); db.refresh(gro2)

    # Factures + lignes + anomalies
    def _mk_facture(user, lab, pharm, num):
        f = FactureLabo(
            user_id=user.id, pharmacy_id=pharm.id, laboratoire_id=lab.id,
            numero_facture=num, date_facture=date(2026, 6, 1),
            montant_brut_ht=500.0, montant_net_ht=400.0, total_remise_facture=100.0,
        )
        db.add(f); db.commit(); db.refresh(f)
        db.add(LigneFactureLabo(
            facture_id=f.id, cip13="3400900000001", designation="PARACETAMOL",
            quantite=10, prix_unitaire_ht=5.0, remise_pct=0.0,
            prix_unitaire_apres_remise=5.0, montant_ht=50.0, taux_tva=2.10,
            montant_brut=50.0, montant_remise=0.0, tranche="A",
        ))
        db.add(AnomalieFactureLabo(
            facture_id=f.id, type_anomalie="remise_ecart", severite="critical",
            description=f"anomalie {num}", montant_ecart=10.0, resolu=False,
        ))
        db.commit()
        return f

    f1 = _mk_facture(u1, lab1, p1, "F-ALPHA-001")
    f2 = _mk_facture(u2, lab2, p2, "F-BETA-001")

    # EMAC
    e1 = EMAC(
        user_id=u1.id, laboratoire_id=lab1.id, pharmacy_id=p1.id,
        reference="E-ALPHA", periode_debut=date(2026, 3, 1),
        periode_fin=date(2026, 3, 31),
    )
    e2 = EMAC(
        user_id=u2.id, laboratoire_id=lab2.id, pharmacy_id=p2.id,
        reference="E-BETA",  periode_debut=date(2026, 3, 1),
        periode_fin=date(2026, 3, 31),
    )
    db.add_all([e1, e2]); db.commit(); db.refresh(e1); db.refresh(e2)

    # Agreement (RFA)
    template = RebateTemplate(
        nom="T-shared", description="template partage", laboratoire_nom="LabAlpha",
        rebate_type=RebateType.RFA, structure={"stages": []}, tiers=[], actif=True,
    )
    db.add(template); db.commit(); db.refresh(template)
    a1 = LaboratoryAgreement(
        pharmacy_id=p1.id, laboratoire_id=lab1.id, template_id=template.id,
        nom="Accord Alpha", agreement_config={}, objectif_ca_annuel=10000,
        date_debut=date(2026, 1, 1), statut=AgreementStatus.ACTIF, version=1,
    )
    a2 = LaboratoryAgreement(
        pharmacy_id=p2.id, laboratoire_id=lab2.id, template_id=template.id,
        nom="Accord Beta",  agreement_config={}, objectif_ca_annuel=20000,
        date_debut=date(2026, 1, 1), statut=AgreementStatus.ACTIF, version=1,
    )
    db.add_all([a1, a2]); db.commit(); db.refresh(a1); db.refresh(a2)

    return {
        "p1": p1, "p2": p2, "u1": u1, "u2": u2,
        "lab1": lab1, "lab2": lab2,
        "gro1": gro1, "gro2": gro2,
        "f1": f1, "f2": f2,
        "e1": e1, "e2": e2,
        "a1": a1, "a2": a2,
    }


# ==================================================================
# Scenario 1 : chaque tenant voit SEULEMENT ses donnees
# ==================================================================

def test_chaque_tenant_voit_ses_propres_donnees(db, world):
    w = world
    repos_alpha = {
        "invoice":   InvoiceLaboRepository(db=db, pharmacy_id=w["p1"].id),
        "emac":      EMACRepository(db=db, pharmacy_id=w["p1"].id),
        "lab":       LaboratoireRepository(db=db, pharmacy_id=w["p1"].id),
        "grossiste": GrossisteRepository(db=db, pharmacy_id=w["p1"].id),
        "rebate":    RebateRepository(db=db, pharmacy_id=w["p1"].id),
    }
    repos_beta = {
        "invoice":   InvoiceLaboRepository(db=db, pharmacy_id=w["p2"].id),
        "emac":      EMACRepository(db=db, pharmacy_id=w["p2"].id),
        "lab":       LaboratoireRepository(db=db, pharmacy_id=w["p2"].id),
        "grossiste": GrossisteRepository(db=db, pharmacy_id=w["p2"].id),
        "rebate":    RebateRepository(db=db, pharmacy_id=w["p2"].id),
    }
    # Chaque repo list() doit retourner 1 element (le sien).
    for name, r in repos_alpha.items():
        if name == "rebate":
            assert len(r.list_agreements()) == 1
            assert r.list_agreements()[0].nom == "Accord Alpha"
        else:
            assert r.count() == 1
    for name, r in repos_beta.items():
        if name == "rebate":
            assert len(r.list_agreements()) == 1
            assert r.list_agreements()[0].nom == "Accord Beta"
        else:
            assert r.count() == 1


# ==================================================================
# Scenario 2 : cross-tenant get/exists retourne None/False
# ==================================================================

def test_cross_tenant_get_retourne_none(db, world):
    w = world
    repo_alpha = InvoiceLaboRepository(db=db, pharmacy_id=w["p1"].id)

    assert repo_alpha.get(w["f2"].id) is None
    assert repo_alpha.exists(w["f2"].id) is False
    assert repo_alpha.get_with_lignes(w["f2"].id) is None
    assert repo_alpha.get_lignes(w["f2"].id) == []
    assert repo_alpha.list_anomalies_non_resolues(w["f2"].id) == []
    assert repo_alpha.delete_anomalies_non_resolues(w["f2"].id) == 0
    with pytest.raises(RepositoryError):
        repo_alpha.get_or_404(w["f2"].id)


def test_cross_tenant_emac_anomalies_invisibles(db, world):
    w = world
    # Ajouter une anomalie a l'EMAC Beta
    from app.models_emac import AnomalieEMAC
    db.add(AnomalieEMAC(
        emac_id=w["e2"].id, type_anomalie="ecart_ca", severite="critical",
        description="invisible", montant_ecart=100.0,
    )); db.commit()

    repo_alpha = EMACRepository(db=db, pharmacy_id=w["p1"].id)
    assert repo_alpha.list_anomalies(w["e2"].id) == []
    # get_anomalie direct sur l'id : None (protection via parent EMAC)
    anomalie = db.query(AnomalieEMAC).first()
    assert repo_alpha.get_anomalie(anomalie.id) is None


def test_cross_tenant_rebate_agreement(db, world):
    w = world
    repo_alpha = RebateRepository(db=db, pharmacy_id=w["p1"].id)
    assert repo_alpha.get_agreement(w["a2"].id) is None
    with pytest.raises(RepositoryError):
        repo_alpha.get_agreement_or_404(w["a2"].id)


# ==================================================================
# Scenario 3 : query() custom ne permet pas d'ouvrir l'acces
# ==================================================================

def test_query_custom_reste_scope(db, world):
    """
    Meme en chainant des filtres custom sur repo.query(), on ne peut pas
    acceder aux factures d'un autre tenant.
    """
    w = world
    repo_alpha = InvoiceLaboRepository(db=db, pharmacy_id=w["p1"].id)

    # Tentative naive : chercher la facture Beta par son numero
    result = repo_alpha.query().filter(
        FactureLabo.numero_facture == w["f2"].numero_facture
    ).all()
    assert result == []

    # Le filtre fonctionne quand meme pour la sienne
    result = repo_alpha.query().filter(
        FactureLabo.numero_facture == w["f1"].numero_facture
    ).all()
    assert len(result) == 1


# ==================================================================
# Scenario 4 : create() bloque l'usurpation de pharmacy_id
# ==================================================================

def test_create_force_pharmacy_id_meme_si_payload_malveillant(db, world):
    w = world
    repo_alpha = InvoiceLaboRepository(db=db, pharmacy_id=w["p1"].id)

    # Caller malveillant : pharmacy_id de Beta dans le payload
    instance = FactureLabo(
        user_id=w["u1"].id,
        pharmacy_id=w["p2"].id,              # <- tentative d'usurpation
        laboratoire_id=w["lab1"].id,
        numero_facture="F-ATTAQUE",
        date_facture=date(2026, 6, 1),
        montant_brut_ht=500.0, montant_net_ht=400.0, total_remise_facture=100.0,
    )
    created = repo_alpha.create(instance)
    db.commit(); db.refresh(created)
    assert created.pharmacy_id == w["p1"].id   # Le repo a ecrase la valeur


# ==================================================================
# Scenario 5 : delete() refuse les id cross-tenant
# ==================================================================

def test_delete_cross_tenant_ne_supprime_rien(db, world):
    w = world
    repo_alpha = InvoiceLaboRepository(db=db, pharmacy_id=w["p1"].id)
    assert repo_alpha.delete(w["f2"].id) is False
    # La facture Beta existe toujours
    assert db.query(FactureLabo).filter(FactureLabo.id == w["f2"].id).first() is not None


# ==================================================================
# Scenario 6 : exhaustif par table — aucun compte cross-leak
# ==================================================================

@pytest.mark.parametrize("RepoClass,obj_key", [
    (InvoiceLaboRepository, "f2"),
    (EMACRepository, "e2"),
    (LaboratoireRepository, "lab2"),
    (GrossisteRepository, "gro2"),
])
def test_exhaustif_aucun_repo_ne_voit_les_donnees_beta_depuis_alpha(
    db, world, RepoClass, obj_key,
):
    """Meta-test : aucune methode standard ne leak cross-tenant."""
    w = world
    repo_alpha = RepoClass(db=db, pharmacy_id=w["p1"].id)
    target_id = w[obj_key].id

    # Methodes heritees de BaseRepository
    assert repo_alpha.count() == 1
    assert repo_alpha.get(target_id) is None
    assert repo_alpha.exists(target_id) is False
    assert target_id not in [x.id for x in repo_alpha.list()]
    assert repo_alpha.delete(target_id) is False
    with pytest.raises(RepositoryError):
        repo_alpha.get_or_404(target_id)
