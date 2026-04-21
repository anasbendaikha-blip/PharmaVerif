"""
PharmaVerif — Verificateur par tranches (domain).

Mode operatoire :
  1. Recevoir le document de tranche declare par le grossiste (DocumentTrancheInput)
  2. Recevoir les factures du mois agregees par PharmaVerif (FacturesMoisInput)
  3. Comparer chaque tranche + le total -> liste d'EcartTranche classes par severite
  4. Composer un TrancheVerificationResult avec synthese et impact financier

INSIGHT ADONIS : les grossistes manipulent les documents de tranche pour
minimiser leur RFA a payer. Les mecanismes typiques (par ordre de frequence) :
  - Sous-declaration Tranche A (remise haute) : moins de RFA
  - Sur-declaration Tranche B (remise basse)  : RFA plus faible
  - Reclassement generique -> OTC             : hors scope RFA
  - Arrondis systematiquement defavorables

Seuils (tunables via les constantes de module) :
  CRITIQUE      : |ecart| > 5 %  ET  > 50 EUR
  AVERTISSEMENT : |ecart| > 1 %  ET  > 10 EUR
  MINEUR        : 1 EUR < |ecart| (sinon arrondi ignore)
"""

from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

from app.domain.tranche.inputs import DocumentTrancheInput, FacturesMoisInput
from app.domain.tranche.models import (
    EcartTranche,
    SeveriteEcart,
    TrancheVerificationResult,
    TypeEcartTranche,
)


# ------------------------------------------------------------------
# Seuils de detection
# ------------------------------------------------------------------
SEUIL_CRITIQUE_PCT = Decimal("5.0")
SEUIL_CRITIQUE_ABS = Decimal("50.0")
SEUIL_AVERTISSEMENT_PCT = Decimal("1.0")
SEUIL_AVERTISSEMENT_ABS = Decimal("10.0")
# Ecarts <= cette valeur sont consideres comme de l'arrondi et ignores.
SEUIL_ARRONDI = Decimal("1.0")


def _q2(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _q1(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


class TrancheVerifier:
    """Compare le document de tranche grossiste aux factures recalculees."""

    def verify(
        self,
        document: DocumentTrancheInput,
        factures: FacturesMoisInput,
    ) -> TrancheVerificationResult:
        """
        Execute la verification complete. Les comparaisons portent sur les
        4 montants (A, B, OTC, total). Chaque ecart hors arrondi est remonte
        avec sa severite et son sens (favorable / defavorable au pharmacien).
        """
        result = TrancheVerificationResult(
            grossiste=document.grossiste,
            mois=document.mois.strftime("%Y-%m"),
        )

        comparisons = [
            (TypeEcartTranche.MONTANT_TRANCHE_A, "Tranche A",
             document.montant_tranche_a_declare, factures.montant_tranche_a_calcule),
            (TypeEcartTranche.MONTANT_TRANCHE_B, "Tranche B",
             document.montant_tranche_b_declare, factures.montant_tranche_b_calcule),
            (TypeEcartTranche.MONTANT_OTC, "OTC",
             document.montant_otc_declare, factures.montant_otc_calcule),
            (TypeEcartTranche.MONTANT_TOTAL, "Total",
             document.montant_total_declare, factures.montant_total_calcule),
        ]

        for type_ecart, label, declare, calcule in comparisons:
            ecart = self._compare(type_ecart, label, declare, calcule)
            if ecart is None:
                continue
            result.ecarts.append(ecart)
            if ecart.severite == SeveriteEcart.CRITIQUE:
                result.nb_ecarts_critiques += 1
                result.conforme = False
            elif ecart.severite == SeveriteEcart.AVERTISSEMENT:
                result.nb_ecarts_avertissement += 1

            # Impact financier : uniquement les ecarts DEFAVORABLES au pharmacien
            # (grossiste declare MOINS qu'attendu -> RFA minoree).
            if not ecart.favorable_pharmacien:
                result.impact_financier += abs(ecart.ecart_absolu)

        # Synthese globale sur le total
        if factures.montant_total_calcule > 0:
            result.ecart_total_absolu = _q2(
                document.montant_total_declare - factures.montant_total_calcule
            )
            result.ecart_total_pct = _q1(
                abs(result.ecart_total_absolu)
                / factures.montant_total_calcule
                * Decimal("100")
            )
        result.impact_financier = _q2(result.impact_financier)
        return result

    # ------------------------------------------------------------------
    # Comparaison unitaire
    # ------------------------------------------------------------------

    @staticmethod
    def _compare(
        type_ecart: TypeEcartTranche,
        label: str,
        declare: Decimal,
        calcule: Decimal,
    ) -> Optional[EcartTranche]:
        """
        Compare un couple (declare, calcule) et retourne un EcartTranche si
        l'ecart franchit les seuils, sinon None.
        """
        ecart = declare - calcule
        abs_ecart = abs(ecart)

        if abs_ecart <= SEUIL_ARRONDI:
            return None  # Arrondi normal, on ignore

        # Ratio : si calcule == 0, on prend 100 % (declare quelque chose alors
        # qu'on n'a rien calcule, c'est forcement un delta au moins critique).
        if calcule == Decimal("0"):
            ecart_pct = Decimal("100")
        else:
            ecart_pct = abs_ecart / calcule * Decimal("100")

        # Severite
        if abs_ecart > SEUIL_CRITIQUE_ABS and ecart_pct > SEUIL_CRITIQUE_PCT:
            severite = SeveriteEcart.CRITIQUE
        elif abs_ecart > SEUIL_AVERTISSEMENT_ABS and ecart_pct > SEUIL_AVERTISSEMENT_PCT:
            severite = SeveriteEcart.AVERTISSEMENT
        else:
            severite = SeveriteEcart.MINEUR

        # Sens de l'ecart : declare > calcule -> le grossiste paie plus -> favorable.
        favorable = ecart > Decimal("0")

        signe = "+" if ecart > 0 else ""
        description = (
            f"{label} : grossiste declare {_q2(declare)} EUR, "
            f"PharmaVerif calcule {_q2(calcule)} EUR "
            f"(ecart {signe}{_q2(ecart)} EUR, {_q1(ecart_pct)} %)."
        )

        return EcartTranche(
            type_ecart=type_ecart,
            severite=severite,
            description=description,
            montant_declare=_q2(declare),
            montant_calcule=_q2(calcule),
            ecart_absolu=_q2(ecart),
            ecart_pct=_q1(ecart_pct),
            favorable_pharmacien=favorable,
        )
