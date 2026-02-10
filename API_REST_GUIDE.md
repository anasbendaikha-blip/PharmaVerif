# 🚀 Guide API RESTful Complète - PharmaVerif

**Documentation complète de l'API REST**

Copyright © 2026 Anas BENDAIKHA - Tous droits réservés

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Authentification](#authentification)
3. [Endpoints disponibles](#endpoints-disponibles)
4. [Exemples d'utilisation](#exemples-dutilisation)
5. [Codes d'erreur](#codes-derreur)
6. [Rate limiting](#rate-limiting)
7. [Intégration frontend](#intégration-frontend)

---

## 🎯 Vue d'ensemble

### Base URL

```
Production : https://api.pharmaverif.com
Development : http://localhost:8000
```

### Format des données

- **Request** : JSON
- **Response** : JSON
- **Encoding** : UTF-8

### Versioning

Toutes les routes API sont préfixées par `/api/v1`

---

## 🔐 Authentification

L'API utilise **JWT (JSON Web Tokens)** pour l'authentification.

### 1. Créer un compte

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "pharmacien@exemple.fr",
  "password": "MotDePasse123!",
  "nom": "Dupont",
  "prenom": "Jean",
  "role": "pharmacien"
}
```

**Réponse** :
```json
{
  "id": 1,
  "email": "pharmacien@exemple.fr",
  "nom": "Dupont",
  "prenom": "Jean",
  "role": "pharmacien",
  "actif": true,
  "created_at": "2026-02-08T10:00:00Z"
}
```

### 2. Se connecter

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "pharmacien@exemple.fr",
  "password": "MotDePasse123!"
}
```

**Réponse** :
```json
{
  "user": {
    "id": 1,
    "email": "pharmacien@exemple.fr",
    "nom": "Dupont",
    "prenom": "Jean",
    "role": "pharmacien"
  },
  "token": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```

### 3. Utiliser le token

Pour toutes les requêtes protégées, ajoutez le header :

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📚 Endpoints disponibles

### 🏠 Root

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Informations API |
| GET | `/health` | Health check |
| GET | `/api/info` | Détails API |

### 🔐 Authentification (`/api/v1/auth`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/register` | ❌ | Créer un compte |
| POST | `/login` | ❌ | Connexion |
| GET | `/me` | ✅ | Profil utilisateur |
| POST | `/change-password` | ✅ | Changer mot de passe |
| POST | `/refresh` | ✅ | Rafraîchir token |
| POST | `/logout` | ✅ | Déconnexion |

### 👥 Utilisateurs (`/api/v1/users`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/` | ✅ | Liste utilisateurs |
| GET | `/{id}` | ✅ | Détails utilisateur |
| PUT | `/{id}` | ✅ | Modifier utilisateur |
| DELETE | `/{id}` | ✅ Admin | Supprimer utilisateur |

### 🏢 Grossistes (`/api/v1/grossistes`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/` | ✅ | Liste grossistes |
| POST | `/` | ✅ | Créer grossiste |
| GET | `/{id}` | ✅ | Détails grossiste |
| PUT | `/{id}` | ✅ | Modifier grossiste |
| DELETE | `/{id}` | ✅ Admin | Supprimer grossiste |

### 📄 Factures (`/api/v1/factures`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/` | ✅ | Liste factures (pagination + filtres) |
| POST | `/` | ✅ | Créer facture |
| GET | `/{id}` | ✅ | Détails facture |
| PUT | `/{id}` | ✅ | Modifier facture |
| DELETE | `/{id}` | ✅ | Supprimer facture |
| GET | `/{id}/lignes` | ✅ | Lignes de la facture |
| PATCH | `/{id}/statut` | ✅ | Changer statut |
| GET | `/numero/{numero}` | ✅ | Chercher par numéro |
| GET | `/grossiste/{id}` | ✅ | Factures d'un grossiste |
| POST | `/{id}/duplicate` | ✅ | Dupliquer facture |

### 🔍 Anomalies (`/api/v1/anomalies`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/` | ✅ | Liste anomalies |
| POST | `/` | ✅ | Créer anomalie |
| GET | `/{id}` | ✅ | Détails anomalie |
| PATCH | `/{id}/resoudre` | ✅ | Résoudre anomalie |
| GET | `/facture/{id}` | ✅ | Anomalies d'une facture |
| GET | `/non-resolues` | ✅ | Anomalies non résolues |

### 📤 Upload (`/api/v1/upload`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/` | ✅ | Upload fichier (PDF/Excel/CSV) |
| POST | `/parse` | ✅ | Parser un fichier |
| GET | `/formats` | ✅ | Formats supportés |

### ✅ Vérification (`/api/v1/verification`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/verify` | ✅ | Vérifier une facture |
| POST | `/batch` | ✅ | Vérifier plusieurs factures |
| GET | `/history` | ✅ | Historique vérifications |

### 📊 Statistiques (`/api/v1/stats`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/` | ✅ | Stats globales |
| GET | `/dashboard` | ✅ | Données dashboard |
| GET | `/tendances` | ✅ | Tendances |
| GET | `/export` | ✅ | Export stats CSV |

### 📥 Export (`/api/v1/export`)

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/pdf` | ✅ | Exporter rapport PDF |
| POST | `/excel` | ✅ | Exporter Excel |
| POST | `/csv` | ✅ | Exporter CSV |

---

## 💡 Exemples d'utilisation

### 1. Flux complet de vérification

```bash
# 1. Connexion
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pharmacien@exemple.fr",
    "password": "MotDePasse123!"
  }'

# Réponse : { "token": { "access_token": "..." } }

# 2. Upload fichier
curl -X POST http://localhost:8000/api/v1/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@facture.xlsx"

# Réponse : { "success": true, "data": {...} }

# 3. Créer la facture
curl -X POST http://localhost:8000/api/v1/factures \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "numero": "FAC-2026-001",
    "date": "2026-02-08T10:00:00Z",
    "grossiste_id": 1,
    "montant_brut_ht": 1500.00,
    "remises_ligne_a_ligne": 30.00,
    "remises_pied_facture": 20.00,
    "net_a_payer": 1450.00,
    "lignes": [...]
  }'

# 4. Vérifier la facture
curl -X POST http://localhost:8000/api/v1/verification/verify \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "facture_id": 1,
    "grossiste_id": 1
  }'

# 5. Obtenir les stats
curl -X GET "http://localhost:8000/api/v1/stats" \
  -H "Authorization: Bearer <TOKEN>"
```

### 2. Filtrer et paginer les factures

```bash
curl -X GET "http://localhost:8000/api/v1/factures?page=1&page_size=20&statut=anomalie&grossiste_id=1&date_debut=2026-01-01" \
  -H "Authorization: Bearer <TOKEN>"
```

**Réponse** :
```json
{
  "factures": [...],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

### 3. Rechercher une facture

```bash
# Par ID
curl -X GET "http://localhost:8000/api/v1/factures/123" \
  -H "Authorization: Bearer <TOKEN>"

# Par numéro
curl -X GET "http://localhost:8000/api/v1/factures/numero/FAC-2026-001" \
  -H "Authorization: Bearer <TOKEN>"

# Recherche textuelle
curl -X GET "http://localhost:8000/api/v1/factures?search=Alliance" \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. Créer un grossiste

```bash
curl -X POST http://localhost:8000/api/v1/grossistes \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Alliance Healthcare",
    "remise_base": 2.0,
    "cooperation_commerciale": 1.5,
    "escompte": 0.5,
    "franco": 750.00,
    "actif": true
  }'
```

### 5. Résoudre une anomalie

```bash
curl -X PATCH "http://localhost:8000/api/v1/anomalies/42/resoudre" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "resolu": true,
    "note_resolution": "Remise récupérée après réclamation"
  }'
```

---

## ❌ Codes d'erreur

### Codes HTTP

| Code | Signification | Description |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée |
| 400 | Bad Request | Données invalides |
| 401 | Unauthorized | Token manquant/invalide |
| 403 | Forbidden | Accès refusé |
| 404 | Not Found | Ressource non trouvée |
| 422 | Unprocessable Entity | Erreur de validation |
| 429 | Too Many Requests | Rate limit dépassé |
| 500 | Internal Server Error | Erreur serveur |

### Format des erreurs

```json
{
  "error": "ERROR_CODE",
  "message": "Description de l'erreur",
  "details": {
    "field": "Détails supplémentaires"
  }
}
```

### Exemples d'erreurs

```json
// 401 - Token invalide
{
  "error": "INVALID_TOKEN",
  "message": "Token JWT invalide ou expiré"
}

// 400 - Validation échouée
{
  "error": "VALIDATION_ERROR",
  "message": "Données invalides",
  "details": {
    "email": "Email invalide",
    "password": "Doit contenir au moins 8 caractères"
  }
}

// 404 - Ressource non trouvée
{
  "error": "NOT_FOUND",
  "message": "Facture avec ID 999 non trouvée"
}
```

---

## ⚡ Rate Limiting

### Limites

- **Par défaut** : 60 requêtes/minute
- **Upload** : 10 requêtes/minute
- **Endpoints admin** : 30 requêtes/minute

### Headers de réponse

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1675850400
```

### Dépassement

Si vous dépassez la limite, vous recevrez :

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Trop de requêtes. Réessayez dans 60 secondes."
}
```

---

## 🔗 Intégration Frontend

### Configuration Axios (React/TypeScript)

```typescript
// src/api/client.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré -> rediriger vers login
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Fonctions API

