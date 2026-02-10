"""
PharmaVerif Backend - Configuration Complète
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/config.py
Configuration centralisée avec validation Pydantic
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
from pathlib import Path
import secrets


class Settings(BaseSettings):
    """
    Configuration de l'application
    
    Toutes les variables sont lues depuis les variables d'environnement (.env)
    """
    
    # ========================================
    # APPLICATION
    # ========================================
    
    APP_NAME: str = "PharmaVerif API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"  # development, staging, production
    DEBUG: bool = True
    
    # ========================================
    # SERVER
    # ========================================
    
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    AUTO_RELOAD: bool = True
    
    # ========================================
    # API
    # ========================================
    
    API_V1_PREFIX: str = "/api/v1"
    ENABLE_DOCS: bool = True  # Activer Swagger/ReDoc
    
    # ========================================
    # SECURITY
    # ========================================
    
    # JWT
    SECRET_KEY: str = secrets.token_urlsafe(32)  # CHANGE EN PRODUCTION!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 heure
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "https://pharmaverif.vercel.app",
        "https://pharma-verif.vercel.app",
        "https://pharmaverif.netlify.app",
    ]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # ========================================
    # DATABASE
    # ========================================
    
    # SQLite (développement)
    DATABASE_URL: str = "sqlite:///./pharmaverif.db"
    
    # PostgreSQL (production) - Décommenter et configurer
    # DATABASE_URL: str = "postgresql://user:password@localhost/pharmaverif"
    
    # Options DB
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    
    # ========================================
    # FILE UPLOAD
    # ========================================
    
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS: set = {".pdf", ".xlsx", ".xls", ".csv", ".jpg", ".png"}
    
    # ========================================
    # OCR
    # ========================================
    
    # Tesseract
    TESSERACT_PATH: Optional[str] = "/usr/bin/tesseract"  # Ajuster selon OS
    TESSERACT_LANG: str = "fra"
    
    # AWS Textract (optionnel)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "eu-west-1"
    
    # Google Cloud Vision (optionnel)
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    
    # OCR par défaut
    DEFAULT_OCR_PROVIDER: str = "tesseract"  # tesseract, aws_textract, google_vision
    ENABLE_OCR_FALLBACK: bool = True
    OCR_PREPROCESSING: bool = True
    
    # ========================================
    # PARSING
    # ========================================
    
    # PDF
    PDF_DPI: int = 300  # Résolution pour conversion PDF → images
    
    # Excel/CSV
    EXCEL_MAX_ROWS: int = 10000
    CSV_ENCODING: str = "utf-8"
    
    # ========================================
    # EXPORT
    # ========================================
    
    EXPORT_DIR: str = "exports"
    PDF_FONT: str = "Helvetica"
    
    # ========================================
    # LOGGING
    # ========================================
    
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_FILE: str = "logs/pharmaverif.log"
    LOG_MAX_SIZE: int = 10 * 1024 * 1024  # 10 MB
    LOG_BACKUP_COUNT: int = 5
    
    # ========================================
    # EMAILS (optionnel)
    # ========================================
    
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@pharmaverif.com"
    
    # ========================================
    # CACHE (optionnel)
    # ========================================
    
    REDIS_URL: Optional[str] = None  # redis://localhost:6379/0
    CACHE_TTL: int = 300  # 5 minutes
    
    # ========================================
    # MONITORING (optionnel)
    # ========================================
    
    SENTRY_DSN: Optional[str] = None
    
    # ========================================
    # VALIDATION
    # ========================================
    
    class Config:
        """Configuration Pydantic"""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    # ========================================
    # MÉTHODES
    # ========================================
    
    @property
    def is_production(self) -> bool:
        """Check si environnement de production"""
        return self.ENVIRONMENT == "production"
    
    @property
    def is_development(self) -> bool:
        """Check si environnement de développement"""
        return self.ENVIRONMENT == "development"
    
    def get_upload_path(self) -> Path:
        """Obtenir le chemin du dossier uploads"""
        path = Path(self.UPLOAD_DIR)
        path.mkdir(exist_ok=True)
        return path
    
    def get_export_path(self) -> Path:
        """Obtenir le chemin du dossier exports"""
        path = Path(self.EXPORT_DIR)
        path.mkdir(exist_ok=True)
        return path
    
    def get_log_path(self) -> Path:
        """Obtenir le chemin du fichier de log"""
        path = Path(self.LOG_FILE)
        path.parent.mkdir(exist_ok=True)
        return path


# ========================================
# INSTANCE GLOBALE
# ========================================

settings = Settings()


# ========================================
# VALIDATION AU DÉMARRAGE
# ========================================

def validate_settings():
    """
    Valider la configuration au démarrage
    
    Raises:
        ValueError si configuration invalide
    """
    errors = []
    
    # Vérifier SECRET_KEY en production
    if settings.is_production:
        if len(settings.SECRET_KEY) < 32:
            errors.append("SECRET_KEY doit faire au moins 32 caractères en production")
        
        if settings.DEBUG:
            errors.append("DEBUG doit être False en production")
        
        if "localhost" in settings.ALLOWED_ORIGINS:
            errors.append("Retirer localhost de ALLOWED_ORIGINS en production")
    
    # Vérifier DATABASE_URL
    if not settings.DATABASE_URL:
        errors.append("DATABASE_URL est requis")
    
    # Vérifier Tesseract
    if settings.TESSERACT_PATH:
        tesseract_path = Path(settings.TESSERACT_PATH)
        if not tesseract_path.exists():
            print(f"⚠️  Warning: Tesseract non trouvé à {settings.TESSERACT_PATH}")
    
    # Afficher les erreurs
    if errors:
        error_msg = "\n".join(f"  - {error}" for error in errors)
        raise ValueError(f"❌ Configuration invalide:\n{error_msg}")
    
    print("✓ Configuration validée")


def print_settings():
    """
    Afficher la configuration au démarrage (sans secrets)
    """
    print("\n" + "=" * 60)
    print(f"🏥 {settings.APP_NAME} v{settings.APP_VERSION}")
    print("=" * 60)
    print(f"Environment:      {settings.ENVIRONMENT}")
    print(f"Debug:            {settings.DEBUG}")
    print(f"Host:             {settings.HOST}:{settings.PORT}")
    print(f"API Prefix:       {settings.API_V1_PREFIX}")
    print(f"Database:         {settings.DATABASE_URL.split('://')[0]}://...")
    print(f"Upload Dir:       {settings.UPLOAD_DIR}")
    print(f"OCR Provider:     {settings.DEFAULT_OCR_PROVIDER}")
    print(f"Docs:             {'/api/docs' if settings.ENABLE_DOCS else 'Disabled'}")
    print("=" * 60 + "\n")


# ========================================
# HELPERS
# ========================================

def get_cors_origins() -> List[str]:
    """
    Obtenir la liste des origines CORS autorisées
    
    En production, peut être chargé depuis une variable d'environnement
    """
    if settings.is_production:
        # En production, charger depuis env
        import os
        origins_str = os.getenv("CORS_ORIGINS", "")
        if origins_str:
            return origins_str.split(",")
    
    return settings.ALLOWED_ORIGINS


def is_file_allowed(filename: str) -> bool:
    """
    Vérifier si un fichier est autorisé
    
    Args:
        filename: Nom du fichier
    
    Returns:
        True si autorisé
    """
    ext = Path(filename).suffix.lower()
    return ext in settings.ALLOWED_EXTENSIONS


def get_max_file_size_mb() -> float:
    """Obtenir la taille max des fichiers en MB"""
    return settings.MAX_FILE_SIZE / (1024 * 1024)


# ========================================
# EXPORT
# ========================================

__all__ = [
    "Settings",
    "settings",
    "validate_settings",
    "print_settings",
    "get_cors_origins",
    "is_file_allowed",
    "get_max_file_size_mb",
]
