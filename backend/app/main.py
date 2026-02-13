"""
PharmaVerif Backend - API RESTful Complète
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/main.py
Point d'entrée principal de l'API FastAPI
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import time
import logging
from pathlib import Path

from app.config import settings
from app.api.routes import (
    auth,
    users,
    grossistes,
    factures,
    anomalies,
    upload,
    verification,
    stats,
    export,
    factures_labo,
    laboratoires,
    emac,
    rapports,
    historique_prix,
    pharmacy,
)
from app.core.exceptions import PharmaVerifException

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(name)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Créer l'application FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    # 🏥 PharmaVerif API
    
    **API RESTful complète pour vérification de factures pharmaceutiques**
    
    ## 📋 Fonctionnalités
    
    - 🔐 Authentification JWT
    - 👥 Gestion des utilisateurs
    - 📄 CRUD factures complètes
    - 🏢 Gestion des grossistes
    - 🔍 Détection d'anomalies
    - 📊 Statistiques et analytics
    - 📤 Upload et parsing de fichiers (PDF/Excel/CSV)
    - 📥 Export PDF des rapports
    
    ## 🔒 Sécurité
    
    - Rate limiting (60 req/min)
    - Validation Pydantic stricte
    - JWT avec expiration
    - CORS configuré
    - Hash bcrypt des mots de passe
    
    ## 👨‍💻 Développé par
    
    **Anas BENDAIKHA**
    
    © 2026 - Tous droits réservés
    """,
    docs_url="/api/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/api/redoc" if settings.ENABLE_DOCS else None,
    openapi_url="/api/openapi.json" if settings.ENABLE_DOCS else None,
    contact={
        "name": "Anas BENDAIKHA",
        "email": "contact@pharmaverif.demo",
    },
    license_info={
        "name": "Proprietary License",
        "url": "https://pharmaverif.demo/license",
    },
)

# ========================================
# MIDDLEWARE
# ========================================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware de timing des requêtes
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Ajouter le temps de traitement dans les headers"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Middleware de logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Logger toutes les requêtes"""
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Status: {response.status_code}")
    return response

# ========================================
# EXCEPTION HANDLERS
# ========================================

@app.exception_handler(PharmaVerifException)
async def pharmaverif_exception_handler(request: Request, exc: PharmaVerifException):
    """Handler pour les exceptions custom"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details,
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handler pour les exceptions générales"""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "Une erreur interne est survenue",
        },
    )

# ========================================
# ROUTES
# ========================================

# Monter le dossier uploads
uploads_path = Path(settings.UPLOAD_DIR)
uploads_path.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# Inclure les routers
app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["🔐 Authentification"],
)

app.include_router(
    users.router,
    prefix=f"{settings.API_V1_PREFIX}/users",
    tags=["👥 Utilisateurs"],
)

app.include_router(
    grossistes.router,
    prefix=f"{settings.API_V1_PREFIX}/grossistes",
    tags=["🏢 Grossistes"],
)

app.include_router(
    factures.router,
    prefix=f"{settings.API_V1_PREFIX}/factures",
    tags=["📄 Factures"],
)

app.include_router(
    anomalies.router,
    prefix=f"{settings.API_V1_PREFIX}/anomalies",
    tags=["🔍 Anomalies"],
)

app.include_router(
    upload.router,
    prefix=f"{settings.API_V1_PREFIX}/upload",
    tags=["📤 Upload"],
)

app.include_router(
    verification.router,
    prefix=f"{settings.API_V1_PREFIX}/verification",
    tags=["✅ Vérification"],
)

app.include_router(
    stats.router,
    prefix=f"{settings.API_V1_PREFIX}/stats",
    tags=["📊 Statistiques"],
)

app.include_router(
    export.router,
    prefix=f"{settings.API_V1_PREFIX}/export",
    tags=["📥 Export"],
)

app.include_router(
    factures_labo.router,
    prefix=f"{settings.API_V1_PREFIX}/factures-labo",
    tags=["🧪 Factures Laboratoires"],
)

app.include_router(
    laboratoires.router,
    prefix=f"{settings.API_V1_PREFIX}/laboratoires",
    tags=["🏭 Laboratoires"],
)

app.include_router(
    emac.router,
    prefix=f"{settings.API_V1_PREFIX}/emac",
    tags=["📋 EMAC"],
)

app.include_router(
    rapports.router,
    prefix=f"{settings.API_V1_PREFIX}/rapports",
    tags=["📄 Rapports PDF"],
)

app.include_router(
    historique_prix.router,
    prefix=f"{settings.API_V1_PREFIX}/prix",
    tags=["📈 Historique Prix"],
)

app.include_router(
    pharmacy.router,
    prefix=f"{settings.API_V1_PREFIX}/pharmacy",
    tags=["🏥 Pharmacie (Tenant)"],
)

# ========================================
# ENDPOINTS RACINE
# ========================================

