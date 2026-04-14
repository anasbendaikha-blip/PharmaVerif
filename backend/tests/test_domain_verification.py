"""
Tests de parite pour le nouveau moteur domain de verification.

Replique les scenarios de test_verification_engine.py en utilisant
des FactureInput (dataclasses pures) au lieu de modeles SQLAlchemy.

Aucune fixture `db` n'est necessaire : le domain est 100% pur.
"""

from datetime import date
from decimal import Decimal

from app.domain.verification import (
    ConditionsCommercialesInput,
    FactureInput,
    LigneFactureInput,
    PalierRFAInput,
    Severite,
    TypeVerification,
    VerificationEngine,
)


def _make_facture(**overrides) -> FactureInput:
    defaults = dict(
        numero="F-TEST-001",
        date_facture=date(2026, 6, 1),
        laboratoire_nom="BiogaranTest",
        montant_brut_ht=Decimal("500"),
        montant_net_ht=Decimal("400"),
    )
    defaults.update(overrides)
    return FactureInput(**defaults)


def _accord(**overrides) -> ConditionsCommercialesInput:
    defaults = dict(
        tranche_a_cible=Decimal("30"),
        tranche_b_cible=Decimal("15"),
        otc_cible=Decimal("5"),
        escompte_applicable=True,
        escompte_pct=Decimal("2.5"),
        escompte_delai_jours=30,
        franco_seuil_ht=Decimal("300"),
        franco_frais_port=Decimal("15"),
        gratuites_applicable=True,
        gratuites_seuil_qte=10,
        gratuites_ratio="10+1",
    )
    defaults.update(overrides)
    return ConditionsCommercialesInput(**defaults)


def _ligne(**kw) -> LigneFactureInput:
    pu = kw.pop("prix_unitaire", Decimal("10"))
    rem = kw.pop("remise_pct", Decimal("0"))
    qte = kw.pop("quantite", 1)
    pu_ar = kw.pop("prix_unitaire_apres_remise", pu * (Decimal("1") - rem / Decimal("100")))
    mt_ht = kw.pop("montant_ht", (pu_ar * Decimal(qte)).quantize(Decimal("0.01")))
    mt_brut = kw.pop("montant_brut", (pu * Decimal(qte)).quantize(Decimal("0.01")))
    defaults = dict(
        cip13="3400900000001",
        designation="PARACETAMOL 500MG",
        quantite=qte,
        prix_unitaire=pu,
        prix_unitaire_apres_remise=pu_ar,
        remise_pct=rem,
        montant_ht=mt_ht,
        montant_brut=mt_brut,
        tva_taux=Decimal("2.10"),
        tranche="A",
    )
    defaults.update(kw)
    return LigneFactureInput(**defaults)


# ============================================================
# 1. REMISES PAR TRANCHE
# ============================================================

def test_remises_ecart_critique():
    """1000 brut / 200 remise = 20% reel vs 30% cible → CRITIQUE, impact 100€."""
    f = _make_facture(
        tranche_a_brut=Decimal("1000"), tranche_a_remise=Decimal("200"),
        tranche_b_brut=Decimal("500"), tranche_b_remise=Decimal("75"),  # 15% exact
        conditions=_accord(),
    )
    r = VerificationEngine().verify(f)
    crit = [a for a in r.anomalies if a.type_verification == TypeVerification.REMISES_TRANCHE]
    assert len(crit) == 1
    assert crit[0].severite == Severite.CRITIQUE
    assert crit[0].montant_impact == Decimal("100.00")


def test_remises_tolerance_stricte():
    """Ecart exactement 0.5 points → non declenche (strict >)."""
    f = _make_facture(
        tranche_a_brut=Decimal("1000"), tranche_a_remise=Decimal("305"),  # 30.5%
        conditions=_accord(),
    )
    r = VerificationEngine().verify(f)
    assert not any(a.type_verification == TypeVerification.REMISES_TRANCHE for a in r.anomalies)


# ============================================================
# 2. ESCOMPTE
# ============================================================

def test_escompte_opportunity():
    """Escompte 2.5% sur 400 = 10€ → OPTIMISATION."""
    f = _make_facture(montant_net_ht=Decimal("400"), conditions=_accord())
    r = VerificationEngine().verify(f)
    esc = [a for a in r.optimisations if a.type_verification == TypeVerification.ESCOMPTE]
    assert len(esc) == 1
    assert esc[0].severite == Severite.OPTIMISATION
    assert esc[0].montant_impact == Decimal("10.00")


def test_escompte_delai_incompatible():
    """Delai "60 jours" > 30 → pas d'anomalie."""
    f = _make_facture(
        montant_net_ht=Decimal("400"), delai_paiement="60 jours", conditions=_accord(),
    )
    r = VerificationEngine().verify(f)
    assert not any(a.type_verification == TypeVerification.ESCOMPTE for a in r.optimisations)


