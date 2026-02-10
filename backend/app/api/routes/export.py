"""
PharmaVerif Backend - Routes Export
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/export.py
Endpoints pour l'export de rapports (PDF, Excel)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import Facture, User
from app.api.routes.auth import get_current_user

router = APIRouter()


@router.get("/factures")
async def export_factures(
    format: str = Query("json", description="Format d'export (json, csv)"),
    grossiste_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exporter les factures

    Formats disponibles :
    - json : Donnees brutes
    - csv : Fichier CSV telecharrgeable
    - pdf : Rapport PDF (a venir)
    """
    query = db.query(Facture)
    if grossiste_id:
        query = query.filter(Facture.grossiste_id == grossiste_id)

    factures = query.all()

    if format == "json":
        data = []
        for f in factures:
            data.append({
                "id": f.id,
                "numero": f.numero,
                "date": str(f.date),
                "montant_brut_ht": f.montant_brut_ht,
                "net_a_payer": f.net_a_payer,
                "statut": f.statut_verification.value if f.statut_verification else "non_verifie",
            })
        return {"factures": data, "total": len(data), "format": "json"}

    return {"message": f"Export {format} sera disponible prochainement", "format": format}


@router.get("/rapport/{facture_id}")
async def export_rapport_facture(
    facture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exporter le rapport de verification d'une facture"""
    facture = db.query(Facture).filter(Facture.id == facture_id).first()
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvee")

    return {
        "facture_id": facture.id,
        "numero": facture.numero,
        "montant_brut_ht": facture.montant_brut_ht,
        "net_a_payer": facture.net_a_payer,
        "statut": facture.statut_verification.value if facture.statut_verification else "non_verifie",
        "message": "Export PDF complet sera disponible prochainement",
    }
