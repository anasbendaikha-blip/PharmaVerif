# PharmaVerif - Documentation JavaScript

## Architecture API et Frontend

### 📁 Structure des fichiers

```
/public/
  ├── index.html          # Page HTML standalone avec JavaScript inline
  └── js/
      └── app.js          # Script externe pour gérer les interactions

/src/app/
  ├── api/
  │   ├── endpoints.ts    # Endpoints API simulés (équivalent FastAPI)
  │   └── client.ts       # Client API avec gestion d'erreurs
  ├── data/
  │   ├── database.ts     # Base de données en mémoire
  │   └── seedData.ts     # Données de démonstration
  └── utils/
      └── verificationLogic.ts  # Logique métier de vérification
```

---

## 📄 /public/js/app.js - Script JavaScript

### Fonctionnalités principales

#### 1. **Chargement des statistiques** (`loadStats`)
```javascript
// Au chargement de la page :
// - Fetch GET /api/stats
// - Afficher dans les 3 cards
// - Animer les compteurs de 0 à la valeur réelle
// - Format français : 8 450,00 € avec espaces

await ApiClient.getStats()
```

#### 2. **Chargement des anomalies** (`loadDernieresAnomalies`)
```javascript
// Récupère et affiche les 5 dernières anomalies
// - Fetch GET /api/factures
// - Filtrer celles avec anomalies
// - Afficher dans tableau responsive
// - Format: "FAC-001 | CERP | 127,50 € | 08/02/2026"

await ApiClient.getFactures()
```

#### 3. **Animations**
- **Compteurs animés** : De 0 à la valeur avec easing (1500ms)
- **Fade-in** : Apparition progressive des cartes avec délai échelonné
- **Hover effects** : Transformations CSS smooth

#### 4. **Gestion d'erreurs**
- Messages user-friendly si l'API ne répond pas
- État "Chargement..." pendant les fetch
- Bouton "Réessayer" en cas d'erreur

---

## 🔧 Fonctions utilitaires

### Formatage français
```javascript
formatEuro(8450.75)      // "8 450,75 €"
formatNumber(1234)       // "1 234"
formatDate("2026-02-08") // "08/02/2026"
```

### Animation
```javascript
animateCounter(element, target, duration, formatter)
fadeIn(element, delay)
```

### Gestion d'erreurs
```javascript
showError(elementId, message)
showLoading(elementId, message)
```

---

## 🚀 Utilisation

### Intégration dans HTML

```html
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Lucide Icons -->
<script src="https://unpkg.com/lucide@latest"></script>

<!-- Application JavaScript -->
<script src="/js/app.js" defer></script>
```

### Initialisation automatique

Le script s'initialise automatiquement au chargement du DOM :

```javascript
document.addEventListener('DOMContentLoaded', init);
```

### Appels API

L'app.js utilise `fetch()` pour consommer les endpoints :

```javascript
// Stats
const response = await fetch('/api/stats');
const stats = await response.json();

// Factures avec anomalies
const response = await fetch('/api/factures');
const factures = await response.json();

// Grossistes
const response = await fetch('/api/grossistes');
const grossistes = await response.json();
```

---

## 📊 Structure des données API

### GET /api/stats
```json
{
  "success": true,
  "data": {
    "total_factures": 5,
    "total_anomalies": 3,
    "economies_potentielles": 178.75,
    "taux_conformite": 40,
    "dernieres_anomalies": [...]
  }
}
```

### GET /api/factures
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "numero": "FAC-CERP-002",
      "date": "2026-01-22",
      "grossiste_id": 1,
      "montant_brut_ht": 8450.00,
      "anomalies": [
        {
          "type_anomalie": "remise_manquante",
          "montant_ecart": 94.75,
          "description": "..."
        }
      ]
    }
  ]
}
```

### GET /api/grossistes
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nom": "CERP Rouen",
      "remise_base": 3.0,
      "cooperation_commerciale": 2.0,
      "escompte": 0.5,
      "franco": 1500.0
    }
  ]
}
```

---

## 🎨 Personnalisation

### Modifier la durée d'animation
```javascript
const ANIMATION_DURATION = 1500; // ms
```

### Ajouter un nouveau format
```javascript
function formatPourcentage(value) {
  return `${value.toFixed(1)} %`;
}
```

### Modifier les badges d'anomalies
```javascript
function getAnomalieBadge(type) {
  const badges = {
    'remise_manquante': '<span>...</span>',
    // Ajouter vos badges personnalisés
  };
  return badges[type] || '<span>Autre</span>';
}
```

---

## 🐛 Débogage

### Console logs
L'application log toutes les actions importantes :

```
🚀 Initialisation de PharmaVerif...
✅ Données chargées avec succès
```

### Erreurs réseau
```javascript
// En cas d'erreur API
console.error('Erreur lors du chargement des stats:', error);
```

### Accès global
Les fonctions sont disponibles via `window.PharmaVerif` :

```javascript
window.PharmaVerif.loadStats()
window.PharmaVerif.formatEuro(1234.56)
```

---

## 🔄 Workflow React vs HTML

### Application React (principale)
- `/src/app/` - Code TypeScript React
- Utilise `ApiClient` depuis `api/client.ts`
- Composants modulaires et réutilisables

### Page HTML standalone (alternative)
- `/public/index.html` + `/public/js/app.js`
- JavaScript vanilla avec `async/await`
- Peut être servie directement par FastAPI

**Les deux partagent la même API** via les endpoints définis dans `api/endpoints.ts`

---

## 📚 Ressources

- **Tailwind CSS** : https://tailwindcss.com/docs
- **Lucide Icons** : https://lucide.dev
- **Intl.NumberFormat** : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
- **Fetch API** : https://developer.mozilla.org/fr/docs/Web/API/Fetch_API

---

## ✅ Checklist Qualité

- [x] Code propre avec fonctions réutilisables
- [x] Commentaires en français
- [x] Async/await (pas de callbacks)
- [x] Gestion d'erreurs complète
- [x] Format français pour montants et dates
- [x] Animations fluides et performantes
- [x] Responsive mobile-first
- [x] Accessible (labels, sr-only, etc.)
- [x] Pas de jQuery, vanilla JS uniquement

---

## 🚀 Prochaines étapes

1. Connecter à une vraie API FastAPI
2. Ajouter l'authentification utilisateur
3. Implémenter le système d'upload de factures
4. Ajouter des graphiques avec Chart.js ou Recharts
5. Sauvegarder les préférences utilisateur
