"""
Tests du parser Factur-X (domain).

Teste le parsing XML uniquement (pas le PDF) — les PDF Factur-X reels sont
testes via une fixture PDF si besoin, mais l'essentiel (parser CII) est
validable sur les fixtures XML.

Aucune fixture DB : le parser est 100% pur.
"""

from pathlib import Path

import pytest

from app.domain.parsing.facturx import (
    FacturXError,
    FacturXParser,
    has_embedded_facturx,
)
from app.domain.parsing.models import ParsedInvoice


FIXTURES = Path(__file__).parent / "fixtures" / "facturx"


# ------------------------------------------------------------------
# 1. Profile BASIC (avec lignes, remises, TVA multiple)
# ------------------------------------------------------------------

def test_parse_facturx_basic_profile():
    """Parse un XML Basic complet et produit un ParsedInvoice conforme."""
    parser = FacturXParser()
    invoice = parser.parse_xml_file(FIXTURES / "biogaran_basic.xml")

    assert isinstance(invoice, ParsedInvoice)
    assert invoice.metadata.numero_facture == "BIOG-2026-0042"
    assert invoice.metadata.date_facture == "2026-04-15"
    assert invoice.fournisseur.nom == "Biogaran"
    assert invoice.fournisseur.parser_id == "facturx"
    assert invoice.metadata.nom_client == "Pharmacie des Coquelicots"
    assert invoice.metadata.delai_paiement == "30 jours net"
    assert invoice.nb_lignes == 4


# ------------------------------------------------------------------
# 2. Profile MINIMUM (pas de lignes, totaux seuls)
# ------------------------------------------------------------------

def test_parse_facturx_minimum_profile():
    """Profile MINIMUM : numero + totaux, aucune ligne."""
    parser = FacturXParser()
    invoice = parser.parse_xml_file(FIXTURES / "minimum_profile.xml")

    assert invoice.metadata.numero_facture == "MIN-2026-001"
    assert invoice.metadata.date_facture == "2026-01-01"
    assert invoice.fournisseur.nom == "Teva Sante"
    assert invoice.nb_lignes == 0
    assert invoice.totaux.net_ht == 1000.00
    assert invoice.totaux.ttc == 1021.00
    # Profile MINIMUM : pas de lignes mais totaux ok — pas de warning MINIMUM
    # (le warning est reserve aux profiles sans totaux non plus).


# ------------------------------------------------------------------
# 3. Extraction CIP13 depuis GlobalID schemeID="0160"
# ------------------------------------------------------------------

def test_extract_cip13_from_global_id():
    """Le CIP13 est extrait du GlobalID avec schemeID='0160'."""
    parser = FacturXParser()
    invoice = parser.parse_xml_file(FIXTURES / "biogaran_basic.xml")

    cip13s = [l.cip13 for l in invoice.lignes]
    assert cip13s == [
        "3400930000001",
        "3400930000002",
        "3400930000003",
        "3400930000009",
    ]


# ------------------------------------------------------------------
# 4. TVA par ligne (2.10% generiques + 10% OTC)
# ------------------------------------------------------------------

def test_extract_tva_par_ligne():
    """Les taux TVA sont correctement extraits par ligne."""
    parser = FacturXParser()
    invoice = parser.parse_xml_file(FIXTURES / "biogaran_basic.xml")

    # 3 lignes TVA 2.10, 1 ligne TVA 10
    tvas = [l.taux_tva for l in invoice.lignes]
    assert tvas.count(2.10) == 3
    assert tvas.count(10.00) == 1

    # Classification automatique (LigneFacture.__post_init__)
    tranches = [l.tranche for l in invoice.lignes]
    assert tranches.count("A") == 2        # remise 30% > seuil 2.5%
    assert tranches.count("B") == 1        # remise 2% <= seuil
    assert tranches.count("OTC") == 1      # TVA != 2.10


# ------------------------------------------------------------------
# 5. Remises (pourcentage + montant)
# ------------------------------------------------------------------

