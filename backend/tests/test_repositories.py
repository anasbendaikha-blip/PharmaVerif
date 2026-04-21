"""
Tests des repositories — garantie d'isolation multi-tenant.

Chaque test cree DEUX pharmacies et verifie qu'un repository scope sur
pharmacy_1 ne peut en aucune maniere acceder aux donnees de pharmacy_2.
"""

from datetime import date
from decimal import Decimal

import pytest

from app.infrastructure.repositories.base import RepositoryError
from app.infrastructure.repositories.emac_repo import EMACRepository
from app.infrastructure.repositories.invoice_repo import InvoiceLaboRepository
from app.infrastructure.repositories.rebate_repo import RebateRepository
from app.models import Pharmacy, User
from app.models_emac import EMAC, AnomalieEMAC
from app.models_labo import FactureLabo, Laboratoire
from app.models_rebate import AgreementStatus, LaboratoryAgreement, RebateTemplate, RebateType


# ------------------------------------------------------------------
# Fixtures : 2 pharmacies + 2 users + 2 labos
# ------------------------------------------------------------------

@pytest.fixture
def two_tenants(db):
    """Cree deux pharmacies isolees avec leurs propres user + labo."""
    p1 = Pharmacy(nom="Pharma Un", siret="11111111111111", titulaire="A")
    p2 = Pharmacy(nom="Pharma Deux", siret="22222222222222", titulaire="B")
    db.add_all([p1, p2]); db.commit(); db.refresh(p1); db.refresh(p2)

    u1 = User(email="u1@ex.com", hashed_password="x", nom="U1", prenom="X", pharmacy_id=p1.id)
    u2 = User(email="u2@ex.com", hashed_password="x", nom="U2", prenom="Y", pharmacy_id=p2.id)
    db.add_all([u1, u2]); db.commit(); db.refresh(u1); db.refresh(u2)

    lab1 = Laboratoire(nom="LabUn", type="generique", actif=True, pharmacy_id=p1.id)
    lab2 = Laboratoire(nom="LabDeux", type="generique", actif=True, pharmacy_id=p2.id)
    db.add_all([lab1, lab2]); db.commit(); db.refresh(lab1); db.refresh(lab2)

    return {"p1": p1, "p2": p2, "u1": u1, "u2": u2, "lab1": lab1, "lab2": lab2}


def _make_facture(db, *, user, lab, pharm, numero="F-X") -> FactureLabo:
    f = FactureLabo(
        user_id=user.id, pharmacy_id=pharm.id, laboratoire_id=lab.id,
        numero_facture=numero, date_facture=date(2026, 6, 1),
        montant_brut_ht=500.0, montant_net_ht=400.0, total_remise_facture=100.0,
    )
    db.add(f); db.commit(); db.refresh(f)
    return f


# ==================================================================
# BaseRepository — isolation forcee
# ==================================================================

def test_base_repo_exige_pharmacy_id_non_none(db):
    """Un repository construit sans pharmacy_id leve ValueError."""
    with pytest.raises(ValueError, match="pharmacy_id"):
        InvoiceLaboRepository(db=db, pharmacy_id=None)


def test_base_repo_filtre_pharmacy_id(db, two_tenants):
    """repo(p1) ne voit PAS les factures de p2."""
    t = two_tenants
    _make_facture(db, user=t["u1"], lab=t["lab1"], pharm=t["p1"], numero="F-p1-001")
    f_p2 = _make_facture(db, user=t["u2"], lab=t["lab2"], pharm=t["p2"], numero="F-p2-001")

    repo_p1 = InvoiceLaboRepository(db=db, pharmacy_id=t["p1"].id)

    # list() : 1 seule facture visible (celle de p1)
    assert len(repo_p1.list()) == 1
    assert repo_p1.list()[0].numero_facture == "F-p1-001"
    # count() : 1
    assert repo_p1.count() == 1
    # get() sur l'id p2 renvoie None (invisible, pas d'erreur SQL)
    assert repo_p1.get(f_p2.id) is None
    # exists() sur id p2 renvoie False
    assert repo_p1.exists(f_p2.id) is False


