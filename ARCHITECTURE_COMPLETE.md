# 🏗️ Architecture Complète PharmaVerif

**Application Full-Stack pour vérification de factures pharmaceutiques**

Copyright © 2026 Anas BENDAIKHA - Tous droits réservés

---

## 📊 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                              │
│                    (Pharmacien / Gérant)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Interface Web
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Pages                                                    │   │
│  │  • HomePage - Accueil et stats                           │   │
│  │  • VerificationPage - Upload et analyse                  │   │
│  │  • DashboardPage - Tableau de bord                       │   │
│  │  • MentionsLegalesPage - Légal                           │   │
│  │  • ContactPage - Contact                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Composants                                              │   │
│  │  • FileUpload - Drag & drop fichiers                     │   │
│  │  • AnomalieCard - Affichage anomalies                    │   │
│  │  • Charts - Graphiques Recharts                          │   │
│  │  • UI Components - shadcn/ui                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Utils                                                    │   │
│  │  • fileParser.ts - Parsing Excel/CSV (Frontend)          │   │
│  │  • verificationLogic.ts - Logique métier                 │   │
│  │  • pdfExport.ts - Export PDF (jsPDF)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Technologies:                                                    │
│  • React 18, TypeScript, Tailwind CSS v4                         │
│  • Vite, Radix UI, Lucide Icons, Motion                          │
│  • xlsx (parsing Excel), jsPDF (export)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP REST API
                         │ (JSON)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   BACKEND (FastAPI + Python)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes                                              │   │
│  │  • POST /api/v1/upload - Upload fichiers                │   │
│  │  • POST /api/v1/verification/verify - Vérifier facture  │   │
│  │  • GET /api/v1/factures - Liste factures                │   │
│  │  • GET /api/v1/grossistes - Liste grossistes            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Services                                                │   │
│  │  • pdf_parser.py - Extraction PDF (PyPDF2/pdfplumber)   │   │
│  │  • ocr_service.py - OCR Tesseract (PDFs scannés)        │   │
│  │  • excel_parser.py - Parsing Excel/CSV (openpyxl/pandas)│   │
│  │  • verification.py - Logique de vérification            │   │
│  │  • file_handler.py - Gestion uploads                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Models (SQLAlchemy)                                     │   │
│  │  • Facture - Données facture                             │   │
│  │  • Grossiste - Fournisseurs et taux                      │   │
│  │  • Anomalie - Détection remises manquantes              │   │
│  │  • User - Utilisateurs (optionnel)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Technologies:                                                    │
│  • FastAPI, Pydantic, SQLAlchemy                                 │
│  • PyPDF2, pdfplumber, Tesseract OCR                             │
│  • openpyxl, pandas                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ SQL Queries
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    BASE DE DONNÉES                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Tables                                                   │   │
│  │  • factures - Toutes les factures vérifiées              │   │
│  │  • grossistes - Liste des fournisseurs                   │   │
│  │  • anomalies - Détection remises manquantes              │   │
│  │  • lignes_facture - Détail des produits                  │   │
│  │  • users - Comptes utilisateurs (optionnel)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Options:                                                         │
│  • PostgreSQL (Production recommandée)                           │
│  • Supabase (PostgreSQL managed + Auth)                          │
│  • SQLite (Développement local)                                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flux de données

### **1. Upload et Parsing de Facture**

