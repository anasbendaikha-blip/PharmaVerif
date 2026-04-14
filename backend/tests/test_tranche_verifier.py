"""
Tests du verificateur par tranches (domain).

Couvre les scenarios ADONIS de manipulation des documents grossistes :
  - Conformite (document = factures)
  - Sous-declaration Tranche A (critique)
  - Sur-declaration Tranche B (avertissement)
  - Reclassement generique -> OTC
  - Arrondis ignores
  - Impact financier = ecarts defavorables uniquement
  - Favorable au pharmacien non critique
  - Scenario complet de manipulation

Aucune fixture DB : le verificateur est 100% pur.
"""

from datetime import date
from decimal import Decimal

from app.domain.tranche import (
    DocumentTrancheInput,
    FacturesMoisInput,
    SeveriteEcart,
    TrancheVerifier,
    TypeEcartTranche,
)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _doc(a, b, otc, total, *, grossiste="CERP Rouen", mois=date(2026, 4, 1)):
    return DocumentTrancheInput(
        grossiste=grossiste,
        mois=mois,
        montant_tranche_a_declare=Decimal(str(a)),
        montant_tranche_b_declare=Decimal(str(b)),
        montant_otc_declare=Decimal(str(otc)),
        montant_total_declare=Decimal(str(total)),
        reference="DOC-TEST",
    )


def _fact(a, b, otc, total, *, grossiste="CERP Rouen", mois=date(2026, 4, 1)):
    return FacturesMoisInput(
        grossiste=grossiste,
        mois=mois,
        montant_tranche_a_calcule=Decimal(str(a)),
        montant_tranche_b_calcule=Decimal(str(b)),
        montant_otc_calcule=Decimal(str(otc)),
        montant_total_calcule=Decimal(str(total)),
        nb_factures=10,
    )


# ==================================================================
# 1. Conformite totale
# ==================================================================

def test_tranches_conformes():
    """Document = factures (aux arrondis pres) -> conforme, 0 ecarts."""
    doc = _doc(6000, 2000, 1000, 9000)
    fact = _fact(6000, 2000, 1000, 9000)
    result = TrancheVerifier().verify(doc, fact)

    assert result.conforme
    assert result.nb_ecarts_critiques == 0
    assert result.nb_ecarts_avertissement == 0
    assert result.ecarts == []
    assert result.impact_financier == Decimal("0.00")
    assert result.mois == "2026-04"


# ==================================================================
# 2. Sous-declaration Tranche A (critique)
# ==================================================================

def test_sous_declaration_tranche_a_critique():
    """
    Grossiste declare 5000 A vs 6000 calcules.
    Ecart = -1000, |ecart| = 1000 > 50 et 16.7 % > 5 % -> CRITIQUE defavorable.
    """
    doc = _doc(5000, 2000, 1000, 8000)
    fact = _fact(6000, 2000, 1000, 9000)
    result = TrancheVerifier().verify(doc, fact)

    assert not result.conforme
    ecarts_a = [e for e in result.ecarts if e.type_ecart == TypeEcartTranche.MONTANT_TRANCHE_A]
    assert len(ecarts_a) == 1
    ecart = ecarts_a[0]
    assert ecart.severite == SeveriteEcart.CRITIQUE
    assert ecart.ecart_absolu == Decimal("-1000.00")
    assert ecart.favorable_pharmacien is False
    # Impact financier inclut cet ecart defavorable
    assert result.impact_financier >= Decimal("1000.00")


# ==================================================================
# 3. Sur-declaration Tranche B (avertissement)
# ==================================================================

def test_sur_declaration_tranche_b():
    """
    Grossiste declare 2100 B vs 2000 calcules.
    Ecart = +100, 100 > 10 et 5 % > 1 % mais 5 % pas > 5 % -> AVERTISSEMENT
    (plus strict en tranche B car c'est defavorable si la classification
    glisse vers B pour reduire la RFA).
    Ici c'est favorable (declare + que prevu).
    """
    doc = _doc(6000, 2100, 1000, 9100)
    fact = _fact(6000, 2000, 1000, 9000)
    result = TrancheVerifier().verify(doc, fact)

    ecarts_b = [e for e in result.ecarts if e.type_ecart == TypeEcartTranche.MONTANT_TRANCHE_B]
    assert len(ecarts_b) == 1
    assert ecarts_b[0].severite == SeveriteEcart.AVERTISSEMENT
    assert ecarts_b[0].ecart_absolu == Decimal("100.00")
    assert ecarts_b[0].favorable_pharmacien is True


# ==================================================================
# 4. Reclassement generique -> OTC (pattern ADONIS)
# ==================================================================

