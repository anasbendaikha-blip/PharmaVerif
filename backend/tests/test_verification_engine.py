"""
Tests de caracterisation pour VerificationEngine.

Objectif : capturer le comportement ACTUEL du moteur des 7 checks
(remises, escompte, franco, RFA progression, gratuites, TVA, arithmetique)
avant refactoring. Les assertions documentent ce que le code fait
aujourd'hui — pas ce qu'il devrait faire dans l'ideal.

Constantes du moteur (extraites de verification_engine.py) :
- TOLERANCE_MONTANT  = 0.02 EUR
- TOLERANCE_TAUX     = 0.5 point de %
- FRANCO_PROXIMITE   = 10% au-dessus du seuil = "info"
- RFA_PROXIMITE      = 10% avant palier suivant = alerte

DB : SQLite in-memory via fixture `db` de conftest.py.
"""

from datetime import date
import pytest

from app.models import User
from app.models_labo import (
    AccordCommercial,
    AnomalieFactureLabo,
    FactureLabo,
    LigneFactureLabo,
    PalierRFA,
)
from app.services.verification_engine import VerificationEngine


# ============================================================
# FIXTURES LOCALES
# ============================================================

@pytest.fixture
def user(db, pharmacy):
    """Utilisateur de test rattache a la pharmacie."""
    u = User(
        email="verif-test@example.com",
        hashed_password="not-a-real-hash",
        nom="Test",
        prenom="User",
        pharmacy_id=pharmacy.id,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def accord(db, laboratoire):
    """Accord commercial standard : remises, escompte, franco, gratuites actifs."""
    a = AccordCommercial(
        laboratoire_id=laboratoire.id,
        nom="Accord Test 2026",
        date_debut=date(2026, 1, 1),
        date_fin=date(2026, 12, 31),
        tranche_a_cible=30.0,
        tranche_b_cible=15.0,
        otc_cible=5.0,
        escompte_pct=2.5,
        escompte_delai_jours=30,
        escompte_applicable=True,
        franco_seuil_ht=300.0,
        franco_frais_port=15.0,
        gratuites_seuil_qte=10,
        gratuites_ratio="10+1",
        gratuites_applicable=True,
        actif=True,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def _make_facture(
    db,
    user,
    laboratoire,
    pharmacy,
    *,
    numero="F-TEST-001",
    date_facture=None,
    montant_brut_ht=500.0,
    montant_net_ht=400.0,
    tranche_a_brut=0.0,
    tranche_a_remise=0.0,
    tranche_b_brut=0.0,
    tranche_b_remise=0.0,
    otc_brut=0.0,
    otc_remise=0.0,
    delai_paiement=None,
):
    """Helper : cree une facture labo minimale."""
    f = FactureLabo(
        user_id=user.id,
        laboratoire_id=laboratoire.id,
        pharmacy_id=pharmacy.id,
        numero_facture=numero,
        date_facture=date_facture or date(2026, 6, 1),
        montant_brut_ht=montant_brut_ht,
        montant_net_ht=montant_net_ht,
        total_remise_facture=max(0.0, montant_brut_ht - montant_net_ht),
        tranche_a_brut=tranche_a_brut,
        tranche_a_remise=tranche_a_remise,
        tranche_b_brut=tranche_b_brut,
        tranche_b_remise=tranche_b_remise,
        otc_brut=otc_brut,
        otc_remise=otc_remise,
        delai_paiement=delai_paiement,
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


def _make_ligne(
    db,
    facture,
    *,
    cip13="3400900000001",
    designation="PARACETAMOL 500MG",
    quantite=1,
    prix_unitaire_ht=10.0,
    remise_pct=0.0,
    prix_unitaire_apres_remise=None,
    montant_ht=None,
    montant_brut=None,
    taux_tva=2.10,
    tranche="A",
):
    """Helper : cree une ligne de facture avec calculs auto si omis."""
    pu_ar = prix_unitaire_apres_remise
    if pu_ar is None:
        pu_ar = round(prix_unitaire_ht * (1 - remise_pct / 100), 4)
    mt_ht = montant_ht if montant_ht is not None else round(pu_ar * quantite, 2)
    mt_brut = montant_brut if montant_brut is not None else round(prix_unitaire_ht * quantite, 2)
    l = LigneFactureLabo(
        facture_id=facture.id,
        cip13=cip13,
        designation=designation,
        quantite=quantite,
        prix_unitaire_ht=prix_unitaire_ht,
        remise_pct=remise_pct,
        prix_unitaire_apres_remise=pu_ar,
        montant_ht=mt_ht,
        taux_tva=taux_tva,
        montant_brut=mt_brut,
        montant_remise=round(mt_brut - mt_ht, 2),
        tranche=tranche,
    )
    db.add(l)
    db.commit()
    db.refresh(l)
    return l


# ============================================================
# CHECK 1 — REMISES PAR TRANCHE
# ============================================================

def test_verification_remises_par_tranche(db, user, laboratoire, pharmacy, accord):
    """
    Cible tranche A = 30%. On fournit 1000 brut / 200 remise = 20% reel.
    Ecart -10 points > TOLERANCE_TAUX (0.5) → une anomalie critical.
    Tranche B : 500 brut / 75 remise = 15% (exact) → aucune anomalie.
    OTC : brut=0 → ignoree.
    """
    facture = _make_facture(
        db, user, laboratoire, pharmacy,
        tranche_a_brut=1000.0, tranche_a_remise=200.0,   # 20% reel vs 30% cible
        tranche_b_brut=500.0, tranche_b_remise=75.0,     # 15% exact
        otc_brut=0.0, otc_remise=0.0,
    )
    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    anomalies = engine._check_remises(facture, accord)

    assert len(anomalies) == 1
    a = anomalies[0]
    assert a.type_anomalie == "remise_ecart"
    assert a.severite == "critical"
    assert "Tranche A" in a.description
    # Ecart monetaire = 1000 * 10 / 100 = 100 EUR
    assert a.montant_ecart == pytest.approx(100.0, abs=0.01)


def test_verification_remises_tolerance_respectee(db, user, laboratoire, pharmacy, accord):
    """
    Ecart exactement a 0.5 → abs(ecart) > TOLERANCE est FAUX (strict >),
    donc aucune anomalie. Caracterisation : la tolerance est stricte.
    """
    # 30.5% reel vs 30% cible → ecart = +0.5
    facture = _make_facture(
        db, user, laboratoire, pharmacy,
        tranche_a_brut=1000.0, tranche_a_remise=305.0,
    )
    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    anomalies = engine._check_remises(facture, accord)
    assert anomalies == []


# ============================================================
# CHECK 2 — ESCOMPTE
# ============================================================

def test_verification_escompte(db, user, laboratoire, pharmacy, accord):
    """
    Escompte 2.5% sur 400 EUR net = 10 EUR. Delai non fourni → suppose compatible
    → une anomalie opportunity "escompte_manquant".
    """
    facture = _make_facture(
        db, user, laboratoire, pharmacy, montant_net_ht=400.0, delai_paiement=None,
    )
    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    anomalies = engine._check_escompte(facture, accord)

    assert len(anomalies) == 1
    a = anomalies[0]
    assert a.type_anomalie == "escompte_manquant"
    assert a.severite == "opportunity"
    assert a.montant_ecart == pytest.approx(10.0, abs=0.01)


def test_verification_escompte_delai_incompatible(db, user, laboratoire, pharmacy, accord):
    """
    Delai paiement "60 jours" > escompte_delai_jours (30) → delai_compatible=False
    → aucune anomalie.
    """
    facture = _make_facture(
        db, user, laboratoire, pharmacy, montant_net_ht=400.0, delai_paiement="60 jours",
    )
    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    assert engine._check_escompte(facture, accord) == []


def test_verification_escompte_non_applicable(db, user, laboratoire, pharmacy, accord):
    """Si escompte_applicable=False → skip immediat."""
    accord.escompte_applicable = False
    db.commit()
    facture = _make_facture(db, user, laboratoire, pharmacy)
    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    assert engine._check_escompte(facture, accord) == []


# ============================================================
# CHECK 3 — FRANCO DE PORT
# ============================================================

def test_verification_franco_de_port(db, user, laboratoire, pharmacy, accord):
    """
    Seuil franco = 300. Brut = 200 → sous le seuil → opportunity
    avec montant_ecart = frais_port (15).
    """
    facture = _make_facture(
        db, user, laboratoire, pharmacy, montant_brut_ht=200.0, montant_net_ht=190.0,
    )
    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    anomalies = engine._check_franco(facture, accord)

    assert len(anomalies) == 1
    a = anomalies[0]
    assert a.type_anomalie == "franco_seuil"
    assert a.severite == "opportunity"
    assert a.montant_ecart == pytest.approx(15.0, abs=0.01)


def test_verification_franco_proximite(db, user, laboratoire, pharmacy, accord):
    """
    Brut = 310 → 10 EUR au-dessus de 300, marge < 300*10% = 30 → info.
    """
    facture = _make_facture(
        db, user, laboratoire, pharmacy, montant_brut_ht=310.0, montant_net_ht=300.0,
        numero="F-FRANCO-PROX",
    )
    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    anomalies = engine._check_franco(facture, accord)

    assert len(anomalies) == 1
    assert anomalies[0].severite == "info"
    assert anomalies[0].montant_ecart == 0.0


def test_verification_franco_au_dessus_du_seuil(db, user, laboratoire, pharmacy, accord):
    """Brut=1000 >> seuil+10% → aucune anomalie."""
    facture = _make_facture(
        db, user, laboratoire, pharmacy, montant_brut_ht=1000.0, montant_net_ht=900.0,
        numero="F-FRANCO-OK",
    )
    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    assert engine._check_franco(facture, accord) == []


# ============================================================
# CHECK 4 — RFA PROGRESSION
# ============================================================

def test_verification_rfa_progression(db, user, laboratoire, pharmacy, accord):
    """
    Paliers : 0-50k (2%), 50k-100k (3%), 100k+ (4%).
    On simule une facture courante de 48k brut en 2026 → cumul annuel = 48k.
    Palier actuel = 0-50k (2%), suivant = 50k (3%).
    Montant restant = 2000, seuil proximite = 50000*10% = 5000.
    → 2000 < 5000 → info "rfa_palier" avec gain_estime = 48000 * 1% = 480.
    """
    # Paliers
    db.add_all([
        PalierRFA(accord_id=accord.id, seuil_min=0, seuil_max=50000, taux_rfa=2.0),
        PalierRFA(accord_id=accord.id, seuil_min=50000, seuil_max=100000, taux_rfa=3.0),
        PalierRFA(accord_id=accord.id, seuil_min=100000, seuil_max=None, taux_rfa=4.0),
    ])
    db.commit()
    db.refresh(accord)

    facture = _make_facture(
        db, user, laboratoire, pharmacy,
        montant_brut_ht=48000.0, montant_net_ht=45000.0,
        date_facture=date(2026, 6, 1),
    )
    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    anomalies = engine._check_rfa_progression(facture, accord)

    assert len(anomalies) == 1
    a = anomalies[0]
    assert a.type_anomalie == "rfa_palier"
    assert a.severite == "info"
    # gain_estime = cumul * (3 - 2) / 100 = 48000 * 0.01 = 480.0
    assert a.montant_ecart == pytest.approx(480.0, abs=0.01)


def test_verification_rfa_sans_paliers(db, user, laboratoire, pharmacy, accord):
    """Accord sans paliers → retour vide immediat."""
    facture = _make_facture(db, user, laboratoire, pharmacy, montant_brut_ht=48000.0)
    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    assert engine._check_rfa_progression(facture, accord) == []


# ============================================================
# CHECK 5 — GRATUITES
# ============================================================

def test_verification_gratuites(db, user, laboratoire, pharmacy, accord):
    """
    Seuil gratuites = 10. Ligne payante CIP=3400...1 quantite 20 → nb_gratuites = 20//10 = 2.
    Aucune ligne gratuite (pu=0) pour ce CIP → opportunity.
    Ligne CIP=...2 quantite 8 < seuil → ignoree.
    montant_gratuite = 2 * 5.0 = 10.0 EUR.
    """
    facture = _make_facture(db, user, laboratoire, pharmacy)
    _make_ligne(
        db, facture,
        cip13="3400900000001", designation="DOLIPRANE 500MG",
        quantite=20, prix_unitaire_ht=5.0, remise_pct=10.0,
    )
    _make_ligne(
        db, facture,
        cip13="3400900000002", designation="EFFERALGAN 1G",
        quantite=8, prix_unitaire_ht=6.0, remise_pct=10.0,
    )
    db.refresh(facture)

    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    anomalies = engine._check_gratuites(facture, accord)

    assert len(anomalies) == 1
    a = anomalies[0]
    assert a.type_anomalie == "gratuite_manquante"
    assert a.severite == "opportunity"
    assert a.montant_ecart == pytest.approx(10.0, abs=0.01)
    assert "DOLIPRANE" in a.description


def test_verification_gratuites_deja_appliquee(db, user, laboratoire, pharmacy, accord):
    """
    Ligne payante + ligne gratuite (pu=0) pour le MEME CIP → cip_gratuits contient
    ce CIP → pas d'anomalie remontee meme si qte >= seuil.
    """
    facture = _make_facture(db, user, laboratoire, pharmacy)
    _make_ligne(
        db, facture, cip13="3400900000001", designation="DOLIPRANE",
        quantite=20, prix_unitaire_ht=5.0,
    )
    _make_ligne(
        db, facture, cip13="3400900000001", designation="DOLIPRANE (gratuit)",
        quantite=2, prix_unitaire_ht=0.0, remise_pct=0.0,
        prix_unitaire_apres_remise=0.0, montant_ht=0.0, montant_brut=0.0,
    )
    db.refresh(facture)

    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    assert engine._check_gratuites(facture, accord) == []


# ============================================================
# CHECK 6 — TVA COHERENCE
# ============================================================

def test_verification_tva_coherence(db, user, laboratoire, pharmacy):
    """
    Deux incoherences :
    - Ligne TVA 2.10% classee OTC → critical
    - Ligne TVA 10% classee A → critical
    Et une ligne normale TVA 2.10% classee A → pas d'anomalie.
    (Ce check n'a pas besoin d'accord.)
    """
    facture = _make_facture(db, user, laboratoire, pharmacy)
    _make_ligne(
        db, facture, cip13="3400900000001", designation="GENERIQUE",
        quantite=1, prix_unitaire_ht=10.0, taux_tva=2.10, tranche="A",
    )
    _make_ligne(
        db, facture, cip13="3400900000002", designation="OTC_MAL_CLASSE",
        quantite=1, prix_unitaire_ht=8.0, taux_tva=2.10, tranche="OTC",
    )
    _make_ligne(
        db, facture, cip13="3400900000003", designation="OTC_EN_A",
        quantite=1, prix_unitaire_ht=12.0, taux_tva=10.0, tranche="A",
    )
    db.refresh(facture)

    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    anomalies = engine._check_tva_coherence(facture)

    assert len(anomalies) == 2
    for a in anomalies:
        assert a.type_anomalie == "tva_incoherence"
        assert a.severite == "critical"


# ============================================================
# CHECK 7 — CALCULS ARITHMETIQUES
# ============================================================

def test_verification_calcul_arithmetique(db, user, laboratoire, pharmacy):
    """
    Ligne volontairement incoherente :
    PU=10, remise 10% → PU_AR attendu = 9.0. On stocke 8.0 → ecart 1.0 > 0.02.
    → Check 1 "PU apres remise" declenche.
    De plus, PU_AR stocke 8.0 * qte 5 = 40.0, mais on stocke montant_ht = 45.0
    → ecart 5 → Check 2 "montant HT" declenche.
    montant_brut : on aligne 10*5=50 → OK.
    → 2 anomalies critical au total.
    """
    facture = _make_facture(db, user, laboratoire, pharmacy)
    _make_ligne(
        db, facture,
        cip13="3400900000001", designation="PRODUIT BUG",
        quantite=5,
        prix_unitaire_ht=10.0,
        remise_pct=10.0,
        prix_unitaire_apres_remise=8.0,   # devrait etre 9.0
        montant_ht=45.0,                   # devrait etre 40.0 (8*5) ou 45 (9*5)
        montant_brut=50.0,                 # 10*5 = 50 → OK
        taux_tva=2.10, tranche="A",
    )
    db.refresh(facture)

    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    anomalies = engine._check_arithmetic(facture)

    assert len(anomalies) == 2
    types = {a.type_anomalie for a in anomalies}
    assert types == {"calcul_arithmetique"}
    for a in anomalies:
        assert a.severite == "critical"


def test_verification_calcul_arithmetique_coherent(db, user, laboratoire, pharmacy):
    """Ligne coherente → zero anomalie."""
    facture = _make_facture(db, user, laboratoire, pharmacy)
    _make_ligne(
        db, facture,
        cip13="3400900000001", designation="PARACETAMOL",
        quantite=10, prix_unitaire_ht=2.50, remise_pct=20.0,
        # pu_ar = 2.0, mt_ht = 20.0, mt_brut = 25.0 (auto)
    )
    db.refresh(facture)

    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    assert engine._check_arithmetic(facture) == []


# ============================================================
# INTEGRATION — FACTURE BIOGARAN COMPLETE
# ============================================================

def test_verification_complete_facture_biogaran(db, user, laboratoire, pharmacy, accord):
    """
    Facture Biogaran realiste : 10 lignes, genériques TVA 2.10% (tranche A/B)
    et OTC TVA 10%. Les 7 checks doivent s'executer sans erreur et produire
    une liste d'anomalies (eventuellement vide).

    On utilise `verify()` (orchestrateur) en passant l'accord explicitement
    pour eviter la requete `_get_accord`.
    """
    # Quelques paliers RFA pour que check_rfa_progression ait du grain a moudre
    db.add(PalierRFA(accord_id=accord.id, seuil_min=0, seuil_max=50000, taux_rfa=2.0))
    db.add(PalierRFA(accord_id=accord.id, seuil_min=50000, seuil_max=None, taux_rfa=3.0))
    db.commit()
    db.refresh(accord)

    # Facture avec montants globaux coherents (cible A=30%, B=15%, OTC=5%)
    facture = _make_facture(
        db, user, laboratoire, pharmacy,
        numero="BIOG-2026-0001",
        montant_brut_ht=600.0,
        montant_net_ht=420.0,
        tranche_a_brut=400.0, tranche_a_remise=120.0,   # 30% exact
        tranche_b_brut=150.0, tranche_b_remise=22.5,     # 15% exact
        otc_brut=50.0, otc_remise=2.5,                   # 5% exact
        delai_paiement="30 jours",
    )

    # 10 lignes : 6 generiques tranche A, 2 tranche B, 2 OTC
    lignes_data = [
        # (cip, nom, qte, pu, remise%, tva, tranche)
        ("3400930000001", "PARACETAMOL 500MG BGR",    40, 2.50, 30.0,  2.10, "A"),
        ("3400930000002", "IBUPROFENE 400MG BGR",      20, 3.00, 30.0,  2.10, "A"),
        ("3400930000003", "AMOXICILLINE 1G BGR",       15, 4.00, 30.0,  2.10, "A"),
        ("3400930000004", "METFORMINE 1000 BGR",       10, 2.00, 30.0,  2.10, "A"),
        ("3400930000005", "OMEPRAZOLE 20 BGR",         10, 1.80, 30.0,  2.10, "A"),
        ("3400930000006", "ATORVASTATINE 20 BGR",       8, 3.50, 30.0,  2.10, "A"),
        ("3400930000007", "KETOPROFENE GEL BGR",        5, 6.00, 15.0,  2.10, "B"),
        ("3400930000008", "DICLOFENAC 50 BGR",          5, 5.00, 15.0,  2.10, "B"),
        ("3400930000009", "VITAMINE D3 OTC",            3, 8.00,  5.0, 10.00, "OTC"),
        ("3400930000010", "MAGNESIUM MARIN OTC",        2, 9.00,  5.0, 10.00, "OTC"),
    ]
    for cip, nom, qte, pu, rem, tva, tr in lignes_data:
        _make_ligne(
            db, facture,
            cip13=cip, designation=nom, quantite=qte,
            prix_unitaire_ht=pu, remise_pct=rem, taux_tva=tva, tranche=tr,
        )
    db.refresh(facture)

    engine = VerificationEngine(db, pharmacy_id=pharmacy.id)
    anomalies = engine.verify(facture, accord=accord)

    # Les 7 checks doivent tourner sans lever d'exception.
    assert isinstance(anomalies, list)
    # Caracterisation : l'escompte est toujours remonte (opportunity)
    # car escompte_applicable=True, delai "30 jours" = escompte_delai_jours.
    types_detectes = {a.type_anomalie for a in anomalies}
    assert "escompte_manquant" in types_detectes

    # Toutes les remises de tranche sont a la cible exacte → aucun remise_ecart.
    assert "remise_ecart" not in types_detectes

    # Brut 600 > seuil 300*1.1 = 330 → pas de franco anomaly.
    assert "franco_seuil" not in types_detectes

    # TVA/tranche coherents partout → pas d'incoherence.
    assert "tva_incoherence" not in types_detectes

    # Les calculs sont auto-generes coherents → pas d'erreur arithmetique.
    assert "calcul_arithmetique" not in types_detectes
