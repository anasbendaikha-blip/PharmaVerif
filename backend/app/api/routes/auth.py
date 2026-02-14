"""
PharmaVerif Backend - Routes d'Authentification
Copyright (c) 2026 Anas BENDAIKHA
Tous droits réservés.

Fichier : backend/app/api/routes/auth.py
Endpoints d'authentification JWT — Multi-tenant aware
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.schemas import (
    LoginRequest,
    LoginResponse,
    UserCreate,
    UserResponse,
    Token,
    TokenData,
    ChangePasswordRequest,
    MessageResponse,
    RegisterWithPharmacyRequest,
    RegisterWithPharmacyResponse,
    PharmacyResponse,
)
from app.database import get_db
from app.models import User, Pharmacy, PlanPharmacie
from app.core.exceptions import PharmaVerifException

router = APIRouter()

# Configuration sécurité
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

# ========================================
# FONCTIONS UTILITAIRES
# ========================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hasher un mot de passe"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Créer un token JWT — inclut pharmacy_id pour le multi-tenant"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return encoded_jwt

def authenticate_user(db: Session, email: str, password: str):
    """Authentifier un utilisateur"""
    user = db.query(User).filter(User.email == email).first()

    if not user:
        return False

    if not verify_password(password, user.hashed_password):
        return False

    if not user.actif:
        raise PharmaVerifException(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="USER_INACTIVE",
            message="Compte utilisateur désactivé",
        )

    return user

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Obtenir l'utilisateur courant depuis le token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")

        if user_id_str is None:
            raise credentials_exception

        token_data = TokenData(
            user_id=int(user_id_str),
            pharmacy_id=payload.get("pharmacy_id"),
        )

    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == token_data.user_id).first()

    if user is None:
        raise credentials_exception

    if not user.actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte utilisateur désactivé"
        )

    return user


def get_current_pharmacy_id(
    current_user: User = Depends(get_current_user),
) -> int:
    """
    Dependency multi-tenant : extraire le pharmacy_id du user courant.

    Retourne le pharmacy_id de l'utilisateur connecte.
    Leve une erreur si l'utilisateur n'est pas rattache a une pharmacie.
    """
    if current_user.pharmacy_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilisateur non rattaché à une pharmacie. Contactez l'administrateur.",
        )
    return current_user.pharmacy_id


async def get_current_active_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Vérifier que l'utilisateur est admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Privilèges administrateur requis"
        )
    return current_user

# ========================================
# ENDPOINTS
# ========================================

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Créer un nouveau compte utilisateur (endpoint public)

    Cet endpoint est accessible sans authentification.
    Pour des raisons de securite :
    - Le role est force a 'pharmacien' (pas d'escalade de privileges)
    - Le pharmacy_id est ignore (utiliser /register-pharmacy pour creer une pharmacie)

    - **email**: Email unique
    - **password**: Minimum 8 caractères, 1 majuscule, 1 chiffre
    - **nom**: Nom de famille
    - **prenom**: Prénom
    """
    # Vérifier si l'email existe déjà
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email"
        )

    # SECURITY: Force safe defaults on public registration endpoint.
    # Role and pharmacy_id can only be set by admin via /admin/create-user.
    safe_role = "pharmacien"
    safe_pharmacy_id = None

    # Créer l'utilisateur
    hashed_password = get_password_hash(user_data.password)

    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        nom=user_data.nom,
        prenom=user_data.prenom,
        role=safe_role,
        actif=True,
        pharmacy_id=safe_pharmacy_id,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