def test_base_repo_get_or_404_cross_tenant_leve(db, two_tenants):
    """Tenter get_or_404 sur un id d'une autre pharmacy → RepositoryError."""
    t = two_tenants
    f_p2 = _make_facture(db, user=t["u2"], lab=t["lab2"], pharm=t["p2"], numero="F-p2-001")
    repo_p1 = InvoiceLaboRepository(db=db, pharmacy_id=t["p1"].id)
    with pytest.raises(RepositoryError):
        repo_p1.get_or_404(f_p2.id)


def test_base_repo_create_force_pharmacy_id(db, two_tenants):
    """create() ecrase le pharmacy_id fourni par le caller (anti-usurpation)."""
    t = two_tenants
    repo_p1 = InvoiceLaboRepository(db=db, pharmacy_id=t["p1"].id)

    # Caller malicieux : tente de creer une facture avec pharmacy_id=p2
    instance = FactureLabo(
        user_id=t["u1"].id,
        pharmacy_id=t["p2"].id,                # tentative d'usurpation
        laboratoire_id=t["lab1"].id,
        numero_facture="F-ATTAQUE",
        date_facture=date(2026, 6, 1),
        montant_brut_ht=500.0, montant_net_ht=400.0, total_remise_facture=100.0,
    )
    created = repo_p1.create(instance)
    db.commit(); db.refresh(created)

    # Le pharmacy_id a ete reecrit sur celui du repo (p1).
    assert created.pharmacy_id == t["p1"].id


def test_base_repo_delete_scope(db, two_tenants):
    """delete() retourne False si l'id appartient a une autre pharmacy."""
    t = two_tenants
    f_p2 = _make_facture(db, user=t["u2"], lab=t["lab2"], pharm=t["p2"], numero="F-p2-del")
    repo_p1 = InvoiceLaboRepository(db=db, pharmacy_id=t["p1"].id)

    assert repo_p1.delete(f_p2.id) is False
    # La facture p2 existe toujours
    assert db.query(FactureLabo).filter(FactureLabo.id == f_p2.id).first() is not None


# ==================================================================
# InvoiceLaboRepository — eager loading
# ==================================================================

def test_invoice_repo_get_with_lignes_eager(db, two_tenants):
    """get_with_lignes retourne la facture et ses lignes chargees."""
    from app.models_labo import LigneFactureLabo
    t = two_tenants
    facture = _make_facture(db, user=t["u1"], lab=t["lab1"], pharm=t["p1"], numero="F-EAGER")
    db.add(LigneFactureLabo(
        facture_id=facture.id, cip13="3400900000001", designation="DOLIPRANE",
        quantite=10, prix_unitaire_ht=5.0, remise_pct=0.0,
        prix_unitaire_apres_remise=5.0, montant_ht=50.0, taux_tva=2.10,
        montant_brut=50.0, montant_remise=0.0, tranche="A",
    ))
    db.commit()

    repo_p1 = InvoiceLaboRepository(db=db, pharmacy_id=t["p1"].id)
    f = repo_p1.get_with_lignes(facture.id)
    assert f is not None
    assert len(f.lignes) == 1
    assert f.lignes[0].cip13 == "3400900000001"


def test_invoice_repo_lignes_cross_tenant_vides(db, two_tenants):
    """get_lignes retourne [] si la facture n'appartient pas au tenant."""
    t = two_tenants
    f_p2 = _make_facture(db, user=t["u2"], lab=t["lab2"], pharm=t["p2"], numero="F-p2-lig")
    repo_p1 = InvoiceLaboRepository(db=db, pharmacy_id=t["p1"].id)
    assert repo_p1.get_lignes(f_p2.id) == []


# ==================================================================
# RebateRepository — agreements filtres, templates partages
# ==================================================================

