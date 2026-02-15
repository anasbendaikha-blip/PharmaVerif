"""
PharmaVerif Backend - Rebate Engine Schemas
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/schemas_rebate.py
Validation Pydantic stricte pour toutes les entrees/sorties du Rebate Engine.

Principe cle : JAMAIS faire confiance au JSON brut.
Chaque taux, seuil, date est valide cote serveur avant persistance.
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import (
    BaseModel, Field, field_validator, model_validator,
    ConfigDict,
)


# ============================================================================
# ENUMS pour l'API
# ============================================================================

class TemplateTypeEnum(str, Enum):
    STAGED = "staged"
    VOLUME_BASED = "volume_based"
    CONDITIONAL = "conditional"


class AgreementStatusEnum(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRED = "expired"
    SUPERSEDED = "superseded"
    # Mapping vers les enums du modele SQLAlchemy
    BROUILLON = "brouillon"
    ACTIF = "actif"
    SUSPENDU = "suspendu"
    EXPIRE = "expire"
    ARCHIVE = "archive"


class TemplateScopeEnum(str, Enum):
    SYSTEM = "system"
    GROUP = "group"
    PHARMACY = "pharmacy"


# ============================================================================
# SCHEMAS : Structure d'une etape de template
# ============================================================================

class StageConditionSchema(BaseModel):
    """Condition pour une etape conditionnelle (prime annuelle, etc.)"""
    type: str = Field(
        ...,
        description="Type de condition : annual_volume, payment_punctuality, product_mix",
    )
    operator: str = Field(default=">=")
    threshold_field: str = Field(
        default="total_purchases",
        description="Champ a evaluer",
    )
    unit: str = Field(default="euros")

    @field_validator("type")
    @classmethod
    def validate_condition_type(cls, v):
        allowed = {"annual_volume", "payment_punctuality", "product_mix"}
        if v not in allowed:
            raise ValueError(f"Type de condition invalide '{v}'. Valeurs possibles : {allowed}")
        return v


class TemplateStageSchema(BaseModel):
    """
    Definition d'une etape dans un template de remise.
    Le template definit la STRUCTURE, pas les taux.
    """
    stage_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Identifiant unique de l'etape (ex: 'immediate', 'm1_rebate')",
    )
    label: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Libelle lisible (ex: 'Remise sur facture')",
    )
    delay_months: int = Field(
        ...,
        ge=0,
        le=24,
        description="Delai en mois apres la date facture",
    )
    rate_type: str = Field(
        ...,
        description="Type de calcul du taux",
    )
    is_cumulative: bool = Field(default=True)
    payment_method: str = Field(
        ...,
        description="Methode de paiement : invoice_deduction, emac_transfer, year_end_transfer, credit_note",
    )
    fields: List[str] = Field(
        ...,
        min_length=1,
        description="Champs a remplir par le pharmacien (ex: ['rate'] ou ['incremental_rate', 'cumulative_rate'])",
    )
    conditions: Optional[List[StageConditionSchema]] = None
    order: Optional[int] = None

    @field_validator("rate_type")
    @classmethod
    def validate_rate_type(cls, v):
        allowed = {"percentage", "incremental_percentage", "conditional_percentage"}
        if v not in allowed:
            raise ValueError(f"rate_type invalide '{v}'. Valeurs possibles : {allowed}")
        return v

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v):
        allowed = {"invoice_deduction", "emac_transfer", "year_end_transfer", "credit_note"}
        if v not in allowed:
            raise ValueError(f"payment_method invalide '{v}'. Valeurs possibles : {allowed}")
        return v


class TemplateStructureSchema(BaseModel):
    """
    Structure complete d'un template de remise.
    Valide AVANT persistance en JSONB.
    """
    type: str = Field(...)
    description: Optional[str] = None
    stages: List[TemplateStageSchema] = Field(
        ...,
        min_length=1,
        max_length=8,
        description="Liste des etapes (1 a 8 max)",
    )
    tranches: List[str] = Field(
        default=["A", "B"],
        description="Tranches supportees",
    )
    supports_otc: bool = Field(
        default=False,
        description="Supporte les produits OTC (hors generique)",
    )

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        allowed = {"staged_rebate", "volume_based_rebate", "conditional_rebate"}
        if v not in allowed:
            raise ValueError(f"type invalide '{v}'. Valeurs possibles : {allowed}")
        return v

    @field_validator("stages")
    @classmethod
    def validate_unique_stage_ids(cls, v):
        ids = [s.stage_id for s in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Les stage_id doivent etre uniques dans le template")
        return v

    @field_validator("stages")
    @classmethod
    def validate_stage_order(cls, v):
        """Les delais doivent etre croissants"""
        delays = [s.delay_months for s in v]
        for i in range(1, len(delays)):
            if delays[i] < delays[i - 1]:
                raise ValueError(
                    f"Les delais doivent etre croissants : "
                    f"etape {v[i].stage_id} ({delays[i]} mois) < "
                    f"etape {v[i-1].stage_id} ({delays[i-1]} mois)"
                )
        return v


# ============================================================================
# SCHEMAS : Configuration d'un accord (taux par tranche)
# ============================================================================

class StageConfigSchema(BaseModel):
    """Configuration d'une etape avec les taux reels du pharmacien"""
    rate: Optional[float] = Field(None, ge=0, le=1, description="Taux simple (0-100%)")
    incremental_rate: Optional[float] = Field(None, ge=0, le=1, description="Taux additionnel")
    cumulative_rate: Optional[float] = Field(None, ge=0, le=1, description="Taux cumule (calcule/verifie)")
    condition_threshold: Optional[float] = Field(None, ge=0, description="Seuil de condition (EUR ou %)")