@app.get("/", tags=["🏠 Root"])
async def root():
    """
    Page d'accueil de l'API
    
    Retourne les informations générales sur l'API PharmaVerif.
    """
    return {
        "message": "PharmaVerif API",
        "version": settings.APP_VERSION,
        "author": "Anas BENDAIKHA",
        "copyright": "© 2026 - Tous droits réservés",
        "documentation": "/api/docs",
        "endpoints": {
            "auth": f"{settings.API_V1_PREFIX}/auth",
            "users": f"{settings.API_V1_PREFIX}/users",
            "grossistes": f"{settings.API_V1_PREFIX}/grossistes",
            "factures": f"{settings.API_V1_PREFIX}/factures",
            "anomalies": f"{settings.API_V1_PREFIX}/anomalies",
            "upload": f"{settings.API_V1_PREFIX}/upload",
            "verification": f"{settings.API_V1_PREFIX}/verification",
            "stats": f"{settings.API_V1_PREFIX}/stats",
            "export": f"{settings.API_V1_PREFIX}/export",
            "factures_labo": f"{settings.API_V1_PREFIX}/factures-labo",
            "laboratoires": f"{settings.API_V1_PREFIX}/laboratoires",
            "emac": f"{settings.API_V1_PREFIX}/emac",
            "rapports": f"{settings.API_V1_PREFIX}/rapports",
            "prix": f"{settings.API_V1_PREFIX}/prix",
            "pharmacy": f"{settings.API_V1_PREFIX}/pharmacy",
        },
    }

@app.get("/health", tags=["🏠 Root"])
async def health_check():
    """
    Health check endpoint

    Vérifie que l'API est opérationnelle.
    """
    return {
        "status": "healthy",
        "service": "pharmaverif-api",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/api/info", tags=["🏠 Root"])
async def api_info():
    """
    Informations détaillées sur l'API
    
    Retourne la configuration et les capacités de l'API.
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "features": {
            "authentication": True,
            "file_upload": True,
            "pdf_parsing": True,
            "ocr": True,
            "excel_parsing": True,
            "export_pdf": True,
            "statistics": True,
        },
        "limits": {
            "max_file_size_mb": settings.MAX_FILE_SIZE / (1024 * 1024),
            "allowed_extensions": list(settings.ALLOWED_EXTENSIONS),
            "rate_limit": "60 req/min",
        },
        "author": "Anas BENDAIKHA",
        "contact": "contact@pharmaverif.demo",
        "license": "Proprietary",
    }

# ========================================
# ÉVÉNEMENTS STARTUP/SHUTDOWN
# ========================================

@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application"""
    logger.info("=" * 60)
    logger.info(f"🚀 Démarrage de {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"📍 Environnement: {settings.ENVIRONMENT}")
    logger.info(f"🐛 Debug mode: {settings.DEBUG}")
    logger.info(f"📖 Documentation: /api/docs")
    logger.info("=" * 60)
    
    # Créer les dossiers nécessaires
    Path(settings.UPLOAD_DIR).mkdir(exist_ok=True)
    Path("logs").mkdir(exist_ok=True)
    
    logger.info("✅ Dossiers créés")

    # Créer les tables si elles n'existent pas (PostgreSQL ou SQLite)
    from app.database import engine, Base, SessionLocal
    from app.models import User, Grossiste, Facture, LigneFacture, Anomalie, VerificationLog, Session as SessionModel, Pharmacy
    from app.models_labo import Laboratoire, AccordCommercial, FactureLabo, LigneFactureLabo, PalierRFA, AnomalieFactureLabo, HistoriquePrix
    from app.models_emac import EMAC, AnomalieEMAC

    Base.metadata.create_all(bind=engine)
    logger.info("✅ Tables créées/vérifiées")

    # Migration v10: ajouter onboarding_completed a pharmacies (PostgreSQL compatible)
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE"
            ))
        logger.info("✅ Migration: onboarding_completed OK sur pharmacies")
    except Exception as e:
        logger.warning(f"⚠️ Migration onboarding_completed: {e}")

    # Migration v11: ajouter pharmacy_id aux tables multi-tenant (PostgreSQL compatible)
    # create_all() ne peut pas ajouter des colonnes a des tables existantes
    multi_tenant_tables = [
        "users",
        "grossistes",
        "factures",
        "laboratoires",
        "factures_labo",
        "historique_prix",
        "emacs",
    ]
    try:
        with engine.begin() as conn:
            for table_name in multi_tenant_tables:
                conn.execute(text(
                    f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS pharmacy_id INTEGER REFERENCES pharmacies(id)"
                ))
        logger.info("✅ Migration: pharmacy_id ajouté aux tables multi-tenant")
    except Exception as e:
        logger.warning(f"⚠️ Migration pharmacy_id multi-tenant: {e}")

    # Seed données initiales si la DB est vide (admin, grossistes, Biogaran)
    db = SessionLocal()
    try:
        from app.models import init_db_data
        init_db_data(db)
        logger.info("✅ Données initiales vérifiées")
    except Exception as e:
        logger.error(f"⚠️ Erreur lors du seed: {e}")
    finally:
        db.close()

@app.on_event("shutdown")
async def shutdown_event():
    """Actions à l'arrêt de l'application"""
    logger.info("🛑 Arrêt de l'API PharmaVerif")
    # TODO: Fermer les connexions DB
    # TODO: Nettoyer les fichiers temporaires

# ========================================
# MAIN
# ========================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.AUTO_RELOAD,
        log_level="info",
    )
