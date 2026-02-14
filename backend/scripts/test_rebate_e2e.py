"""
PharmaVerif — Script de validation E2E du Rebate Engine
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Usage :
    cd backend
    python -m scripts.test_rebate_e2e

Ce script :
  1. Cree une DB SQLite en memoire
  2. Cree un template Biogaran + accord avec les vrais taux
  3. Simule une facture avec 3 types de lignes (tranche A, B, OTC)
  4. Appelle le moteur de calcul
  5. Verifie les montants ligne par ligne
  6. Affiche OK ou ERREUR avec details

Taux Biogaran valides :
  Tranche A (remise <= 2.5%) : immediat 10%, M+1 +10%, M+2 +5%, prime +2.5% = 27.5%
  Tranche B (remise > 2.5%)  : immediat 14%, M+1 +18%, M+2 +23%, prime +2%  = 57%
  OTC (TVA != 2.10%)         : exclu

Facture de test (10 850 EUR brut) :
  - 3 lignes Tranche A (remise 2.0%, 1.5%, 1.1%) : 800 + 1000 + 600 = 2400 EUR
  - 2 lignes Tranche B : 3000 + 4600 = 7600 EUR
  - 1 ligne OTC        : 850 EUR → EXCLUE

Calcul attendu par etape :
  immediate : A(2400*10%=240) + B(7600*14%=1064)    = 1304.00 EUR
  m1_rebate : A(2400*10%=240) + B(7600*18%=1368)    = 1608.00 EUR
  m2_rebate : A(2400*5%=120)  + B(7600*23%=1748)    = 1868.00 EUR
  annual    : A(2400*2.5%=60) + B(7600*2%=152)      = 212.00 EUR (conditionnel)
  -------------------------------------------------------------------
  TOTAL RFA = 1304 + 1608 + 1868 + 212 = 4992.00 EUR
  Eligible  = 10000 EUR (2400 + 7600)
  RFA %     = 4992 / 10000 = 49.92%
"""

import sys
import os
from datetime import date
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP

# Configurer le PYTHONPATH
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Configurer les variables d'environnement
os.environ["DATABASE_URL"] = "sqlite:///e2e_test.db"
os.environ["JWT_SECRET_KEY"] = "e2e-test-secret-key"
os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "true"


# ============================================================================
# VALEURS ATTENDUES (calculees manuellement)
# ============================================================================

EXPECTED = {
    "otc_excluded": 850.0,
    "tranche_A_amount": 2400.0,
    "tranche_B_amount": 7600.0,
    "eligible_amount": 10000.0,
    # Etape 1 : immediate
    "stage_1_A": 240.0,     # 2400 * 10%
    "stage_1_B": 1064.0,    # 7600 * 14%
    "stage_1_total": 1304.0,
    # Etape 2 : m1_rebate
    "stage_2_A": 240.0,     # 2400 * 10%
    "stage_2_B": 1368.0,    # 7600 * 18%
    "stage_2_total": 1608.0,
    # Etape 3 : m2_rebate
    "stage_3_A": 120.0,     # 2400 * 5%
    "stage_3_B": 1748.0,    # 7600 * 23%
    "stage_3_total": 1868.0,
    # Etape 4 : annual_bonus (conditionnel)
    "stage_4_A": 60.0,      # 2400 * 2.5%
    "stage_4_B": 152.0,     # 7600 * 2%
    "stage_4_total": 212.0,
    # Totaux
    "total_rfa": 4992.0,    # 1304 + 1608 + 1868 + 212
    "total_rfa_pct": 0.4992, # 4992 / 10000
}