def test_rebate_repo_agreements_filtres(db, two_tenants):
    t = two_tenants
    template = RebateTemplate(
        nom="T", description="d", laboratoire_nom="LabUn",
        rebate_type=RebateType.RFA, structure={"stages": []},
        tiers=[], actif=True,
    )
    db.add(template); db.commit(); db.refresh(template)

    a1 = LaboratoryAgreement(
        pharmacy_id=t["p1"].id, laboratoire_id=t["lab1"].id,
        template_id=template.id, nom="Accord p1",
        agreement_config={}, objectif_ca_annuel=10000,
        date_debut=date(2026, 1, 1), statut=AgreementStatus.ACTIF, version=1,
    )
    a2 = LaboratoryAgreement(
        pharmacy_id=t["p2"].id, laboratoire_id=t["lab2"].id,
        template_id=template.id, nom="Accord p2",
        agreement_config={}, objectif_ca_annuel=20000,
        date_debut=date(2026, 1, 1), statut=AgreementStatus.ACTIF, version=1,
    )
    db.add_all([a1, a2]); db.commit(); db.refresh(a1); db.refresh(a2)

    repo_p1 = RebateRepository(db=db, pharmacy_id=t["p1"].id)
    agreements = repo_p1.list_agreements()
    assert len(agreements) == 1
    assert agreements[0].nom == "Accord p1"
    # Acces cross-tenant silencieusement invisible
    assert repo_p1.get_agreement(a2.id) is None
    with pytest.raises(RepositoryError):
        repo_p1.get_agreement_or_404(a2.id)


def test_rebate_repo_templates_partages(db, two_tenants):
    """
    Templates sans pharmacy_id : les deux tenants y accedent. Ce n'est
    PAS une faille multi-tenant (templates catalogues). Documente MT-002.
    """
    t = two_tenants
    db.add(RebateTemplate(
        nom="Template partage", description="", laboratoire_nom="Biogaran",
        rebate_type=RebateType.RFA, structure={}, tiers=[], actif=True,
    ))
    db.commit()

    repo_p1 = RebateRepository(db=db, pharmacy_id=t["p1"].id)
    repo_p2 = RebateRepository(db=db, pharmacy_id=t["p2"].id)
    assert len(repo_p1.list_templates()) == 1
    assert len(repo_p2.list_templates()) == 1


# ==================================================================
# EMACRepository
# ==================================================================

def test_emac_repo_scope_par_pharmacy(db, two_tenants):
    """Un EMAC de p2 est invisible depuis repo(p1)."""
    t = two_tenants
    e1 = EMAC(
        user_id=t["u1"].id, laboratoire_id=t["lab1"].id, pharmacy_id=t["p1"].id,
        reference="E-p1", periode_debut=date(2026, 3, 1), periode_fin=date(2026, 3, 31),
    )
    e2 = EMAC(
        user_id=t["u2"].id, laboratoire_id=t["lab2"].id, pharmacy_id=t["p2"].id,
        reference="E-p2", periode_debut=date(2026, 3, 1), periode_fin=date(2026, 3, 31),
    )
    db.add_all([e1, e2]); db.commit(); db.refresh(e1); db.refresh(e2)

    repo_p1 = EMACRepository(db=db, pharmacy_id=t["p1"].id)
    assert repo_p1.count() == 1
    assert repo_p1.get(e2.id) is None


def test_emac_repo_anomalies_protegees_par_parent(db, two_tenants):
    """
    AnomalieEMAC n'a pas de pharmacy_id, mais l'acces est controle via
    l'EMAC parent : list_anomalies retourne [] si l'EMAC est d'un autre tenant.
    """
    t = two_tenants
    e2 = EMAC(
        user_id=t["u2"].id, laboratoire_id=t["lab2"].id, pharmacy_id=t["p2"].id,
        reference="E-p2", periode_debut=date(2026, 3, 1), periode_fin=date(2026, 3, 31),
    )
    db.add(e2); db.commit(); db.refresh(e2)
    db.add(AnomalieEMAC(
        emac_id=e2.id, type_anomalie="ecart_ca", severite="critical",
        description="test", montant_ecart=100.0,
    )); db.commit()

    repo_p1 = EMACRepository(db=db, pharmacy_id=t["p1"].id)
    assert repo_p1.list_anomalies(e2.id) == []
    # get_anomalie sur l'id direct : None meme si l'anomalie existe en DB
    anomalie = db.query(AnomalieEMAC).first()
    assert repo_p1.get_anomalie(anomalie.id) is None
