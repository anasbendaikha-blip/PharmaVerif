# 📄 Guide d'export PDF - PharmaVerif

## 🎯 Vue d'ensemble

La fonctionnalité d'export PDF permet de générer des **rapports de vérification professionnels** pour chaque facture analysée. Ces rapports peuvent être utilisés pour :

- **Justifier une contestation** auprès du grossiste
- **Archiver** les vérifications effectuées
- **Présenter** les économies réalisées à la direction
- **Tracer** les anomalies détectées

---

## ✨ Fonctionnalités

### 📋 Contenu du PDF

Chaque rapport PDF généré contient :

#### **1. Header professionnel**
- Logo PharmaVerif
- Titre du document
- Date de génération

#### **2. Informations de la facture**
- Numéro de facture
- Grossiste
- Date de facture
- Montant brut HT
- Net à payer

#### **3. Détail des remises**
- Remises ligne à ligne
- Remises pied de facture
- Total des remises
- Tableau formaté et lisible

#### **4. Résultat de la vérification**
- Badge de statut (CONFORME / ANOMALIE)
- Nombre d'anomalies détectées

#### **5. Liste des anomalies** (si applicable)
- Type d'anomalie
- Description détaillée
- Montant de l'écart
- Total des économies potentielles

#### **6. Recommandations**
- Actions à entreprendre
- Points de vigilance
- Conseils de contestation

#### **7. Conditions contractuelles**
- Taux de remise de base
- Coopération commerciale
- Escompte
- Franco (port gratuit)
- Remise totale théorique

#### **8. Footer**
- Date de génération
- Numéro de page
- Mention de confidentialité

---

## 🚀 Utilisation

### 📍 Depuis la page de vérification

1. **Vérifier une facture** (sélection grossiste + upload PDF)
2. Attendre les résultats de vérification
3. Cliquer sur le bouton **"Exporter le rapport PDF"** (vert)
4. Le PDF est automatiquement téléchargé

### 📍 Depuis le dashboard

1. Aller dans l'onglet **"Factures"**
2. Trouver la facture souhaitée dans le tableau
3. Cliquer sur le bouton **"PDF"** dans la colonne Actions
4. Le rapport est téléchargé instantanément

---

## 🎨 Design du PDF

### Palette de couleurs

