# 🎨 Guide du Logo - PharmaVerif

## 📖 Vue d'ensemble

Le logo PharmaVerif a été conçu pour refléter les valeurs fondamentales de l'application : **sécurité**, **vérification** et **pharmacie**.

---

## 🔰 Symbolisme

### L'icône : Bouclier pharmaceutique avec coche

Le logo combine trois éléments symboliques :

1. **Bouclier** 🛡️
   - Représente la **protection** et la **sécurité**
   - Symbolise la **conformité** et la **fiabilité**
   - Inspire la **confiance** aux utilisateurs

2. **Croix pharmaceutique** ➕
   - Symbole universel du **secteur de la santé**
   - Identifiable instantanément par les **pharmaciens**
   - Rappelle la **mission médicale**

3. **Coche de vérification** ✓
   - Représente la **validation** et le **contrôle**
   - Symbolise l'**exactitude** et la **précision**
   - Couleur verte pour le **succès** et la **conformité**

---

## 📁 Fichiers disponibles

### Variantes du logo

| Fichier | Description | Dimensions | Utilisation |
|---------|-------------|------------|-------------|
| `logo-icon.svg` | Icône seule avec effets | 50x50 | Favicon, app icon |
| `logo-horizontal.svg` | Logo + texte horizontal | 180x40 | Headers, navigation |
| `logo-horizontal-dark.svg` | Version dark mode | 180x40 | Dark mode UI |
| `logo-full.svg` | Logo complet avec tagline | 240x60 | Page d'accueil, footer |
| `logo.svg` | Logo standard | 200x50 | Usage général |

---

## 🎨 Palette de couleurs

### Couleurs principales

```css
/* Bleu primaire (dégradé) */
--shield-gradient-start: #3B82F6; /* blue-500 */
--shield-gradient-end: #2563EB;   /* blue-600 */
--shield-border: #1E40AF;         /* blue-800 */

/* Blanc (croix) */
--cross-white: #FFFFFF;

/* Vert (coche) */
--check-green: #10B981;   /* emerald-500 */
--check-green-dark: #34D399; /* emerald-400 (dark mode) */

/* Texte */
--text-dark: #1F2937;     /* gray-800 */
--text-blue: #2563EB;     /* blue-600 */
--text-light: #F9FAFB;    /* gray-50 (dark mode) */
--text-gray: #6B7280;     /* gray-500 (tagline) */
```

### Mode clair vs Mode sombre

