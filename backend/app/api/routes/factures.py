"""
PharmaVerif Backend - Routes CRUD Factures
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/api/routes/factures.py
Endpoints CRUD complets pour les factures
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from datetime import datetime
from typing import List, Optional

from app.schemas import (
    FactureCreate,
    FactureUpdate,
    FactureResponse,
    FactureListResponse,
    MessageResponse,
    StatutFacture,
)
from app.database import get_db
from app.models import Facture, LigneFacture, User, Grossiste
from app.api.routes.auth import get_current_user, get_current_pharmacy_id

router = APIRouter()

# ========================================
# ENDPOINTS CRUD
# ========================================

@router.post("/", response_model=FactureResponse, status_code=status.HTTP_201_CREATED)
async def create_facture(
    facture_data: FactureCreate,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Créer une nouvelle facture
    
    - **numero**: Numéro de facture unique
    - **date**: Date de la facture
    - **grossiste_id**: ID du grossiste
    - **montant_brut_ht**: Montant brut HT
    - **remises_ligne_a_ligne**: Somme des remises ligne par ligne
    - **remises_pied_facture**: Remises en pied de facture
    - **net_a_payer**: Net à payer final
    - **lignes**: Liste des lignes de produits
    """
    # Vérifier que le grossiste existe et appartient à la pharmacie
    grossiste = db.query(Grossiste).filter(
        Grossiste.id == facture_data.grossiste_id,
        Grossiste.pharmacy_id == pharmacy_id,
    ).first()
    if not grossiste:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grossiste avec ID {facture_data.grossiste_id} non trouvé"
        )

    # Vérifier que le numéro de facture n'existe pas déjà pour cette pharmacie
    existing = db.query(Facture).filter(
        Facture.numero == facture_data.numero,
        Facture.pharmacy_id == pharmacy_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Une facture avec le numéro {facture_data.numero} existe déjà"
        )
    
    # Créer la facture
    db_facture = Facture(
        numero=facture_data.numero,
        date=facture_data.date,
        grossiste_id=facture_data.grossiste_id,
        montant_brut_ht=facture_data.montant_brut_ht,
        remises_ligne_a_ligne=facture_data.remises_ligne_a_ligne,
        remises_pied_facture=facture_data.remises_pied_facture,
        net_a_payer=facture_data.net_a_payer,
        statut_verification=StatutFacture.NON_VERIFIE,
        user_id=current_user.id,
        pharmacy_id=pharmacy_id,
    )
    
    db.add(db_facture)
    db.flush()  # Pour obtenir l'ID avant les lignes
    
    # Créer les lignes de facture
    for ligne_data in facture_data.lignes:
        db_ligne = LigneFacture(
            facture_id=db_facture.id,
            produit=ligne_data.produit,
            cip=ligne_data.cip,
            quantite=ligne_data.quantite,
            prix_unitaire=ligne_data.prix_unitaire,
            remise_appliquee=ligne_data.remise_appliquee,
            montant_ht=ligne_data.montant_ht,
        )
        db.add(db_ligne)
    
    db.commit()
    db.refresh(db_facture)
    
    return db_facture

@router.get("/", response_model=FactureListResponse)
async def list_factures(
    page: int = Query(1, ge=1, description="Numéro de page"),
    page_size: int = Query(20, ge=1, le=100, description="Taille de page"),
    statut: Optional[StatutFacture] = Query(None, description="Filtrer par statut"),
    grossiste_id: Optional[int] = Query(None, description="Filtrer par grossiste"),
    search: Optional[str] = Query(None, description="Recherche par numéro ou grossiste"),
    date_debut: Optional[datetime] = Query(None, description="Date de début"),
    date_fin: Optional[datetime] = Query(None, description="Date de fin"),
    sort_by: str = Query("date", description="Trier par (date, montant, statut)"),
    sort_order: str = Query("desc", description="Ordre (asc, desc)"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Lister les factures avec pagination et filtres

    **Filtres disponibles:**
    - Par statut (conforme, anomalie, non_verifie)
    - Par grossiste
    - Par recherche textuelle (numéro ou nom grossiste)
    - Par période (date_debut, date_fin)

    **Tri:**
    - Par date, montant ou statut
    - Ordre ascendant ou descendant
    """
    query = db.query(Facture).filter(Facture.pharmacy_id == pharmacy_id)
    
    # Filtres
    if statut:
        query = query.filter(Facture.statut_verification == statut)
    
    if grossiste_id:
        query = query.filter(Facture.grossiste_id == grossiste_id)
    
    if search:
        query = query.join(Grossiste).filter(
            or_(
                Facture.numero.ilike(f"%{search}%"),
                Grossiste.nom.ilike(f"%{search}%")
            )
        )
    
    if date_debut:
        query = query.filter(Facture.date >= date_debut)
    
    if date_fin:
        query = query.filter(Facture.date <= date_fin)
    
    # Tri
    order_func = desc if sort_order == "desc" else asc
    
    if sort_by == "date":
        query = query.order_by(order_func(Facture.date))
    elif sort_by == "montant":
        query = query.order_by(order_func(Facture.montant_brut_ht))
    elif sort_by == "statut":
        query = query.order_by(order_func(Facture.statut_verification))
    else:
        query = query.order_by(desc(Facture.date))
    
    # Pagination
    total = query.count()
    offset = (page - 1) * page_size
    
    factures = query.offset(offset).limit(page_size).all()
    
    total_pages = (total + page_size - 1) // page_size
    
    return FactureListResponse(
        factures=factures,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{facture_id}", response_model=FactureResponse)
async def get_facture(
    facture_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Obtenir une facture par ID

    Retourne tous les détails de la facture incluant :
    - Informations de base
    - Grossiste associé
    - Lignes de produits
    - Anomalies détectées
    """
    facture = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.pharmacy_id == pharmacy_id,
    ).first()
    
    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture avec ID {facture_id} non trouvée"
        )
    
    return facture

