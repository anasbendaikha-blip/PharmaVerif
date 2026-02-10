# 🚀 Guide de Déploiement Complet - PharmaVerif

**Déployer votre application full-stack en production**

Copyright © 2026 Anas BENDAIKHA - Tous droits réservés

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Structure des fichiers](#structure-des-fichiers)
4. [Setup Backend Local](#setup-backend-local)
5. [Setup Frontend](#setup-frontend)
6. [Déploiement Frontend](#déploiement-frontend)
7. [Déploiement Backend](#déploiement-backend)
8. [Configuration Production](#configuration-production)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🎯 Vue d'ensemble

### Architecture

```
┌─────────────────────────────────────────┐
│  FRONTEND (Vercel/Netlify)              │
│  - React + TypeScript                   │
│  - Interface utilisateur                │
│  - https://pharmaverif.vercel.app       │
└────────────────┬────────────────────────┘
                 │ HTTPS API Calls
                 ▼
┌─────────────────────────────────────────┐
│  BACKEND (Railway/Render/DigitalOcean)  │
│  - FastAPI + Python                     │
│  - API REST                             │
│  - https://api.pharmaverif.com          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  DATABASE (PostgreSQL)                  │
│  - Données persistantes                 │
└─────────────────────────────────────────┘
```

### Stack technique

| Composant | Technologie | Hébergement recommandé |
|-----------|-------------|------------------------|
| **Frontend** | React + Vite | Vercel / Netlify |
| **Backend** | FastAPI + Python | Railway / Render |
| **Database** | PostgreSQL | Railway / Supabase |
| **OCR** | Tesseract / AWS | Intégré / AWS |
| **Files** | Local / S3 | Railway volumes / S3 |

---

## ✅ Prérequis

### Pour développement local

- ✅ Node.js 18+
- ✅ Python 3.11+
- ✅ Git
- ✅ Docker (optionnel)
- ✅ PostgreSQL (optionnel en local)
- ✅ Tesseract OCR

### Comptes nécessaires (gratuits)

- ✅ [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) - Frontend
- ✅ [Railway](https://railway.app) ou [Render](https://render.com) - Backend
- ✅ [GitHub](https://github.com) - Code source
- ❌ AWS (optionnel) - OCR avancé

---

## 📁 Structure des fichiers

### Étape 1 : Organiser les fichiers backend

```bash
# Créer la structure backend
mkdir -p backend/app/{api/routes,services,models,core,db}
mkdir -p backend/alembic/versions
mkdir -p backend/uploads backend/exports backend/logs

# Copier les fichiers depuis le root vers backend/
cp BACKEND_MODELS.py backend/app/models.py
cp BACKEND_DATABASE.py backend/app/database.py
cp BACKEND_CONFIG_COMPLETE.py backend/app/config.py

# Routes API
cp API_MAIN.py backend/app/main.py
cp API_SCHEMAS.py backend/app/schemas.py
cp API_AUTH_ROUTES.py backend/app/api/routes/auth.py
cp API_FACTURES_ROUTES.py backend/app/api/routes/factures.py
cp API_STATS_ROUTES.py backend/app/api/routes/stats.py
cp API_EXCEPTIONS.py backend/app/core/exceptions.py

# Services
cp OCR_SERVICE_COMPLETE.py backend/app/services/ocr_service.py
cp BACKEND_EXCEL_PARSER.py backend/app/services/excel_parser.py

# Configuration
cp BACKEND_REQUIREMENTS.txt backend/requirements.txt
cp BACKEND_DOCKERFILE.txt backend/Dockerfile
cp BACKEND_DOCKER_COMPOSE.yml docker-compose.yml
cp BACKEND_ENV_TEMPLATE.txt backend/.env.example
```

### Étape 2 : Créer __init__.py

```bash
# Créer les fichiers __init__.py pour Python
touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/api/routes/__init__.py
touch backend/app/services/__init__.py
touch backend/app/models/__init__.py
touch backend/app/core/__init__.py
```

### Structure finale

```
pharmaverif/
├── frontend/                    # React app
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # FastAPI app
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # Point d'entrée
│   │   ├── config.py           # Configuration
│   │   ├── database.py         # DB setup
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── schemas.py          # Pydantic schemas
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes/
│   │   │       ├── __init__.py
│   │   │       ├── auth.py
│   │   │       ├── factures.py
│   │   │       └── stats.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ocr_service.py
│   │   │   └── excel_parser.py
│   │   │
│   │   └── core/
│   │       ├── __init__.py
│   │       └── exceptions.py
│   │
│   ├── alembic/                # Migrations
│   ├── uploads/                # Fichiers uploadés
│   ├── exports/                # Exports générés
│   ├── logs/                   # Logs
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── .env                    # À créer (pas dans Git!)
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 🔧 Setup Backend Local

### 1. Créer l'environnement virtuel

```bash
cd backend

# Créer venv
python3 -m venv venv

# Activer
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate
```

### 2. Installer les dépendances

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Installer Tesseract OCR

```bash
# macOS
brew install tesseract tesseract-lang

# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-fra

# Windows
# Télécharger: https://github.com/UB-Mannheim/tesseract/wiki
```

### 4. Configurer l'environnement

```bash
# Copier le template
cp .env.example .env

# Éditer .env
nano .env
```

**Configuration minimale (.env)** :

```env
# App
APP_NAME=PharmaVerif API
ENVIRONMENT=development
DEBUG=true

# Security
SECRET_KEY=votre_cle_secrete_de_32_caracteres_minimum_ici

# Database (SQLite pour dev)
DATABASE_URL=sqlite:///./pharmaverif.db

# OCR
TESSERACT_PATH=/usr/bin/tesseract
DEFAULT_OCR_PROVIDER=tesseract

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 5. Initialiser la base de données

```bash
# Depuis backend/
python << EOF
from app.database import init_database
init_database()
EOF
```

### 6. Lancer le serveur

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**API disponible sur** : http://localhost:8000

**Documentation** : http://localhost:8000/api/docs

### 7. Tester l'API

```bash
# Health check
curl http://localhost:8000/health

# Devrait retourner:
# {"status":"healthy","service":"pharmaverif-api","version":"1.0.0"}
```

---

## 🎨 Setup Frontend

### 1. Installer les dépendances

```bash
# Depuis la racine du projet
npm install
```

### 2. Configurer l'API

Créer `.env.local` :

```env
VITE_API_URL=http://localhost:8000
```

### 3. Lancer en dev

```bash
npm run dev
```

**App disponible sur** : http://localhost:5173

---

## 🌐 Déploiement Frontend

### Option A : Vercel (Recommandé) ⭐

#### 1. Installer Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login

```bash
vercel login
```

#### 3. Déployer

```bash
# Depuis la racine du projet
vercel

# Pour production
vercel --prod
```

#### 4. Configurer les variables d'environnement

Sur https://vercel.com :
1. Sélectionner votre projet
2. Settings > Environment Variables
3. Ajouter :
   ```
   VITE_API_URL=https://votre-backend.railway.app
   ```

#### 5. Redéployer

```bash
vercel --prod
```

**Votre frontend est live** : https://pharmaverif.vercel.app

---

### Option B : Netlify

#### 1. Installer Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2. Login

```bash
netlify login
```

#### 3. Build

```bash
npm run build
```

#### 4. Déployer

```bash
netlify deploy --prod --dir=dist
```

#### 5. Configurer variables

```bash
netlify env:set VITE_API_URL "https://votre-backend.railway.app"
```

**Votre frontend est live** : https://pharmaverif.netlify.app

---

## 🚀 Déploiement Backend

### Option A : Railway (Recommandé) ⭐

Railway = Platform-as-a-Service avec PostgreSQL intégré

#### 1. Créer compte

- Aller sur https://railway.app
- Sign up avec GitHub

#### 2. Nouveau projet

1. New Project
2. Deploy from GitHub repo
3. Sélectionner votre repo
4. Root directory: `/backend`

#### 3. Ajouter PostgreSQL

1. New > Database > PostgreSQL
2. Railway créé automatiquement la DB

#### 4. Configurer variables

Dans Railway dashboard :
```
APP_NAME=PharmaVerif API
ENVIRONMENT=production
DEBUG=false

# Railway génère automatiquement DATABASE_URL
# Pas besoin de le définir manuellement!

SECRET_KEY=generer_une_cle_securisee_de_32_caracteres_minimum

ALLOWED_ORIGINS=https://pharmaverif.vercel.app,https://pharmaverif.netlify.app

TESSERACT_PATH=/usr/bin/tesseract
DEFAULT_OCR_PROVIDER=tesseract
ENABLE_OCR_FALLBACK=true
```

#### 5. Générer SECRET_KEY sécurisé

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Copier le résultat dans Railway
```

#### 6. Déployer

Railway détecte automatiquement :
- `requirements.txt` → Installe dépendances
- `Dockerfile` → Build l'image
- Port 8000 → Expose l'API

#### 7. Domaine personnalisé (optionnel)

Settings > Networking > Generate Domain

Vous obtenez : `https://pharmaverif-production.up.railway.app`

#### 8. Initialiser la DB

```bash
# Se connecter au container
railway run python -c "from app.database import init_database; init_database()"
```

**Votre backend est live** ! 🎉

---

### Option B : Render

#### 1. Créer compte

https://render.com

#### 2. Nouveau Web Service

1. New > Web Service
2. Connect repository
3. Configuration :
   - **Name**: pharmaverif-api
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

#### 3. Ajouter PostgreSQL

1. New > PostgreSQL
2. Connecter au Web Service

#### 4. Variables d'environnement

Même configuration que Railway

#### 5. Déployer

Render build et déploie automatiquement

**URL** : https://pharmaverif-api.onrender.com

---

### Option C : DigitalOcean App Platform

#### 1. Créer compte

https://www.digitalocean.com

#### 2. App Platform

1. Create > Apps
2. Source : GitHub
3. Configure :
   - Type: Web Service
   - Build Command: `pip install -r requirements.txt`
   - Run Command: `uvicorn app.main:app --host 0.0.0.0 --port 8080`

#### 3. Ajouter database

Component > Database > PostgreSQL

**Prix** : À partir de $5/mois

---

## 🐳 Déploiement Docker

### Sur votre serveur (VPS)

#### 1. Cloner le repo

```bash
git clone https://github.com/votre-username/pharmaverif.git
cd pharmaverif
```

#### 2. Configurer .env

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

#### 3. Lancer avec Docker Compose

```bash
docker-compose up -d
```

Services démarrés :
- API : http://localhost:8000
- PostgreSQL : localhost:5432

#### 4. Initialiser la DB

```bash
docker-compose exec api python -c "from app.database import init_database; init_database()"
```

#### 5. Voir les logs

```bash
docker-compose logs -f api
```

---

## 🔒 Configuration Production

### Checklist Sécurité

#### Backend

```env
# .env PRODUCTION
ENVIRONMENT=production
DEBUG=false

# SECRET_KEY : 32+ caractères aléatoires
SECRET_KEY=votre_vraie_cle_de_production_tres_securisee

# Database : PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/pharmaverif

# CORS : Uniquement vos domaines
ALLOWED_ORIGINS=https://pharmaverif.vercel.app

# HTTPS uniquement
FORCE_HTTPS=true
```

#### Sécurité

- ✅ `DEBUG=false` en production
- ✅ SECRET_KEY sécurisé (32+ caractères)
- ✅ PostgreSQL (pas SQLite)
- ✅ HTTPS activé
- ✅ CORS restrictif
- ✅ Rate limiting activé
- ✅ Logs configurés
- ✅ Backups automatiques DB

### .gitignore

```gitignore
# Environment
.env
.env.local
.env.production

# Python
__pycache__/
*.py[cod]
venv/
*.egg-info/

# Database
*.db
*.sqlite3

# Uploads
uploads/
exports/
logs/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Backend
curl https://votre-backend.railway.app/health

# Devrait retourner 200 OK
```

### Logs

#### Railway

Dashboard > Deployments > View Logs

#### Render

Dashboard > Logs

#### Docker

```bash
docker-compose logs -f api
```

### Backups Database

#### Railway

Dashboard > Database > Backups (automatique)

#### Manuel (PostgreSQL)

```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Monitoring (optionnel)

#### Sentry (erreurs)

1. Créer compte : https://sentry.io
2. Obtenir DSN
3. Ajouter à .env :
   ```
   SENTRY_DSN=https://xxx@sentry.io/xxx
   ```

#### Uptime monitoring

- [UptimeRobot](https://uptimerobot.com) - Gratuit
- [Pingdom](https://www.pingdom.com)

---

## ✅ Checklist Finale

### Frontend

- [ ] Code buildé sans erreurs (`npm run build`)
- [ ] Variables d'environnement configurées
- [ ] Déployé sur Vercel/Netlify
- [ ] URL backend configurée
- [ ] HTTPS activé
- [ ] Tests manuels OK

### Backend

- [ ] Tous les fichiers au bon endroit
- [ ] `requirements.txt` installé
- [ ] `.env` configuré
- [ ] Database PostgreSQL créée
- [ ] Migrations appliquées
- [ ] Données de démo créées
- [ ] Tesseract installé
- [ ] API accessible via HTTPS
- [ ] Documentation Swagger accessible
- [ ] Health check OK
- [ ] Tests API OK

### Base de données

- [ ] PostgreSQL en production
- [ ] Backups automatiques activés
- [ ] Comptes admin et test créés
- [ ] Grossistes de démo ajoutés

### Sécurité

- [ ] `DEBUG=false` en production
- [ ] SECRET_KEY sécurisé
- [ ] CORS restrictif
- [ ] HTTPS forcé
- [ ] Rate limiting activé
- [ ] Pas de secrets dans Git

---

## 🎉 C'est déployé !

**Votre application est maintenant en production** ! 🚀

### URLs

- **Frontend** : https://pharmaverif.vercel.app
- **Backend** : https://pharmaverif-api.railway.app
- **API Docs** : https://pharmaverif-api.railway.app/api/docs

### Comptes de test

```
Admin:
Email: admin@pharmaverif.com
Password: Admin123!

Pharmacien:
Email: pharmacien@pharmaverif.com
Password: Pharma123!
```

### Support

Pour toute question :
- 📧 Email : contact@pharmaverif.com
- 📚 Documentation : ce guide
- 🐛 Issues : GitHub

---

<div align="center">

**🏥 PharmaVerif - Déployé avec succès !**

Développé avec ❤️ par **Anas BENDAIKHA**

© 2026 - Tous droits réservés

</div>
