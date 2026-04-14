"""
Tests du domain EMAC verifier.
Aucune fixture DB : le verificateur est 100% pur.
"""

from datetime import date
from decimal import Decimal

from app.domain.emac import (
    EMACInput,
    EMACVerifier,
    FacturesRefInput,
)


def _emac(**kw) -> EMACInput:
    defaults = dict(
        emac_id=1, reference="EMAC-2026-03",
        laboratoire_nom="Biogaran",
        periode_debut=date(2026, 3, 1),
        periode_fin=date(2026, 3, 31),
    )
    defaults.update(kw)
    return EMACInput(**defaults)


def _ref(**kw) -> FacturesRefInput:
    return FacturesRefInput(**kw)


# ==============================================================
# Conforme : ecarts dans la tolerance
# ==============================================================

def test_emac_conforme_aucun_ecart():
    e = _emac(ca_declare=Decimal("10000"), rfa_declaree=Decimal("500"))
    r = _ref(ca_reel=Decimal("10000"), rfa_attendue=Decimal("500"), nombre_factures=12)
    result = EMACVerifier().verify(e, r)
    assert result.conforme
    assert result.ecarts == []
    assert result.nombre_factures_considerees == 12


def test_emac_ecart_sous_tolerance_monetaire_ignore():
    """Ecart 0.50 EUR < 1 EUR → ignore."""
    e = _emac(ca_declare=Decimal("10000.50"), rfa_declaree=Decimal("500"))
    r = _ref(ca_reel=Decimal("10000"), rfa_attendue=Decimal("500"))
    result = EMACVerifier().verify(e, r)
    assert result.conforme


def test_emac_ecart_sous_tolerance_ratio_ignore():
    """Ecart 50 EUR / 10 000 = 0.5 % < 1 % → ignore."""
    e = _emac(ca_declare=Decimal("9950"), rfa_declaree=Decimal("500"))
    r = _ref(ca_reel=Decimal("10000"), rfa_attendue=Decimal("500"))
    result = EMACVerifier().verify(e, r)
    assert result.conforme


# ==============================================================
# Ecart CA
# ==============================================================

def test_emac_ecart_ca_detecte():
    """Ecart 500 EUR / 10 000 = 5 % → ecart_ca remonte avec seuil_alerte."""
    e = _emac(ca_declare=Decimal("9500"), rfa_declaree=Decimal("500"))
    r = _ref(ca_reel=Decimal("10000"), rfa_attendue=Decimal("500"))
    result = EMACVerifier().verify(e, r)
    assert not result.conforme
    ca_ecart = [x for x in result.ecarts if x.type_ecart == "ecart_ca"]
    assert len(ca_ecart) == 1
    assert ca_ecart[0].ecart == Decimal("500.00")
    assert ca_ecart[0].seuil_alerte is True


# ==============================================================
# Ecart RFA
# ==============================================================

def test_emac_ecart_rfa_detecte():
    """RFA attendue 600, declaree 400 → ecart 200 / 600 = 33 % → alerte."""
    e = _emac(ca_declare=Decimal("10000"), rfa_declaree=Decimal("400"))
    r = _ref(ca_reel=Decimal("10000"), rfa_attendue=Decimal("600"))
    result = EMACVerifier().verify(e, r)
    rfa_ecart = [x for x in result.ecarts if x.type_ecart == "ecart_rfa"]
    assert len(rfa_ecart) == 1
    assert rfa_ecart[0].ecart == Decimal("200.00")
    assert rfa_ecart[0].seuil_alerte is True


# ==============================================================
# Ecart COP (conditionnel)
# ==============================================================

def test_emac_ecart_cop_ignore_si_tout_a_zero():
    """Si COP attendue = 0 ET declaree = 0, on ne verifie pas."""
    e = _emac(ca_declare=Decimal("10000"), rfa_declaree=Decimal("500"))
    r = _ref(ca_reel=Decimal("10000"), rfa_attendue=Decimal("500"))
    result = EMACVerifier().verify(e, r)
    assert not any(x.type_ecart == "ecart_cop" for x in result.ecarts)


def test_emac_ecart_cop_detecte():
    """COP attendue 200, declaree 0 → ecart_cop."""
    e = _emac(ca_declare=Decimal("10000"), rfa_declaree=Decimal("500"), cop_declaree=Decimal("0"))
    r = _ref(
        ca_reel=Decimal("10000"), rfa_attendue=Decimal("500"),
        cop_attendue=Decimal("200"),
    )
    result = EMACVerifier().verify(e, r)
    cop_ecart = [x for x in result.ecarts if x.type_ecart == "ecart_cop"]
    assert len(cop_ecart) == 1
    assert cop_ecart[0].ecart == Decimal("200.00")


# ==============================================================
# Synthese globale
# ==============================================================

def test_emac_synthese_totaux():
    """
    Attendu = rfa(600) + cop(200) = 800.
    Declare = rfa(400) + cop(0) + remises_differees(50) + autres(10) = 460.
    ecart_total = 800 - 460 = 340.
    """
    e = _emac(
        rfa_declaree=Decimal("400"),
        cop_declaree=Decimal("0"),
        remises_differees_declarees=Decimal("50"),
        autres_avantages=Decimal("10"),
    )
    r = _ref(rfa_attendue=Decimal("600"), cop_attendue=Decimal("200"))
    result = EMACVerifier().verify(e, r)
    assert result.montant_total_attendu == Decimal("800.00")
    assert result.montant_total_declare == Decimal("460.00")
    assert result.ecart_total == Decimal("340.00")
    assert not result.conforme
    # Les ecarts critiques sont remontes
    assert result.nb_ecarts_critiques >= 1
