"""
PharmaVerif Backend - Models SQLAlchemy pour le Rebate Engine
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/models_rebate.py
Models pour la gestion des remises (RFA, escompte, cooperation commerciale)
entre pharmacies et laboratoires.

Tables:
  - rebate_templates        : Grilles de remise pre-definies (Biogaran, Arrow, Teva...)
  - laboratory_agreements   : Accords specifiques pharmacie <-> laboratoire
  - invoice_rebate_schedules: Echeancier de remises par facture labo
  - agreement_audit_logs    : Journal d'audit des modifications d'accords
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    ForeignKey, Text, JSON, Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.database import Base


# ========================================
# ENUMS REBATE ENGINE
# ========================================

class RebateType(str, enum.Enum):
    """Type de remise"""
    RFA = "rfa"                         # Remise de Fin d'Annee (paliers CA)
    ESCOMPTE = "escompte"               # Escompte paiement rapide
    COOPERATION = "cooperation"         # Cooperation commerciale
    GRATUITE = "gratuite"               # Gratuites (ex: 10+1)


class RebateFrequency(str, enum.Enum):
    """Frequence de versement de la remise"""
    MENSUEL = "mensuel"
    TRIMESTRIEL = "trimestriel"
    SEMESTRIEL = "semestriel"
    ANNUEL = "annuel"


class AgreementStatus(str, enum.Enum):
    """Statut d'un accord de remise"""
    BROUILLON = "brouillon"
    ACTIF = "actif"
    SUSPENDU = "suspendu"
    EXPIRE = "expire"
    ARCHIVE = "archive"


class ScheduleStatus(str, enum.Enum):
    """Statut d'une echeance de remise"""
    PREVU = "prevu"                     # Remise calculee, pas encore versee
    EMIS = "emis"                       # Avoir emis par le labo
    RECU = "recu"                       # Avoir recu et rapproche
    ECART = "ecart"                     # Ecart detecte entre prevu et recu
    ANNULE = "annule"


# ========================================
# MODELS REBATE ENGINE
# ========================================