# ============================================================
# 3. FRANCO DE PORT
# ============================================================

def test_franco_sous_seuil_opportunity():
    f = _make_facture(
        montant_brut_ht=Decimal("200"), montant_net_ht=Decimal("190"),
        conditions=_accord(),
    )
    r = VerificationEngine().verify(f)
    fr = [a for a in r.optimisations if a.type_verification == TypeVerification.FRANCO_PORT]
    assert len(fr) == 1
    assert fr[0].montant_impact == Decimal("15.00")


def test_franco_proximite_info():
    """Brut 310 → marge 10 < 30 (10% de 300) → INFO."""
    f = _make_facture(
        montant_brut_ht=Decimal("310"), montant_net_ht=Decimal("300"),
        conditions=_accord(),
    )
    r = VerificationEngine().verify(f)
    fr = [a for a in r.anomalies if a.type_verification == TypeVerification.FRANCO_PORT]
    assert len(fr) == 1
    assert fr[0].severite == Severite.INFO
    assert fr[0].montant_impact == Decimal("0.00")


# ============================================================
# 4. RFA PROGRESSION
# ============================================================

def test_rfa_progression_proche_palier():
    """
    Cumul 48 000, palier suivant a 50 000 (delta 3% - 2% = 1%).
    Gain = 48000 * 0.01 = 480.
    """
    cond = _accord(
        paliers_rfa=[
            PalierRFAInput(seuil_min=Decimal("0"), seuil_max=Decimal("50000"), taux_rfa=Decimal("2.0")),
            PalierRFAInput(seuil_min=Decimal("50000"), seuil_max=Decimal("100000"), taux_rfa=Decimal("3.0")),
        ],
        cumul_rfa_annuel=Decimal("48000"),
    )
    f = _make_facture(
        montant_brut_ht=Decimal("48000"), montant_net_ht=Decimal("45000"),
        conditions=cond,
    )
    r = VerificationEngine().verify(f)
    rfa = [a for a in r.anomalies if a.type_verification == TypeVerification.RFA_PROGRESSION]
    assert len(rfa) == 1
    assert rfa[0].severite == Severite.INFO
    assert rfa[0].montant_impact == Decimal("480.00")


# ============================================================
# 5. GRATUITES
# ============================================================

def test_gratuites_manquantes():
    """Ligne qte 20, seuil 10 → 2 gratuites attendues a 5€ = 10€ opportunity."""
    cond = _accord()
    f = _make_facture(
        conditions=cond,
        lignes=[
            _ligne(cip13="3400900000001", designation="DOLIPRANE",
                   quantite=20, prix_unitaire=Decimal("5"), remise_pct=Decimal("10")),
            _ligne(cip13="3400900000002", designation="EFFERALGAN",
                   quantite=8, prix_unitaire=Decimal("6"), remise_pct=Decimal("10")),
        ],
    )
    r = VerificationEngine().verify(f)
    gr = [a for a in r.optimisations if a.type_verification == TypeVerification.GRATUITES]
    assert len(gr) == 1
    assert gr[0].montant_impact == Decimal("10.00")
    assert "DOLIPRANE" in gr[0].description


def test_gratuites_deja_appliquee():
    """Ligne payante + ligne gratuite (PU=0) meme CIP → pas d'anomalie."""
    cond = _accord()
    f = _make_facture(
        conditions=cond,
        lignes=[
            _ligne(cip13="3400900000001", designation="DOLIPRANE",
                   quantite=20, prix_unitaire=Decimal("5")),
            _ligne(cip13="3400900000001", designation="DOLIPRANE (gratuit)",
                   quantite=2, prix_unitaire=Decimal("0"),
                   prix_unitaire_apres_remise=Decimal("0"),
                   montant_ht=Decimal("0"), montant_brut=Decimal("0")),
        ],
    )
    r = VerificationEngine().verify(f)
    assert not any(a.type_verification == TypeVerification.GRATUITES for a in r.optimisations)


# ============================================================
# 6. TVA COHERENCE
# ============================================================

def test_tva_coherence_incoherences():
    """Une ligne TVA 2.10% classee OTC + une ligne TVA 10% classee A → 2 CRITIQUES."""
    f = _make_facture(
        lignes=[
            _ligne(cip13="3400900000001", designation="OK", tva_taux=Decimal("2.10"), tranche="A"),
            _ligne(cip13="3400900000002", designation="OTC_MAL_CLASSE",
                   tva_taux=Decimal("2.10"), tranche="OTC"),
            _ligne(cip13="3400900000003", designation="OTC_EN_A",
                   tva_taux=Decimal("10"), tranche="A"),
        ],
    )
    r = VerificationEngine().verify(f)
    tva = [a for a in r.anomalies if a.type_verification == TypeVerification.TVA_COHERENCE]
    assert len(tva) == 2
    assert all(a.severite == Severite.CRITIQUE for a in tva)


