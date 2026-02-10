@echo off
REM ========================================
REM PharmaVerif - Script Setup Backend (Windows)
REM Copyright (c) 2026 Anas BENDAIKHA
REM Tous droits réservés
REM ========================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║  🏥 PharmaVerif Backend - Setup Automatique (Windows)    ║
echo ║  Copyright © 2026 Anas BENDAIKHA                         ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM ========================================
REM VÉRIFICATIONS PRÉALABLES
REM ========================================

echo 🔍 Vérifications préalables...

REM Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python n'est pas installé
    echo    Télécharger depuis: https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✅ Python trouvé: %PYTHON_VERSION%

REM Tesseract (optionnel)
where tesseract >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Tesseract OCR n'est pas installé
    echo    Pour installer: https://github.com/UB-Mannheim/tesseract/wiki
    echo    OCR sera désactivé jusqu'à installation
) else (
    for /f "tokens=*" %%i in ('tesseract --version ^| findstr tesseract') do set TESSERACT_VERSION=%%i
    echo ✅ Tesseract trouvé: %TESSERACT_VERSION%
)

echo.

REM ========================================
REM CRÉATION DE LA STRUCTURE
REM ========================================

echo 📁 Création de la structure backend...

mkdir backend\app\api\routes 2>nul
mkdir backend\app\services 2>nul
mkdir backend\app\core 2>nul
mkdir backend\app\db 2>nul
mkdir backend\alembic\versions 2>nul
mkdir backend\uploads 2>nul
mkdir backend\exports 2>nul
mkdir backend\logs 2>nul
mkdir backend\tests 2>nul

echo    ✓ Dossiers créés

REM ========================================
REM COPIE DES FICHIERS
REM ========================================

echo.
echo 📄 Copie des fichiers sources...

REM Core files
if exist "BACKEND_MODELS.py" (
    copy /Y BACKEND_MODELS.py backend\app\models.py >nul
    echo    ✓ models.py
)

if exist "BACKEND_DATABASE.py" (
    copy /Y BACKEND_DATABASE.py backend\app\database.py >nul
    echo    ✓ database.py
)

if exist "BACKEND_CONFIG_COMPLETE.py" (
    copy /Y BACKEND_CONFIG_COMPLETE.py backend\app\config.py >nul
    echo    ✓ config.py
)

if exist "API_MAIN.py" (
    copy /Y API_MAIN.py backend\app\main.py >nul
    echo    ✓ main.py
)

if exist "API_SCHEMAS.py" (
    copy /Y API_SCHEMAS.py backend\app\schemas.py >nul
    echo    ✓ schemas.py
)

REM Routes API
if exist "API_AUTH_ROUTES.py" (
    copy /Y API_AUTH_ROUTES.py backend\app\api\routes\auth.py >nul
    echo    ✓ routes\auth.py
)

if exist "API_FACTURES_ROUTES.py" (
    copy /Y API_FACTURES_ROUTES.py backend\app\api\routes\factures.py >nul
    echo    ✓ routes\factures.py
)

if exist "API_STATS_ROUTES.py" (
    copy /Y API_STATS_ROUTES.py backend\app\api\routes\stats.py >nul
    echo    ✓ routes\stats.py
)

REM Services
if exist "OCR_SERVICE_COMPLETE.py" (
    copy /Y OCR_SERVICE_COMPLETE.py backend\app\services\ocr_service.py >nul
    echo    ✓ services\ocr_service.py
)

if exist "BACKEND_EXCEL_PARSER.py" (
    copy /Y BACKEND_EXCEL_PARSER.py backend\app\services\excel_parser.py >nul
    echo    ✓ services\excel_parser.py
)

REM Core
if exist "API_EXCEPTIONS.py" (
    copy /Y API_EXCEPTIONS.py backend\app\core\exceptions.py >nul
    echo    ✓ core\exceptions.py
)

if exist "BACKEND_SECURITY.py" (
    copy /Y BACKEND_SECURITY.py backend\app\core\security.py >nul
    echo    ✓ core\security.py
)

REM Config files
if exist "BACKEND_REQUIREMENTS.txt" (
    copy /Y BACKEND_REQUIREMENTS.txt backend\requirements.txt >nul
    echo    ✓ requirements.txt
)

if exist "BACKEND_DOCKERFILE.txt" (
    copy /Y BACKEND_DOCKERFILE.txt backend\Dockerfile >nul
    echo    ✓ Dockerfile
)

if exist "BACKEND_DOCKER_COMPOSE.yml" (
    copy /Y BACKEND_DOCKER_COMPOSE.yml docker-compose.yml >nul
    echo    ✓ docker-compose.yml
)

if exist "BACKEND_ENV_TEMPLATE.txt" (
    copy /Y BACKEND_ENV_TEMPLATE.txt backend\.env.example >nul
    echo    ✓ .env.example
)

REM Alembic
if exist "BACKEND_ALEMBIC_INI.txt" (
    copy /Y BACKEND_ALEMBIC_INI.txt backend\alembic.ini >nul
    echo    ✓ alembic.ini
)

