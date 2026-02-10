"""
PharmaVerif Backend - Routes Anomalies
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/anomalies.py
Endpoints pour la gestion des anomalies detectees
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from app.database import get_db
from app.models import Anomalie, Facture, User
from app.schemas import (
    AnomalieCreate, AnomalieUpdate, AnomalieResponse,
    AnomalieListResponse, MessageResponse, TypeAnomalie,
)
from app.api.routes.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=AnomalieListResponse)
async def list_anomalies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    facture_id: Optional[int] = Query(None),
    type_anomalie: Optional[TypeAnomalie] = Query(None),
    resolu: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lister les anomalies avec filtres et pagination"""
    query = db.query(Anomalie)

    if facture_id:
        query = query.filter(Anomalie.facture_id == facture_id)
    if type_anomalie:
        query = query.filter(Anomalie.type_anomalie == type_anomalie)
    if resolu is not None:
        query = query.filter(Anomalie.resolu == resolu)

    query = query.order_by(desc(Anomalie.created_at))
    total = query.count()
    offset = (page - 1) * page_size
    anomalies = query.offset(offset).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    return AnomalieListResponse(
        anomalies=anomalies, total=total,
        page=page, page_size=page_size, total_pages=total_pages,
    )


@router.get("/{anomalie_id}", response_model=AnomalieResponse)
async def get_anomalie(
    anomalie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtenir une anomalie par ID"""
    anomalie = db.query(Anomalie).filter(Anomalie.id == anomalie_id).first()
    if not anomalie:
        raise HTTPException(status_code=404, detail="Anomalie non trouvee")
    return anomalie


@router.patch("/{anomalie_id}", response_model=AnomalieResponse)
async def update_anomalie(
    anomalie_id: int,
    data: AnomalieUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marquer une anomalie comme resolue"""
    from datetime import datetime

    anomalie = db.query(Anomalie).filter(Anomalie.id == anomalie_id).first()
    if not anomalie:
        raise HTTPException(status_code=404, detail="Anomalie non trouvee")

    anomalie.resolu = data.resolu
    if data.note_resolution:
        anomalie.note_resolution = data.note_resolution
    if data.resolu:
        anomalie.resolu_at = datetime.utcnow()

    db.commit()
    db.refresh(anomalie)
    return anomalie
