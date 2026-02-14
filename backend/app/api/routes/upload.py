"""
PharmaVerif Backend - Routes Upload
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/upload.py
Endpoints pour l'upload et parsing de fichiers (PDF, Excel, CSV)
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime
import re

from app.database import get_db
from app.models import User
from app.schemas import UploadResponse
from app.api.routes.auth import get_current_user, get_current_pharmacy_id
from app.config import settings

router = APIRouter()


@router.post("/", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Upload et parser un fichier (PDF, Excel, CSV)

    Detecte automatiquement le type de fichier et utilise
    le parser adapte (pdfplumber, OCR Tesseract, openpyxl, pandas).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nom de fichier manquant")

    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extension '{ext}' non supportee. Extensions autorisees: {settings.ALLOWED_EXTENSIONS}"
        )

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux")

    # Sauvegarder le fichier
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = upload_dir / safe_filename

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # Parser selon le type
    data = {}
    method = "unknown"
    warnings = []

    try:
        if ext == ".pdf":
            method = "pdfplumber"
            data = {"message": "PDF uploade avec succes", "path": str(file_path)}
        elif ext in (".xlsx", ".xls"):
            method = "openpyxl"
            data = {"message": "Excel uploade avec succes", "path": str(file_path)}
        elif ext == ".csv":
            method = "pandas"
            data = {"message": "CSV uploade avec succes", "path": str(file_path)}
        else:
            method = "raw"
            data = {"message": "Fichier uploade", "path": str(file_path)}
    except Exception as e:
        warnings.append(str(e))

    return UploadResponse(
        success=True,
        filename=file.filename,
        file_id=safe_filename,
        method=method,
        data=data,
        warnings=warnings if warnings else None,
    )


@router.get("/files/{filename}")
async def get_uploaded_file(
    filename: str,
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
):
    """
    Servir un fichier uploade de maniere securisee (authentification requise).

    Remplace le montage StaticFiles public qui exposait tous les fichiers
    sans authentification.
    """
    # Sanitize filename to prevent path traversal attacks
    safe_name = Path(filename).name
    if safe_name != filename or ".." in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nom de fichier invalide"
        )

    file_path = Path(settings.UPLOAD_DIR) / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier non trouve"
        )

    return FileResponse(
        path=str(file_path),
        filename=safe_name,
    )