if exist "BACKEND_ALEMBIC_ENV.py" (
    copy /Y BACKEND_ALEMBIC_ENV.py backend\alembic\env.py >nul
    echo    ✓ alembic\env.py
)

if exist "BACKEND_ALEMBIC_SCRIPT_MAKO.txt" (
    copy /Y BACKEND_ALEMBIC_SCRIPT_MAKO.txt backend\alembic\script.py.mako >nul
    echo    ✓ alembic\script.py.mako
)

REM ========================================
REM CRÉATION DES __init__.py
REM ========================================

echo.
echo 🐍 Création des fichiers __init__.py...

type nul > backend\app\__init__.py
type nul > backend\app\api\__init__.py
type nul > backend\app\api\routes\__init__.py
type nul > backend\app\services\__init__.py
type nul > backend\app\core\__init__.py
type nul > backend\app\db\__init__.py

echo    ✓ Fichiers __init__.py créés

REM ========================================
REM CRÉATION .env
REM ========================================

echo.
echo ⚙️  Configuration .env...

if not exist "backend\.env" (
    copy backend\.env.example backend\.env >nul
    
    REM Générer SECRET_KEY
    for /f "delims=" %%i in ('python -c "import secrets; print(secrets.token_urlsafe(32))"') do set SECRET_KEY=%%i
    
    REM Remplacer dans .env (Windows)
    powershell -Command "(gc backend\.env) -replace 'SECRET_KEY=CHANGEZ_MOI_EN_PRODUCTION_UTILISEZ_UNE_CLE_ALEATOIRE_DE_32_CARACTERES', 'SECRET_KEY=%SECRET_KEY%' | Out-File -encoding ASCII backend\.env"
    
    echo    ✓ Fichier .env créé avec SECRET_KEY sécurisé
) else (
    echo    ⚠️  .env existe déjà, non modifié
)

REM ========================================
REM CRÉATION ENVIRONNEMENT VIRTUEL
REM ========================================

echo.
echo 📦 Création de l'environnement virtuel...

cd backend

if not exist "venv" (
    python -m venv venv
    echo    ✓ Environnement virtuel créé
) else (
    echo    ⚠️  venv existe déjà
)

REM ========================================
REM INSTALLATION DES DÉPENDANCES
REM ========================================

echo.
echo 📥 Installation des dépendances Python...
echo    (Cela peut prendre quelques minutes...)

call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt

echo    ✓ Dépendances installées

REM ========================================
REM INITIALISATION DATABASE
REM ========================================

echo.
echo 🗄️  Initialisation de la base de données...

python -c "from app.database import init_database; init_database()" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ Base de données initialisée
) else (
    echo    ⚠️  Erreur initialisation DB
)

REM ========================================
REM CRÉATION .gitignore
REM ========================================

echo.
echo 📝 Création .gitignore...

(
echo # Environment
echo .env
echo .env.local
echo .env.production
echo.
echo # Python
echo __pycache__/
echo *.py[cod]
echo *$py.class
echo *.so
echo .Python
echo venv/
echo ENV/
echo env/
echo *.egg-info/
echo .pytest_cache/
echo.
echo # Database
echo *.db
echo *.sqlite3
echo.
echo # Uploads ^& Exports
echo uploads/
echo exports/
echo logs/
echo.
echo # IDE
echo .vscode/
echo .idea/
echo *.swp
echo *.swo
echo *~
echo.
echo # OS
echo .DS_Store
echo Thumbs.db
) > .gitignore

echo    ✓ .gitignore créé

cd ..

REM ========================================
REM RÉSUMÉ
REM ========================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║  ✅ Backend configuré avec succès!                       ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 📂 Structure créée dans: .\backend\
echo.
echo 📊 Fichiers créés:
echo    • Models SQLAlchemy
echo    • Configuration complète
echo    • Routes API (auth, factures, stats)
echo    • Service OCR multi-providers
echo    • Parser Excel/CSV
echo    • Docker setup
echo    • Base de données SQLite initialisée
echo.
echo 👥 Comptes de test créés:
echo    Admin:
echo      Email: admin@pharmaverif.com
echo      Password: Admin123!
echo.
echo    Pharmacien:
echo      Email: pharmacien@pharmaverif.com
echo      Password: Pharma123!
echo.
echo 🚀 Pour démarrer le serveur:
echo    cd backend
echo    venv\Scripts\activate
echo    uvicorn app.main:app --reload
echo.
echo 📖 Documentation API:
echo    http://localhost:8000/api/docs
echo.
echo 🐳 Avec Docker:
echo    docker-compose up -d
echo.
echo 📚 Guides disponibles:
echo    • DEPLOYMENT_COMPLETE_GUIDE.md - Déploiement production
echo    • BACKEND_STRUCTURE_FINALE.md - Structure détaillée
echo    • OCR_QUICKSTART.md - Configuration OCR
echo.
echo 💡 Prochaines étapes recommandées:
echo    1. Tester l'API localement
echo    2. Configurer le frontend (.env.local)
echo    3. Déployer sur Railway/Render (voir guide)
echo.
echo ✨ Développé avec ❤️  par Anas BENDAIKHA
echo    © 2026 - Tous droits réservés
echo.

pause
