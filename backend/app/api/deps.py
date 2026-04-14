"""
PharmaVerif — Dependances FastAPI reutilisables.

Fournit aux routes des repositories pre-scopes par le pharmacy_id du user
courant. Toute route qui utilise un de ces providers herite automatiquement
de l'isolation multi-tenant (pas besoin de la re-implementer).

Usage dans une route :

    from app.api.deps import get_invoice_repo

    @router.get("/factures-labo/{id}")
    def get_facture(
        id: int,
        repo: InvoiceLaboRepository = Depends(get_invoice_repo),
    ):
        return repo.get_or_404(id)
"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_pharmacy_id
from app.database import get_db
from app.infrastructure.repositories import (
    EMACRepository,
    InvoiceLaboRepository,
    RebateRepository,
)


def get_invoice_repo(
    db: Session = Depends(get_db),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
) -> InvoiceLaboRepository:
    return InvoiceLaboRepository(db=db, pharmacy_id=pharmacy_id)


def get_rebate_repo(
    db: Session = Depends(get_db),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
) -> RebateRepository:
    return RebateRepository(db=db, pharmacy_id=pharmacy_id)


def get_emac_repo(
    db: Session = Depends(get_db),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
) -> EMACRepository:
    return EMACRepository(db=db, pharmacy_id=pharmacy_id)
