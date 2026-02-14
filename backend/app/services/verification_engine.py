"""
PharmaVerif - Moteur de Verification Factures Laboratoires
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Verification complete d'une facture labo contre l'accord commercial.
7 types de checks : remises, escompte, franco, RFA progression,
gratuites, TVA coherence, calculs arithmetiques.
Produit une liste d'anomalies classees par severite (critical/opportunity/info).
"""

import re
from typing import List, Optional, Tuple
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from app.models_labo import (
    FactureLabo,
    LigneFactureLabo,
    AccordCommercial,
    PalierRFA,
    AnomalieFactureLabo,
)


class VerificationEngine:
    """
    Moteur de verification des factures laboratoires.

    Checks effectues :
    1. Remises par tranche (A, B, OTC) vs cibles accord
    2. Escompte : conditions de paiement respectees ?
    3. Franco de port : montant commande vs seuil
    4. RFA progression : cumul annuel vs paliers
    5. Gratuites : lignes eligibles non appliquees
    6. TVA coherence : taux vs classification produit
    7. Calculs arithmetiques : PU * Qte, remises, totaux
    """

    # Tolerance pour les comparaisons de montants (en EUR)
    TOLERANCE_MONTANT = 0.02
    # Tolerance pour les ecarts de taux de remise (en %)
    TOLERANCE_TAUX = 0.5
    # Proximite du seuil franco (en %)
    FRANCO_PROXIMITE_PCT = 10.0
    # Proximite du palier RFA suivant (en %)
    RFA_PROXIMITE_PCT = 10.0

    def __init__(self, db: Session, pharmacy_id: Optional[int] = None):
        self.db = db
        self.pharmacy_id = pharmacy_id

    def verify(
        self,
        facture: FactureLabo,
        accord: Optional[AccordCommercial] = None,
    ) -> List[AnomalieFactureLabo]:
        """
        Lance toutes les verifications sur une facture.

        Args:
            facture: La facture a verifier (avec lignes chargees)
            accord: L'accord commercial applicable (si None, cherche l'actif)

        Returns:
            Liste d'anomalies detectees
        """
        anomalies: List[AnomalieFactureLabo] = []

        if not accord:
            accord = self._get_accord(facture)

        if not accord:
            # Pas d'accord commercial -> on ne peut verifier que l'arithmetique et la TVA
            anomalies.extend(self._check_tva_coherence(facture))
            anomalies.extend(self._check_arithmetic(facture))
            return anomalies

        # 1. Remises par tranche
        anomalies.extend(self._check_remises(facture, accord))

        # 2. Escompte
        anomalies.extend(self._check_escompte(facture, accord))

        # 3. Franco de port
        anomalies.extend(self._check_franco(facture, accord))

        # 4. RFA progression
        anomalies.extend(self._check_rfa_progression(facture, accord))

        # 5. Gratuites
        anomalies.extend(self._check_gratuites(facture, accord))

        # 6. TVA coherence
        anomalies.extend(self._check_tva_coherence(facture))

        # 7. Calculs arithmetiques
        anomalies.extend(self._check_arithmetic(facture))

        return anomalies

    # ========================================
    # CHECK 1 : REMISES PAR TRANCHE
    # ========================================

    def _check_remises(
        self, facture: FactureLabo, accord: AccordCommercial
    ) -> List[AnomalieFactureLabo]:
        """
        Compare le taux de remise reel vs cible par tranche.
        Ecart > TOLERANCE_TAUX% = anomalie critical.
        """
        anomalies = []

        checks = [
            ("A", facture.tranche_a_brut, facture.tranche_a_remise, accord.tranche_a_cible),
            ("B", facture.tranche_b_brut, facture.tranche_b_remise, accord.tranche_b_cible),
            ("OTC", facture.otc_brut, facture.otc_remise, accord.otc_cible),
        ]

        for tranche_nom, brut, remise, cible in checks:
            if not brut or brut <= 0:
                continue
            # Guard against None values from DB nullable columns
            if remise is None or cible is None:
                continue

            taux_reel = round(remise / brut * 100, 2)
            ecart = round(taux_reel - cible, 2)

            if abs(ecart) > self.TOLERANCE_TAUX:
                montant_ecart = round(abs(brut * ecart / 100), 2)
                direction = "inferieur" if ecart < 0 else "superieur"

                anomalies.append(AnomalieFactureLabo(
                    facture_id=facture.id,
                    type_anomalie="remise_ecart",
                    severite="critical",
                    description=(
                        f"Tranche {tranche_nom} : taux de remise reel ({taux_reel:.2f}%) "
                        f"{direction} a la cible ({cible:.2f}%). "
                        f"Ecart de {abs(ecart):.2f} points."
                    ),
                    montant_ecart=montant_ecart,
                    action_suggeree=(
                        f"Verifier les remises de la tranche {tranche_nom} avec le laboratoire. "
                        f"Ecart de {montant_ecart:.2f} EUR sur un brut de {brut:.2f} EUR."
                    ),
                ))

        return anomalies

    # ========================================
    # CHECK 2 : ESCOMPTE
    # ========================================

    def _check_escompte(
        self, facture: FactureLabo, accord: AccordCommercial
    ) -> List[AnomalieFactureLabo]:
        """
        Verifie si l'escompte devrait etre applique.
        Si applicable et conditions de paiement compatibles, signale l'opportunite.
        """
        anomalies = []

        if not accord.escompte_applicable or accord.escompte_pct <= 0:
            return anomalies

        # Calculer l'escompte potentiel
        escompte_montant = round(facture.montant_net_ht * accord.escompte_pct / 100, 2)

        if escompte_montant <= 0:
            return anomalies

        # Verifier si le delai de paiement est compatible
        delai_compatible = True  # Par defaut, on suppose compatible
        if facture.delai_paiement:
            # Extraire le nombre de jours du delai (ex: "30 jours", "60J")
            delai_match = re.search(r'(\d+)', str(facture.delai_paiement))
            if delai_match:
                delai_jours = int(delai_match.group(1))
                if delai_jours > accord.escompte_delai_jours:
                    delai_compatible = False

        if delai_compatible:
            anomalies.append(AnomalieFactureLabo(
                facture_id=facture.id,
                type_anomalie="escompte_manquant",
                severite="opportunity",
                description=(
                    f"Escompte de {accord.escompte_pct:.1f}% disponible "
                    f"(paiement sous {accord.escompte_delai_jours} jours). "
                    f"Economie potentielle : {escompte_montant:.2f} EUR."
                ),
                montant_ecart=escompte_montant,
                action_suggeree=(
                    f"Payer cette facture sous {accord.escompte_delai_jours} jours "
                    f"pour beneficier d'un escompte de {escompte_montant:.2f} EUR "
                    f"({accord.escompte_pct:.1f}% sur {facture.montant_net_ht:.2f} EUR net HT)."
                ),
            ))

        return anomalies

    # ========================================
    # CHECK 3 : FRANCO DE PORT
    # ========================================

    def _check_franco(
        self, facture: FactureLabo, accord: AccordCommercial
    ) -> List[AnomalieFactureLabo]:
        """
        Verifie si le montant de la commande est sous le seuil franco.
        Signale aussi la proximite du seuil.
        """
        anomalies = []

        if accord.franco_seuil_ht <= 0:
            return anomalies

        brut = facture.montant_brut_ht

        if brut < accord.franco_seuil_ht:
            # Sous le seuil = frais de port potentiels
            manque = round(accord.franco_seuil_ht - brut, 2)
            anomalies.append(AnomalieFactureLabo(
                facture_id=facture.id,
                type_anomalie="franco_seuil",
                severite="opportunity",
                description=(
                    f"Montant brut HT ({brut:.2f} EUR) inferieur au seuil franco "
                    f"({accord.franco_seuil_ht:.2f} EUR). "
                    f"Frais de port potentiels : {accord.franco_frais_port:.2f} EUR."
                ),
                montant_ecart=accord.franco_frais_port,
                action_suggeree=(
                    f"Il manque {manque:.2f} EUR pour atteindre le franco. "
                    f"Envisager de consolider avec d'autres commandes pour eviter "
                    f"{accord.franco_frais_port:.2f} EUR de frais de port."
                ),
            ))
        else:
            # Verifier la proximite (info si juste au-dessus du seuil)
            marge = brut - accord.franco_seuil_ht
            seuil_proximite = accord.franco_seuil_ht * self.FRANCO_PROXIMITE_PCT / 100
            if marge < seuil_proximite:
                anomalies.append(AnomalieFactureLabo(
                    facture_id=facture.id,
                    type_anomalie="franco_seuil",
                    severite="info",
                    description=(
                        f"Commande juste au-dessus du seuil franco "
                        f"({brut:.2f} EUR / seuil {accord.franco_seuil_ht:.2f} EUR). "
                        f"Marge de {marge:.2f} EUR."
                    ),
                    montant_ecart=0.0,
                    action_suggeree=(
                        f"Attention : marge faible ({marge:.2f} EUR) au-dessus du seuil franco. "
                        f"Un avoir ou retour pourrait faire passer sous le seuil."
                    ),
                ))

        return anomalies

    # ========================================
    # CHECK 4 : RFA PROGRESSION
    # ========================================

    def _check_rfa_progression(
        self, facture: FactureLabo, accord: AccordCommercial
    ) -> List[AnomalieFactureLabo]:
        """
        Verifie la progression RFA annuelle par rapport aux paliers.
        Alerte si proche du palier suivant.
        """
        anomalies = []

        # Charger les paliers
        paliers = sorted(accord.paliers_rfa, key=lambda p: p.seuil_min)
        if not paliers:
            return anomalies

        # Calculer le cumul annuel
        annee = facture.date_facture.year if facture.date_facture else date.today().year
        cumul = self._get_cumul_annuel(facture.laboratoire_id, annee)

        # Trouver le palier actuel et le suivant
        palier_actuel, palier_suivant = self._get_current_palier(paliers, cumul)

        if palier_suivant:
            montant_restant = palier_suivant.seuil_min - cumul
            pct_progression = min(100.0, cumul / palier_suivant.seuil_min * 100) if palier_suivant.seuil_min > 0 else 100.0

            # Si dans la zone de proximite du palier suivant
            seuil_proximite = palier_suivant.seuil_min * self.RFA_PROXIMITE_PCT / 100
            if montant_restant <= seuil_proximite and montant_restant > 0:
                gain_taux = palier_suivant.taux_rfa - (palier_actuel.taux_rfa if palier_actuel else 0.0)
                gain_estime = round(cumul * gain_taux / 100, 2)

                anomalies.append(AnomalieFactureLabo(
                    facture_id=facture.id,
                    type_anomalie="rfa_palier",
                    severite="info",
                    description=(
                        f"Progression RFA {annee} : {cumul:.2f} EUR / "
                        f"palier suivant a {palier_suivant.seuil_min:.2f} EUR "
                        f"({palier_suivant.description or f'{palier_suivant.taux_rfa}%'}). "
                        f"Reste {montant_restant:.2f} EUR ({pct_progression:.1f}%)."
                    ),
                    montant_ecart=gain_estime,
                    action_suggeree=(
                        f"Plus que {montant_restant:.2f} EUR d'achats pour atteindre le palier "
                        f"a {palier_suivant.taux_rfa:.1f}% (vs {palier_actuel.taux_rfa if palier_actuel else 0:.1f}% actuel). "
                        f"Gain estime : {gain_estime:.2f} EUR de RFA supplementaire."
                    ),
                ))

        return anomalies

    # ========================================
    # CHECK 5 : GRATUITES
    # ========================================

    def _check_gratuites(
        self, facture: FactureLabo, accord: AccordCommercial
    ) -> List[AnomalieFactureLabo]:
        """
        Verifie si des gratuites devraient etre appliquees.
        Pour chaque ligne avec qte >= seuil, cherche une ligne gratuite correspondante.
        """
        anomalies = []

        if not accord.gratuites_applicable or accord.gratuites_seuil_qte <= 0:
            return anomalies

        # Identifier les CIP13 avec lignes gratuites (prix=0 ou remise=100%)
        cips_gratuits = set()
        for ligne in facture.lignes:
            if ligne.prix_unitaire_ht == 0 or ligne.remise_pct >= 100:
                cips_gratuits.add(ligne.cip13)

        # Verifier chaque ligne payante
        for ligne in facture.lignes:
            if ligne.prix_unitaire_ht <= 0 or ligne.remise_pct >= 100:
                continue

            if ligne.quantite >= accord.gratuites_seuil_qte:
                if ligne.cip13 not in cips_gratuits:
                    # Calculer le nombre de gratuites attendues
                    nb_gratuites = ligne.quantite // accord.gratuites_seuil_qte
                    montant_gratuite = round(nb_gratuites * ligne.prix_unitaire_ht, 2)

                    anomalies.append(AnomalieFactureLabo(
                        facture_id=facture.id,
                        type_anomalie="gratuite_manquante",
                        severite="opportunity",
                        description=(
                            f"Gratuite manquante pour {ligne.designation} (CIP: {ligne.cip13}). "
                            f"Quantite {ligne.quantite} >= seuil {accord.gratuites_seuil_qte} "
                            f"({accord.gratuites_ratio}). "
                            f"{nb_gratuites} unite(s) gratuite(s) attendue(s)."
                        ),
                        montant_ecart=montant_gratuite,
                        action_suggeree=(
                            f"Reclamer {nb_gratuites} unite(s) gratuite(s) de {ligne.designation} "
                            f"({accord.gratuites_ratio}) pour une valeur de {montant_gratuite:.2f} EUR."
                        ),
                        ligne_id=ligne.id,
                    ))

        return anomalies

    # ========================================
    # CHECK 6 : TVA COHERENCE
    # ========================================

    def _check_tva_coherence(
        self, facture: FactureLabo
    ) -> List[AnomalieFactureLabo]:
        """
        Verifie la coherence entre le taux TVA et la classification tranche.
        TVA 2.10% = Tranche A ou B (remboursable)
        TVA > 2.10% (5.5%, 10%, 20%) = OTC (non remboursable)
        """
        anomalies = []

        for ligne in facture.lignes:
            if not ligne.tranche or not ligne.taux_tva:
                continue

            tva = ligne.taux_tva
            tranche = ligne.tranche

            # TVA 2.10% devrait etre A ou B
            if abs(tva - 2.10) < 0.01 and tranche == "OTC":
                anomalies.append(AnomalieFactureLabo(
                    facture_id=facture.id,
                    type_anomalie="tva_incoherence",
                    severite="critical",
                    description=(
                        f"Incoherence TVA/tranche : {ligne.designation} (CIP: {ligne.cip13}) "
                        f"a TVA {tva:.2f}% mais classee OTC. "
                        f"TVA 2.10% = produit remboursable (tranche A ou B)."
                    ),
                    montant_ecart=0.0,
                    action_suggeree=(
                        f"Verifier la classification de {ligne.cip13}. "
                        f"Un produit a TVA 2.10% est normalement remboursable (tranche A ou B), pas OTC."
                    ),
                    ligne_id=ligne.id,
                ))

            # TVA > 2.10% devrait etre OTC
            elif tva > 2.10 and tranche in ("A", "B"):
                anomalies.append(AnomalieFactureLabo(
                    facture_id=facture.id,
                    type_anomalie="tva_incoherence",
                    severite="critical",
                    description=(
                        f"Incoherence TVA/tranche : {ligne.designation} (CIP: {ligne.cip13}) "
                        f"a TVA {tva:.2f}% mais classee tranche {tranche}. "
                        f"TVA > 2.10% = produit non remboursable (OTC)."
                    ),
                    montant_ecart=0.0,
                    action_suggeree=(
                        f"Verifier la classification de {ligne.cip13}. "
                        f"Un produit a TVA {tva:.2f}% est normalement non remboursable (OTC), "
                        f"pas tranche {tranche}."
                    ),
                    ligne_id=ligne.id,
                ))

        return anomalies

    # ========================================
    # CHECK 7 : CALCULS ARITHMETIQUES
    # ========================================

    def _check_arithmetic(
        self, facture: FactureLabo
    ) -> List[AnomalieFactureLabo]:
        """
        Verifie les calculs arithmetiques de chaque ligne :
        - PU * (1 - remise%) ~= PU apres remise
        - PU apres remise * Qte ~= Montant HT
        - PU * Qte ~= Montant brut
        """
        anomalies = []

        for ligne in facture.lignes:
            pu = ligne.prix_unitaire_ht or 0.0
            rem = ligne.remise_pct or 0.0
            pu_ar = ligne.prix_unitaire_apres_remise
            qte = ligne.quantite or 0
            mt_ht = ligne.montant_ht or 0.0
            mt_brut = ligne.montant_brut

            # Check 1: PU * (1 - remise%) ~= PU apres remise
            if pu > 0 and pu_ar is not None:
                expected_pu_ar = round(pu * (1 - rem / 100), 4)
                ecart = abs(expected_pu_ar - pu_ar)
                if ecart > self.TOLERANCE_MONTANT:
                    anomalies.append(AnomalieFactureLabo(
                        facture_id=facture.id,
                        type_anomalie="calcul_arithmetique",
                        severite="critical",
                        description=(
                            f"Erreur calcul PU apres remise pour {ligne.designation} "
                            f"(CIP: {ligne.cip13}). "
                            f"Attendu: {expected_pu_ar:.4f} EUR, trouve: {pu_ar:.4f} EUR "
                            f"(PU {pu:.4f} * (1 - {rem:.2f}%))."
                        ),
                        montant_ecart=round(ecart * qte, 2),
                        action_suggeree=(
                            f"Verifier le prix unitaire apres remise de {ligne.cip13}. "
                            f"Ecart de {ecart:.4f} EUR par unite, soit {round(ecart * qte, 2):.2f} EUR total."
                        ),
                        ligne_id=ligne.id,
                    ))

            # Check 2: PU apres remise * Qte ~= Montant HT
            if pu_ar is not None and pu_ar > 0 and qte > 0:
                expected_mt_ht = round(pu_ar * qte, 2)
                ecart = abs(expected_mt_ht - mt_ht)
                if ecart > self.TOLERANCE_MONTANT:
                    anomalies.append(AnomalieFactureLabo(
                        facture_id=facture.id,
                        type_anomalie="calcul_arithmetique",
                        severite="critical",
                        description=(
                            f"Erreur calcul montant HT pour {ligne.designation} "
                            f"(CIP: {ligne.cip13}). "
                            f"Attendu: {expected_mt_ht:.2f} EUR, trouve: {mt_ht:.2f} EUR "
                            f"(PU_AR {pu_ar:.4f} * Qte {qte})."
                        ),
                        montant_ecart=round(ecart, 2),
                        action_suggeree=(
                            f"Verifier le montant HT de {ligne.cip13}. "
                            f"Ecart de {ecart:.2f} EUR."
                        ),
                        ligne_id=ligne.id,
                    ))

            # Check 3: PU * Qte ~= Montant brut
            if pu > 0 and qte > 0 and mt_brut is not None:
                expected_brut = round(pu * qte, 2)
                ecart = abs(expected_brut - mt_brut)
                if ecart > self.TOLERANCE_MONTANT:
                    anomalies.append(AnomalieFactureLabo(
                        facture_id=facture.id,
                        type_anomalie="calcul_arithmetique",
                        severite="critical",
                        description=(
                            f"Erreur calcul montant brut pour {ligne.designation} "
                            f"(CIP: {ligne.cip13}). "
                            f"Attendu: {expected_brut:.2f} EUR, trouve: {mt_brut:.2f} EUR "
                            f"(PU {pu:.4f} * Qte {qte})."
                        ),
                        montant_ecart=round(ecart, 2),
                        action_suggeree=(
                            f"Verifier le montant brut de {ligne.cip13}. "
                            f"Ecart de {ecart:.2f} EUR."
                        ),
                        ligne_id=ligne.id,
                    ))

        return anomalies

    # ========================================
    # HELPERS
    # ========================================

    def _get_accord(self, facture: FactureLabo) -> Optional[AccordCommercial]:
        """Recupere l'accord commercial actif pour le laboratoire de la facture.

        Filtre par pharmacy_id pour garantir l'isolation multi-tenant :
        un accord commercial d'une pharmacie A ne doit jamais etre utilise
        pour verifier les factures d'une pharmacie B.
        """
        query = self.db.query(AccordCommercial).filter(
            AccordCommercial.laboratoire_id == facture.laboratoire_id,
            AccordCommercial.actif == True,
        )
        # Multi-tenant isolation: restrict to current pharmacy
        if self.pharmacy_id is not None:
            query = query.filter(AccordCommercial.pharmacy_id == self.pharmacy_id)
        return query.first()

    def _get_cumul_annuel(self, laboratoire_id: int, annee: int) -> float:
        """Calcule le cumul annuel des achats brut HT pour un laboratoire.

        Filtre par pharmacy_id pour l'isolation multi-tenant :
        le cumul RFA d'une pharmacie ne doit pas inclure les factures
        d'une autre pharmacie.
        """
        query = self.db.query(
            func.coalesce(func.sum(FactureLabo.montant_brut_ht), 0.0)
        ).filter(
            FactureLabo.laboratoire_id == laboratoire_id,
            extract("year", FactureLabo.date_facture) == annee,
        )
        # Multi-tenant isolation: restrict to current pharmacy
        if self.pharmacy_id is not None:
            query = query.filter(FactureLabo.pharmacy_id == self.pharmacy_id)
        result = query.scalar()
        return float(result) if result else 0.0

    def _get_current_palier(
        self, paliers: List[PalierRFA], cumul: float
    ) -> Tuple[Optional[PalierRFA], Optional[PalierRFA]]:
        """
        Trouve le palier actuel et le palier suivant basee sur le cumul.

        Returns:
            (palier_actuel, palier_suivant)
        """
        palier_actuel = None
        palier_suivant = None

        for i, palier in enumerate(paliers):
            if cumul >= palier.seuil_min:
                if palier.seuil_max is None or cumul < palier.seuil_max:
                    palier_actuel = palier
                    if i + 1 < len(paliers):
                        palier_suivant = paliers[i + 1]
                    break
            else:
                # Le cumul est en dessous de ce palier -> c'est le suivant
                palier_suivant = palier
                break

        return palier_actuel, palier_suivant

    def persist_anomalies(
        self, facture_id: int, anomalies: List[AnomalieFactureLabo]
    ) -> None:
        """
        Persiste les anomalies en base.
        Supprime les anciennes anomalies non resolues et insere les nouvelles.
        Les anomalies resolues sont conservees.
        """
        # Supprimer les anciennes anomalies non resolues pour cette facture
        self.db.query(AnomalieFactureLabo).filter(
            AnomalieFactureLabo.facture_id == facture_id,
            AnomalieFactureLabo.resolu == False,
        ).delete()

        # Inserer les nouvelles
        for anomalie in anomalies:
            anomalie.facture_id = facture_id
            self.db.add(anomalie)

    def get_rfa_progression(
        self, laboratoire_id: int, annee: int, accord: Optional[AccordCommercial] = None
    ) -> dict:
        """
        Calcule la progression RFA annuelle pour un laboratoire.

        Returns:
            Dict avec cumul, palier actuel/suivant, progression
        """
        if not accord:
            query = self.db.query(AccordCommercial).filter(
                AccordCommercial.laboratoire_id == laboratoire_id,
                AccordCommercial.actif == True,
            )
            # Multi-tenant isolation
            if self.pharmacy_id is not None:
                query = query.filter(AccordCommercial.pharmacy_id == self.pharmacy_id)
            accord = query.first()

        cumul = self._get_cumul_annuel(laboratoire_id, annee)

        result = {
            "cumul_achats_ht": cumul,
            "palier_actuel": None,
            "palier_suivant": None,
            "montant_restant_prochain_palier": None,
            "taux_rfa_actuel": 0.0,
            "rfa_estimee_annuelle": 0.0,
            "progression_pct": 0.0,
        }

        if not accord or not accord.paliers_rfa:
            return result

        paliers = sorted(accord.paliers_rfa, key=lambda p: p.seuil_min)
        palier_actuel, palier_suivant = self._get_current_palier(paliers, cumul)

        result["palier_actuel"] = palier_actuel
        result["palier_suivant"] = palier_suivant

        if palier_actuel:
            result["taux_rfa_actuel"] = palier_actuel.taux_rfa
            result["rfa_estimee_annuelle"] = round(cumul * palier_actuel.taux_rfa / 100, 2)

        if palier_suivant:
            result["montant_restant_prochain_palier"] = round(
                palier_suivant.seuil_min - cumul, 2
            )
            if palier_suivant.seuil_min > 0:
                result["progression_pct"] = min(
                    100.0, round(cumul / palier_suivant.seuil_min * 100, 1)
                )

        return result
