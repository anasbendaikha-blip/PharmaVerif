"""
PharmaVerif — BaseRepository (isolation multi-tenant forcee).

REGLE ABSOLUE
-------------
Aucune methode publique de ce module ne retourne des donnees sans le filtre
`model.pharmacy_id == self.pharmacy_id`. Toutes les requetes passent par
`_base_query()` qui applique systematiquement ce filtre. C'est la garantie
architecturale du multi-tenant : il devient impossible d'oublier l'isolation.

Les methodes create/delete forcent aussi `pharmacy_id` sur l'instance,
empechant un client de l'usurper en modifiant directement l'ORM.
"""

from typing import Generic, Optional, Type, TypeVar

from sqlalchemy.orm import Query, Session

T = TypeVar("T")


class RepositoryError(Exception):
    """Exception metier du repository (ex: get_or_404)."""


class BaseRepository(Generic[T]):
    """
    Repository abstrait. Filtre toutes les requetes par pharmacy_id.

    Usage :
        class InvoiceRepo(BaseRepository[FactureLabo]):
            model = FactureLabo

        repo = InvoiceRepo(db=session, pharmacy_id=123)
        factures = repo.list()  # filtrees automatiquement
    """

    model: Type[T]

    def __init__(self, db: Session, pharmacy_id: int):
        if pharmacy_id is None:
            raise ValueError(
                "BaseRepository exige un pharmacy_id non-None pour garantir "
                "l'isolation multi-tenant."
            )
        self.db = db
        self.pharmacy_id = pharmacy_id

    # ------------------------------------------------------------------
    # Point d'entree UNIQUE — toutes les methodes publiques en decoulent.
    # Ne pas ajouter d'autre `self.db.query(self.model)...` sans pharmacy_id.
    # ------------------------------------------------------------------
    def _base_query(self) -> Query:
        return self.db.query(self.model).filter(
            self.model.pharmacy_id == self.pharmacy_id
        )

    def query(self) -> Query:
        """
        Point d'extension PUBLIC pour les endpoints a filtrage dynamique.

        Retourne une `Query` deja filtree par pharmacy_id. Les routes peuvent
        chainer des `.filter()` / `.order_by()` supplementaires dessus sans
        jamais pouvoir desactiver l'isolation multi-tenant (le filtre
        pharmacy_id est deja applique en amont).
        """
        return self._base_query()

    # ------------------------------------------------------------------
    # Lecture
    # ------------------------------------------------------------------
    def get(self, id: int) -> Optional[T]:
        return self._base_query().filter(self.model.id == id).first()

    def get_or_404(self, id: int) -> T:
        """Recupere ou leve RepositoryError (la route convertit en HTTP 404)."""
        item = self.get(id)
        if item is None:
            raise RepositoryError(
                f"{self.model.__name__} id={id} non trouve pour "
                f"pharmacy_id={self.pharmacy_id}"
            )
        return item

    def list(self, *, limit: int = 100, offset: int = 0) -> list[T]:
        return self._base_query().limit(limit).offset(offset).all()

    def count(self) -> int:
        return self._base_query().count()

    def exists(self, id: int) -> bool:
        return self.get(id) is not None

    # ------------------------------------------------------------------
    # Ecriture
    # ------------------------------------------------------------------
    def create(self, instance: T) -> T:
        """
        Persiste `instance` en forcant le pharmacy_id du repository.
        Empeche l'usurpation si le caller a mis une autre valeur.
        """
        instance.pharmacy_id = self.pharmacy_id
        self.db.add(instance)
        self.db.flush()
        return instance

    def delete(self, id: int) -> bool:
        """True si un enregistrement scope a ete supprime, False sinon."""
        item = self.get(id)
        if item is None:
            return False
        self.db.delete(item)
        self.db.flush()
        return True
