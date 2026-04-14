"""
PharmaVerif - Parser Factur-X (EN 16931 / ZUGFeRD).

Factur-X est le format de facture electronique obligatoire en France a partir
de septembre 2026. Le fichier PDF contient un XML embarque (factur-x.xml) avec
TOUTES les donnees structurees : fini l'OCR et le scraping de mise en page.

Profils supportes :
  - MINIMUM        : identifiants + totaux (pas de lignes)
  - BASIC          : + lignes de facture
  - EN16931/COMFORT: + remises, lots, conditions de paiement
  - EXTENDED       : champs additionnels (intentionnellement non utilises ici)

Sortie normalisee : retourne le meme `ParsedInvoice` que les autres parsers
(Biogaran, GenericParser) pour compatibilite directe avec verification_engine.

ZERO dependance SQLAlchemy / FastAPI.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import List, Optional
from xml.etree import ElementTree as ET

from app.domain.parsing.base import BaseInvoiceParser
from app.domain.parsing.models import (
    FournisseurInfo,
    LigneFacture,
    MetadonneeFacture,
    ParsedInvoice,
    TotauxFacture,
    TvaDetail,
    WarningInfo,
)


# ------------------------------------------------------------------
# Namespaces CII (Cross Industry Invoice) — Factur-X / ZUGFeRD
# ------------------------------------------------------------------
NS = {
    "rsm": "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
    "ram": "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
    "udt": "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
    "qdt": "urn:un:unece:uncefact:data:standard:QualifiedDataType:100",
}


class FacturXError(Exception):
    """Erreur de parsing Factur-X (XML absent ou invalide)."""


def has_embedded_facturx(pdf_path: str | Path) -> bool:
    """
    Retourne True si le PDF contient un XML Factur-X embarque.

    Utilise par `factory.detect_supplier()` en priorite maximale : si un PDF
    est Factur-X, aucun parsing OCR/pdfplumber n'est tente.
    """
    try:
        from facturx import get_xml_from_pdf
    except ImportError:
        return False
    try:
        _, xml_bytes = get_xml_from_pdf(str(pdf_path))
        return xml_bytes is not None and len(xml_bytes) > 0
    except Exception:
        return False


class FacturXParser(BaseInvoiceParser):
    """Parser Factur-X : XML embarque -> ParsedInvoice normalise."""

    PARSER_ID = "facturx"
    PARSER_NAME = "Factur-X (EN 16931)"
    PARSER_VERSION = "1.0.0"
    FOURNISSEUR_TYPE = "laboratoire"  # Generalise, mis a jour a l'extraction
    DETECTION_KEYWORDS = []            # Detection par presence XML, pas mots-cles

    # Score de confiance eleve : donnees structurees, pas d'OCR.
    CONFIANCE = 0.95

    # ==================================================================
    # Methodes abstraites heritees de BaseInvoiceParser
    # ==================================================================
    # Factur-X ne passe pas par le pipeline pdfplumber (pas de PDF text a
    # scrapper : tout est dans le XML). On stubbe ces methodes pour
    # satisfaire l'ABC mais on surcharge entierement `parse()`.

    def extract_header(self, pdf):
        raise NotImplementedError(
            "FacturXParser n'utilise pas le pipeline pdfplumber. "
            "Utiliser parse() ou parse_xml_bytes()."
        )

    def extract_lines(self, pdf):
        raise NotImplementedError(
            "FacturXParser n'utilise pas le pipeline pdfplumber. "
            "Utiliser parse() ou parse_xml_bytes()."
        )

    # ==================================================================
    # Points d'entree
    # ==================================================================

    def parse(self, pdf_path: str) -> ParsedInvoice:
        """Pipeline : extraction XML -> parse CII -> ParsedInvoice."""
        xml_bytes = self._extract_xml(pdf_path)
        return self.parse_xml_bytes(xml_bytes)

    def parse_xml_bytes(self, xml_bytes: bytes) -> ParsedInvoice:
        """Variante directe quand on a deja le XML (utile pour tests)."""
        try:
            root = ET.fromstring(xml_bytes)
        except ET.ParseError as e:
            raise FacturXError(f"XML Factur-X invalide : {e}") from e
        return self._parse_root(root)

    def parse_xml_file(self, xml_path: str | Path) -> ParsedInvoice:
        """Variante fichier (tests avec fixtures XML)."""
        xml_bytes = Path(xml_path).read_bytes()
        return self.parse_xml_bytes(xml_bytes)

    # ==================================================================
    # Extraction du XML depuis le PDF
    # ==================================================================

    @staticmethod
    def _extract_xml(pdf_path: str) -> bytes:
        try:
            from facturx import get_xml_from_pdf
        except ImportError as e:
            raise FacturXError(
                "La bibliotheque `factur-x` n'est pas installee. "
                "Installer via `pip install factur-x`."
            ) from e
        try:
            _, xml_bytes = get_xml_from_pdf(str(pdf_path))
        except Exception as e:
            raise FacturXError(f"Impossible de lire le PDF : {e}") from e
        if not xml_bytes:
            raise FacturXError(
                f"Aucun XML Factur-X trouve dans {pdf_path} (PDF non Factur-X ?)"
            )
        return xml_bytes

    # ==================================================================
    # Parsing CII -> ParsedInvoice
    # ==================================================================

    def _parse_root(self, root: ET.Element) -> ParsedInvoice:
        metadata = self._extract_metadata(root)
        fournisseur = self._extract_fournisseur(root)
        lignes = self._extract_lignes(root)
        totaux = self._extract_totaux(root)
        warnings = self._validate(metadata, lignes, totaux)

        invoice = ParsedInvoice(
            fournisseur=fournisseur,
            metadata=metadata,
            lignes=lignes,
            totaux=totaux,
            warnings=warnings,
        )

        # Recalculer totaux si non fournis par le XML (profil Minimum)
        if invoice.totaux.net_ht == 0.0 and invoice.lignes:
            invoice.compute_totaux()

        # Analyse par tranche
        invoice.compute_tranches(
            cible_a=self.cible_tranche_a,
            cible_b=self.cible_tranche_b,
        )
        return invoice

    # ---------------- Fournisseur / Acheteur ----------------

    def _extract_fournisseur(self, root: ET.Element) -> FournisseurInfo:
        seller = root.find(".//ram:SellerTradeParty", NS)
        nom = self._text(seller, "ram:Name") or "Inconnu"
        return FournisseurInfo(
            nom=nom,
            type="laboratoire",        # par defaut, ajustable ulterieurement
            detecte_auto=True,
            parser_id=self.PARSER_ID,
            confiance=self.CONFIANCE,
        )

    # ---------------- Metadonnees ----------------

    def _extract_metadata(self, root: ET.Element) -> MetadonneeFacture:
        numero = self._text(root, ".//rsm:ExchangedDocument/ram:ID") or ""
        date_str = self._text(
            root,
            ".//rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString",
        )
        date_facture = self._parse_date_102(date_str)

        buyer = root.find(".//ram:BuyerTradeParty", NS)
        acheteur_nom = self._text(buyer, "ram:Name") or ""

        # Conditions de paiement (optionnel, profil Basic+)
        pay_terms = root.find(".//ram:SpecifiedTradePaymentTerms", NS)
        delai_paiement = self._text(pay_terms, "ram:Description") if pay_terms is not None else ""

        return MetadonneeFacture(
            numero_facture=numero,
            date_facture=date_facture or "",
            nom_client=acheteur_nom,
            delai_paiement=delai_paiement or "",
        )

    # ---------------- Lignes ----------------

    def _extract_lignes(self, root: ET.Element) -> List[LigneFacture]:
        lignes: List[LigneFacture] = []
        for line_item in root.findall(
            ".//ram:IncludedSupplyChainTradeLineItem", NS
        ):
            ligne = self._parse_line_item(line_item)
            if ligne is not None:
                lignes.append(ligne)
        return lignes

    def _parse_line_item(self, item: ET.Element) -> Optional[LigneFacture]:
        product = item.find("ram:SpecifiedTradeProduct", NS)
        agreement = item.find("ram:SpecifiedLineTradeAgreement", NS)
        delivery = item.find("ram:SpecifiedLineTradeDelivery", NS)
        settlement = item.find("ram:SpecifiedLineTradeSettlement", NS)

        # CIP13 (GlobalID avec schemeID="0160" = GTIN-13)
        cip13 = ""
        if product is not None:
            global_id = product.find("ram:GlobalID", NS)
            if global_id is not None and (global_id.get("schemeID") in ("0160", "GTIN")):
                cip13 = (global_id.text or "").strip()

        designation = (
            self._text(product, "ram:Name") if product is not None else ""
        ) or ""

        # Quantite
        quantite = 0
        if delivery is not None:
            qty_text = self._text(delivery, "ram:BilledQuantity")
            if qty_text:
                try:
                    quantite = int(Decimal(qty_text))
                except InvalidOperation:
                    quantite = 0

        # Prix unitaire HT (NetPriceProductTradePrice > ChargeAmount)
        prix_unitaire = 0.0
        if agreement is not None:
            price = self._decimal(
                agreement,
                ".//ram:NetPriceProductTradePrice/ram:ChargeAmount",
            )
            prix_unitaire = float(price)

        # TVA (ApplicableTradeTax > RateApplicablePercent)
        tva = 0.0
        if settlement is not None:
            tva_dec = self._decimal(
                settlement,
                ".//ram:ApplicableTradeTax/ram:RateApplicablePercent",
            )
            tva = float(tva_dec)

        # Remises (SpecifiedTradeAllowanceCharge, ChargeIndicator=false)
        remise_pct = 0.0
        remise_montant = 0.0
        if settlement is not None:
            for allowance in settlement.findall(
                "ram:SpecifiedTradeAllowanceCharge", NS
            ):
                indicator = self._text(
                    allowance, "ram:ChargeIndicator/udt:Indicator"
                )
                if indicator is not None and indicator.strip().lower() == "false":
                    pct = self._decimal(allowance, "ram:CalculationPercent")
                    amt = self._decimal(allowance, "ram:ActualAmount")
                    if pct > 0:
                        remise_pct = float(pct)
                    if amt > 0:
                        remise_montant = float(amt)

        # Montant ligne (LineTotalAmount)
        montant_ht = 0.0
        if settlement is not None:
            montant_ht = float(self._decimal(
                settlement,
                ".//ram:SpecifiedTradeSettlementLineMonetarySummation/ram:LineTotalAmount",
            ))

        # Calculs derives
        prix_ar = round(prix_unitaire * (1 - remise_pct / 100), 4) if remise_pct > 0 else prix_unitaire

        ligne = LigneFacture(
            cip13=cip13,
            designation=designation.strip(),
            quantite=quantite,
            prix_unitaire_ht=round(prix_unitaire, 4),
            remise_pct=round(remise_pct, 2),
            prix_unitaire_apres_remise=prix_ar,
            montant_ht=round(montant_ht, 2),
            taux_tva=round(tva, 2),
        )
        # __post_init__ calcule montant_brut, montant_remise, categorie/tranche.
        return ligne

    # ---------------- Totaux ----------------

    def _extract_totaux(self, root: ET.Element) -> TotauxFacture:
        summary = root.find(
            ".//ram:SpecifiedTradeSettlementHeaderMonetarySummation", NS
        )
        totaux = TotauxFacture()
        if summary is None:
            return totaux

        totaux.brut_ht = float(self._decimal(
            summary, "ram:LineTotalAmount"
        )) or 0.0
        totaux.net_ht = float(self._decimal(
            summary, "ram:TaxBasisTotalAmount"
        )) or 0.0
        totaux.remises = float(self._decimal(
            summary, "ram:AllowanceTotalAmount"
        )) or 0.0
        totaux.ttc = float(self._decimal(
            summary, "ram:GrandTotalAmount"
        )) or None
        totaux.total_tva = float(self._decimal(
            summary, "ram:TaxTotalAmount"
        )) or None

        # TVA par taux depuis header (ApplicableTradeTax)
        tva_list: List[TvaDetail] = []
        for tt in root.findall(
            ".//ram:ApplicableHeaderTradeSettlement/ram:ApplicableTradeTax", NS
        ):
            taux = self._decimal(tt, "ram:RateApplicablePercent")
            base = self._decimal(tt, "ram:BasisAmount")
            mt = self._decimal(tt, "ram:CalculatedAmount")
            if taux > 0 or base > 0:
                tva_list.append(TvaDetail(
                    taux=float(taux),
                    base_ht=float(base),
                    montant_tva=float(mt),
                ))
        if tva_list:
            totaux.tva = tva_list
        return totaux

    # ---------------- Validation ----------------

    @staticmethod
    def _validate(
        metadata: MetadonneeFacture,
        lignes: List[LigneFacture],
        totaux: TotauxFacture,
    ) -> List[WarningInfo]:
        warnings: List[WarningInfo] = []
        if not metadata.numero_facture:
            warnings.append(WarningInfo(
                type="warning", message="Numero de facture absent du XML."
            ))
        if not lignes and totaux.net_ht == 0.0:
            warnings.append(WarningInfo(
                type="warning",
                message="Profil MINIMUM detecte : aucune ligne ni total — "
                        "verification limitee aux identifiants.",
            ))
        # Coherence HT <-> sum lignes (tolerance 0.02)
        if lignes and totaux.net_ht > 0:
            sum_lignes = round(sum(l.montant_ht for l in lignes), 2)
            if abs(sum_lignes - totaux.net_ht) > 0.02:
                warnings.append(WarningInfo(
                    type="alignment",
                    message=(
                        f"Ecart entre somme des lignes ({sum_lignes} EUR) et "
                        f"TaxBasisTotalAmount ({totaux.net_ht} EUR)."
                    ),
                ))
        return warnings

    # ==================================================================
    # Helpers XML
    # ==================================================================

    @staticmethod
    def _text(element: Optional[ET.Element], xpath: str) -> Optional[str]:
        if element is None:
            return None
        el = element.find(xpath, NS)
        return el.text if (el is not None and el.text is not None) else None

    @classmethod
    def _decimal(cls, element: Optional[ET.Element], xpath: str) -> Decimal:
        text = cls._text(element, xpath)
        if not text:
            return Decimal("0")
        try:
            return Decimal(text.strip())
        except InvalidOperation:
            return Decimal("0")

    @staticmethod
    def _parse_date_102(date_str: Optional[str]) -> Optional[str]:
        """Format 102 = YYYYMMDD. Retourne une date ISO."""
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str.strip(), "%Y%m%d").date().isoformat()
        except ValueError:
            return date_str


__all__ = [
    "FacturXError",
    "FacturXParser",
    "has_embedded_facturx",
    "NS",
]
