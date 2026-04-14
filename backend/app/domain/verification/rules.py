"""
PharmaVerif — Regles de verification (domain).

Une classe par check. Chaque regle est :
  - independante (pas d'etat partage),
  - testable unitairement (entree = FactureInput, sortie = tuple),
  - sans dependance SQLAlchemy / FastAPI / DB.

La logique reprend TRAIT POUR TRAIT celle de
backend/app/services/verification_engine.py, y compris les bugs et conventions
connus (tolerance stricte, severites, etc.). La refactorisation se fera en
phase 1-3 une fois la parite validee par les tests.
"""

import re
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Optional

from app.domain.verification.inputs import (
    ConditionsCommercialesInput,
    FactureInput,
    LigneFactureInput,
    PalierRFAInput,
)
from app.domain.verification.models import (
    Anomalie,
    ElementConforme,
    Severite,
    TypeVerification,
)

# ------------------------------------------------------------------
# Tolerances metier (identiques au moteur legacy)
# ------------------------------------------------------------------
TOLERANCE_MONTANT = Decimal("0.02")   # +/- 0.02 EUR sur les calculs
TOLERANCE_TAUX = Decimal("0.5")       # +/- 0.5 point de %
FRANCO_PROXIMITE_PCT = Decimal("10")  # 10% au-dessus du seuil = "info"
RFA_PROXIMITE_PCT = Decimal("10")     # 10% avant palier = alerte


def _q2(value: Decimal) -> Decimal:
    """Arrondi standard a 2 decimales (half-up via quantize natif)."""
    return value.quantize(Decimal("0.01"))


class RegleVerification(ABC):
    """Interface commune a toutes les regles."""

    @abstractmethod
    def type_verification(self) -> TypeVerification: ...

    @abstractmethod
    def verify(
        self, facture: FactureInput
    ) -> tuple[list[Anomalie], list[ElementConforme]]: ...


# ==================================================================
# CHECK 1 — REMISES PAR TRANCHE
# ==================================================================

class RegleRemisesParTranche(RegleVerification):
    """
    Compare le taux de remise reel a la cible pour A, B, OTC.
    Ecart > TOLERANCE_TAUX (strict) => CRITIQUE.
    """

    def type_verification(self) -> TypeVerification:
        return TypeVerification.REMISES_TRANCHE

    def verify(self, facture):
        anomalies: list[Anomalie] = []
        conformes: list[ElementConforme] = []
        c = facture.conditions
        if c is None:
            return anomalies, conformes

        tranches = [
            ("A", facture.tranche_a_brut, facture.tranche_a_remise, c.tranche_a_cible),
            ("B", facture.tranche_b_brut, facture.tranche_b_remise, c.tranche_b_cible),
            ("OTC", facture.otc_brut, facture.otc_remise, c.otc_cible),
        ]

        for nom, brut, remise, cible in tranches:
            if brut is None or brut <= 0:
                continue
            if remise is None or cible is None:
                continue

            taux_reel = (remise / brut * Decimal("100")).quantize(Decimal("0.01"))
            ecart = (taux_reel - cible).quantize(Decimal("0.01"))

            if abs(ecart) > TOLERANCE_TAUX:
                montant_ecart = _q2(abs(brut * ecart / Decimal("100")))
                direction = "inferieur" if ecart < 0 else "superieur"
                anomalies.append(Anomalie(
                    type_verification=TypeVerification.REMISES_TRANCHE,
                    severite=Severite.CRITIQUE,
                    description=(
                        f"Tranche {nom} : taux de remise reel ({taux_reel}%) "
                        f"{direction} a la cible ({cible}%). "
                        f"Ecart de {abs(ecart)} points."
                    ),
                    montant_impact=montant_ecart,
                    action_suggeree=(
                        f"Verifier les remises de la tranche {nom} avec le laboratoire. "
                        f"Ecart de {montant_ecart} EUR sur un brut de {_q2(brut)} EUR."
                    ),
                    details={
                        "tranche": nom, "brut": float(brut), "remise": float(remise),
                        "taux_reel": float(taux_reel), "cible": float(cible),
                        "ecart_points": float(ecart),
                    },
                ))
            else:
                conformes.append(ElementConforme(
                    type_verification=TypeVerification.REMISES_TRANCHE,
                    description=f"Tranche {nom} conforme ({taux_reel}% / cible {cible}%).",
                    details={"tranche": nom, "taux_reel": float(taux_reel)},
                ))

        return anomalies, conformes


