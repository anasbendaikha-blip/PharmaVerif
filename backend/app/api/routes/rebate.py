"""
PharmaVerif Backend - Routes Rebate Engine
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/rebate.py
Endpoints API pour le moteur de calcul des remises echelonnees (RFA).

Priorites:
  P0 — Templates CRUD, Agreements CRUD + versioning, Schedule, Preview
  P1 — Dashboard mensuel, Primes conditionnelles
  P2 — Force recalcul, Stats globales
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, extract, or_
from datetime import datetime, date
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

from app.schemas_rebate import (
    # Templates
    RebateTemplateCreateRequest,
    RebateTemplateUpdateRequest,
    RebateTemplateResponse,
    # Agreements
    LaboratoryAgreementCreateRequest,
    LaboratoryAgreementUpdateRequest,
    LaboratoryAgreementResponse,
    AgreementVersionHistoryResponse,
    AgreementVersionHistoryItem,
    # Schedules
    InvoiceRebateScheduleResponse,
    # Preview
    PreviewRequest,
    PreviewResponse,
    RebateEntrySchema,
    # Dashboard
    MonthlyRebateDashboardResponse,
    MonthlyRebateByLabSchema,
    ConditionalBonusDashboardResponse,
    ConditionalBonusSchema,
    # Audit
    AgreementAuditLogResponse,
    # Stats
    RebateStatsResponse,
)
from app.database import get_db
from app.models import User
from app.models_rebate import (
    RebateTemplate,
    LaboratoryAgreement,
    InvoiceRebateSchedule,
    AgreementAuditLog,
    AgreementStatus,
    ScheduleStatus,
    RebateType,
)
from app.models_labo import Laboratoire, FactureLabo, LigneFactureLabo
from app.api.routes.auth import get_current_user, get_current_pharmacy_id
from app.services.rebate_engine import (
    RebateEngine,
    AgreementVersioningService,
    RebateEngineError,
    NoActiveAgreementError,
    InvalidConfigError,
)

router = APIRouter()


# ============================================================================
# P0 — TEMPLATES CRUD
# ============================================================================

@router.get("/templates", response_model=List[RebateTemplateResponse])
async def list_templates(
    actif: Optional[bool] = Query(None, description="Filtrer par statut actif"),
    laboratoire_nom: Optional[str] = Query(None, description="Filtrer par nom de laboratoire"),
    scope: Optional[str] = Query(None, description="Filtrer par scope (system, group, pharmacy)"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Lister tous les templates de remise disponibles.

    Les templates systeme sont visibles par toutes les pharmacies.
    Les templates 'pharmacy' sont filtrés par pharmacie.
    """
    query = db.query(RebateTemplate)

    if actif is not None:
        query = query.filter(RebateTemplate.actif == actif)

    if laboratoire_nom:
        query = query.filter(RebateTemplate.laboratoire_nom.ilike(f"%{laboratoire_nom}%"))

    if scope:
        query = query.filter(RebateTemplate.scope == scope)

    templates = query.order_by(RebateTemplate.laboratoire_nom, RebateTemplate.nom).all()

    # Enrichir avec le compteur d'accords actifs
    result = []
    for t in templates:
        count = db.query(func.count(LaboratoryAgreement.id)).filter(
            LaboratoryAgreement.template_id == t.id,
            LaboratoryAgreement.pharmacy_id == pharmacy_id,
            LaboratoryAgreement.statut == AgreementStatus.ACTIF,
        ).scalar() or 0

        resp = RebateTemplateResponse.model_validate(t)
        resp.active_agreements_count = count
        result.append(resp)

    return result


