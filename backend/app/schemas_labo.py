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
    VERIFIEE = "verifiee"


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


class TypeAnomalieLabo(str, Enum):
    """Types d'anomalies facture laboratoire"""
    REMISE_ECART = "remise_ecart"
    ESCOMPTE_MANQUANT = "escompte_manquant"
    FRANCO_SEUIL = "franco_seuil"
    RFA_PALIER = "rfa_palier"
    GRATUITE_MANQUANTE = "gratuite_manquante"
    TVA_INCOHERENCE = "tva_incoherence"
    CALCUL_ARITHMETIQUE = "calcul_arithmetique"


class SeveriteAnomalie(str, Enum):
    """Severite d'une anomalie"""
    CRITICAL = "critical"
    OPPORTUNITY = "opportunity"
    INFO = "info"


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

    # Escompte
    escompte_pct: float = Field(default=0.0, ge=0, le=100, description="Taux d'escompte (%)")
    escompte_delai_jours: int = Field(default=30, ge=0, description="Delai en jours pour beneficier de l'escompte")
    escompte_applicable: bool = Field(default=False, description="Escompte applicable sur cet accord")

    # Franco de port
    franco_seuil_ht: float = Field(default=0.0, ge=0, description="Seuil minimum HT pour franco de port (EUR)")
    franco_frais_port: float = Field(default=0.0, ge=0, description="Frais de port si sous le seuil (EUR)")

    # Gratuites
    gratuites_seuil_qte: int = Field(default=0, ge=0, description="Seuil quantite pour gratuites")
    gratuites_ratio: str = Field(default="", max_length=50, description="Ratio gratuites (ex: '10+1')")
    gratuites_applicable: bool = Field(default=False, description="Gratuites applicables sur cet accord")

    actif: bool = True


class AccordCommercialCreate(AccordCommercialBase):
    """Creation d'accord commercial"""
    laboratoire_id: int


class PalierRFABase(BaseModel):
    """Base palier RFA"""
    seuil_min: float = Field(..., ge=0, description="Seuil minimum en EUR")
    seuil_max: Optional[float] = Field(None, ge=0, description="Seuil maximum en EUR (None = pas de plafond)")
    taux_rfa: float = Field(..., ge=0, le=100, description="Taux RFA en %")
    description: Optional[str] = Field(None, max_length=200, description="Description du palier")


class PalierRFACreate(PalierRFABase):
    """Creation d'un palier RFA"""
    pass


class PalierRFAResponse(PalierRFABase):
    """Reponse palier RFA"""
    id: int
    accord_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class AccordCommercialResponse(AccordCommercialBase):
    """Reponse accord commercial"""
    id: int
    laboratoire_id: int
    created_at: datetime
    paliers_rfa: List[PalierRFAResponse] = Field(default_factory=list)

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
# SCHEMAS ANOMALIE FACTURE LABO
# ========================================

class AnomalieFactureLaboResponse(BaseModel):
    """Reponse anomalie facture laboratoire"""
    id: int
    facture_id: int
    type_anomalie: TypeAnomalieLabo
    severite: SeveriteAnomalie
    description: str
    montant_ecart: float = 0.0
    action_suggeree: Optional[str] = None
    ligne_id: Optional[int] = None
    resolu: bool = False
    resolu_at: Optional[datetime] = None
    note_resolution: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnomalieFactureLaboUpdate(BaseModel):
    """Mise a jour d'une anomalie (resolution)"""
    resolu: bool = Field(..., description="Anomalie resolue ou non")
    note_resolution: Optional[str] = Field(None, description="Note de resolution")


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
    anomalies_labo: List[AnomalieFactureLaboResponse] = Field(default_factory=list)

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
# SCHEMAS VERIFICATION
# ========================================

class VerificationLaboResponse(BaseModel):
    """Reponse du moteur de verification"""
    facture_id: int
    nb_anomalies: int = 0
    nb_critical: int = 0
    nb_opportunity: int = 0
    nb_info: int = 0
    montant_total_ecart: float = 0.0
    anomalies: List[AnomalieFactureLaboResponse] = Field(default_factory=list)
    statut: StatutFactureLabo
    message: str


