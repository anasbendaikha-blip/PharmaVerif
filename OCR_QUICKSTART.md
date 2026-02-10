# 🚀 OCR QuickStart - PharmaVerif

**Démarrer rapidement avec l'OCR pour extraire du texte des factures scannées**

Copyright © 2026 Anas BENDAIKHA - Tous droits réservés

---

## ⚡ Installation ultra-rapide

### 1. Installer Tesseract OCR

#### **macOS**
```bash
brew install tesseract tesseract-lang
```

#### **Ubuntu/Debian**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-fra
```

#### **Windows**
Télécharger et installer : https://github.com/UB-Mannheim/tesseract/wiki

### 2. Installer les dépendances Python

```bash
cd backend
source venv/bin/activate

pip install pytesseract==0.3.10 \
            Pillow==10.2.0 \
            pdf2image==1.16.3 \
            opencv-python==4.9.0 \
            numpy==1.26.3
```

### 3. Copier le service OCR

```bash
# Copier OCR_SERVICE_COMPLETE.py vers :
cp OCR_SERVICE_COMPLETE.py backend/app/services/ocr_service_complete.py
```

---

## 💻 Utilisation de base

### Script Python simple

```python
from app.services.ocr_service_complete import UnifiedOCRService, OCRProvider

# Créer le service
ocr = UnifiedOCRService(
    tesseract_path='/usr/bin/tesseract',  # Ajuster selon votre OS
    default_provider=OCRProvider.TESSERACT,
    enable_fallback=True
)

# Extraire texte d'une facture scannée
result = ocr.extract_text(
    'facture_pharmacie_scan.pdf',
    preprocess=True  # Active le preprocessing pour meilleure qualité
)

# Afficher les résultats
if result['success']:
    print(f"✅ Extraction réussie!")
    print(f"Provider: {result['provider']}")
    print(f"Confiance: {result['confidence']:.1%}")
    print(f"Qualité: {result['quality']}")
    print(f"\n📄 Texte extrait:\n{result['text']}")
else:
    print(f"❌ Erreur: {result.get('error', 'Échec extraction')}")