@router.get("/templates/{template_id}", response_model=RebateTemplateResponse)
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Obtenir un template de remise par ID"""
    template = db.query(RebateTemplate).filter(
        RebateTemplate.id == template_id,
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template de remise avec ID {template_id} non trouve",
        )

    count = db.query(func.count(LaboratoryAgreement.id)).filter(
        LaboratoryAgreement.template_id == template.id,
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
        LaboratoryAgreement.statut == AgreementStatus.ACTIF,
    ).scalar() or 0

    resp = RebateTemplateResponse.model_validate(template)
    resp.active_agreements_count = count
    return resp


@router.post("/templates", response_model=RebateTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: RebateTemplateCreateRequest,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Creer un nouveau template de remise.

    La structure (stages) est validee par Pydantic avant persistance.
    """
    # Verifier unicite du nom
    existing = db.query(RebateTemplate).filter(
        RebateTemplate.nom == data.name,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un template avec le nom '{data.name}' existe deja",
        )

    template = RebateTemplate(
        nom=data.name,
        description=data.description,
        laboratoire_nom=data.laboratoire_nom,
        rebate_type=RebateType.RFA,
        tiers=data.tiers or [],
        structure=data.structure.model_dump() if data.structure else None,
        taux_escompte=data.taux_escompte,
        delai_escompte_jours=data.delai_escompte_jours,
        taux_cooperation=data.taux_cooperation,
        gratuites_ratio=data.gratuites_ratio,
        gratuites_seuil_qte=data.gratuites_seuil_qte,
        scope=data.scope.value,
        actif=True,
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    logger.info(f"Template cree: {template.nom} (ID={template.id})")
    return RebateTemplateResponse.model_validate(template)


@router.put("/templates/{template_id}", response_model=RebateTemplateResponse)
async def update_template(
    template_id: int,
    data: RebateTemplateUpdateRequest,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Modifier un template de remise.

    Incremente la version automatiquement.
    """
    template = db.query(RebateTemplate).filter(
        RebateTemplate.id == template_id,
    ).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template de remise avec ID {template_id} non trouve",
        )

    if data.name is not None:
        # Verifier unicite
        existing = db.query(RebateTemplate).filter(
            RebateTemplate.nom == data.name,
            RebateTemplate.id != template_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Un template avec le nom '{data.name}' existe deja",
            )
        template.nom = data.name

    if data.description is not None:
        template.description = data.description
    if data.structure is not None:
        template.structure = data.structure.model_dump()
    if data.tiers is not None:
        template.tiers = data.tiers
    if data.taux_escompte is not None:
        template.taux_escompte = data.taux_escompte
    if data.taux_cooperation is not None:
        template.taux_cooperation = data.taux_cooperation
    if data.actif is not None:
        template.actif = data.actif

    # Incrementer la version
    template.version = (template.version or 1) + 1

    db.commit()
    db.refresh(template)

    logger.info(f"Template modifie: {template.nom} → v{template.version}")
    return RebateTemplateResponse.model_validate(template)


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Supprimer un template de remise.

    Echoue si des accords actifs utilisent ce template.
    """
    template = db.query(RebateTemplate).filter(
        RebateTemplate.id == template_id,
    ).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template de remise avec ID {template_id} non trouve",
        )

    # Verifier qu'aucun accord actif ne l'utilise
    active_count = db.query(func.count(LaboratoryAgreement.id)).filter(
        LaboratoryAgreement.template_id == template_id,
        LaboratoryAgreement.statut == AgreementStatus.ACTIF,
    ).scalar() or 0

    if active_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible de supprimer : {active_count} accord(s) actif(s) utilisent ce template",
        )

    nom = template.nom
    db.delete(template)
    db.commit()

    return {"message": f"Template '{nom}' supprime avec succes", "success": True}


# ============================================================================
# P0 — AGREEMENTS CRUD + VERSIONING
# ============================================================================

