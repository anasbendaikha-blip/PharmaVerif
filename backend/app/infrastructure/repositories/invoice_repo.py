"""
Repository pour les factures laboratoires (FactureLabo).

Expose les methodes frequemment utilisees par les routes :
  - get / get_or_404 (scopees pharmacy_id)
  - get_with_lignes (eager loading)
  - get_with_all (lignes + anomalies)
  - list_by_laboratoire
  - get_lignes (acces controle via la facture parente)
  - list_anomalies_non_resolues
"""

from typing import Optional

from sqlalchemy.orm import joinedload

from app.infrastructure.repositories.base import BaseRepository
from app.models_labo import (
    AnomalieFactureLabo,
    FactureLabo,
    LigneFactureLabo,
)


class InvoiceLaboRepository(BaseRepository[FactureLabo]):
    """Factures labo scopees par pharmacy_id."""

    model = FactureLabo

    # ------------------------------------------------------------------
    # Accesseurs avec eager loading
    # ------------------------------------------------------------------
    def get_with_lignes(self, facture_id: int) -> Optional[FactureLabo]:
        return (
            self._base_query()
            .options(joinedload(FactureLabo.lignes))
            .filter(FactureLabo.id == facture_id)
            .first()
        )

    def get_with_all(self, facture_id: int) -> Optional[FactureLabo]:
        """Facture + lignes + anomalies (attribut ORM = `anomalies_labo`)."""
        return (
            self._base_query()
            .options(
                joinedload(FactureLabo.lignes),
                joinedload(FactureLabo.anomalies_labo),
            )
            .filter(FactureLabo.id == facture_id)
            .first()
        )

    # ------------------------------------------------------------------
    # Listings
    # ------------------------------------------------------------------
    def list_by_laboratoire(self, laboratoire_id: int) -> list[FactureLabo]:
        return (
            self._base_query()
            .filter(FactureLabo.laboratoire_id == laboratoire_id)
            .order_by(FactureLabo.date_facture.desc())
            .all()
        )

    def list_by_statut(self, statut: str) -> list[FactureLabo]:
        return (
            self._base_query()
            .filter(FactureLabo.statut == statut)
            .order_by(FactureLabo.date_facture.desc())
            .all()
        )

    # ------------------------------------------------------------------
    # Relations (controle d'acces via la facture parente)
    # ------------------------------------------------------------------
    def get_lignes(self, facture_id: int) -> list[LigneFactureLabo]:
        """
        Lignes d'une facture. Retourne `[]` si la facture n'appartient pas
        a la pharmacy_id du repository (pas de leak cross-tenant).
        """
        if not self.exists(facture_id):
            return []
        return (
            self.db.query(LigneFactureLabo)
            .filter(LigneFactureLabo.facture_id == facture_id)
            .all()
        )

    def list_anomalies_non_resolues(self, facture_id: int) -> list[AnomalieFactureLabo]:
        """Anomalies non resolues d'une facture scope par pharmacy_id."""
        if not self.exists(facture_id):
            return []
        return (
            self.db.query(AnomalieFactureLabo)
            .filter(
                AnomalieFactureLabo.facture_id == facture_id,
                AnomalieFactureLabo.resolu == False,  # noqa: E712 (SQL comparator)
            )
            .all()
        )

    def delete_anomalies_non_resolues(self, facture_id: int) -> int:
        """
        Supprime les anomalies non resolues d'une facture scope, renvoie
        le nombre supprime. Equivalent du `engine.persist_anomalies` legacy
        avant re-insertion.
        """
        if not self.exists(facture_id):
            return 0
        deleted = (
            self.db.query(AnomalieFactureLabo)
            .filter(
                AnomalieFactureLabo.facture_id == facture_id,
                AnomalieFactureLabo.resolu == False,  # noqa: E712
            )
            .delete()
        )
        return deleted
