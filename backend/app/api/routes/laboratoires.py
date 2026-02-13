"""
PharmaVerif Backend - Routes Laboratoires et Accords Commerciaux
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/laboratoires.py
CRUD complet pour Laboratoires, AccordCommercial, PalierRFA — Multi-tenant
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import List, Optional

import logging
from app.schemas_labo import (
    LaboratoireCreate,
    LaboratoireResponse,
    AccordCommercialCreate,
    AccordCommercialResponse,
    AccordCommercialBase,
    PalierRFACreate,
    PalierRFAResponse,
    MessageResponse,
    RecalculResponse,
)
from app.database import get_db
from app.models import User
from app.models_labo import (
    Laboratoire,
    AccordCommercial,
    FactureLabo,
    PalierRFA,
)
from app.api.routes.auth import get_current_user, get_current_pharmacy_id
from app.services.verification_engine import VerificationEngine

logger = logging.getLogger(__name__)

router = APIRouter()


# ========================================
# LABORATOIRES - CRUD
# ========================================

@router.get("/", response_model=List[LaboratoireResponse])
async def list_laboratoires(
    actif: Optional[bool] = Query(None, description="Filtrer par statut actif"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Lister tous les laboratoires de la pharmacie courante

    **Filtres:**
    - actif: True/False pour filtrer par statut
    """
    query = db.query(Laboratoire).filter(Laboratoire.pharmacy_id == pharmacy_id)
    if actif is not None:
        query = query.filter(Laboratoire.actif == actif)
    return query.order_by(Laboratoire.nom).all()