```

---

## 🔧 Intégration avec FastAPI

### 1. Mettre à jour `upload.py`

```python
"""
backend/app/api/routes/upload.py - avec OCR
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import shutil
import uuid

from app.services.ocr_service_complete import UnifiedOCRService, OCRProvider
from app.services.pdf_parser import pdf_parser
from app.services.excel_parser import excel_parser

router = APIRouter()

# Initialiser le service OCR
ocr_service = UnifiedOCRService(
    tesseract_path='/usr/bin/tesseract',
    default_provider=OCRProvider.TESSERACT,
    enable_fallback=True
)

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """Upload et parse un fichier (PDF/Excel/CSV) avec OCR"""
    
    try:
        # Sauvegarder temporairement
        file_ext = Path(file.filename).suffix.lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = Path("uploads") / unique_filename
        
        file_path.parent.mkdir(exist_ok=True)
        
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Parser selon le type
        result = None
        
        if file_ext == ".pdf":
            # Tenter extraction native
            native_result = pdf_parser.parse_invoice_pdf(str(file_path))
            
            if native_result['success'] and len(native_result['data'].get('numero', '')) > 0:
                # PDF natif extractible
                result = native_result
            else:
                # PDF scanné → OCR
                print("📸 PDF scanné détecté, utilisation OCR...")
                
                ocr_result = ocr_service.extract_text(
                    str(file_path),
                    preprocess=True
                )
                
                if ocr_result['success']:
                    # Parser le texte OCR
                    from app.services.ocr_parser import parse_ocr_text
                    
                    parsed_data = parse_ocr_text(ocr_result['text'])
                    
                    result = {
                        'success': True,
                        'method': f"ocr_{ocr_result['provider']}",
                        'confidence': ocr_result['confidence'],
                        'quality': ocr_result['quality'],
                        'data': parsed_data
                    }
                else:
                    result = {
                        'success': False,
                        'error': 'Échec OCR',
                        'details': ocr_result.get('error')
                    }
        
        elif file_ext in [".xlsx", ".xls"]:
            result = excel_parser.parse_excel(str(file_path))
        
        elif file_ext == ".csv":
            result = excel_parser.parse_csv(str(file_path))
        
        else:
            raise HTTPException(400, "Format non supporté")
        
        # Nettoyer (optionnel)
        # file_path.unlink()
        
        return result
        
    except Exception as e:
        raise HTTPException(500, str(e))
```

### 2. Créer le parser OCR

```python
"""
backend/app/services/ocr_parser.py
Parser pour texte extrait par OCR
"""
import re
from datetime import datetime
from typing import Dict

def parse_ocr_text(text: str) -> Dict:
    """
    Parser le texte OCR d'une facture
    
    Args:
        text: Texte brut extrait par OCR
    
    Returns:
        Données structurées de la facture
    """
    data = {
        "numero": extract_invoice_number(text),
        "date": extract_date(text),
        "grossiste": extract_supplier(text),
        "total_brut_ht": extract_total_ht(text),
        "net_a_payer": extract_net_to_pay(text),
        "lignes": extract_lines(text)
    }
    
    return data

def extract_invoice_number(text: str) -> str:
    """Extraire le numéro de facture"""
    patterns = [
        r'(?:Facture|FACTURE|N°|Numero)\s*:?\s*([A-Z0-9-]+)',
        r'(?:Invoice|INV)\s*:?\s*([A-Z0-9-]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    return f"FAC-{datetime.now().timestamp()}"

def extract_date(text: str) -> str:
    """Extraire la date"""
    patterns = [
        r'(?:Date)\s*:?\s*(\d{2}[/-]\d{2}[/-]\d{4})',
        r'(\d{2}[/-]\d{2}[/-]\d{4})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            date_str = match.group(1).replace('/', '-')
            return date_str
    
    return datetime.now().strftime('%Y-%m-%d')

def extract_supplier(text: str) -> str:
    """Extraire le nom du grossiste"""
    # Noms courants de grossistes français
    grossistes = [
        'Alliance Healthcare',
        'Phoenix',
        'OCP',
        'CERP',
    ]
    
    text_upper = text.upper()
    
    for grossiste in grossistes:
        if grossiste.upper() in text_upper:
            return grossiste
    
    # Pattern générique
    pattern = r'(?:Grossiste|Fournisseur)\s*:?\s*([A-Za-zÀ-ÿ\s]+)'
    match = re.search(pattern, text, re.IGNORECASE)
    
    if match:
        return match.group(1).strip()
    
    return "Non identifié"

def extract_total_ht(text: str) -> float:
    """Extraire le total HT"""
    patterns = [
        r'(?:Total HT|Montant HT)\s*:?\s*([\d\s,.]+)',
        r'(?:Total)\s*:?\s*([\d\s,.]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(' ', '').replace(',', '.')
            try:
                return float(amount_str)
            except ValueError:
                continue
    
    return 0.0

def extract_net_to_pay(text: str) -> float:
    """Extraire le net à payer"""
    patterns = [
        r'(?:Net à payer|Net a payer)\s*:?\s*([\d\s,.]+)',
        r'(?:Total TTC)\s*:?\s*([\d\s,.]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(' ', '').replace(',', '.')
            try:
                return float(amount_str)
            except ValueError:
                continue
    
    return 0.0

def extract_lines(text: str) -> list:
    """
    Extraire les lignes de produits
    
    Recherche des patterns comme :
    DOLIPRANE 1000MG 100 COMP    50    1.50    75.00
    """
    lines = []
    
    # Pattern pour une ligne produit
    # Nom + quantité + prix unitaire + total
    pattern = r'([A-Za-zÀ-ÿ0-9\s]+?)\s+(\d+)\s+([\d,.]+)\s+([\d,.]+)'
    
    for match in re.finditer(pattern, text):
        produit = match.group(1).strip()
        quantite = int(match.group(2))
        prix_unitaire = float(match.group(3).replace(',', '.'))
        total = float(match.group(4).replace(',', '.'))
        
        # Filtrer les lignes invalides
        if len(produit) > 5 and quantite > 0:
            lines.append({
                'designation': produit,
                'quantite': quantite,
                'prix_unitaire_ht': prix_unitaire,
                'total_ligne_ht': total
            })
    
    return lines
```

---

## 🎯 Tester l'OCR

### Test CLI

```bash
cd backend

python << EOF
from app.services.ocr_service_complete import UnifiedOCRService

ocr = UnifiedOCRService()
result = ocr.extract_text('test_facture_scan.pdf', preprocess=True)

print(f"Succès: {result['success']}")
print(f"Confiance: {result['confidence']:.1%}")
print(f"Texte:\n{result['text'][:200]}...")
EOF
```

### Test via API

```bash
# Lancer FastAPI
uvicorn app.main:app --reload

# Dans un autre terminal
curl -X POST "http://localhost:8000/api/v1/upload/" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@facture_scan.pdf"
```

---

## 📊 Qualité OCR

### Évaluation automatique

Le service retourne un niveau de qualité :

- **EXCELLENT** (95-100%) : Parfait, très fiable
- **HIGH** (85-95%) : Bon, utilisable
- **MEDIUM** (70-85%) : Moyen, vérification recommandée
- **LOW** (< 70%) : Faible, fallback AWS Textract activé

### Améliorer la qualité

1. **Augmenter la résolution**
   ```python
   result = ocr.extract_text(file_path, preprocess=True)
   # Le preprocessing applique automatiquement 300 DPI
   ```

2. **Activer le fallback AWS**
   ```python
   # Configurer AWS
   export AWS_ACCESS_KEY_ID=...
   export AWS_SECRET_ACCESS_KEY=...
   
   # Le fallback s'active automatiquement si confiance < 70%
   ```

3. **Scanner en haute qualité**
   - Minimum 300 DPI
   - Préférer 400-600 DPI
   - Format PDF plutôt que JPEG

---

## 💰 Coûts

### Tesseract (GRATUIT)
- ✅ Illimité
- ✅ Offline
- ✅ Open-source
- ⚠️ Qualité moyenne-bonne

### AWS Textract (PAYANT)
- 💰 $1.50 / 1,000 pages
- ✅ Excellente qualité
- ✅ Détection tableaux
- ❌ Nécessite connexion internet

**Stratégie recommandée** : Tesseract en premier, AWS en fallback

---

## 🐛 Dépannage

### Problème : "Tesseract not found"

```bash
# Vérifier installation
tesseract --version

# macOS
brew install tesseract

# Ubuntu
sudo apt-get install tesseract-ocr

# Configurer le chemin
export TESSERACT_PATH=/usr/bin/tesseract
```

### Problème : "Poor OCR quality"

1. Activer preprocessing :
   ```python
   result = ocr.extract_text(file, preprocess=True)
   ```

2. Augmenter résolution source

3. Activer fallback AWS

### Problème : "AWS credentials not found"

```bash
# Configurer AWS CLI
aws configure
# Entrer : Access Key ID, Secret Access Key, Region
```

---

## 📚 Documentation complète

- **[OCR_GUIDE_COMPLET.md](./OCR_GUIDE_COMPLET.md)** - Guide exhaustif (50+ pages)
- **[OCR_SERVICE_COMPLETE.py](./OCR_SERVICE_COMPLETE.py)** - Code source complet

---

## ✅ Checklist

- [ ] Tesseract installé
- [ ] Dépendances Python installées
- [ ] Service OCR copié dans backend
- [ ] Routes upload mises à jour
- [ ] Test CLI réussi
- [ ] Test API réussi
- [ ] (Optionnel) AWS Textract configuré

---

<div align="center">

**🔍 OCR QuickStart - PharmaVerif**

Extraction de texte depuis PDFs scannés

Développé avec ❤️ par **Anas BENDAIKHA**

© 2026 - Tous droits réservés

[Guide Complet](./OCR_GUIDE_COMPLET.md) • [Code Source](./OCR_SERVICE_COMPLETE.py) • [Backend](./BACKEND_FASTAPI_GUIDE.md)

</div>
