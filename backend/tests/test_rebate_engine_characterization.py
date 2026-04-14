"""
Tests de CARACTERISATION pour RebateEngine.

Objectif : documenter le comportement ACTUEL du moteur RFA avant refactoring,
y compris ses bugs connus. Ces tests servent de filet de securite — ils passent
*tels quels* meme quand le code est (peut-etre) faux vs specification.

---

SPECIFICATION CORRECTE (validee avec Mustafa, pharmacien partenaire) :
  - Tranche A = remise HAUTE  (> 2.5%) = 55% RFA total
  - Tranche B = remise BASSE  (<= 2.5%) = 25% RFA total
  - OTC      = TVA != 2.10%             = 57% deja integre dans la facture

COMPORTEMENT ACTUEL DU CODE (verification_engine.py + biogaran_template fixture) :
  - "tranche_A" dans le code = remise BASSE (<= 2.5%) = 27.5% RFA
  - "tranche_B" dans le code = remise HAUTE (>  2.5%) = 57.0% RFA
  - OTC                     = TVA != 2.10%         (exclu du calcul)

=> BUG CONNU #1 : LABELS A/B INVERSES vs spec.
   Dans la suite on documente les sorties du code telles quelles. Les noms
   "tranche_A" / "tranche_B" font reference AUX LABELS DU CODE, pas a la spec.

=> BUG CONNU #2 : TAUX LEGEREMENT DIFFERENTS de la spec.
   Fixture : tranche_A cumul 27.5% (spec B: 25%),
             tranche_B cumul 57.0% (spec A: 55%).
   Ces valeurs sont dans biogaran_agreement fixture (conftest.py).
"""

from datetime import date
import pytest

from app.models_labo import FactureLabo
from app.services.rebate_engine import RebateEngine


# ============================================================
# CLASSIFICATION PAR TVA (OTC vs eligible)
# ============================================================

