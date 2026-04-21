"""
PharmaVerif — Calculateur RFA (domain).

Logique PURE, zero dependance SQLAlchemy / FastAPI / DB.

---

Classification CORRIGEE (spec Mustafa, mars 2026) :
  - TRANCHE_A : TVA == tva_generique (2.10%) + remise  > seuil  (typ. > 2.5%)
                → taux RFA eleve (typ. 55%)
  - TRANCHE_B : TVA == tva_generique (2.10%) + remise <= seuil  (typ. <= 2.5%)
                → taux RFA bas (typ. 25%)
  - OTC       : TVA != tva_generique
                → taux OTC (typ. 57% deja integre dans la remise facture)

Cette classification CORRIGE l'inversion A/B du moteur legacy
(cf tests/test_rebate_engine_characterization.py).

---

Formule CORRECTE :
  montant_rfa_ligne = montant_net_ht * taux_rfa / 100
(PAS : (taux_cible - taux_remise) * montant_brut_ht, ancien bug refute
par test_formule_rfa_est_taux_fois_net_pas_difference).

---

Aucun taux hardcode : tout vient de l'AccordRebateInput.
"""

from decimal import ROUND_HALF_UP, Decimal

from app.domain.rebate.inputs import AccordRebateInput, LigneFactureRebateInput
from app.domain.rebate.models import LigneRebate, RebateResult, TrancheType


def _q2(x: Decimal) -> Decimal:
    """Arrondi monetaire a 2 decimales, half-up."""
    return x.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class RebateCalculator:
    """
    Calcule les RFA pour une facture selon un accord commercial.

    Usage :
        calc = RebateCalculator()
        result = calc.calculate(lignes, accord)
    """

    # ----- Classification -----

    def classify_ligne(
        self, ligne: LigneFactureRebateInput, accord: AccordRebateInput
    ) -> TrancheType:
        """
        Regle de classification (spec corrigee) :
          1) TVA != generique          → OTC
          2) remise > seuil            → TRANCHE_A (remise haute)
          3) remise <= seuil           → TRANCHE_B (remise basse)

        Note : le seuil est strict (>), le cas "remise == seuil" tombe en B.
        Cette convention est identique au legacy pour le tie-break, seul
        le nommage A/B est corrige.
        """
        if ligne.taux_tva != accord.tva_generique:
            return TrancheType.OTC
        if ligne.taux_remise > accord.seuil_remise:
            return TrancheType.TRANCHE_A
        return TrancheType.TRANCHE_B

    @staticmethod
    def _taux_pour_tranche(tranche: TrancheType, accord: AccordRebateInput) -> Decimal:
        if tranche == TrancheType.TRANCHE_A:
            return accord.taux_tranche_a
        if tranche == TrancheType.TRANCHE_B:
            return accord.taux_tranche_b
        if tranche == TrancheType.OTC:
            return accord.taux_otc
        return Decimal("0")

    # ----- Calcul -----

    def calculate(
        self,
        lignes: list[LigneFactureRebateInput],
        accord: AccordRebateInput,
    ) -> RebateResult:
        """
        Calcule les RFA pour toutes les lignes de la facture.

        Les taux sont pris dans `accord`. Le calculateur ne connait AUCUNE
        valeur par defaut : si un taux est a 0 dans l'accord, la RFA le sera.
        """
        result = RebateResult(
            accord_id=accord.accord_id,
            accord_nom=accord.accord_nom,
        )

        for ligne in lignes:
            tranche = self.classify_ligne(ligne, accord)
            taux_rfa = self._taux_pour_tranche(tranche, accord)

            # Formule correcte : RFA = net_ht * taux / 100
            montant_rfa = _q2(ligne.montant_net_ht * taux_rfa / Decimal("100"))

            result.lignes.append(LigneRebate(
                cip13=ligne.cip13,
                designation=ligne.designation,
                tranche=tranche,
                montant_net_ht=ligne.montant_net_ht,
                taux_remise=ligne.taux_remise,
                taux_rfa=taux_rfa,
                montant_rfa=montant_rfa,
                tva_taux=ligne.taux_tva,
            ))

            # Accumulation par tranche
            if tranche == TrancheType.TRANCHE_A:
                result.total_tranche_a += ligne.montant_net_ht
                result.rfa_tranche_a += montant_rfa
                result.nombre_lignes_eligible += 1
            elif tranche == TrancheType.TRANCHE_B:
                result.total_tranche_b += ligne.montant_net_ht
                result.rfa_tranche_b += montant_rfa
                result.nombre_lignes_eligible += 1
            elif tranche == TrancheType.OTC:
                result.total_otc += ligne.montant_net_ht
                result.rfa_otc += montant_rfa
                result.nombre_lignes_otc += 1

        # Quantize les accumulateurs
        result.total_tranche_a = _q2(result.total_tranche_a)
        result.total_tranche_b = _q2(result.total_tranche_b)
        result.total_otc = _q2(result.total_otc)
        result.rfa_tranche_a = _q2(result.rfa_tranche_a)
        result.rfa_tranche_b = _q2(result.rfa_tranche_b)
        result.rfa_otc = _q2(result.rfa_otc)

        # Synthese :
        #   - total_rfa_due  = RFA A + RFA B  (OTC deja integre dans la facture)
        #   - deja_percu     = RFA OTC (remise de facture) + portion immediate de A/B
        #   - remontee       = total_rfa_due - deja_percu (hors OTC)
        result.total_rfa_due = _q2(result.rfa_tranche_a + result.rfa_tranche_b)

        immediat_ab = _q2(
            result.total_rfa_due * accord.versement_immediat_pct / Decimal("100")
        )
        result.deja_percu = _q2(result.rfa_otc + immediat_ab)
        result.remontee = _q2(result.total_rfa_due - immediat_ab)

        return result
