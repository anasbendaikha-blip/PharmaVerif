"""
Service OCR Complet pour PharmaVerif Backend
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/services/ocr_service_complete.py

Support de plusieurs providers OCR avec preprocessing avancé
"""

import os
import cv2
import numpy as np
import pytesseract
import boto3
from PIL import Image
from pdf2image import convert_from_path
from typing import Dict, List, Optional, Tuple
from enum import Enum
from pathlib import Path
import tempfile
import logging

logger = logging.getLogger(__name__)


# ========================================
# ENUMS
# ========================================

class OCRProvider(str, Enum):
    """Providers OCR disponibles"""
    TESSERACT = "tesseract"
    AWS_TEXTRACT = "aws_textract"
    GOOGLE_VISION = "google_vision"


class OCRQuality(str, Enum):
    """Niveau de qualité OCR"""
    LOW = "low"           # < 70%
    MEDIUM = "medium"     # 70-85%
    HIGH = "high"         # 85-95%
    EXCELLENT = "excellent"  # > 95%


# ========================================
# PREPROCESSING D'IMAGES
# ========================================

class ImagePreprocessor:
    """
    Prétraitement d'images pour améliorer l'OCR
    
    Techniques :
    - Conversion niveaux de gris
    - Débruitage
    - Amélioration contraste
    - Binarisation
    - Redressement
    """
    
    @staticmethod
    def convert_to_grayscale(image: np.ndarray) -> np.ndarray:
        """Conversion en niveaux de gris"""
        if len(image.shape) == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return image
    
    @staticmethod
    def denoise(image: np.ndarray, strength: int = 10) -> np.ndarray:
        """
        Réduction du bruit
        
        Args:
            image: Image en niveaux de gris
            strength: Force du débruitage (1-30)
        
        Returns:
            Image débruitée
        """
        return cv2.fastNlMeansDenoising(image, h=strength)
    
    @staticmethod
    def enhance_contrast(image: np.ndarray) -> np.ndarray:
        """
        Amélioration du contraste avec CLAHE
        
        CLAHE = Contrast Limited Adaptive Histogram Equalization
        """
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(image)
    
    @staticmethod
    def binarize(image: np.ndarray, method: str = 'otsu') -> np.ndarray:
        """
        Binarisation de l'image (noir et blanc)
        
        Args:
            image: Image en niveaux de gris
            method: Méthode ('otsu', 'adaptive', 'simple')
        
        Returns:
            Image binarisée
        """
        if method == 'otsu':
            # Binarisation automatique Otsu
            _, binary = cv2.threshold(
                image,
                0, 255,
                cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
            return binary
        
        elif method == 'adaptive':
            # Seuillage adaptatif (bon pour éclairage inégal)
            binary = cv2.adaptiveThreshold(
                image,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                11, 2
            )
            return binary
        
        else:  # simple
            _, binary = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY)
            return binary
    
    @staticmethod
    def deskew(image: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Redresser une image inclinée
        
        Returns:
            Image redressée, angle de rotation
        """
        # Détecter l'angle d'inclinaison
        coords = np.column_stack(np.where(image > 0))
        
        if len(coords) == 0:
            return image, 0.0
        
        angle = cv2.minAreaRect(coords)[-1]
        
        # Ajuster l'angle
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        
        # Ne corriger que si l'angle est significatif
        if abs(angle) < 0.5:
            return image, 0.0
        
        # Rotation
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        rotated = cv2.warpAffine(
            image, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        
        return rotated, angle
    
    @staticmethod
    def remove_borders(image: np.ndarray, border_size: int = 10) -> np.ndarray:
        """Supprimer les bordures"""
        h, w = image.shape[:2]
        
        if h <= 2 * border_size or w <= 2 * border_size:
            return image
        
        return image[
            border_size:h-border_size,
            border_size:w-border_size
        ]
    
    @staticmethod
    def resize_for_ocr(image: np.ndarray, target_height: int = 2000) -> np.ndarray:
        """
        Redimensionner pour OCR optimal
        
        Tesseract fonctionne mieux avec des images de ~2000px de hauteur
        """
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
        output_path: Optional[str] = None
    ) -> np.ndarray:
        """
        Pipeline complet de preprocessing
        
        Args:
            image_path: Chemin image source
            output_path: Optionnel, sauvegarder l'image traitée
        
        Returns:
            Image prétraitée (numpy array)
        """
        logger.info(f"Preprocessing image: {image_path}")
        
        # Charger l'image
        image = cv2.imread(image_path)
        
        if image is None:
            raise ValueError(f"Impossible de charger l'image : {image_path}")
        
        # 1. Conversion niveaux de gris
        gray = self.convert_to_grayscale(image)
        logger.debug("✓ Conversion niveaux de gris")
        
        # 2. Redimensionner si nécessaire
        resized = self.resize_for_ocr(gray)
        logger.debug("✓ Redimensionnement")
        
        # 3. Débruitage
        denoised = self.denoise(resized, strength=10)
        logger.debug("✓ Débruitage")
        
        # 4. Amélioration du contraste
        enhanced = self.enhance_contrast(denoised)
        logger.debug("✓ Amélioration contraste")
        
        # 5. Redressement
        deskewed, angle = self.deskew(enhanced)
        if angle != 0:
            logger.debug(f"✓ Redressement (angle: {angle:.2f}°)")
        
        # 6. Binarisation
        binary = self.binarize(deskewed, method='otsu')
        logger.debug("✓ Binarisation")
        
        # 7. Suppression des bordures
        final = self.remove_borders(binary, border_size=10)
        logger.debug("✓ Suppression bordures")
        
        # Sauvegarder si demandé
        if output_path:
            cv2.imwrite(output_path, final)
            logger.info(f"Image prétraitée sauvegardée : {output_path}")
        
        return final


# ========================================
# TESSERACT OCR
# ========================================

class TesseractOCR:
    """
    Service OCR avec Tesseract
    
    Gratuit et open-source, fonctionne offline
    """
    
    def __init__(
        self,
        tesseract_path: Optional[str] = None,
        language: str = 'fra'
    ):
        """
        Initialiser Tesseract
        
        Args:
            tesseract_path: Chemin vers l'exécutable Tesseract
            language: Langue (fra, eng, fra+eng)
        """
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        
        self.language = language
        self.preprocessor = ImagePreprocessor()
    
    def ocr_image(
        self,
        image_path: str,
        preprocess: bool = True,
        psm: int = 6,
        oem: int = 3
    ) -> Dict:
        """
        OCR d'une image
        
        Args:
            image_path: Chemin vers l'image
            preprocess: Appliquer preprocessing
            psm: Page segmentation mode (6 = bloc uniforme)
            oem: OCR engine mode (3 = défaut)
        
        Returns:
            {
                'text': str,
                'confidence': float,
                'success': bool
            }
        """
        try:
            # Preprocessing si demandé
            if preprocess:
                processed_image = self.preprocessor.preprocess_for_ocr(image_path)
                # Convertir numpy array en PIL Image
                image = Image.fromarray(processed_image)
            else:
                image = Image.open(image_path)
            
            # Configuration Tesseract
            config = f'--oem {oem} --psm {psm}'
            
            # OCR
            text = pytesseract.image_to_string(
                image,
                lang=self.language,
                config=config
            )
            
            # Obtenir la confiance moyenne
            data = pytesseract.image_to_data(
                image,
                lang=self.language,
                config=config,
                output_type=pytesseract.Output.DICT
            )
            
            confidences = [
                float(conf)
                for conf in data['conf']
                if conf != '-1' and conf
            ]
            
            avg_confidence = (
                sum(confidences) / len(confidences)
                if confidences else 0
            ) / 100  # Normaliser 0-1
            
            return {
                'text': text.strip(),
                'confidence': round(avg_confidence, 3),
                'success': bool(text.strip()),
                'provider': 'tesseract'
            }
            
        except Exception as e:
            logger.error(f"Erreur Tesseract OCR : {str(e)}")
            return {
                'text': '',
                'confidence': 0.0,
                'success': False,
                'error': str(e),
                'provider': 'tesseract'
            }
    
    def ocr_pdf(
        self,
        pdf_path: str,
        preprocess: bool = True,
        dpi: int = 300
    ) -> Dict:
        """
        OCR d'un PDF scanné
        
        Args:
            pdf_path: Chemin vers le PDF
            preprocess: Appliquer preprocessing
            dpi: Résolution de conversion (300 recommandé)
        
        Returns:
            {
                'text': str,
                'pages': int,
                'confidence': float,
                'success': bool
            }
        """
        try:
            logger.info(f"Conversion PDF en images (DPI: {dpi})...")
            
            # Convertir PDF en images
            images = convert_from_path(pdf_path, dpi=dpi)
            
            logger.info(f"{len(images)} pages détectées")
            
            all_text = []
            all_confidences = []
            
            # OCR sur chaque page
            for i, image in enumerate(images):
                logger.info(f"OCR page {i+1}/{len(images)}...")
                
                # Sauvegarder temporairement
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                    image.save(tmp.name, 'PNG')
                    tmp_path = tmp.name
                
                try:
                    # OCR
                    result = self.ocr_image(tmp_path, preprocess=preprocess)
                    
                    if result['success']:
                        all_text.append(f"--- PAGE {i+1} ---\n{result['text']}")
                        all_confidences.append(result['confidence'])
                
                finally:
                    # Nettoyer
                    Path(tmp_path).unlink(missing_ok=True)
            
            # Confiance moyenne
            avg_confidence = (
                sum(all_confidences) / len(all_confidences)
                if all_confidences else 0
            )
            
            full_text = "\n\n".join(all_text)
            
            return {
                'text': full_text,
                'pages': len(images),
                'confidence': round(avg_confidence, 3),
                'success': bool(full_text),
                'provider': 'tesseract'
            }
            
        except Exception as e:
            logger.error(f"Erreur OCR PDF : {str(e)}")
            return {
                'text': '',
                'pages': 0,
                'confidence': 0.0,
                'success': False,
                'error': str(e),
                'provider': 'tesseract'
            }


# ========================================
# AWS TEXTRACT OCR
# ========================================

class AWSTextractOCR:
    """
    Service OCR avec AWS Textract
    
    Payant mais très précis, excellent pour tableaux
    """
    
    def __init__(self, region_name: str = 'eu-west-1'):
        """
        Initialiser AWS Textract
        
        Args:
            region_name: Région AWS
        """
        self.client = boto3.client('textract', region_name=region_name)
    
    def ocr_document(self, document_bytes: bytes) -> Dict:
        """
        OCR d'un document
        
        Args:
            document_bytes: Document en bytes
        
        Returns:
            {
                'text': str,
                'confidence': float,
                'success': bool
            }
        """
        try:
            # Appel API Textract
            response = self.client.detect_document_text(
                Document={'Bytes': document_bytes}
            )
            
            # Extraire le texte
            text_lines = []
            confidences = []
            
            for block in response['Blocks']:
                if block['BlockType'] == 'LINE':
                    text_lines.append(block['Text'])
                    confidences.append(block.get('Confidence', 0) / 100)
            
            full_text = '\n'.join(text_lines)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                'text': full_text,
                'confidence': round(avg_confidence, 3),
                'success': bool(full_text),
                'provider': 'aws_textract'
            }
            
        except Exception as e:
            logger.error(f"Erreur AWS Textract : {str(e)}")
            return {
                'text': '',
                'confidence': 0.0,
                'success': False,
                'error': str(e),
                'provider': 'aws_textract'
            }


# ========================================
# SERVICE OCR UNIFIÉ
# ========================================

class UnifiedOCRService:
    """
    Service OCR unifié avec fallback automatique
    
    Stratégie :
    1. Tesseract (gratuit) en premier
    2. AWS Textract en fallback si confiance < 70%
    """
    
    def __init__(
        self,
        tesseract_path: Optional[str] = None,
        default_provider: OCRProvider = OCRProvider.TESSERACT,
        enable_fallback: bool = True
    ):
        """
        Initialiser le service
        
        Args:
            tesseract_path: Chemin Tesseract
            default_provider: Provider par défaut
            enable_fallback: Activer fallback automatique
        """
        self.default_provider = default_provider
        self.enable_fallback = enable_fallback
        
        # Initialiser Tesseract
        self.tesseract = TesseractOCR(tesseract_path=tesseract_path)
        
        # Initialiser AWS Textract si configuré
        self.aws_textract = None
        if self._is_aws_configured():
            try:
                self.aws_textract = AWSTextractOCR()
                logger.info("AWS Textract disponible")
            except Exception as e:
                logger.warning(f"AWS Textract non disponible : {str(e)}")
    
    def extract_text(
        self,
        file_path: str,
        preprocess: bool = True,
        provider: Optional[OCRProvider] = None
    ) -> Dict:
        """
        Extraire le texte d'un document
        
        Args:
            file_path: Chemin vers le fichier
            preprocess: Appliquer preprocessing
            provider: Forcer un provider
        
        Returns:
            {
                'text': str,
                'confidence': float,
                'provider': str,
                'quality': str,
                'success': bool
            }
        """
        provider = provider or self.default_provider
        
        # Déterminer le type de fichier
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            return self._extract_from_pdf(file_path, preprocess, provider)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp']:
            return self._extract_from_image(file_path, preprocess, provider)
        else:
            return {
                'text': '',
                'confidence': 0.0,
                'provider': 'none',
                'quality': OCRQuality.LOW,
                'success': False,
                'error': f'Format {file_ext} non supporté'
            }
    
    def _extract_from_pdf(
        self,
        pdf_path: str,
        preprocess: bool,
        provider: OCRProvider
    ) -> Dict:
        """Extraire depuis un PDF"""
        
        if provider == OCRProvider.TESSERACT:
            result = self.tesseract.ocr_pdf(pdf_path, preprocess=preprocess)
        
        elif provider == OCRProvider.AWS_TEXTRACT and self.aws_textract:
            # Lire le PDF
            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()
            result = self.aws_textract.ocr_document(pdf_bytes)
        
        else:
            return {
                'text': '',
                'confidence': 0.0,
                'provider': str(provider),
                'quality': OCRQuality.LOW,
                'success': False,
                'error': f'Provider {provider} non disponible'
            }
        
        # Évaluer la qualité
        quality = self._evaluate_quality(result['confidence'])
        result['quality'] = quality
        
        # Fallback si qualité faible
        if self.enable_fallback and quality == OCRQuality.LOW:
            result = self._try_fallback(pdf_path, preprocess)
        
        return result
    
    def _extract_from_image(
        self,
        image_path: str,
        preprocess: bool,
        provider: OCRProvider
    ) -> Dict:
        """Extraire depuis une image"""
        
        if provider == OCRProvider.TESSERACT:
            result = self.tesseract.ocr_image(image_path, preprocess=preprocess)
        
        elif provider == OCRProvider.AWS_TEXTRACT and self.aws_textract:
            with open(image_path, 'rb') as f:
                img_bytes = f.read()
            result = self.aws_textract.ocr_document(img_bytes)
        
        else:
            return {
                'text': '',
                'confidence': 0.0,
                'provider': str(provider),
                'quality': OCRQuality.LOW,
                'success': False,
                'error': f'Provider {provider} non disponible'
            }
        
        quality = self._evaluate_quality(result['confidence'])
        result['quality'] = quality
        
        # Fallback si nécessaire
        if self.enable_fallback and quality == OCRQuality.LOW:
            result = self._try_fallback(image_path, preprocess)
        
        return result
    
    def _try_fallback(self, file_path: str, preprocess: bool) -> Dict:
        """Tenter un provider de fallback"""
        
        logger.warning("Qualité OCR faible, tentative fallback AWS Textract...")
        
        if not self.aws_textract:
            logger.warning("AWS Textract non disponible pour fallback")
            return {'success': False}
        
        try:
            with open(file_path, 'rb') as f:
                file_bytes = f.read()
            
            result = self.aws_textract.ocr_document(file_bytes)
            
            if result['success']:
                logger.info("✓ Fallback AWS Textract réussi")
                result['quality'] = self._evaluate_quality(result['confidence'])
                result['fallback'] = True
                return result
        
        except Exception as e:
            logger.error(f"Fallback échoué : {str(e)}")
        
        return {'success': False}
    
    @staticmethod
    def _evaluate_quality(confidence: float) -> OCRQuality:
        """Évaluer la qualité de l'OCR"""
        if confidence >= 0.95:
            return OCRQuality.EXCELLENT
        elif confidence >= 0.85:
            return OCRQuality.HIGH
        elif confidence >= 0.70:
            return OCRQuality.MEDIUM
        else:
            return OCRQuality.LOW
    
    @staticmethod
    def _is_aws_configured() -> bool:
        """Vérifier si AWS est configuré"""
        return all([
            os.getenv('AWS_ACCESS_KEY_ID'),
            os.getenv('AWS_SECRET_ACCESS_KEY')
        ])


# ========================================
# EXEMPLE D'UTILISATION
# ========================================

if __name__ == "__main__":
    # Configuration logging
    logging.basicConfig(level=logging.INFO)
    
    # Créer le service OCR
    ocr_service = UnifiedOCRService(
        tesseract_path='/usr/bin/tesseract',  # Ajuster selon OS
        default_provider=OCRProvider.TESSERACT,
        enable_fallback=True
    )
    
    # Extraire texte d'un PDF scanné
    result = ocr_service.extract_text(
        'facture_scan.pdf',
        preprocess=True
    )
    
    print(f"✓ Extraction réussie : {result['success']}")
    print(f"Provider utilisé : {result['provider']}")
    print(f"Confiance : {result['confidence']:.1%}")
    print(f"Qualité : {result['quality']}")
    print(f"\nTexte extrait :\n{result['text'][:500]}...")
