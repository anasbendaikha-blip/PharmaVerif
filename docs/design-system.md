# PharmaVerif — Design System

> **Version** : 1.0 — Fevrier 2026
> **Stack** : Tailwind CSS v4 (CSS-first) · CVA · Radix UI · lucide-react

---

## 1. Palette de couleurs

### Tokens de base (CSS variables dans `src/styles/theme.css`)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `#ffffff` | `oklch(0.145 0 0)` | Fond de page |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte principal |
| `--card` | `#ffffff` | `oklch(0.145 0 0)` | Fond des cartes |
| `--primary` | `#030213` | `oklch(0.985 0 0)` | Actions principales, boutons |
| `--secondary` | `oklch(0.95 ...)` | `oklch(0.269 0 0)` | Actions secondaires |
| `--muted` | `#ececf0` | `oklch(0.269 0 0)` | Fonds attenues |
| `--muted-foreground` | `#717182` | `oklch(0.708 0 0)` | Texte secondaire |
| `--accent` | `#e9ebef` | `oklch(0.269 0 0)` | Hover, focus |
| `--destructive` | `#d4183d` | `oklch(0.396 ...)` | Erreurs, suppressions |
| `--border` | `rgba(0,0,0,0.1)` | `oklch(0.269 0 0)` | Bordures |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.439 0 0)` | Focus ring |

### Tokens semantiques (NOUVEAU v1.0)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--success` | `#16a34a` | `oklch(0.627 0.194 149)` | Etats positifs (conforme, enregistre) |
| `--success-foreground` | `#ffffff` | `oklch(0.985 0 0)` | Texte sur fond success |
| `--success-light` | `#f0fdf4` | `oklch(0.269 0.04 149)` | Fond attenue success |
| `--warning` | `#d97706` | `oklch(0.666 0.179 58)` | Alertes, attentions |
| `--warning-foreground` | `#ffffff` | `oklch(0.985 0 0)` | Texte sur fond warning |
| `--warning-light` | `#fffbeb` | `oklch(0.269 0.04 58)` | Fond attenue warning |
| `--info` | `#2563eb` | `oklch(0.546 0.245 263)` | Informations, liens, tips |
| `--info-foreground` | `#ffffff` | `oklch(0.985 0 0)` | Texte sur fond info |
| `--info-light` | `#eff6ff` | `oklch(0.269 0.04 263)` | Fond attenue info |

### Tokens sidebar

| Token | Light | Dark |
|-------|-------|------|
| `--sidebar` | `#0F172A` | `#0B1120` |
| `--sidebar-primary` | `#3B82F6` | `#60A5FA` |
| `--sidebar-accent` | `rgba(59,130,246,0.12)` | `rgba(96,165,250,0.12)` |

### Tokens chart

`--chart-1` a `--chart-5` sont definis en oklch (voir `theme.css`).
Pour Recharts (qui ne supporte pas CSS vars), utiliser `CHART_PALETTE` depuis `chart-colors.ts`.

### Utilisation Tailwind

```html
<!-- Fond semantique -->
<div class="bg-success-light text-success">Conforme</div>
<div class="bg-warning-light text-warning">Attention</div>
<div class="bg-info-light text-info">Information</div>
<div class="bg-destructive/10 text-destructive">Erreur</div>

<!-- Bordure avec opacite -->
<div class="border border-info/20">...</div>
```

---

## 2. Typographie

### Echelle (Tailwind v4 default)

| Classe | Taille | Usage |
|--------|--------|-------|
| `text-xs` | 0.75rem (12px) | Labels secondaires, badges |
| `text-sm` | 0.875rem (14px) | Corps de texte, inputs |
| `text-base` | 1rem (16px) | Taille par defaut |
| `text-lg` | 1.125rem (18px) | Sous-titres de sections |
| `text-xl` | 1.25rem (20px) | Titres de cards (h2) |
| `text-2xl` | 1.5rem (24px) | Titre de page (h1) |

### Poids

| Classe | Poids | Usage |
|--------|-------|-------|
| `font-normal` | 400 | Corps de texte |
| `font-medium` | 500 | Labels, sous-titres |
| `font-semibold` | 600 | Titres de sections |
| `font-bold` | 700 | Valeurs numeriques importantes |

### Conventions

- Titres de page : `text-xl sm:text-2xl font-semibold text-foreground`
- Descriptions : `text-sm text-muted-foreground`
- Labels de formulaire : `text-sm font-medium` (via composant `<Label>`)
- Valeurs monetaires : `font-bold tabular-nums`

---

## 3. Espacement

### Grille recommandee

| Usage | Classe | Valeur |
|-------|--------|--------|
| Padding compact | `p-2` | 0.5rem |
| Padding standard | `p-4` | 1rem |
| Padding card | `p-5` | 1.25rem |
| Padding spacieux | `p-6` | 1.5rem |
| Gap compact | `gap-2` | 0.5rem |
| Gap standard | `gap-4` | 1rem |
| Gap spacieux | `gap-6` | 1.5rem |
| Marge section | `mb-6` | 1.5rem |

### Layout responsive

