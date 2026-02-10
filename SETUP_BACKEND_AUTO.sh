#!/bin/bash

# ========================================
# PharmaVerif - Script Setup Backend Automatique
# Copyright (c) 2026 Anas BENDAIKHA
# Tous droits réservés
# ========================================

set -e  # Arrêter en cas d'erreur

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🏥 PharmaVerif Backend - Setup Automatique              ║"
echo "║  Copyright © 2026 Anas BENDAIKHA                         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# ========================================
# VÉRIFICATIONS PRÉALABLES
# ========================================

echo "🔍 Vérifications préalables..."

# Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 n'est pas installé"
    echo "   Installer avec: brew install python3 (macOS) ou apt install python3 (Linux)"
    exit 1
fi
echo "✅ Python 3 trouvé: $(python3 --version)"

# Git
if ! command -v git &> /dev/null; then
    echo "⚠️  Git n'est pas installé (optionnel)"
fi

# Tesseract
if ! command -v tesseract &> /dev/null; then
    echo "⚠️  Tesseract OCR n'est pas installé"
    echo "   Pour installer: brew install tesseract (macOS) ou apt install tesseract-ocr (Linux)"
    echo "   OCR sera désactivé jusqu'à installation"
else
    echo "✅ Tesseract trouvé: $(tesseract --version | head -n 1)"
fi

echo ""

# ========================================
# CRÉATION DE LA STRUCTURE
# ========================================

echo "📁 Création de la structure backend..."

# Dossiers principaux
mkdir -p backend/app/{api/routes,services,core,db}
mkdir -p backend/alembic/versions
mkdir -p backend/{uploads,exports,logs}
mkdir -p backend/tests

echo "   ✓ Dossiers créés"

# ========================================
# COPIE DES FICHIERS
# ========================================

echo ""
echo "📄 Copie des fichiers sources..."

# Core files
if [ -f "BACKEND_MODELS.py" ]; then
    cp BACKEND_MODELS.py backend/app/models.py
    echo "   ✓ models.py"
fi

if [ -f "BACKEND_DATABASE.py" ]; then
    cp BACKEND_DATABASE.py backend/app/database.py
    echo "   ✓ database.py"
fi

if [ -f "BACKEND_CONFIG_COMPLETE.py" ]; then
    cp BACKEND_CONFIG_COMPLETE.py backend/app/config.py
    echo "   ✓ config.py"
fi

if [ -f "API_MAIN.py" ]; then
    cp API_MAIN.py backend/app/main.py
    echo "   ✓ main.py"
fi

if [ -f "API_SCHEMAS.py" ]; then
    cp API_SCHEMAS.py backend/app/schemas.py
    echo "   ✓ schemas.py"
fi

# Routes API
if [ -f "API_AUTH_ROUTES.py" ]; then
    cp API_AUTH_ROUTES.py backend/app/api/routes/auth.py
    echo "   ✓ routes/auth.py"
fi

if [ -f "API_FACTURES_ROUTES.py" ]; then
    cp API_FACTURES_ROUTES.py backend/app/api/routes/factures.py
    echo "   ✓ routes/factures.py"
fi

if [ -f "API_STATS_ROUTES.py" ]; then
    cp API_STATS_ROUTES.py backend/app/api/routes/stats.py
    echo "   ✓ routes/stats.py"
fi

# Services
if [ -f "OCR_SERVICE_COMPLETE.py" ]; then
    cp OCR_SERVICE_COMPLETE.py backend/app/services/ocr_service.py
    echo "   ✓ services/ocr_service.py"
fi

if [ -f "BACKEND_EXCEL_PARSER.py" ]; then
    cp BACKEND_EXCEL_PARSER.py backend/app/services/excel_parser.py
    echo "   ✓ services/excel_parser.py"
fi

# Core
if [ -f "API_EXCEPTIONS.py" ]; then
    cp API_EXCEPTIONS.py backend/app/core/exceptions.py
    echo "   ✓ core/exceptions.py"
fi

if [ -f "BACKEND_SECURITY.py" ]; then
    cp BACKEND_SECURITY.py backend/app/core/security.py
    echo "   ✓ core/security.py"
fi

# Config files
if [ -f "BACKEND_REQUIREMENTS.txt" ]; then
    cp BACKEND_REQUIREMENTS.txt backend/requirements.txt
    echo "   ✓ requirements.txt"
fi

if [ -f "BACKEND_DOCKERFILE.txt" ]; then
    cp BACKEND_DOCKERFILE.txt backend/Dockerfile
    echo "   ✓ Dockerfile"
fi

if [ -f "BACKEND_DOCKER_COMPOSE.yml" ]; then
    cp BACKEND_DOCKER_COMPOSE.yml docker-compose.yml
    echo "   ✓ docker-compose.yml"
fi

if [ -f "BACKEND_ENV_TEMPLATE.txt" ]; then
    cp BACKEND_ENV_TEMPLATE.txt backend/.env.example
    echo "   ✓ .env.example"
fi