@router.get("/agreements", response_model=List[LaboratoryAgreementResponse])
async def list_agreements(
    laboratoire_id: Optional[int] = Query(None, description="Filtrer par laboratoire"),
    statut: Optional[str] = Query(None, description="Filtrer par statut (brouillon, actif, archive, expire)"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Lister les accords de remise de la pharmacie courante.

    **Filtres:**
    - Par laboratoire
    - Par statut (brouillon, actif, archive, expire)
    """
    query = db.query(LaboratoryAgreement).filter(
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
    )

    if laboratoire_id is not None:
        query = query.filter(LaboratoryAgreement.laboratoire_id == laboratoire_id)

    if statut:
        query = query.filter(LaboratoryAgreement.statut == statut)

    agreements = query.order_by(
        desc(LaboratoryAgreement.created_at),
    ).all()

    # Enrichir avec le nom du labo et du template
    result = []
    for ag in agreements:
        resp = LaboratoryAgreementResponse.model_validate(ag)
        if ag.laboratoire:
            resp.laboratoire_nom = ag.laboratoire.nom
        if ag.template:
            resp.template_nom = ag.template.nom
        result.append(resp)

    return result


@router.get("/agreements/{agreement_id}", response_model=LaboratoryAgreementResponse)
async def get_agreement(
    agreement_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Obtenir un accord de remise par ID (filtre par pharmacie)"""
    agreement = db.query(LaboratoryAgreement).filter(
        LaboratoryAgreement.id == agreement_id,
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
    ).first()

    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord de remise avec ID {agreement_id} non trouve",
        )

    resp = LaboratoryAgreementResponse.model_validate(agreement)
    if agreement.laboratoire:
        resp.laboratoire_nom = agreement.laboratoire.nom
    if agreement.template:
        resp.template_nom = agreement.template.nom
    return resp


@router.post("/agreements", response_model=LaboratoryAgreementResponse, status_code=status.HTTP_201_CREATED)
async def create_agreement(
    data: LaboratoryAgreementCreateRequest,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Creer un nouvel accord de remise.

    - Si `activate=True` : active l'accord et archive les accords actifs existants
      pour ce meme labo.
    - Si `activate=False` (defaut) : cree en brouillon.
    """
    # Verifier que le laboratoire appartient a la pharmacie
    labo = db.query(Laboratoire).filter(
        Laboratoire.id == data.laboratoire_id,
        Laboratoire.pharmacy_id == pharmacy_id,
    ).first()
    if not labo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Laboratoire avec ID {data.laboratoire_id} non trouve dans cette pharmacie",
        )

    # Verifier que le template existe
    template = db.query(RebateTemplate).filter(
        RebateTemplate.id == data.template_id,
    ).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template avec ID {data.template_id} non trouve",
        )

    try:
        svc = AgreementVersioningService(db)
        agreement = svc.create_agreement(
            pharmacy_id=pharmacy_id,
            laboratoire_id=data.laboratoire_id,
            template_id=data.template_id,
            nom=data.nom,
            date_debut=data.date_debut,
            date_fin=data.date_fin,
            agreement_config=data.agreement_config.model_dump() if data.agreement_config else None,
            custom_tiers=data.custom_tiers,
            reference_externe=data.reference_externe,
            notes=data.notes,
            created_by=current_user.id,
            activate=data.activate,
            taux_escompte=data.taux_escompte,
            taux_cooperation=data.taux_cooperation,
            gratuites_ratio=data.gratuites_ratio,
            objectif_ca_annuel=data.objectif_ca_annuel,
        )
    except RebateEngineError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    resp = LaboratoryAgreementResponse.model_validate(agreement)
    resp.laboratoire_nom = labo.nom
    resp.template_nom = template.nom

    logger.info(
        f"Accord cree: {agreement.nom} (ID={agreement.id}, "
        f"statut={agreement.statut.value}, labo={labo.nom})"
    )
    return resp


@router.put("/agreements/{agreement_id}", response_model=LaboratoryAgreementResponse)
async def update_agreement(
    agreement_id: int,
    data: LaboratoryAgreementUpdateRequest,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Modifier un accord de remise.

    - Si brouillon : modification directe.
    - Si actif : cree automatiquement une nouvelle version (l'ancien passe en 'archive').
    - Seuls les accords 'brouillon' ou 'actif' sont modifiables.
    """
    # Verifier que l'accord appartient a la pharmacie
    existing = db.query(LaboratoryAgreement).filter(
        LaboratoryAgreement.id == agreement_id,
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
    ).first()
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord de remise avec ID {agreement_id} non trouve",
        )

    try:
        svc = AgreementVersioningService(db)

        # Preparer les kwargs de mise a jour
        update_kwargs = {}
        if data.agreement_config is not None:
            update_kwargs["agreement_config"] = data.agreement_config.model_dump()
        if data.custom_tiers is not None:
            update_kwargs["custom_tiers"] = data.custom_tiers
        if data.taux_escompte is not None:
            update_kwargs["taux_escompte"] = data.taux_escompte
        if data.taux_cooperation is not None:
            update_kwargs["taux_cooperation"] = data.taux_cooperation
        if data.gratuites_ratio is not None:
            update_kwargs["gratuites_ratio"] = data.gratuites_ratio
        if data.objectif_ca_annuel is not None:
            update_kwargs["objectif_ca_annuel"] = data.objectif_ca_annuel
        if data.date_fin is not None:
            update_kwargs["date_fin"] = data.date_fin
        if data.reference_externe is not None:
            update_kwargs["reference_externe"] = data.reference_externe
        if data.notes is not None:
            update_kwargs["notes"] = data.notes

        agreement = svc.update_agreement(
            agreement_id=agreement_id,
            user_id=current_user.id,
            reason=data.reason,
            **update_kwargs,
        )
    except RebateEngineError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    resp = LaboratoryAgreementResponse.model_validate(agreement)
    if agreement.laboratoire:
        resp.laboratoire_nom = agreement.laboratoire.nom
    if agreement.template:
        resp.template_nom = agreement.template.nom
    return resp


@router.post("/agreements/{agreement_id}/activate", response_model=LaboratoryAgreementResponse)
async def activate_agreement(
    agreement_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Activer un accord en brouillon.

    Archive automatiquement les accords actifs existants pour le meme labo.
    """
    existing = db.query(LaboratoryAgreement).filter(
        LaboratoryAgreement.id == agreement_id,
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
    ).first()
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord de remise avec ID {agreement_id} non trouve",
        )

    try:
        svc = AgreementVersioningService(db)
        agreement = svc.activate_agreement(
            agreement_id=agreement_id,
            user_id=current_user.id,
        )
    except RebateEngineError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    resp = LaboratoryAgreementResponse.model_validate(agreement)
    if agreement.laboratoire:
        resp.laboratoire_nom = agreement.laboratoire.nom
    if agreement.template:
        resp.template_nom = agreement.template.nom

    logger.info(f"Accord active: {agreement.nom} (ID={agreement.id})")
    return resp


@router.get(
    "/agreements/{agreement_id}/history",
    response_model=AgreementVersionHistoryResponse,
)
async def get_agreement_history(
    agreement_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Obtenir l'historique de versioning d'un accord.

    Retourne toutes les versions (actuelle et archivees) pour le meme
    couple labo/pharmacie.
    """
    agreement = db.query(LaboratoryAgreement).filter(
        LaboratoryAgreement.id == agreement_id,
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
    ).first()
    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord de remise avec ID {agreement_id} non trouve",
        )

    svc = AgreementVersioningService(db)
    versions = svc.get_version_history(
        pharmacy_id=pharmacy_id,
        laboratoire_id=agreement.laboratoire_id,
    )

    # Construire la reponse
    history_items = []
    for v in versions:
        # Compter les factures associees
        invoices_count = db.query(func.count(InvoiceRebateSchedule.id)).filter(
            InvoiceRebateSchedule.agreement_id == v.id,
        ).scalar() or 0

        history_items.append(AgreementVersionHistoryItem(
            version=v.version,
            statut=v.statut.value,
            date_debut=v.date_debut,
            date_fin=v.date_fin,
            created_at=v.created_at,
            created_by=v.created_by,
            invoices_count=invoices_count,
        ))

    labo_nom = agreement.laboratoire.nom if agreement.laboratoire else "Inconnu"

    return AgreementVersionHistoryResponse(
        laboratoire_nom=labo_nom,
        current_version=agreement.version,
        versions=history_items,
    )


@router.delete("/agreements/{agreement_id}")
async def delete_agreement(
    agreement_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Supprimer un accord de remise.

    Seuls les accords en brouillon peuvent etre supprimes.
    Les accords actifs/archives doivent etre archives via le versioning.
    """
    agreement = db.query(LaboratoryAgreement).filter(
        LaboratoryAgreement.id == agreement_id,
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
    ).first()
    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord de remise avec ID {agreement_id} non trouve",
        )

    if agreement.statut != AgreementStatus.BROUILLON:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Seuls les accords en brouillon peuvent etre supprimes. "
                   f"Statut actuel : {agreement.statut.value}",
        )

    nom = agreement.nom
    db.delete(agreement)
    db.commit()

    return {"message": f"Accord '{nom}' supprime avec succes", "success": True}


# ============================================================================
# P0 — SCHEDULE (calcul du calendrier de remises)
# ============================================================================

@router.post(
    "/invoices/{facture_labo_id}/schedule",
    response_model=InvoiceRebateScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def calculate_invoice_schedule(
    facture_labo_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Calculer le calendrier de remises pour une facture labo.

    1. Charge la facture et ses lignes
    2. Trouve l'accord actif pour ce labo/pharmacie
    3. Classe chaque ligne en Tranche A / Tranche B / OTC
    4. Calcule les remises par etape et par tranche
    5. Persiste le schedule immutable

    **Important:** Un seul schedule par facture. Si un schedule existe deja,
    une erreur est retournee (utiliser force-recalcul pour recalculer).
    """
    # Charger la facture labo
    facture = db.query(FactureLabo).filter(
        FactureLabo.id == facture_labo_id,
        FactureLabo.pharmacy_id == pharmacy_id,
    ).first()
    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture labo avec ID {facture_labo_id} non trouvee",
        )

    # Verifier qu'un schedule n'existe pas deja
    existing_schedule = db.query(InvoiceRebateSchedule).filter(
        InvoiceRebateSchedule.facture_labo_id == facture_labo_id,
        InvoiceRebateSchedule.pharmacy_id == pharmacy_id,
    ).first()
    if existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un calendrier de remises existe deja pour la facture {facture.numero_facture} "
                   f"(schedule_id={existing_schedule.id}). Utilisez force-recalcul pour recalculer.",
        )

    # Charger les lignes
    lignes = db.query(LigneFactureLabo).filter(
        LigneFactureLabo.facture_id == facture_labo_id,
    ).all()

    invoice_lines = [
        {
            "montant_ht": l.montant_ht or 0,
            "taux_tva": l.taux_tva or 0,
            "remise_pourcentage": l.remise_pct or 0,
        }
        for l in lignes
    ]

    try:
        engine = RebateEngine(db)
        schedule = engine.calculate_rebate_schedule(
            invoice_id=facture_labo_id,
            invoice_amount=facture.montant_net_ht or 0,
            invoice_date=facture.date_facture or date.today(),
            pharmacy_id=pharmacy_id,
            laboratoire_id=facture.laboratoire_id,
            invoice_lines=invoice_lines,
        )
    except NoActiveAgreementError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except InvalidConfigError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except RebateEngineError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    logger.info(
        f"Schedule calcule pour facture {facture.numero_facture}: "
        f"RFA={schedule.total_rfa_expected}EUR"
    )
    return InvoiceRebateScheduleResponse.model_validate(schedule)