```typescript
// src/api/auth.ts
import { apiClient } from './client';

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('access_token', response.data.token.access_token);
    return response.data;
  },

  register: async (userData: UserCreate) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// src/api/factures.ts
import { apiClient } from './client';

export const facturesAPI = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    statut?: string;
    search?: string;
  }) => {
    const response = await apiClient.get('/factures', { params });
    return response.data;
  },

  create: async (facture: FactureCreate) => {
    const response = await apiClient.post('/factures', facture);
    return response.data;
  },

  get: async (id: number) => {
    const response = await apiClient.get(`/factures/${id}`);
    return response.data;
  },

  update: async (id: number, facture: FactureUpdate) => {
    const response = await apiClient.put(`/factures/${id}`, facture);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/factures/${id}`);
    return response.data;
  },
};

// src/api/upload.ts
import { apiClient } from './client';

export const uploadAPI = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};
```

### Hook React personnalisé

```typescript
// src/hooks/useFactures.ts
import { useState, useEffect } from 'react';
import { facturesAPI } from '../api/factures';

export function useFactures(params?: any) {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFactures = async () => {
      try {
        setLoading(true);
        const data = await facturesAPI.list(params);
        setFactures(data.factures);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFactures();
  }, [params]);

  return { factures, loading, error };
}
```

---

## 📊 Schéma OpenAPI/Swagger

L'API génère automatiquement une documentation interactive Swagger :

**URL** : `http://localhost:8000/api/docs`

