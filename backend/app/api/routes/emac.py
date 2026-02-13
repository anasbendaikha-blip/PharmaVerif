"""
PharmaVerif Backend - Routes API EMAC
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/emac.py
Routes CRUD + upload + verification pour les EMAC
(Etats Mensuels des Avantages Commerciaux)

Endpoints :
  - POST   /upload              Upload et parse un fichier EMAC (Excel/CSV)
  - POST   /manual              Saisie manuelle d'un EMAC
  - GET    /                    Liste paginee des EMAC
  - GET    /{id}                Detail d'un EMAC
  - PUT    /{id}                Modifier un EMAC
  - DELETE /{id}                Supprimer un EMAC
  - POST   /{id}/verify         Lancer la verification croisee
  - GET    /{id}/triangle        Triangle de verification
  - GET    /{id}/anomalies      Anomalies d'un EMAC
  - PATCH  /anomalies/{id}      Resoudre une anomalie
  - GET    /manquants           EMAC manquants detectes
  - GET    /dashboard/stats     Statistiques EMAC
"""

import shutil
import uuid
import math
from datetime import datetime, date
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.schemas_emac import (
    EMACCreateManuel,
    EMACUpdate,
    EMACResponse,
    EMACListResponse,
    AnomalieEMACResponse,
    AnomalieEMACUpdate,
    TriangleVerificationResponse,
    TriangleVerificationItem,
    UploadEMACResponse,
    EMACManquantsListResponse,
    EMACManquantResponse,
    EMACDashboardStats,
    MessageResponse,
    StatutVerificationEMAC,
)
from app.database import get_db
from app.models import User
from app.models_labo import Laboratoire, AccordCommercial
from app.models_emac import EMAC, AnomalieEMAC
from app.api.routes.auth import get_current_user, get_current_pharmacy_id
from app.services.emac_parser import EMACParser
from app.services.emac_verification_engine import EMACVerificationEngine
from app.config import settings

router = APIRouter()


# ========================================
# UPLOAD EMAC (Excel / CSV)
# ========================================