```
┌──────────────┐
│ Utilisateur  │
│ Upload PDF/  │
│ Excel/CSV    │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  FileUpload.tsx      │
│  Validation client   │
└──────┬───────────────┘
       │
       ├─ Si Excel/CSV (Frontend)
       │  │
       │  ▼
       │  ┌────────────────────────┐
       │  │ fileParser.ts          │
       │  │ - Parsing XLSX         │
       │  │ - Détection colonnes   │
       │  │ - Extraction données   │
       │  └────────┬───────────────┘
       │           │
       │           ▼
       │  ┌────────────────────────┐
       │  │ verificationLogic.ts   │
       │  │ - Convertir en Facture │
       │  │ - Vérifier anomalies   │
       │  └────────┬───────────────┘
       │           │
       └───────────┼────────────────────┐
                   │                    │
                   ▼                    │
          ┌────────────────┐           │
          │ Affichage      │           │
          │ Résultats      │           │
          └────────────────┘           │
                                        │
       Si PDF (Backend requis) ────────┘
       │
       ▼
┌──────────────────────┐
│  POST /api/v1/upload │
│  Backend FastAPI     │
└──────┬───────────────┘
       │
       ├─ PDF avec texte
       │  │
       │  ▼
       │  ┌────────────────────────┐
       │  │ pdf_parser.py          │
       │  │ - PyPDF2 extraction    │
       │  │ - pdfplumber tableaux  │
       │  └────────┬───────────────┘
       │           │
       └───────────┼────────────────┐
                   │                │
       PDF scanné  │                │
       │           │                │
       ▼           │                │
┌──────────────────────┐           │
│ ocr_service.py       │           │
│ - Tesseract OCR      │           │
│ - Extraction texte   │           │
└──────┬───────────────┘           │
       │                            │
       └────────────────────────────┘
                   │
                   ▼
          ┌────────────────────┐
          │ Données structurées│
          │ Retour JSON        │
          └────────┬───────────┘
                   │
                   ▼
          ┌────────────────────┐
          │ Frontend affiche   │
          │ Résultats          │
          └────────────────────┘
```

### **2. Vérification des Remises**

```
┌────────────────────┐
│ Facture parsée     │
│ + Grossiste        │
└────────┬───────────┘
         │
         ▼
┌─────────────────────────────────┐
│ verifyFacture()                  │
│                                  │
│ 1. Calculer remise attendue :   │
│    = Brut HT × (Taux total)     │
│                                  │
│ 2. Calculer remise appliquée :  │
│    = Remises lignes + Pied      │
│                                  │
│ 3. Comparer :                    │
│    Écart = Attendue - Appliquée │
│                                  │
│ 4. Si |Écart| > 5€ :            │
│    ➜ ANOMALIE DÉTECTÉE          │
└────────┬────────────────────────┘
         │
         ▼
┌────────────────────┐
│ Liste d'anomalies  │
│ • Type             │
│ • Montant écart    │
│ • Description      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Affichage Cards    │
│ + Export PDF       │
└────────────────────┘
```

---

## 📂 Structure des Fichiers

### **Frontend (`/src`)**

```
src/
├── app/
│   ├── components/
│   │   ├── ui/                    # Components shadcn/ui
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   ├── FileUpload.tsx         # Upload drag & drop
│   │   ├── AnomalieCard.tsx       # Affichage anomalie
│   │   ├── Logo.tsx               # Logo PharmaVerif
│   │   └── Footer.tsx             # Footer copyright
│   │
│   ├── pages/
│   │   ├── HomePage.tsx           # Page d'accueil
│   │   ├── VerificationPage.tsx   # Upload et vérification
│   │   ├── DashboardPage.tsx      # Tableau de bord
│   │   ├── MentionsLegalesPage.tsx
│   │   └── ContactPage.tsx
│   │
│   ├── utils/
│   │   ├── fileParser.ts          # ⭐ Parsing Excel/CSV
│   │   ├── verificationLogic.ts   # ⭐ Logique métier
│   │   ├── pdfExport.ts           # Export PDF jsPDF
│   │   └── formatNumber.ts        # Format français
│   │
│   ├── data/
│   │   └── database.ts            # Base in-memory
│   │
│   ├── api/
│   │   └── client.ts              # Client API backend
│   │
│   ├── types.ts                   # Types TypeScript
│   └── App.tsx                    # Composant principal
│
└── styles/
    ├── globals.css                # Styles globaux
    ├── theme.css                  # Tokens Tailwind v4
    └── fonts.css                  # Google Fonts
```

### **Backend (`/backend`)**

