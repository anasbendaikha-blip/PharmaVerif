"""
PharmaVerif Backend - Routes API Rapports PDF
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/rapports.py
Endpoints pour la generation de rapports PDF professionnels.

Endpoints :
  GET  /facture/{facture_id}/pdf                         Rapport verification facture
  GET  /fournisseur/{laboratoire_id}/mensuel?mois&annee  Rapport mensuel
  POST /reclamation                                       Courrier reclamation
  GET  /emac/{emac_id}/pdf                               Rapport EMAC
"""

import logging
from datetime import datetime, date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import User
from app.models_labo import (
    Laboratoire, AccordCommercial, FactureLabo,
    LigneFactureLabo, AnomalieFactureLabo, PalierRFA,
)
from app.models_emac import EMAC, AnomalieEMAC
from app.api.routes.auth import get_current_user, get_current_pharmacy_id
from app.services.pdf_generator import (
    generate_facture_verification_pdf,
    generate_monthly_report_pdf,
    generate_reclamation_pdf,
    generate_emac_report_pdf,
)
from app.services.verification_engine import VerificationEngine

logger = logging.getLogger(__name__)

router = APIRouter()


# ========================================
# SCHEMAS RECLAMATION
# ========================================

class ReclamationAnomalieItem(BaseModel):
    """Anomalie a inclure dans la reclamation"""
    facture_id: int
    anomalie_id: Optional[int] = None
    description: Optional[str] = None


class ReclamationRequest(BaseModel):
    """Requete pour generer un courrier de reclamation"""
    laboratoire_id: int = Field(..., description="ID du laboratoire destinataire")
    anomalie_ids: Optional[List[int]] = Field(None, description="IDs des anomalies a inclure (toutes si vide)")
    facture_ids: Optional[List[int]] = Field(None, description="IDs des factures a inclure")
    pharmacie_nom: str = Field(default="Pharmacie PharmaVerif", description="Nom de la pharmacie")
    pharmacie_adresse: str = Field(default="", description="Adresse de la pharmacie")
    objet: Optional[str] = Field(None, description="Objet du courrier (auto-genere si vide)")
    texte_intro: Optional[str] = Field(None, description="Texte d'introduction (auto-genere si vide)")
    texte_conclusion: Optional[str] = Field(None, description="Texte de conclusion (auto-genere si vide)")
    signataire: str = Field(default="Le pharmacien titulaire", description="Nom du signataire")


# ========================================
# HELPERS
# ========================================

def _facture_to_dict(facture: FactureLabo) -> dict:
    """Convertit une facture SQLAlchemy en dict pour le generateur PDF."""
    return {
        "id": facture.id,
        "numero_facture": facture.numero_facture,
        "date_facture": facture.date_facture,
        "montant_brut_ht": facture.montant_brut_ht or 0.0,
        "total_remise_facture": facture.total_remise_facture or 0.0,
        "montant_net_ht": facture.montant_net_ht or 0.0,
        "montant_ttc": facture.montant_ttc,
        "tranche_a_brut": facture.tranche_a_brut or 0.0,
        "tranche_a_remise": facture.tranche_a_remise or 0.0,
        "tranche_a_pct_reel": facture.tranche_a_pct_reel or 0.0,
        "tranche_b_brut": facture.tranche_b_brut or 0.0,
        "tranche_b_remise": facture.tranche_b_remise or 0.0,
        "tranche_b_pct_reel": facture.tranche_b_pct_reel or 0.0,
        "otc_brut": facture.otc_brut or 0.0,
        "otc_remise": facture.otc_remise or 0.0,
        "rfa_attendue": facture.rfa_attendue or 0.0,
        "rfa_recue": facture.rfa_recue,
        "ecart_rfa": facture.ecart_rfa,
        "nb_lignes": facture.nb_lignes or 0,
        "statut": facture.statut or "non_verifie",
        "canal": facture.canal,
        "mode_paiement": facture.mode_paiement,
    }


def _ligne_to_dict(ligne: LigneFactureLabo) -> dict:
    """Convertit une ligne en dict."""
    return {
        "cip13": ligne.cip13 or "",
        "designation": ligne.designation or "",
        "quantite": ligne.quantite or 0,
        "prix_unitaire_ht": ligne.prix_unitaire_ht or 0.0,
        "remise_pct": ligne.remise_pct or 0.0,
        "montant_ht": ligne.montant_ht or 0.0,
        "montant_brut": ligne.montant_brut or 0.0,
        "tranche": ligne.tranche or "-",
        "taux_tva": ligne.taux_tva or 0.0,
    }