# Lignes de facture simulees
# NB: le moteur normalise remise_pourcentage > 1 en ratio (/100)
#     Donc 2.0 → 0.02, 1.5 → 0.015, 1.1 → 0.011 → tous <= 0.025 → tranche A
#     Et 5.0 → 0.05, 8.0 → 0.08 → tous > 0.025 → tranche B
#     La valeur 0.5 (<=1) serait interpretee comme ratio 0.5 (50%) → tranche B !
INVOICE_LINES = [
    # Tranche A (remise <= 2.5%, TVA 2.10%)
    {"remise_pourcentage": 2.0, "taux_tva": 2.10, "montant_ht": 800.0},
    {"remise_pourcentage": 1.5, "taux_tva": 2.10, "montant_ht": 1000.0},
    {"remise_pourcentage": 1.1, "taux_tva": 2.10, "montant_ht": 600.0},
    # Tranche B (remise > 2.5%, TVA 2.10%)
    {"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 3000.0},
    {"remise_pourcentage": 8.0, "taux_tva": 2.10, "montant_ht": 4600.0},
    # OTC (TVA != 2.10%)
    {"remise_pourcentage": 0.0, "taux_tva": 20.0, "montant_ht": 850.0},
]


def create_test_db():
    """Cree la DB en memoire avec tous les modeles"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.database import Base
    from app.models import User, Grossiste, Facture, LigneFacture, Anomalie, VerificationLog, Session as SessionModel, Pharmacy
    from app.models_labo import Laboratoire, AccordCommercial, FactureLabo, LigneFactureLabo, PalierRFA, AnomalieFactureLabo, HistoriquePrix
    from app.models_emac import EMAC, AnomalieEMAC
    from app.models_rebate import RebateTemplate, LaboratoryAgreement, InvoiceRebateSchedule, AgreementAuditLog

    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def seed_data(db):
    """Cree les donnees de test : pharmacie, labo, template, accord"""
    from app.models import Pharmacy
    from app.models_labo import Laboratoire, FactureLabo
    from app.models_rebate import RebateTemplate, LaboratoryAgreement, AgreementStatus, RebateType

    # Pharmacie
    pharmacy = Pharmacy(nom="Pharmacie E2E", adresse="1 rue E2E")
    db.add(pharmacy)
    db.flush()

    # Laboratoire
    lab = Laboratoire(
        nom="Biogaran",
        type="generique",
        actif=True,
        pharmacy_id=pharmacy.id,
    )
    db.add(lab)
    db.flush()

    # Template Biogaran (4 etapes echelonnees)
    template = RebateTemplate(
        nom="Biogaran Staged 2026",
        description="Biogaran 4-etapes echelonnees",
        laboratoire_nom="Biogaran",
        rebate_type=RebateType.RFA,
        structure={
            "type": "staged_rebate",
            "description": "Biogaran remises echelonnees",
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
                    "label": "Remise M+1 (avoir)",
                    "delay_months": 1,
                    "rate_type": "incremental_percentage",
                    "is_cumulative": True,
                    "payment_method": "emac_transfer",
                    "fields": ["incremental_rate", "cumulative_rate"],
                    "order": 2,
                },
                {
                    "stage_id": "m2_rebate",
                    "label": "Remise M+2 (EMAC)",
                    "delay_months": 2,
                    "rate_type": "incremental_percentage",
                    "is_cumulative": True,
                    "payment_method": "emac_transfer",
                    "fields": ["incremental_rate", "cumulative_rate"],
                    "order": 3,
                },
                {
                    "stage_id": "annual_bonus",
                    "label": "Prime fin d'annee",
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
    db.flush()

    # Accord avec les vrais taux Biogaran
    agreement = LaboratoryAgreement(
        pharmacy_id=pharmacy.id,
        laboratoire_id=lab.id,
        template_id=template.id,
        nom="Accord Biogaran 2026",
        agreement_config={
            "template_id": str(template.id),
            "tranche_configurations": {
                "tranche_A": {
                    "max_rebate": 0.275,
                    "classification_criteria": {
                        "tva_rate": 2.10,
                        "description": "Generiques TVA 2.10%",
                    },
                    "stages": {
                        "immediate":    {"rate": 0.10, "cumulative_rate": 0.10},
                        "m1_rebate":    {"incremental_rate": 0.10, "cumulative_rate": 0.20},
                        "m2_rebate":    {"incremental_rate": 0.05, "cumulative_rate": 0.25},
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
                        "immediate":    {"rate": 0.14, "cumulative_rate": 0.14},
                        "m1_rebate":    {"incremental_rate": 0.18, "cumulative_rate": 0.32},
                        "m2_rebate":    {"incremental_rate": 0.23, "cumulative_rate": 0.55},
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
    db.flush()

    # Facture de test
    facture = FactureLabo(
        user_id=1,
        pharmacy_id=pharmacy.id,
        laboratoire_id=lab.id,
        numero_facture="BIO-E2E-2026-001",
        date_facture=date(2026, 3, 15),
        montant_brut_ht=10850.0,
        total_remise_facture=0,
        montant_net_ht=10850.0,
        nb_lignes=6,
        nb_pages=1,
        statut="analysee",
    )
    db.add(facture)
    db.commit()

    return {
        "pharmacy": pharmacy,
        "lab": lab,
        "template": template,
        "agreement": agreement,
        "facture": facture,
    }


def check(label, actual, expected, tolerance=0.01):
    """Verifie une valeur avec tolerance"""
    ok = abs(actual - expected) < tolerance
    status = "OK" if ok else "ERREUR"
    symbol = "\u2705" if ok else "\u274c"
    print(f"  {symbol} {label}: {actual:.2f} (attendu: {expected:.2f}) [{status}]")
    return ok


def main():
    print("=" * 70)
    print("PharmaVerif — Validation E2E du Rebate Engine")
    print("=" * 70)
    print()

    # 1. Creer la DB
    print("[1/5] Creation de la base de donnees en memoire...")
    db = create_test_db()
    print("  \u2705 DB cree")

    # 2. Seed les donnees
    print("[2/5] Seed des donnees (pharmacie, labo, template, accord, facture)...")
    data = seed_data(db)
    print(f"  \u2705 Pharmacie: {data['pharmacy'].nom}")
    print(f"  \u2705 Laboratoire: {data['lab'].nom}")
    print(f"  \u2705 Template: {data['template'].nom}")
    print(f"  \u2705 Accord: {data['agreement'].nom} (v{data['agreement'].version})")
    print(f"  \u2705 Facture: {data['facture'].numero_facture}")

    # 3. Classification des lignes
    print("\n[3/5] Classification des lignes...")
    from app.services.rebate_engine import RebateEngine
    engine = RebateEngine(db)

    classification = engine._filter_and_classify_lines(
        invoice_lines=INVOICE_LINES,
        agreement_config=data["agreement"].agreement_config,
    )

    all_ok = True
    all_ok &= check("OTC exclu", classification["otc_amount"], EXPECTED["otc_excluded"])
    all_ok &= check("Eligible total", classification["eligible_amount"], EXPECTED["eligible_amount"])
    all_ok &= check("Tranche A", classification["tranches"].get("tranche_A", {}).get("amount", 0), EXPECTED["tranche_A_amount"])
    all_ok &= check("Tranche B", classification["tranches"].get("tranche_B", {}).get("amount", 0), EXPECTED["tranche_B_amount"])

    # 4. Calcul du schedule complet
    print("\n[4/5] Calcul du calendrier de remises...")
    schedule = engine.calculate_rebate_schedule(
        invoice_id=data["facture"].id,
        invoice_amount=10850.0,
        invoice_date=date(2026, 3, 15),
        pharmacy_id=data["pharmacy"].id,
        laboratoire_id=data["lab"].id,
        invoice_lines=INVOICE_LINES,
    )

    entries = schedule.rebate_entries.get("entries", []) if schedule.rebate_entries else []
    print(f"  Nombre d'etapes: {len(entries)}")

    if len(entries) >= 4:
        print()
        print("  --- Etape 1: Remise sur facture (immediate) ---")
        all_ok &= check("  A immediate", entries[0]["tranche_A_amount"], EXPECTED["stage_1_A"])
        all_ok &= check("  B immediate", entries[0]["tranche_B_amount"], EXPECTED["stage_1_B"])
        all_ok &= check("  Total immediate", entries[0]["total_amount"], EXPECTED["stage_1_total"])

        print("  --- Etape 2: Remise M+1 ---")
        all_ok &= check("  A M+1", entries[1]["tranche_A_amount"], EXPECTED["stage_2_A"])
        all_ok &= check("  B M+1", entries[1]["tranche_B_amount"], EXPECTED["stage_2_B"])
        all_ok &= check("  Total M+1", entries[1]["total_amount"], EXPECTED["stage_2_total"])

        print("  --- Etape 3: Remise M+2 ---")
        all_ok &= check("  A M+2", entries[2]["tranche_A_amount"], EXPECTED["stage_3_A"])
        all_ok &= check("  B M+2", entries[2]["tranche_B_amount"], EXPECTED["stage_3_B"])
        all_ok &= check("  Total M+2", entries[2]["total_amount"], EXPECTED["stage_3_total"])

        print("  --- Etape 4: Prime annuelle (conditionnelle) ---")
        all_ok &= check("  A prime", entries[3]["tranche_A_amount"], EXPECTED["stage_4_A"])
        all_ok &= check("  B prime", entries[3]["tranche_B_amount"], EXPECTED["stage_4_B"])
        all_ok &= check("  Total prime", entries[3]["total_amount"], EXPECTED["stage_4_total"])
    else:
        print(f"  \u274c ERREUR: Attendu 4 etapes, obtenu {len(entries)}")
        all_ok = False

    # 5. Totaux
    print("\n[5/5] Verification des totaux...")
    all_ok &= check("RFA totale", schedule.total_rfa_expected, EXPECTED["total_rfa"])
    all_ok &= check("RFA %", schedule.total_rfa_percentage, EXPECTED["total_rfa_pct"])

    # Verification que l'OTC est bien dans le breakdown
    breakdown = schedule.tranche_breakdown or {}
    if "tranche_A" in breakdown and "tranche_B" in breakdown:
        print(f"  \u2705 Ventilation par tranche: A={breakdown['tranche_A']}, B={breakdown['tranche_B']}")
    else:
        print(f"  \u26a0\ufe0f Breakdown partiel: {breakdown}")

    # Verif CA cumule de l'accord
    db.refresh(data["agreement"])
    print(f"  CA cumule accord: {data['agreement'].ca_cumule:.2f}EUR")
    print(f"  Remise cumulee accord: {data['agreement'].remise_cumulee:.2f}EUR")

    # Resume
    print()
    print("=" * 70)
    if all_ok:
        print("\u2705 TOUS LES TESTS E2E SONT OK")
        print("Le Rebate Engine calcule correctement les remises echelonnees")
        print("avec ventilation par tranche A/B et exclusion OTC.")
    else:
        print("\u274c DES ERREURS ONT ETE DETECTEES")
        print("Verifier les calculs ci-dessus.")
    print("=" * 70)

    db.close()
    return 0 if all_ok else 1


if __name__ == "__main__":
    exit(main())
