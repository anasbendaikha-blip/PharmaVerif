"""
PharmaVerif Backend - Routes Statistiques
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/api/routes/stats.py
Endpoints pour statistiques et analytics
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Optional

from app.config import settings

def _is_sqlite() -> bool:
    """Check if the database is SQLite (vs PostgreSQL)."""
    return settings.DATABASE_URL.startswith("sqlite")

def _month_trunc(column):
    """
    Truncate a date/datetime column to the first of the month.
    Compatible with both SQLite and PostgreSQL.
    """
    if _is_sqlite():
        # SQLite: strftime returns a string 'YYYY-MM-01'
        return func.strftime('%Y-%m-01', column)
    else:
        # PostgreSQL: date_trunc returns a timestamp
        return func.date_trunc('month', column)

from app.schemas import (
    StatsResponse,
    StatsGlobales,
    StatsParGrossiste,
    StatsPeriode,
    StatutFacture,
)
from app.database import get_db
from app.models import Facture, Grossiste, Anomalie, User
from app.api.routes.auth import get_current_user, get_current_pharmacy_id

router = APIRouter()

# ========================================
# ENDPOINTS STATISTIQUES
# ========================================

@router.get("/", response_model=StatsResponse)
async def get_statistiques_globales(
    date_debut: Optional[datetime] = Query(None, description="Date de début de période"),
    date_fin: Optional[datetime] = Query(None, description="Date de fin de période"),
    grossiste_id: Optional[int] = Query(None, description="Filtrer par grossiste"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Obtenir les statistiques globales

    Retourne :
    - Statistiques générales (nombre factures, conformité, montants)
    - Statistiques par grossiste
    - Évolution dans le temps

    **Filtres disponibles:**
    - Par période (date_debut, date_fin)
    - Par grossiste
    """
    # Query de base — filtre multi-tenant
    query = db.query(Facture).filter(Facture.pharmacy_id == pharmacy_id)
    
    # Filtres
    if date_debut:
        query = query.filter(Facture.date >= date_debut)
    
    if date_fin:
        query = query.filter(Facture.date <= date_fin)
    
    if grossiste_id:
        query = query.filter(Facture.grossiste_id == grossiste_id)
    
    # ========================================
    # STATISTIQUES GLOBALES
    # ========================================
    
    total_factures = query.count()
    
    factures_conformes = query.filter(
        Facture.statut_verification == StatutFacture.CONFORME
    ).count()
    
    factures_avec_anomalies = query.filter(
        Facture.statut_verification == StatutFacture.ANOMALIE
    ).count()
    
    # Montants
    montant_total_result = query.with_entities(
        func.sum(Facture.montant_brut_ht)
    ).scalar()
    montant_total_ht = float(montant_total_result) if montant_total_result else 0.0
    
    # Montant récupérable (somme des anomalies)
    anomalies_query = db.query(Anomalie).join(Facture).filter(Facture.pharmacy_id == pharmacy_id)
    
    if date_debut:
        anomalies_query = anomalies_query.filter(Facture.date >= date_debut)
    if date_fin:
        anomalies_query = anomalies_query.filter(Facture.date <= date_fin)
    if grossiste_id:
        anomalies_query = anomalies_query.filter(Facture.grossiste_id == grossiste_id)
    
    montant_recuperable_result = anomalies_query.with_entities(
        func.sum(Anomalie.montant_ecart)
    ).scalar()
    montant_recuperable = float(montant_recuperable_result) if montant_recuperable_result else 0.0
    
    # Taux de conformité
    taux_conformite = (factures_conformes / total_factures * 100) if total_factures > 0 else 0.0
    
    # Économie potentielle (% du montant total)
    economie_potentielle = (montant_recuperable / montant_total_ht * 100) if montant_total_ht > 0 else 0.0
    
    globales = StatsGlobales(
        total_factures=total_factures,
        factures_conformes=factures_conformes,
        factures_avec_anomalies=factures_avec_anomalies,
        montant_total_ht=montant_total_ht,
        montant_recuperable=montant_recuperable,
        taux_conformite=round(taux_conformite, 2),
        economie_potentielle=round(economie_potentielle, 2)
    )
    
    # ========================================
    # STATISTIQUES PAR GROSSISTE
    # ========================================
    
    stats_grossistes = []
    
    # Query pour stats par grossiste
    grossistes_stats = db.query(
        Grossiste.id,
        Grossiste.nom,
        func.count(Facture.id).label('nombre_factures'),
        func.sum(Facture.montant_brut_ht).label('montant_total')
    ).join(Facture).filter(
        Grossiste.pharmacy_id == pharmacy_id,
    ).group_by(Grossiste.id, Grossiste.nom)
    
    if date_debut:
        grossistes_stats = grossistes_stats.filter(Facture.date >= date_debut)
    if date_fin:
        grossistes_stats = grossistes_stats.filter(Facture.date <= date_fin)
    if grossiste_id:
        grossistes_stats = grossistes_stats.filter(Grossiste.id == grossiste_id)
    
    for grossiste_stat in grossistes_stats.all():
        # Anomalies pour ce grossiste
        anomalies_count = db.query(func.count(Anomalie.id)).join(Facture).filter(
            Facture.grossiste_id == grossiste_stat.id,
            Facture.pharmacy_id == pharmacy_id,
        )
        
        if date_debut:
            anomalies_count = anomalies_count.filter(Facture.date >= date_debut)
        if date_fin:
            anomalies_count = anomalies_count.filter(Facture.date <= date_fin)
        
        anomalies_detectees = anomalies_count.scalar() or 0
        
        # Montant récupérable pour ce grossiste
        montant_recup = db.query(func.sum(Anomalie.montant_ecart)).join(Facture).filter(
            Facture.grossiste_id == grossiste_stat.id,
            Facture.pharmacy_id == pharmacy_id,
        )
        
        if date_debut:
            montant_recup = montant_recup.filter(Facture.date >= date_debut)
        if date_fin:
            montant_recup = montant_recup.filter(Facture.date <= date_fin)
        
        montant_recup_result = montant_recup.scalar()
        montant_recuperable_grossiste = float(montant_recup_result) if montant_recup_result else 0.0
        
        stats_grossistes.append(
            StatsParGrossiste(
                grossiste_id=grossiste_stat.id,
                grossiste_nom=grossiste_stat.nom,
                nombre_factures=grossiste_stat.nombre_factures,
                montant_total=float(grossiste_stat.montant_total) if grossiste_stat.montant_total else 0.0,
                anomalies_detectees=anomalies_detectees,
                montant_recuperable=montant_recuperable_grossiste
            )
        )
    
    # ========================================
    # ÉVOLUTION DANS LE TEMPS
    # ========================================
    
    evolution = []
    
    # Déterminer la période
    if not date_debut:
        # Par défaut : 3 derniers mois
        date_debut = datetime.utcnow() - timedelta(days=90)
    
    if not date_fin:
        date_fin = datetime.utcnow()
    
    # Grouper par mois (compatible SQLite + PostgreSQL)
    mois_expr = _month_trunc(Facture.date).label('mois')
    evolution_query = db.query(
        mois_expr,
        func.count(Facture.id).label('nombre_factures'),
        func.sum(Facture.montant_brut_ht).label('montant_total')
    ).filter(
        and_(Facture.date >= date_debut, Facture.date <= date_fin),
        Facture.pharmacy_id == pharmacy_id,
    ).group_by('mois').order_by('mois')
    
    if grossiste_id:
        evolution_query = evolution_query.filter(Facture.grossiste_id == grossiste_id)
    
    for periode in evolution_query.all():
        # Anomalies pour cette période
        anomalies_periode = db.query(func.count(Anomalie.id)).join(Facture).filter(
            _month_trunc(Facture.date) == periode.mois,
            Facture.pharmacy_id == pharmacy_id,
        )
        
        if grossiste_id:
            anomalies_periode = anomalies_periode.filter(Facture.grossiste_id == grossiste_id)
        
        anomalies_count = anomalies_periode.scalar() or 0
        
        evolution.append(
            StatsPeriode(
                date=periode.mois,
                nombre_factures=periode.nombre_factures,
                montant_total=float(periode.montant_total) if periode.montant_total else 0.0,
                anomalies=anomalies_count
            )
        )
    
    return StatsResponse(
        globales=globales,
        par_grossiste=stats_grossistes,
        evolution=evolution
    )

