"""
PharmaVerif — Configuration pytest
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fixtures partagees pour les tests unitaires.
Utilise une DB SQLite en memoire pour l'isolation.

Strategie : chaque test recoit un engine + session propre (in-memory).
SQLite in-memory est detruit quand la connexion se ferme → isolation totale.
"""

import pytest
import sys
import os
from datetime import date
from pathlib import Path

# Ajouter le repertoire backend au PYTHONPATH
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Configurer les variables d'environnement AVANT tout import
os.environ.setdefault("DATABASE_URL", "sqlite:///test_pharmaverif.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("DEBUG", "true")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base


def _import_all_models():
    """Importer tous les modeles pour que Base.metadata connaisse toutes les tables"""
    from app.models import User, Grossiste, Facture, LigneFacture, Anomalie, VerificationLog, Session as SessionModel, Pharmacy  # noqa: F401
    from app.models_labo import Laboratoire, AccordCommercial, FactureLabo, LigneFactureLabo, PalierRFA, AnomalieFactureLabo, HistoriquePrix  # noqa: F401
    from app.models_emac import EMAC, AnomalieEMAC  # noqa: F401
    from app.models_rebate import RebateTemplate, LaboratoryAgreement, InvoiceRebateSchedule, AgreementAuditLog  # noqa: F401


# Importer une seule fois au chargement du module
_import_all_models()


@pytest.fixture(scope="function")
def db():
    """
    Session DB isolee par test.

    Chaque test obtient un engine SQLite in-memory NEUF avec toutes les
    tables creees. A la fin du test, le engine est dispose et la DB disparait.
    → Isolation totale entre tests, pas de probleme de UNIQUE constraints.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        echo=False,
    )
    Base.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def pharmacy(db):
    """Cree une pharmacie de test"""
    from app.models import Pharmacy
    p = Pharmacy(
        nom="Pharmacie Test",
        adresse="1 rue du Test",
        siret="12345678901234",
        titulaire="Dr Test",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@pytest.fixture
def laboratoire(db, pharmacy):
    """Cree un laboratoire de test"""
    from app.models_labo import Laboratoire
    lab = Laboratoire(
        nom="Biogaran Test",
        type="generique",
        actif=True,
        pharmacy_id=pharmacy.id,
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return lab


@pytest.fixture
def biogaran_template(db):
    """Cree un template Biogaran de test"""
    from app.models_rebate import RebateTemplate, RebateType

    template = RebateTemplate(
        nom="Template Biogaran Test",
        description="Template de test Biogaran",
        laboratoire_nom="Biogaran",
        rebate_type=RebateType.RFA,
        structure={
            "type": "staged_rebate",
            "description": "Biogaran staged rebate test",
            "stages": [
                {
                    "stage_id": "immediate",
                    "label": "Remise sur facture",
                    "delay_months": 0,
                    "rate_type": "percentage",
                    "is_cumulative": True,
                    "payment_method": "invoice_deduction",
                    "fields": ["rate"],
                    "order": 1,
                },
                {
                    "stage_id": "m1_rebate",
                    "label": "Remise M+1",
                    "delay_months": 1,
                    "rate_type": "incremental_percentage",
                    "is_cumulative": True,
                    "payment_method": "emac_transfer",
                    "fields": ["incremental_rate", "cumulative_rate"],
                    "order": 2,
                },
                {
                    "stage_id": "m2_rebate",
                    "label": "Remise M+2",
                    "delay_months": 2,
                    "rate_type": "incremental_percentage",
                    "is_cumulative": True,
                    "payment_method": "emac_transfer",
                    "fields": ["incremental_rate", "cumulative_rate"],
                    "order": 3,
                },
                {
                    "stage_id": "annual_bonus",
                    "label": "Prime annuelle",
                    "delay_months": 12,
                    "rate_type": "conditional_percentage",
                    "is_cumulative": True,
                    "payment_method": "year_end_transfer",
                    "fields": ["incremental_rate", "cumulative_rate"],
                    "conditions": [
                        {
                            "type": "annual_volume",
                            "operator": ">=",
                            "threshold_field": "total_purchases",
                            "unit": "euros",
                        }
                    ],
                    "order": 4,
                },
            ],
            "tranches": ["A", "B"],
            "supports_otc": False,
        },
        tiers=[],
        taux_escompte=0.0,
        delai_escompte_jours=30,
        taux_cooperation=0.0,
        actif=True,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@pytest.fixture
def biogaran_agreement(db, pharmacy, laboratoire, biogaran_template):
    """Cree un accord Biogaran actif de test avec les vrais taux"""
    from app.models_rebate import LaboratoryAgreement, AgreementStatus

    agreement = LaboratoryAgreement(
        pharmacy_id=pharmacy.id,
        laboratoire_id=laboratoire.id,
        template_id=biogaran_template.id,
        nom="Accord Biogaran Test 2026",
        agreement_config={
            "template_id": str(biogaran_template.id),
            "tranche_configurations": {
                "tranche_A": {
                    "max_rebate": 0.275,
                    "classification_criteria": {
                        "tva_rate": 2.10,
                        "description": "Generiques TVA 2.10%",
                    },
                    "stages": {
                        "immediate": {"rate": 0.10, "cumulative_rate": 0.10},
                        "m1_rebate": {"incremental_rate": 0.10, "cumulative_rate": 0.20},
                        "m2_rebate": {"incremental_rate": 0.05, "cumulative_rate": 0.25},
                        "annual_bonus": {"incremental_rate": 0.025, "cumulative_rate": 0.275, "condition_threshold": 50000},
                    },
                },
                "tranche_B": {
                    "max_rebate": 0.57,
                    "classification_criteria": {
                        "tva_rate_ne": 2.10,
                        "description": "Non-generiques",
                    },
                    "stages": {
                        "immediate": {"rate": 0.14, "cumulative_rate": 0.14},
                        "m1_rebate": {"incremental_rate": 0.18, "cumulative_rate": 0.32},
                        "m2_rebate": {"incremental_rate": 0.23, "cumulative_rate": 0.55},
                        "annual_bonus": {"incremental_rate": 0.02, "cumulative_rate": 0.57, "condition_threshold": 50000},
                    },
                },
            },
        },
        objectif_ca_annuel=50000,
        date_debut=date(2026, 1, 1),
        date_fin=date(2026, 12, 31),
        statut=AgreementStatus.ACTIF,
        version=1,
    )
    db.add(agreement)
    db.commit()
    db.refresh(agreement)
    return agreement