# ============================================================
# 7. CALCUL ARITHMETIQUE
# ============================================================

def test_calcul_arithmetique_incoherent():
    """
    PU=10, remise 10% → PU_AR attendu 9 (on stocke 8) → check 1 CRITIQUE.
    PU_AR stocke 8 * qte 5 = 40 (on stocke 45) → check 2 CRITIQUE.
    PU 10 * qte 5 = 50 (on stocke 50) → check 3 OK.
    """
    f = _make_facture(
        lignes=[_ligne(
            cip13="3400900000001", designation="BUG",
            quantite=5, prix_unitaire=Decimal("10"), remise_pct=Decimal("10"),
            prix_unitaire_apres_remise=Decimal("8"),
            montant_ht=Decimal("45"),
            montant_brut=Decimal("50"),
        )],
    )
    r = VerificationEngine().verify(f)
    calc = [a for a in r.anomalies if a.type_verification == TypeVerification.CALCUL_ARITHMETIQUE]
    assert len(calc) == 2
    assert all(a.severite == Severite.CRITIQUE for a in calc)


def test_calcul_arithmetique_coherent():
    f = _make_facture(
        lignes=[_ligne(quantite=10, prix_unitaire=Decimal("2.50"), remise_pct=Decimal("20"))],
    )
    r = VerificationEngine().verify(f)
    assert not any(a.type_verification == TypeVerification.CALCUL_ARITHMETIQUE for a in r.anomalies)


# ============================================================
# INTEGRATION
# ============================================================

def test_integration_facture_biogaran_complete():
    """
    Facture realiste (10 lignes) : aucun write impact, juste un escompte remonte
    en opportunity. Verifie que le moteur tourne bout-en-bout.
    """
    lignes_data = [
        ("3400930000001", "PARACETAMOL 500MG BGR",   40, Decimal("2.50"), Decimal("30"), Decimal("2.10"), "A"),
        ("3400930000002", "IBUPROFENE 400MG BGR",    20, Decimal("3.00"), Decimal("30"), Decimal("2.10"), "A"),
        ("3400930000003", "AMOXICILLINE 1G BGR",     15, Decimal("4.00"), Decimal("30"), Decimal("2.10"), "A"),
        ("3400930000004", "METFORMINE 1000 BGR",     10, Decimal("2.00"), Decimal("30"), Decimal("2.10"), "A"),
        ("3400930000005", "OMEPRAZOLE 20 BGR",       10, Decimal("1.80"), Decimal("30"), Decimal("2.10"), "A"),
        ("3400930000006", "ATORVASTATINE 20 BGR",     8, Decimal("3.50"), Decimal("30"), Decimal("2.10"), "A"),
        ("3400930000007", "KETOPROFENE GEL BGR",      5, Decimal("6.00"), Decimal("15"), Decimal("2.10"), "B"),
        ("3400930000008", "DICLOFENAC 50 BGR",        5, Decimal("5.00"), Decimal("15"), Decimal("2.10"), "B"),
        ("3400930000009", "VITAMINE D3 OTC",          3, Decimal("8.00"), Decimal("5"),  Decimal("10"),  "OTC"),
        ("3400930000010", "MAGNESIUM MARIN OTC",      2, Decimal("9.00"), Decimal("5"),  Decimal("10"),  "OTC"),
    ]
    lignes = [
        _ligne(cip13=c, designation=d, quantite=q, prix_unitaire=pu,
               remise_pct=rem, tva_taux=tva, tranche=tr)
        for (c, d, q, pu, rem, tva, tr) in lignes_data
    ]
    f = _make_facture(
        numero="BIOG-2026-0001",
        montant_brut_ht=Decimal("600"), montant_net_ht=Decimal("420"),
        tranche_a_brut=Decimal("400"), tranche_a_remise=Decimal("120"),   # 30% exact
        tranche_b_brut=Decimal("150"), tranche_b_remise=Decimal("22.5"),  # 15% exact
        otc_brut=Decimal("50"), otc_remise=Decimal("2.5"),                # 5% exact
        delai_paiement="30 jours",
        lignes=lignes,
        conditions=_accord(),
    )

    result = VerificationEngine().verify(f)

    # Escompte reste la seule opportunite (net_ht 420 * 2.5% = 10.50)
    esc = [a for a in result.optimisations if a.type_verification == TypeVerification.ESCOMPTE]
    assert len(esc) == 1
    assert esc[0].montant_impact == Decimal("10.50")

    # Aucune anomalie critique
    assert not result.has_critical
    # Telemetrie du moteur
    assert result.nombre_verifications == 7
    assert result.duree_ms > 0
