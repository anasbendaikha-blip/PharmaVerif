"""
PharmaVerif - Moteur de Verification EMAC (Triangle de Verification)
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/services/emac_verification_engine.py

Triangle de verification EMAC :
  1. EMAC vs Factures : CA declare vs CA reel des factures sur la meme periode
  2. EMAC vs Conditions : Avantages declares vs conditions negociees (accord commercial)
  3. Detection EMAC manquants : Periodes avec factures mais sans EMAC recu

Produit des anomalies classees par severite (critical/warning/info)
et calcule le montant recouvrable.
"""

import logging
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from typing import List, Optional, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, and_

from app.models_labo import (
    FactureLabo,
    AccordCommercial,
    PalierRFA,
    Laboratoire,
)
from app.models_emac import EMAC, AnomalieEMAC

logger = logging.getLogger(__name__)


class EMACVerificationEngine:
    """
    Moteur de verification croisee des EMAC.

    3 croisements :
    1. EMAC declare vs factures reelles (CA, remises)
    2. EMAC declare vs conditions negociees (RFA, COP attendues)
    3. Detection des periodes sans EMAC

    Tolerances :
    - Ecart CA : > 1% = warning, > 5% = critical
    - Ecart RFA : > 2% du montant = warning, > 5% = critical
    - Ecart COP : > 50 EUR = warning
    """

    # Tolerances
    TOLERANCE_CA_PCT_WARNING = 1.0    # 1% d'ecart CA = warning
    TOLERANCE_CA_PCT_CRITICAL = 5.0   # 5% d'ecart CA = critical
    TOLERANCE_RFA_PCT_WARNING = 2.0   # 2% d'ecart RFA = warning
    TOLERANCE_RFA_PCT_CRITICAL = 5.0  # 5% d'ecart RFA = critical
    TOLERANCE_COP_EUR = 50.0          # 50 EUR d'ecart COP = warning
    TOLERANCE_MONTANT_ABS = 1.0       # 1 EUR de tolerance absolue

    def __init__(self, db: Session):
        self.db = db

    # ========================================
    # VERIFICATION PRINCIPALE
    # ========================================

    def verify(self, emac: EMAC) -> List[AnomalieEMAC]:
        """
        Lance la verification complete d'un EMAC.

        Args:
            emac: L'EMAC a verifier (avec laboratoire_id, periode)

        Returns:
            Liste d'anomalies detectees
        """
        anomalies: List[AnomalieEMAC] = []

        # Recuperer l'accord commercial actif
        accord = self._get_accord(emac.laboratoire_id)

        # Croisement 1 : EMAC vs Factures
        anomalies.extend(self._check_emac_vs_factures(emac))

        # Croisement 2 : EMAC vs Conditions
        if accord:
            anomalies.extend(self._check_emac_vs_conditions(emac, accord))
        else:
            anomalies.append(AnomalieEMAC(
                emac_id=emac.id,
                type_anomalie="condition_non_appliquee",
                severite="info",
                description=(
                    "Aucun accord commercial actif pour ce laboratoire. "
                    "Impossible de verifier les conditions negociees."
                ),
                montant_ecart=0.0,
                action_suggeree="Creer un accord commercial pour ce laboratoire.",
            ))

        # Verifier coherence interne de l'EMAC
        anomalies.extend(self._check_coherence_interne(emac))

        return anomalies

    # ========================================
    # CROISEMENT 1 : EMAC vs FACTURES
    # ========================================

    def _check_emac_vs_factures(self, emac: EMAC) -> List[AnomalieEMAC]:
        """
        Compare le CA declare dans l'EMAC avec le CA reel des factures
        pour la meme periode et le meme laboratoire.
        """
        anomalies = []

        # Calculer le CA reel des factures sur la periode
        ca_reel, nb_factures = self._get_ca_factures_periode(
            emac.laboratoire_id,
            emac.periode_debut,
            emac.periode_fin,
        )

        # Stocker les resultats dans l'EMAC
        emac.ca_reel_calcule = ca_reel
        emac.nb_factures_matched = nb_factures

        if emac.ca_declare <= 0:
            anomalies.append(AnomalieEMAC(
                emac_id=emac.id,
                type_anomalie="calcul_incoherent",
                severite="warning",
                description="CA declare a 0 dans l'EMAC.",
                montant_ecart=0.0,
                valeur_declaree=0.0,
                valeur_calculee=ca_reel,
                action_suggeree="Verifier le montant du CA declare dans l'EMAC.",
            ))
            return anomalies

        # Calculer l'ecart
        ecart_ca = round(emac.ca_declare - ca_reel, 2)
        ecart_ca_pct = round(abs(ecart_ca) / emac.ca_declare * 100, 2) if emac.ca_declare > 0 else 0

        emac.ecart_ca = ecart_ca
        emac.ecart_ca_pct = ecart_ca_pct

        if nb_factures == 0:
            anomalies.append(AnomalieEMAC(
                emac_id=emac.id,
                type_anomalie="ecart_ca",
                severite="critical",
                description=(
                    f"Aucune facture trouvee pour la periode "
                    f"({emac.periode_debut} au {emac.periode_fin}). "
                    f"CA declare : {emac.ca_declare:.2f} EUR."
                ),
                montant_ecart=emac.ca_declare,
                valeur_declaree=emac.ca_declare,
                valeur_calculee=0.0,
                action_suggeree=(
                    "Verifier que les factures de cette periode ont ete importees "
                    "et sont rattachees au bon laboratoire."
                ),
            ))
        elif abs(ecart_ca) > self.TOLERANCE_MONTANT_ABS:
            if ecart_ca_pct >= self.TOLERANCE_CA_PCT_CRITICAL:
                severite = "critical"
            elif ecart_ca_pct >= self.TOLERANCE_CA_PCT_WARNING:
                severite = "warning"
            else:
                severite = "info"

            direction = "superieur" if ecart_ca > 0 else "inferieur"
            anomalies.append(AnomalieEMAC(
                emac_id=emac.id,
                type_anomalie="ecart_ca",
                severite=severite,
                description=(
                    f"CA declare ({emac.ca_declare:.2f} EUR) {direction} "
                    f"au CA reel des factures ({ca_reel:.2f} EUR). "
                    f"Ecart : {abs(ecart_ca):.2f} EUR ({ecart_ca_pct:.1f}%). "
                    f"{nb_factures} facture(s) sur la periode."
                ),
                montant_ecart=abs(ecart_ca),
                valeur_declaree=emac.ca_declare,
                valeur_calculee=ca_reel,
                action_suggeree=(
                    f"Verifier les factures de la periode et confronter avec le laboratoire. "
                    f"Ecart de {abs(ecart_ca):.2f} EUR entre le CA EMAC et les factures."
                ),
            ))

        return anomalies

    # ========================================
    # CROISEMENT 2 : EMAC vs CONDITIONS
    # ========================================

    def _check_emac_vs_conditions(
        self, emac: EMAC, accord: AccordCommercial
    ) -> List[AnomalieEMAC]:
        """
        Compare les avantages declares dans l'EMAC avec les conditions
        negociees dans l'accord commercial.
        """
        anomalies = []

        # --- Verification RFA ---
        rfa_attendue = self._calculer_rfa_attendue(emac, accord)
        emac.rfa_attendue_calculee = rfa_attendue

        if rfa_attendue is not None and rfa_attendue > 0:
            ecart_rfa = round(emac.rfa_declaree - rfa_attendue, 2)
            emac.ecart_rfa = ecart_rfa

            if abs(ecart_rfa) > self.TOLERANCE_MONTANT_ABS:
                ecart_rfa_pct = round(abs(ecart_rfa) / rfa_attendue * 100, 2) if rfa_attendue > 0 else 0

                if ecart_rfa_pct >= self.TOLERANCE_RFA_PCT_CRITICAL:
                    severite = "critical"
                elif ecart_rfa_pct >= self.TOLERANCE_RFA_PCT_WARNING:
                    severite = "warning"
                else:
                    severite = "info"

                direction = "superieure" if ecart_rfa > 0 else "inferieure"
                anomalies.append(AnomalieEMAC(
                    emac_id=emac.id,
                    type_anomalie="ecart_rfa",
                    severite=severite,
                    description=(
                        f"RFA declaree ({emac.rfa_declaree:.2f} EUR) {direction} "
                        f"a la RFA attendue ({rfa_attendue:.2f} EUR) selon l'accord '{accord.nom}'. "
                        f"Ecart : {abs(ecart_rfa):.2f} EUR ({ecart_rfa_pct:.1f}%)."
                    ),
                    montant_ecart=abs(ecart_rfa),
                    valeur_declaree=emac.rfa_declaree,
                    valeur_calculee=rfa_attendue,
                    action_suggeree=(
                        f"Confronter l'ecart RFA de {abs(ecart_rfa):.2f} EUR avec le laboratoire. "
                        f"Verifier les paliers RFA de l'accord '{accord.nom}'."
                    ),
                ))
        elif emac.rfa_declaree > 0 and (rfa_attendue is None or rfa_attendue == 0):
            anomalies.append(AnomalieEMAC(
                emac_id=emac.id,
                type_anomalie="ecart_rfa",
                severite="info",
                description=(
                    f"RFA declaree ({emac.rfa_declaree:.2f} EUR) mais aucun palier RFA "
                    f"configure dans l'accord '{accord.nom}'."
                ),
                montant_ecart=0.0,
                valeur_declaree=emac.rfa_declaree,
                valeur_calculee=0.0,
                action_suggeree="Verifier les paliers RFA de l'accord commercial.",
            ))

        # --- Verification COP ---
        if emac.cop_declaree > 0:
            # COP : pas de calcul automatique, mais signal si montant significatif
            anomalies.append(AnomalieEMAC(
                emac_id=emac.id,
                type_anomalie="ecart_cop",
                severite="info",
                description=(
                    f"COP declaree : {emac.cop_declaree:.2f} EUR. "
                    f"Verification manuelle recommandee (conditions promotionnelles specifiques)."
                ),
                montant_ecart=0.0,
                valeur_declaree=emac.cop_declaree,
                valeur_calculee=None,
                action_suggeree=(
                    "Verifier les conditions d'objectifs promotionnels avec le laboratoire."
                ),
            ))

        # --- Verification montant non verse ---
        if emac.solde_a_percevoir > self.TOLERANCE_COP_EUR:
            anomalies.append(AnomalieEMAC(
                emac_id=emac.id,
                type_anomalie="montant_non_verse",
                severite="warning",
                description=(
                    f"Solde a percevoir : {emac.solde_a_percevoir:.2f} EUR. "
                    f"Total avantages declares : {emac.total_avantages_declares:.2f} EUR, "
                    f"deja verse : {emac.montant_deja_verse:.2f} EUR."
                ),
                montant_ecart=emac.solde_a_percevoir,
                valeur_declaree=emac.total_avantages_declares,
                valeur_calculee=emac.montant_deja_verse,
                action_suggeree=(
                    f"Relancer le laboratoire pour le versement du solde de "
                    f"{emac.solde_a_percevoir:.2f} EUR."
                ),
            ))

        # --- Verification escompte si applicable ---
        if accord.escompte_applicable and accord.escompte_pct > 0:
            ca_ref = emac.ca_reel_calcule if emac.ca_reel_calcule else emac.ca_declare
            escompte_attendu = round(ca_ref * accord.escompte_pct / 100, 2)
            if escompte_attendu > 0 and emac.autres_avantages < escompte_attendu * 0.5:
                anomalies.append(AnomalieEMAC(
                    emac_id=emac.id,
                    type_anomalie="condition_non_appliquee",
                    severite="warning",
                    description=(
                        f"Escompte potentiel de {escompte_attendu:.2f} EUR "
                        f"({accord.escompte_pct:.1f}% sur {ca_ref:.2f} EUR) "
                        f"non reflété dans les autres avantages ({emac.autres_avantages:.2f} EUR)."
                    ),
                    montant_ecart=escompte_attendu,
                    valeur_declaree=emac.autres_avantages,
                    valeur_calculee=escompte_attendu,
                    action_suggeree=(
                        f"Verifier si l'escompte de {accord.escompte_pct:.1f}% "
                        f"a ete applique sur les factures de la periode."
                    ),
                ))

        # Calculer total avantages calcule
        total_calc = (rfa_attendue or 0.0) + (emac.cop_attendue_calculee or 0.0)
        emac.total_avantages_calcule = total_calc
        emac.ecart_total_avantages = round(
            emac.total_avantages_declares - total_calc, 2
        ) if total_calc > 0 else None

        return anomalies

    # ========================================
    # VERIFICATION COHERENCE INTERNE
    # ========================================

    def _check_coherence_interne(self, emac: EMAC) -> List[AnomalieEMAC]:
        """Verifie la coherence interne de l'EMAC (calculs)"""
        anomalies = []

        # Verifier total = somme des composantes
        somme = (
            emac.rfa_declaree
            + emac.cop_declaree
            + emac.remises_differees_declarees
            + emac.autres_avantages
        )
        if emac.total_avantages_declares > 0 and abs(somme - emac.total_avantages_declares) > self.TOLERANCE_MONTANT_ABS:
            anomalies.append(AnomalieEMAC(
                emac_id=emac.id,
                type_anomalie="calcul_incoherent",
                severite="warning",
                description=(
                    f"Le total des avantages declares ({emac.total_avantages_declares:.2f} EUR) "
                    f"ne correspond pas a la somme des composantes ({somme:.2f} EUR). "
                    f"Ecart : {abs(somme - emac.total_avantages_declares):.2f} EUR."
                ),
                montant_ecart=abs(somme - emac.total_avantages_declares),
                valeur_declaree=emac.total_avantages_declares,
                valeur_calculee=somme,
                action_suggeree="Verifier les montants individuels de l'EMAC.",
            ))

        # Verifier solde = total - verse
        solde_attendu = max(0.0, emac.total_avantages_declares - emac.montant_deja_verse)
        if (
            emac.solde_a_percevoir > 0
            and abs(emac.solde_a_percevoir - solde_attendu) > self.TOLERANCE_MONTANT_ABS
        ):
            anomalies.append(AnomalieEMAC(
                emac_id=emac.id,
                type_anomalie="calcul_incoherent",
                severite="info",
                description=(
                    f"Le solde a percevoir ({emac.solde_a_percevoir:.2f} EUR) "
                    f"ne correspond pas a total - verse ({solde_attendu:.2f} EUR)."
                ),
                montant_ecart=abs(emac.solde_a_percevoir - solde_attendu),
                valeur_declaree=emac.solde_a_percevoir,
                valeur_calculee=solde_attendu,
                action_suggeree="Verifier les montants de paiement.",
            ))

        return anomalies

    # ========================================
    # CROISEMENT 3 : EMAC MANQUANTS
    # ========================================

    def detect_emacs_manquants(
        self,
        annee: int,
        laboratoire_id: Optional[int] = None,
        pharmacy_id: Optional[int] = None,
    ) -> List[Dict]:
        """
        Detecte les periodes avec des factures mais sans EMAC recu.

        Args:
            annee: Annee a verifier
            laboratoire_id: Optionnel, restreindre a un laboratoire
            pharmacy_id: Optionnel, filtrer par pharmacie (multi-tenant)

        Returns:
            Liste de dicts {laboratoire_id, laboratoire_nom, periode_debut, periode_fin, ...}
        """
        manquants = []

        # Lister les laboratoires concernes
        labos_query = self.db.query(Laboratoire).filter(Laboratoire.actif == True)
        if pharmacy_id:
            labos_query = labos_query.filter(Laboratoire.pharmacy_id == pharmacy_id)
        if laboratoire_id:
            labos_query = labos_query.filter(Laboratoire.id == laboratoire_id)
        labos = labos_query.all()

        for labo in labos:
            # Pour chaque mois de l'annee
            for mois in range(1, 13):
                debut_mois = date(annee, mois, 1)
                if mois == 12:
                    fin_mois = date(annee, 12, 31)
                else:
                    fin_mois = date(annee, mois + 1, 1) - relativedelta(days=1)

                # Ne pas verifier les mois futurs
                if debut_mois > date.today():
                    break

                # Verifier s'il y a des factures sur cette periode
                factures_query = (
                    self.db.query(func.count(FactureLabo.id))
                    .filter(
                        FactureLabo.laboratoire_id == labo.id,
                        FactureLabo.date_facture >= debut_mois,
                        FactureLabo.date_facture <= fin_mois,
                    )
                )
                if pharmacy_id:
                    factures_query = factures_query.filter(
                        FactureLabo.pharmacy_id == pharmacy_id
                    )
                nb_factures = factures_query.scalar() or 0

                if nb_factures == 0:
                    continue

                # Calculer le CA de la periode
                ca_query = (
                    self.db.query(func.coalesce(func.sum(FactureLabo.montant_brut_ht), 0.0))
                    .filter(
                        FactureLabo.laboratoire_id == labo.id,
                        FactureLabo.date_facture >= debut_mois,
                        FactureLabo.date_facture <= fin_mois,
                    )
                )
                if pharmacy_id:
                    ca_query = ca_query.filter(
                        FactureLabo.pharmacy_id == pharmacy_id
                    )
                ca_periode = ca_query.scalar() or 0.0

                # Verifier s'il y a un EMAC couvrant cette periode
                emac_query = (
                    self.db.query(EMAC)
                    .filter(
                        EMAC.laboratoire_id == labo.id,
                        EMAC.periode_debut <= fin_mois,
                        EMAC.periode_fin >= debut_mois,
                    )
                )
                if pharmacy_id:
                    emac_query = emac_query.filter(
                        EMAC.pharmacy_id == pharmacy_id
                    )
                emac_exists = emac_query.first()

                if not emac_exists:
                    mois_noms = [
                        "", "janvier", "fevrier", "mars", "avril", "mai", "juin",
                        "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
                    ]
                    manquants.append({
                        "laboratoire_id": labo.id,
                        "laboratoire_nom": labo.nom,
                        "periode_debut": debut_mois,
                        "periode_fin": fin_mois,
                        "type_periode": "mensuel",
                        "nb_factures_periode": nb_factures,
                        "ca_periode": float(ca_periode),
                        "message": (
                            f"EMAC manquant pour {labo.nom} - "
                            f"{mois_noms[mois]} {annee} "
                            f"({nb_factures} facture(s), CA {float(ca_periode):.2f} EUR)"
                        ),
                    })

        return manquants

    # ========================================
    # PERSISTANCE
    # ========================================

    def persist_anomalies(
        self, emac_id: int, anomalies: List[AnomalieEMAC]
    ) -> None:
        """
        Persiste les anomalies en base.
        Supprime les anciennes non resolues, insere les nouvelles.
        """
        # Supprimer les anciennes non resolues
        self.db.query(AnomalieEMAC).filter(
            AnomalieEMAC.emac_id == emac_id,
            AnomalieEMAC.resolu == False,
        ).delete()

        # Inserer les nouvelles
        for anomalie in anomalies:
            anomalie.emac_id = emac_id
            self.db.add(anomalie)

    def update_emac_status(
        self, emac: EMAC, anomalies: List[AnomalieEMAC]
    ) -> None:
        """Met a jour le statut de l'EMAC selon les anomalies."""
        nb_critical = sum(1 for a in anomalies if a.severite == "critical")
        nb_warning = sum(1 for a in anomalies if a.severite == "warning")
        nb_info = sum(1 for a in anomalies if a.severite == "info")

        emac.nb_anomalies = len(anomalies)
        emac.verified_at = datetime.utcnow()

        # Calculer montant recouvrable
        montant_reco = 0.0
        for a in anomalies:
            if a.type_anomalie in ("ecart_rfa", "ecart_ca", "montant_non_verse", "condition_non_appliquee"):
                if a.montant_ecart > 0:
                    montant_reco += a.montant_ecart
        emac.montant_recouvrable = round(montant_reco, 2)

        # Resume anomalies
        emac.anomalies_resume = [
            {
                "type": a.type_anomalie,
                "description": a.description[:200],
                "montant_ecart": a.montant_ecart,
                "severite": a.severite,
            }
            for a in anomalies
        ]

        # Determiner le statut
        if nb_critical > 0:
            emac.statut_verification = "anomalie"
        elif nb_warning > 0:
            emac.statut_verification = "ecart_detecte"
        elif len(anomalies) == 0 or (nb_info == len(anomalies)):
            emac.statut_verification = "conforme"
        else:
            emac.statut_verification = "conforme"

    # ========================================
    # HELPERS
    # ========================================

    def _get_accord(self, laboratoire_id: int) -> Optional[AccordCommercial]:
        """Recupere l'accord commercial actif pour un laboratoire."""
        return (
            self.db.query(AccordCommercial)
            .filter(
                AccordCommercial.laboratoire_id == laboratoire_id,
                AccordCommercial.actif == True,
            )
            .first()
        )

    def _get_ca_factures_periode(
        self,
        laboratoire_id: int,
        debut: date,
        fin: date,
    ) -> Tuple[float, int]:
        """
        Calcule le CA brut HT des factures pour un labo sur une periode.

        Returns:
            (ca_total, nb_factures)
        """
        result = (
            self.db.query(
                func.coalesce(func.sum(FactureLabo.montant_brut_ht), 0.0),
                func.count(FactureLabo.id),
            )
            .filter(
                FactureLabo.laboratoire_id == laboratoire_id,
                FactureLabo.date_facture >= debut,
                FactureLabo.date_facture <= fin,
            )
            .first()
        )

        ca = float(result[0]) if result and result[0] else 0.0
        nb = int(result[1]) if result and result[1] else 0
        return ca, nb

    def _calculer_rfa_attendue(
        self, emac: EMAC, accord: AccordCommercial
    ) -> Optional[float]:
        """
        Calcule la RFA attendue selon les paliers de l'accord commercial.
        Utilise le CA reel (des factures) ou le CA declare si non disponible.
        """
        paliers = sorted(accord.paliers_rfa, key=lambda p: p.seuil_min)
        if not paliers:
            return None

        # Utiliser le CA reel si disponible, sinon le CA declare
        ca = emac.ca_reel_calcule if emac.ca_reel_calcule and emac.ca_reel_calcule > 0 else emac.ca_declare

        # Pour la RFA annuelle, il faut le cumul annuel
        annee = emac.periode_debut.year
        cumul_annuel = self._get_cumul_annuel(emac.laboratoire_id, annee)

        # Trouver le palier applicable
        taux_rfa = 0.0
        for palier in paliers:
            if cumul_annuel >= palier.seuil_min:
                if palier.seuil_max is None or cumul_annuel < palier.seuil_max:
                    taux_rfa = palier.taux_rfa
                    break
            else:
                break

        if taux_rfa <= 0:
            return 0.0

        # RFA prorata sur la periode
        rfa = round(ca * taux_rfa / 100, 2)
        return rfa

    def _get_cumul_annuel(self, laboratoire_id: int, annee: int) -> float:
        """Calcule le cumul annuel des achats brut HT."""
        result = (
            self.db.query(func.coalesce(func.sum(FactureLabo.montant_brut_ht), 0.0))
            .filter(
                FactureLabo.laboratoire_id == laboratoire_id,
                extract("year", FactureLabo.date_facture) == annee,
            )
            .scalar()
        )
        return float(result) if result else 0.0

    def get_dashboard_stats(
        self,
        user_id: Optional[int] = None,
        pharmacy_id: Optional[int] = None,
    ) -> Dict:
        """
        Statistiques EMAC pour le dashboard.

        Args:
            user_id: Optionnel, filtrer par utilisateur (legacy)
            pharmacy_id: Optionnel, filtrer par pharmacie (multi-tenant)

        Returns:
            Dict avec compteurs et montants
        """
        query = self.db.query(EMAC)
        if pharmacy_id:
            query = query.filter(EMAC.pharmacy_id == pharmacy_id)
        if user_id:
            query = query.filter(EMAC.user_id == user_id)

        total = query.count()
        non_verifies = query.filter(EMAC.statut_verification == "non_verifie").count()
        conformes = query.filter(EMAC.statut_verification == "conforme").count()
        ecarts = query.filter(
            EMAC.statut_verification.in_(["ecart_detecte", "anomalie"])
        ).count()

        agg_query = self.db.query(EMAC)
        if pharmacy_id:
            agg_query = agg_query.filter(EMAC.pharmacy_id == pharmacy_id)
        if user_id:
            agg_query = agg_query.filter(EMAC.user_id == user_id)

        total_avantages = (
            agg_query.with_entities(
                func.coalesce(func.sum(EMAC.total_avantages_declares), 0.0)
            ).scalar()
        ) or 0.0

        total_recouvrable = (
            agg_query.with_entities(
                func.coalesce(func.sum(EMAC.montant_recouvrable), 0.0)
            ).scalar()
        ) or 0.0

        total_solde = (
            agg_query.with_entities(
                func.coalesce(func.sum(EMAC.solde_a_percevoir), 0.0)
            ).scalar()
        ) or 0.0

        # Detecter les EMAC manquants pour l'annee en cours
        annee = date.today().year
        manquants = self.detect_emacs_manquants(annee, pharmacy_id=pharmacy_id)

        return {
            "total_emacs": total,
            "emacs_non_verifies": non_verifies,
            "emacs_conformes": conformes,
            "emacs_ecart": ecarts,
            "total_avantages_declares": float(total_avantages),
            "total_montant_recouvrable": float(total_recouvrable),
            "total_solde_a_percevoir": float(total_solde),
            "nb_emacs_manquants": len(manquants),
        }