def test_extract_remises():
    """Les remises pourcentage et montant sont extraites."""
    parser = FacturXParser()
    invoice = parser.parse_xml_file(FIXTURES / "biogaran_basic.xml")

    para = next(l for l in invoice.lignes if l.cip13 == "3400930000001")
    assert para.remise_pct == 30.00
    assert para.montant_remise == 30.00
    assert para.prix_unitaire_ht == 2.50
    assert para.quantite == 40
    # Montant brut = 40 * 2.50 = 100.00
    assert para.montant_brut == 100.00
    # Montant HT (net apres remise) = 70.00 (extrait direct du XML)
    assert para.montant_ht == 70.00

    # OTC sans remise
    vita = next(l for l in invoice.lignes if l.cip13 == "3400930000009")
    assert vita.remise_pct == 0.0


# ------------------------------------------------------------------
# 6. Totaux coherents
# ------------------------------------------------------------------

def test_totaux_coherents():
    """Les totaux XML sont correctement repercutes."""
    parser = FacturXParser()
    invoice = parser.parse_xml_file(FIXTURES / "biogaran_basic.xml")

    assert invoice.totaux.brut_ht == 213.00
    assert invoice.totaux.remises == 48.60
    assert invoice.totaux.net_ht == 165.40
    assert invoice.totaux.ttc == 170.77
    # TVA multi-taux
    taux_list = sorted(t.taux for t in invoice.totaux.tva)
    assert taux_list == [2.10, 10.00]


# ------------------------------------------------------------------
# 7. Score de confiance eleve (>=0.90)
# ------------------------------------------------------------------

def test_score_confiance_eleve():
    """Factur-X beneficie d'une confiance elevee (donnees structurees)."""
    parser = FacturXParser()
    invoice = parser.parse_xml_file(FIXTURES / "biogaran_basic.xml")
    assert invoice.fournisseur.confiance >= 0.90
    assert invoice.fournisseur.parser_id == "facturx"


# ------------------------------------------------------------------
# 8. Erreurs : XML invalide / PDF sans XML
# ------------------------------------------------------------------

def test_xml_invalide_leve_erreur_explicite():
    """Un XML mal forme leve FacturXError clair."""
    parser = FacturXParser()
    with pytest.raises(FacturXError, match="invalide"):
        parser.parse_xml_bytes(b"<?xml version=1.0 not well-formed")


def test_has_embedded_facturx_sur_pdf_sans_xml(tmp_path):
    """Un PDF minimaliste sans XML embarque retourne False."""
    # Pas de dep PDF stricte : on teste juste que la fonction ne crash pas
    # quand le fichier n'existe pas (retour False silencieux).
    fake = tmp_path / "inexistant.pdf"
    assert has_embedded_facturx(str(fake)) is False


def test_parse_pdf_sans_xml_leve_erreur(tmp_path):
    """parse() sur un PDF sans XML embarque leve FacturXError."""
    parser = FacturXParser()
    fake = tmp_path / "pas_un_pdf.pdf"
    fake.write_bytes(b"%PDF-1.4 fake content\n%%EOF")
    with pytest.raises(FacturXError):
        parser.parse(str(fake))


# ------------------------------------------------------------------
# 9. Analyse par tranche calculee automatiquement
# ------------------------------------------------------------------

def test_compute_tranches_appele():
    """Apres parsing, l'analyse par tranche est remplie."""
    parser = FacturXParser()
    invoice = parser.parse_xml_file(FIXTURES / "biogaran_basic.xml")

    # Au moins les tranches presentes dans les lignes
    assert "A" in invoice.tranches
    assert "B" in invoice.tranches
    assert "OTC" in invoice.tranches
    # Tranche A = lignes 1 + 2 = 100 + 60 = 160 brut
    assert invoice.tranches["A"].nb_lignes == 2
    assert invoice.tranches["A"].montant_brut == 160.00


# ------------------------------------------------------------------
# 10. Factory : FacturXParser enregistre
# ------------------------------------------------------------------

def test_factory_registry_contient_facturx():
    """La factory enregistre FacturXParser en priorite."""
    from app.domain.parsing.factory import PARSER_REGISTRY
    assert FacturXParser in PARSER_REGISTRY
    # Doit etre en premier pour la priorite Factur-X
    assert PARSER_REGISTRY[0] is FacturXParser


def test_factory_get_parser_par_id():
    """get_parser('facturx') retourne une instance FacturXParser."""
    from app.domain.parsing.factory import get_parser
    parser = get_parser("facturx")
    assert isinstance(parser, FacturXParser)
