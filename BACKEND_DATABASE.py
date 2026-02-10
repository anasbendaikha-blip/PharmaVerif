"""
PharmaVerif Backend - Configuration Base de Données
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/database.py
Configuration SQLAlchemy et session management
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Generator
import os

from app.config import settings

# ========================================
# CONFIGURATION DATABASE
# ========================================

# URL de connexion (SQLite en dev, PostgreSQL en prod)
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Créer l'engine
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # SQLite : nécessite check_same_thread=False
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=settings.DEBUG  # Log SQL en mode debug
    )
else:
    # PostgreSQL
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,  # Vérifier connexion avant utilisation
        pool_size=10,  # Nombre de connexions
        max_overflow=20,  # Connexions supplémentaires si besoin
        echo=settings.DEBUG
    )

# Session locale
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base pour les models
Base = declarative_base()


# ========================================
# DEPENDENCY INJECTION
# ========================================

def get_db() -> Generator:
    """
    Dépendance pour obtenir une session DB
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    
    Yields:
        Session SQLAlchemy
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ========================================
# UTILITAIRES DATABASE
# ========================================

def create_tables():
    """
    Créer toutes les tables dans la base de données
    
    Note: En production, utiliser Alembic pour les migrations
    """
    Base.metadata.create_all(bind=engine)
    print("✓ Tables créées avec succès")


def drop_tables():
    """
    Supprimer toutes les tables (DANGER!)
    
    À utiliser uniquement en développement
    """
    Base.metadata.drop_all(bind=engine)
    print("✓ Tables supprimées")


def reset_database():
    """
    Réinitialiser complètement la base de données
    
    DANGER: Supprime toutes les données!
    """
    drop_tables()
    create_tables()
    print("✓ Base de données réinitialisée")


def init_database():
    """
    Initialiser la base de données avec tables et données de démo
    """
    # Créer les tables
    create_tables()
    
    # Initialiser les données de démo
    from app.models import init_db_data
    
    db = SessionLocal()
    try:
        init_db_data(db)
    finally:
        db.close()


# ========================================
# HEALTH CHECK DATABASE
# ========================================

def check_database_connection() -> bool:
    """
    Vérifier que la connexion à la base de données fonctionne
    
    Returns:
        True si connexion OK, False sinon
    """
    try:
        db = SessionLocal()
        # Exécuter une requête simple
        db.execute("SELECT 1")
        db.close()
        return True
    except Exception as e:
        print(f"❌ Erreur connexion DB : {str(e)}")
        return False


# ========================================
# CONTEXTE DATABASE
# ========================================

class DatabaseContext:
    """
    Context manager pour gérer les sessions DB
    
    Usage:
        with DatabaseContext() as db:
            user = db.query(User).first()
    """
    
    def __enter__(self):
        self.db = SessionLocal()
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # Erreur : rollback
            self.db.rollback()
        else:
            # Succès : commit
            self.db.commit()
        
        self.db.close()


# ========================================
# MIGRATION HELPER
# ========================================

def get_alembic_config():
    """
    Obtenir la configuration Alembic
    
    Returns:
        Config Alembic
    """
    from alembic.config import Config
    
    alembic_cfg = Config("alembic.ini")
    return alembic_cfg


def run_migrations():
    """
    Exécuter les migrations Alembic
    """
    from alembic import command
    
    alembic_cfg = get_alembic_config()
    command.upgrade(alembic_cfg, "head")
    print("✓ Migrations appliquées")


# ========================================
# BACKUP/RESTORE (SQLite uniquement)
# ========================================

def backup_database(backup_path: str = "backup.db"):
    """
    Créer un backup de la base de données SQLite
    
    Args:
        backup_path: Chemin du fichier de backup
    """
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        raise Exception("Backup uniquement supporté pour SQLite")
    
    import shutil
    
    # Extraire le chemin du fichier
    db_file = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    
    shutil.copy2(db_file, backup_path)
    print(f"✓ Backup créé : {backup_path}")


def restore_database(backup_path: str):
    """
    Restaurer une base de données depuis un backup
    
    Args:
        backup_path: Chemin du fichier de backup
    """
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        raise Exception("Restore uniquement supporté pour SQLite")
    
    import shutil
    
    db_file = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    
    shutil.copy2(backup_path, db_file)
    print(f"✓ Base de données restaurée depuis : {backup_path}")


# ========================================
# STATS DATABASE
# ========================================

def get_database_stats() -> dict:
    """
    Obtenir les statistiques de la base de données
    
    Returns:
        Dict avec nombre d'entrées par table
    """
    from app.models import User, Grossiste, Facture, Anomalie
    
    with DatabaseContext() as db:
        stats = {
            "users": db.query(User).count(),
            "grossistes": db.query(Grossiste).count(),
            "factures": db.query(Facture).count(),
            "anomalies": db.query(Anomalie).count(),
        }
    
    return stats


# ========================================
# EXPORT
# ========================================

__all__ = [
    "engine",
    "SessionLocal",
    "Base",
    "get_db",
    "create_tables",
    "drop_tables",
    "reset_database",
    "init_database",
    "check_database_connection",
    "DatabaseContext",
    "run_migrations",
    "backup_database",
    "restore_database",
    "get_database_stats",
]
