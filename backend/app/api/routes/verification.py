"""
PharmaVerif Backend - Routes Verification
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/verification.py
Endpoints pour la verification automatique des factures
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Facture, Grossiste, Anomalie, User, StatutFacture, TypeAnomalie
from app.schemas import VerificationRequest, VerificationResponse
from app.api.routes.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=VerificationResponse)
async def verify_facture(
    request: VerificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verifier une facture contre les conditions du grossiste

    Detecte automatiquement :
    - Ecarts de calcul
    - Remises manquantes ou excessives
    - Non-respect du franco
    """
    facture = db.query(Facture).filter(Facture.id == request.facture_id).first()
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvee")

    grossiste = db.query(Grossiste).filter(Grossiste.id == request.grossiste_id).first()
    if not grossiste:
        raise HTTPException(status_code=404, detail="Grossiste non trouve")

    anomalies = []
    montant_recuperable = 0.0

    # Verification 1 : Coherence des montants
    total_attendu = facture.montant_brut_ht - facture.remises_ligne_a_ligne - facture.remises_pied_facture
    ecart = abs(total_attendu - facture.net_a_payer)
    if ecart > 0.01:
        anomalie = Anomalie(
            facture_id=facture.id,
            type_anomalie=TypeAnomalie.ECART_CALCUL,
            description=f"Ecart de calcul: attendu {total_attendu:.2f}, facture {facture.net_a_payer:.2f}",
            montant_ecart=ecart,
        )
        db.add(anomalie)
        anomalies.append(anomalie)
        montant_recuperable += ecart

    # Verification 2 : Taux de remise
    taux_effectif = facture.taux_remise_effectif
    taux_attendu = grossiste.taux_remise_total
    ecart_taux = taux_attendu - taux_effectif

    if ecart_taux > 0.5:
        montant_manquant = facture.montant_brut_ht * ecart_taux / 100
        anomalie = Anomalie(
            facture_id=facture.id,
            type_anomalie=TypeAnomalie.REMISE_MANQUANTE,
            description=f"Remise insuffisante: {taux_effectif:.1f}% au lieu de {taux_attendu:.1f}%",
            montant_ecart=montant_manquant,
        )
        db.add(anomalie)
        anomalies.append(anomalie)
        montant_recuperable += montant_manquant

    # Verification 3 : Franco
    if facture.montant_brut_ht < grossiste.franco:
        anomalie = Anomalie(
            facture_id=facture.id,
            type_anomalie=TypeAnomalie.FRANCO_NON_RESPECTE,
            description=f"Montant {facture.montant_brut_ht:.2f} < Franco {grossiste.franco:.2f}",
            montant_ecart=0.0,
        )
        db.add(anomalie)
        anomalies.append(anomalie)

    # Mettre a jour le statut
    conforme = len(anomalies) == 0
    facture.statut_verification = StatutFacture.CONFORME if conforme else StatutFacture.ANOMALIE
    db.commit()

    recommandations = []
    if not conforme:
        recommandations.append("Contacter le grossiste pour regularisation")
        if montant_recuperable > 0:
            recommandations.append(f"Montant recuperable estime: {montant_recuperable:.2f} EUR")

    return VerificationResponse(
        facture=facture,
        anomalies=anomalies,
        conforme=conforme,
        montant_recuperable=round(montant_recuperable, 2),
        recommandations=recommandations,
    )