# ==================================================================
# CHECK 2 — ESCOMPTE
# ==================================================================

class RegleEscompte(RegleVerification):
    """
    Si escompte applicable et delai de paiement compatible :
      opportunite (OPTIMISATION) a hauteur de net_ht * pct / 100.
    """

    _delai_regex = re.compile(r"(\d+)")

    def type_verification(self) -> TypeVerification:
        return TypeVerification.ESCOMPTE

    def verify(self, facture):
        anomalies: list[Anomalie] = []
        conformes: list[ElementConforme] = []
        c = facture.conditions
        if c is None or not c.escompte_applicable or c.escompte_pct <= 0:
            return anomalies, conformes

        escompte_montant = _q2(facture.montant_net_ht * c.escompte_pct / Decimal("100"))
        if escompte_montant <= 0:
            return anomalies, conformes

        delai_compatible = True
        if facture.delai_paiement:
            m = self._delai_regex.search(str(facture.delai_paiement))
            if m:
                if int(m.group(1)) > c.escompte_delai_jours:
                    delai_compatible = False

        if not delai_compatible:
            return anomalies, conformes

        anomalies.append(Anomalie(
            type_verification=TypeVerification.ESCOMPTE,
            severite=Severite.OPTIMISATION,
            description=(
                f"Escompte de {c.escompte_pct}% disponible "
                f"(paiement sous {c.escompte_delai_jours} jours). "
                f"Economie potentielle : {escompte_montant} EUR."
            ),
            montant_impact=escompte_montant,
            action_suggeree=(
                f"Payer cette facture sous {c.escompte_delai_jours} jours pour "
                f"beneficier de {escompte_montant} EUR d'escompte."
            ),
            details={
                "escompte_pct": float(c.escompte_pct),
                "delai_jours": c.escompte_delai_jours,
                "net_ht": float(facture.montant_net_ht),
            },
        ))
        return anomalies, conformes


# ==================================================================
# CHECK 3 — FRANCO DE PORT
# ==================================================================

class RegleFrancoDePort(RegleVerification):
    """
    Sous seuil franco                      => OPTIMISATION (frais de port potentiels).
    Juste au-dessus du seuil (marge < 10%) => INFO (marge etroite).
    """

    def type_verification(self) -> TypeVerification:
        return TypeVerification.FRANCO_PORT

    def verify(self, facture):
        anomalies: list[Anomalie] = []
        conformes: list[ElementConforme] = []
        c = facture.conditions
        if c is None or c.franco_seuil_ht <= 0:
            return anomalies, conformes

        brut = facture.montant_brut_ht
        seuil = c.franco_seuil_ht

        if brut < seuil:
            manque = _q2(seuil - brut)
            anomalies.append(Anomalie(
                type_verification=TypeVerification.FRANCO_PORT,
                severite=Severite.OPTIMISATION,
                description=(
                    f"Montant brut HT ({_q2(brut)} EUR) inferieur au seuil franco "
                    f"({_q2(seuil)} EUR). Frais de port potentiels : "
                    f"{_q2(c.franco_frais_port)} EUR."
                ),
                montant_impact=_q2(c.franco_frais_port),
                action_suggeree=(
                    f"Il manque {manque} EUR pour atteindre le franco. "
                    f"Consolider avec d'autres commandes pour eviter "
                    f"{_q2(c.franco_frais_port)} EUR de frais de port."
                ),
                details={
                    "brut_ht": float(brut), "seuil": float(seuil),
                    "manque": float(manque),
                },
            ))
        else:
            marge = brut - seuil
            seuil_proximite = seuil * FRANCO_PROXIMITE_PCT / Decimal("100")
            if marge < seuil_proximite:
                anomalies.append(Anomalie(
                    type_verification=TypeVerification.FRANCO_PORT,
                    severite=Severite.INFO,
                    description=(
                        f"Commande juste au-dessus du seuil franco "
                        f"({_q2(brut)} EUR / seuil {_q2(seuil)} EUR). "
                        f"Marge de {_q2(marge)} EUR."
                    ),
                    montant_impact=Decimal("0.00"),
                    action_suggeree=(
                        f"Marge faible ({_q2(marge)} EUR) au-dessus du seuil franco. "
                        f"Un avoir/retour pourrait faire passer sous le seuil."
                    ),
                    details={"brut_ht": float(brut), "marge": float(marge)},
                ))
            else:
                conformes.append(ElementConforme(
                    type_verification=TypeVerification.FRANCO_PORT,
                    description=f"Franco largement atteint (brut {_q2(brut)} / seuil {_q2(seuil)}).",
                ))

        return anomalies, conformes