class RebateTemplate(Base):
    """
    Grille de remise pre-definie (template)

    Represente un modele de remise type pour un laboratoire.
    Exemples: "Biogaran Standard 2025", "Arrow Generiques", "Teva Premium".

    Sert de base pour creer des LaboratoryAgreement specifiques
    a chaque pharmacie. Le champ `tiers` stocke les paliers en JSONB:
        [
            {"seuil_min": 0, "seuil_max": 50000, "taux": 2.0},
            {"seuil_min": 50000, "seuil_max": 100000, "taux": 3.0},
            {"seuil_min": 100000, "seuil_max": null, "taux": 4.0}
        ]
    """
    __tablename__ = "rebate_templates"

    id = Column(Integer, primary_key=True, index=True)

    # Identification
    nom = Column(String(200), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    laboratoire_nom = Column(String(200), nullable=False, index=True)

    # Type et frequence
    rebate_type = Column(
        SQLEnum(RebateType, name="rebatetype", create_constraint=True),
        nullable=False,
        default=RebateType.RFA,
    )
    frequence = Column(
        SQLEnum(RebateFrequency, name="rebatefrequency", create_constraint=True),
        nullable=False,
        default=RebateFrequency.ANNUEL,
    )

    # Paliers de remise (JSONB pour PostgreSQL, JSON pour SQLite)
    tiers = Column(JSON, nullable=False, default=list)
    # Format: [{"seuil_min": 0, "seuil_max": 50000, "taux": 2.0, "label": "Bronze"}, ...]

    # Structure du template (stages/etapes de calcul) — JSONB
    # Format: {"type": "staged_rebate", "stages": [...], "tranches": ["A", "B"], "supports_otc": false}
    structure = Column(JSON, nullable=True)

    # Taux fixes (hors paliers)
    taux_escompte = Column(Float, default=0.0)          # % escompte si paiement rapide
    delai_escompte_jours = Column(Integer, default=30)   # Delai en jours
    taux_cooperation = Column(Float, default=0.0)        # % cooperation commerciale

    # Conditions gratuites
    gratuites_ratio = Column(String(50), nullable=True)  # ex: "10+1", "20+2"
    gratuites_seuil_qte = Column(Integer, default=0)     # Seuil quantite minimum

    # Versioning
    version = Column(Integer, default=1, nullable=False)
    scope = Column(String(20), default="system")  # system, group, pharmacy

    # Metadonnees
    actif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    agreements = relationship("LaboratoryAgreement", back_populates="template")

    def __repr__(self):
        return f"<RebateTemplate {self.nom}>"


class LaboratoryAgreement(Base):
    """
    Accord de remise specifique pharmacie <-> laboratoire

    Lie un template de remise a un laboratoire et une pharmacie concrete,
    avec dates de validite et conditions personnalisees.

    Le champ `custom_tiers` permet de surcharger les paliers du template
    pour cet accord specifique (si None, on utilise template.tiers).
    """
    __tablename__ = "laboratory_agreements"

    id = Column(Integer, primary_key=True, index=True)

    # Cles etrangeres
    template_id = Column(Integer, ForeignKey("rebate_templates.id"), nullable=True)
    laboratoire_id = Column(Integer, ForeignKey("laboratoires.id"), nullable=False)

    # Multi-tenant
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=False)

    # Identification
    nom = Column(String(200), nullable=False)  # ex: "Accord Biogaran 2025 - Pharmacie Centrale"
    reference_externe = Column(String(100), nullable=True)  # Reference contrat labo

    # Validite
    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=True)  # Null = accord sans date de fin

    # Statut
    statut = Column(
        SQLEnum(AgreementStatus, name="agreementstatus", create_constraint=True),
        nullable=False,
        default=AgreementStatus.BROUILLON,
    )

    # Paliers personnalises (surcharge du template si non null)
    custom_tiers = Column(JSON, nullable=True)
    # Meme format que RebateTemplate.tiers

    # Configuration complete de l'accord (taux par tranche) — JSONB
    # Format: {"tranche_configurations": {"tranche_A": {...}, "tranche_B": {...}}}
    agreement_config = Column(JSON, nullable=True)

    # Taux specifiques (surcharge du template)
    taux_escompte = Column(Float, nullable=True)       # Null = utiliser template
    taux_cooperation = Column(Float, nullable=True)
    gratuites_ratio = Column(String(50), nullable=True)

    # Objectif de CA annuel (pour calcul d'avancement)
    objectif_ca_annuel = Column(Float, nullable=True)

    # Montants cumules (mis a jour par le moteur de calcul)
    ca_cumule = Column(Float, default=0.0)              # CA cumule depuis date_debut
    remise_cumulee = Column(Float, default=0.0)         # Total remises calculees
    derniere_maj_calcul = Column(DateTime(timezone=True), nullable=True)

    # Versioning
    version = Column(Integer, default=1, nullable=False)
    previous_version_id = Column(Integer, ForeignKey("laboratory_agreements.id"), nullable=True)
    template_version = Column(Integer, default=1)  # Version du template au moment de la creation

    # Notes
    notes = Column(Text, nullable=True)

    # Metadonnees
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relations
    template = relationship("RebateTemplate", back_populates="agreements")
    laboratoire = relationship("Laboratoire", back_populates="rebate_agreements")
    pharmacy = relationship("Pharmacy", back_populates="rebate_agreements")
    creator = relationship("User", foreign_keys=[created_by])
    schedules = relationship(
        "InvoiceRebateSchedule",
        back_populates="agreement",
        cascade="all, delete-orphan",
        order_by="InvoiceRebateSchedule.date_echeance",
    )
    audit_logs = relationship(
        "AgreementAuditLog",
        back_populates="agreement",
        cascade="all, delete-orphan",
        order_by="AgreementAuditLog.created_at.desc()",
    )

    @property
    def tiers_effectifs(self):
        """Retourne les paliers effectifs (custom ou template)"""
        if self.custom_tiers:
            return self.custom_tiers
        if self.template:
            return self.template.tiers
        return []

    @property
    def avancement_pct(self) -> float:
        """Pourcentage d'avancement vers l'objectif CA"""
        if self.objectif_ca_annuel and self.objectif_ca_annuel > 0:
            return round((self.ca_cumule / self.objectif_ca_annuel) * 100, 2)
        return 0.0

    def __repr__(self):
        return f"<LaboratoryAgreement {self.nom} ({self.statut.value})>"