def _anomalie_labo_to_dict(anom: AnomalieFactureLabo, facture: Optional[FactureLabo] = None) -> dict:
    """Convertit une anomalie labo en dict."""
    return {
        "id": anom.id,
        "type_anomalie": anom.type_anomalie or "",
        "severite": anom.severite or "info",
        "description": anom.description or "",
        "montant_ecart": anom.montant_ecart or 0.0,
        "action_suggeree": anom.action_suggeree or "",
        "resolu": anom.resolu,
        "facture_id": anom.facture_id,
        "facture_numero": facture.numero_facture if facture else "",
        "facture_date": str(facture.date_facture) if facture and facture.date_facture else "",
    }


def _anomalie_emac_to_dict(anom: AnomalieEMAC) -> dict:
    """Convertit une anomalie EMAC en dict."""
    return {
        "id": anom.id,
        "type_anomalie": anom.type_anomalie or "",
        "severite": anom.severite or "info",
        "description": anom.description or "",
        "montant_ecart": anom.montant_ecart or 0.0,
        "valeur_declaree": anom.valeur_declaree,
        "valeur_calculee": anom.valeur_calculee,
        "action_suggeree": anom.action_suggeree or "",
    }


def _emac_to_dict(emac: EMAC) -> dict:
    """Convertit un EMAC en dict."""
    return {
        "id": emac.id,
        "reference": emac.reference,
        "periode_debut": emac.periode_debut,
        "periode_fin": emac.periode_fin,
        "type_periode": emac.type_periode or "mensuel",
        "format_source": emac.format_source or "manuel",
        "ca_declare": emac.ca_declare or 0.0,
        "rfa_declaree": emac.rfa_declaree or 0.0,
        "cop_declaree": emac.cop_declaree or 0.0,
        "remises_differees_declarees": emac.remises_differees_declarees or 0.0,
        "autres_avantages": emac.autres_avantages or 0.0,
        "total_avantages_declares": emac.total_avantages_declares or 0.0,
        "montant_deja_verse": emac.montant_deja_verse or 0.0,
        "solde_a_percevoir": emac.solde_a_percevoir or 0.0,
        "ca_reel_calcule": emac.ca_reel_calcule,
        "ecart_ca": emac.ecart_ca,
        "rfa_attendue_calculee": emac.rfa_attendue_calculee,
        "ecart_rfa": emac.ecart_rfa,
        "total_avantages_calcule": emac.total_avantages_calcule,
        "ecart_total_avantages": emac.ecart_total_avantages,
        "montant_recouvrable": emac.montant_recouvrable or 0.0,
        "nb_factures_matched": emac.nb_factures_matched or 0,
        "statut_verification": emac.statut_verification or "non_verifie",
    }


def _safe_filename(name: str) -> str:
    """Nettoie un nom pour utilisation dans un nom de fichier."""
    return "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in name)


# ========================================
# RAPPORT 1 : VERIFICATION FACTURE
# ========================================