@router.put("/{facture_id}", response_model=FactureResponse)
async def update_facture(
    facture_id: int,
    facture_data: FactureUpdate,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Mettre à jour une facture

    Permet de modifier :
    - Le numéro
    - La date
    - Le statut de vérification
    - Les montants
    """
    facture = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.pharmacy_id == pharmacy_id,
    ).first()
    
    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture avec ID {facture_id} non trouvée"
        )
    
    # Mettre à jour les champs fournis
    update_data = facture_data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(facture, field, value)
    
    facture.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(facture)
    
    return facture

@router.delete("/{facture_id}", response_model=MessageResponse)
async def delete_facture(
    facture_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Supprimer une facture

    Supprime la facture et toutes ses lignes associées.
    """
    facture = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.pharmacy_id == pharmacy_id,
    ).first()
    
    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture avec ID {facture_id} non trouvée"
        )
    
    db.delete(facture)
    db.commit()
    
    return MessageResponse(
        message=f"Facture {facture.numero} supprimée avec succès",
        success=True
    )

# ========================================
# ENDPOINTS SPÉCIFIQUES
# ========================================

@router.get("/{facture_id}/lignes", response_model=List[dict])
async def get_facture_lignes(
    facture_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Obtenir toutes les lignes d'une facture
    """
    facture = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.pharmacy_id == pharmacy_id,
    ).first()
    
    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture avec ID {facture_id} non trouvée"
        )
    
    return facture.lignes

@router.patch("/{facture_id}/statut", response_model=FactureResponse)
async def update_facture_statut(
    facture_id: int,
    statut: StatutFacture,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Mettre à jour uniquement le statut d'une facture
    """
    facture = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.pharmacy_id == pharmacy_id,
    ).first()
    
    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture avec ID {facture_id} non trouvée"
        )
    
    facture.statut_verification = statut
    facture.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(facture)
    
    return facture

@router.get("/numero/{numero}", response_model=FactureResponse)
async def get_facture_by_numero(
    numero: str,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Obtenir une facture par son numéro
    """
    facture = db.query(Facture).filter(
        Facture.numero == numero,
        Facture.pharmacy_id == pharmacy_id,
    ).first()
    
    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture avec numéro {numero} non trouvée"
        )
    
    return facture

@router.get("/grossiste/{grossiste_id}", response_model=FactureListResponse)
async def get_factures_by_grossiste(
    grossiste_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Obtenir toutes les factures d'un grossiste
    """
    query = db.query(Facture).filter(
        Facture.grossiste_id == grossiste_id,
        Facture.pharmacy_id == pharmacy_id,
    )
    query = query.order_by(desc(Facture.date))
    
    total = query.count()
    offset = (page - 1) * page_size
    
    factures = query.offset(offset).limit(page_size).all()
    
    total_pages = (total + page_size - 1) // page_size
    
    return FactureListResponse(
        factures=factures,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.post("/{facture_id}/duplicate", response_model=FactureResponse)
async def duplicate_facture(
    facture_id: int,
    nouveau_numero: str,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Dupliquer une facture

    Crée une copie de la facture avec un nouveau numéro.
    """
    facture_originale = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.pharmacy_id == pharmacy_id,
    ).first()
    
    if not facture_originale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture avec ID {facture_id} non trouvée"
        )
    
    # Vérifier que le nouveau numéro n'existe pas pour cette pharmacie
    existing = db.query(Facture).filter(
        Facture.numero == nouveau_numero,
        Facture.pharmacy_id == pharmacy_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Une facture avec le numéro {nouveau_numero} existe déjà"
        )
    
    # Créer la nouvelle facture
    nouvelle_facture = Facture(
        numero=nouveau_numero,
        date=datetime.utcnow(),
        grossiste_id=facture_originale.grossiste_id,
        montant_brut_ht=facture_originale.montant_brut_ht,
        remises_ligne_a_ligne=facture_originale.remises_ligne_a_ligne,
        remises_pied_facture=facture_originale.remises_pied_facture,
        net_a_payer=facture_originale.net_a_payer,
        statut_verification=StatutFacture.NON_VERIFIE,
        user_id=current_user.id,
        pharmacy_id=pharmacy_id,
    )
    
    db.add(nouvelle_facture)
    db.flush()
    
    # Copier les lignes
    for ligne_originale in facture_originale.lignes:
        nouvelle_ligne = LigneFacture(
            facture_id=nouvelle_facture.id,
            produit=ligne_originale.produit,
            cip=ligne_originale.cip,
            quantite=ligne_originale.quantite,
            prix_unitaire=ligne_originale.prix_unitaire,
            remise_appliquee=ligne_originale.remise_appliquee,
            montant_ht=ligne_originale.montant_ht,
        )
        db.add(nouvelle_ligne)
    
    db.commit()
    db.refresh(nouvelle_facture)
    
    return nouvelle_facture
