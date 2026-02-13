"""
PharmaVerif Backend - Models SQLAlchemy
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/models.py
Models de base de données complets
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.database import Base


# ========================================
# ENUMS
# ========================================

class PlanPharmacie(str, enum.Enum):
    """Plans d'abonnement pharmacie"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class UserRole(str, enum.Enum):
    """Rôles utilisateur"""
    ADMIN = "admin"
    PHARMACIEN = "pharmacien"
    COMPTABLE = "comptable"
    LECTURE = "lecture"


class StatutFacture(str, enum.Enum):
    """Statut de vérification"""
    NON_VERIFIE = "non_verifie"
    EN_COURS = "en_cours"
    CONFORME = "conforme"
    ANOMALIE = "anomalie"


class TypeAnomalie(str, enum.Enum):
    """Types d'anomalies"""
    REMISE_MANQUANTE = "remise_manquante"
    REMISE_EXCESSIVE = "remise_excessive"
    ECART_CALCUL = "ecart_calcul"
    FRANCO_NON_RESPECTE = "franco_non_respecte"
    AUTRE = "autre"


# ========================================
# MODELS
# ========================================

class Pharmacy(Base):
    """
    Modele Pharmacie (Tenant)

    Unite d'isolation multi-tenant. Chaque pharmacie possede ses propres
    donnees : factures, grossistes, laboratoires, accords, EMAC, etc.
    Tous les utilisateurs sont rattaches a une pharmacie.
    """
    __tablename__ = "pharmacies"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(300), nullable=False, index=True)
    adresse = Column(String(500), nullable=True)
    siret = Column(String(14), nullable=True, unique=True, index=True)
    titulaire = Column(String(200), nullable=True)
    plan = Column(Enum(PlanPharmacie), default=PlanPharmacie.FREE, nullable=False)

    actif = Column(Boolean, default=True)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    users = relationship("User", back_populates="pharmacy")
    grossistes = relationship("Grossiste", back_populates="pharmacy")
    factures = relationship("Facture", back_populates="pharmacy")

    def __repr__(self):
        return f"<Pharmacy {self.nom}>"


