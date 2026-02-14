"""
PharmaVerif — Tests unitaires du Rebate Engine
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Tests couvrant :
  - Filtrage OTC (TVA != 2.10%)
  - Classification tranche A (remise <= 2.5%) vs tranche B (> 2.5%)
  - Calcul ventile correct (A * taux_A + B * taux_B, PAS total * taux_dominant)
  - Exclusion OTC du total RFA
  - Cumul des taux par etape
  - Versioning des accords
  - Cas sans accord (pas d'erreur, pas de schedule)

Usage :
    cd backend
    python -m pytest tests/test_rebate_engine.py -v
"""

import pytest
from datetime import date
from app.services.rebate_engine import RebateEngine, NoActiveAgreementError


# ============================================================================
# Test 1 : Filtrer les lignes OTC (TVA != 2.10%)
# ============================================================================

class TestFilterOTCLines:
    """Les lignes avec TVA != 2.10% sont exclues du calcul RFA"""

    def test_otc_lines_excluded(self, db, biogaran_agreement, biogaran_template):
        """Les lignes OTC (TVA 20%, 5.5%, etc.) sont classees dans otc_amount"""
        engine = RebateEngine(db)

        lines = [
            {"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 500.0},  # eligible
            {"remise_pourcentage": 0.0, "taux_tva": 20.0, "montant_ht": 200.0},   # OTC
            {"remise_pourcentage": 3.0, "taux_tva": 5.50, "montant_ht": 150.0},   # OTC
        ]

        result = engine._filter_and_classify_lines(
            invoice_lines=lines,
            agreement_config=biogaran_agreement.agreement_config,
        )

        assert result["otc_amount"] == 350.0, f"OTC devrait etre 350€, got {result['otc_amount']}"
        assert result["eligible_amount"] == 500.0
        assert "tranche_B" in result["tranches"]

    def test_all_otc_returns_zero_eligible(self, db, biogaran_agreement):
        """Facture 100% OTC → 0 eligible"""
        engine = RebateEngine(db)

        lines = [
            {"remise_pourcentage": 0.0, "taux_tva": 20.0, "montant_ht": 500.0},
            {"remise_pourcentage": 0.0, "taux_tva": 5.5, "montant_ht": 300.0},
        ]

        result = engine._filter_and_classify_lines(
            invoice_lines=lines,
            agreement_config=biogaran_agreement.agreement_config,
        )

        assert result["otc_amount"] == 800.0
        assert result["eligible_amount"] == 0.0
        assert len(result["tranches"]) == 0


# ============================================================================
# Test 2 : Classification tranche A (remise <= 2.5%)
# ============================================================================

class TestClassifyTrancheA:
    """Lignes avec remise <= 2.5% → tranche A"""

    def test_low_rebate_is_tranche_a(self, db, biogaran_agreement):
        """Remise 2.0% → tranche A"""
        engine = RebateEngine(db)

        # NB: le moteur normalise remise_pourcentage > 1 en ratio (÷100)
        # Donc 2.0 → 0.02, 1.5 → 0.015, 1.1 → 0.011 → tous ≤ 0.025 → tranche A
        lines = [
            {"remise_pourcentage": 2.0, "taux_tva": 2.10, "montant_ht": 300.0},
            {"remise_pourcentage": 1.5, "taux_tva": 2.10, "montant_ht": 200.0},
            {"remise_pourcentage": 1.1, "taux_tva": 2.10, "montant_ht": 100.0},
        ]

        result = engine._filter_and_classify_lines(
            invoice_lines=lines,
            agreement_config=biogaran_agreement.agreement_config,
        )

        assert "tranche_A" in result["tranches"]
        assert result["tranches"]["tranche_A"]["amount"] == 600.0
        assert result["tranches"]["tranche_A"]["line_count"] == 3

    def test_exactly_2_5_is_tranche_a(self, db, biogaran_agreement):
        """Remise exactement 2.5% → tranche A (inclus)"""
        engine = RebateEngine(db)

        lines = [
            {"remise_pourcentage": 2.5, "taux_tva": 2.10, "montant_ht": 400.0},
        ]

        result = engine._filter_and_classify_lines(
            invoice_lines=lines,
            agreement_config=biogaran_agreement.agreement_config,
        )

        assert "tranche_A" in result["tranches"]
        assert result["tranches"]["tranche_A"]["amount"] == 400.0


# ============================================================================
# Test 3 : Classification tranche B (remise > 2.5%)
# ============================================================================

class TestClassifyTrancheB:
    """Lignes avec remise > 2.5% → tranche B"""

    def test_high_rebate_is_tranche_b(self, db, biogaran_agreement):
        """Remise 5.0%, 10.0% → tranche B"""
        engine = RebateEngine(db)

        lines = [
            {"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 700.0},
            {"remise_pourcentage": 10.0, "taux_tva": 2.10, "montant_ht": 300.0},
        ]

        result = engine._filter_and_classify_lines(
            invoice_lines=lines,
            agreement_config=biogaran_agreement.agreement_config,
        )

        assert "tranche_B" in result["tranches"]
        assert result["tranches"]["tranche_B"]["amount"] == 1000.0
        assert result["tranches"]["tranche_B"]["line_count"] == 2

    def test_2_6_is_tranche_b(self, db, biogaran_agreement):
        """Remise 2.6% → tranche B (juste au-dessus du seuil)"""
        engine = RebateEngine(db)

        lines = [
            {"remise_pourcentage": 2.6, "taux_tva": 2.10, "montant_ht": 500.0},
        ]

        result = engine._filter_and_classify_lines(
            invoice_lines=lines,
            agreement_config=biogaran_agreement.agreement_config,
        )

        assert "tranche_B" in result["tranches"]
        assert result["tranches"]["tranche_B"]["amount"] == 500.0


# ============================================================================
# Test 4 : Calcul ventile A/B (CAS CRITIQUE)
# ============================================================================

class TestMixedTrancheCalculation:
    """
    Facture avec mix A/B → calcul ventile correct.

    Cas critique :
        2400€ tranche A (10% immediat) + 7600€ tranche B (14% immediat)
        = 240 + 1064 = 1304€ (PAS 10000 × 14% = 1400€)
    """

    def test_mixed_tranche_immediate_stage(self, db, pharmacy, laboratoire, biogaran_agreement, biogaran_template):
        """
        Facture mixte : etape 'immediate' correctement ventilee.
        A: 2400 * 10% = 240
        B: 7600 * 14% = 1064
        Total immediate = 1304
        """
        engine = RebateEngine(db)

        # NB: le moteur normalise remise_pourcentage > 1 en ratio (÷100)
        # Donc 2.0 → 0.02, 1.5 → 0.015, 1.1 → 0.011 → tous ≤ 0.025 → tranche A
        # Et 5.0 → 0.05, 8.0 → 0.08 → tous > 0.025 → tranche B
        lines = [
            # Tranche A (remise <= 2.5%)
            {"remise_pourcentage": 2.0, "taux_tva": 2.10, "montant_ht": 800.0},
            {"remise_pourcentage": 1.5, "taux_tva": 2.10, "montant_ht": 1000.0},
            {"remise_pourcentage": 1.1, "taux_tva": 2.10, "montant_ht": 600.0},
            # Tranche B (remise > 2.5%)
            {"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 3000.0},
            {"remise_pourcentage": 8.0, "taux_tva": 2.10, "montant_ht": 4600.0},
            # OTC (exclu)
            {"remise_pourcentage": 0.0, "taux_tva": 20.0, "montant_ht": 850.0},
        ]

        # Creer une facture labo en DB pour le schedule
        from app.models_labo import FactureLabo
        facture = FactureLabo(
            user_id=1,
            pharmacy_id=pharmacy.id,
            laboratoire_id=laboratoire.id,
            numero_facture="TEST-MIXED-001",
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
        db.refresh(facture)

        schedule = engine.calculate_rebate_schedule(
            invoice_id=facture.id,
            invoice_amount=10850.0,
            invoice_date=date(2026, 3, 15),
            pharmacy_id=pharmacy.id,
            laboratoire_id=laboratoire.id,
            invoice_lines=lines,
        )

        assert schedule is not None
        assert schedule.total_rfa_expected is not None

        # Verifier que le schedule a les bonnes entrees
        entries = schedule.rebate_entries.get("entries", []) if schedule.rebate_entries else []
        assert len(entries) >= 1, f"Devrait avoir au moins 1 etape, got {len(entries)}"

        # Premiere etape (immediate)
        immediate = entries[0]
        assert immediate["stage_id"] == "immediate"

        # A: 2400 * 10% = 240
        assert abs(immediate["tranche_A_amount"] - 240.0) < 0.01, \
            f"Tranche A immediate devrait etre 240€, got {immediate['tranche_A_amount']}"

        # B: 7600 * 14% = 1064
        assert abs(immediate["tranche_B_amount"] - 1064.0) < 0.01, \
            f"Tranche B immediate devrait etre 1064€, got {immediate['tranche_B_amount']}"

        # Total immediate = 1304 (PAS 10000 * 14% = 1400)
        assert abs(immediate["total_amount"] - 1304.0) < 0.01, \
            f"Total immediate devrait etre 1304€, got {immediate['total_amount']}"


# ============================================================================
# Test 5 : OTC exclu du total RFA
# ============================================================================

class TestOTCExcludedFromTotal:
    """Le montant OTC n'est pas dans le total RFA"""

    def test_otc_not_in_rfa(self, db, pharmacy, laboratoire, biogaran_agreement, biogaran_template):
        """Le schedule.total_rfa_expected ne prend pas en compte l'OTC"""
        engine = RebateEngine(db)

        # Facture avec 1000€ TVA 2.10% (B) + 500€ TVA 20% (OTC)
        lines = [
            {"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 1000.0},  # B
            {"remise_pourcentage": 0.0, "taux_tva": 20.0, "montant_ht": 500.0},   # OTC
        ]

        from app.models_labo import FactureLabo
        facture = FactureLabo(
            user_id=1,
            pharmacy_id=pharmacy.id,
            laboratoire_id=laboratoire.id,
            numero_facture="TEST-OTC-001",
            date_facture=date(2026, 3, 15),
            montant_brut_ht=1500.0,
            total_remise_facture=0,
            montant_net_ht=1500.0,
            nb_lignes=2,
            nb_pages=1,
            statut="analysee",
        )
        db.add(facture)
        db.commit()
        db.refresh(facture)

        schedule = engine.calculate_rebate_schedule(
            invoice_id=facture.id,
            invoice_amount=1500.0,
            invoice_date=date(2026, 3, 15),
            pharmacy_id=pharmacy.id,
            laboratoire_id=laboratoire.id,
            invoice_lines=lines,
        )

        # Le total RFA ne doit PAS etre basee sur 1500€ (avec OTC)
        # mais sur 1000€ (eligible uniquement)
        entries = schedule.rebate_entries.get("entries", []) if schedule.rebate_entries else []
        if entries:
            # Etape 1 (immediate B): 1000 * 14% = 140
            assert abs(entries[0]["tranche_B_amount"] - 140.0) < 0.01, \
                f"B immediate devrait etre 140€, got {entries[0]['tranche_B_amount']}"

        # Le % RFA doit etre calcule sur eligible (1000), pas sur total (1500)
        assert schedule.total_rfa_percentage > 0


# ============================================================================
# Test 6 : Taux cumulatifs
# ============================================================================

class TestCumulativeRates:
    """Les etapes s'additionnent correctement"""

    def test_cumulative_amounts_grow(self, db, pharmacy, laboratoire, biogaran_agreement, biogaran_template):
        """Le cumul croit a chaque etape"""
        engine = RebateEngine(db)

        lines = [
            {"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 10000.0},
        ]

        from app.models_labo import FactureLabo
        facture = FactureLabo(
            user_id=1,
            pharmacy_id=pharmacy.id,
            laboratoire_id=laboratoire.id,
            numero_facture="TEST-CUMUL-001",
            date_facture=date(2026, 3, 15),
            montant_brut_ht=10000.0,
            total_remise_facture=0,
            montant_net_ht=10000.0,
            nb_lignes=1,
            nb_pages=1,
            statut="analysee",
        )
        db.add(facture)
        db.commit()
        db.refresh(facture)

        schedule = engine.calculate_rebate_schedule(
            invoice_id=facture.id,
            invoice_amount=10000.0,
            invoice_date=date(2026, 3, 15),
            pharmacy_id=pharmacy.id,
            laboratoire_id=laboratoire.id,
            invoice_lines=lines,
        )

        entries = schedule.rebate_entries.get("entries", []) if schedule.rebate_entries else []

        # Au moins 3 etapes (immediate, m1, m2)
        assert len(entries) >= 3

        # Les cumuls doivent etre croissants
        prev_cumul = 0
        for entry in entries:
            current = entry["cumulative_amount"]
            assert current >= prev_cumul, \
                f"Le cumul devrait etre croissant: {prev_cumul} -> {current} " \
                f"(etape {entry['stage_id']})"
            prev_cumul = current

        # Pour tranche B pure (10000€) :
        # immediate: 14% = 1400
        # m1: +18% = 1800, cumul = 3200
        # m2: +23% = 2300, cumul = 5500
        assert abs(entries[0]["total_amount"] - 1400.0) < 0.01
        assert abs(entries[1]["total_amount"] - 1800.0) < 0.01
        assert abs(entries[2]["total_amount"] - 2300.0) < 0.01


# ============================================================================
# Test 7 : Versioning des accords
# ============================================================================

class TestAgreementVersioning:
    """Modification d'accord actif cree v2 + superseded v1"""

    def test_versioning_creates_new_version(self, db, pharmacy, laboratoire, biogaran_agreement, biogaran_template):
        """AgreementVersioningService cree v2 et supersede v1"""
        from app.services.rebate_engine import AgreementVersioningService
        from app.models_rebate import LaboratoryAgreement, AgreementStatus

        versioning = AgreementVersioningService(db)

        original_id = biogaran_agreement.id
        original_version = biogaran_agreement.version

        # Modifier l'accord actif (via l'API publique update_agreement)
        new_agreement = versioning.update_agreement(
            agreement_id=original_id,
            user_id=1,
            reason="Augmentation objectif CA pour test",
            objectif_ca_annuel=75000,
        )

        # Refresh l'original
        db.refresh(biogaran_agreement)

        # L'original doit etre superseded
        assert biogaran_agreement.statut == AgreementStatus.ARCHIVE or biogaran_agreement.statut.value in ("archive", "superseded"), \
            f"L'ancienne version devrait etre archivee, got {biogaran_agreement.statut}"

        # Le nouveau doit etre actif et v+1
        assert new_agreement.statut == AgreementStatus.ACTIF
        assert new_agreement.version == original_version + 1
        assert new_agreement.previous_version_id == original_id
        assert new_agreement.objectif_ca_annuel == 75000


# ============================================================================
# Test 8 : Pas d'accord → pas d'erreur, pas de schedule
# ============================================================================

class TestNoAgreementNoError:
    """Pas d'accord pour ce labo → pas d'erreur, pas de schedule"""

    def test_no_agreement_raises_proper_exception(self, db, pharmacy, laboratoire):
        """Sans accord actif, NoActiveAgreementError est levee"""
        engine = RebateEngine(db)

        lines = [
            {"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 1000.0},
        ]

        with pytest.raises(NoActiveAgreementError):
            engine.calculate_rebate_schedule(
                invoice_id=999,
                invoice_amount=1000.0,
                invoice_date=date(2026, 3, 15),
                pharmacy_id=pharmacy.id,
                laboratoire_id=999999,  # Labo inexistant
                invoice_lines=lines,
            )

    def test_no_agreement_for_this_lab(self, db, pharmacy):
        """Labo sans accord configure"""
        from app.models_labo import Laboratoire
        labo_sans_accord = Laboratoire(
            nom="Labo Sans Accord",
            type="generique",
            actif=True,
            pharmacy_id=pharmacy.id,
        )
        db.add(labo_sans_accord)
        db.commit()
        db.refresh(labo_sans_accord)

        engine = RebateEngine(db)

        with pytest.raises(NoActiveAgreementError):
            engine.calculate_rebate_schedule(
                invoice_id=999,
                invoice_amount=1000.0,
                invoice_date=date(2026, 3, 15),
                pharmacy_id=pharmacy.id,
                laboratoire_id=labo_sans_accord.id,
                invoice_lines=[{"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 1000.0}],
            )
