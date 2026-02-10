# 🐍 Guide Backend Python/FastAPI pour PharmaVerif

**Guide complet pour implémenter l'analyse PDF avec OCR**

Copyright © 2026 Anas BENDAIKHA - Tous droits réservés

---

## 📋 Table des matières

1. [Architecture globale](#architecture-globale)
2. [Installation et configuration](#installation-et-configuration)
3. [Structure du projet](#structure-du-projet)
4. [Implémentation du backend](#implémentation-du-backend)
5. [OCR et parsing PDF](#ocr-et-parsing-pdf)
6. [Connexion avec le frontend](#connexion-avec-le-frontend)
7. [Déploiement](#déploiement)
8. [Sécurité et bonnes pratiques](#sécurité-et-bonnes-pratiques)

---

## 🏗️ Architecture globale

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│  - Upload fichiers                                           │
│  - Affichage résultats                                       │
│  - Dashboard                                                 │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
                         │ (CORS enabled)
┌────────────────────────┴────────────────────────────────────┐
│                   BACKEND (FastAPI)                          │
│  - Endpoints REST                                            │
│  - Validation des fichiers                                   │
│  - Parser PDF/Excel/CSV                                      │
│  - Logique métier                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │   OCR   │    │ Database │    │  Queue   │
   │ Engine  │    │ (Postgres│    │ (Celery) │
   │         │    │  /Supabase)    │ (optionnel)
   └─────────┘    └──────────┘    └──────────┘
   - PyPDF2       - SQLAlchemy    - Tasks async
   - pdfplumber   - Alembic       - Redis
   - Tesseract    - Async ORM
```

---

## 🚀 Installation et configuration

### **Prérequis**

- **Python 3.10+** (recommandé : 3.11)
- **pip** ou **poetry**
- **Tesseract OCR** (pour PDFs scannés)
- **PostgreSQL** (ou Supabase)

### **1. Créer le dossier backend**

```bash
# À la racine du projet PharmaVerif
mkdir backend
cd backend
```

### **2. Créer l'environnement virtuel**

```bash
# Créer l'environnement
python3 -m venv venv

# Activer l'environnement
# Sur macOS/Linux :
source venv/bin/activate

# Sur Windows :
venv\Scripts\activate
```

### **3. Installer les dépendances**

Créez `requirements.txt` :

```txt
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

# Validation et sérialisation
pydantic==2.5.3
pydantic-settings==2.1.0

# Sécurité
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0

# CORS et middleware
starlette==0.36.0

# Utilitaires
python-dateutil==2.8.2
pillow==10.2.0

# Développement
pytest==7.4.4
httpx==0.26.0
black==24.1.1
flake8==7.0.0
```

```bash
pip install -r requirements.txt
```

### **4. Installer Tesseract OCR**

#### **macOS** :
```bash
brew install tesseract
brew install tesseract-lang  # Pour français
```

#### **Ubuntu/Debian** :
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
sudo apt-get install tesseract-ocr-fra  # Pour français
```

#### **Windows** :
1. Télécharger : https://github.com/UB-Mannheim/tesseract/wiki
2. Installer
3. Ajouter au PATH : `C:\Program Files\Tesseract-OCR`

#### **Vérifier l'installation** :
```bash
tesseract --version
# Doit afficher : tesseract 5.x.x
```

---

## 📁 Structure du projet backend

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Point d'entrée FastAPI
│   ├── config.py                  # Configuration (env vars)
│   │
│   ├── api/                       # Endpoints API
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── upload.py         # Upload de fichiers
│   │   │   ├── verification.py   # Vérification factures
│   │   │   ├── factures.py       # CRUD factures
│   │   │   └── grossistes.py     # CRUD grossistes
│   │   └── dependencies.py        # Dépendances (auth, DB)
│   │
│   ├── models/                    # Modèles SQLAlchemy
│   │   ├── __init__.py
│   │   ├── facture.py
│   │   ├── grossiste.py
│   │   ├── anomalie.py
│   │   └── user.py
│   │
│   ├── schemas/                   # Schémas Pydantic
│   │   ├── __init__.py
│   │   ├── facture.py
│   │   ├── grossiste.py
│   │   └── verification.py
│   │
│   ├── services/                  # Logique métier
│   │   ├── __init__.py
│   │   ├── pdf_parser.py         # Parsing PDF
│   │   ├── excel_parser.py       # Parsing Excel
│   │   ├── ocr_service.py        # Service OCR
│   │   ├── verification.py       # Logique vérification
│   │   └── file_handler.py       # Gestion fichiers
│   │
│   ├── db/                        # Database
│   │   ├── __init__.py
│   │   ├── session.py            # Sessions DB
│   │   └── base.py               # Base déclarative
│   │
│   └── core/                      # Utilitaires core
│       ├── __init__.py
│       ├── security.py           # Authentification
│       └── utils.py              # Fonctions utilitaires
│
├── alembic/                       # Migrations DB
│   ├── versions/
│   └── env.py
│
├── tests/                         # Tests
│   ├── __init__.py
│   ├── test_api.py
│   └── test_parsers.py
│
├── uploads/                       # Stockage temporaire
│   └── .gitkeep
│
├── .env                          # Variables d'environnement
├── .env.example                  # Template .env
├── requirements.txt              # Dépendances
├── alembic.ini                   # Config Alembic
└── README.md                     # Documentation backend
```

---

## 💻 Implémentation du backend

### **1. Configuration (`app/config.py`)**

```python
"""
Configuration de l'application PharmaVerif Backend
Copyright (c) 2026 Anas BENDAIKHA
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Configuration de l'application"""
    
    # Application
    APP_NAME: str = "PharmaVerif API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative
    ]
    
    # Base de données
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/pharmaverif"
    
    # Sécurité
    SECRET_KEY: str = "votre-clé-secrète-super-sécurisée-changez-moi"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS: set = {".pdf", ".xlsx", ".xls", ".csv"}
    UPLOAD_DIR: str = "uploads"
    
    # OCR
    TESSERACT_PATH: str = "/usr/bin/tesseract"  # Ajuster selon OS
    OCR_LANGUAGE: str = "fra"  # Français
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Obtenir les settings (cached)"""
    return Settings()


settings = get_settings()
```

### **2. Main FastAPI (`app/main.py`)**

```python
"""
PharmaVerif Backend - Point d'entrée FastAPI
Copyright (c) 2026 Anas BENDAIKHA
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.api.routes import upload, verification, factures, grossistes

# Créer l'application FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API de vérification de factures pharmaceutiques",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monter le dossier uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routes
app.include_router(upload.router, prefix=f"{settings.API_V1_PREFIX}/upload", tags=["Upload"])
app.include_router(verification.router, prefix=f"{settings.API_V1_PREFIX}/verification", tags=["Verification"])
app.include_router(factures.router, prefix=f"{settings.API_V1_PREFIX}/factures", tags=["Factures"])
app.include_router(grossistes.router, prefix=f"{settings.API_V1_PREFIX}/grossistes", tags=["Grossistes"])


@app.get("/")
async def root():
    """Page d'accueil de l'API"""
    return {
        "message": "PharmaVerif API",
        "version": settings.APP_VERSION,
        "author": "Anas BENDAIKHA",
        "docs": "/api/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "pharmaverif-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload en dev
    )
```

### **3. Service OCR (`app/services/ocr_service.py`)**

```python
"""
Service OCR pour extraction de texte depuis PDF
Copyright (c) 2026 Anas BENDAIKHA
"""

import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import tempfile
import os
from pathlib import Path
from app.config import settings


class OCRService:
    """Service d'extraction de texte par OCR"""
    
    def __init__(self):
        """Initialiser le service OCR"""
        # Configurer le chemin Tesseract
        if settings.TESSERACT_PATH:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH
    
    def extract_text_from_image(self, image_path: str) -> str:
        """
        Extraire le texte d'une image avec Tesseract
        
        Args:
            image_path: Chemin vers l'image
            
        Returns:
            Texte extrait
        """
        try:
            image = Image.open(image_path)
            
            # Configuration OCR optimisée pour factures
            custom_config = r'--oem 3 --psm 6'
            
            text = pytesseract.image_to_string(
                image,
                lang=settings.OCR_LANGUAGE,
                config=custom_config
            )
            
            return text.strip()
            
        except Exception as e:
            raise Exception(f"Erreur OCR sur image : {str(e)}")
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extraire le texte d'un PDF (converti en images)
        
        Args:
            pdf_path: Chemin vers le PDF
            
        Returns:
            Texte extrait de toutes les pages
        """
        try:
            # Créer un dossier temporaire pour les images
            with tempfile.TemporaryDirectory() as temp_dir:
                # Convertir PDF en images
                images = convert_from_path(
                    pdf_path,
                    dpi=300,  # Haute résolution pour OCR
                    output_folder=temp_dir,
                    fmt='png'
                )
                
                extracted_text = []
                
                # OCR sur chaque page
                for i, image in enumerate(images):
                    image_path = os.path.join(temp_dir, f"page_{i}.png")
                    image.save(image_path, 'PNG')
                    
                    page_text = self.extract_text_from_image(image_path)
                    extracted_text.append(f"--- PAGE {i+1} ---\n{page_text}")
                
                return "\n\n".join(extracted_text)
                
        except Exception as e:
            raise Exception(f"Erreur OCR sur PDF : {str(e)}")
    
    def extract_structured_data(self, text: str) -> dict:
        """
        Extraire des données structurées depuis le texte OCR
        (Cette fonction doit être adaptée au format de vos factures)
        
        Args:
            text: Texte brut extrait
            
        Returns:
            Dictionnaire avec données structurées
        """
        import re
        
        data = {
            "numero_facture": None,
            "date": None,
            "grossiste": None,
            "lignes": [],
            "totaux": {}
        }
        
        # Exemple de regex pour numéro de facture
        numero_match = re.search(r'(?:Facture|N°)\s*:?\s*([A-Z0-9-]+)', text, re.IGNORECASE)
        if numero_match:
            data["numero_facture"] = numero_match.group(1)
        
        # Date
        date_match = re.search(r'(?:Date)\s*:?\s*(\d{2}/\d{2}/\d{4})', text, re.IGNORECASE)
        if date_match:
            data["date"] = date_match.group(1)
        
        # Grossiste
        grossiste_match = re.search(r'(?:Grossiste|Fournisseur)\s*:?\s*([A-Za-zÀ-ÿ\s]+)', text, re.IGNORECASE)
        if grossiste_match:
            data["grossiste"] = grossiste_match.group(1).strip()
        
        # TODO: Parser les lignes de produits
        # Ceci dépend fortement du format de vos factures
        
        return data


# Instance singleton
ocr_service = OCRService()
```

### **4. Parser PDF (`app/services/pdf_parser.py`)**

```python
"""
Parser PDF pour factures pharmaceutiques
Copyright (c) 2026 Anas BENDAIKHA
"""

import PyPDF2
import pdfplumber
from pathlib import Path
from typing import Dict, List, Optional
from app.services.ocr_service import ocr_service


class PDFParser:
    """Parser pour extraire des données de PDFs"""
    
    def __init__(self):
        """Initialiser le parser"""
        pass
    
    def is_pdf_searchable(self, pdf_path: str) -> bool:
        """
        Vérifier si le PDF contient du texte extractible
        
        Args:
            pdf_path: Chemin vers le PDF
            
        Returns:
            True si texte extractible, False sinon
        """
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                
                # Vérifier les premières pages
                for page_num in range(min(3, len(reader.pages))):
                    page = reader.pages[page_num]
                    text = page.extract_text()
                    
                    # Si on trouve du texte significatif
                    if text and len(text.strip()) > 50:
                        return True
                
                return False
                
        except Exception:
            return False
    
    def extract_text_pypdf2(self, pdf_path: str) -> str:
        """
        Extraire le texte avec PyPDF2 (PDFs texte)
        
        Args:
            pdf_path: Chemin vers le PDF
            
        Returns:
            Texte extrait
        """
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text_parts = []
                
                for page in reader.pages:
                    text_parts.append(page.extract_text())
                
                return "\n\n".join(text_parts)
                
        except Exception as e:
            raise Exception(f"Erreur PyPDF2 : {str(e)}")
    
    def extract_tables_pdfplumber(self, pdf_path: str) -> List[List[List[str]]]:
        """
        Extraire les tableaux avec pdfplumber
        
        Args:
            pdf_path: Chemin vers le PDF
            
        Returns:
            Liste de tableaux (chaque tableau = liste de lignes)
        """
        try:
            tables = []
            
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_tables = page.extract_tables()
                    if page_tables:
                        tables.extend(page_tables)
            
            return tables
            
        except Exception as e:
            raise Exception(f"Erreur pdfplumber : {str(e)}")
    
    def parse_invoice_pdf(self, pdf_path: str) -> Dict:
        """
        Parser complet d'une facture PDF
        
        Args:
            pdf_path: Chemin vers le PDF
            
        Returns:
            Données structurées de la facture
        """
        result = {
            "success": False,
            "method": None,
            "data": None,
            "error": None
        }
        
        try:
            # 1. Vérifier si PDF searchable
            is_searchable = self.is_pdf_searchable(pdf_path)
            
            if is_searchable:
                # PDF avec texte extractible
                result["method"] = "pdfplumber"
                
                # Extraire les tableaux
                tables = self.extract_tables_pdfplumber(pdf_path)
                
                # Extraire le texte
                text = self.extract_text_pypdf2(pdf_path)
                
                # Parser les données
                result["data"] = self._parse_extracted_data(text, tables)
                result["success"] = True
                
            else:
                # PDF scanné -> OCR
                result["method"] = "ocr"
                
                # Utiliser l'OCR
                text = ocr_service.extract_text_from_pdf(pdf_path)
                
                # Parser les données OCR
                result["data"] = ocr_service.extract_structured_data(text)
                result["success"] = True
            
            return result
            
        except Exception as e:
            result["error"] = str(e)
            return result
    
    def _parse_extracted_data(self, text: str, tables: List) -> Dict:
        """
        Parser les données extraites (texte + tableaux)
        
        Args:
            text: Texte extrait
            tables: Tableaux extraits
            
        Returns:
            Données structurées
        """
        import re
        
        data = {
            "numero": None,
            "date": None,
            "grossiste": None,
            "lignes": [],
            "total_brut_ht": 0,
            "total_remises": 0,
            "net_a_payer": 0,
        }
        
        # Extraire numéro de facture
        numero_match = re.search(r'(?:Facture|N°|Numero)\s*:?\s*([A-Z0-9-]+)', text, re.IGNORECASE)
        if numero_match:
            data["numero"] = numero_match.group(1)
        
        # Extraire date
        date_match = re.search(r'(?:Date)\s*:?\s*(\d{2}[/-]\d{2}[/-]\d{4})', text, re.IGNORECASE)
        if date_match:
            date_str = date_match.group(1).replace('/', '-')
            data["date"] = date_str
        
        # Parser les tableaux pour les lignes de produits
        if tables:
            # Prendre le tableau le plus grand (généralement le tableau de produits)
            main_table = max(tables, key=len)
            
            # TODO: Adapter cette logique à vos factures
            # Exemple basique :
            for row in main_table[1:]:  # Skip header
                if row and len(row) >= 3:
                    try:
                        ligne = {
                            "designation": row[0] if row[0] else "",
                            "quantite": float(row[1]) if row[1] else 0,
                            "prix_unitaire": float(row[2].replace(',', '.')) if row[2] else 0,
                            "total": float(row[-1].replace(',', '.')) if row[-1] else 0,
                        }
                        data["lignes"].append(ligne)
                    except (ValueError, IndexError):
                        continue
        
        # Extraire totaux
        total_match = re.search(r'(?:Total HT|Montant HT)\s*:?\s*([\d\s,]+)', text, re.IGNORECASE)
        if total_match:
            total_str = total_match.group(1).replace(' ', '').replace(',', '.')
            try:
                data["total_brut_ht"] = float(total_str)
            except ValueError:
                pass
        
        net_match = re.search(r'(?:Net à payer|Total TTC)\s*:?\s*([\d\s,]+)', text, re.IGNORECASE)
        if net_match:
            net_str = net_match.group(1).replace(' ', '').replace(',', '.')
            try:
                data["net_a_payer"] = float(net_str)
            except ValueError:
                pass
        
        return data


# Instance singleton
pdf_parser = PDFParser()
```

### **5. Route Upload (`app/api/routes/upload.py`)**

```python
"""
Route d'upload de fichiers
Copyright (c) 2026 Anas BENDAIKHA
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import shutil
import uuid
from app.config import settings
from app.services.pdf_parser import pdf_parser
from app.services.excel_parser import excel_parser  # À créer

router = APIRouter()


def validate_file(file: UploadFile) -> None:
    """Valider le fichier uploadé"""
    
    # Vérifier l'extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extension non autorisée. Extensions acceptées : {settings.ALLOWED_EXTENSIONS}"
        )
    
    # TODO: Vérifier la taille (nécessite de lire le fichier)


@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload et parse un fichier de facture
    
    Formats supportés : PDF, Excel (.xlsx, .xls), CSV
    """
    
    try:
        # Valider le fichier
        validate_file(file)
        
        # Créer un nom de fichier unique
        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = Path(settings.UPLOAD_DIR) / unique_filename
        
        # Créer le dossier upload si nécessaire
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Sauvegarder le fichier
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Parser selon le type
        result = None
        
        if file_ext == ".pdf":
            result = pdf_parser.parse_invoice_pdf(str(file_path))
        elif file_ext in [".xlsx", ".xls"]:
            result = excel_parser.parse_excel(str(file_path))
        elif file_ext == ".csv":
            result = excel_parser.parse_csv(str(file_path))
        
        # Supprimer le fichier temporaire (optionnel)
        # file_path.unlink()
        
        if result and result.get("success"):
            return JSONResponse(content={
                "success": True,
                "filename": file.filename,
                "file_id": unique_filename,
                "method": result.get("method"),
                "data": result.get("data"),
            })
        else:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Erreur lors du parsing")
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur serveur : {str(e)}"
        )


@router.get("/test")
async def test_upload():
    """Test endpoint"""
    return {
        "message": "Upload endpoint fonctionnel",
        "allowed_extensions": list(settings.ALLOWED_EXTENSIONS),
        "max_size_mb": settings.MAX_FILE_SIZE / (1024 * 1024)
    }
```

---

## 🔗 Connexion avec le frontend

### **1. Créer un client API (`/src/app/api/client.ts`)**

```typescript
/**
 * Client API pour communiquer avec le backend FastAPI
 * Copyright (c) 2026 Anas BENDAIKHA
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE_URL}/api/v1`;

export interface UploadResponse {
  success: boolean;
  filename: string;
  file_id: string;
  method: 'pdfplumber' | 'ocr' | 'excel';
  data: any;
}

/**
 * Upload un fichier vers le backend
 */
export async function uploadInvoiceFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_V1}/upload/`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erreur lors de l\'upload');
  }

  return response.json();
}

/**
 * Vérifier une facture
 */
export async function verifyInvoice(data: any) {
  const response = await fetch(`${API_V1}/verification/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Erreur lors de la vérification');
  }

  return response.json();
}

/**
 * Récupérer toutes les factures
 */
export async function getAllFactures() {
  const response = await fetch(`${API_V1}/factures/`);
  
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des factures');
  }

  return response.json();
}
```

### **2. Mettre à jour VerificationPage pour utiliser le backend**

```typescript
// Dans handleVerification de VerificationPage.tsx

const handleVerification = async () => {
  if (!selectedFile || !selectedGrossisteId) return;

  setIsVerifying(true);
  setVerificationComplete(false);

  try {
    // 1. Upload vers le backend FastAPI
    const uploadResult = await uploadInvoiceFile(selectedFile);

    if (!uploadResult.success) {
      throw new Error('Échec du parsing côté serveur');
    }

    toast.success(`Fichier analysé (${uploadResult.method})`, {
      description: `${uploadResult.data?.lignes?.length || 0} lignes détectées`
    });

    // 2. Convertir les données backend en format frontend
    const facture = convertBackendDataToFacture(
      uploadResult.data,
      parseInt(selectedGrossisteId)
    );

    // 3. Sauvegarder et vérifier...
    // (reste du code existant)

  } catch (error) {
    toast.error('Erreur', {
      description: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  } finally {
    setIsVerifying(false);
  }
};
```

### **3. Ajouter variable d'environnement**

Créer `/src/.env` :

```env
VITE_API_URL=http://localhost:8000
```

---

## 🚀 Lancement

### **1. Démarrer le backend**

```bash
cd backend
source venv/bin/activate  # Activer l'environnement

# Lancer FastAPI
uvicorn app.main:app --reload --port 8000

# Ou avec python
python app/main.py
```

L'API sera accessible sur : **http://localhost:8000**

Documentation : **http://localhost:8000/api/docs**

### **2. Démarrer le frontend**

```bash
# Dans un autre terminal
cd ..  # Retour à la racine
npm run dev
```

Frontend sur : **http://localhost:5173**

---

## 📊 Tester l'API

### **Avec cURL**

```bash
# Upload un fichier PDF
curl -X POST "http://localhost:8000/api/v1/upload/" \
  -F "file=@facture.pdf"
```

### **Avec l'interface Swagger**

Aller sur : **http://localhost:8000/api/docs**

1. Cliquer sur `/api/v1/upload/`
2. "Try it out"
3. Choisir un fichier
4. "Execute"

---

## 🔒 Sécurité et bonnes pratiques

### **1. Variables d'environnement**

Créer `backend/.env` :

```env
# Application
DEBUG=True
APP_NAME=PharmaVerif API

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/pharmaverif

# Security
SECRET_KEY=changez-cette-clé-en-production-utilisez-secrets.token_urlsafe(32)

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# OCR
TESSERACT_PATH=/usr/bin/tesseract
```

### **2. Validation stricte**

- ✅ Vérifier les extensions de fichiers
- ✅ Limiter la taille des uploads
- ✅ Valider les données avec Pydantic
- ✅ Sanitiser les noms de fichiers

### **3. Authentification (optionnel)**

Pour sécuriser l'API, ajouter JWT :

```python
# app/core/security.py
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

---

## 📦 Déploiement

### **Options de déploiement**

1. **Railway** - Simple et gratuit pour commencer
2. **Heroku** - Classique avec addons PostgreSQL
3. **DigitalOcean App Platform** - Facile avec Docker
4. **AWS EC2** - Contrôle total
5. **Render** - Moderne et simple

### **Dockerfile exemple**

```dockerfile
FROM python:3.11-slim

# Installer Tesseract
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-fra \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## ✅ Checklist complète

- [ ] Python 3.10+ installé
- [ ] Tesseract OCR installé
- [ ] Backend créé avec structure
- [ ] Dépendances installées
- [ ] Configuration `.env` créée
- [ ] OCR service implémenté
- [ ] PDF parser implémenté
- [ ] Excel parser implémenté
- [ ] Routes API créées
- [ ] CORS configuré
- [ ] Client API frontend créé
- [ ] Tests effectués
- [ ] Documentation à jour

---

## 🎯 Prochaines étapes

1. **Database** : Implémenter SQLAlchemy + Alembic
2. **Authentification** : Ajouter JWT
3. **Tests** : Pytest pour les endpoints
4. **Cache** : Redis pour performances
5. **Queue** : Celery pour traitement async
6. **Monitoring** : Logs et métriques

---

## 📞 Support

**Auteur** : Anas BENDAIKHA  
**Email** : contact@pharmaverif.demo

---

**© 2026 Anas BENDAIKHA - PharmaVerif Backend - Tous droits réservés**