@router.get("/facture/{facture_id}/pdf")
async def get_facture_verification_pdf(
    facture_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Generer le rapport PDF de synthese de verification d'une facture.

    Contenu : infos facture, analyse par tranche, lignes detaillees,
    anomalies, RFA attendue/recue.
    """
    # Charger la facture avec relations
    facture = db.query(FactureLabo).filter(
        FactureLabo.id == facture_id,
        FactureLabo.pharmacy_id == pharmacy_id,
    ).first()
    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture labo avec ID {facture_id} non trouvee"
        )

    # Laboratoire
    labo = db.query(Laboratoire).filter(Laboratoire.id == facture.laboratoire_id).first()
    labo_nom = labo.nom if labo else "Inconnu"

    # Accord commercial
    accord = db.query(AccordCommercial).filter(
        AccordCommercial.laboratoire_id == facture.laboratoire_id,
        AccordCommercial.actif == True,
    ).first()
    accord_nom = accord.nom if accord else None

    # Lignes
    lignes = [_ligne_to_dict(l) for l in (facture.lignes or [])]

    # Anomalies
    anomalies = [_anomalie_labo_to_dict(a, facture) for a in (facture.anomalies_labo or [])]

    # Generer le PDF
    pdf_buffer = generate_facture_verification_pdf(
        facture=_facture_to_dict(facture),
        lignes=lignes,
        anomalies=anomalies,
        laboratoire_nom=labo_nom,
        accord_nom=accord_nom,
    )

    # Nom du fichier
    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"PharmaVerif_Verification_{facture.numero_facture}_{date_str}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ========================================
# RAPPORT 2 : RAPPORT MENSUEL
# ========================================

@router.get("/fournisseur/{laboratoire_id}/mensuel")
async def get_monthly_report_pdf(
    laboratoire_id: int,
    mois: int = Query(..., ge=1, le=12, description="Mois (1-12)"),
    annee: int = Query(..., ge=2020, le=2030, description="Annee"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Generer le rapport mensuel PDF pour un fournisseur (laboratoire).

    Contenu : synthese du mois, factures, anomalies, progression RFA,
    comparaison mois precedent.
    """
    # Verifier le laboratoire (doit appartenir a cette pharmacie)
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    # Factures du mois
    factures = (
        db.query(FactureLabo)
        .filter(
            FactureLabo.laboratoire_id == laboratoire_id,
            FactureLabo.pharmacy_id == pharmacy_id,
            extract("year", FactureLabo.date_facture) == annee,
            extract("month", FactureLabo.date_facture) == mois,
        )
        .all()
    )
    factures_data = [_facture_to_dict(f) for f in factures]

    # Anomalies du mois
    facture_ids = [f.id for f in factures]
    anomalies_data = []
    if facture_ids:
        anomalies_db = (
            db.query(AnomalieFactureLabo)
            .filter(AnomalieFactureLabo.facture_id.in_(facture_ids))
            .all()
        )
        # Mapper facture_id -> facture pour enrichir les anomalies
        facture_map = {f.id: f for f in factures}
        anomalies_data = [
            _anomalie_labo_to_dict(a, facture_map.get(a.facture_id))
            for a in anomalies_db
        ]

    # Progression RFA
    accord = db.query(AccordCommercial).filter(
        AccordCommercial.laboratoire_id == laboratoire_id,
        AccordCommercial.actif == True,
    ).first()

    rfa_progression = None
    if accord:
        engine = VerificationEngine(db, pharmacy_id=pharmacy_id)
        rfa_progression = engine.get_rfa_progression(laboratoire_id, annee, accord)
        # Convertir les paliers en dict
        if rfa_progression.get("palier_actuel"):
            rfa_progression["palier_actuel"] = {
                "seuil_min": rfa_progression["palier_actuel"].seuil_min,
                "seuil_max": rfa_progression["palier_actuel"].seuil_max,
                "taux_rfa": rfa_progression["palier_actuel"].taux_rfa,
            }
        if rfa_progression.get("palier_suivant"):
            rfa_progression["palier_suivant"] = {
                "seuil_min": rfa_progression["palier_suivant"].seuil_min,
                "seuil_max": rfa_progression["palier_suivant"].seuil_max,
                "taux_rfa": rfa_progression["palier_suivant"].taux_rfa,
            }

    # Stats mois precedent
    prev_mois = mois - 1 if mois > 1 else 12
    prev_annee = annee if mois > 1 else annee - 1

    prev_factures = (
        db.query(FactureLabo)
        .filter(
            FactureLabo.laboratoire_id == laboratoire_id,
            FactureLabo.pharmacy_id == pharmacy_id,
            extract("year", FactureLabo.date_facture) == prev_annee,
            extract("month", FactureLabo.date_facture) == prev_mois,
        )
        .all()
    )

    stats_prev = None
    if prev_factures:
        stats_prev = {
            "ca_total": sum(f.montant_brut_ht or 0.0 for f in prev_factures),
            "nb_factures": len(prev_factures),
            "remises_total": sum(f.total_remise_facture or 0.0 for f in prev_factures),
        }

    # Generer le PDF
    pdf_buffer = generate_monthly_report_pdf(
        laboratoire_nom=labo.nom,
        laboratoire_id=laboratoire_id,
        mois=mois,
        annee=annee,
        factures=factures_data,
        anomalies=anomalies_data,
        rfa_progression=rfa_progression,
        stats_mois_precedent=stats_prev,
    )

    # Nom du fichier
    mois_str = str(mois).zfill(2)
    filename = f"PharmaVerif_Rapport_{_safe_filename(labo.nom)}_{mois_str}_{annee}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ========================================
# RAPPORT 3 : RECLAMATION
# ========================================

@router.post("/reclamation")
async def generate_reclamation(
    data: ReclamationRequest,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Generer un courrier de reclamation professionnel PDF.

    Contenu : format courrier, destinataire, tableau des anomalies
    avec preuves, montant total reclame, demande de regularisation.
    """
    # Verifier le laboratoire (doit appartenir a cette pharmacie)
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == data.laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {data.laboratoire_id} non trouve"
        )

    # Collecter les anomalies
    anomalies_data = []

    if data.anomalie_ids:
        # Anomalies specifiques (verifier que les factures appartiennent a la pharmacie)
        anomalies_db = (
            db.query(AnomalieFactureLabo)
            .join(FactureLabo)
            .filter(
                AnomalieFactureLabo.id.in_(data.anomalie_ids),
                FactureLabo.pharmacy_id == pharmacy_id,
            )
            .all()
        )
        for a in anomalies_db:
            facture = db.query(FactureLabo).filter(FactureLabo.id == a.facture_id).first()
            anomalies_data.append(_anomalie_labo_to_dict(a, facture))

    elif data.facture_ids:
        # Toutes les anomalies des factures specifiees (verifier pharmacy_id)
        anomalies_db = (
            db.query(AnomalieFactureLabo)
            .join(FactureLabo)
            .filter(
                AnomalieFactureLabo.facture_id.in_(data.facture_ids),
                FactureLabo.pharmacy_id == pharmacy_id,
                AnomalieFactureLabo.resolu == False,
            )
            .all()
        )
        facture_map = {}
        for a in anomalies_db:
            if a.facture_id not in facture_map:
                facture_map[a.facture_id] = db.query(FactureLabo).filter(
                    FactureLabo.id == a.facture_id
                ).first()
            anomalies_data.append(_anomalie_labo_to_dict(a, facture_map.get(a.facture_id)))

    else:
        # Toutes les anomalies non resolues du laboratoire (filtre pharmacie)
        factures = (
            db.query(FactureLabo)
            .filter(
                FactureLabo.laboratoire_id == data.laboratoire_id,
                FactureLabo.pharmacy_id == pharmacy_id,
            )
            .all()
        )
        facture_map = {f.id: f for f in factures}
        facture_ids = [f.id for f in factures]

        if facture_ids:
            anomalies_db = (
                db.query(AnomalieFactureLabo)
                .filter(
                    AnomalieFactureLabo.facture_id.in_(facture_ids),
                    AnomalieFactureLabo.resolu == False,
                )
                .all()
            )
            anomalies_data = [
                _anomalie_labo_to_dict(a, facture_map.get(a.facture_id))
                for a in anomalies_db
            ]

    if not anomalies_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune anomalie non resolue trouvee pour cette reclamation"
        )

    # Generer le PDF
    pdf_buffer = generate_reclamation_pdf(
        laboratoire_nom=labo.nom,
        anomalies=anomalies_data,
        pharmacie_nom=data.pharmacie_nom,
        pharmacie_adresse=data.pharmacie_adresse,
        objet=data.objet,
        texte_intro=data.texte_intro,
        texte_conclusion=data.texte_conclusion,
        signataire=data.signataire,
    )

    # Nom du fichier
    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"PharmaVerif_Reclamation_{_safe_filename(labo.nom)}_{date_str}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ========================================
# RAPPORT 4 : EMAC
# ========================================

@router.get("/emac/{emac_id}/pdf")
async def get_emac_report_pdf(
    emac_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Generer le rapport PDF EMAC avec triangle de verification.

    Contenu : synthese EMAC, triangle visuel, ecarts,
    factures de la periode, montant recouvrable.
    """
    # Charger l'EMAC
    emac = db.query(EMAC).filter(
        EMAC.id == emac_id,
        EMAC.pharmacy_id == pharmacy_id,
    ).first()
    if not emac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EMAC avec ID {emac_id} non trouve"
        )

    # Laboratoire
    labo = db.query(Laboratoire).filter(Laboratoire.id == emac.laboratoire_id).first()
    labo_nom = labo.nom if labo else "Inconnu"

    # Si pas encore verifie, lancer la verification
    if emac.statut_verification == "non_verifie":
        try:
            from app.services.emac_verification_engine import EMACVerificationEngine
            engine = EMACVerificationEngine(db)
            anomalies_list = engine.verify(emac)
            engine.persist_anomalies(emac.id, anomalies_list)
            engine.update_emac_status(emac, anomalies_list)
            db.commit()
            db.refresh(emac)
        except Exception as e:
            logger.warning(f"Erreur verification EMAC {emac_id}: {e}")

    # Construire le triangle
    from app.services.emac_verification_engine import EMACVerificationEngine

    triangle_lignes = []

    # Ligne CA
    ca_conforme = True
    if emac.ecart_ca is not None and emac.ca_declare and emac.ca_declare > 0:
        ecart_pct = abs(emac.ecart_ca / emac.ca_declare * 100)
        ca_conforme = ecart_pct < EMACVerificationEngine.TOLERANCE_CA_PCT_WARNING

    triangle_lignes.append({
        "label": "Chiffre d'affaires HT",
        "valeur_emac": emac.ca_declare or 0.0,
        "valeur_factures": emac.ca_reel_calcule,
        "valeur_conditions": None,
        "ecart_emac_factures": emac.ecart_ca,
        "ecart_emac_conditions": None,
        "ecart_pct": emac.ecart_ca_pct,
        "conforme": ca_conforme,
    })

    # Ligne RFA
    rfa_conforme = True
    if emac.ecart_rfa is not None and emac.rfa_attendue_calculee and emac.rfa_attendue_calculee > 0:
        ecart_rfa_pct = abs(emac.ecart_rfa / emac.rfa_attendue_calculee * 100)
        rfa_conforme = ecart_rfa_pct < EMACVerificationEngine.TOLERANCE_RFA_PCT_WARNING

    triangle_lignes.append({
        "label": "RFA (Remise de Fin d'Annee)",
        "valeur_emac": emac.rfa_declaree or 0.0,
        "valeur_factures": None,
        "valeur_conditions": emac.rfa_attendue_calculee,
        "ecart_emac_factures": None,
        "ecart_emac_conditions": emac.ecart_rfa,
        "ecart_pct": (
            round(abs(emac.ecart_rfa / emac.rfa_attendue_calculee * 100), 1)
            if emac.ecart_rfa and emac.rfa_attendue_calculee and emac.rfa_attendue_calculee > 0
            else None
        ),
        "conforme": rfa_conforme,
    })

    # Ligne COP
    triangle_lignes.append({
        "label": "COP (Conditions Objectifs)",
        "valeur_emac": emac.cop_declaree or 0.0,
        "valeur_factures": None,
        "valeur_conditions": emac.cop_attendue_calculee,
        "ecart_emac_factures": None,
        "ecart_emac_conditions": emac.ecart_cop,
        "ecart_pct": None,
        "conforme": True,
    })

    # Ligne Remises differees
    triangle_lignes.append({
        "label": "Remises differees",
        "valeur_emac": emac.remises_differees_declarees or 0.0,
        "valeur_factures": None,
        "valeur_conditions": None,
        "ecart_emac_factures": None,
        "ecart_emac_conditions": None,
        "ecart_pct": None,
        "conforme": True,
    })

    # Ligne Autres avantages
    triangle_lignes.append({
        "label": "Autres avantages",
        "valeur_emac": emac.autres_avantages or 0.0,
        "valeur_factures": None,
        "valeur_conditions": None,
        "ecart_emac_factures": None,
        "ecart_emac_conditions": None,
        "ecart_pct": None,
        "conforme": True,
    })

    # Ligne TOTAL
    total_conforme = True
    if emac.ecart_total_avantages is not None:
        total_conforme = abs(emac.ecart_total_avantages) < 1.0

    triangle_lignes.append({
        "label": "TOTAL AVANTAGES",
        "valeur_emac": emac.total_avantages_declares or 0.0,
        "valeur_factures": None,
        "valeur_conditions": emac.total_avantages_calcule,
        "ecart_emac_factures": None,
        "ecart_emac_conditions": emac.ecart_total_avantages,
        "ecart_pct": None,
        "conforme": total_conforme,
    })

    # Anomalies
    anomalies = [_anomalie_emac_to_dict(a) for a in (emac.anomalies_emac or [])]

    # Factures de la periode
    factures_periode = (
        db.query(FactureLabo)
        .filter(
            FactureLabo.laboratoire_id == emac.laboratoire_id,
            FactureLabo.pharmacy_id == pharmacy_id,
            FactureLabo.date_facture >= emac.periode_debut,
            FactureLabo.date_facture <= emac.periode_fin,
        )
        .all()
    )
    factures_data = [_facture_to_dict(f) for f in factures_periode]

    # Generer le PDF
    pdf_buffer = generate_emac_report_pdf(
        emac=_emac_to_dict(emac),
        laboratoire_nom=labo_nom,
        triangle_lignes=triangle_lignes,
        anomalies=anomalies,
        factures_periode=factures_data,
    )

    # Nom du fichier
    try:
        periode_str = emac.periode_debut.strftime("%Y%m") if emac.periode_debut else "unknown"
    except AttributeError:
        periode_str = str(emac.periode_debut).replace("-", "")[:6]

    filename = f"PharmaVerif_EMAC_{_safe_filename(labo_nom)}_{periode_str}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
