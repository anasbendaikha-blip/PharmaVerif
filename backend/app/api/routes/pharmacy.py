"""
PharmaVerif Backend - Routes Pharmacie (Tenant)
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/pharmacy.py
CRUD pour la gestion des pharmacies (multi-tenant)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.schemas import (
    PharmacyResponse,
    PharmacyUpdate,
    MessageResponse,
)
from app.database import get_db
from app.models import User, Pharmacy
from app.api.routes.auth import get_current_user, get_current_active_admin

router = APIRouter()


# ========================================
# PHARMACIE COURANTE
# ========================================

@router.get("/me", response_model=PharmacyResponse)
async def get_my_pharmacy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtenir les informations de la pharmacie de l'utilisateur connecte

    Retourne la pharmacie rattachee au user courant.
    """
    if not current_user.pharmacy_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune pharmacie rattachee a votre compte"
        )

    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == current_user.pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacie non trouvee"
        )

    return pharmacy


@router.put("/me", response_model=PharmacyResponse)
async def update_my_pharmacy(
    data: PharmacyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Modifier les informations de la pharmacie courante

    Tout utilisateur rattache a une pharmacie peut modifier ses informations.
    """
    if not current_user.pharmacy_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune pharmacie rattachee a votre compte"
        )

    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == current_user.pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacie non trouvee"
        )

    # Verifier unicite SIRET si modifie
    if data.siret and data.siret != pharmacy.siret:
        existing = db.query(Pharmacy).filter(
            Pharmacy.siret == data.siret,
            Pharmacy.id != pharmacy.id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Une pharmacie avec ce SIRET existe deja"
            )

    for field, value in data.dict(exclude_unset=True).items():
        setattr(pharmacy, field, value)

    pharmacy.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pharmacy)

    return pharmacy


@router.get("/me/users", response_model=List[dict])
async def list_pharmacy_users(
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    [ADMIN] Lister les utilisateurs de la pharmacie courante
    """
    if not current_user.pharmacy_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune pharmacie rattachee"
        )

    users = db.query(User).filter(User.pharmacy_id == current_user.pharmacy_id).all()

    return [
        {
            "id": u.id,
            "email": u.email,
            "nom": u.nom,
            "prenom": u.prenom,
            "role": u.role.value if hasattr(u.role, 'value') else u.role,
            "actif": u.actif,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
        }
        for u in users
    ]


@router.get("/me/stats", response_model=dict)
async def get_pharmacy_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtenir les statistiques de la pharmacie courante
    """
    from app.models_labo import Laboratoire, FactureLabo
    from app.models_emac import EMAC
    from app.models import Grossiste

    pid = current_user.pharmacy_id
    if not pid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune pharmacie rattachee"
        )

    nb_users = db.query(User).filter(User.pharmacy_id == pid).count()
    nb_grossistes = db.query(Grossiste).filter(Grossiste.pharmacy_id == pid).count()
    nb_labos = db.query(Laboratoire).filter(Laboratoire.pharmacy_id == pid).count()
    nb_factures_labo = db.query(FactureLabo).filter(FactureLabo.pharmacy_id == pid).count()
    nb_emacs = db.query(EMAC).filter(EMAC.pharmacy_id == pid).count()

    return {
        "pharmacy_id": pid,
        "nb_users": nb_users,
        "nb_grossistes": nb_grossistes,
        "nb_laboratoires": nb_labos,
        "nb_factures_labo": nb_factures_labo,
        "nb_emacs": nb_emacs,
    }
