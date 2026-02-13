"""
PharmaVerif Backend - Routes Grossistes
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/grossistes.py
Endpoints CRUD pour les grossistes — Multi-tenant
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Grossiste, User
from app.schemas import GrossisteCreate, GrossisteUpdate, GrossisteResponse, MessageResponse
from app.api.routes.auth import get_current_user, get_current_pharmacy_id

router = APIRouter()


@router.get("/", response_model=List[GrossisteResponse])
async def list_grossistes(
    actif: Optional[bool] = Query(None, description="Filtrer par statut actif"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Lister tous les grossistes de la pharmacie courante"""
    query = db.query(Grossiste).filter(Grossiste.pharmacy_id == pharmacy_id)
    if actif is not None:
        query = query.filter(Grossiste.actif == actif)
    return query.all()


@router.get("/{grossiste_id}", response_model=GrossisteResponse)
async def get_grossiste(
    grossiste_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Obtenir un grossiste par ID (filtre par pharmacie)"""
    grossiste = db.query(Grossiste).filter(
        Grossiste.id == grossiste_id,
        Grossiste.pharmacy_id == pharmacy_id,
    ).first()
    if not grossiste:
        raise HTTPException(status_code=404, detail="Grossiste non trouve")
    return grossiste


@router.post("/", response_model=GrossisteResponse, status_code=status.HTTP_201_CREATED)
async def create_grossiste(
    data: GrossisteCreate,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Creer un nouveau grossiste dans la pharmacie courante"""
    existing = db.query(Grossiste).filter(
        Grossiste.nom == data.nom,
        Grossiste.pharmacy_id == pharmacy_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Grossiste '{data.nom}' existe deja")
    grossiste = Grossiste(pharmacy_id=pharmacy_id, **data.dict())
    db.add(grossiste)
    db.commit()
    db.refresh(grossiste)
    return grossiste


@router.put("/{grossiste_id}", response_model=GrossisteResponse)
async def update_grossiste(
    grossiste_id: int,
    data: GrossisteUpdate,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Mettre a jour un grossiste (filtre par pharmacie)"""
    grossiste = db.query(Grossiste).filter(
        Grossiste.id == grossiste_id,
        Grossiste.pharmacy_id == pharmacy_id,
    ).first()
    if not grossiste:
        raise HTTPException(status_code=404, detail="Grossiste non trouve")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(grossiste, field, value)
    db.commit()
    db.refresh(grossiste)
    return grossiste


@router.delete("/{grossiste_id}", response_model=MessageResponse)
async def delete_grossiste(
    grossiste_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Supprimer un grossiste (filtre par pharmacie)"""
    grossiste = db.query(Grossiste).filter(
        Grossiste.id == grossiste_id,
        Grossiste.pharmacy_id == pharmacy_id,
    ).first()
    if not grossiste:
        raise HTTPException(status_code=404, detail="Grossiste non trouve")
    db.delete(grossiste)
    db.commit()
    return MessageResponse(message=f"Grossiste '{grossiste.nom}' supprime", success=True)
