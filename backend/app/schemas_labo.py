"""
PharmaVerif Backend - Schemas Pydantic Factures Laboratoires
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/schemas/schemas_labo.py
Schemas de validation et serialisation pour les factures laboratoires
"""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


# ========================================
# ENUMS
# ========================================

class StatutFactureLabo(str, Enum):
    """Statut de verification d'une facture laboratoire"""
    NON_VERIFIE = "non_verifie"
    ANALYSEE = "analysee"
    CONFORME = "conforme"
    ECART_RFA = "ecart_rfa"


class TypeLaboratoire(str, Enum):
    """Types de laboratoires"""
    GENERIQUEUR_PRINCIPAL = "generiqueur_principal"
    GENERIQUEUR_SECONDAIRE = "generiqueur_secondaire"
    PRINCEPS = "princeps"
    AUTRE = "autre"


class TrancheLigne(str, Enum):
    """Tranche de classification d'une ligne"""
    A = "A"
    B = "B"
    OTC = "OTC"


class CategorieLigne(str, Enum):
    """Categorie de classification d'une ligne"""
    REMBOURSABLE_STANDARD = "REMBOURSABLE_STANDARD"
    REMBOURSABLE_FAIBLE_MARGE = "REMBOURSABLE_FAIBLE_MARGE"
    NON_REMBOURSABLE = "NON_REMBOURSABLE"


# ========================================
# SCHEMAS LABORATOIRE
# ========================================

class LaboratoireBase(BaseModel):
    """Base laboratoire"""
    nom: str = Field(..., min_length=2, max_length=200)
    type: TypeLaboratoire = TypeLaboratoire.GENERIQUEUR_PRINCIPAL
    actif: bool = True


class LaboratoireCreate(LaboratoireBase):
    """Creation de laboratoire"""
    pass


class LaboratoireResponse(LaboratoireBase):
    """Reponse laboratoire"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========================================
# SCHEMAS ACCORD COMMERCIAL
# ========================================

class AccordCommercialBase(BaseModel):
    """Base accord commercial"""
    nom: str = Field(..., min_length=2, max_length=200)
    date_debut: date
    date_fin: Optional[date] = None

    # Tranche A - Remboursables standard
    tranche_a_pct_ca: float = Field(default=80.0, ge=0, le=100, description="% theorique du CA en tranche A")
    tranche_a_cible: float = Field(default=57.0, ge=0, le=100, description="Taux de remise cible tranche A (%)")

    # Tranche B - Remboursables faible marge
    tranche_b_pct_ca: float = Field(default=20.0, ge=0, le=100, description="% theorique du CA en tranche B")
    tranche_b_cible: float = Field(default=27.5, ge=0, le=100, description="Taux de remise cible tranche B (%)")

    # OTC
    otc_cible: float = Field(default=0.0, ge=0, le=100, description="Remise OTC deja appliquee sur facture (%)")

    # Bonus disponibilite
    bonus_dispo_max_pct: float = Field(default=10.0, ge=0, le=100, description="% max achats en dispo max")
    bonus_seuil_pct: float = Field(default=95.0, ge=0, le=100, description="Seuil de disponibilite (%)")

    actif: bool = True


class AccordCommercialCreate(AccordCommercialBase):
    """Creation d'accord commercial"""
    laboratoire_id: int


class AccordCommercialResponse(AccordCommercialBase):
    """Reponse accord commercial"""
    id: int
    laboratoire_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========================================
# SCHEMAS LIGNE FACTURE LABO
# ========================================

class LigneFactureLaboResponse(BaseModel):
    """Reponse ligne de facture laboratoire (read-only, creee par le parser)"""
    id: int
    facture_id: int

    # Produit
    cip13: str
    designation: str
    numero_lot: Optional[str] = None

    # Quantites et prix
    quantite: int
    prix_unitaire_ht: float
    remise_pct: float = 0.0
    prix_unitaire_apres_remise: float
    montant_ht: float
    taux_tva: float

    # Montants calcules
    montant_brut: float
    montant_remise: float

    # Classification
    categorie: Optional[CategorieLigne] = None
    tranche: Optional[TrancheLigne] = None

    created_at: datetime

    class Config:
        from_attributes = True


# ========================================
# SCHEMAS ANALYSE REMISE
# ========================================

class AnalyseTrancheResponse(BaseModel):
    """Analyse d'une tranche (A, B ou OTC)"""
    tranche: str = Field(description="Nom de la tranche (A, B, OTC)")
    montant_brut: float = Field(description="Montant brut HT de la tranche")
    montant_remise: float = Field(description="Montant total des remises de la tranche")
    taux_remise_reel: float = Field(description="Taux de remise reel (%)")
    taux_remise_cible: float = Field(description="Taux de remise cible (%)")
    ecart_taux: float = Field(description="Ecart entre reel et cible (%)")
    rfa_attendue: float = Field(description="RFA attendue pour cette tranche")
    nb_lignes: int = Field(description="Nombre de lignes dans cette tranche")
    pct_ca: float = Field(description="% du CA total")