class TrancheConfigSchema(BaseModel):
    """Configuration complete d'une tranche (A ou B)"""
    max_rebate: float = Field(
        ...,
        ge=0,
        le=1,
        description="Plafond RFA pour cette tranche (ex: 0.57 = 57%)",
    )
    classification_criteria: dict = Field(
        ...,
        description="Criteres de classification des produits dans cette tranche",
    )
    stages: Dict[str, StageConfigSchema] = Field(
        ...,
        description="Configuration par etape (cle = stage_id)",
    )

    @model_validator(mode="after")
    def validate_cumulative_not_exceeds_max(self):
        """Verifie que le cumul ne depasse pas le plafond"""
        max_cumul = 0
        for stage_id, config in self.stages.items():
            if config.cumulative_rate is not None:
                max_cumul = max(max_cumul, config.cumulative_rate)
            elif config.rate is not None:
                max_cumul = max(max_cumul, config.rate)
        if max_cumul > self.max_rebate + 0.001:  # Tolerance flottant
            raise ValueError(
                f"Le taux cumule maximum ({max_cumul:.1%}) "
                f"depasse le plafond RFA ({self.max_rebate:.1%})"
            )
        return self


class AgreementConfigSchema(BaseModel):
    """
    Configuration complete d'un accord commercial.
    Valide AVANT persistance en JSONB.
    """
    template_id: Optional[str] = None
    tranche_configurations: Dict[str, TrancheConfigSchema] = Field(
        ...,
        min_length=1,
        description="Configuration par tranche (cle = 'tranche_A', 'tranche_B', etc.)",
    )

    @field_validator("tranche_configurations")
    @classmethod
    def validate_tranche_names(cls, v):
        """Les cles doivent etre des noms de tranche valides"""
        for key in v:
            if not key.startswith("tranche_"):
                raise ValueError(
                    f"Nom de tranche invalide '{key}'. "
                    f"Doit commencer par 'tranche_' (ex: 'tranche_A')"
                )
        return v


# ============================================================================
# SCHEMAS : Requetes API (Create / Update)
# ============================================================================

class RebateTemplateCreateRequest(BaseModel):
    """Creation d'un nouveau template"""
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    template_type: TemplateTypeEnum = TemplateTypeEnum.STAGED
    laboratoire_nom: str = Field(..., min_length=2, max_length=200)
    structure: TemplateStructureSchema
    tiers: Optional[List[dict]] = Field(default_factory=list)
    taux_escompte: float = Field(default=0.0, ge=0, le=100)
    delai_escompte_jours: int = Field(default=30, ge=0)
    taux_cooperation: float = Field(default=0.0, ge=0, le=100)
    gratuites_ratio: Optional[str] = None
    gratuites_seuil_qte: int = Field(default=0, ge=0)
    scope: TemplateScopeEnum = TemplateScopeEnum.SYSTEM

    model_config = ConfigDict(from_attributes=True)


class RebateTemplateUpdateRequest(BaseModel):
    """Modification d'un template (cree nouvelle version)"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    structure: Optional[TemplateStructureSchema] = None
    tiers: Optional[List[dict]] = None
    taux_escompte: Optional[float] = Field(None, ge=0, le=100)
    taux_cooperation: Optional[float] = Field(None, ge=0, le=100)
    actif: Optional[bool] = None


class LaboratoryAgreementCreateRequest(BaseModel):
    """Creation d'un nouvel accord commercial"""
    laboratoire_id: int = Field(..., gt=0)
    template_id: int = Field(..., gt=0)
    nom: str = Field(..., min_length=2, max_length=200)
    agreement_config: Optional[AgreementConfigSchema] = None
    custom_tiers: Optional[List[dict]] = None
    taux_escompte: Optional[float] = Field(None, ge=0, le=100)
    taux_cooperation: Optional[float] = Field(None, ge=0, le=100)
    gratuites_ratio: Optional[str] = None
    objectif_ca_annuel: Optional[float] = Field(None, ge=0)
    date_debut: date
    date_fin: Optional[date] = None
    reference_externe: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    activate: bool = Field(
        default=False,
        description="Si True, active l'accord immediatement (sinon = brouillon)",
    )

    @model_validator(mode="after")
    def validate_dates(self):
        if self.date_fin and self.date_fin < self.date_debut:
            raise ValueError("date_fin doit etre apres date_debut")
        return self


