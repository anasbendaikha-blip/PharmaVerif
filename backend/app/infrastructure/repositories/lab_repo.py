"""
Repository pour Laboratoire (scope pharmacy_id).
"""

from app.infrastructure.repositories.base import BaseRepository
from app.models_labo import Laboratoire


class LaboratoireRepository(BaseRepository[Laboratoire]):
    """Laboratoires scopes par pharmacy_id."""

    model = Laboratoire

    def list_actifs(self) -> list[Laboratoire]:
        return (
            self._base_query()
            .filter(Laboratoire.actif == True)  # noqa: E712
            .order_by(Laboratoire.nom)
            .all()
        )

    def find_by_nom(self, nom: str) -> Laboratoire | None:
        return (
            self._base_query()
            .filter(Laboratoire.nom == nom)
            .first()
        )