class InvoiceRebateSchedule(Base):
    """
    Echeancier de remise par facture labo

    Pour chaque facture labo, enregistre le montant de remise calcule
    (prevu), le montant recu (avoir), et l'eventuel ecart.

    Permet le suivi fin du versement des remises et la detection
    des avoirs manquants ou en ecart.
    """
    __tablename__ = "invoice_rebate_schedules"

    id = Column(Integer, primary_key=True, index=True)

    # Cles etrangeres
    agreement_id = Column(Integer, ForeignKey("laboratory_agreements.id"), nullable=False)
    facture_labo_id = Column(Integer, ForeignKey("factures_labo.id"), nullable=True)

    # Multi-tenant
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=False)

    # Type de remise concerne
    rebate_type = Column(
        SQLEnum(RebateType, name="rebatetype", create_constraint=True),
        nullable=False,
    )

    # Montants globaux de la facture
    montant_base_ht = Column(Float, nullable=False, default=0.0)    # Montant HT total facture
    taux_applique = Column(Float, nullable=False, default=0.0)       # Taux de remise global (%)
    montant_prevu = Column(Float, nullable=False, default=0.0)       # Total RFA previsionnel
    montant_recu = Column(Float, nullable=True)                       # Total effectivement recu
    ecart = Column(Float, nullable=True)                              # montant_recu - montant_prevu

    # Snapshot immutable de l'accord au moment du calcul — JSONB
    applied_config = Column(JSON, nullable=True)

    # Ventilation par tranche — JSONB
    # {"tranche_A": {"amount_ht": 2400, "line_count": 8}, "tranche_B": {"amount_ht": 6750, "line_count": 22}}
    tranche_breakdown = Column(JSON, nullable=True)
    tranche_type = Column(String(20), nullable=True)  # "tranche_A", "tranche_B", "mixed"

    # Detail du calendrier de remises (etapes) — JSONB
    # Contient les entries avec ventilation par tranche, montants par etape, etc.
    rebate_entries = Column(JSON, nullable=True)

    # Version de l'accord au moment du calcul
    agreement_version = Column(Integer, default=1)

    # Date de la facture (pour reference rapide sans jointure)
    invoice_date = Column(Date, nullable=True)
    invoice_amount = Column(Float, nullable=True)

    # Echeance
    date_echeance = Column(Date, nullable=False)   # Date prevue du versement
    date_reception = Column(Date, nullable=True)    # Date effective de reception

    # Statut
    statut = Column(
        SQLEnum(ScheduleStatus, name="schedulestatus", create_constraint=True),
        nullable=False,
        default=ScheduleStatus.PREVU,
    )

    # Totaux RFA
    total_rfa_expected = Column(Float, default=0.0)     # Total RFA attendue
    total_rfa_percentage = Column(Float, default=0.0)   # % RFA par rapport au montant eligible

    # Reference avoir (si recu)
    reference_avoir = Column(String(100), nullable=True)  # Numero de l'avoir labo
    notes = Column(Text, nullable=True)

    # Metadonnees
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    agreement = relationship("LaboratoryAgreement", back_populates="schedules")
    facture_labo = relationship("FactureLabo", back_populates="rebate_schedules")
    pharmacy = relationship("Pharmacy")

    @property
    def en_retard(self) -> bool:
        """Verifie si l'echeance est en retard"""
        from datetime import date
        return (
            self.statut == ScheduleStatus.PREVU
            and self.date_echeance < date.today()
        )

    def __repr__(self):
        return f"<InvoiceRebateSchedule {self.rebate_type.value} {self.montant_prevu}EUR ({self.statut.value})>"


