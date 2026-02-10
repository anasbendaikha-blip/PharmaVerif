@echo off
REM ========================================
REM Script de démarrage rapide Backend FastAPI (Windows)
REM Copyright (c) 2026 Anas BENDAIKHA
REM ========================================

echo ========================================
echo PharmaVerif - Configuration Backend
echo ========================================
echo.

REM ========================================
REM 1. VERIFICATION PYTHON
REM ========================================

echo [1/7] Verification de Python...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Python n'est pas installe
    echo Installez Python 3.10+ : https://www.python.org/downloads/
    pause
    exit /b 1
)

echo OK - Python installe
echo.

REM ========================================
REM 2. CREER LA STRUCTURE
REM ========================================

echo [2/7] Creation de la structure...

mkdir backend 2>nul
cd backend

mkdir app\api\routes 2>nul
mkdir app\models 2>nul
mkdir app\schemas 2>nul
mkdir app\services 2>nul
mkdir app\db 2>nul
mkdir app\core 2>nul
mkdir tests 2>nul
mkdir uploads 2>nul
mkdir logs 2>nul

REM Creer fichiers __init__.py
type nul > app\__init__.py
type nul > app\api\__init__.py
type nul > app\api\routes\__init__.py
type nul > app\models\__init__.py
type nul > app\schemas\__init__.py
type nul > app\services\__init__.py
type nul > app\db\__init__.py
type nul > app\core\__init__.py
type nul > tests\__init__.py

echo OK - Structure creee
echo.

REM ========================================
REM 3. CREER requirements.txt
REM ========================================

echo [3/7] Creation de requirements.txt...

(
echo fastapi==0.109.0
echo uvicorn[standard]==0.27.0
echo python-multipart==0.0.6
echo PyPDF2==3.0.1
echo pdfplumber==0.10.3
echo openpyxl==3.1.2
echo pandas==2.2.0
echo sqlalchemy==2.0.25
echo pydantic==2.5.3
echo pydantic-settings==2.1.0
echo python-dotenv==1.0.0
echo pillow==10.2.0
) > requirements.txt

echo OK - requirements.txt cree
echo.

REM ========================================
REM 4. CREER L'ENVIRONNEMENT VIRTUEL
REM ========================================

echo [4/7] Creation de l'environnement virtuel...

python -m venv venv

echo OK - Environnement cree
echo.

REM ========================================
REM 5. INSTALLER LES DEPENDANCES
REM ========================================

echo [5/7] Installation des dependances...
echo Cela peut prendre quelques minutes...

call venv\Scripts\activate.bat
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

echo OK - Dependances installees
echo.

REM ========================================
REM 6. CREER .env
REM ========================================

echo [6/7] Creation du fichier .env...

(
echo APP_NAME=PharmaVerif API
echo DEBUG=True
echo API_V1_PREFIX=/api/v1
echo ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
echo DATABASE_URL=sqlite+aiosqlite:///./pharmaverif.db
echo SECRET_KEY=changez-cette-cle-en-production
echo MAX_FILE_SIZE=10485760
echo UPLOAD_DIR=uploads
echo TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
) > .env

echo OK - .env cree
echo.

REM ========================================
REM 7. CREER LES FICHIERS
REM ========================================

echo [7/7] Creation des fichiers de base...

REM config.py
(
echo """Configuration PharmaVerif"""
echo from pydantic_settings import BaseSettings
echo from functools import lru_cache
echo.
echo class Settings^(BaseSettings^):
echo     APP_NAME: str = "PharmaVerif API"
echo     DEBUG: bool = True
echo     API_V1_PREFIX: str = "/api/v1"
echo     ALLOWED_ORIGINS: list = ["http://localhost:5173"]
echo     DATABASE_URL: str = "sqlite+aiosqlite:///./pharmaverif.db"
echo.
echo     class Config:
echo         env_file = ".env"
echo.
echo @lru_cache^(^)
echo def get_settings^(^):
echo     return Settings^(^)
echo.
echo settings = get_settings^(^)
) > app\config.py

REM main.py
(
echo """PharmaVerif Backend - FastAPI"""
echo from fastapi import FastAPI
echo from fastapi.middleware.cors import CORSMiddleware
echo from app.config import settings
echo.
echo app = FastAPI^(
echo     title=settings.APP_NAME,
echo     version="1.0.0"
echo ^)
echo.
echo app.add_middleware^(
echo     CORSMiddleware,
echo     allow_origins=settings.ALLOWED_ORIGINS,
echo     allow_credentials=True,
echo     allow_methods=["*"],
echo     allow_headers=["*"]
echo ^)
echo.
echo @app.get^("/")
echo def root^(^):
echo     return {"message": "PharmaVerif API", "author": "Anas BENDAIKHA"}
echo.
echo @app.get^("/health")
echo def health^(^):
echo     return {"status": "healthy"}
) > app\main.py

REM README
(
echo # PharmaVerif Backend
echo.
echo Backend FastAPI pour PharmaVerif
echo.
echo ## Demarrage
echo.
echo ```batch
echo venv\Scripts\activate
echo uvicorn app.main:app --reload
echo ```
echo.
echo API : http://localhost:8000
echo Docs : http://localhost:8000/docs
echo.
echo Auteur : Anas BENDAIKHA
) > README.md

echo OK - Fichiers crees
echo.

REM ========================================
REM FIN
REM ========================================

echo ========================================
echo INSTALLATION TERMINEE !
echo ========================================
echo.
echo Prochaines etapes :
echo.
echo 1. Activer l'environnement :
echo    venv\Scripts\activate
echo.
echo 2. Lancer le serveur :
echo    uvicorn app.main:app --reload
echo.
echo 3. Ouvrir la documentation :
echo    http://localhost:8000/docs
echo.
echo ========================================
echo Developpe par Anas BENDAIKHA
echo (c) 2026 PharmaVerif
echo ========================================
echo.

pause
