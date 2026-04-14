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

---

PLAN DE MIGRATION (phase-2-2)
-----------------------------
Endpoints deja migres vers repositories :
  - GET /factures-labo/{id}              (factures_labo.py:get_facture_labo)
  - GET /factures-labo/{id}/lignes       (factures_labo.py:get_facture_labo_lignes)
  - GET /emac/{id}                       (emac.py:get_emac)

Endpoints restants a migrer (TODO [phase-2-2-followup]), par ordre de priorite :
  P0 — Lecture pure (migration triviale via repo.get / repo.list) :
       factures_labo.py      : list/, stats/monthly, /{id}/anomalies, /rfa-progression
       emac.py               : list/, /{id}/anomalies, /manquants, /dashboard/stats
       laboratoires.py       : list accords, get accord, list paliers
       rebate.py             : list templates, list agreements, get schedule
       historique_prix.py    : tous les GET
       stats.py, rapports.py : tous les GET
  P1 — Ecriture scopable (create/update/delete) :
       factures_labo.py : DELETE /{id}, PATCH /{id}/rfa
       emac.py          : PUT /{id}, DELETE /{id}, PATCH /anomalies/{id}
       laboratoires.py  : POST/PUT/DELETE accords
  P2 — Endpoints avec logique metier (migration combinee repo + domain engine) :
       POST /factures-labo/{id}/verify   -> domain/verification/engine + adapters
       POST /rebate/.../calculate        -> conserver legacy (stages API),
                                            migrer progressivement via wrapper
       POST /emac/{id}/verify            -> domain/emac/verifier + adapters

Principe durant la migration :
  - Ne JAMAIS supprimer un legacy `db.query(Model).filter(pharmacy_id)` sans
    l'avoir remplace par un appel repo equivalent, teste, valide.
  - Format de reponse API inchange (compat frontend).
  - auth.py est HORS perimetre (login ne peut pas exiger pharmacy_id).
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
