#!/bin/bash
# ========================================
# Script de démarrage rapide Backend FastAPI
# Copyright (c) 2026 Anas BENDAIKHA
# ========================================
#
# Usage: ./BACKEND_QUICKSTART.sh
#
# Ce script configure automatiquement le backend FastAPI
# pour PharmaVerif avec analyse PDF

set -e  # Arrêter si erreur

echo "🚀 PharmaVerif - Configuration Backend FastAPI"
echo "================================================"
echo ""

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# 1. VÉRIFIER PRÉREQUIS
# ========================================

echo -e "${BLUE}📋 Vérification des prérequis...${NC}"

# Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 n'est pas installé${NC}"
    echo "Installez Python 3.10+ : https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✅ Python $PYTHON_VERSION${NC}"

# pip
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✅ pip installé${NC}"

# Tesseract (optionnel pour OCR)
if command -v tesseract &> /dev/null; then
    TESSERACT_VERSION=$(tesseract --version | head -n1)
    echo -e "${GREEN}✅ Tesseract installé : $TESSERACT_VERSION${NC}"
    TESSERACT_INSTALLED=true
else
    echo -e "${YELLOW}⚠️  Tesseract non installé (optionnel pour OCR)${NC}"
    echo -e "${YELLOW}   Pour installer :${NC}"
    echo -e "${YELLOW}   - macOS: brew install tesseract${NC}"
    echo -e "${YELLOW}   - Ubuntu: sudo apt-get install tesseract-ocr${NC}"
    TESSERACT_INSTALLED=false
fi

echo ""

# ========================================
# 2. CRÉER LA STRUCTURE
# ========================================

echo -e "${BLUE}📁 Création de la structure du projet...${NC}"

mkdir -p backend
cd backend

# Créer les dossiers
mkdir -p app/api/routes
mkdir -p app/models
mkdir -p app/schemas
mkdir -p app/services
mkdir -p app/db
mkdir -p app/core
mkdir -p tests
mkdir -p uploads
mkdir -p logs
mkdir -p alembic/versions

# Créer les fichiers __init__.py
touch app/__init__.py
touch app/api/__init__.py
touch app/api/routes/__init__.py
touch app/models/__init__.py
touch app/schemas/__init__.py
touch app/services/__init__.py
touch app/db/__init__.py
touch app/core/__init__.py
touch tests/__init__.py

echo -e "${GREEN}✅ Structure créée${NC}"
echo ""

# ========================================
# 3. CRÉER requirements.txt
# ========================================

echo -e "${BLUE}📦 Création de requirements.txt...${NC}"

cat > requirements.txt << 'EOF'
# Framework web
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Parsing PDF
PyPDF2==3.0.1
pdfplumber==0.10.3
pdf2image==1.16.3
pytesseract==0.3.10

# Parsing Excel/CSV
openpyxl==3.1.2
pandas==2.2.0

# Base de données
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.1
psycopg2-binary==2.9.9

# Validation
pydantic==2.5.3
pydantic-settings==2.1.0

# Sécurité
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0

# Utilitaires
python-dateutil==2.8.2
pillow==10.2.0

# Développement
pytest==7.4.4
httpx==0.26.0
EOF

echo -e "${GREEN}✅ requirements.txt créé${NC}"
echo ""

# ========================================
# 4. CRÉER L'ENVIRONNEMENT VIRTUEL
# ========================================

echo -e "${BLUE}🐍 Création de l'environnement virtuel...${NC}"

python3 -m venv venv

echo -e "${GREEN}✅ Environnement virtuel créé${NC}"
echo ""

# ========================================
# 5. ACTIVER L'ENVIRONNEMENT
# ========================================

echo -e "${BLUE}🔧 Activation de l'environnement virtuel...${NC}"

# Détection de l'OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    source venv/Scripts/activate
else
    # macOS/Linux
    source venv/bin/activate
fi

echo -e "${GREEN}✅ Environnement activé${NC}"
echo ""

# ========================================
# 6. INSTALLER LES DÉPENDANCES
# ========================================

echo -e "${BLUE}📦 Installation des dépendances...${NC}"
echo -e "${YELLOW}⏳ Cela peut prendre quelques minutes...${NC}"

pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}✅ Dépendances installées${NC}"
echo ""

# ========================================
# 7. CRÉER LE FICHIER .env
# ========================================

