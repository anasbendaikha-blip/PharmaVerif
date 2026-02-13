"""
PharmaVerif Backend - Models SQLAlchemy pour EMAC
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/models_emac.py
Models pour la gestion des Etats Mensuels des Avantages Commerciaux (EMAC)

L'EMAC est un document envoye par les laboratoires aux pharmacies
resumant les avantages commerciaux (remises differees, RFA, COP).
Le triangle de verification croise : EMAC declare vs factures reelles vs conditions negociees.
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
# EMAC - ETAT MENSUEL DES AVANTAGES COMMERCIAUX
# ========================================

class EMAC(Base):
    """
    Modele EMAC (Etat Mensuel des Avantages Commerciaux)

    Document periodique envoye par un laboratoire a la pharmacie,
    recapitulant les avantages commerciaux accumules sur une periode.
    Sert de base au triangle de verification :
      1. EMAC declare vs factures reelles
      2. EMAC declare vs conditions negociees
      3. Detection des EMAC manquants
    """
    __tablename__ = "emacs"

    id = Column(Integer, primary_key=True, index=True)

    # Cles etrangeres
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    laboratoire_id = Column(Integer, ForeignKey("laboratoires.id"), nullable=False)

    # Multi-tenant
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=True)

    # Identification
    reference = Column(String(200), nullable=True, index=True)  # Ref du document EMAC

    # Periode couverte
    periode_debut = Column(Date, nullable=False)
    periode_fin = Column(Date, nullable=False)
    type_periode = Column(String(50), default="mensuel")
    # Types: mensuel, trimestriel, semestriel, annuel

    # Source du document
    fichier_original = Column(String(500), nullable=True)  # Chemin du fichier importe
    format_source = Column(String(20), default="manuel")
    # Formats: excel, csv, pdf, manuel

    # ========================================
    # MONTANTS DECLARES PAR LE LABORATOIRE
    # ========================================

    # CA declare par le labo sur la periode
    ca_declare = Column(Float, default=0.0)

    # Avantages declares
    rfa_declaree = Column(Float, default=0.0)           # Remise de fin d'annee
    cop_declaree = Column(Float, default=0.0)            # Conditions Objectifs Promotionnels
    remises_differees_declarees = Column(Float, default=0.0)  # Remises differees
    autres_avantages = Column(Float, default=0.0)        # Autres (escompte, franco, gratuites)

    # Total avantages
    total_avantages_declares = Column(Float, default=0.0)

    # Paiement
    montant_deja_verse = Column(Float, default=0.0)      # Montants deja credites
    solde_a_percevoir = Column(Float, default=0.0)       # Solde restant a percevoir
    mode_reglement = Column(String(100), nullable=True)   # virement, avoir, cheque

    # Detail JSON (lignes brutes du fichier Excel/CSV)
    detail_avantages = Column(JSON, nullable=True)
    # Structure attendue: [{type, description, montant, periode, reference}]

    # ========================================
    # VERIFICATION (calcules par le moteur)
    # ========================================

    statut_verification = Column(String(50), default="non_verifie")
    # Valeurs: non_verifie, en_cours, conforme, ecart_detecte, anomalie

    # CA reel calcule a partir des factures
    ca_reel_calcule = Column(Float, nullable=True)
    ecart_ca = Column(Float, nullable=True)              # ca_declare - ca_reel_calcule
    ecart_ca_pct = Column(Float, nullable=True)          # ecart en %

    # RFA attendue calculee vs conditions
    rfa_attendue_calculee = Column(Float, nullable=True)
    ecart_rfa = Column(Float, nullable=True)             # rfa_declaree - rfa_attendue_calculee

    # COP attendue calculee vs conditions
    cop_attendue_calculee = Column(Float, nullable=True)
    ecart_cop = Column(Float, nullable=True)

    # Total ecart avantages
    total_avantages_calcule = Column(Float, nullable=True)
    ecart_total_avantages = Column(Float, nullable=True)

    # Montant recouvrable (solde du a la pharmacie)
    montant_recouvrable = Column(Float, default=0.0)

    # Nb factures matched pendant la verification
    nb_factures_matched = Column(Integer, default=0)

    # Resume anomalies
    nb_anomalies = Column(Integer, default=0)
    anomalies_resume = Column(JSON, nullable=True)
    # Structure: [{type, description, montant_ecart, severite}]

    # Notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Relations
    user = relationship("User", backref="emacs")
    laboratoire = relationship("Laboratoire", backref="emacs")
    anomalies_emac = relationship(
        "AnomalieEMAC",
        back_populates="emac",
        cascade="all, delete-orphan"
    )

    @property
    def total_ecart(self) -> float:
        """Ecart total entre declare et calcule"""
        return abs(self.ecart_total_avantages or 0.0)

    @property
    def est_conforme(self) -> bool:
        """Verifie si l'EMAC est conforme (ecarts < 1%)"""
        if self.ca_declare and self.ca_declare > 0 and self.ecart_ca is not None:
            ecart_pct = abs(self.ecart_ca / self.ca_declare * 100)
            return ecart_pct < 1.0
        return self.statut_verification == "conforme"

    def __repr__(self):
        return f"<EMAC {self.reference or self.id} - {self.laboratoire_id}>"


# ========================================
# ANOMALIES EMAC
# ========================================

class AnomalieEMAC(Base):
    """
    Modele Anomalie EMAC

    Anomalie detectee lors de la verification croisee d'un EMAC.
    Types principaux :
      - ecart_ca : CA declare != CA reel (factures)
      - ecart_rfa : RFA declaree != RFA calculee (conditions)
      - ecart_cop : COP declaree != COP calculee
      - emac_manquant : Periode sans EMAC recu
      - montant_non_verse : Avantage declare mais non credite
      - condition_non_appliquee : Condition active non reflétée dans l'EMAC
    """
    __tablename__ = "anomalies_emac"

    id = Column(Integer, primary_key=True, index=True)
    emac_id = Column(Integer, ForeignKey("emacs.id"), nullable=False)

    # Classification
    type_anomalie = Column(String(50), nullable=False)
    # Types: ecart_ca, ecart_rfa, ecart_cop, emac_manquant,
    #        montant_non_verse, condition_non_appliquee, calcul_incoherent

    severite = Column(String(20), nullable=False, default="info")
    # Valeurs: critical, warning, info

    # Details
    description = Column(Text, nullable=False)
    montant_ecart = Column(Float, default=0.0)
    valeur_declaree = Column(Float, nullable=True)
    valeur_calculee = Column(Float, nullable=True)
    action_suggeree = Column(Text, nullable=True)

    # Suivi resolution
    resolu = Column(Boolean, default=False)
    resolu_at = Column(DateTime(timezone=True), nullable=True)
    note_resolution = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    emac = relationship("EMAC", back_populates="anomalies_emac")

    def __repr__(self):
        return f"<AnomalieEMAC {self.type_anomalie} - {self.severite}>"
