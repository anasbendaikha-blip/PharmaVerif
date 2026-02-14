"""
PharmaVerif — Rebate Engine (Moteur de Calcul)
================================================
Coeur du systeme : calcule le calendrier complet des remises
pour chaque facture importee.

CORRECTION CRITIQUE vs. version originale :
  Le fichier original classifiait TOUTE la facture dans UNE tranche
  dominante (A ou B) et appliquait un seul taux. C'est FAUX.
  EN REALITE, une facture contient des lignes des DEUX tranches.

  Exemple facture Biogaran 10 000 EUR :
    - 8 lignes Tranche A (remise base <= 2.5%) = 2 400 EUR
    - 24 lignes Tranche B (remise base > 2.5%) = 7 600 EUR
    - 3 lignes OTC (TVA != 2.10%) = 850 EUR → EXCLUES

  Calcul CORRECT : (2400 * taux_A) + (7600 * taux_B)
  Calcul FAUX    : 10000 * taux_dominant

Principes :
  - Generique : interprete des regles JSON, pas de code hardcode par labo
  - Immutable : un schedule calcule ne change jamais
  - Auditable : snapshot complet de la config appliquee
  - Performant : < 100ms par facture

Regles metier :
  - TVA 2.10% = produit eligible (generique remboursable)
  - TVA != 2.10% = OTC, exclu du calcul RFA
  - Tranche A : remise_pourcentage entre 0% et 2.5% (inclus)
  - Tranche B : remise_pourcentage > 2.5%
  - Les taux sont cumulatifs (chaque etape s'additionne)
  - La premiere etape (M+0) a status "received" (deduite de la facture)
  - Les conditions (primes) sont evaluees mais le montant conditionnel est
    inclus avec status "conditional"
  - Le snapshot (applied_config) est une copie figee de l'accord au moment du calcul

Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.
"""

import logging
import calendar
import copy
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract, text

from app.models_rebate import (
    RebateTemplate,
    LaboratoryAgreement,
    InvoiceRebateSchedule,
    AgreementAuditLog,
    AgreementStatus,
    ScheduleStatus,
    RebateType,
)
from app.models_labo import FactureLabo

logger = logging.getLogger(__name__)

# TVA generiques remboursables
TVA_ELIGIBLE = 2.10

# Seuil de classification tranche A vs B (remise de base en %)
TRANCHE_A_MAX_REMISE = 2.5  # inclus : 0% <= remise <= 2.5% = Tranche A
# > 2.5% = Tranche B


# ============================================================================
# EXCEPTIONS
# ============================================================================

class RebateEngineError(Exception):
    """Erreur metier du moteur de calcul"""
    pass


class NoActiveAgreementError(RebateEngineError):
    """Aucun accord actif trouve pour ce labo/pharmacie/date"""
    pass


class InvalidConfigError(RebateEngineError):
    """Configuration de l'accord invalide ou incomplete"""
    pass


# ============================================================================
# MOTEUR DE CALCUL
# ============================================================================