# ==================================================================
# CHECK 4 — RFA PROGRESSION
# ==================================================================

class RegleRFAProgression(RegleVerification):
    """
    Alerte si proche du palier RFA suivant (montant_restant <= 10% du seuil).
    Gain estime = cumul * delta_taux / 100.
    Le cumul annuel vient des conditions (precalcule par l'infra).
    """

    def type_verification(self) -> TypeVerification:
        return TypeVerification.RFA_PROGRESSION

    @staticmethod
    def _current_next(
        paliers: list[PalierRFAInput], cumul: Decimal
    ) -> tuple[Optional[PalierRFAInput], Optional[PalierRFAInput]]:
        actuel: Optional[PalierRFAInput] = None
        suivant: Optional[PalierRFAInput] = None
        for i, p in enumerate(paliers):
            if cumul >= p.seuil_min:
                if p.seuil_max is None or cumul < p.seuil_max:
                    actuel = p
                    if i + 1 < len(paliers):
                        suivant = paliers[i + 1]
                    break
            else:
                suivant = p
                break
        return actuel, suivant

    def verify(self, facture):
        anomalies: list[Anomalie] = []
        conformes: list[ElementConforme] = []
        c = facture.conditions
        if c is None or not c.paliers_rfa:
            return anomalies, conformes

        paliers = sorted(c.paliers_rfa, key=lambda p: p.seuil_min)
        cumul = c.cumul_rfa_annuel
        actuel, suivant = self._current_next(paliers, cumul)

        if suivant is None:
            return anomalies, conformes

        restant = suivant.seuil_min - cumul
        seuil_prox = suivant.seuil_min * RFA_PROXIMITE_PCT / Decimal("100")

        if restant <= seuil_prox and restant > 0:
            taux_actuel = actuel.taux_rfa if actuel else Decimal("0")
            delta = suivant.taux_rfa - taux_actuel
            gain = _q2(cumul * delta / Decimal("100"))
            pct = Decimal("100") if suivant.seuil_min <= 0 else min(
                Decimal("100"),
                (cumul / suivant.seuil_min * Decimal("100")).quantize(Decimal("0.1"))
            )
            anomalies.append(Anomalie(
                type_verification=TypeVerification.RFA_PROGRESSION,
                severite=Severite.INFO,
                description=(
                    f"Progression RFA : {_q2(cumul)} EUR / palier suivant a "
                    f"{_q2(suivant.seuil_min)} EUR "
                    f"({suivant.description or str(suivant.taux_rfa) + '%'}). "
                    f"Reste {_q2(restant)} EUR ({pct}%)."
                ),
                montant_impact=gain,
                action_suggeree=(
                    f"Plus que {_q2(restant)} EUR pour atteindre "
                    f"{suivant.taux_rfa}% (vs {taux_actuel}% actuel). "
                    f"Gain estime : {gain} EUR de RFA supplementaire."
                ),
                details={
                    "cumul": float(cumul),
                    "seuil_suivant": float(suivant.seuil_min),
                    "taux_actuel": float(taux_actuel),
                    "taux_suivant": float(suivant.taux_rfa),
                },
            ))
        return anomalies, conformes


# ==================================================================
# CHECK 5 — GRATUITES
# ==================================================================

