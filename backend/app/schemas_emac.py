"""
PharmaVerif Backend - Schemas Pydantic EMAC
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/schemas_emac.py
Schemas de validation et serialisation pour les EMAC
(Etats Mensuels des Avantages Commerciaux)
"""

from datetime import datetime, date
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from enum import Enum


# ========================================
# ENUMS
# ========================================

class TypePeriodeEMAC(str, Enum):
    """Type de periode couverte par l'EMAC"""
    MENSUEL = "mensuel"
    TRIMESTRIEL = "trimestriel"
    SEMESTRIEL = "semestriel"
    ANNUEL = "annuel"


class FormatSourceEMAC(str, Enum):
    """Format source du document EMAC"""
    EXCEL = "excel"
    CSV = "csv"
    PDF = "pdf"
    MANUEL = "manuel"


class StatutVerificationEMAC(str, Enum):
    """Statut de verification de l'EMAC"""
    NON_VERIFIE = "non_verifie"
    EN_COURS = "en_cours"
    CONFORME = "conforme"
    ECART_DETECTE = "ecart_detecte"
    ANOMALIE = "anomalie"


class TypeAnomalieEMAC(str, Enum):
    """Types d'anomalies EMAC"""
    ECART_CA = "ecart_ca"
    ECART_RFA = "ecart_rfa"
    ECART_COP = "ecart_cop"
    EMAC_MANQUANT = "emac_manquant"
    MONTANT_NON_VERSE = "montant_non_verse"
    CONDITION_NON_APPLIQUEE = "condition_non_appliquee"
    CALCUL_INCOHERENT = "calcul_incoherent"


class SeveriteAnomalieEMAC(str, Enum):
    """Severite d'une anomalie EMAC"""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


# ========================================
# SCHEMAS EMAC - CREATION
# ========================================

class EMACCreateManuel(BaseModel):
    """Schema pour la saisie manuelle d'un EMAC"""
    laboratoire_id: int = Field(..., description="ID du laboratoire")
    reference: Optional[str] = Field(None, max_length=200, description="Reference du document EMAC")

    # Periode
    periode_debut: date = Field(..., description="Debut de la periode couverte")
    periode_fin: date = Field(..., description="Fin de la periode couverte")
    type_periode: TypePeriodeEMAC = Field(default=TypePeriodeEMAC.MENSUEL, description="Type de periode")

    # Montants declares
    ca_declare: float = Field(default=0.0, ge=0, description="CA declare par le laboratoire")
    rfa_declaree: float = Field(default=0.0, ge=0, description="RFA declaree")
    cop_declaree: float = Field(default=0.0, ge=0, description="COP declaree")
    remises_differees_declarees: float = Field(default=0.0, ge=0, description="Remises differees declarees")
    autres_avantages: float = Field(default=0.0, ge=0, description="Autres avantages")

    # Total
    total_avantages_declares: Optional[float] = Field(None, ge=0, description="Total avantages (auto-calcule si non fourni)")

    # Paiement
    montant_deja_verse: float = Field(default=0.0, ge=0, description="Montant deja verse")
    solde_a_percevoir: Optional[float] = Field(None, ge=0, description="Solde a percevoir (auto-calcule si non fourni)")
    mode_reglement: Optional[str] = Field(None, max_length=100, description="Mode de reglement")

    # Notes
    notes: Optional[str] = Field(None, description="Notes supplementaires")


class EMACUpdate(BaseModel):
    """Schema pour la mise a jour d'un EMAC"""
    reference: Optional[str] = Field(None, max_length=200)
    periode_debut: Optional[date] = None
    periode_fin: Optional[date] = None
    type_periode: Optional[TypePeriodeEMAC] = None

    ca_declare: Optional[float] = Field(None, ge=0)
    rfa_declaree: Optional[float] = Field(None, ge=0)
    cop_declaree: Optional[float] = Field(None, ge=0)
    remises_differees_declarees: Optional[float] = Field(None, ge=0)
    autres_avantages: Optional[float] = Field(None, ge=0)
    total_avantages_declares: Optional[float] = Field(None, ge=0)

    montant_deja_verse: Optional[float] = Field(None, ge=0)
    solde_a_percevoir: Optional[float] = Field(None, ge=0)
    mode_reglement: Optional[str] = Field(None, max_length=100)

    notes: Optional[str] = None


# ========================================
# SCHEMAS EMAC - REPONSE
# ========================================

class AnomalieEMACResponse(BaseModel):
    """Reponse anomalie EMAC"""
    id: int
    emac_id: int
    type_anomalie: TypeAnomalieEMAC
    severite: SeveriteAnomalieEMAC
    description: str
    montant_ecart: float = 0.0
    valeur_declaree: Optional[float] = None
    valeur_calculee: Optional[float] = None
    action_suggeree: Optional[str] = None
    resolu: bool = False
    resolu_at: Optional[datetime] = None
    note_resolution: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnomalieEMACUpdate(BaseModel):
    """Mise a jour d'une anomalie EMAC (resolution)"""
    resolu: bool = Field(..., description="Anomalie resolue ou non")
    note_resolution: Optional[str] = Field(None, description="Note de resolution")


class LaboratoireInfoResponse(BaseModel):
    """Info laboratoire embarquee dans la reponse EMAC"""
    id: int
    nom: str
    type: str
    actif: bool

    class Config:
        from_attributes = True


