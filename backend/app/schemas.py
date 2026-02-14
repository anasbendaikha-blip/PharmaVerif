"""
PharmaVerif Backend - Schémas Pydantic
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/schemas/__init__.py
Tous les schémas de validation et sérialisation
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum

# ========================================
# ENUMS
# ========================================

class PlanPharmacie(str, Enum):
    """Plans d'abonnement pharmacie"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class UserRole(str, Enum):
    """Rôles utilisateur"""
    ADMIN = "admin"
    PHARMACIEN = "pharmacien"
    COMPTABLE = "comptable"
    LECTURE = "lecture"

class StatutFacture(str, Enum):
    """Statut de vérification d'une facture"""
    NON_VERIFIE = "non_verifie"
    CONFORME = "conforme"
    ANOMALIE = "anomalie"
    EN_COURS = "en_cours"

class TypeAnomalie(str, Enum):
    """Types d'anomalies détectées"""
    REMISE_MANQUANTE = "remise_manquante"
    REMISE_EXCESSIVE = "remise_excessive"
    ECART_CALCUL = "ecart_calcul"
    FRANCO_NON_RESPECTE = "franco_non_respecte"
    AUTRE = "autre"

# ========================================
# SCHEMAS PHARMACIE (TENANT)
# ========================================

class PharmacyBase(BaseModel):
    """Base pharmacie"""
    nom: str = Field(..., min_length=2, max_length=300)
    adresse: Optional[str] = Field(None, max_length=500)
    siret: Optional[str] = Field(None, max_length=14)
    titulaire: Optional[str] = Field(None, max_length=200)
    plan: PlanPharmacie = PlanPharmacie.FREE
    onboarding_completed: bool = False


class PharmacyCreate(PharmacyBase):
    """Creation d'une pharmacie (lors de l'inscription)"""
    pass


class PharmacyUpdate(BaseModel):
    """Mise a jour d'une pharmacie"""
    nom: Optional[str] = Field(None, min_length=2, max_length=300)
    adresse: Optional[str] = Field(None, max_length=500)
    siret: Optional[str] = Field(None, max_length=14)
    titulaire: Optional[str] = Field(None, max_length=200)
    plan: Optional[PlanPharmacie] = None
    onboarding_completed: Optional[bool] = None


class PharmacyResponse(PharmacyBase):
    """Reponse pharmacie"""
    id: int
    actif: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========================================
# SCHÉMAS UTILISATEUR
# ========================================

class UserBase(BaseModel):
    """Base utilisateur"""
    email: EmailStr
    nom: str = Field(..., min_length=2, max_length=100)
    prenom: str = Field(..., min_length=2, max_length=100)
    role: UserRole = UserRole.PHARMACIEN
    actif: bool = True

