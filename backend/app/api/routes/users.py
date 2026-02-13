"""
PharmaVerif Backend - Routes Utilisateurs
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/users.py
Endpoints pour la gestion des utilisateurs
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User
from app.schemas import UserResponse, UserUpdate, MessageResponse
from app.api.routes.auth import get_current_user, get_current_pharmacy_id

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Obtenir le profil de l'utilisateur connecte"""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mettre a jour le profil de l'utilisateur connecte"""
    for field, value in data.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Lister tous les utilisateurs de la meme pharmacie (admin uniquement)"""
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Acces reserve aux administrateurs")
    return db.query(User).filter(User.pharmacy_id == pharmacy_id).all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Obtenir un utilisateur par ID (meme pharmacie uniquement)"""
    if current_user.role.value != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Acces non autorise")
    user = db.query(User).filter(
        User.id == user_id,
        User.pharmacy_id == pharmacy_id,
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    return user