def test_reclassement_generique_en_otc():
    """
    Pattern classique : on 'glisse' 500 EUR de Tranche A vers OTC.
    -> A declare < calcule (defavorable), OTC declare > calcule (favorable)
    Les deux ecarts sont remontes.
    """
    doc = _doc(5500, 2000, 1500, 9000)   # A = 6000 - 500, OTC = 1000 + 500
    fact = _fact(6000, 2000, 1000, 9000)
    result = TrancheVerifier().verify(doc, fact)

    types = {e.type_ecart for e in result.ecarts}
    assert TypeEcartTranche.MONTANT_TRANCHE_A in types
    assert TypeEcartTranche.MONTANT_OTC in types

    ecart_a = next(e for e in result.ecarts if e.type_ecart == TypeEcartTranche.MONTANT_TRANCHE_A)
    ecart_otc = next(e for e in result.ecarts if e.type_ecart == TypeEcartTranche.MONTANT_OTC)

    # A sous-declare = defavorable
    assert ecart_a.favorable_pharmacien is False
    assert ecart_a.ecart_absolu == Decimal("-500.00")
    # OTC sur-declare = "favorable" technique, mais au global c'est une
    # manipulation : le total est inchange (9000 = 9000).
    assert ecart_otc.favorable_pharmacien is True
    # Impact financier = ecart A seulement (OTC est favorable)
    assert result.impact_financier == Decimal("500.00")


# ==================================================================
# 5. Ecart d'arrondi ignore
# ==================================================================

def test_ecart_arrondi_ignore():
    """|ecart| <= 1 EUR -> pas d'EcartTranche remonte."""
    doc = _doc(6000.50, 2000.30, 1000.20, 9001.00)
    fact = _fact(6000, 2000, 1000, 9000)
    result = TrancheVerifier().verify(doc, fact)

    # Aucun ecart individuel ne franchit le seuil 1 EUR
    assert result.ecarts == []
    assert result.conforme


# ==================================================================
# 6. Impact financier = ecarts defavorables seulement
# ==================================================================

def test_impact_financier_defavorable_seulement():
    """
    A declare moins (-800, defavorable), B declare plus (+200, favorable).
    Impact = 800 (seul l'ecart A compte).
    """
    doc = _doc(5200, 2200, 1000, 8400)
    fact = _fact(6000, 2000, 1000, 9000)
    result = TrancheVerifier().verify(doc, fact)

    # L'ecart defavorable A est compte, pas le favorable B
    assert result.impact_financier == Decimal("800.00") + Decimal("600.00")  # A + total defavorable
    # Explications : les ecarts Total et A sont defavorables ; B est favorable.


# ==================================================================
# 7. Favorable au pharmacien non critique
# ==================================================================

def test_favorable_pharmacien_toujours_remonte():
    """
    Grossiste declare 1000 EUR de plus en A (favorable).
    Malgre l'ampleur, on remonte l'ecart (pour tracabilite) mais
    favorable_pharmacien=True et l'impact financier est nul.
    """
    doc = _doc(7000, 2000, 1000, 10000)
    fact = _fact(6000, 2000, 1000, 9000)
    result = TrancheVerifier().verify(doc, fact)

    ecart_a = next(e for e in result.ecarts if e.type_ecart == TypeEcartTranche.MONTANT_TRANCHE_A)
    assert ecart_a.favorable_pharmacien is True
    assert ecart_a.severite == SeveriteEcart.CRITIQUE  # Ampleur critique...
    # ...mais l'impact financier reste nul car l'ecart est favorable au pharmacien
    assert result.impact_financier == Decimal("0.00")


# ==================================================================
# 8. Scenario ADONIS complet (manipulation sophistiquee)
# ==================================================================

def test_scenario_adonis_manipulation():
    """
    Scenario realiste : sur 50 000 EUR de CA mensuel reel :
      - A reel : 30 000 EUR | declare : 27 000 (manque 3 000, -10 %)   -> CRITIQUE
      - B reel : 15 000 EUR | declare : 17 000 (excedent 2 000, +13 %) -> CRITIQUE
      - OTC reel : 5 000    | declare : 6 000  (excedent 1 000, +20 %) -> CRITIQUE
    Le TOTAL reste identique (50 000) -> pas d'ecart total -> le grossiste
    espere que seul le total est verifie. Impact financier = 3 000 EUR.
    """
    doc = _doc(27000, 17000, 6000, 50000)
    fact = _fact(30000, 15000, 5000, 50000)
    result = TrancheVerifier().verify(doc, fact)

    assert not result.conforme
    assert result.nb_ecarts_critiques == 3  # A, B, OTC critiques

    # Le total est identique -> pas remonte (ecart=0, arrondi)
    types = {e.type_ecart for e in result.ecarts}
    assert TypeEcartTranche.MONTANT_TOTAL not in types
    assert result.ecart_total_absolu == Decimal("0.00")

    # Impact = uniquement A sous-declare (3000)
    assert result.impact_financier == Decimal("3000.00")

    # Les descriptions incluent le signe et le pourcentage
    descs = " ".join(e.description for e in result.ecarts)
    assert "Tranche A" in descs and "Tranche B" in descs and "OTC" in descs