class User(Base):
    """
    Modèle Utilisateur

    Gère l'authentification et les permissions.
    Rattache a une pharmacie (tenant).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PHARMACIEN, nullable=False)
    actif = Column(Boolean, default=True)

    # Multi-tenant : pharmacie rattachee
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relations
    pharmacy = relationship("Pharmacy", back_populates="users")
    factures = relationship("Facture", back_populates="user")
    factures_labo = relationship("FactureLabo", back_populates="user")

    def __repr__(self):
        return f"<User {self.email}>"


class Grossiste(Base):
    """
    Modèle Grossiste

    Stocke les accords de remises avec chaque grossiste.
    Rattache a une pharmacie (tenant).
    """
    __tablename__ = "grossistes"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(200), nullable=False, index=True)

    # Multi-tenant
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)

    # Taux de remises (en pourcentage)
    remise_base = Column(Float, default=0.0, nullable=False)
    cooperation_commerciale = Column(Float, default=0.0, nullable=False)
    escompte = Column(Float, default=0.0, nullable=False)

    # Franco (port gratuit en euros)
    franco = Column(Float, default=0.0, nullable=False)

    actif = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    pharmacy = relationship("Pharmacy", back_populates="grossistes")
    factures = relationship("Facture", back_populates="grossiste")
    
    @property
    def taux_remise_total(self) -> float:
        """Calcul du taux de remise total"""
        return self.remise_base + self.cooperation_commerciale + self.escompte
    
    def __repr__(self):
        return f"<Grossiste {self.nom}>"


class Facture(Base):
    """
    Modèle Facture

    Représente une facture à vérifier.
    Rattachee a une pharmacie (tenant).
    """
    __tablename__ = "factures"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(100), unique=True, nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False)

    # Clés étrangères
    grossiste_id = Column(Integer, ForeignKey("grossistes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Multi-tenant
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)
    
    # Montants
    montant_brut_ht = Column(Float, nullable=False)
    remises_ligne_a_ligne = Column(Float, default=0.0)
    remises_pied_facture = Column(Float, default=0.0)
    net_a_payer = Column(Float, nullable=False)
    
    # Statut
    statut_verification = Column(
        Enum(StatutFacture),
        default=StatutFacture.NON_VERIFIE,
        nullable=False
    )
    
    # Métadonnées
    fichier_path = Column(String(500), nullable=True)
    methode_parsing = Column(String(50), nullable=True)  # native, ocr_tesseract, ocr_aws, excel
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relations
    pharmacy = relationship("Pharmacy", back_populates="factures")
    grossiste = relationship("Grossiste", back_populates="factures")
    user = relationship("User", back_populates="factures")
    lignes = relationship("LigneFacture", back_populates="facture", cascade="all, delete-orphan")
    anomalies = relationship("Anomalie", back_populates="facture", cascade="all, delete-orphan")

    @property
    def total_remises(self) -> float:
        """Total des remises appliquées"""
        return self.remises_ligne_a_ligne + self.remises_pied_facture
    
    @property
    def taux_remise_effectif(self) -> float:
        """Taux de remise effectif en %"""
        if self.montant_brut_ht > 0:
            return (self.total_remises / self.montant_brut_ht) * 100
        return 0.0
    
    def __repr__(self):
        return f"<Facture {self.numero}>"


class LigneFacture(Base):
    """
    Modèle Ligne de Facture
    
    Représente une ligne de produit dans une facture
    """
    __tablename__ = "lignes_factures"
    
    id = Column(Integer, primary_key=True, index=True)
    facture_id = Column(Integer, ForeignKey("factures.id"), nullable=False)
    
    # Informations produit
    produit = Column(String(500), nullable=False)
    cip = Column(String(20), nullable=True, index=True)  # Code CIP
    
    # Quantités et prix
    quantite = Column(Integer, nullable=False)
    prix_unitaire = Column(Float, nullable=False)
    remise_appliquee = Column(Float, default=0.0)  # En %
    montant_ht = Column(Float, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    facture = relationship("Facture", back_populates="lignes")
    
    def __repr__(self):
        return f"<LigneFacture {self.produit[:30]}>"


class Anomalie(Base):
    """
    Modèle Anomalie
    
    Représente une anomalie détectée sur une facture
    """
    __tablename__ = "anomalies"
    
    id = Column(Integer, primary_key=True, index=True)
    facture_id = Column(Integer, ForeignKey("factures.id"), nullable=False)
    
    # Type et description
    type_anomalie = Column(Enum(TypeAnomalie), nullable=False)
    description = Column(Text, nullable=False)
    
    # Montants
    montant_ecart = Column(Float, nullable=False)  # Montant de l'écart en €
    
    # Résolution
    resolu = Column(Boolean, default=False)
    resolu_at = Column(DateTime(timezone=True), nullable=True)
    note_resolution = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relations
    facture = relationship("Facture", back_populates="anomalies")
    
    def __repr__(self):
        return f"<Anomalie {self.type_anomalie.value}>"


class VerificationLog(Base):
    """
    Modèle Log de Vérification
    
    Historique des vérifications effectuées
    """
    __tablename__ = "verification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    facture_id = Column(Integer, ForeignKey("factures.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Résultat
    conforme = Column(Boolean, nullable=False)
    anomalies_detectees = Column(Integer, default=0)
    montant_recuperable = Column(Float, default=0.0)
    
    # Détails
    duree_ms = Column(Integer, nullable=True)  # Durée en millisecondes
    details = Column(Text, nullable=True)  # JSON stringifié
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<VerificationLog facture_id={self.facture_id}>"


class Session(Base):
    """
    Modèle Session
    
    Gestion des sessions JWT (optionnel, pour blacklist tokens)
    """
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    token_jti = Column(String(255), unique=True, index=True)  # JWT ID
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Session user_id={self.user_id}>"


# ========================================
# FONCTIONS UTILITAIRES
# ========================================

def init_db_data(db_session):
    """
    Initialiser la base de données avec des données de démo

    Args:
        db_session: Session SQLAlchemy
    """
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    # Vérifier si données existent déjà
    if db_session.query(User).first():
        # Migration multi-tenant : attacher les donnees existantes a la pharmacie par defaut
        _migrate_to_multitenant(db_session)
        print("✓ Base de données déjà initialisée")
        return

    print("Initialisation de la base de données...")

    # 0. Creer la pharmacie par defaut (tenant)
    default_pharmacy = Pharmacy(
        nom="Pharmacie Demo PharmaVerif",
        adresse="1 Rue de la Sante, 75000 Paris",
        siret="12345678901234",
        titulaire="Anas BENDAIKHA",
        plan=PlanPharmacie.PRO,
        actif=True,
    )
    db_session.add(default_pharmacy)
    db_session.flush()

    # 1. Créer un utilisateur admin
    admin = User(
        email="admin@pharmaverif.com",
        hashed_password=pwd_context.hash("Admin123!"),
        nom="BENDAIKHA",
        prenom="Anas",
        role=UserRole.ADMIN,
        actif=True,
        pharmacy_id=default_pharmacy.id,
    )
    db_session.add(admin)

    # 2. Créer un utilisateur pharmacien
    pharmacien = User(
        email="pharmacien@pharmaverif.com",
        hashed_password=pwd_context.hash("Pharma123!"),
        nom="Dupont",
        prenom="Jean",
        role=UserRole.PHARMACIEN,
        actif=True,
        pharmacy_id=default_pharmacy.id,
    )
    db_session.add(pharmacien)

    # 3. Créer des grossistes
    grossistes_data = [
        {
            "nom": "Alliance Healthcare",
            "remise_base": 2.0,
            "cooperation_commerciale": 1.5,
            "escompte": 0.5,
            "franco": 750.0
        },
        {
            "nom": "Phoenix Pharma",
            "remise_base": 2.5,
            "cooperation_commerciale": 1.0,
            "escompte": 0.3,
            "franco": 800.0
        },
        {
            "nom": "OCP Répartition",
            "remise_base": 1.8,
            "cooperation_commerciale": 1.2,
            "escompte": 0.4,
            "franco": 700.0
        },
        {
            "nom": "CERP Rouen",
            "remise_base": 2.2,
            "cooperation_commerciale": 1.3,
            "escompte": 0.5,
            "franco": 750.0
        }
    ]

    for data in grossistes_data:
        grossiste = Grossiste(pharmacy_id=default_pharmacy.id, **data)
        db_session.add(grossiste)

    db_session.commit()

    # 4. Créer le laboratoire Biogaran + Accord Commercial 2025 avec conditions completes
    from app.models_labo import Laboratoire, AccordCommercial, PalierRFA
    from datetime import date as dt_date

    existing_labo = db_session.query(Laboratoire).filter(Laboratoire.nom == "Biogaran").first()
    if not existing_labo:
        biogaran = Laboratoire(
            nom="Biogaran",
            type="generiqueur_principal",
            actif=True,
            pharmacy_id=default_pharmacy.id,
        )
        db_session.add(biogaran)
        db_session.flush()

        accord_biogaran = AccordCommercial(
            laboratoire_id=biogaran.id,
            nom="Accord Biogaran 2025",
            date_debut=dt_date(2025, 1, 1),
            date_fin=dt_date(2025, 12, 31),
            tranche_a_pct_ca=80.0,
            tranche_a_cible=57.0,
            tranche_b_pct_ca=20.0,
            tranche_b_cible=27.5,
            otc_cible=0.0,
            bonus_dispo_max_pct=10.0,
            bonus_seuil_pct=95.0,
            # Escompte
            escompte_pct=2.5,
            escompte_delai_jours=30,
            escompte_applicable=True,
            # Franco de port
            franco_seuil_ht=300.0,
            franco_frais_port=15.0,
            # Gratuites
            gratuites_seuil_qte=10,
            gratuites_ratio="10+1",
            gratuites_applicable=True,
            actif=True,
        )
        db_session.add(accord_biogaran)
        db_session.flush()

        # Paliers RFA Biogaran
        paliers_data = [
            {"seuil_min": 0, "seuil_max": 50000, "taux_rfa": 2.0, "description": "Palier Bronze"},
            {"seuil_min": 50000, "seuil_max": 100000, "taux_rfa": 3.0, "description": "Palier Argent"},
            {"seuil_min": 100000, "seuil_max": None, "taux_rfa": 4.0, "description": "Palier Or"},
        ]
        for p in paliers_data:
            palier = PalierRFA(
                accord_id=accord_biogaran.id,
                seuil_min=p["seuil_min"],
                seuil_max=p["seuil_max"],
                taux_rfa=p["taux_rfa"],
                description=p["description"],
            )
            db_session.add(palier)

        db_session.commit()
        print("✓ Laboratoire Biogaran + Accord 2025 + 3 paliers RFA crees")

    print("✓ Base de données initialisée avec succès")
    print(f"✓ Pharmacie: {default_pharmacy.nom} (ID={default_pharmacy.id})")
    print(f"✓ Admin: admin@pharmaverif.com / Admin123!")
    print(f"✓ Pharmacien: pharmacien@pharmaverif.com / Pharma123!")
    print(f"✓ {len(grossistes_data)} grossistes créés")


def _migrate_to_multitenant(db_session):
    """
    Migration automatique : attache les donnees existantes a une pharmacie par defaut
    si elles n'ont pas encore de pharmacy_id.

    Idempotente : ne fait rien si la migration a deja ete executee.
    """
    from app.models_labo import Laboratoire, FactureLabo, HistoriquePrix
    from app.models_emac import EMAC

    # Verifier s'il existe une pharmacie
    existing_pharmacy = db_session.query(Pharmacy).first()
    if not existing_pharmacy:
        # Creer la pharmacie par defaut pour les donnees existantes
        existing_pharmacy = Pharmacy(
            nom="Pharmacie Principale",
            adresse="Adresse a renseigner",
            titulaire="Titulaire a renseigner",
            plan=PlanPharmacie.PRO,
            actif=True,
        )
        db_session.add(existing_pharmacy)
        db_session.flush()
        print(f"✓ Migration : Pharmacie par defaut creee (ID={existing_pharmacy.id})")

    pid = existing_pharmacy.id

    # Attacher les users sans pharmacy_id
    users_migrated = db_session.query(User).filter(User.pharmacy_id.is_(None)).update(
        {"pharmacy_id": pid}, synchronize_session=False
    )

    # Attacher les grossistes sans pharmacy_id
    grossistes_migrated = db_session.query(Grossiste).filter(Grossiste.pharmacy_id.is_(None)).update(
        {"pharmacy_id": pid}, synchronize_session=False
    )

    # Attacher les factures grossiste sans pharmacy_id
    factures_migrated = db_session.query(Facture).filter(Facture.pharmacy_id.is_(None)).update(
        {"pharmacy_id": pid}, synchronize_session=False
    )

    # Attacher les laboratoires sans pharmacy_id
    labos_migrated = db_session.query(Laboratoire).filter(Laboratoire.pharmacy_id.is_(None)).update(
        {"pharmacy_id": pid}, synchronize_session=False
    )

    # Attacher les factures labo sans pharmacy_id
    factures_labo_migrated = db_session.query(FactureLabo).filter(FactureLabo.pharmacy_id.is_(None)).update(
        {"pharmacy_id": pid}, synchronize_session=False
    )

    # Attacher les EMAC sans pharmacy_id
    emac_migrated = db_session.query(EMAC).filter(EMAC.pharmacy_id.is_(None)).update(
        {"pharmacy_id": pid}, synchronize_session=False
    )

    # Attacher les historique_prix sans pharmacy_id
    hp_migrated = db_session.query(HistoriquePrix).filter(HistoriquePrix.pharmacy_id.is_(None)).update(
        {"pharmacy_id": pid}, synchronize_session=False
    )

    total = users_migrated + grossistes_migrated + factures_migrated + labos_migrated + factures_labo_migrated + emac_migrated + hp_migrated
    if total > 0:
        db_session.commit()
        print(f"✓ Migration multi-tenant : {total} enregistrement(s) rattache(s) a la pharmacie '{existing_pharmacy.nom}'")
        print(f"  - Users: {users_migrated}, Grossistes: {grossistes_migrated}, Factures: {factures_migrated}")
        print(f"  - Labos: {labos_migrated}, Factures Labo: {factures_labo_migrated}, EMAC: {emac_migrated}, Hist.Prix: {hp_migrated}")
