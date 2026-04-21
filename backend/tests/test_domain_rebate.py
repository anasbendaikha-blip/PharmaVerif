"""
Tests du calculateur RFA domain (bugs corriges).

Contrairement a tests/test_rebate_engine_characterization.py qui DOCUMENTE
les bugs du legacy sans les corriger, ici on verifie explicitement que :
  - L'inversion A/B est corrigee (remise haute → A, remise basse → B).
  - La formule est `net_ht * taux / 100`.
  - Aucun taux n'est hardcode : ils viennent de AccordRebateInput.

Aucune fixture DB : le calculateur est 100% pur.
"""

from decimal import Decimal
import pytest

from app.domain.rebate import (
    AccordRebateInput,
    LigneFactureRebateInput,
    RebateCalculator,
    TrancheType,
)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _accord_spec(
    taux_a: Decimal = Decimal("55"),
    taux_b: Decimal = Decimal("25"),
    taux_otc: Decimal = Decimal("57"),
    seuil: Decimal = Decimal("2.5"),
    versement_immediat_pct: Decimal = Decimal("0"),
) -> AccordRebateInput:
    """Accord utilisant les taux spec Mustafa par defaut."""
    return AccordRebateInput(
        accord_id=1,
        accord_nom="Accord Spec Test",
        laboratoire_nom="BiogaranTest",
        seuil_remise=seuil,
        taux_tranche_a=taux_a,
        taux_tranche_b=taux_b,
        taux_otc=taux_otc,
        versement_immediat_pct=versement_immediat_pct,
    )


def _ligne(
    *,
    cip13: str = "3400900000001",
    designation: str = "PRODUIT TEST",
    quantite: int = 1,
    pu: Decimal = Decimal("10"),
    net: Decimal = Decimal("1000"),
    brut: Decimal | None = None,
    remise: Decimal = Decimal("0"),
    tva: Decimal = Decimal("2.10"),
) -> LigneFactureRebateInput:
    return LigneFactureRebateInput(
        cip13=cip13,
        designation=designation,
        quantite=quantite,
        prix_unitaire_ht=pu,
        montant_net_ht=net,
        montant_brut_ht=brut if brut is not None else net,
        taux_remise=remise,
        taux_tva=tva,
    )


# ==================================================================
# 1. Classification corrigee (A = remise haute)
# ==================================================================

def test_classification_tranche_a_remise_haute():
    """TVA 2.10% + remise 5% (> 2.5 seuil) → TRANCHE_A."""
    calc = RebateCalculator()
    tr = calc.classify_ligne(_ligne(remise=Decimal("5")), _accord_spec())
    assert tr == TrancheType.TRANCHE_A


def test_classification_tranche_b_remise_basse():
    """TVA 2.10% + remise 2.0% (< 2.5 seuil) → TRANCHE_B."""
    calc = RebateCalculator()
    tr = calc.classify_ligne(_ligne(remise=Decimal("2")), _accord_spec())
    assert tr == TrancheType.TRANCHE_B


def test_classification_seuil_exact_est_tranche_b():
    """Remise exactement au seuil (2.5%) → TRANCHE_B (strict >)."""
    calc = RebateCalculator()
    tr = calc.classify_ligne(_ligne(remise=Decimal("2.5")), _accord_spec())
    assert tr == TrancheType.TRANCHE_B


def test_classification_otc_tva_non_210():
    """TVA 10% → OTC quel que soit le taux de remise."""
    calc = RebateCalculator()
    for rem in (Decimal("0"), Decimal("2"), Decimal("10"), Decimal("50")):
        ligne = _ligne(remise=rem, tva=Decimal("10"))
        assert calc.classify_ligne(ligne, _accord_spec()) == TrancheType.OTC


# ==================================================================
# 2. Calcul avec taux spec 55% / 25% / 57%
# ==================================================================

def test_calcul_tranche_a_55pct():
    """1000€ TRANCHE_A (remise 5%) × 55% = 550€ RFA."""
    calc = RebateCalculator()
    result = calc.calculate(
        [_ligne(net=Decimal("1000"), remise=Decimal("5"))],
        _accord_spec(),
    )
    assert result.lignes[0].tranche == TrancheType.TRANCHE_A
    assert result.lignes[0].montant_rfa == Decimal("550.00")
    assert result.rfa_tranche_a == Decimal("550.00")
    assert result.total_rfa_due == Decimal("550.00")


def test_calcul_tranche_b_25pct():
    """1000€ TRANCHE_B (remise 2%) × 25% = 250€ RFA."""
    calc = RebateCalculator()
    result = calc.calculate(
        [_ligne(net=Decimal("1000"), remise=Decimal("2"))],
        _accord_spec(),
    )
    assert result.lignes[0].tranche == TrancheType.TRANCHE_B
    assert result.lignes[0].montant_rfa == Decimal("250.00")
    assert result.rfa_tranche_b == Decimal("250.00")


def test_calcul_otc_57pct_dans_rfa_otc_pas_dans_due():
    """500€ OTC × 57% = 285€ RFA OTC, PAS dans total_rfa_due."""
    calc = RebateCalculator()
    result = calc.calculate(
        [_ligne(net=Decimal("500"), tva=Decimal("20"))],
        _accord_spec(),
    )
    assert result.lignes[0].tranche == TrancheType.OTC
    assert result.rfa_otc == Decimal("285.00")
    # OTC exclu du due (deja dans la remise facture)
    assert result.total_rfa_due == Decimal("0.00")
    # Mais comptabilise dans deja_percu
    assert result.deja_percu == Decimal("285.00")