@router.post("/upload", response_model=UploadEMACResponse, status_code=status.HTTP_201_CREATED)
async def upload_emac(
    file: UploadFile = File(...),
    laboratoire_id: int = Query(..., description="ID du laboratoire"),
    periode_debut: date = Query(..., description="Debut de la periode (YYYY-MM-DD)"),
    periode_fin: date = Query(..., description="Fin de la periode (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Upload et parse un fichier EMAC (Excel ou CSV).

    Le fichier est parse automatiquement pour extraire les montants declares.
    La verification croisee est lancee automatiquement apres le parsing.
    """
    warnings: List[str] = []

    # Verifier le laboratoire
    labo = db.query(Laboratoire).filter(Laboratoire.id == laboratoire_id, Laboratoire.pharmacy_id == pharmacy_id).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    # Verifier l'extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nom de fichier manquant"
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in (".xlsx", ".xls", ".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format non supporte : {ext}. Formats acceptes : .xlsx, .xls, .csv"
        )

    # Lire le contenu
    content = await file.read()

    # Sauvegarder le fichier
    upload_dir = Path(settings.UPLOAD_DIR) / "emac"
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"emac_{uuid.uuid4().hex[:8]}_{file.filename}"
    file_path = upload_dir / filename

    with open(file_path, "wb") as f:
        f.write(content)

    # Parser le fichier
    parser = EMACParser()
    parse_result = parser.parse_bytes(content, file.filename)

    if not parse_result.success:
        warnings.append(f"Parsing partiel : {parse_result.message}")
        warnings.extend(parse_result.warnings)

    # Creer l'EMAC en base
    emac = EMAC(
        user_id=current_user.id,
        pharmacy_id=pharmacy_id,
        laboratoire_id=laboratoire_id,
        reference=parse_result.reference,
        periode_debut=periode_debut,
        periode_fin=periode_fin,
        type_periode=parse_result.type_periode or "mensuel",
        fichier_original=str(file_path),
        format_source=parse_result.format_source,
        ca_declare=parse_result.ca_declare,
        rfa_declaree=parse_result.rfa_declaree,
        cop_declaree=parse_result.cop_declaree,
        remises_differees_declarees=parse_result.remises_differees_declarees,
        autres_avantages=parse_result.autres_avantages,
        total_avantages_declares=parse_result.total_avantages_declares,
        montant_deja_verse=parse_result.montant_deja_verse,
        solde_a_percevoir=parse_result.solde_a_percevoir,
        mode_reglement=parse_result.mode_reglement,
        detail_avantages=parse_result.detail_avantages,
        statut_verification="non_verifie",
    )

    db.add(emac)
    db.commit()
    db.refresh(emac)

    # Lancer la verification automatique
    verification_response = None
    try:
        engine = EMACVerificationEngine(db)
        anomalies = engine.verify(emac)
        engine.persist_anomalies(emac.id, anomalies)
        engine.update_emac_status(emac, anomalies)
        db.commit()
        db.refresh(emac)

        verification_response = _build_triangle_response(emac, anomalies, db)
    except Exception as e:
        warnings.append(f"Erreur lors de la verification automatique : {str(e)}")

    return UploadEMACResponse(
        success=True,
        message=f"EMAC importe avec succes pour {labo.nom}",
        emac=emac,
        verification=verification_response,
        warnings=warnings if warnings else None,
    )


# ========================================
# SAISIE MANUELLE
# ========================================

@router.post("/manual", response_model=EMACResponse, status_code=status.HTTP_201_CREATED)
async def create_emac_manual(
    data: EMACCreateManuel,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Creer un EMAC par saisie manuelle.

    Auto-calcule le total et le solde si non fournis.
    """
    # Verifier le laboratoire
    labo = db.query(Laboratoire).filter(Laboratoire.id == data.laboratoire_id, Laboratoire.pharmacy_id == pharmacy_id).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {data.laboratoire_id} non trouve"
        )

    # Verifier la periode
    if data.periode_fin < data.periode_debut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La date de fin doit etre posterieure a la date de debut"
        )

    # Auto-calculs
    total = data.total_avantages_declares
    if total is None or total == 0:
        total = (
            data.rfa_declaree
            + data.cop_declaree
            + data.remises_differees_declarees
            + data.autres_avantages
        )

    solde = data.solde_a_percevoir
    if solde is None:
        solde = max(0.0, total - data.montant_deja_verse)

    emac = EMAC(
        user_id=current_user.id,
        pharmacy_id=pharmacy_id,
        laboratoire_id=data.laboratoire_id,
        reference=data.reference,
        periode_debut=data.periode_debut,
        periode_fin=data.periode_fin,
        type_periode=data.type_periode.value,
        format_source="manuel",
        ca_declare=data.ca_declare,
        rfa_declaree=data.rfa_declaree,
        cop_declaree=data.cop_declaree,
        remises_differees_declarees=data.remises_differees_declarees,
        autres_avantages=data.autres_avantages,
        total_avantages_declares=total,
        montant_deja_verse=data.montant_deja_verse,
        solde_a_percevoir=solde,
        mode_reglement=data.mode_reglement,
        notes=data.notes,
        statut_verification="non_verifie",
    )

    db.add(emac)
    db.commit()
    db.refresh(emac)
    return emac


# ========================================
# CRUD EMAC
# ========================================

