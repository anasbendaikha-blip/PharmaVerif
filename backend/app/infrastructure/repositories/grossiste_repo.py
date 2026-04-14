"""Repository pour Grossiste (scope pharmacy_id)."""

from app.infrastructure.repositories.base import BaseRepository
from app.models import Grossiste


class GrossisteRepository(BaseRepository[Grossiste]):
    model = Grossiste

    def find_by_nom(self, nom: str) -> Grossiste | None:
        return self._base_query().filter(Grossiste.nom == nom).first()