class RFAProgressionResponse(BaseModel):
    """Progression RFA annuelle"""
    laboratoire_id: int
    laboratoire_nom: str
    annee: int
    cumul_achats_ht: float = 0.0
    palier_actuel: Optional[PalierRFAResponse] = None
    palier_suivant: Optional[PalierRFAResponse] = None
    montant_restant_prochain_palier: Optional[float] = None
    taux_rfa_actuel: float = 0.0
    rfa_estimee_annuelle: float = 0.0
    progression_pct: float = Field(default=0.0, ge=0, le=100, description="% vers le palier suivant")


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
# SCHEMAS FOURNISSEUR DETECTE
# ========================================

class FournisseurDetecte(BaseModel):
    """Informations sur le fournisseur detecte automatiquement"""
    nom: str = Field(description="Nom du fournisseur")
    type: str = Field(default="laboratoire", description="Type: laboratoire, grossiste, inconnu")
    detecte_auto: bool = Field(default=True, description="True si detecte automatiquement")
    parser_id: str = Field(default="generic", description="ID du parser utilise")
    confiance: float = Field(default=1.0, ge=0, le=1, description="Score de confiance 0-1")


# ========================================
# SCHEMAS UPLOAD LABO
# ========================================

class UploadLaboResponse(BaseModel):
    """Reponse upload et parsing d'une facture labo"""
    success: bool
    message: str
    facture: Optional[FactureLaboResponse] = None
    analyse: Optional[AnalyseRemiseResponse] = None
    fournisseur: Optional[FournisseurDetecte] = None
    verification: Optional[VerificationLaboResponse] = None
    warnings: Optional[List[str]] = None


# ========================================
# SCHEMAS PARSERS DISPONIBLES
# ========================================

class ParserInfo(BaseModel):
    """Informations sur un parser disponible"""
    id: str
    name: str
    version: str
    type: str
    keywords: List[str] = Field(default_factory=list)
    dedicated: bool = True


class ParsersListResponse(BaseModel):
    """Liste des parsers disponibles"""
    parsers: List[ParserInfo] = Field(default_factory=list)


# ========================================
# SCHEMAS GENERIQUES
# ========================================

class MessageResponse(BaseModel):
    """Reponse message simple"""
    message: str
    success: bool = True


class RecalculResponse(BaseModel):
    """Reponse du recalcul de factures apres modification d'accord"""
    laboratoire_id: int
    laboratoire_nom: str
    accord_nom: Optional[str] = None
    total: int
    succes: int
    erreurs: int
    message: str


# ========================================
# SCHEMAS HISTORIQUE PRIX
# ========================================

class HistoriquePrixResponse(BaseModel):
    """Reponse historique prix pour un produit"""
    id: int
    cip13: str
    designation: str
    laboratoire_id: int
    date_facture: date
    facture_labo_id: Optional[int] = None
    prix_unitaire_brut: float
    remise_pct: float = 0.0
    prix_unitaire_net: float
    quantite: int = 1
    cout_net_reel: Optional[float] = None
    tranche: Optional[str] = None
    taux_tva: Optional[float] = None
    created_at: datetime

    # Relation
    laboratoire_nom: Optional[str] = None

    class Config:
        from_attributes = True


class HistoriquePrixListResponse(BaseModel):
    """Liste de l'historique prix d'un produit"""
    cip13: str
    designation: str
    nb_enregistrements: int = 0
    prix_min: float = 0.0
    prix_max: float = 0.0
    prix_moyen: float = 0.0
    derniere_date: Optional[date] = None
    historique: List[HistoriquePrixResponse] = Field(default_factory=list)


class ComparaisonFournisseurItem(BaseModel):
    """Comparaison prix d'un produit entre fournisseurs"""
    laboratoire_id: int
    laboratoire_nom: str
    dernier_prix_brut: float = 0.0
    dernier_prix_net: float = 0.0
    cout_net_reel: Optional[float] = None
    remise_pct: float = 0.0
    derniere_date: Optional[date] = None
    nb_achats: int = 0
    quantite_totale: int = 0
    montant_total_ht: float = 0.0
    evolution_pct: Optional[float] = None  # Evolution prix vs achat precedent