class RebateEngine:
    """
    Moteur de calcul des remises echelonnees.

    CORRIGE : calcul par ligne avec ventilation par tranche A/B.

    Usage:
        engine = RebateEngine(db_session)
        schedule = engine.calculate_rebate_schedule(
            invoice_id=42,
            invoice_amount=10000.0,
            invoice_date=date(2025, 1, 15),
            pharmacy_id=1,
            laboratoire_id=3,
            invoice_lines=[
                {"remise_pourcentage": 2.0, "taux_tva": 2.10, "montant_ht": 300.0},
                {"remise_pourcentage": 5.0, "taux_tva": 2.10, "montant_ht": 700.0},
                {"remise_pourcentage": 0.0, "taux_tva": 20.0, "montant_ht": 100.0},
            ],
        )
    """

    def __init__(self, db: Session):
        self.db = db

    # ========================================================================
    # METHODE PRINCIPALE
    # ========================================================================

    def calculate_rebate_schedule(
        self,
        invoice_id: int,
        invoice_amount: float,
        invoice_date: date,
        pharmacy_id: int,
        laboratoire_id: int,
        invoice_lines: Optional[List[dict]] = None,
    ) -> InvoiceRebateSchedule:
        """
        Calcule le calendrier complet des remises pour une facture.

        Flux CORRIGE :
          1. Trouver l'accord actif pour ce labo/pharmacie a cette date
          2. Charger le template associe
          3. Filtrer les OTC (TVA != 2.10%) et classifier chaque ligne en A ou B
          4. Pour chaque etape, calculer le montant par tranche puis sommer
          5. Creer le schedule immutable avec snapshot

        Args:
            invoice_id: ID de la facture labo en BDD (factures_labo.id)
            invoice_amount: Montant net HT de la facture
            invoice_date: Date de la facture
            pharmacy_id: ID de la pharmacie
            laboratoire_id: ID du laboratoire (laboratoires.id)
            invoice_lines: Lignes de facture avec remise_pourcentage, taux_tva, montant_ht

        Returns:
            InvoiceRebateSchedule cree et persiste en BDD

        Raises:
            NoActiveAgreementError: Pas d'accord actif
            InvalidConfigError: Config JSON invalide
        """
        # 1. Trouver l'accord applicable
        agreement = self._get_applicable_agreement(
            pharmacy_id=pharmacy_id,
            laboratoire_id=laboratoire_id,
            target_date=invoice_date,
        )
        logger.info(
            f"Accord trouve pour facture {invoice_id}: "
            f"agreement_id={agreement.id}, v{agreement.version}"
        )

        # 2. Charger le template
        template = self._load_template(agreement.template_id)

        # 3. CORRECTION : Filtrer OTC et classifier chaque ligne
        classification = self._filter_and_classify_lines(
            invoice_lines=invoice_lines or [],
            agreement_config=agreement.agreement_config,
        )
        logger.info(
            f"Classification: eligible={classification['eligible_amount']:.2f}EUR, "
            f"OTC exclu={classification['otc_amount']:.2f}EUR, "
            f"tranches={list(classification['tranches'].keys())}"
        )

        # 4. CORRECTION : Calculer chaque etape avec ventilation par tranche
        entries = []
        cumulative_amount = Decimal("0")
        tranche_amounts = classification["tranches"]

        for idx, stage in enumerate(template.structure.get("stages", []) if template.structure else []):
            entry = self._calculate_stage_by_tranche(
                stage=stage,
                stage_order=idx + 1,
                tranche_amounts=tranche_amounts,
                agreement=agreement,
                invoice_date=invoice_date,
                pharmacy_id=pharmacy_id,
                laboratoire_id=laboratoire_id,
                previous_cumulative=cumulative_amount,
            )
            cumulative_amount += Decimal(str(entry["total_amount"]))
            entries.append(entry)

        # Si pas de structure (template simple avec paliers seulement),
        # calculer directement avec les paliers/taux du template ou de l'accord
        if not entries:
            entries, cumulative_amount = self._calculate_from_tiers(
                agreement=agreement,
                template=template,
                tranche_amounts=tranche_amounts,
                eligible_amount=classification["eligible_amount"],
                invoice_date=invoice_date,
            )

        # 5. Totaux
        eligible_amount = Decimal(str(classification["eligible_amount"]))
        total_rfa = float(cumulative_amount.quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        ))
        total_pct = float(
            (cumulative_amount / eligible_amount).quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            )
        ) if eligible_amount > 0 else 0

        # 6. Creer le schedule immutable
        rebate_data = {
            "invoice_amount_ht": invoice_amount,
            "otc_amount_excluded": classification["otc_amount"],
            "eligible_amount": classification["eligible_amount"],
            "tranche_breakdown": {
                k: {"amount_ht": v["amount"], "line_count": v["line_count"]}
                for k, v in tranche_amounts.items()
            },
            "entries": entries,
            "total_rfa_expected": total_rfa,
            "total_rfa_percentage": total_pct,
        }

        # Snapshot immutable de la config au moment du calcul
        applied_config = self._build_applied_config_snapshot(agreement, template)

        schedule = InvoiceRebateSchedule(
            facture_labo_id=invoice_id,
            agreement_id=agreement.id,
            pharmacy_id=pharmacy_id,
            rebate_type=RebateType.RFA,
            montant_base_ht=invoice_amount,
            taux_applique=total_pct * 100,
            montant_prevu=total_rfa,
            date_echeance=self._compute_main_echeance(invoice_date, template),
            statut=ScheduleStatus.PREVU,
            # Champs enrichis
            applied_config=applied_config,
            tranche_breakdown=rebate_data["tranche_breakdown"],
            tranche_type=self._determine_tranche_type(tranche_amounts),
            rebate_entries=rebate_data,
            agreement_version=agreement.version,
            invoice_date=invoice_date,
            invoice_amount=invoice_amount,
            total_rfa_expected=total_rfa,
            total_rfa_percentage=total_pct,
        )

        self.db.add(schedule)

        # Mettre a jour le CA cumule de l'accord
        agreement.ca_cumule = (agreement.ca_cumule or 0) + classification["eligible_amount"]
        agreement.remise_cumulee = (agreement.remise_cumulee or 0) + total_rfa
        agreement.derniere_maj_calcul = date.today()

        self.db.commit()
        self.db.refresh(schedule)

        logger.info(
            f"Schedule cree pour facture {invoice_id}: "
            f"RFA={total_rfa}EUR ({total_pct:.1%}), "
            f"{len(entries)} etapes, "
            f"tranche_A={tranche_amounts.get('tranche_A', {}).get('amount', 0):.0f}EUR, "
            f"tranche_B={tranche_amounts.get('tranche_B', {}).get('amount', 0):.0f}EUR"
        )

        return schedule

    # ========================================================================
    # PREVIEW (calcul sans persistance)
    # ========================================================================

    def preview_schedule(
        self,
        template_id: int,
        agreement_config: Optional[dict] = None,
        custom_tiers: Optional[list] = None,
        simulation_amount: float = 10000.0,
        simulation_lines: Optional[List[dict]] = None,
        simulation_date: Optional[date] = None,
    ) -> dict:
        """
        Calcule un calendrier de previsualisation SANS persister.
        Utilise par le frontend pour le rendu en temps reel du formulaire.

        Returns:
            Dict avec entries, totaux et validations
        """
        if simulation_date is None:
            simulation_date = date.today()

        template = self._load_template(template_id)

        # Classifier les lignes simulees
        classification = self._filter_and_classify_lines(
            invoice_lines=simulation_lines or [],
            agreement_config=agreement_config,
        )

        # Si pas de lignes simulees, repartir 70/30 par defaut
        if not simulation_lines:
            classification = {
                "otc_amount": 0.0,
                "eligible_amount": simulation_amount,
                "tranches": {
                    "tranche_A": {"amount": simulation_amount * 0.3, "line_count": 3},
                    "tranche_B": {"amount": simulation_amount * 0.7, "line_count": 7},
                },
            }

        tranche_amounts = classification["tranches"]
        entries = []
        cumulative_amount = Decimal("0")
        validations = []

        # Construire un pseudo-accord pour le calcul
        class _FakeAgreement:
            def __init__(self, ac, ct, te, tc, tv):
                self.agreement_config = ac
                self.custom_tiers = ct
                self.taux_escompte = te
                self.taux_cooperation = tc
                self.template_version = tv
                self.version = 0

        fake_agreement = _FakeAgreement(
            ac=agreement_config,
            ct=custom_tiers,
            te=None,
            tc=None,
            tv=template.version if hasattr(template, 'version') else 1,
        )

        stages = template.structure.get("stages", []) if template.structure else []

        for idx, stage in enumerate(stages):
            try:
                entry = self._calculate_stage_by_tranche(
                    stage=stage,
                    stage_order=idx + 1,
                    tranche_amounts=tranche_amounts,
                    agreement=fake_agreement,
                    invoice_date=simulation_date,
                    pharmacy_id=0,
                    laboratoire_id=0,
                    previous_cumulative=cumulative_amount,
                    is_preview=True,
                )
                cumulative_amount += Decimal(str(entry["total_amount"]))
                entries.append(entry)
                validations.append({
                    "stage_id": stage["stage_id"],
                    "status": "ok",
                    "message": f"Etape {stage['label']} : {entry['total_amount']:.2f}EUR",
                })
            except Exception as e:
                validations.append({
                    "stage_id": stage.get("stage_id", f"stage_{idx}"),
                    "status": "error",
                    "message": str(e),
                })

        # Si pas de stages, utiliser les paliers
        if not entries:
            entries, cumulative_amount = self._calculate_from_tiers(
                agreement=fake_agreement,
                template=template,
                tranche_amounts=tranche_amounts,
                eligible_amount=classification["eligible_amount"],
                invoice_date=simulation_date,
            )
            for entry in entries:
                validations.append({
                    "stage_id": entry.get("stage_id", "rfa"),
                    "status": "ok",
                    "message": f"RFA palier : {entry['total_amount']:.2f}EUR",
                })

        total_rfa = float(cumulative_amount)
        eligible = classification["eligible_amount"]
        total_pct = total_rfa / eligible if eligible > 0 else 0

        # Validation globale
        validations.append({
            "stage_id": "_global",
            "status": "ok",
            "message": f"Total RFA = {total_pct:.1%} sur {eligible:.0f}EUR eligible",
        })

        return {
            "entries": entries,
            "total_rfa": round(total_rfa, 2),
            "total_rfa_percentage": round(total_pct, 4),
            "tranche_breakdown": {
                k: {"amount_ht": v["amount"], "line_count": v["line_count"]}
                for k, v in tranche_amounts.items()
            },
            "validations": validations,
        }

    # ========================================================================
    # CORRECTION CRITIQUE : Classification par ligne
    # ========================================================================

    def _filter_and_classify_lines(
        self,
        invoice_lines: List[dict],
        agreement_config: Optional[dict] = None,
    ) -> dict:
        """
        CORRECTION vs original : traite chaque ligne individuellement.

        Etape 1 : Filtrer les OTC (TVA != 2.10%)
        Etape 2 : Classifier chaque ligne eligible en tranche A ou B
        Etape 3 : Agreger les montants par tranche

        Regles metier :
          - TVA 2.10% = produit eligible (generique remboursable)
          - TVA != 2.10% = OTC, exclu du calcul RFA
          - Tranche A : remise_pourcentage entre 0% et 2.5% (inclus)
          - Tranche B : remise_pourcentage > 2.5%

        Si agreement_config contient des classification_criteria specifiques,
        on les utilise en priorite. Sinon, regles par defaut.

        Returns:
            {
                "otc_amount": 850.0,
                "eligible_amount": 9150.0,
                "tranches": {
                    "tranche_A": {"amount": 2400.0, "line_count": 8},
                    "tranche_B": {"amount": 6750.0, "line_count": 22}
                }
            }
        """
        if not invoice_lines:
            return {
                "otc_amount": 0.0,
                "eligible_amount": 0.0,
                "tranches": {},
            }

        # Extraire les criteres de classification de la config si disponibles
        tranche_a_range = [0, TRANCHE_A_MAX_REMISE / 100]  # [0, 0.025]
        tranche_b_min = TRANCHE_A_MAX_REMISE / 100         # 0.025

        if agreement_config:
            tranches_cfg = agreement_config.get("tranche_configurations", {})
            if "tranche_A" in tranches_cfg:
                criteria_a = tranches_cfg["tranche_A"].get("classification_criteria", {})
                if "base_rebate_range" in criteria_a:
                    tranche_a_range = criteria_a["base_rebate_range"]
            if "tranche_B" in tranches_cfg:
                criteria_b = tranches_cfg["tranche_B"].get("classification_criteria", {})
                if "base_rebate_range" in criteria_b:
                    tranche_b_min = criteria_b["base_rebate_range"][0] if criteria_b["base_rebate_range"] else tranche_b_min

        otc_amount = 0.0
        tranche_a_amount = 0.0
        tranche_a_count = 0
        tranche_b_amount = 0.0
        tranche_b_count = 0

        for line in invoice_lines:
            montant_ht = float(line.get("montant_ht", 0))
            taux_tva = float(line.get("taux_tva", 0))
            remise_pct = float(line.get("remise_pourcentage", line.get("remise_pct", 0)))

            # Etape 1 : Filtrer les OTC
            if abs(taux_tva - TVA_ELIGIBLE) > 0.01:
                otc_amount += montant_ht
                continue

            # Normaliser la remise en ratio (si > 1 alors c'est un pourcentage)
            remise_ratio = remise_pct / 100 if remise_pct > 1 else remise_pct

            # Etape 2 : Classifier
            if tranche_a_range[0] <= remise_ratio <= tranche_a_range[1]:
                tranche_a_amount += montant_ht
                tranche_a_count += 1
            else:
                tranche_b_amount += montant_ht
                tranche_b_count += 1

        tranches = {}
        if tranche_a_count > 0:
            tranches["tranche_A"] = {
                "amount": round(tranche_a_amount, 2),
                "line_count": tranche_a_count,
            }
        if tranche_b_count > 0:
            tranches["tranche_B"] = {
                "amount": round(tranche_b_amount, 2),
                "line_count": tranche_b_count,
            }

        eligible = round(tranche_a_amount + tranche_b_amount, 2)

        return {
            "otc_amount": round(otc_amount, 2),
            "eligible_amount": eligible,
            "tranches": tranches,
        }

    # ========================================================================
    # CORRECTION CRITIQUE : Calcul par etape avec ventilation par tranche
    # ========================================================================

    def _calculate_stage_by_tranche(
        self,
        stage: dict,
        stage_order: int,
        tranche_amounts: dict,
        agreement: Any,
        invoice_date: date,
        pharmacy_id: int,
        laboratoire_id: int,
        previous_cumulative: Decimal,
        is_preview: bool = False,
    ) -> dict:
        """
        CORRECTION vs original : pour chaque etape, calcule separement
        pour chaque tranche puis somme.

        Pour chaque etape :
          montant_A = tranche_A.amount * taux_A_pour_cette_etape
          montant_B = tranche_B.amount * taux_B_pour_cette_etape
          total_etape = montant_A + montant_B
        """
        stage_id = stage["stage_id"]
        rate_type = stage.get("rate_type", "percentage")
        delay_months = stage.get("delay_months", 0)

        # Extraire les configs par tranche depuis agreement_config
        ag_config = getattr(agreement, "agreement_config", None) or {}
        tranche_configs = ag_config.get("tranche_configurations", {})

        total_stage_amount = Decimal("0")
        tranche_a_amount = Decimal("0")
        tranche_b_amount = Decimal("0")
        rate_used = None
        incremental_rate_used = None

        for tranche_key, tranche_data in tranche_amounts.items():
            tranche_ht = Decimal(str(tranche_data["amount"]))
            if tranche_ht <= 0:
                continue

            # Obtenir la config de cette tranche pour cette etape
            t_config = tranche_configs.get(tranche_key, {})
            stages_config = t_config.get("stages", {}) if isinstance(t_config, dict) else {}
            stage_config = stages_config.get(stage_id, {}) if isinstance(stages_config, dict) else {}

            # Calculer le montant selon rate_type
            amount = Decimal("0")
            if rate_type == "percentage":
                r = stage_config.get("rate", 0) if isinstance(stage_config, dict) else 0
                rate_used = r
                amount = tranche_ht * Decimal(str(r))

            elif rate_type == "incremental_percentage":
                r = stage_config.get("incremental_rate", 0) if isinstance(stage_config, dict) else 0
                incremental_rate_used = r
                amount = tranche_ht * Decimal(str(r))

            elif rate_type == "conditional_percentage":
                r = stage_config.get("incremental_rate", 0) if isinstance(stage_config, dict) else 0
                incremental_rate_used = r
                conditions = stage.get("conditions", [])
                condition_met = True

                if conditions and not is_preview:
                    condition = conditions[0]
                    condition_met, _ = self._evaluate_condition(
                        condition=condition,
                        stage_config=stage_config,
                        pharmacy_id=pharmacy_id,
                        laboratoire_id=laboratoire_id,
                        invoice_date=invoice_date,
                    )

                if condition_met:
                    amount = tranche_ht * Decimal(str(r))

            # Affecter au bon tranche
            if tranche_key == "tranche_A":
                tranche_a_amount = amount
            else:
                tranche_b_amount = amount

            total_stage_amount += amount

        # Cumul
        cumulative_amount = previous_cumulative + total_stage_amount

        # Calculer le taux cumule par rapport au montant eligible total
        total_eligible = sum(
            Decimal(str(t["amount"])) for t in tranche_amounts.values()
        )
        cumulative_rate = float(
            (cumulative_amount / total_eligible).quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            )
        ) if total_eligible > 0 else 0

        # Date attendue
        expected_date = self._add_months(invoice_date, delay_months)

        # Statut
        if delay_months == 0:
            status = "received"
        elif rate_type == "conditional_percentage":
            status = "conditional"
        else:
            status = "pending"

        # Arrondi
        entry = {
            "stage_id": stage_id,
            "stage_label": stage.get("label", stage_id),
            "stage_order": stage_order,
            "tranche_A_amount": float(tranche_a_amount.quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )),
            "tranche_B_amount": float(tranche_b_amount.quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )),
            "total_amount": float(total_stage_amount.quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )),
            "cumulative_amount": float(cumulative_amount.quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )),
            "cumulative_rate": cumulative_rate,
            "expected_date": expected_date.isoformat(),
            "payment_method": stage.get("payment_method", "emac_transfer"),
            "status": status,
            "is_conditional": rate_type == "conditional_percentage",
            # Reconciliation v1.1
            "actual_amount": None,
            "received_date": None,
            "variance": None,
            "reconciliation_status": "not_reconciled",
        }

        if rate_used is not None:
            entry["rate"] = rate_used
        if incremental_rate_used is not None:
            entry["incremental_rate"] = incremental_rate_used

        return entry

    # ========================================================================
    # CALCUL SIMPLIFIE AVEC PALIERS (quand pas de structure/stages)
    # ========================================================================

    def _calculate_from_tiers(
        self,
        agreement: Any,
        template: RebateTemplate,
        tranche_amounts: dict,
        eligible_amount: float,
        invoice_date: date,
    ) -> Tuple[List[dict], Decimal]:
        """
        Calcul simplifie utilisant les paliers (tiers) du template/accord.
        Utilise quand le template n'a pas de structure avec stages.

        Determine le palier applicable en fonction du CA cumule de l'accord,
        puis applique le taux a chaque tranche.
        """
        # Determiner les paliers effectifs
        tiers = []
        if hasattr(agreement, 'custom_tiers') and agreement.custom_tiers:
            tiers = agreement.custom_tiers
        elif template.tiers:
            tiers = template.tiers

        if not tiers:
            return [], Decimal("0")

        # Determiner le CA cumule pour choisir le palier
        ca_cumule = getattr(agreement, 'ca_cumule', 0) or 0
        ca_total = ca_cumule + eligible_amount

        # Trouver le palier applicable
        taux_rfa = 0.0
        palier_label = "Aucun"
        for palier in sorted(tiers, key=lambda x: x.get("seuil_min", 0)):
            seuil_min = palier.get("seuil_min", 0)
            seuil_max = palier.get("seuil_max")
            if ca_total >= seuil_min and (seuil_max is None or ca_total < seuil_max):
                taux_rfa = palier.get("taux", 0) / 100  # Convertir % en ratio
                palier_label = palier.get("label", f"Palier {taux_rfa*100:.0f}%")
                break

        if taux_rfa <= 0:
            return [], Decimal("0")

        # Calculer par tranche
        tranche_a_ht = Decimal(str(tranche_amounts.get("tranche_A", {}).get("amount", 0)))
        tranche_b_ht = Decimal(str(tranche_amounts.get("tranche_B", {}).get("amount", 0)))
        taux_dec = Decimal(str(taux_rfa))

        tranche_a_rfa = tranche_a_ht * taux_dec
        tranche_b_rfa = tranche_b_ht * taux_dec
        total = tranche_a_rfa + tranche_b_rfa

        # Escompte (ajout si applicable)
        escompte_amount = Decimal("0")
        taux_escompte = 0.0
        if hasattr(agreement, 'taux_escompte') and agreement.taux_escompte:
            taux_escompte = agreement.taux_escompte / 100
        elif template.taux_escompte:
            taux_escompte = template.taux_escompte / 100

        entries = []

        # Entree RFA principale
        entries.append({
            "stage_id": "rfa",
            "stage_label": f"RFA {palier_label}",
            "stage_order": 1,
            "tranche_A_amount": float(tranche_a_rfa.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "tranche_B_amount": float(tranche_b_rfa.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "total_amount": float(total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "rate": taux_rfa,
            "cumulative_amount": float(total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "cumulative_rate": float(total / Decimal(str(eligible_amount))) if eligible_amount > 0 else 0,
            "expected_date": self._compute_rfa_date(invoice_date, template).isoformat(),
            "payment_method": "credit_note",
            "status": "pending",
            "is_conditional": False,
            "actual_amount": None,
            "received_date": None,
            "variance": None,
            "reconciliation_status": "not_reconciled",
        })

        cumul = total

        # Escompte si applicable
        if taux_escompte > 0:
            eligible_dec = Decimal(str(eligible_amount))
            escompte_amount = eligible_dec * Decimal(str(taux_escompte))
            cumul += escompte_amount

            delai = template.delai_escompte_jours or 30
            entries.append({
                "stage_id": "escompte",
                "stage_label": f"Escompte {taux_escompte*100:.1f}% ({delai}j)",
                "stage_order": 2,
                "tranche_A_amount": float((tranche_a_ht * Decimal(str(taux_escompte))).quantize(Decimal("0.01"))),
                "tranche_B_amount": float((tranche_b_ht * Decimal(str(taux_escompte))).quantize(Decimal("0.01"))),
                "total_amount": float(escompte_amount.quantize(Decimal("0.01"))),
                "rate": taux_escompte,
                "cumulative_amount": float(cumul.quantize(Decimal("0.01"))),
                "cumulative_rate": float(cumul / eligible_dec) if eligible_amount > 0 else 0,
                "expected_date": (invoice_date + timedelta(days=delai)).isoformat(),
                "payment_method": "invoice_deduction",
                "status": "received",
                "is_conditional": False,
                "actual_amount": None,
                "received_date": None,
                "variance": None,
                "reconciliation_status": "not_reconciled",
            })

        return entries, cumul

    # ========================================================================
    # METHODES INTERNES
    # ========================================================================

    def _get_applicable_agreement(
        self,
        pharmacy_id: int,
        laboratoire_id: int,
        target_date: date,
    ) -> LaboratoryAgreement:
        """
        Trouve l'accord actif pour un couple labo/pharmacie a une date.
        Exactement 1 resultat attendu.
        """
        agreement = self.db.query(LaboratoryAgreement).filter(
            LaboratoryAgreement.pharmacy_id == pharmacy_id,
            LaboratoryAgreement.laboratoire_id == laboratoire_id,
            LaboratoryAgreement.statut == AgreementStatus.ACTIF,
            LaboratoryAgreement.date_debut <= target_date,
            or_(
                LaboratoryAgreement.date_fin.is_(None),
                LaboratoryAgreement.date_fin >= target_date,
            ),
        ).first()

        if not agreement:
            raise NoActiveAgreementError(
                f"Aucun accord actif trouve pour le laboratoire {laboratoire_id} "
                f"a la date du {target_date.strftime('%d/%m/%Y')}. "
                f"Veuillez creer ou activer un accord commercial."
            )

        return agreement

    def _load_template(self, template_id: Optional[int]) -> RebateTemplate:
        """Charge un template par son ID"""
        if template_id is None:
            raise InvalidConfigError("template_id est requis pour le calcul.")

        template = self.db.query(RebateTemplate).filter(
            RebateTemplate.id == template_id,
            RebateTemplate.actif == True,
        ).first()

        if not template:
            raise InvalidConfigError(
                f"Template de remise #{template_id} introuvable ou desactive."
            )

        return template

    def _evaluate_condition(
        self,
        condition: dict,
        stage_config: dict,
        pharmacy_id: int,
        laboratoire_id: int,
        invoice_date: date,
    ) -> Tuple[bool, dict]:
        """
        Evalue si une condition est remplie.
        Returns: (is_met, condition_info_dict)
        """
        condition_type = condition.get("type", "")
        threshold = stage_config.get("condition_threshold", 0) if isinstance(stage_config, dict) else 0

        if condition_type == "annual_volume":
            return self._evaluate_annual_volume(
                pharmacy_id=pharmacy_id,
                laboratoire_id=laboratoire_id,
                year=invoice_date.year,
                invoice_date=invoice_date,
                threshold=threshold,
            )
        elif condition_type == "payment_punctuality":
            # TODO v1.1 : implementer le calcul de ponctualite
            return True, {
                "type": "payment_punctuality",
                "threshold": threshold,
                "current_value": 0,
                "current_percentage": 0,
                "is_likely_met": None,
                "confidence": "not_implemented",
            }

        # Condition inconnue → on l'accepte par defaut
        logger.warning(f"Type de condition inconnu : '{condition_type}'")
        return True, {
            "type": condition_type,
            "threshold": threshold,
            "is_likely_met": None,
            "confidence": "unknown_type",
        }

    def _evaluate_annual_volume(
        self,
        pharmacy_id: int,
        laboratoire_id: int,
        year: int,
        invoice_date: date,
        threshold: float,
    ) -> Tuple[bool, dict]:
        """
        Evalue la condition de volume annuel (CA >= seuil).
        Calcule le CA reel depuis le debut de l'annee + projection lineaire.
        """
        try:
            result = self.db.query(
                func.coalesce(func.sum(FactureLabo.montant_net_ht), 0)
            ).filter(
                FactureLabo.pharmacy_id == pharmacy_id,
                FactureLabo.laboratoire_id == laboratoire_id,
                extract("year", FactureLabo.date_facture) == year,
            ).scalar()

            current_total = float(result) if result else 0
        except Exception as e:
            logger.error(f"Erreur calcul CA annuel: {e}")
            current_total = 0

        # Projection lineaire
        year_start = date(year, 1, 1)
        days_elapsed = max((invoice_date - year_start).days, 1)
        days_in_year = 366 if year % 4 == 0 else 365
        projection = current_total * (days_in_year / days_elapsed)

        # Fiabilite
        if days_elapsed < 60:
            confidence = "low"
        elif days_elapsed < 180:
            confidence = "medium"
        else:
            confidence = "high"

        current_pct = (current_total / threshold * 100) if threshold > 0 else 0
        is_met = projection >= threshold

        return is_met, {
            "type": "annual_volume",
            "threshold": threshold,
            "current_value": round(current_total, 2),
            "current_percentage": round(current_pct, 1),
            "projection_year_end": round(projection, 2),
            "is_likely_met": is_met,
            "confidence": confidence,
        }

    def _build_applied_config_snapshot(
        self,
        agreement: LaboratoryAgreement,
        template: RebateTemplate,
    ) -> dict:
        """Construit un snapshot immutable de la configuration au moment du calcul"""
        return {
            "agreement_id": agreement.id,
            "agreement_version": agreement.version,
            "template_id": template.id,
            "template_nom": template.nom,
            "template_version": template.version if hasattr(template, 'version') else 1,
            "tiers": agreement.custom_tiers or template.tiers,
            "structure": template.structure,
            "taux_escompte": agreement.taux_escompte if agreement.taux_escompte is not None else template.taux_escompte,
            "taux_cooperation": agreement.taux_cooperation if agreement.taux_cooperation is not None else template.taux_cooperation,
            "agreement_config": agreement.agreement_config,
            "snapshot_date": date.today().isoformat(),
        }

    def _determine_tranche_type(self, tranche_amounts: dict) -> str:
        """Determine le type de tranche dominant"""
        if not tranche_amounts:
            return "unknown"
        if len(tranche_amounts) == 1:
            return list(tranche_amounts.keys())[0]

        # Si les deux tranches sont presentes
        a_amount = tranche_amounts.get("tranche_A", {}).get("amount", 0)
        b_amount = tranche_amounts.get("tranche_B", {}).get("amount", 0)
        total = a_amount + b_amount
        if total == 0:
            return "unknown"

        a_pct = a_amount / total
        if a_pct >= 0.8:
            return "tranche_A"
        elif a_pct <= 0.2:
            return "tranche_B"
        return "mixed"

    def _compute_main_echeance(self, invoice_date: date, template: RebateTemplate) -> date:
        """Calcule la date d'echeance principale selon la frequence du template"""
        from app.models_rebate import RebateFrequency
        freq = template.frequence
        if freq == RebateFrequency.MENSUEL:
            return self._add_months(invoice_date, 1)
        elif freq == RebateFrequency.TRIMESTRIEL:
            return self._add_months(invoice_date, 3)
        elif freq == RebateFrequency.SEMESTRIEL:
            return self._add_months(invoice_date, 6)
        else:  # ANNUEL
            return date(invoice_date.year + 1, 3, 31)  # 31 mars N+1

    def _compute_rfa_date(self, invoice_date: date, template: RebateTemplate) -> date:
        """Date de versement RFA selon la frequence"""
        return self._compute_main_echeance(invoice_date, template)

    def _add_months(self, source_date: date, months: int) -> date:
        """Ajoute N mois a une date (gestion fin de mois)"""
        month = source_date.month - 1 + months
        year = source_date.year + month // 12
        month = month % 12 + 1
        day = min(source_date.day, calendar.monthrange(year, month)[1])
        return date(year, month, day)


# ============================================================================
# SERVICE : Versioning des accords
# ============================================================================

class AgreementVersioningService:
    """
    Gere le cycle de vie et le versioning des accords commerciaux.

    Regle cle : modifier un accord actif cree TOUJOURS une nouvelle version.
    L'ancien accord passe en "archive" et n'est plus utilise pour les
    nouvelles factures, mais les factures existantes gardent leur snapshot.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_agreement(
        self,
        pharmacy_id: int,
        laboratoire_id: int,
        template_id: int,
        nom: str,
        date_debut: date,
        agreement_config: Optional[dict] = None,
        custom_tiers: Optional[list] = None,
        date_fin: Optional[date] = None,
        reference_externe: Optional[str] = None,
        notes: Optional[str] = None,
        created_by: Optional[int] = None,
        activate: bool = False,
        taux_escompte: Optional[float] = None,
        taux_cooperation: Optional[float] = None,
        gratuites_ratio: Optional[str] = None,
        objectif_ca_annuel: Optional[float] = None,
    ) -> LaboratoryAgreement:
        """Cree un nouvel accord (en brouillon ou actif)"""

        # Charger le template pour figer la version
        template = self.db.query(RebateTemplate).filter(
            RebateTemplate.id == template_id
        ).first()
        if not template:
            raise InvalidConfigError(f"Template #{template_id} introuvable")

        statut = AgreementStatus.ACTIF if activate else AgreementStatus.BROUILLON

        # Si activation, archiver les accords actifs existants
        if activate:
            self._archive_active_agreements(
                pharmacy_id, laboratoire_id, date_debut, created_by
            )

        agreement = LaboratoryAgreement(
            pharmacy_id=pharmacy_id,
            laboratoire_id=laboratoire_id,
            template_id=template_id,
            template_version=template.version if hasattr(template, 'version') else 1,
            nom=nom,
            agreement_config=agreement_config,
            custom_tiers=custom_tiers,
            date_debut=date_debut,
            date_fin=date_fin,
            reference_externe=reference_externe,
            notes=notes,
            taux_escompte=taux_escompte,
            taux_cooperation=taux_cooperation,
            gratuites_ratio=gratuites_ratio,
            objectif_ca_annuel=objectif_ca_annuel,
            version=1,
            statut=statut,
            created_by=created_by,
        )
        self.db.add(agreement)
        self.db.flush()

        # Audit log
        self._log_audit(
            agreement_id=agreement.id,
            action="creation" if not activate else "activation",
            user_id=created_by,
            nouvel_etat={"nom": nom, "statut": statut.value},
        )

        self.db.commit()
        self.db.refresh(agreement)
        return agreement

    def activate_agreement(
        self,
        agreement_id: int,
        user_id: Optional[int] = None,
    ) -> LaboratoryAgreement:
        """Active un accord en brouillon"""
        agreement = self.db.query(LaboratoryAgreement).get(agreement_id)
        if not agreement:
            raise RebateEngineError(f"Accord #{agreement_id} introuvable")

        if agreement.statut != AgreementStatus.BROUILLON:
            raise RebateEngineError(
                f"Seul un accord en brouillon peut etre active. "
                f"Statut actuel : {agreement.statut.value}"
            )

        # Archiver les accords actifs existants
        self._archive_active_agreements(
            pharmacy_id=agreement.pharmacy_id,
            laboratoire_id=agreement.laboratoire_id,
            effective_date=agreement.date_debut,
            user_id=user_id,
        )

        agreement.statut = AgreementStatus.ACTIF
        self._log_audit(agreement.id, "activation", user_id=user_id)
        self.db.commit()
        self.db.refresh(agreement)
        return agreement

    def update_agreement(
        self,
        agreement_id: int,
        user_id: Optional[int] = None,
        reason: Optional[str] = None,
        **kwargs,
    ) -> LaboratoryAgreement:
        """
        Modifie un accord.
        - Si brouillon → modification directe
        - Si actif → cree nouvelle version
        """
        current = self.db.query(LaboratoryAgreement).get(agreement_id)
        if not current:
            raise RebateEngineError(f"Accord #{agreement_id} introuvable")

        if current.statut == AgreementStatus.BROUILLON:
            # Modification directe
            ancien_etat = {"nom": current.nom, "statut": current.statut.value}
            for key, value in kwargs.items():
                if value is not None and hasattr(current, key):
                    setattr(current, key, value)

            self._log_audit(
                current.id, "modification",
                user_id=user_id,
                ancien_etat=ancien_etat,
                nouvel_etat={k: str(v) for k, v in kwargs.items() if v is not None},
                description=reason,
            )
            self.db.commit()
            self.db.refresh(current)
            return current

        elif current.statut == AgreementStatus.ACTIF:
            return self._create_new_version(
                current_agreement=current,
                user_id=user_id,
                reason=reason,
                **kwargs,
            )
        else:
            raise RebateEngineError(
                f"Impossible de modifier un accord en statut '{current.statut.value}'. "
                f"Seuls les accords 'brouillon' ou 'actif' sont modifiables."
            )

    def _create_new_version(
        self,
        current_agreement: LaboratoryAgreement,
        user_id: Optional[int] = None,
        reason: Optional[str] = None,
        **kwargs,
    ) -> LaboratoryAgreement:
        """Cree une nouvelle version d'un accord actif"""

        # 1. Archiver l'ancien
        current_agreement.statut = AgreementStatus.ARCHIVE
        current_agreement.date_fin = date.today()
        self._log_audit(
            current_agreement.id, "archivage",
            user_id=user_id, description=reason,
        )

        # 2. Creer la nouvelle version
        new_agreement = LaboratoryAgreement(
            pharmacy_id=current_agreement.pharmacy_id,
            laboratoire_id=current_agreement.laboratoire_id,
            template_id=current_agreement.template_id,
            template_version=current_agreement.template_version,
            nom=kwargs.get("nom", current_agreement.nom),
            agreement_config=kwargs.get("agreement_config", current_agreement.agreement_config),
            custom_tiers=kwargs.get("custom_tiers", current_agreement.custom_tiers),
            taux_escompte=kwargs.get("taux_escompte", current_agreement.taux_escompte),
            taux_cooperation=kwargs.get("taux_cooperation", current_agreement.taux_cooperation),
            gratuites_ratio=kwargs.get("gratuites_ratio", current_agreement.gratuites_ratio),
            objectif_ca_annuel=kwargs.get("objectif_ca_annuel", current_agreement.objectif_ca_annuel),
            date_debut=date.today(),
            date_fin=kwargs.get("date_fin", current_agreement.date_fin),
            reference_externe=kwargs.get("reference_externe", current_agreement.reference_externe),
            notes=kwargs.get("notes", current_agreement.notes),
            version=current_agreement.version + 1,
            previous_version_id=current_agreement.id,
            statut=AgreementStatus.ACTIF,
            created_by=user_id,
            ca_cumule=current_agreement.ca_cumule,
            remise_cumulee=current_agreement.remise_cumulee,
        )
        self.db.add(new_agreement)
        self.db.flush()

        self._log_audit(
            new_agreement.id, "creation",
            user_id=user_id,
            nouvel_etat={"version": new_agreement.version, "from": current_agreement.id},
            description=reason,
        )

        self.db.commit()
        self.db.refresh(new_agreement)

        logger.info(
            f"Versioning: accord #{current_agreement.id} v{current_agreement.version} "
            f"→ #{new_agreement.id} v{new_agreement.version}"
        )

        return new_agreement

    def get_version_history(
        self,
        pharmacy_id: int,
        laboratoire_id: int,
    ) -> List[LaboratoryAgreement]:
        """Retourne toutes les versions d'un accord, du plus recent au plus ancien"""
        return (
            self.db.query(LaboratoryAgreement)
            .filter(
                LaboratoryAgreement.pharmacy_id == pharmacy_id,
                LaboratoryAgreement.laboratoire_id == laboratoire_id,
            )
            .order_by(LaboratoryAgreement.version.desc())
            .all()
        )

    def _archive_active_agreements(
        self,
        pharmacy_id: int,
        laboratoire_id: int,
        effective_date: date,
        user_id: Optional[int] = None,
    ):
        """Archive tous les accords actifs pour ce couple labo/pharmacie"""
        active_agreements = (
            self.db.query(LaboratoryAgreement)
            .filter(
                LaboratoryAgreement.pharmacy_id == pharmacy_id,
                LaboratoryAgreement.laboratoire_id == laboratoire_id,
                LaboratoryAgreement.statut == AgreementStatus.ACTIF,
            )
            .all()
        )

        for agreement in active_agreements:
            agreement.statut = AgreementStatus.ARCHIVE
            agreement.date_fin = effective_date
            self._log_audit(agreement.id, "archivage", user_id=user_id)

    def _log_audit(
        self,
        agreement_id: int,
        action: str,
        user_id: Optional[int] = None,
        ancien_etat: Optional[dict] = None,
        nouvel_etat: Optional[dict] = None,
        description: Optional[str] = None,
    ):
        """Cree une entree dans le journal d'audit"""
        # user_id est requis par le modele — utiliser 0 si non fourni (systeme)
        audit = AgreementAuditLog(
            agreement_id=agreement_id,
            action=action,
            ancien_etat=ancien_etat,
            nouvel_etat=nouvel_etat,
            user_id=user_id or 0,
            description=description,
        )
        self.db.add(audit)
