"""
PharmaVerif — Verificateur EMAC (domain).

Triangulaire : EMAC declare <-> factures reelles <-> conditions negociees.

Aligne sur EMAC.statut_verification + anomalies_emac du modele SQLAlchemy :
  - ecart_ca           : CA declare vs CA reel (factures)
  - ecart_rfa          : RFA declaree vs RFA attendue (conditions)
  - ecart_cop          : COP declaree vs COP attendue
  - ecart_total_avantages : somme des declarations vs attendu global

Seuils (identiques a la logique legacy : conforme si ecart CA < 1%) :
  - TOLERANCE_MONETAIRE : 1 EUR (arrondi acceptable)
  - TOLERANCE_RATIO     : 1 % (seuil "conforme")
  - SEUIL_ALERTE        : 10 EUR ou ratio > 5 % => seuil_alerte=True

ZERO dependance SQLAlchemy / FastAPI / DB.
"""

from decimal import ROUND_HALF_UP, Decimal

from app.domain.emac.inputs import EMACInput, FacturesRefInput
from app.domain.emac.models import EcartEMAC, EMACVerificationResult


TOLERANCE_MONETAIRE = Decimal("1.00")   # < 1 EUR = arrondi OK
TOLERANCE_RATIO_PCT = Decimal("1.0")    # < 1 % = conforme
SEUIL_ALERTE_EUR = Decimal("10.00")     # > 10 EUR = seuil_alerte
SEUIL_ALERTE_PCT = Decimal("5.0")       # > 5 %  = seuil_alerte


def _q2(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class EMACVerifier:
    """Verifie la coherence d'un EMAC avec la realite des factures/conditions."""

    def verify(
        self, emac: EMACInput, factures_ref: FacturesRefInput
    ) -> EMACVerificationResult:
        """
        Compare l'EMAC declare aux factures/conditions et produit un
        EMACVerificationResult avec un EcartEMAC par type d'anomalie detecte.
        """
        result = EMACVerificationResult(
            emac_id=emac.emac_id,
            periode=f"{emac.periode_debut.isoformat()} → {emac.periode_fin.isoformat()}",
            nombre_factures_considerees=factures_ref.nombre_factures,
        )

        # ---- ecart_ca ----
        self._check_ecart(
            result=result, type_ecart="ecart_ca",
            description="CA declare EMAC vs CA reel des factures",
            attendu=factures_ref.ca_reel, declare=emac.ca_declare,
        )

        # ---- ecart_rfa ----
        self._check_ecart(
            result=result, type_ecart="ecart_rfa",
            description="RFA declaree EMAC vs RFA attendue selon conditions",
            attendu=factures_ref.rfa_attendue, declare=emac.rfa_declaree,
        )

        # ---- ecart_cop (seulement si attendu > 0 ou declare > 0) ----
        if factures_ref.cop_attendue > 0 or emac.cop_declaree > 0:
            self._check_ecart(
                result=result, type_ecart="ecart_cop",
                description="COP declaree EMAC vs COP attendue selon conditions",
                attendu=factures_ref.cop_attendue, declare=emac.cop_declaree,
            )

        # ---- Synthese globale ----
        # "Attendu" = reference totale (ca reel pour info, RFA + COP pour cumul)
        total_attendu = _q2(factures_ref.rfa_attendue + factures_ref.cop_attendue)
        total_declare = _q2(
            emac.rfa_declaree + emac.cop_declaree
            + emac.remises_differees_declarees + emac.autres_avantages
        )
        result.montant_total_attendu = total_attendu
        result.montant_total_declare = total_declare
        result.ecart_total = _q2(total_attendu - total_declare)
        # Conforme si aucun ecart franchit la tolerance
        result.conforme = len(result.ecarts) == 0

        return result

    # -----------------------------------------------------------

    @staticmethod
    def _check_ecart(
        *,
        result: EMACVerificationResult,
        type_ecart: str,
        description: str,
        attendu: Decimal,
        declare: Decimal,
    ) -> None:
        """
        Ajoute un EcartEMAC au result si |attendu - declare| franchit la
        tolerance (> 1 EUR absolu et > 1 % relatif). `seuil_alerte` marque
        les cas "serieux" (> 10 EUR OU > 5 %).
        """
        ecart = _q2(attendu - declare)
        if abs(ecart) <= TOLERANCE_MONETAIRE:
            return  # arrondi, ignore

        ratio_pct = Decimal("0")
        if attendu != 0:
            ratio_pct = (abs(ecart) / abs(attendu) * Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

        if ratio_pct <= TOLERANCE_RATIO_PCT and attendu != 0:
            return  # ecart < 1 %, considere comme conforme

        seuil_alerte = abs(ecart) > SEUIL_ALERTE_EUR or ratio_pct > SEUIL_ALERTE_PCT

        result.ecarts.append(EcartEMAC(
            type_ecart=type_ecart,
            description=f"{description} : ecart {ecart} EUR ({ratio_pct}%).",
            montant_attendu=_q2(attendu),
            montant_declare=_q2(declare),
            ecart=ecart,
            seuil_alerte=seuil_alerte,
            details={"ratio_pct": float(ratio_pct)},
        ))