| Élément | Mode clair | Mode sombre |
|---------|------------|-------------|
| Bouclier | #3B82F6 → #2563EB | #60A5FA → #3B82F6 |
| Croix | Blanc (#FFFFFF) | Gris foncé (#1F2937) |
| Coche | #10B981 | #34D399 |
| Texte "Pharma" | #1F2937 | #F9FAFB |
| Texte "Verif" | #2563EB | #60A5FA |

---

## 💻 Utilisation dans le code

### Composant React `<Logo>`

```tsx
import { Logo } from '../components/Logo';

// Variantes
<Logo variant="icon" />        // Icône seule
<Logo variant="horizontal" />  // Logo horizontal (défaut)
<Logo variant="full" />        // Logo complet avec tagline

// Thème
<Logo theme="light" />  // Mode clair (défaut)
<Logo theme="dark" />   // Mode sombre

// Tailles
<Logo size="sm" />  // 24px (h-6)
<Logo size="md" />  // 32px (h-8) - défaut
<Logo size="lg" />  // 40px (h-10)
<Logo size="xl" />  // 48px (h-12)

// Classe personnalisée
<Logo className="my-4" />
```

### Exemples d'utilisation

#### Header de navigation
```tsx
<header className="bg-white border-b">
  <div className="max-w-7xl mx-auto px-4 py-4">
    <Logo variant="horizontal" size="md" />
  </div>
</header>
```

#### Page d'accueil (hero)
```tsx
<div className="text-center">
  <Logo variant="full" size="xl" />
  <h1>Vérifiez vos factures pharmaceutiques</h1>
</div>
```

#### Favicon / App icon
```html
<!-- Dans index.html -->
<link rel="icon" type="image/svg+xml" href="/logo-icon.svg" />
```

---

## 📐 Spécifications techniques

### SVG - Logo Icon (`logo-icon.svg`)

```xml
<!-- Dimensions -->
viewBox: 0 0 50 50
width: 50px
height: 50px

<!-- Éléments -->
- Shield path: bezier curve
- Cross: 2 rectangles (3x11px, 11x3px)
- Checkmark: path with stroke-width 3px
- Gradient: linear top to bottom
- Shadow filter: Gaussian blur 1px
```

### SVG - Logo Horizontal (`logo-horizontal.svg`)

```xml
<!-- Dimensions -->
viewBox: 0 0 180 40
width: 180px
height: 40px

<!-- Éléments -->
- Icon: 40x40px (left side)
- Text: Font-size 20px, font-weight 700
- "Pharma": gray-800
- "Verif": blue-600 (tspan)
```

### SVG - Logo Full (`logo-full.svg`)

```xml
<!-- Dimensions -->
viewBox: 0 0 240 60
width: 240px
height: 60px

<!-- Éléments -->
- Icon: 48x48px (centered left)
- Text "Pharma": line 1 (y=30)
- Text "Verif": line 2 (y=48)
- Tagline: "Vérification intelligente" (y=38, size 10px)
```

---

## 🎯 Règles d'utilisation

### ✅ À faire

- Utiliser les fichiers SVG officiels
- Respecter les espacements minimum (zone de protection)
- Maintenir les proportions originales
- Utiliser le mode sombre dans les interfaces sombres
- Garder le logo lisible à toutes les tailles

### ❌ À éviter

- Déformer le logo (étirer horizontalement/verticalement)
- Changer les couleurs (sauf dark mode)
- Ajouter des effets non prévus (rotation, distorsion)
- Placer sur un fond de couleur similaire (mauvais contraste)
- Utiliser des versions pixelisées (PNG) quand SVG disponible

---

## 📏 Zone de protection

La **zone de protection** est l'espace minimum autour du logo où aucun autre élément ne doit apparaître.

```
Zone de protection = hauteur de l'icône (H)

Minimum spacing:
- Top: H/2
- Right: H/2
- Bottom: H/2
- Left: H/2
```

### Exemple visuel

```
┌─────────────────────────────┐
│                             │
│   ┌─────────────────┐       │  ← H/2 spacing
│   │                 │       │
│   │  [LOGO ICON]    │       │
│   │                 │       │
│   └─────────────────┘       │
│                             │
└─────────────────────────────┘
     H/2           H/2
```

---

## 📱 Responsive

### Desktop (>1024px)
- Utiliser `logo-horizontal.svg` ou `logo-full.svg`
- Taille recommandée : `size="lg"` ou `size="xl"`

### Tablet (768px - 1024px)
- Utiliser `logo-horizontal.svg`
- Taille recommandée : `size="md"`

### Mobile (<768px)
- Utiliser `logo-icon.svg` (pour gagner de l'espace)
- Taille recommandée : `size="sm"` ou `size="md"`

### Exemple responsive

```tsx
<div className="flex items-center">
  {/* Desktop */}
  <div className="hidden md:block">
    <Logo variant="horizontal" size="lg" />
  </div>
  
  {/* Mobile */}
  <div className="md:hidden">
    <Logo variant="icon" size="md" />
  </div>
</div>
```

---

## 🖼️ Formats d'export

### Pour le web
- **Format** : SVG
- **Avantage** : Vectoriel, scalable, petit fichier
- **Utilisation** : Toutes les interfaces web

### Pour l'impression
- **Format** : SVG ou PDF
- **Résolution** : Vectoriel (infinie)
- **Utilisation** : Documents, rapports PDF

### Pour les réseaux sociaux
- **Format** : PNG (export depuis SVG)
- **Dimensions** :
  - Avatar : 400x400px
  - Cover : 1200x630px (Open Graph)
  - Icon : 512x512px (PWA manifest)

### Export PNG depuis SVG

```bash
# Avec ImageMagick
convert -background none logo-icon.svg -resize 512x512 logo-icon-512.png

# Avec Inkscape
inkscape logo-icon.svg --export-type=png --export-width=512 -o logo-icon-512.png
```

---

## 🎨 Déclinaisons spéciales

### Logo monochrome (noir)
Pour impression noir et blanc :
```svg
<!-- Remplacer le gradient par -->
<path fill="#000000" />
<!-- Remplacer la coche par -->
<path stroke="#000000" />
```

### Logo monochrome (blanc)
Pour fonds très sombres :
```svg
<path fill="#FFFFFF" />
<rect fill="#1F2937" /> <!-- Croix en gris pour contraste -->
<path stroke="#34D399" /> <!-- Coche reste verte -->
```

---

## 📊 Exemples de contextes

### 1. Navigation header
```tsx
<nav className="bg-white border-b shadow-sm">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex items-center justify-between h-16">
      <Logo variant="horizontal" size="md" />
      <div>{/* Menu items */}</div>
    </div>
  </div>
</nav>
```

### 2. Hero section (page d'accueil)
```tsx
<section className="text-center py-20">
  <Logo variant="full" size="xl" className="mb-8" />
  <h1 className="text-5xl font-bold">
    Vérification intelligente de factures
  </h1>
</section>
```

### 3. Footer
```tsx
<footer className="bg-gray-900 text-white">
  <div className="max-w-7xl mx-auto px-4 py-12">
    <Logo variant="horizontal" theme="dark" size="lg" />
    <p className="mt-4 text-gray-400">© 2026 PharmaVerif</p>
  </div>
</footer>
```

### 4. Email / Documents
```html
<div style="text-align: center; padding: 20px;">
  <img src="https://pharmaverif.fr/logo-full.svg" 
       alt="PharmaVerif" 
       width="240" 
       height="60" />
</div>
```

### 5. PDF (Export via jsPDF)
```typescript
// Dans pdfExport.ts
doc.addImage('/logo-horizontal.svg', 'SVG', 15, 10, 50, 12);
```

---

## 🔧 Maintenance

### Modification du logo

Si vous devez modifier le logo :

1. **Ouvrir le SVG** dans un éditeur (Figma, Illustrator, Inkscape)
2. **Modifier** les éléments nécessaires
3. **Exporter** en SVG optimisé
4. **Mettre à jour** tous les fichiers de variantes
5. **Tester** sur tous les contextes (light/dark, tailles)
6. **Documenter** les changements

### Optimisation SVG

```bash
# Avec SVGO
npx svgo logo-icon.svg -o logo-icon-optimized.svg

# Options recommandées
--multipass
--precision=2
```

---

## 📚 Ressources

### Outils de design
- **Figma** : Édition vectorielle collaborative
- **Inkscape** : Éditeur SVG open-source
- **SVGOMG** : Optimisation SVG en ligne

### Inspiration
- Logos pharmaceutiques iconiques (Sanofi, Pfizer)
- Design systems modernes (Stripe, Notion)
- Symboles de vérification (checkmark patterns)

---

<div align="center">

**🎨 Logo professionnel créé pour PharmaVerif**

*Version 1.0.0 - Février 2026*

</div>