class UserCreate(UserBase):
    """Création d'utilisateur"""
    password: str = Field(..., min_length=8, max_length=100)
    pharmacy_id: Optional[int] = None

    @validator('password')
    def validate_password(cls, v):
        """Valider la force du mot de passe"""
        if not any(char.isdigit() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins un chiffre')
        if not any(char.isupper() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins une majuscule')
        return v

class UserUpdate(BaseModel):
    """Mise à jour utilisateur"""
    email: Optional[EmailStr] = None
    nom: Optional[str] = Field(None, min_length=2, max_length=100)
    prenom: Optional[str] = Field(None, min_length=2, max_length=100)
    role: Optional[UserRole] = None
    actif: Optional[bool] = None

class UserInDB(UserBase):
    """Utilisateur en base de données"""
    id: int
    hashed_password: str
    pharmacy_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserResponse(UserBase):
    """Réponse utilisateur (sans mot de passe)"""
    id: int
    pharmacy_id: Optional[int] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    pharmacy: Optional[PharmacyResponse] = None

    class Config:
        from_attributes = True

# ========================================
# SCHÉMAS AUTHENTIFICATION
# ========================================

class Token(BaseModel):
    """Token JWT"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    """Données du token"""
    user_id: Optional[int] = None
    email: Optional[str] = None
    pharmacy_id: Optional[int] = None

class LoginRequest(BaseModel):
    """Requête de connexion"""
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    """Réponse de connexion"""
    user: UserResponse
    token: Token

class ChangePasswordRequest(BaseModel):
    """Changement de mot de passe"""
    old_password: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_new_password(cls, v, values):
        """Valider le nouveau mot de passe"""
        if 'old_password' in values and v == values['old_password']:
            raise ValueError('Le nouveau mot de passe doit être différent')
        if not any(char.isdigit() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins un chiffre')
        if not any(char.isupper() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins une majuscule')
        return v


class RegisterWithPharmacyRequest(BaseModel):
    """Inscription d'un nouvel utilisateur avec creation de pharmacie"""
    # Utilisateur
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    nom: str = Field(..., min_length=2, max_length=100)
    prenom: str = Field(..., min_length=2, max_length=100)

    # Pharmacie
    pharmacy_nom: str = Field(..., min_length=2, max_length=300)
    pharmacy_adresse: Optional[str] = Field(None, max_length=500)
    pharmacy_siret: Optional[str] = Field(None, max_length=14)
    pharmacy_titulaire: Optional[str] = Field(None, max_length=200)

    @validator('password')
    def validate_password(cls, v):
        if not any(char.isdigit() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins un chiffre')
        if not any(char.isupper() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins une majuscule')
        return v


class RegisterWithPharmacyResponse(BaseModel):
    """Reponse inscription avec pharmacie"""
    user: UserResponse
    pharmacy: PharmacyResponse
    token: Token
    message: str = "Inscription reussie"


# ========================================
# SCHÉMAS GROSSISTE
# ========================================

class GrossisteBase(BaseModel):
    """Base grossiste"""
    nom: str = Field(..., min_length=2, max_length=200)
    remise_base: float = Field(..., ge=0, le=100, description="Remise de base en %")
    cooperation_commerciale: float = Field(..., ge=0, le=100, description="Coopération commerciale en %")
    escompte: float = Field(..., ge=0, le=100, description="Escompte en %")
    franco: float = Field(..., ge=0, description="Franco (port gratuit) en €")
    actif: bool = True

class GrossisteCreate(GrossisteBase):
    """Création de grossiste"""
    pass

class GrossisteUpdate(BaseModel):
    """Mise à jour grossiste"""
    nom: Optional[str] = Field(None, min_length=2, max_length=200)
    remise_base: Optional[float] = Field(None, ge=0, le=100)
    cooperation_commerciale: Optional[float] = Field(None, ge=0, le=100)
    escompte: Optional[float] = Field(None, ge=0, le=100)
    franco: Optional[float] = Field(None, ge=0)
    actif: Optional[bool] = None

class GrossisteResponse(GrossisteBase):
    """Réponse grossiste"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Champs calculés
    taux_remise_total: float = Field(description="Somme des remises")
    
    class Config:
        from_attributes = True

# ========================================
# SCHÉMAS FACTURE
# ========================================

class LigneFactureBase(BaseModel):
    """Ligne de facture"""
    produit: str = Field(..., min_length=2)
    cip: Optional[str] = None
    quantite: int = Field(..., gt=0)
    prix_unitaire: float = Field(..., ge=0)
    remise_appliquee: float = Field(default=0, ge=0, le=100)
    montant_ht: float = Field(..., ge=0)

class LigneFactureCreate(LigneFactureBase):
    """Création ligne de facture"""
    pass

class LigneFactureResponse(LigneFactureBase):
    """Réponse ligne de facture"""
    id: int
    facture_id: int
    
    class Config:
        from_attributes = True

class FactureBase(BaseModel):
    """Base facture"""
    numero: str = Field(..., min_length=1, max_length=100)
    date: datetime
    grossiste_id: int
    montant_brut_ht: float = Field(..., ge=0)
    remises_ligne_a_ligne: float = Field(default=0, ge=0)
    remises_pied_facture: float = Field(default=0, ge=0)
    net_a_payer: float = Field(..., ge=0)

class FactureCreate(FactureBase):
    """Création de facture"""
    lignes: List[LigneFactureCreate] = Field(default_factory=list)

class FactureUpdate(BaseModel):
    """Mise à jour facture"""
    numero: Optional[str] = Field(None, min_length=1, max_length=100)
    date: Optional[datetime] = None
    statut_verification: Optional[StatutFacture] = None
    montant_brut_ht: Optional[float] = Field(None, ge=0)
    remises_ligne_a_ligne: Optional[float] = Field(None, ge=0)
    remises_pied_facture: Optional[float] = Field(None, ge=0)
    net_a_payer: Optional[float] = Field(None, ge=0)

class FactureResponse(FactureBase):
    """Réponse facture"""
    id: int
    statut_verification: StatutFacture
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Relations
    grossiste: Optional[GrossisteResponse] = None
    lignes: List[LigneFactureResponse] = Field(default_factory=list)
    
    # Champs calculés
    total_remises: float = Field(description="Total des remises")
    taux_remise_effectif: float = Field(description="Taux de remise effectif en %")
    
    class Config:
        from_attributes = True

class FactureListResponse(BaseModel):
    """Liste de factures avec pagination"""
    factures: List[FactureResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

# ========================================
# SCHÉMAS ANOMALIE
# ========================================

class AnomalieBase(BaseModel):
    """Base anomalie"""
    facture_id: int
    type_anomalie: TypeAnomalie
    description: str = Field(..., min_length=10)
    montant_ecart: float = Field(..., description="Montant de l'écart en €")
    resolu: bool = False

class AnomalieCreate(AnomalieBase):
    """Création d'anomalie"""
    pass

class AnomalieUpdate(BaseModel):
    """Mise à jour anomalie"""
    resolu: bool
    note_resolution: Optional[str] = None

class AnomalieResponse(AnomalieBase):
    """Réponse anomalie"""
    id: int
    created_at: datetime
    resolu_at: Optional[datetime] = None
    note_resolution: Optional[str] = None
    
    # Relation
    facture: Optional[FactureResponse] = None
    
    class Config:
        from_attributes = True

class AnomalieListResponse(BaseModel):
    """Liste d'anomalies avec pagination"""
    anomalies: List[AnomalieResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

# ========================================
# SCHÉMAS UPLOAD
# ========================================

class UploadResponse(BaseModel):
    """Réponse upload de fichier"""
    success: bool
    filename: str
    file_id: str
    method: str = Field(description="Méthode de parsing utilisée")
    data: dict = Field(description="Données extraites")
    warnings: Optional[List[str]] = None

# ========================================
# SCHÉMAS VÉRIFICATION
# ========================================

class VerificationRequest(BaseModel):
    """Requête de vérification"""
    facture_id: int
    grossiste_id: int

class VerificationResponse(BaseModel):
    """Réponse de vérification"""
    facture: FactureResponse
    anomalies: List[AnomalieResponse]
    conforme: bool
    montant_recuperable: float
    recommandations: List[str]

# ========================================
# SCHÉMAS STATISTIQUES
# ========================================

class StatsGlobales(BaseModel):
    """Statistiques globales"""
    total_factures: int
    factures_conformes: int
    factures_avec_anomalies: int
    montant_total_ht: float
    montant_recuperable: float
    taux_conformite: float
    economie_potentielle: float

class StatsParGrossiste(BaseModel):
    """Statistiques par grossiste"""
    grossiste_id: int
    grossiste_nom: str
    nombre_factures: int
    montant_total: float
    anomalies_detectees: int
    montant_recuperable: float

class StatsPeriode(BaseModel):
    """Statistiques par période"""
    date: datetime
    nombre_factures: int
    montant_total: float
    anomalies: int

class StatsResponse(BaseModel):
    """Réponse complète des statistiques"""
    globales: StatsGlobales
    par_grossiste: List[StatsParGrossiste]
    evolution: List[StatsPeriode]

# ========================================
# SCHÉMAS GÉNÉRIQUES
# ========================================

class MessageResponse(BaseModel):
    """Réponse message simple"""
    message: str
    success: bool = True

class ErrorResponse(BaseModel):
    """Réponse d'erreur"""
    error: str
    message: str
    details: Optional[dict] = None

class PaginationParams(BaseModel):
    """Paramètres de pagination"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    
class FilterParams(BaseModel):
    """Paramètres de filtrage"""
    search: Optional[str] = None
    statut: Optional[StatutFacture] = None
    grossiste_id: Optional[int] = None
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None


# ========================================
# SCHEMAS REBATE ENGINE
# ========================================

class RebateType(str, Enum):
    """Type de remise"""
    RFA = "rfa"
    ESCOMPTE = "escompte"
    COOPERATION = "cooperation"
    GRATUITE = "gratuite"


class RebateFrequency(str, Enum):
    """Frequence de versement"""
    MENSUEL = "mensuel"
    TRIMESTRIEL = "trimestriel"
    SEMESTRIEL = "semestriel"
    ANNUEL = "annuel"


class AgreementStatus(str, Enum):
    """Statut d'un accord"""
    BROUILLON = "brouillon"
    ACTIF = "actif"
    SUSPENDU = "suspendu"
    EXPIRE = "expire"
    ARCHIVE = "archive"


class ScheduleStatus(str, Enum):
    """Statut d'une echeance"""
    PREVU = "prevu"
    EMIS = "emis"
    RECU = "recu"
    ECART = "ecart"
    ANNULE = "annule"


# --- Rebate Template ---

class RebateTierSchema(BaseModel):
    """Un palier de remise"""
    seuil_min: float = Field(..., ge=0)
    seuil_max: Optional[float] = Field(None, ge=0)
    taux: float = Field(..., ge=0, le=100)
    label: Optional[str] = None


class RebateTemplateBase(BaseModel):
    """Base template de remise"""
    nom: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    laboratoire_nom: str = Field(..., min_length=2, max_length=200)
    rebate_type: RebateType = RebateType.RFA
    frequence: RebateFrequency = RebateFrequency.ANNUEL
    tiers: List[RebateTierSchema] = Field(default_factory=list)
    taux_escompte: float = Field(default=0.0, ge=0, le=100)
    delai_escompte_jours: int = Field(default=30, ge=0)
    taux_cooperation: float = Field(default=0.0, ge=0, le=100)
    gratuites_ratio: Optional[str] = None
    gratuites_seuil_qte: int = Field(default=0, ge=0)
    actif: bool = True


class RebateTemplateCreate(RebateTemplateBase):
    """Creation d'un template"""
    pass


class RebateTemplateUpdate(BaseModel):
    """Mise a jour d'un template"""
    nom: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    laboratoire_nom: Optional[str] = Field(None, min_length=2, max_length=200)
    rebate_type: Optional[RebateType] = None
    frequence: Optional[RebateFrequency] = None
    tiers: Optional[List[RebateTierSchema]] = None
    taux_escompte: Optional[float] = Field(None, ge=0, le=100)
    delai_escompte_jours: Optional[int] = Field(None, ge=0)
    taux_cooperation: Optional[float] = Field(None, ge=0, le=100)
    gratuites_ratio: Optional[str] = None
    gratuites_seuil_qte: Optional[int] = Field(None, ge=0)
    actif: Optional[bool] = None


class RebateTemplateResponse(RebateTemplateBase):
    """Reponse template"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Laboratory Agreement ---

class LaboratoryAgreementBase(BaseModel):
    """Base accord laboratoire"""
    nom: str = Field(..., min_length=2, max_length=200)
    template_id: Optional[int] = None
    laboratoire_id: int
    reference_externe: Optional[str] = Field(None, max_length=100)
    date_debut: str  # ISO date string (YYYY-MM-DD)
    date_fin: Optional[str] = None
    statut: AgreementStatus = AgreementStatus.BROUILLON
    custom_tiers: Optional[List[RebateTierSchema]] = None
    taux_escompte: Optional[float] = Field(None, ge=0, le=100)
    taux_cooperation: Optional[float] = Field(None, ge=0, le=100)
    gratuites_ratio: Optional[str] = None
    objectif_ca_annuel: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class LaboratoryAgreementCreate(LaboratoryAgreementBase):
    """Creation d'un accord"""
    pass


class LaboratoryAgreementUpdate(BaseModel):
    """Mise a jour d'un accord"""
    nom: Optional[str] = Field(None, min_length=2, max_length=200)
    template_id: Optional[int] = None
    reference_externe: Optional[str] = Field(None, max_length=100)
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None
    statut: Optional[AgreementStatus] = None
    custom_tiers: Optional[List[RebateTierSchema]] = None
    taux_escompte: Optional[float] = Field(None, ge=0, le=100)
    taux_cooperation: Optional[float] = Field(None, ge=0, le=100)
    gratuites_ratio: Optional[str] = None
    objectif_ca_annuel: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


class LaboratoryAgreementResponse(BaseModel):
    """Reponse accord laboratoire"""
    id: int
    nom: str
    template_id: Optional[int] = None
    laboratoire_id: int
    pharmacy_id: int
    reference_externe: Optional[str] = None
    date_debut: str
    date_fin: Optional[str] = None
    statut: AgreementStatus
    custom_tiers: Optional[List[RebateTierSchema]] = None
    taux_escompte: Optional[float] = None
    taux_cooperation: Optional[float] = None
    gratuites_ratio: Optional[str] = None
    objectif_ca_annuel: Optional[float] = None
    ca_cumule: float = 0.0
    remise_cumulee: float = 0.0
    avancement_pct: float = 0.0
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LaboratoryAgreementListResponse(BaseModel):
    """Liste d'accords avec pagination"""
    agreements: List[LaboratoryAgreementResponse]
    total: int


# --- Invoice Rebate Schedule ---

class InvoiceRebateScheduleBase(BaseModel):
    """Base echeancier de remise"""
    agreement_id: int
    facture_labo_id: Optional[int] = None
    rebate_type: RebateType
    montant_base_ht: float = Field(..., ge=0)
    taux_applique: float = Field(..., ge=0, le=100)
    montant_prevu: float = Field(..., ge=0)
    date_echeance: str  # ISO date (YYYY-MM-DD)


class InvoiceRebateScheduleCreate(InvoiceRebateScheduleBase):
    """Creation d'une echeance"""
    pass


class InvoiceRebateScheduleUpdate(BaseModel):
    """Mise a jour (rapprochement avoir)"""
    montant_recu: Optional[float] = None
    date_reception: Optional[str] = None
    statut: Optional[ScheduleStatus] = None
    reference_avoir: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class InvoiceRebateScheduleResponse(BaseModel):
    """Reponse echeancier"""
    id: int
    agreement_id: int
    facture_labo_id: Optional[int] = None
    pharmacy_id: int
    rebate_type: RebateType
    montant_base_ht: float
    taux_applique: float
    montant_prevu: float
    montant_recu: Optional[float] = None
    ecart: Optional[float] = None
    date_echeance: str
    date_reception: Optional[str] = None
    statut: ScheduleStatus
    reference_avoir: Optional[str] = None
    notes: Optional[str] = None
    en_retard: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Audit Log ---

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

    class Config:
        from_attributes = True


# --- Stats Rebate ---

class RebateStatsResponse(BaseModel):
    """Statistiques globales du Rebate Engine"""
    total_agreements: int = 0
    agreements_actifs: int = 0
    ca_cumule_total: float = 0.0
    remises_prevues_total: float = 0.0
    remises_recues_total: float = 0.0
    ecart_total: float = 0.0
    echeances_en_retard: int = 0
