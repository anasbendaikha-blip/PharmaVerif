"""
Repository pour les entites RFA : LaboratoryAgreement, InvoiceRebateSchedule,
RebateTemplate.

Particularite : RebateTemplate N'A PAS de pharmacy_id (templates partages
entre tenants). Le filtrage se fait sur le champ `scope` ("system", "group",
"pharmacy") plutot que sur pharmacy_id. Les methodes concernees sont sorties
du pattern BaseRepository et regroupees dans la classe consolidee ci-dessous.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.infrastructure.repositories.base import RepositoryError
from app.models_rebate import (
    AgreementAuditLog,
    InvoiceRebateSchedule,
    LaboratoryAgreement,
    RebateTemplate,
)


class RebateRepository:
    """
    Repository consolide pour les entites RFA.

    - Agreements et Schedules : filtres par pharmacy_id (multi-tenant strict).
    - Templates               : non scopes (partages), filtrage via `scope`.
    """

    def __init__(self, db: Session, pharmacy_id: int):
        if pharmacy_id is None:
            raise ValueError(
                "RebateRepository exige un pharmacy_id non-None pour les "
                "agreements et schedules."
            )
        self.db = db
        self.pharmacy_id = pharmacy_id

    # ------------------------------------------------------------------
    # LaboratoryAgreement (pharmacy_id OBLIGATOIRE dans le modele)
    # ------------------------------------------------------------------
    def _agreements_q(self):
        return self.db.query(LaboratoryAgreement).filter(
            LaboratoryAgreement.pharmacy_id == self.pharmacy_id
        )

    def get_agreement(self, agreement_id: int) -> Optional[LaboratoryAgreement]:
        return self._agreements_q().filter(LaboratoryAgreement.id == agreement_id).first()

    def get_agreement_or_404(self, agreement_id: int) -> LaboratoryAgreement:
        item = self.get_agreement(agreement_id)
        if item is None:
            raise RepositoryError(
                f"LaboratoryAgreement id={agreement_id} non trouve pour "
                f"pharmacy_id={self.pharmacy_id}"
            )
        return item

    def list_agreements(
        self, *, statut: Optional[str] = None, laboratoire_id: Optional[int] = None,
    ) -> list[LaboratoryAgreement]:
        q = self._agreements_q()
        if statut:
            q = q.filter(LaboratoryAgreement.statut == statut)
        if laboratoire_id is not None:
            q = q.filter(LaboratoryAgreement.laboratoire_id == laboratoire_id)
        return q.order_by(LaboratoryAgreement.date_debut.desc()).all()

    def get_active_agreement_for_lab(self, laboratoire_id: int) -> Optional[LaboratoryAgreement]:
        from app.models_rebate import AgreementStatus
        return (
            self._agreements_q()
            .filter(
                LaboratoryAgreement.laboratoire_id == laboratoire_id,
                LaboratoryAgreement.statut == AgreementStatus.ACTIF,
            )
            .first()
        )

    # ------------------------------------------------------------------
    # InvoiceRebateSchedule (pharmacy_id OBLIGATOIRE)
    # ------------------------------------------------------------------
    def _schedules_q(self):
        return self.db.query(InvoiceRebateSchedule).filter(
            InvoiceRebateSchedule.pharmacy_id == self.pharmacy_id
        )

    def get_schedule(self, schedule_id: int) -> Optional[InvoiceRebateSchedule]:
        return self._schedules_q().filter(InvoiceRebateSchedule.id == schedule_id).first()

    def list_schedules(
        self, *, agreement_id: Optional[int] = None, facture_labo_id: Optional[int] = None,
    ) -> list[InvoiceRebateSchedule]:
        q = self._schedules_q()
        if agreement_id is not None:
            q = q.filter(InvoiceRebateSchedule.agreement_id == agreement_id)
        if facture_labo_id is not None:
            q = q.filter(InvoiceRebateSchedule.facture_labo_id == facture_labo_id)
        return q.all()

    # ------------------------------------------------------------------
    # AgreementAuditLog (filtre indirect via agreement.pharmacy_id)
    # ------------------------------------------------------------------
    def list_audit_logs(self, agreement_id: int) -> list[AgreementAuditLog]:
        """
        Journal d'audit d'un accord. Verifie d'abord que l'accord appartient
        a la pharmacy_id du repository pour eviter tout leak cross-tenant.
        """
        if self.get_agreement(agreement_id) is None:
            return []
        return (
            self.db.query(AgreementAuditLog)
            .filter(AgreementAuditLog.agreement_id == agreement_id)
            .order_by(AgreementAuditLog.created_at.desc())
            .all()
        )

    # ------------------------------------------------------------------
    # RebateTemplate (PAS de pharmacy_id — templates partages)
    # ------------------------------------------------------------------
    # TODO [phase-2-follow-up] MT-002 : une fois pharmacy_id ajoute a
    # RebateTemplate, cette methode filtrera aussi les templates "pharmacy".
    def list_templates(
        self,
        *,
        laboratoire_nom: Optional[str] = None,
        scope: Optional[str] = None,
        actif_only: bool = True,
    ) -> list[RebateTemplate]:
        """
        Liste les templates accessibles a cette pharmacy.
        Par defaut : uniquement les templates `actif=True`.
        """
        q = self.db.query(RebateTemplate)
        if actif_only:
            q = q.filter(RebateTemplate.actif == True)  # noqa: E712
        if laboratoire_nom:
            q = q.filter(RebateTemplate.laboratoire_nom.ilike(f"%{laboratoire_nom}%"))
        if scope:
            q = q.filter(RebateTemplate.scope == scope)
        return q.order_by(RebateTemplate.laboratoire_nom, RebateTemplate.nom).all()

    def get_template(self, template_id: int) -> Optional[RebateTemplate]:
        return (
            self.db.query(RebateTemplate)
            .filter(RebateTemplate.id == template_id)
            .first()
        )
