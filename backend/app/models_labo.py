"""
PharmaVerif Backend - Models SQLAlchemy pour Factures Laboratoires
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/models_labo.py
Models pour la gestion des factures laboratoires (Biogaran, etc.)
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from app.database import Base


# ========================================
# MODELS LABORATOIRES
# ========================================

class Laboratoire(Base):
    """
    Modele Laboratoire

    Represente un laboratoire pharmaceutique (Biogaran, Teva, Mylan, etc.)
    Rattache a une pharmacie (tenant).
    """
    __tablename__ = "laboratoires"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(200), nullable=False, index=True)
    type = Column(String(50), default="generiqueur_principal")
    # Types: generiqueur_principal, generiqueur_secondaire, princeps, autre

    # Multi-tenant
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)

    actif = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    accords = relationship("AccordCommercial", back_populates="laboratoire", cascade="all, delete-orphan")
    factures_labo = relationship("FactureLabo", back_populates="laboratoire")
    historique_prix = relationship("HistoriquePrix", back_populates="laboratoire")

    def __repr__(self):
        return f"<Laboratoire {self.nom}>"


class AccordCommercial(Base):
    """
    Modele Accord Commercial

    Conditions negociees avec un laboratoire pour une periode donnee.
    Definit les taux cibles par tranche (A, B, OTC).
    """
    __tablename__ = "accords_commerciaux"

    id = Column(Integer, primary_key=True, index=True)
    laboratoire_id = Column(Integer, ForeignKey("laboratoires.id"), nullable=False)

    nom = Column(String(200), nullable=False)  # ex: "Accord Biogaran 2025"
    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=True)

    # Tranche A - Remboursables standard
    tranche_a_pct_ca = Column(Float, default=80.0)   # % theorique du CA
    tranche_a_cible = Column(Float, default=57.0)     # Taux de remise cible (%)

    # Tranche B - Remboursables faible marge
    tranche_b_pct_ca = Column(Float, default=20.0)
    tranche_b_cible = Column(Float, default=27.5)

    # OTC - Non remboursables
    otc_cible = Column(Float, default=0.0)  # Remise deja appliquee sur facture

    # Bonus disponibilite
    bonus_dispo_max_pct = Column(Float, default=10.0)  # % max achats en dispo max
    bonus_seuil_pct = Column(Float, default=95.0)      # Seuil de disponibilite

    # Escompte
    escompte_pct = Column(Float, default=0.0)            # ex: 2.5%
    escompte_delai_jours = Column(Integer, default=30)   # Delai en jours pour beneficier de l'escompte
    escompte_applicable = Column(Boolean, default=False)

    # Franco de port
    franco_seuil_ht = Column(Float, default=0.0)         # Seuil minimum HT pour franco (ex: 300 EUR)
    franco_frais_port = Column(Float, default=0.0)        # Frais de port si sous le seuil (ex: 15 EUR)

    # Gratuites
    gratuites_seuil_qte = Column(Integer, default=0)     # Seuil quantite pour gratuites (ex: 10)
    gratuites_ratio = Column(String(50), default="")      # Ratio gratuites (ex: "10+1")
    gratuites_applicable = Column(Boolean, default=False)

    actif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    laboratoire = relationship("Laboratoire", back_populates="accords")
    paliers_rfa = relationship(
        "PalierRFA",
        back_populates="accord",
        cascade="all, delete-orphan",
        order_by="PalierRFA.seuil_min"
    )

    def __repr__(self):
        return f"<AccordCommercial {self.nom}>"


class FactureLabo(Base):
    """
    Modele Facture Laboratoire

    Represente une facture labo parsee et analysee.
    Contient les montants par tranche et les calculs de RFA.
    Rattachee a une pharmacie (tenant).
    """
    __tablename__ = "factures_labo"

    id = Column(Integer, primary_key=True, index=True)

    # Cles etrangeres
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    laboratoire_id = Column(Integer, ForeignKey("laboratoires.id"), nullable=False)

    # Multi-tenant
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)

    # Identification
    numero_facture = Column(String(100), unique=True, nullable=False, index=True)
    date_facture = Column(Date, nullable=False)
    date_commande = Column(Date, nullable=True)
    date_livraison = Column(Date, nullable=True)

    # Client
    numero_client = Column(String(100), nullable=True)
    nom_client = Column(String(200), nullable=True)

    # Canal de distribution
    canal = Column(String(50), nullable=True)  # direct_labo, ocp, phoenix, cerp

    # Montants globaux
    montant_brut_ht = Column(Float, nullable=False)
    total_remise_facture = Column(Float, default=0.0)
    montant_net_ht = Column(Float, nullable=False)
    montant_ttc = Column(Float, nullable=True)
    total_tva = Column(Float, nullable=True)

    # Analyse par tranche A
    tranche_a_brut = Column(Float, default=0.0)
    tranche_a_remise = Column(Float, default=0.0)
    tranche_a_pct_reel = Column(Float, default=0.0)  # % reel du total

    # Analyse par tranche B
    tranche_b_brut = Column(Float, default=0.0)
    tranche_b_remise = Column(Float, default=0.0)
    tranche_b_pct_reel = Column(Float, default=0.0)

    # OTC
    otc_brut = Column(Float, default=0.0)
    otc_remise = Column(Float, default=0.0)

    # RFA (Remise de Fin d'Annee)
    rfa_attendue = Column(Float, default=0.0)       # Calculee par le parser
    rfa_recue = Column(Float, nullable=True)         # Saisie manuelle
    ecart_rfa = Column(Float, nullable=True)         # rfa_recue - rfa_attendue

    # Paiement
    mode_paiement = Column(String(100), nullable=True)
    delai_paiement = Column(String(100), nullable=True)
    date_exigibilite = Column(Date, nullable=True)

    # Metadonnees fichier
    fichier_pdf = Column(String(500), nullable=True)  # Chemin relatif du PDF
    nb_lignes = Column(Integer, default=0)
    nb_pages = Column(Integer, default=0)
    warnings = Column(JSON, nullable=True)  # Avertissements du parser

    # Statut
    statut = Column(String(50), default="analysee")
    # Valeurs: non_verifie, analysee, conforme, ecart_rfa

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    user = relationship("User", back_populates="factures_labo")
    laboratoire = relationship("Laboratoire", back_populates="factures_labo")
    lignes = relationship(
        "LigneFactureLabo",
        back_populates="facture",
        cascade="all, delete-orphan"
    )
    anomalies_labo = relationship(
        "AnomalieFactureLabo",
        back_populates="facture",
        cascade="all, delete-orphan"
    )
    historique_prix = relationship(
        "HistoriquePrix",
        back_populates="facture_labo",
        cascade="all, delete-orphan"
    )

    @property
    def taux_remise_effectif(self) -> float:
        """Taux de remise effectif en %"""
        if self.montant_brut_ht and self.montant_brut_ht > 0:
            return round(self.total_remise_facture / self.montant_brut_ht * 100, 2)
        return 0.0

    def __repr__(self):
        return f"<FactureLabo {self.numero_facture}>"


class LigneFactureLabo(Base):
    """
    Modele Ligne de Facture Laboratoire

    Une ligne de produit extraite d'une facture labo.
    Classifiee automatiquement en Tranche A, B ou OTC.
    """
    __tablename__ = "lignes_factures_labo"

    id = Column(Integer, primary_key=True, index=True)
    facture_id = Column(Integer, ForeignKey("factures_labo.id"), nullable=False)

    # Produit
    cip13 = Column(String(13), nullable=False, index=True)
    designation = Column(String(500), nullable=False)
    numero_lot = Column(String(100), nullable=True)

    # Quantites et prix
    quantite = Column(Integer, nullable=False)
    prix_unitaire_ht = Column(Float, nullable=False)
    remise_pct = Column(Float, default=0.0)
    prix_unitaire_apres_remise = Column(Float, nullable=False)
    montant_ht = Column(Float, nullable=False)
    taux_tva = Column(Float, nullable=False)

    # Montants calcules
    montant_brut = Column(Float, nullable=False)    # quantite * prix_unitaire_ht
    montant_remise = Column(Float, nullable=False)   # montant_brut - montant_ht

    # Classification
    categorie = Column(String(50), nullable=True)
    # REMBOURSABLE_STANDARD, REMBOURSABLE_FAIBLE_MARGE, NON_REMBOURSABLE
    tranche = Column(String(10), nullable=True)
    # A, B, OTC

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    facture = relationship("FactureLabo", back_populates="lignes")

    def __repr__(self):
        return f"<LigneFactureLabo {self.cip13} - {self.designation[:30]}>"


class PalierRFA(Base):
    """
    Modele Palier RFA (Remise de Fin d'Annee)

    Un echelon de remise basee sur le volume annuel d'achats.
    Plusieurs paliers par accord commercial, ordonnes par seuil.
    Ex: 0-50k EUR -> 2%, 50-100k EUR -> 3%, 100k+ EUR -> 4%
    """
    __tablename__ = "paliers_rfa"

    id = Column(Integer, primary_key=True, index=True)
    accord_id = Column(Integer, ForeignKey("accords_commerciaux.id"), nullable=False)

    seuil_min = Column(Float, nullable=False)          # Seuil minimum en EUR (ex: 0, 50000, 100000)
    seuil_max = Column(Float, nullable=True)            # Seuil maximum en EUR (None = pas de plafond)
    taux_rfa = Column(Float, nullable=False)            # Taux RFA en % (ex: 2.0, 3.0, 4.0)
    description = Column(String(200), nullable=True)    # ex: "Palier Bronze", "Palier Or"

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    accord = relationship("AccordCommercial", back_populates="paliers_rfa")

    def __repr__(self):
        return f"<PalierRFA {self.seuil_min}-{self.seuil_max} -> {self.taux_rfa}%>"


class AnomalieFactureLabo(Base):
    """
    Modele Anomalie Facture Laboratoire

    Anomalie detectee lors de la verification d'une facture labo
    contre l'accord commercial. Stockee pour historique et suivi.

    Types: remise_ecart, escompte_manquant, franco_seuil, rfa_palier,
           gratuite_manquante, tva_incoherence, calcul_arithmetique
    Severites: critical, opportunity, info
    """
    __tablename__ = "anomalies_factures_labo"

    id = Column(Integer, primary_key=True, index=True)
    facture_id = Column(Integer, ForeignKey("factures_labo.id"), nullable=False)

    # Classification
    type_anomalie = Column(String(50), nullable=False)
    severite = Column(String(20), nullable=False, default="info")

    # Details
    description = Column(Text, nullable=False)
    montant_ecart = Column(Float, default=0.0)          # Impact en EUR
    action_suggeree = Column(Text, nullable=True)        # Action recommandee

    # Contexte (optionnel, pour anomalies au niveau ligne)
    ligne_id = Column(Integer, ForeignKey("lignes_factures_labo.id"), nullable=True)

    # Suivi resolution
    resolu = Column(Boolean, default=False)
    resolu_at = Column(DateTime(timezone=True), nullable=True)
    note_resolution = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    facture = relationship("FactureLabo", back_populates="anomalies_labo")
    ligne = relationship("LigneFactureLabo", backref="anomalies")


class HistoriquePrix(Base):
    """
    Modele Historique des Prix

    Enregistre l'evolution du prix d'un produit (CIP13) pour chaque facture importee.
    Auto-peuple a chaque upload de facture labo pour permettre :
    - Suivi de l'evolution des prix dans le temps
    - Comparaison multi-fournisseurs sur un meme produit
    - Detection d'alertes (hausse >5%, concurrent moins cher >10%)
    - Calcul du cout net reel (prix - remise - RFA proratisee - escompte + gratuites)
    Rattache a une pharmacie (tenant).
    """
    __tablename__ = "historique_prix"

    id = Column(Integer, primary_key=True, index=True)

    # Produit
    cip13 = Column(String(13), nullable=False, index=True)
    designation = Column(String(500), nullable=False)

    # Fournisseur / Laboratoire
    laboratoire_id = Column(Integer, ForeignKey("laboratoires.id"), nullable=False)

    # Multi-tenant
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)

    # Date et facture source
    date_facture = Column(Date, nullable=False, index=True)
    facture_labo_id = Column(Integer, ForeignKey("factures_labo.id"), nullable=True)

    # Prix unitaires
    prix_unitaire_brut = Column(Float, nullable=False)        # PU catalogue (avant remise)
    remise_pct = Column(Float, default=0.0)                    # % remise sur facture
    prix_unitaire_net = Column(Float, nullable=False)          # PU apres remise facture
    quantite = Column(Integer, default=1)                      # Quantite commandee

    # Cout net reel (calculable)
    # Inclut: prix facture + remise immédiate + RFA proratisée + escompte + gratuités
    cout_net_reel = Column(Float, nullable=True)               # Cout net reel par unite

    # Tranche / Classification
    tranche = Column(String(10), nullable=True)                # A, B, OTC
    taux_tva = Column(Float, nullable=True)                    # Taux TVA

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    laboratoire = relationship("Laboratoire", back_populates="historique_prix")
    facture_labo = relationship("FactureLabo", back_populates="historique_prix")

    def __repr__(self):
        return f"<HistoriquePrix {self.cip13} - {self.date_facture} - {self.prix_unitaire_net}>"