```html
<!-- Grille adaptative 1→2→4 colonnes -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

<!-- Grille adaptative pour stats -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## 4. Composants UI (`src/app/components/ui/`)

### Existants

| Composant | Fichier | Variantes | Radix |
|-----------|---------|-----------|-------|
| **Button** | `button.tsx` | default, destructive, outline, secondary, ghost, link × sm, default, lg, icon | Non |
| **Badge** | `badge.tsx` | default, secondary, destructive, outline | Slot |
| **Card** | `card.tsx` | — (composite: Card, CardHeader, CardTitle, etc.) | Non |
| **StatCard** | `stat-card.tsx` | default, blue, green, orange, red, purple + trend | Non |
| **StatusBadge** | `status-badge.tsx` | success, warning, error, info, neutral + pulse | Non |
| **DataTable** | `data-table.tsx` | — (sortable, loading, empty, responsive) | Non |
| **Tabs** | `tabs.tsx` | — (Tabs, TabsList, TabsTrigger, TabsContent) | Oui |
| **Select** | `select.tsx` | — (composite 9 sub-composants) | Oui |
| **Label** | `label.tsx` | — | Oui |
| **Separator** | `separator.tsx` | horizontal, vertical | Oui |
| **Table** | `table.tsx` | — (Table, TableRow, TableCell, etc.) | Non |
| **PageHeader** | `page-header.tsx` | bordered/unbounded, avec/sans icone | Non |
| **MoneyDisplay** | `money-display.tsx` | — (coloration auto selon signe) | Non |
| **StepIndicator** | `step-indicator.tsx` | — (wizard multi-etapes) | Non |
| **Sonner** | `sonner.tsx` | — (wrapper toast) | Non |

### Nouveaux (v1.0)

| Composant | Fichier | Description |
|-----------|---------|-------------|
| **Input** | `input.tsx` | Champ de saisie — icone optionnelle, variante erreur |
| **Textarea** | `textarea.tsx` | Zone texte multiligne — variante erreur |
| **Alert** | `alert.tsx` | Alerte semantique — 5 variantes (default, info, success, warning, destructive) |
| **ChartColors** | `chart-colors.ts` | Palette centralisee — `CHART_PALETTE`, `CHART_COLORS_BY_NAME`, `PDF_COLORS` |

### Exemples d'utilisation

```tsx
// Input basique
<Input placeholder="Nom de la pharmacie" />

// Input avec icone
<Input icon={<Search className="h-4 w-4" />} placeholder="Rechercher..." />

// Input erreur
<Input error placeholder="Email requis" />

// Alert info
<Alert variant="info">
  <Info className="h-4 w-4" />
  <AlertDescription>Connectez un backend pour continuer.</AlertDescription>
</Alert>

// Alert destructive
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Erreur</AlertTitle>
  <AlertDescription>3 EMAC avec ecarts detectes</AlertDescription>
</Alert>

// Couleurs chart
import { CHART_PALETTE, getChartColor } from './components/ui/chart-colors';
<Bar fill={CHART_PALETTE[0]} />
<Line stroke={getChartColor(idx)} />
```

---

## 5. Conventions

### Regles obligatoires

1. **Pas de couleur hardcodee** — Utiliser les tokens Tailwind (`text-foreground`, `bg-success-light`, `text-destructive`) au lieu de `text-green-600`, `bg-red-50`, etc.
2. **Utiliser `cn()`** — Pour merger les classes, toujours passer par `cn()` (import depuis `./utils`).
3. **Composants du design system** — Utiliser `<Input>` au lieu de `<input className="...">`, `<Alert>` au lieu de `<div>` custom.
4. **Tokens semantiques** — `success` pour le positif, `warning` pour l'attention, `info` pour l'information, `destructive` pour les erreurs.
5. **`data-slot` attribute** — Chaque composant expose un `data-slot` pour le debug et le styling parent.

### Pattern composant (a suivre pour tout nouveau composant)

```tsx
import * as React from 'react';
import { cn } from './utils';

function MonComposant({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="mon-composant" className={cn('...styles', className)} {...props} />
  );
}

export { MonComposant };
```

---

## 6. Dark mode

### Fonctionnement

- **Methode** : Class-based (`<html class="dark">`)
- **Declaration** : `@custom-variant dark (&:is(.dark *));` dans `theme.css`
- **Tokens** : Chaque token a une valeur light (`:root`) et dark (`.dark`)

### Ajouter un nouveau token

1. Definir dans `:root` (valeur light)
2. Definir dans `.dark` (valeur dark, idealement en oklch)
3. Ajouter le mapping `--color-xxx: var(--xxx);` dans `@theme inline`
4. Utiliser dans Tailwind : `bg-xxx`, `text-xxx`, etc.

---

## 7. Fichiers cles

```
src/
  styles/
    theme.css         ← Tokens (CSS variables + @theme inline)
    tailwind.css      ← Import Tailwind + source
    fonts.css         ← (vide, pour futur usage)
  app/
    components/ui/
      utils.ts        ← cn() helper
      button.tsx      ← Bouton CVA
      input.tsx       ← Input (NOUVEAU)
      textarea.tsx    ← Textarea (NOUVEAU)
      alert.tsx       ← Alert CVA (NOUVEAU)
      chart-colors.ts ← Palette charts (NOUVEAU)
      badge.tsx
      card.tsx
      stat-card.tsx
      status-badge.tsx
      data-table.tsx
      tabs.tsx
      select.tsx
      label.tsx
      separator.tsx
      table.tsx
      page-header.tsx
      money-display.tsx
      step-indicator.tsx
      sonner.tsx
```