@router.get("/{laboratoire_id}", response_model=LaboratoireResponse)
async def get_laboratoire(
    laboratoire_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Obtenir un laboratoire par ID (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )
    return labo


@router.post("/", response_model=LaboratoireResponse, status_code=status.HTTP_201_CREATED)
async def create_laboratoire(
    data: LaboratoireCreate,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Creer un nouveau laboratoire dans la pharmacie courante

    Verifie l'unicite du nom au sein de la pharmacie.
    """
    existing = db.query(Laboratoire).filter(
        Laboratoire.nom == data.nom,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un laboratoire avec le nom '{data.nom}' existe deja"
        )

    labo = Laboratoire(
        nom=data.nom,
        type=data.type.value,
        actif=data.actif,
        pharmacy_id=pharmacy_id,
    )
    db.add(labo)
    db.commit()
    db.refresh(labo)
    return labo


@router.put("/{laboratoire_id}", response_model=LaboratoireResponse)
async def update_laboratoire(
    laboratoire_id: int,
    data: LaboratoireCreate,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Modifier un laboratoire (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    # Verifier unicite du nom
    existing = db.query(Laboratoire).filter(
        Laboratoire.nom == data.nom,
        Laboratoire.pharmacy_id == pharmacy_id,
        Laboratoire.id != laboratoire_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un laboratoire avec le nom '{data.nom}' existe deja"
        )

    labo.nom = data.nom
    labo.type = data.type.value
    labo.actif = data.actif
    labo.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(labo)
    return labo


@router.delete("/{laboratoire_id}", response_model=MessageResponse)
async def delete_laboratoire(
    laboratoire_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Supprimer un laboratoire (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    if labo.factures_labo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de supprimer : {len(labo.factures_labo)} facture(s) liee(s) a ce laboratoire"
        )

    db.delete(labo)
    db.commit()

    return MessageResponse(
        message=f"Laboratoire '{labo.nom}' supprime avec succes",
        success=True,
    )


# ========================================
# ACCORDS COMMERCIAUX - CRUD
# ========================================

@router.get("/{laboratoire_id}/accords", response_model=List[AccordCommercialResponse])
async def list_accords(
    laboratoire_id: int,
    actif: Optional[bool] = Query(None, description="Filtrer par statut actif"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Lister les accords commerciaux d'un laboratoire (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    query = db.query(AccordCommercial).filter(
        AccordCommercial.laboratoire_id == laboratoire_id
    )
    if actif is not None:
        query = query.filter(AccordCommercial.actif == actif)

    return query.order_by(desc(AccordCommercial.date_debut)).all()


@router.get("/{laboratoire_id}/accords/{accord_id}", response_model=AccordCommercialResponse)
async def get_accord(
    laboratoire_id: int,
    accord_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Obtenir un accord commercial par ID (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    accord = db.query(AccordCommercial).filter(
        AccordCommercial.id == accord_id,
        AccordCommercial.laboratoire_id == laboratoire_id,
    ).first()
    if not accord:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord commercial avec ID {accord_id} non trouve"
        )
    return accord


@router.post("/{laboratoire_id}/accords", response_model=AccordCommercialResponse, status_code=status.HTTP_201_CREATED)
async def create_accord(
    laboratoire_id: int,
    data: AccordCommercialBase,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Creer un nouvel accord commercial (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    if data.actif:
        db.query(AccordCommercial).filter(
            AccordCommercial.laboratoire_id == laboratoire_id,
            AccordCommercial.actif == True,
        ).update({"actif": False})

    accord = AccordCommercial(
        laboratoire_id=laboratoire_id,
        nom=data.nom,
        date_debut=data.date_debut,
        date_fin=data.date_fin,
        tranche_a_pct_ca=data.tranche_a_pct_ca,
        tranche_a_cible=data.tranche_a_cible,
        tranche_b_pct_ca=data.tranche_b_pct_ca,
        tranche_b_cible=data.tranche_b_cible,
        otc_cible=data.otc_cible,
        bonus_dispo_max_pct=data.bonus_dispo_max_pct,
        bonus_seuil_pct=data.bonus_seuil_pct,
        escompte_pct=data.escompte_pct,
        escompte_delai_jours=data.escompte_delai_jours,
        escompte_applicable=data.escompte_applicable,
        franco_seuil_ht=data.franco_seuil_ht,
        franco_frais_port=data.franco_frais_port,
        gratuites_seuil_qte=data.gratuites_seuil_qte,
        gratuites_ratio=data.gratuites_ratio,
        gratuites_applicable=data.gratuites_applicable,
        actif=data.actif,
    )
    db.add(accord)
    db.commit()
    db.refresh(accord)
    return accord


@router.put("/{laboratoire_id}/accords/{accord_id}", response_model=AccordCommercialResponse)
async def update_accord(
    laboratoire_id: int,
    accord_id: int,
    data: AccordCommercialBase,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Modifier un accord commercial (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    accord = db.query(AccordCommercial).filter(
        AccordCommercial.id == accord_id,
        AccordCommercial.laboratoire_id == laboratoire_id,
    ).first()
    if not accord:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord commercial avec ID {accord_id} non trouve"
        )

    if data.actif and not accord.actif:
        db.query(AccordCommercial).filter(
            AccordCommercial.laboratoire_id == laboratoire_id,
            AccordCommercial.actif == True,
            AccordCommercial.id != accord_id,
        ).update({"actif": False})

    accord.nom = data.nom
    accord.date_debut = data.date_debut
    accord.date_fin = data.date_fin
    accord.tranche_a_pct_ca = data.tranche_a_pct_ca
    accord.tranche_a_cible = data.tranche_a_cible
    accord.tranche_b_pct_ca = data.tranche_b_pct_ca
    accord.tranche_b_cible = data.tranche_b_cible
    accord.otc_cible = data.otc_cible
    accord.bonus_dispo_max_pct = data.bonus_dispo_max_pct
    accord.bonus_seuil_pct = data.bonus_seuil_pct
    accord.escompte_pct = data.escompte_pct
    accord.escompte_delai_jours = data.escompte_delai_jours
    accord.escompte_applicable = data.escompte_applicable
    accord.franco_seuil_ht = data.franco_seuil_ht
    accord.franco_frais_port = data.franco_frais_port
    accord.gratuites_seuil_qte = data.gratuites_seuil_qte
    accord.gratuites_ratio = data.gratuites_ratio
    accord.gratuites_applicable = data.gratuites_applicable
    accord.actif = data.actif

    db.commit()
    db.refresh(accord)
    return accord


@router.delete("/{laboratoire_id}/accords/{accord_id}", response_model=MessageResponse)
async def delete_accord(
    laboratoire_id: int,
    accord_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Supprimer un accord commercial (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    accord = db.query(AccordCommercial).filter(
        AccordCommercial.id == accord_id,
        AccordCommercial.laboratoire_id == laboratoire_id,
    ).first()
    if not accord:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord commercial avec ID {accord_id} non trouve"
        )

    db.delete(accord)
    db.commit()

    return MessageResponse(
        message=f"Accord '{accord.nom}' supprime avec succes",
        success=True,
    )


# ========================================
# PALIERS RFA - CRUD
# ========================================

@router.get("/{laboratoire_id}/accords/{accord_id}/paliers", response_model=List[PalierRFAResponse])
async def list_paliers(
    laboratoire_id: int,
    accord_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Lister les paliers RFA d'un accord (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    accord = db.query(AccordCommercial).filter(
        AccordCommercial.id == accord_id,
        AccordCommercial.laboratoire_id == laboratoire_id,
    ).first()
    if not accord:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord commercial avec ID {accord_id} non trouve"
        )

    return db.query(PalierRFA).filter(
        PalierRFA.accord_id == accord_id
    ).order_by(PalierRFA.seuil_min).all()


@router.post("/{laboratoire_id}/accords/{accord_id}/paliers", response_model=PalierRFAResponse, status_code=status.HTTP_201_CREATED)
async def create_palier(
    laboratoire_id: int,
    accord_id: int,
    data: PalierRFACreate,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Ajouter un palier RFA a un accord (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    accord = db.query(AccordCommercial).filter(
        AccordCommercial.id == accord_id,
        AccordCommercial.laboratoire_id == laboratoire_id,
    ).first()
    if not accord:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord commercial avec ID {accord_id} non trouve"
        )

    palier = PalierRFA(
        accord_id=accord_id,
        seuil_min=data.seuil_min,
        seuil_max=data.seuil_max,
        taux_rfa=data.taux_rfa,
        description=data.description,
    )
    db.add(palier)
    db.commit()
    db.refresh(palier)
    return palier


@router.delete("/{laboratoire_id}/accords/{accord_id}/paliers/{palier_id}", response_model=MessageResponse)
async def delete_palier(
    laboratoire_id: int,
    accord_id: int,
    palier_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """Supprimer un palier RFA (filtre par pharmacie)"""
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    palier = db.query(PalierRFA).filter(
        PalierRFA.id == palier_id,
        PalierRFA.accord_id == accord_id,
    ).first()
    if not palier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Palier RFA avec ID {palier_id} non trouve"
        )

    db.delete(palier)
    db.commit()

    return MessageResponse(
        message=f"Palier RFA supprime avec succes",
        success=True,
    )


# ========================================
# RECALCUL - Apres modification d'un accord
# ========================================

@router.post("/{laboratoire_id}/recalculer", response_model=RecalculResponse)
async def recalculer_factures(
    laboratoire_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Recalculer toutes les factures d'un laboratoire apres modification d'un accord.

    Re-execute le moteur de verification sur chaque facture en utilisant
    l'accord commercial actif actuel. Met a jour les anomalies et statuts.
    """
    # Verifier le laboratoire
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    # Recuperer l'accord actif
    accord = db.query(AccordCommercial).filter(
        AccordCommercial.laboratoire_id == laboratoire_id,
        AccordCommercial.actif == True,
    ).first()

    if accord:
        logger.info(
            f"Recalcul factures labo {labo.nom} — "
            f"Accord : {accord.nom} (A={accord.tranche_a_cible}%, B={accord.tranche_b_cible}%)"
        )
    else:
        logger.warning(f"Recalcul factures labo {labo.nom} — Aucun accord actif")

    # Recuperer toutes les factures de ce labo pour cette pharmacie
    factures = db.query(FactureLabo).filter(
        FactureLabo.laboratoire_id == laboratoire_id,
        FactureLabo.pharmacy_id == pharmacy_id,
    ).all()

    resultats = {"total": len(factures), "succes": 0, "erreurs": 0}

    engine = VerificationEngine(db)

    for facture in factures:
        try:
            # Relancer la verification avec l'accord actuel
            anomalies = engine.verify(facture, accord)

            # Persister les nouvelles anomalies (remplace les non-resolues)
            engine.persist_anomalies(facture.id, anomalies)

            # Mettre a jour le statut
            nb_critical = sum(1 for a in anomalies if a.severite == "critical")
            if nb_critical > 0:
                facture.statut = "ecart_rfa"
            elif anomalies:
                facture.statut = "verifiee"
            else:
                facture.statut = "conforme"

            resultats["succes"] += 1
        except Exception as e:
            logger.error(f"Erreur recalcul facture {facture.numero_facture}: {e}")
            resultats["erreurs"] += 1

    db.commit()

    message = (
        f"Recalcul termine : {resultats['succes']}/{resultats['total']} facture(s) recalculee(s)"
    )
    if resultats["erreurs"] > 0:
        message += f" ({resultats['erreurs']} erreur(s))"

    return RecalculResponse(
        laboratoire_id=laboratoire_id,
        laboratoire_nom=labo.nom,
        accord_nom=accord.nom if accord else None,
        total=resultats["total"],
        succes=resultats["succes"],
        erreurs=resultats["erreurs"],
        message=message,
    )


# ========================================
# TEMPLATES PRE-CONFIGURES
# ========================================

LABO_TEMPLATES = {
    "biogaran": {
        "nom": "Biogaran",
        "type": "generiqueur_principal",
        "accord": {
            "nom": "Accord Biogaran 2025",
            "tranche_a_cible": 57.0,
            "tranche_b_cible": 27.5,
            "otc_cible": 0.0,
            "escompte_pct": 2.5,
            "escompte_delai_jours": 30,
            "escompte_applicable": True,
            "franco_seuil_ht": 300.0,
            "franco_frais_port": 15.0,
            "gratuites_seuil_qte": 10,
            "gratuites_ratio": "10+1",
            "gratuites_applicable": True,
            "valide": True,
        },
        "paliers": [
            {"seuil_min": 0, "seuil_max": 50000, "taux_rfa": 2.0, "description": "Palier Bronze"},
            {"seuil_min": 50000, "seuil_max": 100000, "taux_rfa": 3.0, "description": "Palier Argent"},
            {"seuil_min": 100000, "seuil_max": None, "taux_rfa": 4.0, "description": "Palier Or"},
        ],
    },
    "arrow": {
        "nom": "Arrow Generiques",
        "type": "generiqueur_secondaire",
        "accord": {
            "nom": "Accord Arrow 2025 (estimé)",
            "tranche_a_cible": 50.0,
            "tranche_b_cible": 25.0,
            "otc_cible": 0.0,
            "escompte_pct": 2.0,
            "escompte_delai_jours": 30,
            "escompte_applicable": True,
            "franco_seuil_ht": 250.0,
            "franco_frais_port": 12.0,
            "gratuites_seuil_qte": 0,
            "gratuites_ratio": "",
            "gratuites_applicable": False,
            "valide": False,
        },
        "paliers": [
            {"seuil_min": 0, "seuil_max": 40000, "taux_rfa": 1.5, "description": "Palier Standard"},
            {"seuil_min": 40000, "seuil_max": 80000, "taux_rfa": 2.5, "description": "Palier Premium"},
            {"seuil_min": 80000, "seuil_max": None, "taux_rfa": 3.5, "description": "Palier Excellence"},
        ],
    },
    "teva": {
        "nom": "Teva Sante",
        "type": "generiqueur_secondaire",
        "accord": {
            "nom": "Accord Teva 2025 (estimé)",
            "tranche_a_cible": 52.0,
            "tranche_b_cible": 26.0,
            "otc_cible": 0.0,
            "escompte_pct": 2.0,
            "escompte_delai_jours": 30,
            "escompte_applicable": True,
            "franco_seuil_ht": 300.0,
            "franco_frais_port": 15.0,
            "gratuites_seuil_qte": 0,
            "gratuites_ratio": "",
            "gratuites_applicable": False,
            "valide": False,
        },
        "paliers": [
            {"seuil_min": 0, "seuil_max": 50000, "taux_rfa": 2.0, "description": "Palier Bronze"},
            {"seuil_min": 50000, "seuil_max": None, "taux_rfa": 3.0, "description": "Palier Argent"},
        ],
    },
    "mylan": {
        "nom": "Mylan (Viatris)",
        "type": "generiqueur_secondaire",
        "accord": {
            "nom": "Accord Mylan 2025 (estimé)",
            "tranche_a_cible": 48.0,
            "tranche_b_cible": 24.0,
            "otc_cible": 0.0,
            "escompte_pct": 2.0,
            "escompte_delai_jours": 30,
            "escompte_applicable": True,
            "franco_seuil_ht": 250.0,
            "franco_frais_port": 12.0,
            "gratuites_seuil_qte": 0,
            "gratuites_ratio": "",
            "gratuites_applicable": False,
            "valide": False,
        },
        "paliers": [
            {"seuil_min": 0, "seuil_max": 40000, "taux_rfa": 1.5, "description": "Palier Standard"},
            {"seuil_min": 40000, "seuil_max": None, "taux_rfa": 2.5, "description": "Palier Premium"},
        ],
    },
    "sandoz": {
        "nom": "Sandoz",
        "type": "generiqueur_secondaire",
        "accord": {
            "nom": "Accord Sandoz 2025 (estimé)",
            "tranche_a_cible": 50.0,
            "tranche_b_cible": 25.0,
            "otc_cible": 0.0,
            "escompte_pct": 2.0,
            "escompte_delai_jours": 30,
            "escompte_applicable": True,
            "franco_seuil_ht": 300.0,
            "franco_frais_port": 15.0,
            "gratuites_seuil_qte": 0,
            "gratuites_ratio": "",
            "gratuites_applicable": False,
            "valide": False,
        },
        "paliers": [
            {"seuil_min": 0, "seuil_max": 50000, "taux_rfa": 1.5, "description": "Palier Standard"},
            {"seuil_min": 50000, "seuil_max": None, "taux_rfa": 2.5, "description": "Palier Premium"},
        ],
    },
    "zentiva": {
        "nom": "Zentiva",
        "type": "generiqueur_secondaire",
        "accord": {
            "nom": "Accord Zentiva 2025 (estimé)",
            "tranche_a_cible": 45.0,
            "tranche_b_cible": 22.0,
            "otc_cible": 0.0,
            "escompte_pct": 1.5,
            "escompte_delai_jours": 30,
            "escompte_applicable": True,
            "franco_seuil_ht": 200.0,
            "franco_frais_port": 10.0,
            "gratuites_seuil_qte": 0,
            "gratuites_ratio": "",
            "gratuites_applicable": False,
            "valide": False,
        },
        "paliers": [
            {"seuil_min": 0, "seuil_max": 30000, "taux_rfa": 1.0, "description": "Palier Standard"},
            {"seuil_min": 30000, "seuil_max": None, "taux_rfa": 2.0, "description": "Palier Premium"},
        ],
    },
}


@router.post("/init-templates", response_model=MessageResponse)
async def init_templates(
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Initialiser les 6 laboratoires pre-configures avec leurs accords commerciaux.

    Ne cree que les labos qui n'existent pas encore pour cette pharmacie.
    Seul Biogaran a des conditions validees (57%, 27.5%).
    Les 5 autres ont des valeurs ESTIMEES a ajuster par le pharmacien.
    """
    from datetime import date as dt_date

    created = []
    skipped = []

    for template_id, template in LABO_TEMPLATES.items():
        # Verifier si le labo existe deja
        existing = db.query(Laboratoire).filter(
            Laboratoire.nom == template["nom"],
            Laboratoire.pharmacy_id == pharmacy_id,
        ).first()

        if existing:
            skipped.append(template["nom"])
            continue

        # Creer le laboratoire
        labo = Laboratoire(
            nom=template["nom"],
            type=template["type"],
            actif=True,
            pharmacy_id=pharmacy_id,
        )
        db.add(labo)
        db.flush()

        # Creer l'accord commercial
        accord_data = template["accord"]
        accord = AccordCommercial(
            laboratoire_id=labo.id,
            nom=accord_data["nom"],
            date_debut=dt_date(2025, 1, 1),
            date_fin=dt_date(2025, 12, 31),
            tranche_a_pct_ca=80.0,
            tranche_a_cible=accord_data["tranche_a_cible"],
            tranche_b_pct_ca=20.0,
            tranche_b_cible=accord_data["tranche_b_cible"],
            otc_cible=accord_data["otc_cible"],
            escompte_pct=accord_data["escompte_pct"],
            escompte_delai_jours=accord_data["escompte_delai_jours"],
            escompte_applicable=accord_data["escompte_applicable"],
            franco_seuil_ht=accord_data["franco_seuil_ht"],
            franco_frais_port=accord_data["franco_frais_port"],
            gratuites_seuil_qte=accord_data["gratuites_seuil_qte"],
            gratuites_ratio=accord_data["gratuites_ratio"],
            gratuites_applicable=accord_data["gratuites_applicable"],
            actif=True,
        )
        db.add(accord)
        db.flush()

        # Creer les paliers RFA
        for palier_data in template["paliers"]:
            palier = PalierRFA(
                accord_id=accord.id,
                seuil_min=palier_data["seuil_min"],
                seuil_max=palier_data["seuil_max"],
                taux_rfa=palier_data["taux_rfa"],
                description=palier_data["description"],
            )
            db.add(palier)

        created.append(f"{template['nom']} (A={accord_data['tranche_a_cible']}%, B={accord_data['tranche_b_cible']}%)")

        logger.info(
            f"Template cree : {template['nom']} — "
            f"A={accord_data['tranche_a_cible']}%, B={accord_data['tranche_b_cible']}%, "
            f"valide={accord_data['valide']}"
        )

    db.commit()

    parts = []
    if created:
        parts.append(f"{len(created)} laboratoire(s) cree(s) : {', '.join(created)}")
    if skipped:
        parts.append(f"{len(skipped)} deja existant(s) : {', '.join(skipped)}")
    if not created and not skipped:
        parts.append("Aucun template disponible")

    return MessageResponse(
        message=" | ".join(parts),
        success=True,
    )