@router.get("/", response_model=EMACListResponse)
async def list_emacs(
    page: int = Query(1, ge=1, description="Numero de page"),
    page_size: int = Query(20, ge=1, le=100, description="Taille de page"),
    laboratoire_id: Optional[int] = Query(None, description="Filtrer par laboratoire"),
    statut: Optional[str] = Query(None, description="Filtrer par statut de verification"),
    annee: Optional[int] = Query(None, description="Filtrer par annee"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Lister les EMAC avec pagination et filtres"""
    query = db.query(EMAC).filter(EMAC.pharmacy_id == pharmacy_id)

    if laboratoire_id:
        query = query.filter(EMAC.laboratoire_id == laboratoire_id)
    if statut:
        query = query.filter(EMAC.statut_verification == statut)
    if annee:
        from sqlalchemy import extract
        query = query.filter(extract("year", EMAC.periode_debut) == annee)

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    emacs = (
        query
        .order_by(desc(EMAC.periode_debut))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return EMACListResponse(
        emacs=emacs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/dashboard/stats", response_model=EMACDashboardStats)
async def get_emac_dashboard_stats(
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Statistiques EMAC pour le dashboard"""
    engine = EMACVerificationEngine(db)
    stats = engine.get_dashboard_stats(pharmacy_id=pharmacy_id)
    return EMACDashboardStats(**stats)


@router.get("/manquants", response_model=EMACManquantsListResponse)
async def get_emacs_manquants(
    annee: int = Query(default=None, description="Annee a verifier"),
    laboratoire_id: Optional[int] = Query(None, description="Filtrer par laboratoire"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Detecter les EMAC manquants pour une annee"""
    if annee is None:
        annee = date.today().year

    engine = EMACVerificationEngine(db)
    manquants_data = engine.detect_emacs_manquants(annee, laboratoire_id, pharmacy_id=pharmacy_id)

    manquants = [EMACManquantResponse(**m) for m in manquants_data]
    return EMACManquantsListResponse(
        manquants=manquants,
        total=len(manquants),
    )


@router.get("/{emac_id}", response_model=EMACResponse)
async def get_emac(
    emac_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Obtenir un EMAC par ID"""
    emac = db.query(EMAC).filter(EMAC.id == emac_id, EMAC.pharmacy_id == pharmacy_id).first()
    if not emac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EMAC avec ID {emac_id} non trouve"
        )
    return emac


@router.put("/{emac_id}", response_model=EMACResponse)
async def update_emac(
    emac_id: int,
    data: EMACUpdate,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Modifier un EMAC"""
    emac = db.query(EMAC).filter(EMAC.id == emac_id, EMAC.pharmacy_id == pharmacy_id).first()
    if not emac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EMAC avec ID {emac_id} non trouve"
        )

    # Mettre a jour les champs fournis
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(emac, field) and value is not None:
            if hasattr(value, 'value'):  # Enum
                setattr(emac, field, value.value)
            else:
                setattr(emac, field, value)

    # Recalculer le total si necessaire
    if any(f in update_data for f in ["rfa_declaree", "cop_declaree", "remises_differees_declarees", "autres_avantages"]):
        emac.total_avantages_declares = (
            emac.rfa_declaree
            + emac.cop_declaree
            + emac.remises_differees_declarees
            + emac.autres_avantages
        )

    # Recalculer le solde
    if any(f in update_data for f in ["total_avantages_declares", "montant_deja_verse"]):
        emac.solde_a_percevoir = max(0.0, emac.total_avantages_declares - emac.montant_deja_verse)

    # Remettre le statut a non_verifie si modification de montants
    montant_fields = {"ca_declare", "rfa_declaree", "cop_declaree", "remises_differees_declarees", "autres_avantages"}
    if montant_fields & set(update_data.keys()):
        emac.statut_verification = "non_verifie"

    db.commit()
    db.refresh(emac)
    return emac


@router.delete("/{emac_id}", response_model=MessageResponse)
async def delete_emac(
    emac_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Supprimer un EMAC"""
    emac = db.query(EMAC).filter(EMAC.id == emac_id, EMAC.pharmacy_id == pharmacy_id).first()
    if not emac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EMAC avec ID {emac_id} non trouve"
        )

    db.delete(emac)
    db.commit()

    return MessageResponse(
        message=f"EMAC {emac.reference or emac_id} supprime avec succes",
        success=True,
    )


# ========================================
# VERIFICATION CROISEE
# ========================================

@router.post("/{emac_id}/verify", response_model=TriangleVerificationResponse)
async def verify_emac(
    emac_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Lancer ou relancer la verification croisee d'un EMAC.

    Effectue les 3 croisements du triangle :
    1. EMAC vs Factures (CA)
    2. EMAC vs Conditions (RFA, COP)
    3. Coherence interne
    """
    emac = db.query(EMAC).filter(EMAC.id == emac_id, EMAC.pharmacy_id == pharmacy_id).first()
    if not emac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EMAC avec ID {emac_id} non trouve"
        )

    engine = EMACVerificationEngine(db)
    anomalies = engine.verify(emac)
    engine.persist_anomalies(emac.id, anomalies)
    engine.update_emac_status(emac, anomalies)

    db.commit()
    db.refresh(emac)

    return _build_triangle_response(emac, anomalies, db)


@router.get("/{emac_id}/triangle", response_model=TriangleVerificationResponse)
async def get_triangle_verification(
    emac_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Obtenir le triangle de verification d'un EMAC.

    Si l'EMAC n'a pas encore ete verifie, lance la verification.
    """
    emac = db.query(EMAC).filter(EMAC.id == emac_id, EMAC.pharmacy_id == pharmacy_id).first()
    if not emac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EMAC avec ID {emac_id} non trouve"
        )

    # Si pas encore verifie, lancer
    if emac.statut_verification == "non_verifie":
        engine = EMACVerificationEngine(db)
        anomalies = engine.verify(emac)
        engine.persist_anomalies(emac.id, anomalies)
        engine.update_emac_status(emac, anomalies)
        db.commit()
        db.refresh(emac)
    else:
        anomalies = emac.anomalies_emac

    return _build_triangle_response(emac, anomalies, db)


# ========================================
# ANOMALIES
# ========================================

@router.get("/{emac_id}/anomalies", response_model=List[AnomalieEMACResponse])
async def get_emac_anomalies(
    emac_id: int,
    severite: Optional[str] = Query(None, description="Filtrer par severite"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Lister les anomalies d'un EMAC"""
    emac = db.query(EMAC).filter(EMAC.id == emac_id, EMAC.pharmacy_id == pharmacy_id).first()
    if not emac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EMAC avec ID {emac_id} non trouve"
        )

    query = db.query(AnomalieEMAC).filter(AnomalieEMAC.emac_id == emac_id)
    if severite:
        query = query.filter(AnomalieEMAC.severite == severite)

    return query.order_by(AnomalieEMAC.created_at).all()


@router.patch("/anomalies/{anomalie_id}", response_model=AnomalieEMACResponse)
async def resolve_emac_anomalie(
    anomalie_id: int,
    data: AnomalieEMACUpdate,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Marquer une anomalie EMAC comme resolue"""
    anomalie = db.query(AnomalieEMAC).filter(AnomalieEMAC.id == anomalie_id).first()
    if not anomalie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomalie EMAC avec ID {anomalie_id} non trouvee"
        )

    # Verifier que l'EMAC parent appartient a la pharmacie
    emac = db.query(EMAC).filter(EMAC.id == anomalie.emac_id, EMAC.pharmacy_id == pharmacy_id).first()
    if not emac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomalie EMAC avec ID {anomalie_id} non trouvee"
        )

    anomalie.resolu = data.resolu
    anomalie.note_resolution = data.note_resolution
    if data.resolu:
        anomalie.resolu_at = datetime.utcnow()
    else:
        anomalie.resolu_at = None

    db.commit()
    db.refresh(anomalie)
    return anomalie


# ========================================
# HELPERS
# ========================================

def _build_triangle_response(
    emac: EMAC,
    anomalies: list,
    db: Session,
) -> TriangleVerificationResponse:
    """Construit la reponse du triangle de verification."""
    labo = db.query(Laboratoire).filter(Laboratoire.id == emac.laboratoire_id).first()
    labo_nom = labo.nom if labo else "Inconnu"

    # Construire les lignes du triangle
    lignes = []

    # Ligne CA
    ca_conforme = True
    if emac.ecart_ca is not None and emac.ca_declare > 0:
        ecart_pct = abs(emac.ecart_ca / emac.ca_declare * 100) if emac.ca_declare else 0
        ca_conforme = ecart_pct < EMACVerificationEngine.TOLERANCE_CA_PCT_WARNING

    lignes.append(TriangleVerificationItem(
        label="Chiffre d'affaires HT",
        valeur_emac=emac.ca_declare,
        valeur_factures=emac.ca_reel_calcule,
        valeur_conditions=None,
        ecart_emac_factures=emac.ecart_ca,
        ecart_emac_conditions=None,
        ecart_pct=emac.ecart_ca_pct,
        conforme=ca_conforme,
    ))

    # Ligne RFA
    rfa_conforme = True
    if emac.ecart_rfa is not None and emac.rfa_attendue_calculee and emac.rfa_attendue_calculee > 0:
        ecart_rfa_pct = abs(emac.ecart_rfa / emac.rfa_attendue_calculee * 100)
        rfa_conforme = ecart_rfa_pct < EMACVerificationEngine.TOLERANCE_RFA_PCT_WARNING

    lignes.append(TriangleVerificationItem(
        label="RFA (Remise de Fin d'Annee)",
        valeur_emac=emac.rfa_declaree,
        valeur_factures=None,
        valeur_conditions=emac.rfa_attendue_calculee,
        ecart_emac_factures=None,
        ecart_emac_conditions=emac.ecart_rfa,
        ecart_pct=(
            round(abs(emac.ecart_rfa / emac.rfa_attendue_calculee * 100), 1)
            if emac.ecart_rfa and emac.rfa_attendue_calculee and emac.rfa_attendue_calculee > 0
            else None
        ),
        conforme=rfa_conforme,
    ))

    # Ligne COP
    lignes.append(TriangleVerificationItem(
        label="COP (Conditions Objectifs)",
        valeur_emac=emac.cop_declaree,
        valeur_factures=None,
        valeur_conditions=emac.cop_attendue_calculee,
        ecart_emac_factures=None,
        ecart_emac_conditions=emac.ecart_cop,
        ecart_pct=None,
        conforme=True,  # Pas de verification auto sur la COP
    ))

    # Ligne Remises differees
    lignes.append(TriangleVerificationItem(
        label="Remises differees",
        valeur_emac=emac.remises_differees_declarees,
        valeur_factures=None,
        valeur_conditions=None,
        ecart_emac_factures=None,
        ecart_emac_conditions=None,
        ecart_pct=None,
        conforme=True,
    ))

    # Ligne Autres avantages
    lignes.append(TriangleVerificationItem(
        label="Autres avantages",
        valeur_emac=emac.autres_avantages,
        valeur_factures=None,
        valeur_conditions=None,
        ecart_emac_factures=None,
        ecart_emac_conditions=None,
        ecart_pct=None,
        conforme=True,
    ))

    # Ligne Total
    lignes.append(TriangleVerificationItem(
        label="TOTAL AVANTAGES",
        valeur_emac=emac.total_avantages_declares,
        valeur_factures=None,
        valeur_conditions=emac.total_avantages_calcule,
        ecart_emac_factures=None,
        ecart_emac_conditions=emac.ecart_total_avantages,
        ecart_pct=None,
        conforme=(
            abs(emac.ecart_total_avantages) < 1.0
            if emac.ecart_total_avantages is not None
            else True
        ),
    ))

    nb_conformes = sum(1 for l in lignes if l.conforme)
    nb_ecarts = sum(1 for l in lignes if not l.conforme)

    # Serialiser les anomalies
    anomalie_responses = []
    for a in anomalies:
        if hasattr(a, 'id') and a.id:
            anomalie_responses.append(a)
        else:
            # Anomalie pas encore persistee, creer une response manuelle
            anomalie_responses.append(a)

    # Calculer montant total ecart
    montant_total_ecart = sum(a.montant_ecart for a in anomalies if a.montant_ecart)

    # Periode lisible
    mois_noms = [
        "", "janvier", "fevrier", "mars", "avril", "mai", "juin",
        "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
    ]
    mois = emac.periode_debut.month
    annee = emac.periode_debut.year
    periode_str = f"{mois_noms[mois]} {annee}"

    return TriangleVerificationResponse(
        emac_id=emac.id,
        laboratoire_id=emac.laboratoire_id,
        laboratoire_nom=labo_nom,
        periode=periode_str,
        lignes=lignes,
        nb_conformes=nb_conformes,
        nb_ecarts=nb_ecarts,
        nb_anomalies=len(anomalies),
        montant_total_ecart=round(montant_total_ecart, 2),
        montant_recouvrable=emac.montant_recouvrable,
        anomalies=anomalie_responses,
        statut=emac.statut_verification,
        message=(
            f"Verification terminee : {nb_conformes} conforme(s), "
            f"{nb_ecarts} ecart(s), {len(anomalies)} anomalie(s)."
        ),
    )