class LaboratoryAgreementUpdateRequest(BaseModel):
    """
    Modification d'un accord existant.
    Si l'accord est actif → cree une nouvelle version automatiquement.
    """
    agreement_config: Optional[AgreementConfigSchema] = None
    custom_tiers: Optional[List[dict]] = None
    taux_escompte: Optional[float] = Field(None, ge=0, le=100)
    taux_cooperation: Optional[float] = Field(None, ge=0, le=100)
    gratuites_ratio: Optional[str] = None
    objectif_ca_annuel: Optional[float] = Field(None, ge=0)
    date_fin: Optional[date] = None
    reference_externe: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    reason: Optional[str] = Field(
        None,
        max_length=500,
        description="Raison de la modification (audit trail)",
    )


# ============================================================================
# SCHEMAS : Reponses API
# ============================================================================

class RebateTemplateResponse(BaseModel):
    """Reponse API pour un template"""
    id: int
    nom: str
    description: Optional[str] = None
    laboratoire_nom: str
    rebate_type: str
    frequence: str
    tiers: List[dict] = Field(default_factory=list)
    structure: Optional[dict] = None
    taux_escompte: float = 0.0
    delai_escompte_jours: int = 30
    taux_cooperation: float = 0.0
    gratuites_ratio: Optional[str] = None
    gratuites_seuil_qte: int = 0
    version: int = 1
    scope: str = "system"
    actif: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Compteur d'utilisation
    active_agreements_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class LaboratoryAgreementResponse(BaseModel):
    """Reponse API pour un accord commercial"""
    id: int
    pharmacy_id: int
    laboratoire_id: int
    laboratoire_nom: Optional[str] = None
    template_id: Optional[int] = None
    template_nom: Optional[str] = None
    template_version: int = 1
    nom: str
    agreement_config: Optional[dict] = None
    custom_tiers: Optional[List[dict]] = None
    taux_escompte: Optional[float] = None
    taux_cooperation: Optional[float] = None
    gratuites_ratio: Optional[str] = None
    objectif_ca_annuel: Optional[float] = None
    ca_cumule: float = 0.0
    remise_cumulee: float = 0.0
    avancement_pct: float = 0.0
    date_debut: date
    date_fin: Optional[date] = None
    reference_externe: Optional[str] = None
    version: int = 1
    previous_version_id: Optional[int] = None
    statut: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AgreementVersionHistoryItem(BaseModel):
    """Un element dans l'historique des versions"""
    version: int
    statut: str
    date_debut: date
    date_fin: Optional[date] = None
    created_at: datetime
    created_by: Optional[int] = None
    invoices_count: int = 0
    summary_changes: Optional[str] = None


class AgreementVersionHistoryResponse(BaseModel):
    """Historique complet des versions d'un accord"""
    laboratoire_nom: str
    current_version: int
    versions: List[AgreementVersionHistoryItem]


# ============================================================================
# SCHEMAS : Calendrier de remises (Schedule)
# ============================================================================

class ConditionProgressSchema(BaseModel):
    """Progression d'une condition (pour affichage UI)"""
    type: str
    threshold: float
    current_value: float
    current_percentage: float
    projection_year_end: Optional[float] = None
    is_likely_met: Optional[bool] = None
    confidence: Optional[str] = None  # "low", "medium", "high"


class RebateEntrySchema(BaseModel):
    """Une etape du calendrier de remises"""
    stage_id: str
    stage_label: str
    stage_order: int
    # Ventilation par tranche
    tranche_A_amount: float = 0.0
    tranche_B_amount: float = 0.0
    total_amount: float = 0.0
    # Taux
    rate: Optional[float] = None
    incremental_rate: Optional[float] = None
    cumulative_amount: float = 0.0
    cumulative_rate: float = 0.0
    # Echeance
    expected_date: str  # ISO format
    payment_method: str
    status: str
    is_conditional: bool = False
    condition: Optional[ConditionProgressSchema] = None
    # Reconciliation v1.1
    actual_amount: Optional[float] = None
    received_date: Optional[str] = None
    variance: Optional[float] = None
    reconciliation_status: str = "not_reconciled"