class ComparaisonProduitResponse(BaseModel):
    """Comparaison multi-fournisseurs pour un produit"""
    cip13: str
    designation: str
    nb_fournisseurs: int = 0
    meilleur_prix_net: Optional[float] = None
    meilleur_fournisseur: Optional[str] = None
    ecart_max_pct: Optional[float] = None  # Ecart entre meilleur et pire prix
    fournisseurs: List[ComparaisonFournisseurItem] = Field(default_factory=list)


class TopProduitItem(BaseModel):
    """Top produit par volume ou montant"""
    cip13: str
    designation: str
    quantite_totale: int = 0
    montant_total_ht: float = 0.0
    nb_achats: int = 0
    prix_moyen_net: float = 0.0
    nb_fournisseurs: int = 0
    derniere_date: Optional[date] = None


class TopProduitsResponse(BaseModel):
    """Liste des top produits"""
    critere: str = "montant"  # montant, quantite
    periode: Optional[str] = None
    produits: List[TopProduitItem] = Field(default_factory=list)
    total: int = 0


class AlertePrixItem(BaseModel):
    """Alerte sur un changement de prix"""
    type_alerte: str  # hausse_prix, concurrent_moins_cher, condition_expire
    severite: str  # critical, warning, info
    cip13: str
    designation: str
    laboratoire_id: int
    laboratoire_nom: str
    description: str
    prix_ancien: Optional[float] = None
    prix_nouveau: Optional[float] = None
    ecart_pct: Optional[float] = None
    date_detection: date
    meilleur_prix_concurrent: Optional[float] = None
    concurrent_nom: Optional[str] = None
    economie_potentielle: Optional[float] = None


class AlertesPrixResponse(BaseModel):
    """Liste des alertes prix"""
    nb_alertes: int = 0
    nb_critical: int = 0
    nb_warning: int = 0
    nb_info: int = 0
    alertes: List[AlertePrixItem] = Field(default_factory=list)


class EconomiePotentielleItem(BaseModel):
    """Economie potentielle sur un produit"""
    cip13: str
    designation: str
    fournisseur_actuel: str
    prix_actuel_net: float = 0.0
    meilleur_fournisseur: str = ""
    meilleur_prix_net: float = 0.0
    ecart_unitaire: float = 0.0
    ecart_pct: float = 0.0
    quantite_annuelle: int = 0
    economie_annuelle: float = 0.0


class EconomiesPotentiellesResponse(BaseModel):
    """Resume des economies potentielles"""
    nb_produits_optimisables: int = 0
    economie_totale_annuelle: float = 0.0
    economies: List[EconomiePotentielleItem] = Field(default_factory=list)


# ========================================
# EXPORT
# ========================================

__all__ = [
    "StatutFactureLabo",
    "TypeLaboratoire",
    "TrancheLigne",
    "CategorieLigne",
    "TypeAnomalieLabo",
    "SeveriteAnomalie",
    "LaboratoireCreate",
    "LaboratoireResponse",
    "AccordCommercialCreate",
    "AccordCommercialResponse",
    "PalierRFABase",
    "PalierRFACreate",
    "PalierRFAResponse",
    "AnomalieFactureLaboResponse",
    "AnomalieFactureLaboUpdate",
    "LigneFactureLaboResponse",
    "AnalyseTrancheResponse",
    "AnalyseRemiseResponse",
    "FactureLaboResponse",
    "FactureLaboListResponse",
    "RFAUpdateRequest",
    "RFAUpdateResponse",
    "VerificationLaboResponse",
    "RFAProgressionResponse",
    "StatsMonthlyItem",
    "StatsMonthlyResponse",
    "FournisseurDetecte",
    "UploadLaboResponse",
    "ParserInfo",
    "ParsersListResponse",
    "MessageResponse",
    "HistoriquePrixResponse",
    "HistoriquePrixListResponse",
    "ComparaisonFournisseurItem",
    "ComparaisonProduitResponse",
    "TopProduitItem",
    "TopProduitsResponse",
    "AlertePrixItem",
    "AlertesPrixResponse",
    "EconomiePotentielleItem",
    "EconomiesPotentiellesResponse",
]