class EMACResponse(BaseModel):
    """Reponse complete d'un EMAC"""
    id: int

    # Cles
    user_id: int
    laboratoire_id: int

    # Identification
    reference: Optional[str] = None

    # Periode
    periode_debut: date
    periode_fin: date
    type_periode: str = "mensuel"

    # Source
    fichier_original: Optional[str] = None
    format_source: str = "manuel"

    # Montants declares
    ca_declare: float = 0.0
    rfa_declaree: float = 0.0
    cop_declaree: float = 0.0
    remises_differees_declarees: float = 0.0
    autres_avantages: float = 0.0
    total_avantages_declares: float = 0.0

    # Paiement
    montant_deja_verse: float = 0.0
    solde_a_percevoir: float = 0.0
    mode_reglement: Optional[str] = None

    # Detail JSON
    detail_avantages: Optional[Any] = None

    # Verification
    statut_verification: str = "non_verifie"
    ca_reel_calcule: Optional[float] = None
    ecart_ca: Optional[float] = None
    ecart_ca_pct: Optional[float] = None
    rfa_attendue_calculee: Optional[float] = None
    ecart_rfa: Optional[float] = None
    cop_attendue_calculee: Optional[float] = None
    ecart_cop: Optional[float] = None
    total_avantages_calcule: Optional[float] = None
    ecart_total_avantages: Optional[float] = None
    montant_recouvrable: float = 0.0
    nb_factures_matched: int = 0
    nb_anomalies: int = 0
    anomalies_resume: Optional[Any] = None

    # Notes
    notes: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None

    # Relations
    laboratoire: Optional[LaboratoireInfoResponse] = None
    anomalies_emac: List[AnomalieEMACResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class EMACListResponse(BaseModel):
    """Liste des EMAC avec pagination"""
    emacs: List[EMACResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ========================================
# SCHEMAS VERIFICATION EMAC
# ========================================

class TriangleVerificationItem(BaseModel):
    """Un element du triangle de verification"""
    label: str = Field(description="Libelle de la ligne")
    valeur_emac: float = Field(description="Valeur declaree dans l'EMAC")
    valeur_factures: Optional[float] = Field(None, description="Valeur calculee des factures")
    valeur_conditions: Optional[float] = Field(None, description="Valeur attendue des conditions")
    ecart_emac_factures: Optional[float] = Field(None, description="Ecart EMAC vs factures")
    ecart_emac_conditions: Optional[float] = Field(None, description="Ecart EMAC vs conditions")
    ecart_pct: Optional[float] = Field(None, description="Ecart en %")
    conforme: bool = Field(default=True, description="Conforme (ecart < seuil)")


class TriangleVerificationResponse(BaseModel):
    """Reponse complete du triangle de verification"""
    emac_id: int
    laboratoire_id: int
    laboratoire_nom: str
    periode: str = Field(description="Periode couverte (ex: janvier 2026)")

    # Lignes du triangle
    lignes: List[TriangleVerificationItem] = Field(default_factory=list)

    # Synthese
    nb_conformes: int = 0
    nb_ecarts: int = 0
    nb_anomalies: int = 0
    montant_total_ecart: float = 0.0
    montant_recouvrable: float = 0.0

    # Anomalies
    anomalies: List[AnomalieEMACResponse] = Field(default_factory=list)

    # Statut
    statut: StatutVerificationEMAC = StatutVerificationEMAC.NON_VERIFIE
    message: str = ""


class EMACManquantResponse(BaseModel):
    """EMAC manquant detecte"""
    laboratoire_id: int
    laboratoire_nom: str
    periode_debut: date
    periode_fin: date
    type_periode: str
    nb_factures_periode: int = 0
    ca_periode: float = 0.0
    message: str


class EMACManquantsListResponse(BaseModel):
    """Liste des EMAC manquants"""
    manquants: List[EMACManquantResponse] = Field(default_factory=list)
    total: int = 0


# ========================================
# SCHEMAS UPLOAD EMAC
# ========================================

class UploadEMACResponse(BaseModel):
    """Reponse apres upload et parsing d'un fichier EMAC"""
    success: bool
    message: str
    emac: Optional[EMACResponse] = None
    verification: Optional[TriangleVerificationResponse] = None
    warnings: Optional[List[str]] = None


# ========================================
# SCHEMAS DASHBOARD EMAC
# ========================================

class EMACDashboardStats(BaseModel):
    """Statistiques EMAC pour le dashboard"""
    total_emacs: int = 0
    emacs_non_verifies: int = 0
    emacs_conformes: int = 0
    emacs_ecart: int = 0
    total_avantages_declares: float = 0.0
    total_montant_recouvrable: float = 0.0
    total_solde_a_percevoir: float = 0.0
    nb_emacs_manquants: int = 0


# ========================================
# SCHEMAS GENERIQUES
# ========================================

class MessageResponse(BaseModel):
    """Reponse message simple"""
    message: str
    success: bool = True


# ========================================
# EXPORT
# ========================================

__all__ = [
    "TypePeriodeEMAC",
    "FormatSourceEMAC",
    "StatutVerificationEMAC",
    "TypeAnomalieEMAC",
    "SeveriteAnomalieEMAC",
    "EMACCreateManuel",
    "EMACUpdate",
    "AnomalieEMACResponse",
    "AnomalieEMACUpdate",
    "LaboratoireInfoResponse",
    "EMACResponse",
    "EMACListResponse",
    "TriangleVerificationItem",
    "TriangleVerificationResponse",
    "EMACManquantResponse",
    "EMACManquantsListResponse",
    "UploadEMACResponse",
    "EMACDashboardStats",
    "MessageResponse",
]