def test_classification_generique_tva_210_est_eligible(db, biogaran_agreement):
    """
    Ligne avec TVA 2.10% → classee eligible RFA (tranche_A ou tranche_B).
    Jamais en OTC. (Spec : generique remboursable.)
    """
    engine = RebateEngine(db)
    lines = [{"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 1000.0}]

    result = engine._filter_and_classify_lines(
        invoice_lines=lines,
        agreement_config=biogaran_agreement.agreement_config,
    )

    assert result["otc_amount"] == 0.0
    assert result["eligible_amount"] == 1000.0
    # remise 5% > 2.5% → classe "tranche_B" dans le code
    assert "tranche_B" in result["tranches"]
    assert result["tranches"]["tranche_B"]["amount"] == 1000.0


def test_classification_otc_tva_non_210_exclu(db, biogaran_agreement):
    """
    Toute ligne avec TVA != 2.10% → OTC (exclu du calcul RFA).
    On teste TVA 5.5%, 10%, 20% — toutes exclues.
    """
    engine = RebateEngine(db)
    lines = [
        {"remise_pourcentage": 0.0, "taux_tva": 5.50, "montant_ht": 100.0},
        {"remise_pourcentage": 0.0, "taux_tva": 10.00, "montant_ht": 200.0},
        {"remise_pourcentage": 0.0, "taux_tva": 20.00, "montant_ht": 300.0},
    ]

    result = engine._filter_and_classify_lines(
        invoice_lines=lines,
        agreement_config=biogaran_agreement.agreement_config,
    )

    assert result["otc_amount"] == 600.0
    assert result["eligible_amount"] == 0.0
    assert result["tranches"] == {}  # aucune tranche eligible


# ============================================================
# CLASSIFICATION A / B — DOCUMENTE L'INVERSION
# ============================================================

def test_classification_code_tranche_a_remise_basse(db, biogaran_agreement):
    """
    BUG CONNU (labels inverses vs spec) :
    Dans le CODE, "tranche_A" = remise BASSE (<= 2.5%).
    Dans la SPEC, tranche A = remise HAUTE (> 2.5%).

    Ici on capture le comportement du code : remise 2.0% → tranche_A.
    """
    engine = RebateEngine(db)
    lines = [{"remise_pourcentage": 2.0, "taux_tva": 2.10, "montant_ht": 500.0}]

    result = engine._filter_and_classify_lines(
        invoice_lines=lines,
        agreement_config=biogaran_agreement.agreement_config,
    )

    assert "tranche_A" in result["tranches"]
    assert result["tranches"]["tranche_A"]["amount"] == 500.0


def test_classification_code_tranche_b_remise_haute(db, biogaran_agreement):
    """
    BUG CONNU (labels inverses vs spec) :
    Dans le CODE, "tranche_B" = remise HAUTE (> 2.5%).
    Dans la SPEC, tranche B = remise BASSE (<= 2.5%).

    Ici : remise 8% → tranche_B cote code.
    """
    engine = RebateEngine(db)
    lines = [{"remise_pourcentage": 8.0, "taux_tva": 2.10, "montant_ht": 1000.0}]

    result = engine._filter_and_classify_lines(
        invoice_lines=lines,
        agreement_config=biogaran_agreement.agreement_config,
    )

    assert "tranche_B" in result["tranches"]
    assert result["tranches"]["tranche_B"]["amount"] == 1000.0


def test_classification_seuil_2_5_inclus_dans_tranche_a(db, biogaran_agreement):
    """Exactement 2.5% → tranche_A (borne inclusive cote code, cf TRANCHE_A_MAX_REMISE=2.5)."""
    engine = RebateEngine(db)
    lines = [{"remise_pourcentage": 2.5, "taux_tva": 2.10, "montant_ht": 400.0}]

    result = engine._filter_and_classify_lines(
        invoice_lines=lines,
        agreement_config=biogaran_agreement.agreement_config,
    )

    assert "tranche_A" in result["tranches"]
    assert result["tranches"]["tranche_A"]["amount"] == 400.0


# ============================================================
# CALCUL RFA PAR TRANCHE
# ============================================================

def _make_invoice(db, pharmacy, laboratoire, *, numero, amount, d=None):
    f = FactureLabo(
        user_id=1,
        pharmacy_id=pharmacy.id,
        laboratoire_id=laboratoire.id,
        numero_facture=numero,
        date_facture=d or date(2026, 3, 15),
        montant_brut_ht=amount,
        total_remise_facture=0,
        montant_net_ht=amount,
        nb_lignes=1,
        nb_pages=1,
        statut="analysee",
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


def test_calcul_rfa_tranche_a_code(db, pharmacy, laboratoire, biogaran_agreement):
    """
    tranche_A (code) = remise basse. Taux immediate = 10%.
    1000€ en tranche_A → immediate RFA = 100€ (= 1000 * 0.10).
    Caracterisation : le calcul EST bien taux * montant_net (pas (cible-remise)*brut).
    """
    engine = RebateEngine(db)
    lines = [{"remise_pourcentage": 2.0, "taux_tva": 2.10, "montant_ht": 1000.0}]  # → tranche_A
    facture = _make_invoice(db, pharmacy, laboratoire, numero="CAR-A-001", amount=1000.0)

    schedule = engine.calculate_rebate_schedule(
        invoice_id=facture.id, invoice_amount=1000.0, invoice_date=date(2026, 3, 15),
        pharmacy_id=pharmacy.id, laboratoire_id=laboratoire.id, invoice_lines=lines,
    )
    entries = schedule.rebate_entries.get("entries", [])
    immediate = entries[0]

    assert immediate["stage_id"] == "immediate"
    assert immediate["tranche_A_amount"] == pytest.approx(100.0, abs=0.01)
    assert immediate["tranche_B_amount"] == pytest.approx(0.0, abs=0.01)
    assert immediate["total_amount"] == pytest.approx(100.0, abs=0.01)


def test_calcul_rfa_tranche_b_code(db, pharmacy, laboratoire, biogaran_agreement):
    """
    tranche_B (code) = remise haute. Taux immediate = 14%.
    1000€ en tranche_B → immediate RFA = 140€ (= 1000 * 0.14).
    """
    engine = RebateEngine(db)
    lines = [{"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 1000.0}]  # → tranche_B
    facture = _make_invoice(db, pharmacy, laboratoire, numero="CAR-B-001", amount=1000.0)

    schedule = engine.calculate_rebate_schedule(
        invoice_id=facture.id, invoice_amount=1000.0, invoice_date=date(2026, 3, 15),
        pharmacy_id=pharmacy.id, laboratoire_id=laboratoire.id, invoice_lines=lines,
    )
    entries = schedule.rebate_entries.get("entries", [])
    immediate = entries[0]

    assert immediate["stage_id"] == "immediate"
    assert immediate["tranche_B_amount"] == pytest.approx(140.0, abs=0.01)
    assert immediate["tranche_A_amount"] == pytest.approx(0.0, abs=0.01)


def test_calcul_rfa_otc_exclu_du_schedule(db, pharmacy, laboratoire, biogaran_agreement):
    """
    OTC (TVA != 2.10%) = exclu de toutes les etapes. Tous les tranche_amount restent 0.
    Caracterise : l'OTC n'apparait jamais comme un "stage" du schedule.
    """
    engine = RebateEngine(db)
    lines = [
        {"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 1000.0},   # eligible B
        {"remise_pourcentage": 0.0, "taux_tva": 20.00, "montant_ht": 500.0},   # OTC
    ]
    facture = _make_invoice(db, pharmacy, laboratoire, numero="CAR-OTC-001", amount=1500.0)

    schedule = engine.calculate_rebate_schedule(
        invoice_id=facture.id, invoice_amount=1500.0, invoice_date=date(2026, 3, 15),
        pharmacy_id=pharmacy.id, laboratoire_id=laboratoire.id, invoice_lines=lines,
    )

    entries = schedule.rebate_entries.get("entries", [])
    # L'etape immediate est calculee sur 1000€ eligible, pas 1500€ total.
    immediate = entries[0]
    assert immediate["tranche_B_amount"] == pytest.approx(140.0, abs=0.01)  # 1000 * 0.14
    # Aucune entree n'a un "stage_id" qui vaut OTC.
    assert all(e["stage_id"] != "otc" for e in entries)


# ============================================================
# FORMULE RFA = taux × montant_net  (PAS (cible-remise) × brut)
# ============================================================

def test_formule_rfa_est_taux_fois_net_pas_difference(db, pharmacy, laboratoire, biogaran_agreement):
    """
    Formule CORRECTE (et utilisee) : RFA_etape = taux_etape × montant_net_tranche.

    Formule INCORRECTE (ancien bug, refutee ici) :
        RFA = (taux_cible - taux_remise_facture) × montant_brut

    Test : 1000€ tranche_B (remise 5%), etape immediate taux 14%.
      - Formule correcte     : 1000 * 0.14 = 140.00 EUR
      - Formule ancien bug   : (0.14 - 0.05) * 1000 = 90.00 EUR

    On asserte 140.0 → ancienne formule refutee.
    """
    engine = RebateEngine(db)
    lines = [{"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 1000.0}]
    facture = _make_invoice(db, pharmacy, laboratoire, numero="CAR-FORMULE-001", amount=1000.0)

    schedule = engine.calculate_rebate_schedule(
        invoice_id=facture.id, invoice_amount=1000.0, invoice_date=date(2026, 3, 15),
        pharmacy_id=pharmacy.id, laboratoire_id=laboratoire.id, invoice_lines=lines,
    )
    immediate = schedule.rebate_entries["entries"][0]

    assert immediate["total_amount"] == pytest.approx(140.0, abs=0.01), \
        "Formule correcte : taux * montant_net"
    assert immediate["total_amount"] != pytest.approx(90.0, abs=0.01), \
        "L'ancien bug (cible - remise) * brut ne doit PLUS s'appliquer"


def test_calcul_remontee_total_moins_percu(db, pharmacy, laboratoire, biogaran_agreement):
    """
    Remontee = RFA totale attendue - RFA deja percue (etapes delay_months=0).

    Pour 1000€ tranche_B avec les taux de la fixture :
      - immediate  (m0)  : 1000 * 0.14 = 140  → deja percu (status=received)
      - m1_rebate  (+18) : 1000 * 0.18 = 180  → pending
      - m2_rebate  (+23) : 1000 * 0.23 = 230  → pending
      - annual     (cond): 1000 * 0.02 = 20   → conditional (seuil 50k non atteint → 0)
    Total pending (remontee) = 410 EUR.
    """
    engine = RebateEngine(db)
    lines = [{"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 1000.0}]
    facture = _make_invoice(db, pharmacy, laboratoire, numero="CAR-REMONTEE-001", amount=1000.0)

    schedule = engine.calculate_rebate_schedule(
        invoice_id=facture.id, invoice_amount=1000.0, invoice_date=date(2026, 3, 15),
        pharmacy_id=pharmacy.id, laboratoire_id=laboratoire.id, invoice_lines=lines,
    )
    entries = schedule.rebate_entries["entries"]

    percu = sum(e["total_amount"] for e in entries if e["status"] == "received")
    pending = sum(e["total_amount"] for e in entries if e["status"] == "pending")

    assert percu == pytest.approx(140.0, abs=0.01)
    assert pending == pytest.approx(410.0, abs=0.01)  # 180 + 230


# ============================================================
# CAS DE REFERENCE MUSTAFA (proportions, sans donnees sensibles)
# ============================================================

def test_biogaran_janvier_reference_proportions(db, pharmacy, laboratoire, biogaran_agreement):
    """
    Reproduit les proportions validees par Mustafa (~80% tranche A spec / ~20% tranche B spec).

    Rappel : spec "tranche A" (remise haute) = code "tranche_B".
    Donc la facture fictive a :
      - 80% du montant en lignes remise > 2.5% (code tranche_B)
      - 20% du montant en lignes remise <= 2.5% (code tranche_A)
    Eligible total = 10 000 EUR pour simplicite.

    Caracterisation : on enregistre les sorties du CODE, meme si la spec voudrait
    des valeurs differentes (A=55% / B=25% au lieu de 27.5% / 57%).

    Avec la fixture biogaran_agreement (27.5% / 57%) :
      - tranche_A (code)  = 2 000 EUR (20%)
      - tranche_B (code)  = 8 000 EUR (80%)

      immediate  : 2000*0.10 + 8000*0.14 = 200 + 1120 = 1 320
      m1_rebate  : 2000*0.10 + 8000*0.18 = 200 + 1440 = 1 640 → cumul 2 960
      m2_rebate  : 2000*0.05 + 8000*0.23 = 100 + 1840 = 1 940 → cumul 4 900
      annual     : conditionnel (seuil 50k non atteint sur 1 facture) → 0
    Total perçu (m0)   = 1 320
    Total pending      = 1 640 + 1 940 = 3 580 (= "remontee")
    Total non conditional = 4 900

    BUG CONNU : avec les VRAIS taux spec (A=55%, B=25%) ces chiffres monteraient
    plus haut (Mustafa attend ~5670€ de remontee sur sa vraie facture). Ici on
    travaille sur 10 000 EUR fictifs et on fige les sorties actuelles.
    """
    engine = RebateEngine(db)
    lines = [
        # 20% tranche_A (code) : remise basse <= 2.5%
        {"remise_pourcentage": 2.0, "taux_tva": 2.10, "montant_ht": 2000.0},
        # 80% tranche_B (code) : remise haute > 2.5%
        {"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 5000.0},
        {"remise_pourcentage": 8.0, "taux_tva": 2.10, "montant_ht": 3000.0},
    ]
    facture = _make_invoice(
        db, pharmacy, laboratoire,
        numero="BIOG-JAN-REF", amount=10000.0, d=date(2026, 1, 31),
    )

    schedule = engine.calculate_rebate_schedule(
        invoice_id=facture.id, invoice_amount=10000.0, invoice_date=date(2026, 1, 31),
        pharmacy_id=pharmacy.id, laboratoire_id=laboratoire.id, invoice_lines=lines,
    )
    entries = schedule.rebate_entries["entries"]

    # immediate (m0)
    assert entries[0]["stage_id"] == "immediate"
    assert entries[0]["tranche_A_amount"] == pytest.approx(200.0, abs=0.01)
    assert entries[0]["tranche_B_amount"] == pytest.approx(1120.0, abs=0.01)
    assert entries[0]["total_amount"] == pytest.approx(1320.0, abs=0.01)

    # m1_rebate cumul
    assert entries[1]["stage_id"] == "m1_rebate"
    assert entries[1]["cumulative_amount"] == pytest.approx(2960.0, abs=0.01)

    # m2_rebate cumul
    assert entries[2]["stage_id"] == "m2_rebate"
    assert entries[2]["cumulative_amount"] == pytest.approx(4900.0, abs=0.01)

    # Remontee = somme des etapes 'pending' (non conditionnelles non recues)
    pending = sum(e["total_amount"] for e in entries if e["status"] == "pending")
    assert pending == pytest.approx(3580.0, abs=0.01)  # 1640 + 1940
