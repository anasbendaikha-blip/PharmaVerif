# 🔧 Installation et Personnalisation - PharmaVerif

## 📋 Guide de personnalisation du copyright

Après avoir cloné ou téléchargé PharmaVerif, suivez ces étapes pour personnaliser l'application avec vos informations.

---

## 🎯 Étape 1 : Remplacer les placeholders

Dans tous les fichiers, recherchez et remplacez les placeholders suivants :

### ✏️ Informations à remplacer

| Placeholder | Remplacer par | Exemple |
|------------|---------------|---------|
| `[Votre Nom]` | Votre nom complet | Jean Dupont |
| `contact@pharmaverif.demo` | Votre email réel | contact@votredomaine.com |
| `www.votre-portfolio.com` | URL de votre portfolio | www.jeandupont.dev |
| `@votre-username` | Votre username GitHub | @jdupont |

### 📁 Fichiers à modifier

#### 1. **Footer** (Visible sur toutes les pages)
```
/src/app/components/Footer.tsx
```
- Ligne 28 : Remplacer `[Votre Nom]`

#### 2. **Pages**
```
/src/app/pages/MentionsLegalesPage.tsx
/src/app/pages/ContactPage.tsx
```
- Toutes les occurrences de `[Votre Nom]`
- Toutes les occurrences de `contact@pharmaverif.demo`
- Toutes les occurrences de `www.votre-portfolio.com`

#### 3. **Licence**
```
/LICENSE.txt
```
- Toutes les occurrences de `[Votre Nom]`

#### 4. **README**
```
/README.md
```
- Section "Auteur" : Remplacer toutes les informations
- Liens vers portfolio, LinkedIn, GitHub

#### 5. **Headers de fichiers** (Tous les .ts/.tsx avec copyright)
```
/src/app/App.tsx
/src/app/types.ts
/src/app/utils/verificationLogic.ts
/src/app/utils/pdfExport.ts
/src/app/utils/formatNumber.ts
/src/app/pages/HomePage.tsx
/src/app/pages/DashboardPage.tsx
/src/app/pages/VerificationPage.tsx
/src/app/pages/MentionsLegalesPage.tsx
/src/app/pages/ContactPage.tsx
/src/app/components/Footer.tsx
/src/styles/index.css
```

---

## 🔍 Recherche et remplacement global

### Avec VSCode / Cursor

1. Ouvrez la recherche globale (`Ctrl + Shift + F` ou `Cmd + Shift + F`)
2. Recherchez : `[Votre Nom]`
3. Remplacez par : `Votre nom réel`
4. Cliquez sur "Replace All"

5. Répétez pour :
   - `contact@pharmaverif.demo` → `votre.email@domaine.com`
   - `www.votre-portfolio.com` → `www.votredomaine.com`
   - `@votre-username` → `@votrepseudo`

### Avec ligne de commande

```bash
# macOS / Linux
find ./src -type f -name "*.tsx" -exec sed -i '' 's/\[Votre Nom\]/Jean Dupont/g' {} +
find ./src -type f -name "*.ts" -exec sed -i '' 's/\[Votre Nom\]/Jean Dupont/g' {} +

# Linux
find ./src -type f -name "*.tsx" -exec sed -i 's/\[Votre Nom\]/Jean Dupont/g' {} +
find ./src -type f -name "*.ts" -exec sed -i 's/\[Votre Nom\]/Jean Dupont/g' {} +
```

---

## 🌐 Étape 2 : Personnaliser les contacts

### Page Contact (`/src/app/pages/ContactPage.tsx`)

Modifiez les adresses email fictives :

```typescript
// Avant (lignes 30-100)
contact@pharmaverif.demo
business@pharmaverif.demo
support@pharmaverif.demo
dpo@pharmaverif.demo

// Après
contact@votredomaine.com
business@votredomaine.com
support@votredomaine.com
dpo@votredomaine.com
```

Mettez à jour vos liens :
- Portfolio
- LinkedIn
- GitHub

---

## 📜 Étape 3 : Adapter la licence

### Option A : Garder la licence propriétaire

Si vous souhaitez garder tous les droits réservés :
- ✅ Rien à changer dans `/LICENSE.txt`
- ✅ Juste remplacer `[Votre Nom]`

### Option B : Utiliser une licence open-source

Si vous souhaitez partager le code :

1. **MIT License** (Recommandée pour usage libre)
```txt
MIT License

Copyright (c) 2026 [Votre Nom]

Permission is hereby granted, free of charge...
```

2. **GPL-3.0** (Code source doit rester ouvert)
```txt
GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007
...
```

3. Mettre à jour le badge dans `README.md` :
```markdown
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE.txt)
```

---

## 🎨 Étape 4 : Personnaliser le branding (Optionnel)

### Changer le nom de l'application

Si vous voulez renommer "PharmaVerif" :

1. Rechercher et remplacer `PharmaVerif` dans tous les fichiers
2. Mettre à jour le logo dans `/src/app/components/Logo.tsx`
3. Modifier le titre dans `/index.html` (s'il existe)

### Changer les couleurs du thème

Fichier : `/src/styles/theme.css`

```css
/* Bleu primaire actuel : #2563eb */
/* Modifier pour votre couleur de marque */
--color-primary: 37 99 235; /* RGB de votre couleur */
```

---

## ✅ Étape 5 : Vérifier avant déploiement

### Checklist de personnalisation

- [ ] Tous les `[Votre Nom]` sont remplacés
- [ ] Tous les emails fictifs sont mis à jour
- [ ] Les liens portfolio/GitHub/LinkedIn sont corrects
- [ ] LICENSE.txt contient vos informations
- [ ] README.md est à jour
- [ ] Footer affiche vos informations
- [ ] Page Mentions Légales est complète
- [ ] Page Contact a vos vrais emails

### Test local

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Vérifier :
# 1. Footer en bas de chaque page
# 2. Cliquer sur "Mentions légales"
# 3. Cliquer sur "Contact"
# 4. Vérifier que votre nom apparaît correctement
```

---

## 🚀 Étape 6 : Déploiement

### Build de production

```bash
npm run build
```

Le dossier `dist/` contiendra votre application prête à déployer.

### Plateformes de déploiement

- **Vercel** (Recommandé) : Gratuit, simple
- **Netlify** : Gratuit, simple
- **GitHub Pages** : Gratuit
- **Render** : Gratuit

### Exemple avec Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel
```

---

## 📞 Support

Si vous avez des questions sur la personnalisation :

1. Consultez le README.md principal
2. Vérifiez la documentation dans `/src/app/`
3. Contactez : [Votre email après personnalisation]

---

## 🔒 Sécurité

⚠️ **Important** : Avant de déployer en production

- [ ] Ne jamais commiter de vraies clés API
- [ ] Utiliser des variables d'environnement
- [ ] Activer HTTPS
- [ ] Configurer CORS correctement
- [ ] Ajouter une authentification si nécessaire

---

## 📝 Notes légales

Ce guide suppose que vous avez les droits d'utilisation de PharmaVerif.

- Si version open-source : Respectez la licence
- Si version propriétaire : Contactez l'auteur original pour une licence

---

<div align="center">

**Bonne chance avec votre projet ! 🎉**

</div>