class InvoiceRebateScheduleResponse(BaseModel):
    """Reponse complete du calendrier de remises pour une facture"""
    id: int
    facture_labo_id: Optional[int] = None
    agreement_id: int
    pharmacy_id: int
    invoice_amount: Optional[float] = None
    invoice_date: Optional[str] = None
    tranche_type: Optional[str] = None
    tranche_breakdown: Optional[dict] = None
    laboratoire_nom: Optional[str] = None
    agreement_version: int = 1
    rebate_entries: Optional[dict] = None
    total_rfa_expected: float = 0.0
    total_rfa_percentage: float = 0.0
    statut: str = "prevu"
    montant_recu: Optional[float] = None
    ecart: Optional[float] = None
    date_echeance: date
    date_reception: Optional[date] = None
    reference_avoir: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS : Dashboard
# ============================================================================

class MonthlyRebateByLabSchema(BaseModel):
    """Remises attendues pour un labo sur un mois donne"""
    laboratoire_id: int
    laboratoire_nom: str
    stage_label: str
    invoices_count: int
    total_expected: float
    deadline_date: Optional[str] = None
    status: str  # "on_time", "late", "received"
    days_remaining: Optional[int] = None


class MonthlyRebateDashboardResponse(BaseModel):
    """Dashboard mensuel des remises"""
    month: str  # "2025-03"
    laboratories: List[MonthlyRebateByLabSchema]
    total_expected: float
    # Projections
    next_month_projection: Optional[float] = None
    next_2_months_projection: Optional[float] = None


class ConditionalBonusSchema(BaseModel):
    """Suivi d'une prime conditionnelle"""
    laboratoire_id: int
    laboratoire_nom: str
    bonus_label: str
    condition_type: str
    threshold: float
    current_value: float
    current_percentage: float
    projection_year_end: Optional[float] = None
    bonus_rate: float
    estimated_bonus_amount: float
    status: str  # "on_track", "at_risk", "lost", "achieved"
    invoices_contributing: Optional[int] = None


class ConditionalBonusDashboardResponse(BaseModel):
    """Dashboard des primes conditionnelles"""
    year: int
    bonuses: List[ConditionalBonusSchema]
    total_estimated: float


# ============================================================================
# SCHEMAS : Previsualisation (calcul preview avant enregistrement)
# ============================================================================

class PreviewRequest(BaseModel):
    """Demande de previsualisation d'un accord"""
    template_id: int
    agreement_config: AgreementConfigSchema
    simulation_amount: float = Field(
        default=10000.0,
        gt=0,
        description="Montant HT simule pour la previsualisation",
    )
    simulation_tranche: str = Field(
        default="tranche_B",
        description="Tranche a simuler",
    )


class PreviewResponse(BaseModel):
    """Resultat de la previsualisation"""
    entries: List[RebateEntrySchema]
    total_rfa: float
    total_rfa_percentage: float
    tranche_breakdown: Optional[dict] = None
    validations: List[dict]  # Messages de validation (erreurs, warnings, OK)


# ============================================================================
# SCHEMAS : Audit Log
# ============================================================================

class AgreementAuditLogResponse(BaseModel):
    """Reponse journal d'audit"""
    id: int
    agreement_id: int
    user_id: int
    action: str
    ancien_etat: Optional[dict] = None
    nouvel_etat: Optional[dict] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# SCHEMAS : Stats Rebate
# ============================================================================

class RebateStatsResponse(BaseModel):
    """Statistiques globales du Rebate Engine"""
    total_agreements: int = 0
    agreements_actifs: int = 0
    ca_cumule_total: float = 0.0
    remises_prevues_total: float = 0.0
    remises_recues_total: float = 0.0
    ecart_total: float = 0.0
    echeances_en_retard: int = 0


# ============================================================================
# SCHEMAS : Dashboard Remontees M0/M+1
# ============================================================================

class RemonteeEntrySchema(BaseModel):
    """Une echeance de remontee (M0, M+1, M+2, etc.)"""
    schedule_id: int
    facture_numero: Optional[str] = None
    facture_date: Optional[str] = None
    laboratoire_nom: str
    stage_id: str
    stage_label: str
    payment_method: str
    total_amount: float
    tranche_A_amount: float = 0.0
    tranche_B_amount: float = 0.0
    expected_date: Optional[str] = None
    status: str
    is_conditional: bool = False


class RemonteesSummaryResponse(BaseModel):
    """Resume agrege de toutes les remontees M0/M+1/M+2"""
    total_m0_received: float = 0.0
    total_m1_pending: float = 0.0
    total_m1_received: float = 0.0
    total_m2_pending: float = 0.0
    total_conditional: float = 0.0
    upcoming_remontees: List[RemonteeEntrySchema] = []
    late_remontees: List[RemonteeEntrySchema] = []
    count_pending: int = 0
    count_late: int = 0
    count_received: int = 0
