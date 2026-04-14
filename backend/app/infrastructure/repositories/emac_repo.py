"""
Repository pour les EMAC (Etats Mensuels des Avantages Commerciaux).

- EMAC        : possede `pharmacy_id` (filtrage direct via BaseRepository).
- AnomalieEMAC: N'A PAS de pharmacy_id (TODO [phase-2] MT-002). Acces
                controle via l'EMAC parent.
"""

from typing import Optional

from sqlalchemy.orm import joinedload

from app.infrastructure.repositories.base import BaseRepository
from app.models_emac import EMAC, AnomalieEMAC


class EMACRepository(BaseRepository[EMAC]):
    """EMAC scopes par pharmacy_id."""

    model = EMAC

    # ------------------------------------------------------------------
    # Lecture enrichie
    # ------------------------------------------------------------------
    def get_with_anomalies(self, emac_id: int) -> Optional[EMAC]:
        return (
            self._base_query()
            .options(joinedload(EMAC.anomalies_emac))
            .filter(EMAC.id == emac_id)
            .first()
        )

    def list_by_laboratoire(self, laboratoire_id: int) -> list[EMAC]:
        return (
            self._base_query()
            .filter(EMAC.laboratoire_id == laboratoire_id)
            .order_by(EMAC.periode_debut.desc())
            .all()
        )

    def list_by_statut(self, statut: str) -> list[EMAC]:
        return (
            self._base_query()
            .filter(EMAC.statut_verification == statut)
            .order_by(EMAC.periode_debut.desc())
            .all()
        )

    # ------------------------------------------------------------------
    # AnomalieEMAC (acces controle via parent)
    # ------------------------------------------------------------------
    def list_anomalies(
        self, emac_id: int, *, severite: Optional[str] = None,
    ) -> list[AnomalieEMAC]:
        """
        Retourne les anomalies d'un EMAC, apres avoir verifie que l'EMAC
        appartient a la pharmacy_id du repository (pas de leak cross-tenant).
        """
        if not self.exists(emac_id):
            return []
        q = self.db.query(AnomalieEMAC).filter(AnomalieEMAC.emac_id == emac_id)
        if severite:
            q = q.filter(AnomalieEMAC.severite == severite)
        return q.order_by(AnomalieEMAC.created_at).all()

    def get_anomalie(self, anomalie_id: int) -> Optional[AnomalieEMAC]:
        """
        Recupere une anomalie par id apres verification d'acces via l'EMAC parent.
        Renvoie None si l'anomalie existe mais ne fait pas partie du tenant.
        """
        anomalie = (
            self.db.query(AnomalieEMAC)
            .filter(AnomalieEMAC.id == anomalie_id)
            .first()
        )
        if anomalie is None:
            return None
        if not self.exists(anomalie.emac_id):
            return None  # cross-tenant : silencieusement invisible
        return anomalie