@router.get(
    "/invoices/{facture_labo_id}/schedule",
    response_model=InvoiceRebateScheduleResponse,
)
async def get_invoice_schedule(
    facture_labo_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Obtenir le calendrier de remises d'une facture labo"""
    schedule = db.query(InvoiceRebateSchedule).filter(
        InvoiceRebateSchedule.facture_labo_id == facture_labo_id,
        InvoiceRebateSchedule.pharmacy_id == pharmacy_id,
    ).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aucun calendrier de remises pour la facture {facture_labo_id}",
        )

    return InvoiceRebateScheduleResponse.model_validate(schedule)


@router.get("/schedules", response_model=List[InvoiceRebateScheduleResponse])
async def list_schedules(
    agreement_id: Optional[int] = Query(None, description="Filtrer par accord"),
    laboratoire_id: Optional[int] = Query(None, description="Filtrer par laboratoire"),
    statut: Optional[str] = Query(None, description="Filtrer par statut (prevu, emis, recu, ecart)"),
    en_retard: Optional[bool] = Query(None, description="Filtrer les echeances en retard"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Lister les calendriers de remises de la pharmacie.

    **Filtres:**
    - Par accord
    - Par laboratoire (via l'accord)
    - Par statut
    - Echeances en retard
    """
    query = db.query(InvoiceRebateSchedule).filter(
        InvoiceRebateSchedule.pharmacy_id == pharmacy_id,
    )

    if agreement_id is not None:
        query = query.filter(InvoiceRebateSchedule.agreement_id == agreement_id)

    if laboratoire_id is not None:
        query = query.join(LaboratoryAgreement).filter(
            LaboratoryAgreement.laboratoire_id == laboratoire_id,
        )

    if statut:
        query = query.filter(InvoiceRebateSchedule.statut == statut)

    if en_retard is True:
        query = query.filter(
            InvoiceRebateSchedule.statut == ScheduleStatus.PREVU,
            InvoiceRebateSchedule.date_echeance < date.today(),
        )

    schedules = query.order_by(
        desc(InvoiceRebateSchedule.date_echeance),
    ).all()

    return [InvoiceRebateScheduleResponse.model_validate(s) for s in schedules]


# ============================================================================
# P0 — PREVIEW (calcul sans persistance)
# ============================================================================

@router.post("/preview", response_model=PreviewResponse)
async def preview_schedule(
    data: PreviewRequest,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Previsualiser le calendrier de remises SANS persister.

    Utilise par le frontend pour le rendu en temps reel du formulaire
    de creation/modification d'accord.
    """
    try:
        engine = RebateEngine(db)
        result = engine.preview_schedule(
            template_id=data.template_id,
            agreement_config=data.agreement_config.model_dump() if data.agreement_config else None,
            simulation_amount=data.simulation_amount,
        )
    except InvalidConfigError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except RebateEngineError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Convertir les entries en schemas
    entries = []
    for e in result.get("entries", []):
        entries.append(RebateEntrySchema(
            stage_id=e.get("stage_id", ""),
            stage_label=e.get("stage_label", ""),
            stage_order=e.get("stage_order", 0),
            tranche_A_amount=e.get("tranche_A_amount", 0),
            tranche_B_amount=e.get("tranche_B_amount", 0),
            total_amount=e.get("total_amount", 0),
            rate=e.get("rate"),
            incremental_rate=e.get("incremental_rate"),
            cumulative_amount=e.get("cumulative_amount", 0),
            cumulative_rate=e.get("cumulative_rate", 0),
            expected_date=e.get("expected_date", ""),
            payment_method=e.get("payment_method", ""),
            status=e.get("status", "pending"),
            is_conditional=e.get("is_conditional", False),
        ))

    return PreviewResponse(
        entries=entries,
        total_rfa=result.get("total_rfa", 0),
        total_rfa_percentage=result.get("total_rfa_percentage", 0),
        tranche_breakdown=result.get("tranche_breakdown"),
        validations=result.get("validations", []),
    )


# ============================================================================
# P0 — AUDIT LOGS
# ============================================================================

@router.get(
    "/agreements/{agreement_id}/audit",
    response_model=List[AgreementAuditLogResponse],
)
async def get_agreement_audit_logs(
    agreement_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """Obtenir le journal d'audit d'un accord"""
    agreement = db.query(LaboratoryAgreement).filter(
        LaboratoryAgreement.id == agreement_id,
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
    ).first()
    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Accord de remise avec ID {agreement_id} non trouve",
        )

    logs = db.query(AgreementAuditLog).filter(
        AgreementAuditLog.agreement_id == agreement_id,
    ).order_by(desc(AgreementAuditLog.created_at)).all()

    return [AgreementAuditLogResponse.model_validate(log) for log in logs]


# ============================================================================
# P1 — DASHBOARD MENSUEL DES REMISES
# ============================================================================

@router.get("/dashboard/monthly", response_model=MonthlyRebateDashboardResponse)
async def get_monthly_dashboard(
    month: Optional[str] = Query(None, description="Mois au format YYYY-MM (defaut: mois courant)"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Dashboard mensuel des remises attendues par laboratoire.

    Retourne pour chaque labo les montants attendus, statuts, et delais.
    """
    # Parser le mois
    if month:
        try:
            target_year = int(month[:4])
            target_month = int(month[5:7])
        except (ValueError, IndexError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format de mois invalide. Utiliser YYYY-MM",
            )
    else:
        today = date.today()
        target_year = today.year
        target_month = today.month

    month_str = f"{target_year}-{target_month:02d}"

    # Recuperer les schedules du mois
    schedules = db.query(InvoiceRebateSchedule).filter(
        InvoiceRebateSchedule.pharmacy_id == pharmacy_id,
        extract("year", InvoiceRebateSchedule.date_echeance) == target_year,
        extract("month", InvoiceRebateSchedule.date_echeance) == target_month,
    ).all()

    # Agreger par labo
    labo_data = {}
    total_expected = 0.0

    for s in schedules:
        agreement = s.agreement
        if not agreement:
            continue

        labo_id = agreement.laboratoire_id
        if labo_id not in labo_data:
            labo_nom = agreement.laboratoire.nom if agreement.laboratoire else f"Labo #{labo_id}"
            labo_data[labo_id] = {
                "laboratoire_id": labo_id,
                "laboratoire_nom": labo_nom,
                "invoices_count": 0,
                "total_expected": 0.0,
                "deadline_date": None,
                "status": "on_time",
                "days_remaining": None,
            }

        entry = labo_data[labo_id]
        entry["invoices_count"] += 1
        entry["total_expected"] += s.montant_prevu or 0

        if s.date_echeance:
            if entry["deadline_date"] is None or s.date_echeance > datetime.strptime(entry["deadline_date"], "%Y-%m-%d").date() if isinstance(entry["deadline_date"], str) else True:
                entry["deadline_date"] = s.date_echeance.isoformat()

        # Statut
        if s.statut == ScheduleStatus.RECU:
            entry["status"] = "received"
        elif s.date_echeance and s.date_echeance < date.today():
            entry["status"] = "late"

        total_expected += s.montant_prevu or 0

    # Construire la reponse
    laboratories = []
    for data in labo_data.values():
        # Calculer days_remaining
        if data["deadline_date"]:
            try:
                deadline = date.fromisoformat(data["deadline_date"])
                data["days_remaining"] = (deadline - date.today()).days
            except (ValueError, TypeError):
                pass

        laboratories.append(MonthlyRebateByLabSchema(
            laboratoire_id=data["laboratoire_id"],
            laboratoire_nom=data["laboratoire_nom"],
            stage_label="RFA",
            invoices_count=data["invoices_count"],
            total_expected=round(data["total_expected"], 2),
            deadline_date=data["deadline_date"],
            status=data["status"],
            days_remaining=data["days_remaining"],
        ))

    return MonthlyRebateDashboardResponse(
        month=month_str,
        laboratories=laboratories,
        total_expected=round(total_expected, 2),
    )


# ============================================================================
# P1 — PRIMES CONDITIONNELLES
# ============================================================================

@router.get("/dashboard/conditional-bonuses", response_model=ConditionalBonusDashboardResponse)
async def get_conditional_bonuses(
    year: Optional[int] = Query(None, description="Annee (defaut: annee en cours)"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Dashboard des primes conditionnelles (volume annuel, ponctualite, etc.)

    Evalue la progression vers les conditions de chaque accord actif
    et estime le montant des primes.
    """
    if year is None:
        year = date.today().year

    # Recuperer les accords actifs
    agreements = db.query(LaboratoryAgreement).filter(
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
        LaboratoryAgreement.statut == AgreementStatus.ACTIF,
    ).all()

    bonuses = []
    total_estimated = 0.0

    for ag in agreements:
        if not ag.agreement_config:
            continue

        config = ag.agreement_config
        tranches = config.get("tranche_configurations", {})

        for tranche_key, tranche_cfg in tranches.items():
            stages = tranche_cfg.get("stages", {}) if isinstance(tranche_cfg, dict) else {}
            for stage_id, stage_cfg in stages.items():
                if not isinstance(stage_cfg, dict):
                    continue
                threshold = stage_cfg.get("condition_threshold")
                if threshold is None or threshold <= 0:
                    continue

                # C'est une etape conditionnelle
                labo_nom = ag.laboratoire.nom if ag.laboratoire else f"Labo #{ag.laboratoire_id}"

                # Calculer le CA annuel
                ca_annuel = db.query(
                    func.coalesce(func.sum(FactureLabo.montant_net_ht), 0)
                ).filter(
                    FactureLabo.pharmacy_id == pharmacy_id,
                    FactureLabo.laboratoire_id == ag.laboratoire_id,
                    extract("year", FactureLabo.date_facture) == year,
                ).scalar() or 0

                current_pct = (float(ca_annuel) / threshold * 100) if threshold > 0 else 0

                # Projection
                today = date.today()
                days_elapsed = max((today - date(year, 1, 1)).days, 1)
                days_in_year = 366 if year % 4 == 0 else 365
                projection = float(ca_annuel) * (days_in_year / days_elapsed)

                # Estimation du bonus
                rate = stage_cfg.get("incremental_rate", stage_cfg.get("rate", 0))
                estimated = float(ca_annuel) * float(rate) if rate else 0

                # Statut
                if current_pct >= 100:
                    bonus_status = "achieved"
                elif projection >= threshold:
                    bonus_status = "on_track"
                elif projection >= threshold * 0.7:
                    bonus_status = "at_risk"
                else:
                    bonus_status = "lost"

                bonuses.append(ConditionalBonusSchema(
                    laboratoire_id=ag.laboratoire_id,
                    laboratoire_nom=labo_nom,
                    bonus_label=f"Prime {stage_id} ({tranche_key})",
                    condition_type="annual_volume",
                    threshold=threshold,
                    current_value=round(float(ca_annuel), 2),
                    current_percentage=round(current_pct, 1),
                    projection_year_end=round(projection, 2),
                    bonus_rate=float(rate) if rate else 0,
                    estimated_bonus_amount=round(estimated, 2),
                    status=bonus_status,
                ))

                total_estimated += estimated

    return ConditionalBonusDashboardResponse(
        year=year,
        bonuses=bonuses,
        total_estimated=round(total_estimated, 2),
    )


# ============================================================================
# P2 — FORCE RECALCUL
# ============================================================================

@router.post("/invoices/{facture_labo_id}/force-recalcul", response_model=InvoiceRebateScheduleResponse)
async def force_recalcul(
    facture_labo_id: int,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Force le recalcul du calendrier de remises d'une facture.

    Supprime l'ancien schedule et en cree un nouveau avec l'accord actif.
    """
    facture = db.query(FactureLabo).filter(
        FactureLabo.id == facture_labo_id,
        FactureLabo.pharmacy_id == pharmacy_id,
    ).first()
    if not facture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture labo avec ID {facture_labo_id} non trouvee",
        )

    # Supprimer les schedules existants
    db.query(InvoiceRebateSchedule).filter(
        InvoiceRebateSchedule.facture_labo_id == facture_labo_id,
        InvoiceRebateSchedule.pharmacy_id == pharmacy_id,
    ).delete()
    db.flush()

    # Charger les lignes
    lignes = db.query(LigneFactureLabo).filter(
        LigneFactureLabo.facture_id == facture_labo_id,
    ).all()

    invoice_lines = [
        {
            "montant_ht": l.montant_ht or 0,
            "taux_tva": l.taux_tva or 0,
            "remise_pourcentage": l.remise_pct or 0,
        }
        for l in lignes
    ]

    try:
        engine = RebateEngine(db)
        schedule = engine.calculate_rebate_schedule(
            invoice_id=facture_labo_id,
            invoice_amount=facture.montant_net_ht or 0,
            invoice_date=facture.date_facture or date.today(),
            pharmacy_id=pharmacy_id,
            laboratoire_id=facture.laboratoire_id,
            invoice_lines=invoice_lines,
        )
    except NoActiveAgreementError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except InvalidConfigError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except RebateEngineError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    logger.info(f"Recalcul force pour facture {facture.numero_facture}: RFA={schedule.total_rfa_expected}EUR")
    return InvoiceRebateScheduleResponse.model_validate(schedule)


# ============================================================================
# P2 — STATISTIQUES GLOBALES
# ============================================================================

@router.get("/stats", response_model=RebateStatsResponse)
async def get_rebate_stats(
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db),
):
    """
    Statistiques globales du Rebate Engine pour la pharmacie.

    Retourne les totaux sur tous les accords et schedules.
    """
    # Accords
    total_agreements = db.query(func.count(LaboratoryAgreement.id)).filter(
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
    ).scalar() or 0

    agreements_actifs = db.query(func.count(LaboratoryAgreement.id)).filter(
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
        LaboratoryAgreement.statut == AgreementStatus.ACTIF,
    ).scalar() or 0

    # CA cumule
    ca_cumule = db.query(func.coalesce(func.sum(LaboratoryAgreement.ca_cumule), 0)).filter(
        LaboratoryAgreement.pharmacy_id == pharmacy_id,
        LaboratoryAgreement.statut == AgreementStatus.ACTIF,
    ).scalar() or 0

    # Schedules
    remises_prevues = db.query(func.coalesce(func.sum(InvoiceRebateSchedule.montant_prevu), 0)).filter(
        InvoiceRebateSchedule.pharmacy_id == pharmacy_id,
    ).scalar() or 0

    remises_recues = db.query(func.coalesce(func.sum(InvoiceRebateSchedule.montant_recu), 0)).filter(
        InvoiceRebateSchedule.pharmacy_id == pharmacy_id,
        InvoiceRebateSchedule.montant_recu.isnot(None),
    ).scalar() or 0

    ecart = round(float(remises_recues) - float(remises_prevues), 2) if remises_recues else 0

    # Echeances en retard
    echeances_retard = db.query(func.count(InvoiceRebateSchedule.id)).filter(
        InvoiceRebateSchedule.pharmacy_id == pharmacy_id,
        InvoiceRebateSchedule.statut == ScheduleStatus.PREVU,
        InvoiceRebateSchedule.date_echeance < date.today(),
    ).scalar() or 0

    return RebateStatsResponse(
        total_agreements=total_agreements,
        agreements_actifs=agreements_actifs,
        ca_cumule_total=round(float(ca_cumule), 2),
        remises_prevues_total=round(float(remises_prevues), 2),
        remises_recues_total=round(float(remises_recues), 2),
        ecart_total=ecart,
        echeances_en_retard=echeances_retard,
    )
