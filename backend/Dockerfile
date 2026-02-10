# ========================================
# PharmaVerif Backend - Dockerfile
# Copyright (c) 2026 Anas BENDAIKHA
# ========================================

FROM python:3.11-slim

# Métadonnées
LABEL maintainer="Anas BENDAIKHA <contact@pharmaverif.com>"
LABEL version="1.0"
LABEL description="PharmaVerif Backend API"

# Variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Dossier de travail
WORKDIR /app

# ========================================
# DEPENDENCIES SYSTÈME
# ========================================

# Installer dépendances système pour OCR et PDF
RUN apt-get update && apt-get install -y \
    # Tesseract OCR
    tesseract-ocr \
    tesseract-ocr-fra \
    # Librairies pour PDF
    poppler-utils \
    # Librairies pour OpenCV
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1-mesa-glx \
    # PostgreSQL client
    libpq-dev \
    gcc \
    # Nettoyage
    && rm -rf /var/lib/apt/lists/*

# ========================================
# PYTHON DEPENDENCIES
# ========================================

# Copier requirements
COPY requirements.txt .

# Installer dépendances Python
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# ========================================
# APPLICATION CODE
# ========================================

# Copier le code source
COPY ./app /app/app
COPY alembic.ini /app/
COPY alembic /app/alembic

# Créer les dossiers nécessaires
RUN mkdir -p /app/uploads /app/exports /app/logs

# ========================================
# USER & PERMISSIONS
# ========================================

# Créer un utilisateur non-root pour sécurité
RUN useradd -m -u 1000 pharmaverif && \
    chown -R pharmaverif:pharmaverif /app

USER pharmaverif

# ========================================
# HEALTHCHECK
# ========================================

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# ========================================
# EXPOSE PORT
# ========================================

EXPOSE 8000

# ========================================
# STARTUP
# ========================================

# Script de démarrage
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