- **Bleu primaire** (#2563eb) : Header, titres principaux
- **Vert succès** (#10b981) : Badge "CONFORME"
- **Orange warning** (#f59e0b) : Badge "ANOMALIE", tableau anomalies
- **Rouge danger** (#ef4444) : Montants d'écarts, total économies
- **Gris** (#374151, #6b7280) : Texte, bordures

### Typographie

- **Police** : Helvetica (standard PDF)
- **Tailles** :
  - Titre principal : 24pt
  - Sous-titres : 16pt, 14pt
  - Corps : 11pt, 10pt
  - Footer : 9pt, 8pt

### Mise en page

- **Format** : A4 (210 x 297 mm)
- **Orientation** : Portrait
- **Marges** : 15mm de chaque côté
- **Espacement** : Cohérent et aéré

---

## 🛠️ Implémentation technique

### Bibliothèques utilisées

```json
{
  "jspdf": "^4.1.0",
  "jspdf-autotable": "^5.0.7"
}
```

### Structure du code

```
/src/app/utils/pdfExport.ts
├── generateVerificationPDF()  // Génère le document PDF
├── exportVerificationReport() // Génère + télécharge
├── drawHeader()               // Dessine le header
├── drawFooter()               // Dessine le footer
└── Helper functions           // Formatage dates, euros, etc.
```

### Exemple d'utilisation

```typescript
import { exportVerificationReport } from '../utils/pdfExport';

// Dans un composant React
const handleExportPDF = async () => {
  await exportVerificationReport({
    facture: currentFacture,
    anomalies: anomaliesDetectees,
    grossiste: selectedGrossiste,
  });
  
  toast.success('Rapport PDF téléchargé !');
};
```

---

## 📊 Exemples de rapports

### Facture conforme ✅

```
┌─────────────────────────────────────────┐
│ PharmaVerif - Rapport de Vérification  │
├─────────────────────────────────────────┤
│                                         │
│ Facture: FAC-CERP-001                  │
│ Grossiste: CERP Rouen                  │
│ Montant: 5 230,00 €                    │
│                                         │
│ [BADGE VERT] CONFORME                  │
│                                         │
│ ✓ Facture conforme                     │
│ Aucune anomalie détectée.              │
│ Toutes les remises ont été appliquées. │
│                                         │
└─────────────────────────────────────────┘
```

### Facture avec anomalies ⚠️

```
┌─────────────────────────────────────────┐
│ PharmaVerif - Rapport de Vérification  │
├─────────────────────────────────────────┤
│                                         │
│ Facture: FAC-CERP-002                  │
│ Grossiste: CERP Rouen                  │
│ Montant: 8 450,00 €                    │
│                                         │
│ [BADGE ORANGE] 2 ANOMALIES DÉTECTÉES   │
│                                         │
│ ┌───┬────────────┬──────────┬─────────┐ │
│ │ # │ Type       │ Desc.    │ Écart   │ │
│ ├───┼────────────┼──────────┼─────────┤ │
│ │ 1 │ Remise     │ Remise   │ 84,50 € │ │
│ │   │ manquante  │ de base  │         │ │
│ │ 2 │ Escompte   │ Escompte │ 42,25 € │ │
│ │   │ manquant   │ 0,5%     │         │ │
│ └───┴────────────┴──────────┴─────────┘ │
│                                         │
│ [ROUGE] TOTAL ÉCONOMIES: 126,75 €      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Personnalisation du nom de fichier

Par défaut, le nom du fichier est :
```
Rapport_Verification_{NUMERO_FACTURE}_{DATE}.pdf
```

Exemple :
```
Rapport_Verification_FAC_CERP_001_2026-02-08.pdf
```

### Personnalisation du contenu

Pour modifier le contenu du PDF, éditez `/src/app/utils/pdfExport.ts` :

```typescript
// Modifier les couleurs
const COLORS = {
  primary: [37, 99, 235],  // RGB pour bleu
  success: [16, 185, 129], // RGB pour vert
  // ...
};

// Modifier le header
function drawHeader(doc: jsPDF, title: string) {
  // Personnaliser ici
}
```

---

## 📝 Bonnes pratiques

### ✅ À faire

- Générer le PDF **après** la vérification complète
- Vérifier que toutes les données sont chargées
- Afficher un loader pendant la génération
- Notifier l'utilisateur du succès/échec
- Conserver une copie du rapport pour archivage

### ❌ À éviter

- Ne pas générer de PDF sans anomalies ET sans facture
- Ne pas bloquer l'UI pendant la génération
- Ne pas oublier la gestion d'erreur
- Ne pas générer de PDF pour des données incomplètes

---

## 🐛 Dépannage

### Problème : Le PDF ne se télécharge pas

**Solution :**
1. Vérifier la console pour les erreurs JavaScript
2. S'assurer que `jspdf` et `jspdf-autotable` sont installés :
   ```bash
   npm install jspdf jspdf-autotable
   ```
3. Vérifier les permissions du navigateur

### Problème : Le PDF est vide ou mal formaté

**Solution :**
1. Vérifier que les données sont bien passées à `exportVerificationReport()`
2. Ouvrir la console et chercher les erreurs
3. Vérifier que `facture`, `anomalies`, et `grossiste` ne sont pas `null`

### Problème : Les caractères accentués s'affichent mal

**Solution :**
Les polices Helvetica standard supportent les accents français.
Si problème persistant, utiliser :
```typescript
doc.setFont('helvetica', 'normal');
```

---

## 🚀 Améliorations futures

### Court terme
- [ ] Ajouter un logo SVG dans le header
- [ ] Support multi-pages pour les factures longues
- [ ] Graphiques de tendance (recharts → canvas)
- [ ] QR code avec lien vers la facture en ligne

### Moyen terme
- [ ] Export en masse (toutes les anomalies du mois)
- [ ] Templates personnalisables par utilisateur
- [ ] Signature électronique du rapport
- [ ] Envoi automatique par email au grossiste

### Long terme
- [ ] API d'export pour intégration LGO
- [ ] Format XML Factur-X en plus du PDF
- [ ] Blockchain pour traçabilité
- [ ] IA pour génération de courrier de contestation

---

## 📚 Ressources

### Documentation officielle

- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [jsPDF-AutoTable Plugin](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [Guide PDF/A pour archivage](https://fr.wikipedia.org/wiki/PDF/A)

### Exemples de code

Voir les exemples complets dans :
- `/src/app/utils/pdfExport.ts` - Logique d'export
- `/src/app/pages/VerificationPage.tsx` - Utilisation dans une page
- `/src/app/pages/DashboardPage.tsx` - Export depuis le dashboard

---

## 👤 Support

Pour toute question ou problème :

- **Email** : support@pharmaverif.fr
- **GitHub Issues** : [github.com/pharmaverif/issues](https://github.com)
- **Documentation** : Voir README.md principal

---

<div align="center">

**PharmaVerif - Export PDF**  
*Générez des rapports professionnels en un clic* 📄✨

Version 1.0.0 - Février 2026

</div>
