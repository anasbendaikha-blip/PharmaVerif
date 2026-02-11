"""
PharmaVerif Backend - Routes Factures Laboratoires
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/factures_labo.py
Endpoints pour upload, CRUD et analyse des factures laboratoires
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_, func, extract
from datetime import datetime, date
from typing import List, Optional
from pathlib import Path
import shutil
import os

from app.schemas_labo import (
    FactureLaboResponse,
    FactureLaboListResponse,
    LigneFactureLaboResponse,
    AnalyseTrancheResponse,
    AnalyseRemiseResponse,
    RFAUpdateRequest,
    RFAUpdateResponse,
    StatsMonthlyItem,
    StatsMonthlyResponse,
    FournisseurDetecte,
    UploadLaboResponse,
    StatutFactureLabo,
    MessageResponse,
)
from app.database import get_db
from app.models import User
from app.models_labo import Laboratoire, AccordCommercial, FactureLabo, LigneFactureLabo
from app.api.routes.auth import get_current_user
from app.config import settings

router = APIRouter()


# ========================================
# HELPERS
# ========================================

def _parse_date(date_str) -> Optional[date]:
    """Parse une date string (DD/MM/YYYY) en objet date."""
    if not date_str:
        return None
    if isinstance(date_str, date):
        return date_str
    if isinstance(date_str, str):
        try:
            return datetime.strptime(date_str, "%d/%m/%Y").date()
        except (ValueError, TypeError):
            return None
    return None


def _build_analyse_response(facture: FactureLabo, accord: Optional[AccordCommercial] = None) -> AnalyseRemiseResponse:
    """
    Construire la reponse d'analyse des remises par tranche
    a partir d'une facture labo et de son accord commercial.
    """
    tranches = []
    rfa_totale = 0.0

    # Tranche A
    if facture.tranche_a_brut and facture.tranche_a_brut > 0:
        cible_a = accord.tranche_a_cible if accord else 57.0
        taux_reel_a = (facture.tranche_a_remise / facture.tranche_a_brut * 100) if facture.tranche_a_brut > 0 else 0.0
        rfa_a = max(0.0, facture.tranche_a_brut * cible_a / 100 - facture.tranche_a_remise)
        rfa_totale += rfa_a

        nb_lignes_a = 0
        if facture.lignes:
            nb_lignes_a = len([l for l in facture.lignes if l.tranche == "A"])

        pct_ca_a = (facture.tranche_a_brut / facture.montant_brut_ht * 100) if facture.montant_brut_ht > 0 else 0.0

        tranches.append(AnalyseTrancheResponse(
            tranche="A",
            montant_brut=round(facture.tranche_a_brut, 2),
            montant_remise=round(facture.tranche_a_remise, 2),
            taux_remise_reel=round(taux_reel_a, 2),
            taux_remise_cible=cible_a,
            ecart_taux=round(taux_reel_a - cible_a, 2),
            rfa_attendue=round(rfa_a, 2),
            nb_lignes=nb_lignes_a,
            pct_ca=round(pct_ca_a, 2),
        ))

    # Tranche B
    if facture.tranche_b_brut and facture.tranche_b_brut > 0:
        cible_b = accord.tranche_b_cible if accord else 27.5
        taux_reel_b = (facture.tranche_b_remise / facture.tranche_b_brut * 100) if facture.tranche_b_brut > 0 else 0.0
        rfa_b = max(0.0, facture.tranche_b_brut * cible_b / 100 - facture.tranche_b_remise)
        rfa_totale += rfa_b

        nb_lignes_b = 0
        if facture.lignes:
            nb_lignes_b = len([l for l in facture.lignes if l.tranche == "B"])

        pct_ca_b = (facture.tranche_b_brut / facture.montant_brut_ht * 100) if facture.montant_brut_ht > 0 else 0.0

        tranches.append(AnalyseTrancheResponse(
            tranche="B",
            montant_brut=round(facture.tranche_b_brut, 2),
            montant_remise=round(facture.tranche_b_remise, 2),
            taux_remise_reel=round(taux_reel_b, 2),
            taux_remise_cible=cible_b,
            ecart_taux=round(taux_reel_b - cible_b, 2),
            rfa_attendue=round(rfa_b, 2),
            nb_lignes=nb_lignes_b,
            pct_ca=round(pct_ca_b, 2),
        ))

    # OTC
    if facture.otc_brut and facture.otc_brut > 0:
        otc_cible = accord.otc_cible if accord else 0.0
        taux_reel_otc = (facture.otc_remise / facture.otc_brut * 100) if facture.otc_brut > 0 else 0.0

        nb_lignes_otc = 0
        if facture.lignes:
            nb_lignes_otc = len([l for l in facture.lignes if l.tranche == "OTC"])

        pct_ca_otc = (facture.otc_brut / facture.montant_brut_ht * 100) if facture.montant_brut_ht > 0 else 0.0

        tranches.append(AnalyseTrancheResponse(
            tranche="OTC",
            montant_brut=round(facture.otc_brut, 2),
            montant_remise=round(facture.otc_remise, 2),
            taux_remise_reel=round(taux_reel_otc, 2),
            taux_remise_cible=otc_cible,
            ecart_taux=round(taux_reel_otc - otc_cible, 2),
            rfa_attendue=0.0,  # Pas de RFA sur OTC
            nb_lignes=nb_lignes_otc,
            pct_ca=round(pct_ca_otc, 2),
        ))

    taux_global = 0.0
    if facture.montant_brut_ht and facture.montant_brut_ht > 0:
        taux_global = round(facture.total_remise_facture / facture.montant_brut_ht * 100, 2)

    return AnalyseRemiseResponse(
        tranches=tranches,
        rfa_totale_attendue=round(rfa_totale, 2),
        rfa_recue=facture.rfa_recue,
        ecart_rfa=facture.ecart_rfa,
        montant_brut_total=round(facture.montant_brut_ht, 2),
        montant_remise_total=round(facture.total_remise_facture, 2),
        taux_remise_global=taux_global,
    )


# ========================================
# POST /upload - Upload et parse PDF labo
# ========================================

@router.post("/upload", response_model=UploadLaboResponse, status_code=status.HTTP_201_CREATED)
async def upload_facture_labo(
    file: UploadFile = File(...),
    laboratoire_id: int = Query(..., description="ID du laboratoire"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload et analyser un PDF de facture laboratoire

    1. Valide le fichier PDF (extension, taille)
    2. Sauvegarde dans uploads/factures_labo/
    3. Parse avec BiogranInvoiceParser
    4. Verifie doublon (numero_facture unique)
    5. Persiste facture + lignes en base
    6. Retourne l'analyse complete

    **Parametres:**
    - **file**: Fichier PDF de la facture
    - **laboratoire_id**: ID du laboratoire (ex: 1 pour Biogaran)
    """
    # 1. Verifier que le laboratoire existe
    laboratoire = db.query(Laboratoire).filter(Laboratoire.id == laboratoire_id).first()
    if not laboratoire:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {laboratoire_id} non trouve"
        )

    # 2. Valider le fichier
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nom de fichier manquant"
        )

    ext = Path(file.filename).suffix.lower()
    if ext != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extension '{ext}' non supportee. Seuls les fichiers PDF sont acceptes."
        )

    # Verifier la taille (lire le contenu)
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fichier trop volumineux ({len(content) / (1024*1024):.1f} MB). Max: {settings.MAX_FILE_SIZE / (1024*1024):.0f} MB"
        )

    # 3. Sauvegarder le fichier
    upload_dir = Path(settings.UPLOAD_DIR) / "factures_labo"
    upload_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = upload_dir / safe_filename

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # 4. Parser le PDF avec la factory multi-fournisseurs
    try:
        from app.services.parsers import parse_invoice

        result = parse_invoice(str(file_path))

    except ImportError as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Module parsers non disponible: {e}"
        )
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Erreur lors du parsing du PDF : {str(e)}"
        )

    # 5. Verifier doublon (numero_facture unique)
    meta = result.metadata
    numero = meta.numero_facture if meta and meta.numero_facture else "INCONNU"
    existing = db.query(FactureLabo).filter(FactureLabo.numero_facture == numero).first()
    if existing:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Une facture avec le numero {numero} existe deja (ID: {existing.id})"
        )

    # 6. Mapper les donnees normalisees vers les modeles SQLAlchemy
    totaux = result.totaux
    tranches = result.tranches
    fournisseur = result.fournisseur

    # Recuperer l'accord commercial actif pour ce labo
    accord = db.query(AccordCommercial).filter(
        AccordCommercial.laboratoire_id == laboratoire_id,
        AccordCommercial.actif == True
    ).first()

    # Parser les dates
    date_facture = _parse_date(meta.date_facture) if meta else date.today()
    date_commande = _parse_date(meta.date_commande) if meta else None
    date_livraison = _parse_date(meta.date_livraison) if meta else None

    # Extraire les donnees par tranche
    tranche_a = tranches.get("A")
    tranche_b = tranches.get("B")
    otc = tranches.get("OTC")

    # Creer la facture
    db_facture = FactureLabo(
        user_id=current_user.id,
        laboratoire_id=laboratoire_id,
        numero_facture=numero,
        date_facture=date_facture or date.today(),
        date_commande=date_commande,
        date_livraison=date_livraison,
        numero_client=meta.numero_client if meta else None,
        nom_client=meta.nom_client if meta else None,
        canal=fournisseur.parser_id if fournisseur else None,
        montant_brut_ht=totaux.brut_ht,
        total_remise_facture=totaux.remises,
        montant_net_ht=totaux.net_ht,
        montant_ttc=totaux.ttc,
        total_tva=totaux.total_tva,
        tranche_a_brut=tranche_a.montant_brut if tranche_a else 0.0,
        tranche_a_remise=tranche_a.montant_remise if tranche_a else 0.0,
        tranche_a_pct_reel=tranche_a.pct_du_total if tranche_a else 0.0,
        tranche_b_brut=tranche_b.montant_brut if tranche_b else 0.0,
        tranche_b_remise=tranche_b.montant_remise if tranche_b else 0.0,
        tranche_b_pct_reel=tranche_b.pct_du_total if tranche_b else 0.0,
        otc_brut=otc.montant_brut if otc else 0.0,
        otc_remise=otc.montant_remise if otc else 0.0,
        rfa_attendue=totaux.rfa_attendue,
        mode_paiement=meta.mode_paiement if meta else None,
        delai_paiement=meta.delai_paiement if meta else None,
        fichier_pdf=str(file_path),
        nb_lignes=result.nb_lignes,
        nb_pages=meta.page_count if meta else 0,
        warnings=result.warning_messages if result.warnings else None,
        statut="analysee",
    )

    db.add(db_facture)
    db.flush()  # Pour obtenir l'ID

    # 7. Creer les lignes de facture
    for ligne in result.lignes:
        db_ligne = LigneFactureLabo(
            facture_id=db_facture.id,
            cip13=ligne.cip13,
            designation=ligne.designation,
            numero_lot=ligne.numero_lot or None,
            quantite=ligne.quantite,
            prix_unitaire_ht=ligne.prix_unitaire_ht,
            remise_pct=ligne.remise_pct,
            prix_unitaire_apres_remise=ligne.prix_unitaire_apres_remise,
            montant_ht=ligne.montant_ht,
            taux_tva=ligne.taux_tva,
            montant_brut=ligne.montant_brut,
            montant_remise=ligne.montant_remise,
            categorie=ligne.categorie or None,
            tranche=ligne.tranche or None,
        )
        db.add(db_ligne)

    db.commit()
    db.refresh(db_facture)

    # 8. Construire la reponse d'analyse
    analyse_response = _build_analyse_response(db_facture, accord)

    # Construire le fournisseur detecte pour la reponse
    fournisseur_detecte = FournisseurDetecte(
        nom=fournisseur.nom,
        type=fournisseur.type,
        detecte_auto=fournisseur.detecte_auto,
        parser_id=fournisseur.parser_id,
        confiance=fournisseur.confiance,
    )

    fournisseur_label = f" [{fournisseur.nom}]" if fournisseur.detecte_auto else " [parser generique]"

    return UploadLaboResponse(
        success=True,
        message=f"Facture {numero} analysee avec succes ({db_facture.nb_lignes} lignes){fournisseur_label}",
        facture=db_facture,
        analyse=analyse_response,
        fournisseur=fournisseur_detecte,
        warnings=db_facture.warnings,
    )