echo -e "${BLUE}⚙️  Création du fichier .env...${NC}"

# Générer une clé secrète
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# Détecter le chemin Tesseract
if [ "$TESSERACT_INSTALLED" = true ]; then
    TESSERACT_PATH=$(which tesseract)
else
    TESSERACT_PATH="/usr/bin/tesseract"
fi

cat > .env << EOF
# Configuration PharmaVerif Backend
# Généré automatiquement le $(date)

APP_NAME=PharmaVerif API
DEBUG=True
ENVIRONMENT=development

API_V1_PREFIX=/api/v1
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

DATABASE_URL=sqlite+aiosqlite:///./pharmaverif.db

SECRET_KEY=$SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
ALLOWED_EXTENSIONS=.pdf,.xlsx,.xls,.csv

TESSERACT_PATH=$TESSERACT_PATH
OCR_LANGUAGE=fra
OCR_DPI=300
EOF

echo -e "${GREEN}✅ Fichier .env créé${NC}"
echo ""

# ========================================
# 8. CRÉER LES FICHIERS PRINCIPAUX
# ========================================

echo -e "${BLUE}📝 Création des fichiers de base...${NC}"

# config.py
cat > app/config.py << 'EOF'
"""Configuration PharmaVerif Backend"""
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "PharmaVerif API"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: list = ["http://localhost:5173"]
    DATABASE_URL: str = "sqlite+aiosqlite:///./pharmaverif.db"
    SECRET_KEY: str = "changeme"
    MAX_FILE_SIZE: int = 10485760
    UPLOAD_DIR: str = "uploads"
    TESSERACT_PATH: str = "/usr/bin/tesseract"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
EOF

# main.py
cat > app/main.py << 'EOF'
"""PharmaVerif Backend - FastAPI"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="API de vérification de factures pharmaceutiques"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "PharmaVerif API",
        "author": "Anas BENDAIKHA",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
EOF

echo -e "${GREEN}✅ Fichiers créés${NC}"
echo ""

# ========================================
# 9. CRÉER README
# ========================================

cat > README.md << 'EOF'
# PharmaVerif Backend

Backend FastAPI pour l'analyse de factures pharmaceutiques.

## Démarrage rapide

```bash
# Activer l'environnement
source venv/bin/activate  # macOS/Linux
# ou
venv\Scripts\activate  # Windows

# Lancer le serveur
uvicorn app.main:app --reload
```

L'API sera accessible sur : http://localhost:8000

Documentation : http://localhost:8000/docs

## Auteur

© 2026 Anas BENDAIKHA - Tous droits réservés
EOF

echo -e "${GREEN}✅ README créé${NC}"
echo ""

# ========================================
# 10. TESTER LE SERVEUR
# ========================================

echo -e "${BLUE}🧪 Test du serveur...${NC}"

# Lancer uvicorn en background
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
SERVER_PID=$!

# Attendre que le serveur démarre
sleep 3

# Tester l'endpoint
if curl -s http://127.0.0.1:8000/health | grep -q "healthy"; then
    echo -e "${GREEN}✅ Serveur fonctionnel !${NC}"
else
    echo -e "${RED}❌ Erreur serveur${NC}"
fi

# Arrêter le serveur
kill $SERVER_PID 2>/dev/null

echo ""

# ========================================
# FIN
# ========================================

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Configuration terminée avec succès !${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📖 Prochaines étapes :${NC}"
echo ""
echo "1. Activer l'environnement :"
echo -e "   ${YELLOW}source venv/bin/activate${NC}"
echo ""
echo "2. Lancer le serveur :"
echo -e "   ${YELLOW}uvicorn app.main:app --reload${NC}"
echo ""
echo "3. Accéder à la documentation :"
echo -e "   ${YELLOW}http://localhost:8000/docs${NC}"
echo ""
echo "4. Consulter le guide complet :"
echo -e "   ${YELLOW}../BACKEND_FASTAPI_GUIDE.md${NC}"
echo ""
echo -e "${BLUE}💡 Ressources :${NC}"
echo "   - API : http://localhost:8000"
echo "   - Docs : http://localhost:8000/docs"
echo "   - Health : http://localhost:8000/health"
echo ""
echo -e "${GREEN}Développé par Anas BENDAIKHA${NC}"
echo -e "${GREEN}© 2026 PharmaVerif - Tous droits réservés${NC}"
echo ""