class RegleGratuites(RegleVerification):
    """
    Pour chaque ligne payante avec qte >= seuil, verifier qu'une ligne
    gratuite pour le meme CIP est presente (prix=0 OU remise>=100%).
    Sinon opportunity chiffree a nb_gratuites * pu.
    """

    def type_verification(self) -> TypeVerification:
        return TypeVerification.GRATUITES

    def verify(self, facture):
        anomalies: list[Anomalie] = []
        conformes: list[ElementConforme] = []
        c = facture.conditions
        if c is None or not c.gratuites_applicable or c.gratuites_seuil_qte <= 0:
            return anomalies, conformes

        cips_gratuits = {
            l.cip13 for l in facture.lignes
            if l.prix_unitaire == 0 or l.remise_pct >= Decimal("100")
        }

        for ligne in facture.lignes:
            if ligne.prix_unitaire <= 0 or ligne.remise_pct >= Decimal("100"):
                continue
            if ligne.quantite < c.gratuites_seuil_qte:
                continue
            if ligne.cip13 in cips_gratuits:
                continue

            nb = ligne.quantite // c.gratuites_seuil_qte
            montant = _q2(Decimal(nb) * ligne.prix_unitaire)
            anomalies.append(Anomalie(
                type_verification=TypeVerification.GRATUITES,
                severite=Severite.OPTIMISATION,
                description=(
                    f"Gratuite manquante pour {ligne.designation} (CIP: {ligne.cip13}). "
                    f"Quantite {ligne.quantite} >= seuil {c.gratuites_seuil_qte} "
                    f"({c.gratuites_ratio}). {nb} unite(s) gratuite(s) attendue(s)."
                ),
                montant_impact=montant,
                action_suggeree=(
                    f"Reclamer {nb} unite(s) gratuite(s) de {ligne.designation} "
                    f"({c.gratuites_ratio}) pour une valeur de {montant} EUR."
                ),
                details={
                    "cip13": ligne.cip13, "ligne_id": ligne.ligne_id,
                    "quantite": ligne.quantite, "nb_gratuites_attendues": nb,
                },
            ))
        return anomalies, conformes


# ==================================================================
# CHECK 6 — TVA COHERENCE
# ==================================================================

class RegleTVACoherence(RegleVerification):
    """
    TVA = 2.10% attendue pour tranche A ou B (remboursable).
    TVA > 2.10% attendue pour OTC (non remboursable).
    """

    def type_verification(self) -> TypeVerification:
        return TypeVerification.TVA_COHERENCE

    def verify(self, facture):
        anomalies: list[Anomalie] = []
        conformes: list[ElementConforme] = []

        for ligne in facture.lignes:
            if not ligne.tranche or ligne.tva_taux is None:
                continue
            tva = ligne.tva_taux
            tranche = ligne.tranche

            is_2_10 = abs(tva - Decimal("2.10")) < Decimal("0.01")

            if is_2_10 and tranche == "OTC":
                anomalies.append(self._anomalie_tva(ligne, tva, tranche, expected="A/B"))
            elif tva > Decimal("2.10") and tranche in ("A", "B"):
                anomalies.append(self._anomalie_tva(ligne, tva, tranche, expected="OTC"))
            else:
                conformes.append(ElementConforme(
                    type_verification=TypeVerification.TVA_COHERENCE,
                    description=f"Ligne {ligne.cip13} : TVA {tva}% coherente avec tranche {tranche}.",
                    details={"cip13": ligne.cip13},
                ))
        return anomalies, conformes

    @staticmethod
    def _anomalie_tva(ligne: LigneFactureInput, tva: Decimal, tranche: str, expected: str) -> Anomalie:
        if expected == "A/B":
            desc = (
                f"Incoherence TVA/tranche : {ligne.designation} (CIP: {ligne.cip13}) "
                f"a TVA {tva}% mais classee OTC. TVA 2.10% = remboursable (A ou B)."
            )
            action = (
                f"Verifier la classification de {ligne.cip13}. Un produit a TVA 2.10% "
                f"est normalement remboursable (A ou B), pas OTC."
            )
        else:
            desc = (
                f"Incoherence TVA/tranche : {ligne.designation} (CIP: {ligne.cip13}) "
                f"a TVA {tva}% mais classee tranche {tranche}. "
                f"TVA > 2.10% = non remboursable (OTC)."
            )
            action = (
                f"Verifier la classification de {ligne.cip13}. Un produit a TVA {tva}% "
                f"est normalement OTC, pas tranche {tranche}."
            )
        return Anomalie(
            type_verification=TypeVerification.TVA_COHERENCE,
            severite=Severite.CRITIQUE,
            description=desc,
            montant_impact=Decimal("0.00"),
            action_suggeree=action,
            details={"cip13": ligne.cip13, "ligne_id": ligne.ligne_id,
                     "tva": float(tva), "tranche": tranche},
        )


# ==================================================================
# CHECK 7 — CALCUL ARITHMETIQUE
# ==================================================================