```
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── upload.py          # ⭐ Upload fichiers
│   │       ├── verification.py    # Vérification
│   │       ├── factures.py        # CRUD factures
│   │       └── grossistes.py      # CRUD grossistes
│   │
│   ├── services/
│   │   ├── pdf_parser.py          # ⭐ Parsing PDF
│   │   ├── ocr_service.py         # ⭐ OCR Tesseract
│   │   ├── excel_parser.py        # ⭐ Parsing Excel
│   │   ├── verification.py        # Logique vérification
│   │   └── file_handler.py        # Gestion fichiers
│   │
│   ├── models/
│   │   ├── facture.py             # Modèle Facture
│   │   ├── grossiste.py           # Modèle Grossiste
│   │   ├── anomalie.py            # Modèle Anomalie
│   │   └── user.py                # Modèle User
│   │
│   ├── schemas/
│   │   ├── facture.py             # Schema Pydantic
│   │   └── verification.py        # Schema validation
│   │
│   ├── db/
│   │   ├── session.py             # Sessions DB
│   │   └── base.py                # Base SQLAlchemy
│   │
│   ├── core/
│   │   ├── security.py            # Auth JWT
│   │   └── utils.py               # Utilitaires
│   │
│   ├── config.py                  # Configuration
│   └── main.py                    # Point d'entrée FastAPI
│
├── uploads/                       # Fichiers uploadés
├── logs/                          # Logs application
├── tests/                         # Tests pytest
├── .env                          # Variables environnement
└── requirements.txt              # Dépendances Python
```

---

## 🔧 Technologies et Bibliothèques

### **Frontend**

| Catégorie | Bibliothèque | Version | Usage |
|-----------|--------------|---------|-------|
| Framework | React | 18.3.1 | UI Library |
| Langage | TypeScript | 5.x | Typage statique |
| Styling | Tailwind CSS | 4.1.12 | Styles utilitaires |
| Build | Vite | 6.3.5 | Build rapide |
| Composants | Radix UI | 1.x | Composants accessibles |
| Icônes | Lucide React | 0.487.0 | Icônes SVG |
| Charts | Recharts | 2.15.2 | Graphiques |
| Animations | Motion | 12.23.24 | Animations fluides |
| Parsing | xlsx | 0.18.5 | **Parsing Excel/CSV** |
| Export | jsPDF | 2.5.2 | **Export PDF** |
| Notifications | Sonner | 2.0.3 | Toast messages |
| Dates | date-fns | 3.6.0 | Manipulation dates |
| Forms | react-hook-form | 7.55.0 | Formulaires |
| Dark Mode | next-themes | 0.4.6 | Thème sombre |

### **Backend**

| Catégorie | Bibliothèque | Version | Usage |
|-----------|--------------|---------|-------|
| Framework | FastAPI | 0.109.0 | API REST |
| Server | Uvicorn | 0.27.0 | ASGI server |
| Validation | Pydantic | 2.5.3 | Validation données |
| Database | SQLAlchemy | 2.0.25 | ORM async |
| Migrations | Alembic | 1.13.1 | Migrations DB |
| PDF Text | PyPDF2 | 3.0.1 | **Extraction PDF texte** |
| PDF Tables | pdfplumber | 0.10.3 | **Tableaux PDF** |
| OCR | pytesseract | 0.3.10 | **OCR Tesseract** |
| Excel | openpyxl | 3.1.2 | **Parsing Excel** |
| CSV | pandas | 2.2.0 | **Parsing CSV** |
| Auth | python-jose | 3.3.0 | JWT tokens |
| Password | passlib | 1.7.4 | Hash mots de passe |
| Images | Pillow | 10.2.0 | Manipulation images |
| Tests | pytest | 7.4.4 | Tests unitaires |

---

## 🚀 Déploiement

### **Frontend**

| Platform | Commande | URL |
|----------|----------|-----|
| **Vercel** | `vercel --prod` | `pharmaverif.vercel.app` |
| **Netlify** | `netlify deploy --prod` | `pharmaverif.netlify.app` |
| **Cloudflare Pages** | Auto via Git | `pharmaverif.pages.dev` |

### **Backend**

| Platform | Setup | URL |
|----------|-------|-----|
| **Railway** | Connecter GitHub | `pharmaverif-api.railway.app` |
| **Render** | Web Service + PostgreSQL | `pharmaverif-api.onrender.com` |
| **Heroku** | `git push heroku main` | `pharmaverif-api.herokuapp.com` |
| **DigitalOcean** | App Platform | Custom domain |

### **Base de données**