# Alembic
if [ -f "BACKEND_ALEMBIC_INI.txt" ]; then
    cp BACKEND_ALEMBIC_INI.txt backend/alembic.ini
    echo "   ✓ alembic.ini"
fi

if [ -f "BACKEND_ALEMBIC_ENV.py" ]; then
    cp BACKEND_ALEMBIC_ENV.py backend/alembic/env.py
    echo "   ✓ alembic/env.py"
fi

if [ -f "BACKEND_ALEMBIC_SCRIPT_MAKO.txt" ]; then
    cp BACKEND_ALEMBIC_SCRIPT_MAKO.txt backend/alembic/script.py.mako
    echo "   ✓ alembic/script.py.mako"
fi

# ========================================
# CRÉATION DES __init__.py
# ========================================

echo ""
echo "🐍 Création des fichiers __init__.py..."

touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/api/routes/__init__.py
touch backend/app/services/__init__.py
touch backend/app/core/__init__.py
touch backend/app/db/__init__.py

echo "   ✓ Fichiers __init__.py créés"

# ========================================
# CRÉATION .env
# ========================================

echo ""
echo "⚙️  Configuration .env..."

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    
    # Générer SECRET_KEY automatiquement
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    
    # Remplacer dans .env (macOS et Linux compatible)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/SECRET_KEY=CHANGEZ_MOI_EN_PRODUCTION_UTILISEZ_UNE_CLE_ALEATOIRE_DE_32_CARACTERES/SECRET_KEY=$SECRET_KEY/" backend/.env
    else
        # Linux
        sed -i "s/SECRET_KEY=CHANGEZ_MOI_EN_PRODUCTION_UTILISEZ_UNE_CLE_ALEATOIRE_DE_32_CARACTERES/SECRET_KEY=$SECRET_KEY/" backend/.env
    fi
    
    echo "   ✓ Fichier .env créé avec SECRET_KEY sécurisé"
else
    echo "   ⚠️  .env existe déjà, non modifié"
fi

# ========================================
# CRÉATION ENVIRONNEMENT VIRTUEL
# ========================================

echo ""
echo "📦 Création de l'environnement virtuel..."

cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "   ✓ Environnement virtuel créé"
else
    echo "   ⚠️  venv existe déjà"
fi

# ========================================
# INSTALLATION DES DÉPENDANCES
# ========================================

echo ""
echo "📥 Installation des dépendances Python..."
echo "   (Cela peut prendre quelques minutes...)"

source venv/bin/activate

pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt

echo "   ✓ Dépendances installées"

# ========================================
# INITIALISATION DATABASE
# ========================================

echo ""
echo "🗄️  Initialisation de la base de données..."

python << EOF
try:
    from app.database import init_database
    init_database()
    print("   ✓ Base de données initialisée")
except Exception as e:
    print(f"   ⚠️  Erreur initialisation DB: {str(e)}")
EOF

# ========================================
# CRÉATION .gitignore
# ========================================

echo ""
echo "📝 Création .gitignore..."

cat > .gitignore << 'GITIGNORE'
# Environment
.env
.env.local
.env.production

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
ENV/
env/
*.egg-info/
.pytest_cache/

# Database
*.db
*.sqlite3

# Uploads & Exports
uploads/
exports/
logs/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
GITIGNORE

echo "   ✓ .gitignore créé"

cd ..

# ========================================
# RÉSUMÉ
# ========================================

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  ✅ Backend configuré avec succès!                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📂 Structure créée dans: ./backend/"
echo ""
echo "📊 Fichiers créés:"
echo "   • Models SQLAlchemy"
echo "   • Configuration complète"
echo "   • Routes API (auth, factures, stats)"
echo "   • Service OCR multi-providers"
echo "   • Parser Excel/CSV"
echo "   • Docker setup"
echo "   • Base de données SQLite initialisée"
echo ""
echo "👥 Comptes de test créés:"
echo "   Admin:"
echo "     Email: admin@pharmaverif.com"
echo "     Password: Admin123!"
echo ""
echo "   Pharmacien:"
echo "     Email: pharmacien@pharmaverif.com"
echo "     Password: Pharma123!"
echo ""
echo "🚀 Pour démarrer le serveur:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload"
echo ""
echo "📖 Documentation API:"
echo "   http://localhost:8000/api/docs"
echo ""
echo "🐳 Avec Docker:"
echo "   docker-compose up -d"
echo ""
echo "📚 Guides disponibles:"
echo "   • DEPLOYMENT_COMPLETE_GUIDE.md - Déploiement production"
echo "   • BACKEND_STRUCTURE_FINALE.md - Structure détaillée"
echo "   • OCR_QUICKSTART.md - Configuration OCR"
echo ""
echo "💡 Prochaines étapes recommandées:"
echo "   1. Tester l'API localement"
echo "   2. Configurer le frontend (.env.local)"
echo "   3. Déployer sur Railway/Render (voir guide)"
echo ""
echo "✨ Développé avec ❤️  par Anas BENDAIKHA"
echo "   © 2026 - Tous droits réservés"
echo ""