# ==================================================================
# 3. Formule : net * taux (PAS (cible - remise) * brut)
# ==================================================================

def test_formule_net_fois_taux_pas_difference():
    """
    TRANCHE_A, net 1000€ remise 5% :
      - Formule correcte     : 1000 * 55 / 100 = 550.00
      - Ancien bug refute    : (55 - 5) / 100 * brut ≠ 550
    """
    calc = RebateCalculator()
    ligne = _ligne(net=Decimal("1000"), brut=Decimal("1053"), remise=Decimal("5"))
    result = calc.calculate([ligne], _accord_spec())

    assert result.lignes[0].montant_rfa == Decimal("550.00")
    # Montant du bug ancien : (55 - 5) / 100 * 1053 = 526.50
    assert result.lignes[0].montant_rfa != Decimal("526.50")


# ==================================================================
# 4. Taux viennent de l'accord (pas de hardcode)
# ==================================================================

def test_taux_lus_depuis_accord():
    """
    Un accord personnalise avec 60%/30%/40% doit produire ces taux-la
    exactement, pas 55/25/57.
    """
    accord_custom = _accord_spec(
        taux_a=Decimal("60"), taux_b=Decimal("30"), taux_otc=Decimal("40"),
    )
    calc = RebateCalculator()
    result = calc.calculate(
        [
            _ligne(cip13="111", net=Decimal("1000"), remise=Decimal("5")),      # A
            _ligne(cip13="222", net=Decimal("1000"), remise=Decimal("1")),      # B
            _ligne(cip13="333", net=Decimal("1000"), tva=Decimal("10")),        # OTC
        ],
        accord_custom,
    )
    rfas = {l.cip13: l.montant_rfa for l in result.lignes}
    assert rfas["111"] == Decimal("600.00")   # 1000 * 60% = 600
    assert rfas["222"] == Decimal("300.00")   # 1000 * 30% = 300
    assert rfas["333"] == Decimal("400.00")   # 1000 * 40% = 400


def test_accord_sans_valeur_par_defaut_exige_taux_explicites():
    """AccordRebateInput ne doit PAS avoir de default sur les taux (TypeError)."""
    with pytest.raises(TypeError):
        AccordRebateInput(  # type: ignore[call-arg]
            accord_id=1,
            accord_nom="Pas de taux",
            laboratoire_nom="X",
            seuil_remise=Decimal("2.5"),
            # taux manquants -> TypeError attendu
        )


# ==================================================================
# 5. Synthese (due / deja_percu / remontee)
# ==================================================================

def test_remontee_sans_versement_immediat():
    """
    Tout est "remontee" quand versement_immediat_pct = 0 :
    500 A + 200 B + 114 OTC → due=700, deja_percu=114 (OTC), remontee=700.
    """
    accord = _accord_spec()  # versement_immediat_pct = 0
    calc = RebateCalculator()
    result = calc.calculate(
        [
            _ligne(cip13="111", net=Decimal("1000"), remise=Decimal("5")),    # A: 550
            _ligne(cip13="222", net=Decimal("800"),  remise=Decimal("1")),    # B: 200
            _ligne(cip13="333", net=Decimal("200"),  tva=Decimal("20")),      # OTC: 114
        ],
        accord,
    )
    assert result.rfa_tranche_a == Decimal("550.00")
    assert result.rfa_tranche_b == Decimal("200.00")
    assert result.rfa_otc == Decimal("114.00")
    assert result.total_rfa_due == Decimal("750.00")     # 550 + 200
    assert result.deja_percu == Decimal("114.00")        # OTC uniquement
    assert result.remontee == Decimal("750.00")          # tout le RFA A+B


def test_remontee_avec_versement_immediat_partiel():
    """
    versement_immediat_pct = 20% → 20% du due_AB est deja percu.
    1000€ TRANCHE_A * 55% = 550 due. Immediat 20% de 550 = 110.
    deja_percu = 0 OTC + 110 = 110. remontee = 550 - 110 = 440.
    """
    accord = _accord_spec(versement_immediat_pct=Decimal("20"))
    calc = RebateCalculator()
    result = calc.calculate(
        [_ligne(net=Decimal("1000"), remise=Decimal("5"))],
        accord,
    )
    assert result.total_rfa_due == Decimal("550.00")
    assert result.deja_percu == Decimal("110.00")
    assert result.remontee == Decimal("440.00")


# ==================================================================
# 6. Scenario Mustafa (proportions reference)
# ==================================================================

def test_scenario_mustafa_80_20():
    """
    Proportions Mustafa : 80% en TRANCHE_A spec (remise haute),
    20% en TRANCHE_B spec (remise basse). Montants fictifs.
      A: 8000€ * 55% = 4400€
      B: 2000€ * 25% =  500€
    Total due = 4900€, remontee (sans immediat) = 4900€.
    """
    accord = _accord_spec()
    calc = RebateCalculator()
    result = calc.calculate(
        [
            _ligne(cip13="A1", net=Decimal("5000"), remise=Decimal("5")),    # A
            _ligne(cip13="A2", net=Decimal("3000"), remise=Decimal("8")),    # A
            _ligne(cip13="B1", net=Decimal("2000"), remise=Decimal("2")),    # B
        ],
        accord,
    )
    assert result.rfa_tranche_a == Decimal("4400.00")
    assert result.rfa_tranche_b == Decimal("500.00")
    assert result.total_rfa_due == Decimal("4900.00")
    assert result.remontee == Decimal("4900.00")
    assert result.nombre_lignes_eligible == 3
    assert result.nombre_lignes_otc == 0