class AgreementAuditLog(Base):
    """
    Journal d'audit des modifications d'accords

    Trace chaque modification d'un LaboratoryAgreement pour
    conformite et historique. Stocke l'ancien et le nouvel etat
    en JSONB pour un diff complet.
    """
    __tablename__ = "agreement_audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Cles etrangeres
    agreement_id = Column(Integer, ForeignKey("laboratory_agreements.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Action
    action = Column(String(50), nullable=False)
    # Valeurs: "creation", "modification", "activation", "suspension", "expiration", "archivage"

    # Diff
    ancien_etat = Column(JSON, nullable=True)   # Snapshot avant modification
    nouvel_etat = Column(JSON, nullable=True)    # Snapshot apres modification

    # Details humains
    description = Column(Text, nullable=True)    # Description lisible du changement

    # Metadonnees
    ip_address = Column(String(45), nullable=True)   # IPv4 ou IPv6
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    agreement = relationship("LaboratoryAgreement", back_populates="audit_logs")
    user = relationship("User")

    def __repr__(self):
        return f"<AgreementAuditLog {self.action} agreement_id={self.agreement_id}>"


# ========================================
# SEED DATA — TEMPLATES PREDÉFINIS
# ========================================

def seed_rebate_templates(db_session):
    """
    Inserer les 3 templates de remise pre-definis si la table est vide.

    Templates:
      1. Biogaran Standard 2025 — RFA annuelle, 3 paliers CA, escompte 2.5%, gratuites 10+1
      2. Arrow Generiques 2025  — RFA semestrielle, 3 paliers CA, escompte 2.0%
      3. Teva Premium 2025      — RFA annuelle, 4 paliers CA, cooperation 1.5%, gratuites 20+2

    Idempotent: ne fait rien si des templates existent deja.
    """
    existing = db_session.query(RebateTemplate).first()
    if existing:
        return  # Templates deja en place

    templates_data = [
        {
            "nom": "Biogaran Standard 2025",
            "description": (
                "Grille de remise standard Biogaran pour les pharmacies. "
                "RFA annuelle sur 3 paliers de CA, escompte 2.5% a 30 jours, "
                "gratuites 10+1 a partir de 10 unites."
            ),
            "laboratoire_nom": "Biogaran",
            "rebate_type": RebateType.RFA,
            "frequence": RebateFrequency.ANNUEL,
            "tiers": [
                {"seuil_min": 0, "seuil_max": 50000, "taux": 2.0, "label": "Bronze"},
                {"seuil_min": 50000, "seuil_max": 100000, "taux": 3.0, "label": "Argent"},
                {"seuil_min": 100000, "seuil_max": None, "taux": 4.0, "label": "Or"},
            ],
            "taux_escompte": 2.5,
            "delai_escompte_jours": 30,
            "taux_cooperation": 0.0,
            "gratuites_ratio": "10+1",
            "gratuites_seuil_qte": 10,
            "actif": True,
        },
        {
            "nom": "Arrow Generiques 2025",
            "description": (
                "Grille de remise Arrow Generiques. "
                "RFA semestrielle sur 3 paliers de CA, escompte 2.0% a 45 jours. "
                "Pas de gratuites."
            ),
            "laboratoire_nom": "Arrow",
            "rebate_type": RebateType.RFA,
            "frequence": RebateFrequency.SEMESTRIEL,
            "tiers": [
                {"seuil_min": 0, "seuil_max": 30000, "taux": 1.5, "label": "Starter"},
                {"seuil_min": 30000, "seuil_max": 80000, "taux": 2.5, "label": "Pro"},
                {"seuil_min": 80000, "seuil_max": None, "taux": 3.5, "label": "Elite"},
            ],
            "taux_escompte": 2.0,
            "delai_escompte_jours": 45,
            "taux_cooperation": 0.0,
            "gratuites_ratio": None,
            "gratuites_seuil_qte": 0,
            "actif": True,
        },
        {
            "nom": "Teva Premium 2025",
            "description": (
                "Grille de remise premium Teva. "
                "RFA annuelle sur 4 paliers de CA, cooperation commerciale 1.5%, "
                "gratuites 20+2 a partir de 20 unites. Pas d'escompte."
            ),
            "laboratoire_nom": "Teva",
            "rebate_type": RebateType.RFA,
            "frequence": RebateFrequency.ANNUEL,
            "tiers": [
                {"seuil_min": 0, "seuil_max": 25000, "taux": 1.0, "label": "Decouverte"},
                {"seuil_min": 25000, "seuil_max": 60000, "taux": 2.0, "label": "Confiance"},
                {"seuil_min": 60000, "seuil_max": 120000, "taux": 3.0, "label": "Fidelite"},
                {"seuil_min": 120000, "seuil_max": None, "taux": 4.5, "label": "Partenaire"},
            ],
            "taux_escompte": 0.0,
            "delai_escompte_jours": 0,
            "taux_cooperation": 1.5,
            "gratuites_ratio": "20+2",
            "gratuites_seuil_qte": 20,
            "actif": True,
        },
    ]

    for data in templates_data:
        template = RebateTemplate(**data)
        db_session.add(template)

    db_session.commit()
    print("✓ 3 templates Rebate Engine crees (Biogaran, Arrow, Teva)")


# ========================================
# EXPORT
# ========================================

__all__ = [
    # Enums
    "RebateType",
    "RebateFrequency",
    "AgreementStatus",
    "ScheduleStatus",
    # Models
    "RebateTemplate",
    "LaboratoryAgreement",
    "InvoiceRebateSchedule",
    "AgreementAuditLog",
    # Seed
    "seed_rebate_templates",
]
