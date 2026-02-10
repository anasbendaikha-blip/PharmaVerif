# 🔍 Guide Complet OCR pour PharmaVerif

**Extraction de texte depuis PDFs scannés - Solutions professionnelles**

Copyright © 2026 Anas BENDAIKHA - Tous droits réservés

---

## 📋 Table des matières

1. [Introduction à l'OCR](#introduction-à-locr)
2. [Comparaison des solutions](#comparaison-des-solutions)
3. [Tesseract OCR (gratuit)](#tesseract-ocr)
4. [AWS Textract (payant)](#aws-textract)
5. [Google Cloud Vision (payant)](#google-cloud-vision)
6. [Azure Computer Vision (payant)](#azure-computer-vision)
7. [Preprocessing des images](#preprocessing-des-images)
8. [Service OCR unifié](#service-ocr-unifié)
9. [Optimisation et performances](#optimisation)
10. [Cas d'usage PharmaVerif](#cas-dusage-pharmaverif)

---

## 🎯 Introduction à l'OCR

### Qu'est-ce que l'OCR ?

**OCR (Optical Character Recognition)** = Reconnaissance Optique de Caractères

Technologie permettant de convertir des images contenant du texte (PDFs scannés, photos, captures d'écran) en texte éditable et exploitable.

### Cas d'usage pour PharmaVerif

Les factures pharmaceutiques peuvent être :
- ✅ **PDFs natifs** : Contiennent du texte extractible directement
- ⚠️ **PDFs scannés** : Images nécessitant OCR
- ⚠️ **Photos de factures** : Prises avec smartphone
- ⚠️ **Fax** : Qualité variable

**L'OCR est essentiel** pour analyser automatiquement ces documents.

---

## 📊 Comparaison des solutions

### Vue d'ensemble

| Solution | Prix | Qualité | Vitesse | Tableaux | Français | Offline |
|----------|------|---------|---------|----------|----------|---------|
| **Tesseract** | ✅ Gratuit | ⭐⭐⭐ | Moyen | ❌ | ✅ | ✅ |
| **AWS Textract** | 💰 $1.50/1000 | ⭐⭐⭐⭐⭐ | Rapide | ✅ | ✅ | ❌ |
| **Google Vision** | 💰 $1.50/1000 | ⭐⭐⭐⭐⭐ | Rapide | ✅ | ✅ | ❌ |
| **Azure Vision** | 💰 $1.00/1000 | ⭐⭐⭐⭐ | Rapide | ✅ | ✅ | ❌ |
| **OCR.space** | 💰 $60/mois | ⭐⭐⭐ | Moyen | ❌ | ✅ | ❌ |

### Recommandations par usage

#### **Pour développement/test**
→ **Tesseract** (gratuit, offline)

#### **Pour production petit volume**
→ **Tesseract** + preprocessing

#### **Pour production gros volume**
→ **AWS Textract** ou **Google Cloud Vision**

#### **Pour factures complexes**
→ **AWS Textract** (meilleur pour tableaux)

---

## 🆓 Tesseract OCR

### Installation

#### **macOS**
```bash
brew install tesseract
brew install tesseract-lang  # Langues supplémentaires
```

#### **Ubuntu/Debian**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
sudo apt-get install tesseract-ocr-fra  # Français
```

#### **Windows**
1. Télécharger : https://github.com/UB-Mannheim/tesseract/wiki
2. Installer l'exécutable
3. Ajouter au PATH : `C:\Program Files\Tesseract-OCR`

#### **Vérification**
```bash
tesseract --version
# Output: tesseract 5.x.x

tesseract --list-langs
# Output: List of available languages (xxx):
# eng
# fra
# ...
```

### Configuration Python

```python
# requirements.txt
pytesseract==0.3.10
Pillow==10.2.0
pdf2image==1.16.3
opencv-python==4.9.0  # Pour preprocessing
numpy==1.26.3
```

### Implémentation de base

```python
"""
OCR avec Tesseract - Implémentation de base
"""
import pytesseract
from PIL import Image
from pdf2image import convert_from_path

def ocr_image(image_path: str, lang: str = 'fra') -> str:
    """
    Extraire le texte d'une image
    
    Args:
        image_path: Chemin vers l'image
        lang: Langue (fra, eng, fra+eng)
    
    Returns:
        Texte extrait
    """
    try:
        image = Image.open(image_path)
        
        # Configuration OCR optimisée
        custom_config = r'--oem 3 --psm 6'
        
        text = pytesseract.image_to_string(
            image,
            lang=lang,
            config=custom_config
        )
        
        return text.strip()
        
    except Exception as e:
        raise Exception(f"Erreur OCR : {str(e)}")

def ocr_pdf(pdf_path: str, lang: str = 'fra') -> str:
    """
    Extraire le texte d'un PDF scanné
    
    Args:
        pdf_path: Chemin vers le PDF
        lang: Langue
    
    Returns:
        Texte de toutes les pages
    """
    try:
        # Convertir PDF en images (300 DPI pour qualité OCR)
        images = convert_from_path(pdf_path, dpi=300)
        
        all_text = []
        
        for i, image in enumerate(images):
            print(f"OCR page {i+1}/{len(images)}...")
            
            # OCR sur chaque page
            page_text = pytesseract.image_to_string(
                image,
                lang=lang,
                config=r'--oem 3 --psm 6'
            )
            
            all_text.append(f"--- PAGE {i+1} ---\n{page_text}")
        
        return "\n\n".join(all_text)
        
    except Exception as e:
        raise Exception(f"Erreur OCR PDF : {str(e)}")
```

### Paramètres Tesseract

#### **PSM (Page Segmentation Mode)**

```python
# --psm X
0  # Orientation et détection de script (OSD) uniquement
1  # Segmentation automatique avec OSD
3  # Segmentation automatique complète (défaut)
4  # Supposer une seule colonne de texte
6  # Supposer un bloc uniforme de texte
7  # Traiter l'image comme une seule ligne de texte
10 # Traiter l'image comme un seul caractère
11 # Texte épars, ordre quelconque
```

**Pour factures** : `--psm 6` (bloc uniforme)

#### **OEM (OCR Engine Mode)**

```python
# --oem X
0  # Legacy engine only
1  # Neural nets LSTM engine only
2  # Legacy + LSTM engines
3  # Default, basé sur ce qui est disponible
```

**Recommandé** : `--oem 3`

### Amélioration de la qualité

```python
import cv2
import numpy as np
from PIL import Image

def preprocess_image(image_path: str) -> Image.Image:
    """
    Prétraiter une image pour améliorer l'OCR
    
    Applique :
    - Conversion en niveaux de gris
    - Réduction du bruit
    - Amélioration du contraste
    - Binarisation
    """
    # Charger l'image avec OpenCV
    img = cv2.imread(image_path)
    
    # 1. Conversion en niveaux de gris
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 2. Réduction du bruit
    denoised = cv2.fastNlMeansDenoising(gray, h=30)
    
    # 3. Amélioration du contraste (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(denoised)
    
    # 4. Binarisation (Otsu)
    _, binary = cv2.threshold(
        enhanced,
        0, 255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    
    # Convertir en PIL Image
    return Image.fromarray(binary)

def ocr_with_preprocessing(image_path: str) -> str:
    """OCR avec preprocessing"""
    
    # Prétraiter
    processed_image = preprocess_image(image_path)
    
    # OCR
    text = pytesseract.image_to_string(
        processed_image,
        lang='fra',
        config=r'--oem 3 --psm 6'
    )
    
    return text.strip()
```

---

## ☁️ AWS Textract

### Avantages

- ✅ **Meilleure qualité** que Tesseract
- ✅ **Détection de tableaux** automatique
- ✅ **Extraction de paires clé-valeur**
- ✅ **Haute précision** sur documents complexes
- ✅ **Scalable** (pas de limite)

### Prix

- **Detect Document Text** : $1.50 / 1,000 pages
- **Analyze Document** : $50 / 1,000 pages (avec tableaux)
- **Free tier** : 1,000 pages/mois les 3 premiers mois

### Installation

```bash
pip install boto3
```

### Configuration AWS

```bash
# Installer AWS CLI
pip install awscli

# Configurer
aws configure
# AWS Access Key ID: VOTRE_KEY
# AWS Secret Access Key: VOTRE_SECRET
# Default region: eu-west-1
```

### Implémentation

```python
"""
OCR avec AWS Textract
"""
import boto3
from typing import Dict, List

class AWSTextractOCR:
    """Service OCR AWS Textract"""
    
    def __init__(self, region_name: str = 'eu-west-1'):
        """Initialiser le client Textract"""
        self.client = boto3.client('textract', region_name=region_name)
    
    def extract_text(self, document_bytes: bytes) -> str:
        """
        Extraire le texte d'un document
        
        Args:
            document_bytes: Document en bytes
        
        Returns:
            Texte extrait
        """
        try:
            response = self.client.detect_document_text(
                Document={'Bytes': document_bytes}
            )
            
            # Extraire le texte
            text_lines = []
            
            for block in response['Blocks']:
                if block['BlockType'] == 'LINE':
                    text_lines.append(block['Text'])
            
            return '\n'.join(text_lines)
            
        except Exception as e:
            raise Exception(f"Erreur AWS Textract : {str(e)}")
    
    def extract_tables(self, document_bytes: bytes) -> List[List[List[str]]]:
        """
        Extraire les tableaux d'un document
        
        Args:
            document_bytes: Document en bytes
        
        Returns:
            Liste de tableaux
        """
        try:
            response = self.client.analyze_document(
                Document={'Bytes': document_bytes},
                FeatureTypes=['TABLES']
            )
            
            tables = []
            
            # Parser les tableaux
            for block in response['Blocks']:
                if block['BlockType'] == 'TABLE':
                    table = self._parse_table(block, response['Blocks'])
                    tables.append(table)
            
            return tables
            
        except Exception as e:
            raise Exception(f"Erreur extraction tableaux : {str(e)}")
    
    def _parse_table(self, table_block: Dict, all_blocks: List[Dict]) -> List[List[str]]:
        """Parser un tableau Textract"""
        
        # Créer un dictionnaire des blocs par ID
        blocks_map = {block['Id']: block for block in all_blocks}
        
        # Trouver les cellules
        cells = []
        
        if 'Relationships' in table_block:
            for relationship in table_block['Relationships']:
                if relationship['Type'] == 'CHILD':
                    for cell_id in relationship['Ids']:
                        cell = blocks_map.get(cell_id)
                        if cell and cell['BlockType'] == 'CELL':
                            cells.append(cell)
        
        # Organiser les cellules en lignes/colonnes
        max_row = max(cell.get('RowIndex', 0) for cell in cells)
        max_col = max(cell.get('ColumnIndex', 0) for cell in cells)
        
        table = [['' for _ in range(max_col)] for _ in range(max_row)]
        
        for cell in cells:
            row = cell.get('RowIndex', 1) - 1
            col = cell.get('ColumnIndex', 1) - 1
            
            # Extraire le texte de la cellule
            cell_text = self._get_cell_text(cell, blocks_map)
            
            if 0 <= row < max_row and 0 <= col < max_col:
                table[row][col] = cell_text
        
        return table
    
    def _get_cell_text(self, cell: Dict, blocks_map: Dict) -> str:
        """Obtenir le texte d'une cellule"""
        
        text_parts = []
        
        if 'Relationships' in cell:
            for relationship in cell['Relationships']:
                if relationship['Type'] == 'CHILD':
                    for child_id in relationship['Ids']:
                        child = blocks_map.get(child_id)
                        if child and child['BlockType'] == 'WORD':
                            text_parts.append(child.get('Text', ''))
        
        return ' '.join(text_parts)

# Exemple d'utilisation
def ocr_with_textract(pdf_path: str) -> Dict:
    """OCR d'un PDF avec AWS Textract"""
    
    # Lire le PDF
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()
    
    # Initialiser Textract
    textract = AWSTextractOCR()
    
    # Extraire texte
    text = textract.extract_text(pdf_bytes)
    
    # Extraire tableaux
    tables = textract.extract_tables(pdf_bytes)
    
    return {
        'text': text,
        'tables': tables,
        'method': 'aws_textract'
    }
```

---

## 🔍 Google Cloud Vision

### Avantages

- ✅ **Très haute précision**
- ✅ **Support multilingue** excellent
- ✅ **API simple** et bien documentée
- ✅ **Détection de structure** de document

### Prix

- **Text Detection** : $1.50 / 1,000 images
- **Document Text Detection** : $1.50 / 1,000 pages
- **Free tier** : 1,000 unités/mois

### Installation

```bash
pip install google-cloud-vision
```

### Configuration

```bash
# 1. Créer un projet sur Google Cloud Console
# 2. Activer l'API Cloud Vision
# 3. Créer une clé de service (JSON)
# 4. Définir la variable d'environnement

export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

### Implémentation

```python
"""
OCR avec Google Cloud Vision
"""
from google.cloud import vision
from typing import Dict

class GoogleVisionOCR:
    """Service OCR Google Cloud Vision"""
    
    def __init__(self):
        """Initialiser le client Vision"""
        self.client = vision.ImageAnnotatorClient()
    
    def extract_text(self, image_path: str) -> str:
        """
        Extraire le texte d'une image
        
        Args:
            image_path: Chemin vers l'image
        
        Returns:
            Texte extrait
        """
        try:
            # Charger l'image
            with open(image_path, 'rb') as image_file:
                content = image_file.read()
            
            image = vision.Image(content=content)
            
            # Détection de texte
            response = self.client.text_detection(image=image)
            
            if response.error.message:
                raise Exception(f"Erreur API : {response.error.message}")
            
            # Extraire le texte complet
            texts = response.text_annotations
            
            if texts:
                return texts[0].description
            
            return ""
            
        except Exception as e:
            raise Exception(f"Erreur Google Vision : {str(e)}")
    
    def extract_document_text(self, pdf_bytes: bytes) -> Dict:
        """
        Extraire le texte d'un document (PDF)
        
        Args:
            pdf_bytes: PDF en bytes
        
        Returns:
            Texte structuré
        """
        try:
            # Créer l'objet document
            input_config = vision.InputConfig(
                content=pdf_bytes,
                mime_type='application/pdf'
            )
            
            # Feature pour détection de document
            feature = vision.Feature(
                type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION
            )
            
            # Requête
            request = vision.AnnotateFileRequest(
                input_config=input_config,
                features=[feature]
            )
            
            # Appel API
            response = self.client.batch_annotate_files(
                requests=[request]
            )
            
            # Extraire le texte
            full_text = []
            
            for image_response in response.responses[0].responses:
                text_annotation = image_response.full_text_annotation
                full_text.append(text_annotation.text)
            
            return {
                'text': '\n\n'.join(full_text),
                'method': 'google_vision'
            }
            
        except Exception as e:
            raise Exception(f"Erreur Google Vision : {str(e)}")

# Exemple d'utilisation
def ocr_with_google_vision(image_path: str) -> str:
    """OCR avec Google Cloud Vision"""
    
    vision_ocr = GoogleVisionOCR()
    text = vision_ocr.extract_text(image_path)
    
    return text
```

---

## 🎨 Preprocessing des images

### Pourquoi le preprocessing ?

Le preprocessing **améliore significativement** la qualité de l'OCR en :
- ✅ Réduisant le bruit
- ✅ Améliorant le contraste
- ✅ Redressant les images
- ✅ Normalisant les couleurs

### Techniques essentielles

```python
"""
Preprocessing avancé pour OCR
"""
import cv2
import numpy as np
from PIL import Image
from typing import Tuple

class ImagePreprocessor:
    """Prétraitement d'images pour OCR"""
    
    @staticmethod
    def convert_to_grayscale(image: np.ndarray) -> np.ndarray:
        """Conversion en niveaux de gris"""
        if len(image.shape) == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return image
    
    @staticmethod
    def denoise(image: np.ndarray, strength: int = 10) -> np.ndarray:
        """Réduction du bruit"""
        return cv2.fastNlMeansDenoising(image, h=strength)
    
    @staticmethod
    def enhance_contrast(image: np.ndarray) -> np.ndarray:
        """Amélioration du contraste avec CLAHE"""
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        return clahe.apply(image)
    
    @staticmethod
    def binarize(image: np.ndarray, method: str = 'otsu') -> np.ndarray:
        """
        Binarisation de l'image
        
        Args:
            image: Image en niveaux de gris
            method: 'otsu', 'adaptive', ou 'simple'
        
        Returns:
            Image binarisée
        """
        if method == 'otsu':
            _, binary = cv2.threshold(
                image, 0, 255,
                cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
        
        elif method == 'adaptive':
            binary = cv2.adaptiveThreshold(
                image, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
        
        else:  # simple
            _, binary = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY)
        
        return binary
    
    @staticmethod
    def deskew(image: np.ndarray) -> np.ndarray:
        """Redresser une image inclinée"""
        
        # Détecter l'angle
        coords = np.column_stack(np.where(image > 0))
        angle = cv2.minAreaRect(coords)[-1]
        
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        
        # Rotation
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            image, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        
        return rotated
    
    @staticmethod
    def remove_borders(image: np.ndarray, border_size: int = 10) -> np.ndarray:
        """Supprimer les bordures"""
        h, w = image.shape[:2]
        return image[
            border_size:h-border_size,
            border_size:w-border_size
        ]
    
    @staticmethod
    def resize_for_ocr(image: np.ndarray, target_height: int = 2000) -> np.ndarray:
        """Redimensionner pour OCR optimal (2000px de hauteur)"""
        h, w = image.shape[:2]
        
        if h < target_height:
            ratio = target_height / h
            new_width = int(w * ratio)
            return cv2.resize(
                image,
                (new_width, target_height),
                interpolation=cv2.INTER_CUBIC
            )
        
        return image
    
    def preprocess_for_ocr(
        self,
        image_path: str,
        output_path: str = None
    ) -> np.ndarray:
        """
        Pipeline complet de preprocessing
        
        Args:
            image_path: Chemin image source
            output_path: Optionnel, sauvegarder l'image traitée
        
        Returns:
            Image prétraitée
        """
        # Charger
        image = cv2.imread(image_path)
        
        # 1. Niveaux de gris
        gray = self.convert_to_grayscale(image)
        
        # 2. Redimensionner
        resized = self.resize_for_ocr(gray)
        
        # 3. Débruitage
        denoised = self.denoise(resized)
        
        # 4. Améliorer contraste
        enhanced = self.enhance_contrast(denoised)
        
        # 5. Redresser
        deskewed = self.deskew(enhanced)
        
        # 6. Binariser
        binary = self.binarize(deskewed, method='otsu')
        
        # 7. Supprimer bordures
        final = self.remove_borders(binary)
        
        # Sauvegarder si demandé
        if output_path:
            cv2.imwrite(output_path, final)
        
        return final

# Utilisation
preprocessor = ImagePreprocessor()
processed_image = preprocessor.preprocess_for_ocr('facture_scan.jpg')
```

### Avant/Après

```
AVANT preprocessing :
- Image floue
- Contraste faible
- Bruit important
- Texte peu lisible
→ OCR précision : 60-70%

APRÈS preprocessing :
- Image nette
- Contraste élevé
- Bruit réduit
- Texte clair
→ OCR précision : 90-95%
```

---

## 🔄 Service OCR unifié

```python
"""
Service OCR unifié - Support de plusieurs providers
"""
from enum import Enum
from typing import Dict, Optional
import os

class OCRProvider(str, Enum):
    """Providers OCR disponibles"""
    TESSERACT = "tesseract"
    AWS_TEXTRACT = "aws_textract"
    GOOGLE_VISION = "google_vision"
    AZURE_VISION = "azure_vision"

class UnifiedOCRService:
    """
    Service OCR unifié
    
    Permet d'utiliser différents providers OCR
    avec une interface commune.
    """
    
    def __init__(
        self,
        default_provider: OCRProvider = OCRProvider.TESSERACT,
        fallback_providers: Optional[list] = None
    ):
        """
        Initialiser le service
        
        Args:
            default_provider: Provider par défaut
            fallback_providers: Providers de secours si échec
        """
        self.default_provider = default_provider
        self.fallback_providers = fallback_providers or []
        
        # Initialiser les services
        self.tesseract = TesseractOCR()
        
        if self._is_aws_configured():
            self.aws_textract = AWSTextractOCR()
        
        if self._is_google_configured():
            self.google_vision = GoogleVisionOCR()
    
    def extract_text(
        self,
        file_path: str,
        provider: Optional[OCRProvider] = None,
        preprocess: bool = True
    ) -> Dict:
        """
        Extraire le texte d'un document
        
        Args:
            file_path: Chemin vers le fichier
            provider: Provider à utiliser (None = default)
            preprocess: Appliquer preprocessing
        
        Returns:
            {
                'text': str,
                'provider': str,
                'confidence': float,
                'success': bool
            }
        """
        provider = provider or self.default_provider
        
        try:
            # Tenter avec le provider principal
            result = self._extract_with_provider(
                file_path,
                provider,
                preprocess
            )
            
            if result['success']:
                return result
            
        except Exception as e:
            print(f"Erreur {provider}: {str(e)}")
        
        # Tenter les providers de secours
        for fallback in self.fallback_providers:
            try:
                result = self._extract_with_provider(
                    file_path,
                    fallback,
                    preprocess
                )
                
                if result['success']:
                    return result
                    
            except Exception as e:
                print(f"Erreur {fallback}: {str(e)}")
                continue
        
        # Échec complet
        return {
            'text': '',
            'provider': 'none',
            'confidence': 0.0,
            'success': False,
            'error': 'Tous les providers ont échoué'
        }
    
    def _extract_with_provider(
        self,
        file_path: str,
        provider: OCRProvider,
        preprocess: bool
    ) -> Dict:
        """Extraire avec un provider spécifique"""
        
        if provider == OCRProvider.TESSERACT:
            return self._extract_tesseract(file_path, preprocess)
        
        elif provider == OCRProvider.AWS_TEXTRACT:
            return self._extract_aws(file_path)
        
        elif provider == OCRProvider.GOOGLE_VISION:
            return self._extract_google(file_path)
        
        else:
            raise ValueError(f"Provider {provider} non supporté")
    
    def _extract_tesseract(self, file_path: str, preprocess: bool) -> Dict:
        """Extraction Tesseract"""
        
        if preprocess:
            preprocessor = ImagePreprocessor()
            processed = preprocessor.preprocess_for_ocr(file_path)
            text = self.tesseract.ocr_image(processed)
        else:
            text = self.tesseract.ocr_image(file_path)
        
        return {
            'text': text,
            'provider': 'tesseract',
            'confidence': 0.85,  # Estimation
            'success': bool(text)
        }
    
    def _extract_aws(self, file_path: str) -> Dict:
        """Extraction AWS Textract"""
        
        with open(file_path, 'rb') as f:
            file_bytes = f.read()
        
        text = self.aws_textract.extract_text(file_bytes)
        
        return {
            'text': text,
            'provider': 'aws_textract',
            'confidence': 0.95,  # AWS est très précis
            'success': bool(text)
        }
    
    def _extract_google(self, file_path: str) -> Dict:
        """Extraction Google Vision"""
        
        text = self.google_vision.extract_text(file_path)
        
        return {
            'text': text,
            'provider': 'google_vision',
            'confidence': 0.95,
            'success': bool(text)
        }
    
    def _is_aws_configured(self) -> bool:
        """Vérifier si AWS est configuré"""
        return all([
            os.getenv('AWS_ACCESS_KEY_ID'),
            os.getenv('AWS_SECRET_ACCESS_KEY')
        ])
    
    def _is_google_configured(self) -> bool:
        """Vérifier si Google Cloud est configuré"""
        return bool(os.getenv('GOOGLE_APPLICATION_CREDENTIALS'))

# Utilisation
ocr = UnifiedOCRService(
    default_provider=OCRProvider.TESSERACT,
    fallback_providers=[
        OCRProvider.AWS_TEXTRACT,
        OCRProvider.GOOGLE_VISION
    ]
)

result = ocr.extract_text('facture_scan.pdf', preprocess=True)

if result['success']:
    print(f"Texte extrait avec {result['provider']}")
    print(f"Confiance : {result['confidence']}")
    print(result['text'])
```

---

## 📈 Optimisation et performances

### Conseils généraux

1. **Qualité de l'image source**
   - Minimum 300 DPI pour OCR
   - Préférer 400-600 DPI pour meilleure précision
   - Éviter compression JPEG trop forte

2. **Preprocessing systématique**
   - Toujours appliquer au moins niveaux de gris + binarisation
   - Tesseract bénéficie beaucoup du preprocessing

3. **Choix du provider**
   - Tesseract : documents simples, texte clair
   - AWS/Google : documents complexes, tableaux

4. **Parallélisation**
   - Traiter plusieurs pages en parallèle
   - Utiliser ThreadPoolExecutor

5. **Cache**
   - Mettre en cache les résultats OCR
   - Éviter de refaire l'OCR sur le même document

### Comparaison de performances

```
Document type : Facture pharmaceutique A4
Résolution : 300 DPI
```

| Provider | Temps | Précision | Coût/1000 |
|----------|-------|-----------|-----------|
| Tesseract (sans prep) | 3s | 75% | €0 |
| Tesseract (avec prep) | 5s | 90% | €0 |
| AWS Textract | 2s | 98% | €1.50 |
| Google Vision | 2s | 97% | €1.50 |

---

## 🏥 Cas d'usage PharmaVerif

### Workflow recommandé

```python
def process_pharmacy_invoice(pdf_path: str) -> Dict:
    """
    Traiter une facture pharmaceutique
    
    Stratégie :
    1. Tenter extraction texte native (PyPDF2)
    2. Si échec → OCR avec Tesseract + preprocessing
    3. Si qualité faible → Fallback AWS Textract
    """
    
    # 1. Tenter extraction native
    try:
        text = extract_text_pypdf2(pdf_path)
        
        if len(text) > 100:  # Texte trouvé
            return {
                'text': text,
                'method': 'native',
                'success': True
            }
    except:
        pass
    
    # 2. OCR avec Tesseract
    try:
        ocr_service = UnifiedOCRService(
            default_provider=OCRProvider.TESSERACT,
            fallback_providers=[OCRProvider.AWS_TEXTRACT]
        )
        
        result = ocr_service.extract_text(
            pdf_path,
            preprocess=True
        )
        
        return result
        
    except Exception as e:
        return {
            'text': '',
            'method': 'none',
            'success': False,
            'error': str(e)
        }
```

---

## 📚 Ressources

- **Tesseract** : https://github.com/tesseract-ocr/tesseract
- **AWS Textract** : https://aws.amazon.com/textract/
- **Google Cloud Vision** : https://cloud.google.com/vision
- **OpenCV** : https://opencv.org/
- **pytesseract** : https://pypi.org/project/pytesseract/

---

<div align="center">

**🔍 OCR Complet pour PharmaVerif**

Support Tesseract, AWS Textract, Google Cloud Vision

Développé avec ❤️ par **Anas BENDAIKHA**

© 2026 - Tous droits réservés

</div>
