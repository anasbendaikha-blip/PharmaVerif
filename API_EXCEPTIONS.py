"""
PharmaVerif Backend - Exceptions personnalisées
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/core/exceptions.py
"""

from fastapi import HTTPException, status
from typing import Optional, Dict, Any


class PharmaVerifException(HTTPException):
    """Exception de base pour PharmaVerif"""
    
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        
        super().__init__(
            status_code=status_code,
            detail={
                "error": error_code,
                "message": message,
                "details": self.details
            }
        )


# ========================================
# EXCEPTIONS AUTHENTIFICATION
# ========================================

class InvalidCredentialsException(PharmaVerifException):
    """Identifiants invalides"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="INVALID_CREDENTIALS",
            message="Email ou mot de passe incorrect"
        )


class TokenExpiredException(PharmaVerifException):
    """Token expiré"""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="TOKEN_EXPIRED",
            message="Token JWT expiré"
        )


class InsufficientPermissionsException(PharmaVerifException):
    """Permissions insuffisantes"""
    def __init__(self, required_role: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="INSUFFICIENT_PERMISSIONS",
            message=f"Privilèges {required_role} requis",
            details={"required_role": required_role}
        )


# ========================================
# EXCEPTIONS RESSOURCES
# ========================================

class ResourceNotFoundException(PharmaVerifException):
    """Ressource non trouvée"""
    def __init__(self, resource_type: str, resource_id: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND",
            message=f"{resource_type} avec ID {resource_id} non trouvé(e)",
            details={
                "resource_type": resource_type,
                "resource_id": str(resource_id)
            }
        )


class DuplicateResourceException(PharmaVerifException):
    """Ressource déjà existante"""
    def __init__(self, resource_type: str, field: str, value: Any):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="DUPLICATE_RESOURCE",
            message=f"Un(e) {resource_type} avec {field} '{value}' existe déjà",
            details={
                "resource_type": resource_type,
                "field": field,
                "value": str(value)
            }
        )


# ========================================
# EXCEPTIONS VALIDATION
# ========================================

class ValidationException(PharmaVerifException):
    """Erreur de validation"""
    def __init__(self, field: str, message: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            message="Erreur de validation",
            details={
                "field": field,
                "error": message
            }
        )


# ========================================
# EXCEPTIONS FICHIERS
# ========================================

class FileUploadException(PharmaVerifException):
    """Erreur lors de l'upload"""
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="FILE_UPLOAD_ERROR",
            message=message
        )


class UnsupportedFileTypeException(PharmaVerifException):
    """Type de fichier non supporté"""
    def __init__(self, file_type: str, supported_types: list):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="UNSUPPORTED_FILE_TYPE",
            message=f"Type de fichier '{file_type}' non supporté",
            details={
                "file_type": file_type,
                "supported_types": supported_types
            }
        )


class FileSizeExceededException(PharmaVerifException):
    """Fichier trop volumineux"""
    def __init__(self, size: int, max_size: int):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            error_code="FILE_SIZE_EXCEEDED",
            message=f"Fichier trop volumineux ({size} bytes)",
            details={
                "size": size,
                "max_size": max_size,
                "max_size_mb": max_size / (1024 * 1024)
            }
        )


# ========================================
# EXCEPTIONS PARSING
# ========================================

class ParsingException(PharmaVerifException):
    """Erreur de parsing"""
    def __init__(self, message: str, file_type: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="PARSING_ERROR",
            message=message,
            details={"file_type": file_type}
        )


# ========================================
# EXCEPTIONS MÉTIER
# ========================================

class VerificationException(PharmaVerifException):
    """Erreur lors de la vérification"""
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VERIFICATION_ERROR",
            message=message
        )


class InconsistentDataException(PharmaVerifException):
    """Données incohérentes"""
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INCONSISTENT_DATA",
            message=message
        )


# ========================================
# EXCEPTIONS RATE LIMITING
# ========================================

class RateLimitExceededException(PharmaVerifException):
    """Rate limit dépassé"""
    def __init__(self, retry_after: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            message=f"Trop de requêtes. Réessayez dans {retry_after} secondes.",
            details={"retry_after": retry_after}
        )