@router.get("/dashboard", response_model=dict)
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Données pour le tableau de bord

    Retourne un résumé rapide avec :
    - KPIs principaux
    - Dernières factures
    - Anomalies non résolues
    - Top grossistes
    """
    # KPIs
    total_factures = db.query(func.count(Facture.id)).filter(
        Facture.pharmacy_id == pharmacy_id,
    ).scalar() or 0

    factures_mois = db.query(func.count(Facture.id)).filter(
        Facture.pharmacy_id == pharmacy_id,
        Facture.date >= datetime.utcnow() - timedelta(days=30),
    ).scalar() or 0

    anomalies_non_resolues = db.query(func.count(Anomalie.id)).join(Facture).filter(
        Facture.pharmacy_id == pharmacy_id,
        Anomalie.resolu == False,
    ).scalar() or 0

    montant_recuperable = db.query(func.sum(Anomalie.montant_ecart)).join(Facture).filter(
        Facture.pharmacy_id == pharmacy_id,
        Anomalie.resolu == False,
    ).scalar() or 0.0

    # Dernières factures (5)
    dernieres_factures = db.query(Facture).filter(
        Facture.pharmacy_id == pharmacy_id,
    ).order_by(
        Facture.created_at.desc()
    ).limit(5).all()

    # Top grossistes (par montant)
    top_grossistes = db.query(
        Grossiste.nom,
        func.count(Facture.id).label('nb_factures'),
        func.sum(Facture.montant_brut_ht).label('montant_total')
    ).join(Facture).filter(
        Grossiste.pharmacy_id == pharmacy_id,
    ).group_by(Grossiste.nom).order_by(
        func.sum(Facture.montant_brut_ht).desc()
    ).limit(5).all()

    # Anomalies récentes
    anomalies_recentes = db.query(Anomalie).join(Facture).filter(
        Facture.pharmacy_id == pharmacy_id,
        Anomalie.resolu == False,
    ).order_by(Anomalie.created_at.desc()).limit(10).all()
    
    return {
        "kpis": {
            "total_factures": total_factures,
            "factures_ce_mois": factures_mois,
            "anomalies_non_resolues": anomalies_non_resolues,
            "montant_recuperable": float(montant_recuperable),
        },
        "dernieres_factures": [
            {
                "id": f.id,
                "numero": f.numero,
                "date": f.date,
                "montant": f.montant_brut_ht,
                "statut": f.statut_verification
            }
            for f in dernieres_factures
        ],
        "top_grossistes": [
            {
                "nom": g.nom,
                "nb_factures": g.nb_factures,
                "montant_total": float(g.montant_total) if g.montant_total else 0.0
            }
            for g in top_grossistes
        ],
        "anomalies_recentes": [
            {
                "id": a.id,
                "facture_id": a.facture_id,
                "type": a.type_anomalie,
                "montant": a.montant_ecart,
                "date": a.created_at
            }
            for a in anomalies_recentes
        ]
    }

@router.get("/tendances", response_model=dict)
async def get_tendances(
    periode: str = Query("mois", description="Période: jour, semaine, mois, annee"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Obtenir les tendances
    
    Analyse l'évolution des métriques clés sur différentes périodes.
    """
    # Déterminer la période précédente
    if periode == "jour":
        date_debut = datetime.utcnow() - timedelta(days=1)
        date_comparaison = datetime.utcnow() - timedelta(days=2)
    elif periode == "semaine":
        date_debut = datetime.utcnow() - timedelta(days=7)
        date_comparaison = datetime.utcnow() - timedelta(days=14)
    elif periode == "mois":
        date_debut = datetime.utcnow() - timedelta(days=30)
        date_comparaison = datetime.utcnow() - timedelta(days=60)
    else:  # annee
        date_debut = datetime.utcnow() - timedelta(days=365)
        date_comparaison = datetime.utcnow() - timedelta(days=730)
    
    # Période actuelle
    factures_actuelles = db.query(func.count(Facture.id)).filter(
        Facture.pharmacy_id == pharmacy_id,
        Facture.date >= date_debut,
    ).scalar() or 0

    montant_actuel = db.query(func.sum(Facture.montant_brut_ht)).filter(
        Facture.pharmacy_id == pharmacy_id,
        Facture.date >= date_debut,
    ).scalar() or 0.0

    anomalies_actuelles = db.query(func.count(Anomalie.id)).join(Facture).filter(
        Facture.pharmacy_id == pharmacy_id,
        Facture.date >= date_debut,
    ).scalar() or 0

    # Période précédente
    factures_precedentes = db.query(func.count(Facture.id)).filter(
        Facture.pharmacy_id == pharmacy_id,
        and_(Facture.date >= date_comparaison, Facture.date < date_debut),
    ).scalar() or 0

    montant_precedent = db.query(func.sum(Facture.montant_brut_ht)).filter(
        Facture.pharmacy_id == pharmacy_id,
        and_(Facture.date >= date_comparaison, Facture.date < date_debut),
    ).scalar() or 0.0

    anomalies_precedentes = db.query(func.count(Anomalie.id)).join(Facture).filter(
        Facture.pharmacy_id == pharmacy_id,
        and_(Facture.date >= date_comparaison, Facture.date < date_debut),
    ).scalar() or 0
    
    # Calculer les variations
    def calcul_variation(actuel, precedent):
        if precedent == 0:
            return 100.0 if actuel > 0 else 0.0
        return round(((actuel - precedent) / precedent) * 100, 2)
    
    return {
        "periode": periode,
        "factures": {
            "actuel": factures_actuelles,
            "precedent": factures_precedentes,
            "variation": calcul_variation(factures_actuelles, factures_precedentes)
        },
        "montant": {
            "actuel": float(montant_actuel),
            "precedent": float(montant_precedent),
            "variation": calcul_variation(float(montant_actuel), float(montant_precedent))
        },
        "anomalies": {
            "actuel": anomalies_actuelles,
            "precedent": anomalies_precedentes,
            "variation": calcul_variation(anomalies_actuelles, anomalies_precedentes)
        }
    }