class RegleCalculArithmetique(RegleVerification):
    """
    Trois sous-checks par ligne :
      1. PU * (1 - remise%) ~= PU_AR     (ecart > 0.02 EUR => CRITIQUE)
      2. PU_AR * qte       ~= montant_HT (ecart > 0.02 EUR => CRITIQUE)
      3. PU * qte          ~= montant_brut (ecart > 0.02 EUR => CRITIQUE)
    """

    def type_verification(self) -> TypeVerification:
        return TypeVerification.CALCUL_ARITHMETIQUE

    def verify(self, facture):
        anomalies: list[Anomalie] = []
        conformes: list[ElementConforme] = []

        for ligne in facture.lignes:
            pu = ligne.prix_unitaire
            rem = ligne.remise_pct or Decimal("0")
            pu_ar = ligne.prix_unitaire_apres_remise
            qte = ligne.quantite or 0
            mt_ht = ligne.montant_ht or Decimal("0")
            mt_brut = ligne.montant_brut

            line_conforms = []

            # 1. PU * (1 - remise%) ~= PU_AR
            if pu > 0 and pu_ar is not None:
                expected = (pu * (Decimal("1") - rem / Decimal("100"))).quantize(Decimal("0.0001"))
                ecart = abs(expected - pu_ar)
                if ecart > TOLERANCE_MONTANT:
                    anomalies.append(Anomalie(
                        type_verification=TypeVerification.CALCUL_ARITHMETIQUE,
                        severite=Severite.CRITIQUE,
                        description=(
                            f"Erreur calcul PU apres remise pour {ligne.designation} "
                            f"(CIP: {ligne.cip13}). Attendu: {expected}, trouve: {pu_ar} "
                            f"(PU {pu} * (1 - {rem}%))."
                        ),
                        montant_impact=_q2(ecart * Decimal(qte)),
                        action_suggeree=(
                            f"Verifier le PU apres remise de {ligne.cip13}. "
                            f"Ecart de {ecart} EUR par unite."
                        ),
                        details={"cip13": ligne.cip13, "ligne_id": ligne.ligne_id,
                                 "sous_check": "pu_apres_remise"},
                    ))
                else:
                    line_conforms.append("pu_apres_remise")

            # 2. PU_AR * qte ~= montant_ht
            if pu_ar is not None and pu_ar > 0 and qte > 0:
                expected = _q2(pu_ar * Decimal(qte))
                ecart = abs(expected - mt_ht)
                if ecart > TOLERANCE_MONTANT:
                    anomalies.append(Anomalie(
                        type_verification=TypeVerification.CALCUL_ARITHMETIQUE,
                        severite=Severite.CRITIQUE,
                        description=(
                            f"Erreur calcul montant HT pour {ligne.designation} "
                            f"(CIP: {ligne.cip13}). Attendu: {expected}, trouve: {mt_ht} "
                            f"(PU_AR {pu_ar} * Qte {qte})."
                        ),
                        montant_impact=_q2(ecart),
                        action_suggeree=(
                            f"Verifier le montant HT de {ligne.cip13}. "
                            f"Ecart de {ecart} EUR."
                        ),
                        details={"cip13": ligne.cip13, "ligne_id": ligne.ligne_id,
                                 "sous_check": "montant_ht"},
                    ))
                else:
                    line_conforms.append("montant_ht")

            # 3. PU * qte ~= montant_brut
            if pu > 0 and qte > 0 and mt_brut is not None:
                expected = _q2(pu * Decimal(qte))
                ecart = abs(expected - mt_brut)
                if ecart > TOLERANCE_MONTANT:
                    anomalies.append(Anomalie(
                        type_verification=TypeVerification.CALCUL_ARITHMETIQUE,
                        severite=Severite.CRITIQUE,
                        description=(
                            f"Erreur calcul montant brut pour {ligne.designation} "
                            f"(CIP: {ligne.cip13}). Attendu: {expected}, trouve: {mt_brut} "
                            f"(PU {pu} * Qte {qte})."
                        ),
                        montant_impact=_q2(ecart),
                        action_suggeree=(
                            f"Verifier le montant brut de {ligne.cip13}. "
                            f"Ecart de {ecart} EUR."
                        ),
                        details={"cip13": ligne.cip13, "ligne_id": ligne.ligne_id,
                                 "sous_check": "montant_brut"},
                    ))
                else:
                    line_conforms.append("montant_brut")

            if line_conforms and not any(
                a.details.get("ligne_id") == ligne.ligne_id
                and a.type_verification == TypeVerification.CALCUL_ARITHMETIQUE
                for a in anomalies
            ):
                conformes.append(ElementConforme(
                    type_verification=TypeVerification.CALCUL_ARITHMETIQUE,
                    description=f"Ligne {ligne.cip13} : calculs coherents.",
                    details={"cip13": ligne.cip13, "sous_checks": line_conforms},
                ))

        return anomalies, conformes
