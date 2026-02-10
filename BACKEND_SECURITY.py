"""
PharmaVerif Backend - Security Utilities
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/core/security.py
Utilitaires de sécurité : JWT, passwords, tokens
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

# ========================================
# PASSWORD HASHING
# ========================================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hasher un mot de passe avec bcrypt
    
    Args:
        password: Mot de passe en clair
    
    Returns:
        Hash du mot de passe
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifier un mot de passe
    
    Args:
        plain_password: Mot de passe en clair
        hashed_password: Hash stocké en DB
    
    Returns:
        True si match
    """
    return pwd_context.verify(plain_password, hashed_password)


# ========================================
# JWT TOKENS
# ========================================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Créer un JWT access token
    
    Args:
        data: Données à encoder dans le token
        expires_delta: Durée de validité (défaut: config)
    
    Returns:
        JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Décoder un JWT token
    
    Args:
        token: JWT token string
    
    Returns:
        Payload décodé
    
    Raises:
        HTTPException si token invalide
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ========================================
# AUTHENTICATION DEPENDENCY
# ========================================

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Obtenir l'utilisateur courant depuis le JWT
    
    Usage:
        @app.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user": current_user.email}
    
    Args:
        credentials: Bearer token
        db: Session DB
    
    Returns:
        User object
    
    Raises:
        HTTPException si non authentifié
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé",
        )
    
    if not user.actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé",
        )
    
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Vérifier que l'utilisateur est actif
    
    Args:
        current_user: User depuis get_current_user
    
    Returns:
        User si actif
    
    Raises:
        HTTPException si inactif
    """
    if not current_user.actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé"
        )
    return current_user


# ========================================
# ROLE-BASED ACCESS CONTROL
# ========================================

def require_role(*allowed_roles: str):
    """
    Décorateur pour vérifier le rôle utilisateur
    
    Usage:
        @app.get("/admin")
        def admin_only(current_user: User = Depends(require_role("admin"))):
            return {"message": "Admin access"}
    
    Args:
        allowed_roles: Rôles autorisés
    
    Returns:
        Dependency function
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès refusé. Rôle requis : {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker


# Aliases pour les rôles courants
require_admin = require_role("admin")
require_pharmacien = require_role("admin", "pharmacien")
require_comptable = require_role("admin", "pharmacien", "comptable")


# ========================================
# TOKEN VALIDATION
# ========================================

def validate_token(token: str) -> bool:
    """
    Vérifier si un token est valide
    
    Args:
        token: JWT token
    
    Returns:
        True si valide
    """
    try:
        decode_access_token(token)
        return True
    except HTTPException:
        return False


def get_token_expiry(token: str) -> Optional[datetime]:
    """
    Obtenir la date d'expiration d'un token
    
    Args:
        token: JWT token
    
    Returns:
        Date d'expiration ou None
    """
    try:
        payload = decode_access_token(token)
        exp = payload.get("exp")
        if exp:
            return datetime.fromtimestamp(exp)
        return None
    except HTTPException:
        return None


# ========================================
# REFRESH TOKEN (optionnel)
# ========================================

def create_refresh_token(data: Dict[str, Any], expires_delta: timedelta = timedelta(days=7)) -> str:
    """
    Créer un refresh token (durée de vie plus longue)
    
    Args:
        data: Données à encoder
        expires_delta: Durée de validité
    
    Returns:
        JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def verify_refresh_token(token: str) -> Dict[str, Any]:
    """
    Vérifier un refresh token
    
    Args:
        token: Refresh token
    
    Returns:
        Payload si valide
    
    Raises:
        HTTPException si invalide
    """
    payload = decode_access_token(token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Type de token invalide"
        )
    
    return payload


# ========================================
# UTILITY FUNCTIONS
# ========================================

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authentifier un utilisateur
    
    Args:
        db: Session DB
        email: Email utilisateur
        password: Mot de passe en clair
    
    Returns:
        User si authentifié, None sinon
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return user


def generate_token_pair(user: User) -> Dict[str, str]:
    """
    Générer une paire access + refresh token
    
    Args:
        user: User object
    
    Returns:
        Dict avec access_token et refresh_token
    """
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role.value}
    )
    
    refresh_token = create_refresh_token(
        data={"sub": user.id}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# ========================================
# EXPORT
# ========================================

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
    "get_current_user",
    "get_current_active_user",
    "require_role",
    "require_admin",
    "require_pharmacien",
    "require_comptable",
    "validate_token",
    "get_token_expiry",
    "create_refresh_token",
    "verify_refresh_token",
    "authenticate_user",
    "generate_token_pair",
]
