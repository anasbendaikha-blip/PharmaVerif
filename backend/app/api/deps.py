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
Endpoints deja migres vers repositories (phase-2-2 + 2-2b) :
  factures_labo.py : list_factures_labo, get_facture_labo, get_facture_labo_lignes,
                     get_facture_anomalies
  emac.py          : list_emacs, get_emac, get_emac_anomalies
  rebate.py        : list_templates, get_template, list_agreements, get_agreement
  laboratoires.py  : list_laboratoires, get_laboratoire
  grossistes.py    : list_grossistes, get_grossiste

Endpoints restants a migrer (TODO [phase-2-2-followup]), par ordre de priorite :
  P0 — GET a aggregation complexe (requetes multi-tables, pas un simple
       BaseRepository. Ils sont DEJA pharmacy-filtres explicitement ; la
       migration est cosmetique). Creer des repos dedies quand la forme
       se stabilise :
       historique_prix.py    : get_historique_prix, comparaison, top-produits,
                               alertes, economies-potentielles
       stats.py              : dashboard, tendances
       rapports.py           : rapport PDF, export Excel
       factures_labo.py      : stats/monthly, rfa-progression, /{id}/analyse
       rebate.py             : dashboard mensuel (cumuls RFA), historique accord
       laboratoires.py       : list accords, get accord, paliers
       emac.py               : manquants, dashboard/stats, triangle
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
    GrossisteRepository,
    InvoiceLaboRepository,
    LaboratoireRepository,
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


def get_lab_repo(
    db: Session = Depends(get_db),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
) -> LaboratoireRepository:
    return LaboratoireRepository(db=db, pharmacy_id=pharmacy_id)


def get_grossiste_repo(
    db: Session = Depends(get_db),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
) -> GrossisteRepository:
    return GrossisteRepository(db=db, pharmacy_id=pharmacy_id)