@router.post("/register-pharmacy", response_model=RegisterWithPharmacyResponse, status_code=status.HTTP_201_CREATED)
async def register_with_pharmacy(
    data: RegisterWithPharmacyRequest,
    db: Session = Depends(get_db)
):
    """
    Inscription complète : créer une pharmacie + un utilisateur admin

    Endpoint pour l'onboarding d'une nouvelle pharmacie.
    Crée automatiquement la pharmacie et l'utilisateur admin rattaché.
    """
    # Vérifier si l'email existe déjà
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email"
        )

    # Vérifier unicité SIRET si fourni
    if data.pharmacy_siret:
        existing_pharmacy = db.query(Pharmacy).filter(
            Pharmacy.siret == data.pharmacy_siret
        ).first()
        if existing_pharmacy:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Une pharmacie avec ce SIRET existe déjà"
            )

    # Créer la pharmacie
    pharmacy = Pharmacy(
        nom=data.pharmacy_nom,
        adresse=data.pharmacy_adresse,
        siret=data.pharmacy_siret,
        titulaire=data.pharmacy_titulaire,
        plan=PlanPharmacie.FREE,
        actif=True,
    )
    db.add(pharmacy)
    db.flush()

    # Créer l'utilisateur admin de cette pharmacie
    hashed_password = get_password_hash(data.password)
    db_user = User(
        email=data.email,
        hashed_password=hashed_password,
        nom=data.nom,
        prenom=data.prenom,
        role="admin",
        actif=True,
        pharmacy_id=pharmacy.id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    db.refresh(pharmacy)

    # Générer le token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(db_user.id),
            "email": db_user.email,
            "pharmacy_id": pharmacy.id,
        },
        expires_delta=access_token_expires
    )

    return RegisterWithPharmacyResponse(
        user=db_user,
        pharmacy=pharmacy,
        token=Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        ),
        message=f"Pharmacie '{pharmacy.nom}' et compte admin créés avec succès"
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Connexion utilisateur

    Retourne un token JWT valide pour l'authentification.
    Le token inclut le pharmacy_id pour le filtrage multi-tenant.

    - **email**: Email du compte
    - **password**: Mot de passe
    """
    user = authenticate_user(db, login_data.email, login_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Créer le token avec pharmacy_id
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "pharmacy_id": user.pharmacy_id,
        },
        expires_delta=access_token_expires
    )

    # Mettre à jour last_login
    user.last_login = datetime.utcnow()
    db.commit()

    return LoginResponse(
        user=user,
        token=Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # en secondes
        )
    )

@router.post("/login/form", response_model=LoginResponse)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Connexion avec formulaire OAuth2

    Alternative à /login pour compatibilité OAuth2.
    """
    user = authenticate_user(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "pharmacy_id": user.pharmacy_id,
        },
        expires_delta=access_token_expires
    )

    user.last_login = datetime.utcnow()
    db.commit()

    return LoginResponse(
        user=user,
        token=Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Obtenir les informations de l'utilisateur connecté

    Nécessite un token JWT valide.
    Inclut les informations de la pharmacie rattachée.
    """
    return current_user

@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Changer son mot de passe

    - **old_password**: Ancien mot de passe
    - **new_password**: Nouveau mot de passe (min 8 caractères, 1 majuscule, 1 chiffre)
    """
    # Vérifier l'ancien mot de passe
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ancien mot de passe incorrect"
        )

    # Hasher le nouveau mot de passe
    new_hashed_password = get_password_hash(password_data.new_password)

    # Mettre à jour
    current_user.hashed_password = new_hashed_password
    current_user.updated_at = datetime.utcnow()

    db.commit()

    return MessageResponse(
        message="Mot de passe modifié avec succès",
        success=True
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: User = Depends(get_current_user)
):
    """
    Rafraîchir le token JWT

    Génère un nouveau token avec une nouvelle expiration.
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(current_user.id),
            "email": current_user.email,
            "pharmacy_id": current_user.pharmacy_id,
        },
        expires_delta=access_token_expires
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Déconnexion

    Note: Avec JWT, la déconnexion est gérée côté client en supprimant le token.
    Cet endpoint est là pour la compatibilité et le logging.
    """
    return MessageResponse(
        message="Déconnexion réussie",
        success=True
    )

# ========================================
# ENDPOINTS ADMIN
# ========================================

@router.post("/admin/create-user", response_model=UserResponse)
async def admin_create_user(
    user_data: UserCreate,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    [ADMIN] Créer un utilisateur dans la meme pharmacie

    Permet de créer un utilisateur avec n'importe quel rôle.
    L'utilisateur est automatiquement rattache a la pharmacie de l'admin.
    """
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email"
        )

    hashed_password = get_password_hash(user_data.password)

    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        nom=user_data.nom,
        prenom=user_data.prenom,
        role=user_data.role,
        actif=user_data.actif,
        pharmacy_id=current_admin.pharmacy_id,  # Meme pharmacie que l'admin
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

class AdminResetPasswordRequest(BaseModel):
    """Schema pour la reinitialisation de mot de passe par un admin."""
    new_password: str = Field(..., min_length=8, max_length=100)

    @validator('new_password')
    def validate_password(cls, v):
        if not any(char.isdigit() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins un chiffre')
        if not any(char.isupper() for char in v):
            raise ValueError('Le mot de passe doit contenir au moins une majuscule')
        return v


@router.post("/admin/reset-password/{user_id}", response_model=MessageResponse)
async def admin_reset_password(
    user_id: int,
    body: AdminResetPasswordRequest,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """
    [ADMIN] Réinitialiser le mot de passe d'un utilisateur

    Seul un admin de la meme pharmacie peut reinitialiser le mot de passe.
    Le mot de passe est transmis dans le body JSON (pas en query param)
    pour eviter qu'il apparaisse dans les logs serveur et l'historique navigateur.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.pharmacy_id == current_admin.pharmacy_id,
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )

    user.hashed_password = get_password_hash(body.new_password)
    user.updated_at = datetime.utcnow()

    db.commit()

    return MessageResponse(
        message=f"Mot de passe réinitialisé pour {user.email}",
        success=True
    )