| Option | Type | Prix | Setup |
|--------|------|------|-------|
| **Supabase** | PostgreSQL managed | Gratuit (500MB) | Click & connect |
| **Railway** | PostgreSQL | $5/mois | Auto-provisioning |
| **Neon** | Serverless Postgres | Gratuit (512MB) | Quick setup |

---

## 📊 Comparaison Frontend vs Backend Parsing

| Aspect | Frontend (XLSX.js) | Backend (FastAPI) |
|--------|-------------------|-------------------|
| **Formats** | Excel, CSV | Excel, CSV, **PDF** |
| **PDF Support** | ❌ Non | ✅ Oui (OCR) |
| **Performance** | Rapide (client) | Moyen (upload) |
| **Taille fichier** | Limité (10MB) | Illimité |
| **Sécurité** | Client-side | ✅ Server-side |
| **Offline** | ✅ Possible | ❌ Non |
| **OCR** | ❌ Non | ✅ Tesseract |
| **Complexité** | Simple | Complexe |

**Recommandation** : 
- Frontend pour Excel/CSV (rapide et simple)
- Backend pour PDF et production (sécurisé et puissant)

---

## 🔒 Sécurité

### **Frontend**

- ✅ Validation client-side (taille, format)
- ✅ Sanitization des inputs
- ✅ HTTPS en production
- ✅ Content Security Policy

### **Backend**

- ✅ Validation Pydantic stricte
- ✅ Rate limiting (60 req/min)
- ✅ CORS configuré
- ✅ JWT authentication
- ✅ Hashing passwords (bcrypt)
- ✅ SQL injection protection (SQLAlchemy)
- ✅ File upload restrictions

---

## 📈 Évolutions Futures

### **Phase 1 - MVP** ✅ (Actuel)
- ✅ Frontend React complet
- ✅ Parsing Excel/CSV frontend
- ✅ Logique de vérification
- ✅ Export PDF
- ✅ Dark mode

### **Phase 2 - Backend** 🚧 (En cours)
- 🔨 Backend FastAPI
- 🔨 Parsing PDF avec OCR
- 🔨 Base de données PostgreSQL
- 🔨 API REST complète

### **Phase 3 - Production** 📋 (Futur)
- ⏳ Authentification utilisateurs
- ⏳ Multi-tenancy (plusieurs pharmacies)
- ⏳ Envoi emails automatiques
- ⏳ Notifications push
- ⏳ Application mobile (React Native)

### **Phase 4 - IA** 🤖 (Vision)
- 💡 ML pour détection automatique format
- 💡 Reconnaissance intelligente OCR
- 💡 Prédiction anomalies
- 💡 Suggestions optimisation achats

---

## 👤 Auteur

**Anas BENDAIKHA**

Développeur Full-Stack spécialisé en :
- ⚛️ React / TypeScript
- 🐍 Python / FastAPI
- 🎨 UI/UX Design
- 📊 Data Processing

**Contact** :
- 📧 Email : contact@pharmaverif.demo
- 💼 LinkedIn : [Votre profil]
- 🐙 GitHub : [@votre-username]
- 🌐 Portfolio : [votre-portfolio.com]

---

## 📜 Licence

**Propriétaire - Tous droits réservés**

Copyright © 2026 Anas BENDAIKHA

Ce logiciel et son code source sont protégés par le droit d'auteur.  
Toute utilisation, reproduction ou distribution sans autorisation est interdite.

Pour une licence commerciale, contactez : contact@pharmaverif.demo

---

## 📞 Support

| Type | Contact | Réponse |
|------|---------|---------|
| 💼 Commercial | business@pharmaverif.demo | 24-48h |
| 🛠️ Technique | support@pharmaverif.demo | 48-72h |
| 📧 Général | contact@pharmaverif.demo | 72h |

---

<div align="center">

**🏥 PharmaVerif - Vérification Intelligente de Factures Pharmaceutiques**

Développé avec ❤️ par **Anas BENDAIKHA**

© 2026 - Tous droits réservés

[Documentation](./README.md) • [Guide Backend](./BACKEND_FASTAPI_GUIDE.md) • [Guide Excel](./GUIDE_FICHIER_EXCEL.md)

</div>