Fonctionnalités :
- ✅ Tester tous les endpoints directement
- ✅ Voir les schémas de données
- ✅ Exemples de requêtes/réponses
- ✅ Autorisation JWT intégrée

---

## 🔒 Sécurité

### Bonnes pratiques

1. **Toujours utiliser HTTPS en production**
2. **Ne jamais exposer le SECRET_KEY**
3. **Implémenter le CORS correctement**
4. **Valider toutes les entrées utilisateur**
5. **Logger les accès sensibles**
6. **Utiliser des tokens avec expiration**
7. **Rate limiting sur tous les endpoints**

### Headers de sécurité

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## 📝 Changelog API

### Version 1.2.0 (Février 2026)

**Ajouts** :
- ✅ Authentification JWT complète
- ✅ CRUD complet pour toutes les entités
- ✅ Pagination et filtres avancés
- ✅ Statistiques et analytics
- ✅ Upload et parsing de fichiers
- ✅ Export PDF/Excel/CSV
- ✅ Rate limiting
- ✅ Documentation Swagger

**Endpoints** :
- 50+ endpoints REST
- 9 modules principaux
- Support complet CRUD

---

## 📞 Support API

**Contact** : api@pharmaverif.demo

**Documentation** :
- Swagger : `/api/docs`
- ReDoc : `/api/redoc`
- Guide : Ce fichier

---

<div align="center">

**🏥 PharmaVerif API RESTful Complète**

Développée avec ❤️ par **Anas BENDAIKHA**

© 2026 - Tous droits réservés

[Guide Backend](./BACKEND_FASTAPI_GUIDE.md) • [Architecture](./ARCHITECTURE_COMPLETE.md) • [README](./README.md)

</div>