# ========================================
# GET / - Liste paginee des factures labo
# ========================================

@router.get("/", response_model=FactureLaboListResponse)
async def list_factures_labo(
    page: int = Query(1, ge=1, description="Numero de page"),
    page_size: int = Query(20, ge=1, le=100, description="Taille de page"),
    laboratoire_id: Optional[int] = Query(None, description="Filtrer par laboratoire"),
    statut: Optional[StatutFactureLabo] = Query(None, description="Filtrer par statut"),
    search: Optional[str] = Query(None, description="Recherche par numero facture ou client"),
    date_debut: Optional[date] = Query(None, description="Date de debut"),
    date_fin: Optional[date] = Query(None, description="Date de fin"),
    sort_by: str = Query("date_facture", description="Trier par (date_facture, montant, statut)"),
    sort_order: str = Query("desc", description="Ordre (asc, desc)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lister les factures laboratoires avec pagination et filtres

    **Filtres disponibles:**
    - Par laboratoire
    - Par statut (non_verifie, analysee, conforme, ecart_rfa)
    - Par recherche textuelle (numero facture ou nom client)
    - Par periode (date_debut, date_fin)
    """
    query = db.query(FactureLabo)

    # Filtres
    if laboratoire_id:
        query = query.filter(FactureLabo.laboratoire_id == laboratoire_id)

    if statut:
        query = query.filter(FactureLabo.statut == statut.value)

    if search:
        query = query.filter(
            or_(
                FactureLabo.numero_facture.ilike(f"%{search}%"),
                FactureLabo.nom_client.ilike(f"%{search}%"),
            )
        )

    if date_debut:
        query = query.filter(FactureLabo.date_facture >= date_debut)

    if date_fin:
        query = query.filter(FactureLabo.date_facture <= date_fin)

    # Tri
    order_func = desc if sort_order == "desc" else asc

    if sort_by == "date_facture":
        query = query.order_by(order_func(FactureLabo.date_facture))
    elif sort_by == "montant":
        query = query.order_by(order_func(FactureLabo.montant_brut_ht))
    elif sort_by == "statut":
        query = query.order_by(order_func(FactureLabo.statut))
    else:
        query = query.order_by(desc(FactureLabo.date_facture))

    # Pagination
    total = query.count()
    offset = (page - 1) * page_size

    factures = query.offset(offset).limit(page_size).all()

    total_pages = (total + page_size - 1) // page_size

    return FactureLaboListResponse(
        factures=factures,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ========================================
# GET /{id} - Detail facture labo
# ========================================

@router.get("/{facture_id}", response_model=FactureLaboResponse)
async def get_facture_labo(
    facture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtenir le detail d'une facture laboratoire par ID

    Retourne tous les details incluant :
    - Informations de base et metadata
    - Laboratoire associe
    - Analyse par tranche (A/B/OTC)
    - RFA attendue vs recue
    - Lignes de produits
    """
    facture = db.query(FactureLabo).filter(FactureLabo.id == facture_id).first()

    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture labo avec ID {facture_id} non trouvee"
        )

    return facture


# ========================================
# GET /{id}/lignes - Lignes d'une facture
# ========================================

@router.get("/{facture_id}/lignes", response_model=List[LigneFactureLaboResponse])
async def get_facture_labo_lignes(
    facture_id: int,
    tranche: Optional[str] = Query(None, description="Filtrer par tranche (A, B, OTC)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtenir toutes les lignes d'une facture laboratoire

    **Filtres:**
    - Par tranche (A, B, OTC)
    """
    facture = db.query(FactureLabo).filter(FactureLabo.id == facture_id).first()

    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture labo avec ID {facture_id} non trouvee"
        )

    query = db.query(LigneFactureLabo).filter(LigneFactureLabo.facture_id == facture_id)

    if tranche:
        query = query.filter(LigneFactureLabo.tranche == tranche.upper())

    return query.all()


# ========================================
# GET /{id}/analyse - Analyse complete
# ========================================

@router.get("/{facture_id}/analyse", response_model=AnalyseRemiseResponse)
async def get_facture_labo_analyse(
    facture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtenir l'analyse complete des remises par tranche

    Retourne :
    - Detail par tranche (A, B, OTC)
    - Taux reels vs cibles
    - RFA attendue, recue, ecart
    - Totaux
    """
    facture = db.query(FactureLabo).filter(FactureLabo.id == facture_id).first()

    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture labo avec ID {facture_id} non trouvee"
        )

    # Recuperer l'accord commercial
    accord = db.query(AccordCommercial).filter(
        AccordCommercial.laboratoire_id == facture.laboratoire_id,
        AccordCommercial.actif == True
    ).first()

    return _build_analyse_response(facture, accord)


# ========================================
# PATCH /{id}/rfa - Saisir RFA recue
# ========================================

@router.patch("/{facture_id}/rfa", response_model=RFAUpdateResponse)
async def update_rfa(
    facture_id: int,
    rfa_data: RFAUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Saisir le montant de RFA reellement recu

    Calcule automatiquement :
    - **ecart_rfa** = rfa_recue - rfa_attendue
    - **statut** = 'conforme' si |ecart| < 0.50, sinon 'ecart_rfa'
    """
    facture = db.query(FactureLabo).filter(FactureLabo.id == facture_id).first()

    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture labo avec ID {facture_id} non trouvee"
        )

    # Calculer l'ecart
    facture.rfa_recue = rfa_data.rfa_recue
    facture.ecart_rfa = round(rfa_data.rfa_recue - facture.rfa_attendue, 2)

    # Determiner le statut
    if abs(facture.ecart_rfa) < 0.50:
        facture.statut = "conforme"
        message = f"RFA conforme (ecart: {facture.ecart_rfa:.2f} EUR)"
    else:
        facture.statut = "ecart_rfa"
        message = f"Ecart RFA detecte: {facture.ecart_rfa:.2f} EUR (attendue: {facture.rfa_attendue:.2f}, recue: {rfa_data.rfa_recue:.2f})"

    facture.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(facture)

    return RFAUpdateResponse(
        facture_id=facture.id,
        rfa_attendue=facture.rfa_attendue,
        rfa_recue=facture.rfa_recue,
        ecart_rfa=facture.ecart_rfa,
        statut=StatutFactureLabo(facture.statut),
        message=message,
    )


# ========================================
# DELETE /{id} - Supprimer facture labo
# ========================================

@router.delete("/{facture_id}", response_model=MessageResponse)
async def delete_facture_labo(
    facture_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprimer une facture laboratoire

    Supprime :
    - La facture et toutes ses lignes (cascade)
    - Le fichier PDF associe sur le disque
    """
    facture = db.query(FactureLabo).filter(FactureLabo.id == facture_id).first()

    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture labo avec ID {facture_id} non trouvee"
        )

    numero = facture.numero_facture

    # Supprimer le fichier PDF associe
    if facture.fichier_pdf:
        pdf_path = Path(facture.fichier_pdf)
        if pdf_path.exists():
            try:
                pdf_path.unlink()
            except OSError:
                pass  # Ne pas echouer si le fichier ne peut pas etre supprime

    # Supprimer la facture (cascade supprime les lignes)
    db.delete(facture)
    db.commit()

    return MessageResponse(
        message=f"Facture {numero} et ses {facture.nb_lignes} lignes supprimees avec succes",
        success=True,
    )


# ========================================
# GET /stats/monthly - Statistiques mensuelles
# ========================================

@router.get("/stats/monthly", response_model=StatsMonthlyResponse)
async def get_stats_monthly(
    laboratoire_id: Optional[int] = Query(None, description="Filtrer par laboratoire"),
    annee: int = Query(default=None, description="Annee (defaut: annee en cours)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Statistiques mensuelles des factures laboratoires

    Agregation par mois incluant :
    - Nombre de factures
    - Montants bruts, remises, nets
    - RFA attendues vs recues
    - Ecarts et conformite
    """
    if annee is None:
        annee = datetime.now().year

    # Query de base
    query = db.query(FactureLabo)

    if laboratoire_id:
        query = query.filter(FactureLabo.laboratoire_id == laboratoire_id)

    # Filtrer par annee
    query = query.filter(
        extract("year", FactureLabo.date_facture) == annee
    )

    factures = query.all()

    # Agreger par mois
    monthly_data = {}
    for facture in factures:
        mois_key = facture.date_facture.strftime("%Y-%m")

        if mois_key not in monthly_data:
            monthly_data[mois_key] = StatsMonthlyItem(mois=mois_key)

        item = monthly_data[mois_key]
        item.nb_factures += 1
        item.montant_brut_total += facture.montant_brut_ht or 0.0
        item.montant_remise_total += facture.total_remise_facture or 0.0
        item.montant_net_total += facture.montant_net_ht or 0.0
        item.rfa_attendue_total += facture.rfa_attendue or 0.0

        if facture.rfa_recue is not None:
            if item.rfa_recue_total is None:
                item.rfa_recue_total = 0.0
            item.rfa_recue_total += facture.rfa_recue

        if facture.statut == "conforme":
            item.nb_conformes += 1
        elif facture.statut == "ecart_rfa":
            item.nb_ecarts += 1

    # Calculer les ecarts mensuels
    for item in monthly_data.values():
        if item.rfa_recue_total is not None:
            item.ecart_rfa_total = round(item.rfa_recue_total - item.rfa_attendue_total, 2)

        item.montant_brut_total = round(item.montant_brut_total, 2)
        item.montant_remise_total = round(item.montant_remise_total, 2)
        item.montant_net_total = round(item.montant_net_total, 2)
        item.rfa_attendue_total = round(item.rfa_attendue_total, 2)

    # Trier par mois
    stats_list = sorted(monthly_data.values(), key=lambda x: x.mois)

    # Totaux
    total_factures = sum(s.nb_factures for s in stats_list)
    total_brut = round(sum(s.montant_brut_total for s in stats_list), 2)
    total_remise = round(sum(s.montant_remise_total for s in stats_list), 2)
    total_rfa_attendue = round(sum(s.rfa_attendue_total for s in stats_list), 2)

    total_rfa_recue = None
    total_ecart = None
    rfa_recues = [s.rfa_recue_total for s in stats_list if s.rfa_recue_total is not None]
    if rfa_recues:
        total_rfa_recue = round(sum(rfa_recues), 2)
        total_ecart = round(total_rfa_recue - total_rfa_attendue, 2)

    # Nom du laboratoire
    labo_nom = None
    if laboratoire_id:
        labo = db.query(Laboratoire).filter(Laboratoire.id == laboratoire_id).first()
        if labo:
            labo_nom = labo.nom

    return StatsMonthlyResponse(
        laboratoire_id=laboratoire_id,
        laboratoire_nom=labo_nom,
        periode=f"{annee}-01 a {annee}-12",
        stats=stats_list,
        total_factures=total_factures,
        total_brut=total_brut,
        total_remise=total_remise,
        total_rfa_attendue=total_rfa_attendue,
        total_rfa_recue=total_rfa_recue,
        total_ecart=total_ecart,
    )


# ========================================
# GET /parsers - Parsers disponibles
# ========================================

@router.get("/parsers/available")
async def get_parsers_available(
    current_user: User = Depends(get_current_user),
):
    """
    Lister les parsers de factures disponibles.

    Retourne pour chaque parser :
    - id, name, version
    - type (laboratoire, grossiste)
    - keywords de detection
    - dedicated (parser dedie vs generique)
    """
    try:
        from app.services.parsers import get_available_parsers
        return {"parsers": get_available_parsers()}
    except ImportError:
        return {"parsers": []}