class AnalyseRemiseResponse(BaseModel):
    """Resume complet de l'analyse des remises par tranche"""
    tranches: List[AnalyseTrancheResponse] = Field(default_factory=list)
    rfa_totale_attendue: float = Field(description="RFA totale attendue")
    rfa_recue: Optional[float] = Field(None, description="RFA reellement recue")
    ecart_rfa: Optional[float] = Field(None, description="Ecart entre RFA recue et attendue")
    montant_brut_total: float = Field(description="Montant brut HT total")
    montant_remise_total: float = Field(description="Montant total des remises")
    taux_remise_global: float = Field(description="Taux de remise global (%)")


# ========================================
# SCHEMAS FACTURE LABO
# ========================================

class FactureLaboResponse(BaseModel):
    """Reponse facture laboratoire avec toutes les donnees d'analyse"""
    id: int

    # Cles etrangeres
    user_id: int
    laboratoire_id: int

    # Identification
    numero_facture: str
    date_facture: date
    date_commande: Optional[date] = None
    date_livraison: Optional[date] = None

    # Client
    numero_client: Optional[str] = None
    nom_client: Optional[str] = None

    # Canal de distribution
    canal: Optional[str] = None

    # Montants globaux
    montant_brut_ht: float
    total_remise_facture: float = 0.0
    montant_net_ht: float
    montant_ttc: Optional[float] = None
    total_tva: Optional[float] = None

    # Analyse par tranche A
    tranche_a_brut: float = 0.0
    tranche_a_remise: float = 0.0
    tranche_a_pct_reel: float = 0.0

    # Analyse par tranche B
    tranche_b_brut: float = 0.0
    tranche_b_remise: float = 0.0
    tranche_b_pct_reel: float = 0.0

    # OTC
    otc_brut: float = 0.0
    otc_remise: float = 0.0

    # RFA
    rfa_attendue: float = 0.0
    rfa_recue: Optional[float] = None
    ecart_rfa: Optional[float] = None

    # Paiement
    mode_paiement: Optional[str] = None
    delai_paiement: Optional[str] = None
    date_exigibilite: Optional[date] = None

    # Metadonnees fichier
    fichier_pdf: Optional[str] = None
    nb_lignes: int = 0
    nb_pages: int = 0
    warnings: Optional[List[str]] = None

    # Statut
    statut: StatutFactureLabo = StatutFactureLabo.ANALYSEE

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Relations
    laboratoire: Optional[LaboratoireResponse] = None
    lignes: List[LigneFactureLaboResponse] = Field(default_factory=list)

    # Propriete calculee
    taux_remise_effectif: float = Field(default=0.0, description="Taux de remise effectif en %")

    class Config:
        from_attributes = True


class FactureLaboListResponse(BaseModel):
    """Liste de factures labo avec pagination"""
    factures: List[FactureLaboResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ========================================
# SCHEMAS RFA
# ========================================

class RFAUpdateRequest(BaseModel):
    """Requete de mise a jour de la RFA recue"""
    rfa_recue: float = Field(..., ge=0, description="Montant RFA reellement recu")


class RFAUpdateResponse(BaseModel):
    """Reponse apres mise a jour de la RFA"""
    facture_id: int
    rfa_attendue: float
    rfa_recue: float
    ecart_rfa: float
    statut: StatutFactureLabo
    message: str


# ========================================
# SCHEMAS STATISTIQUES MENSUELLES
# ========================================

class StatsMonthlyItem(BaseModel):
    """Statistiques pour un mois donne"""
    mois: str = Field(description="Mois au format YYYY-MM")
    nb_factures: int = 0
    montant_brut_total: float = 0.0
    montant_remise_total: float = 0.0
    montant_net_total: float = 0.0
    rfa_attendue_total: float = 0.0
    rfa_recue_total: Optional[float] = None
    ecart_rfa_total: Optional[float] = None
    nb_conformes: int = 0
    nb_ecarts: int = 0


class StatsMonthlyResponse(BaseModel):
    """Reponse statistiques mensuelles"""
    laboratoire_id: Optional[int] = None
    laboratoire_nom: Optional[str] = None
    periode: str = Field(description="Periode couverte (ex: 2025-01 a 2025-12)")
    stats: List[StatsMonthlyItem] = Field(default_factory=list)

    # Totaux
    total_factures: int = 0
    total_brut: float = 0.0
    total_remise: float = 0.0
    total_rfa_attendue: float = 0.0
    total_rfa_recue: Optional[float] = None
    total_ecart: Optional[float] = None


# ========================================
# SCHEMAS UPLOAD LABO
# ========================================

class UploadLaboResponse(BaseModel):
    """Reponse upload et parsing d'une facture labo"""
    success: bool
    message: str
    facture: Optional[FactureLaboResponse] = None
    analyse: Optional[AnalyseRemiseResponse] = None
    warnings: Optional[List[str]] = None


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
    "StatutFactureLabo",
    "TypeLaboratoire",
    "TrancheLigne",
    "CategorieLigne",
    "LaboratoireCreate",
    "LaboratoireResponse",
    "AccordCommercialCreate",
    "AccordCommercialResponse",
    "LigneFactureLaboResponse",
    "AnalyseTrancheResponse",
    "AnalyseRemiseResponse",
    "FactureLaboResponse",
    "FactureLaboListResponse",
    "RFAUpdateRequest",
    "RFAUpdateResponse",
    "StatsMonthlyItem",
    "StatsMonthlyResponse",
    "UploadLaboResponse",
    "MessageResponse",
]
