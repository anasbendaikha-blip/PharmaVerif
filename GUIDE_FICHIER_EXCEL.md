# 📊 Guide : Format de fichier Excel/CSV pour PharmaVerif

Ce document explique comment préparer vos factures au format Excel ou CSV pour qu'elles soient analysées par PharmaVerif.

---

## ✅ Formats acceptés

- **Excel** : `.xlsx`, `.xls`
- **CSV** : `.csv` (séparateurs : `;` ou `,`)
- **PDF** : ❌ Non supporté (nécessite OCR backend)

---

## 📋 Structure du fichier attendue

### **En-tête de facture** (Lignes 1-10)

Ces informations seront détectées automatiquement dans les premières lignes :

| Champ | Exemples de noms détectés |
|-------|---------------------------|
| **Numéro de facture** | "Facture", "N°", "Numero" |
| **Date** | "Date", "Date de facture" |
| **Grossiste** | "Grossiste", "Fournisseur" |

**Exemple :**
```
| Facture      | FAC2026-12345              |
| Date         | 05/02/2026                 |
| Grossiste    | Alliance Healthcare        |
```

---

### **Tableau des lignes de produits**

Votre fichier Excel doit contenir un tableau avec **au minimum** ces colonnes :

#### ✅ Colonnes OBLIGATOIRES

| Nom de colonne | Variations acceptées |
|----------------|---------------------|
| **Désignation** | Désignation, Produit, Libellé, Article, Description |
| **Total ligne** | Total, Total ligne, Total HT, Montant, Montant HT |

#### 📌 Colonnes RECOMMANDÉES

| Nom de colonne | Variations acceptées | Utilité |
|----------------|---------------------|---------|
| **Code produit** | Code, Code produit, Référence, Ref, CIP | Identification précise |
| **Quantité** | Quantité, Qté, Qty, Nb | Calcul des montants |
| **Prix unitaire** | Prix unitaire, PU, P.U., Prix HT | Vérification prix |
| **Remise %** | Remise %, Remise, Taux remise, Discount % | Détection anomalies |
| **Remise montant** | Montant remise, Remise €, Remise euro | Alternative au % |

---

## 🔍 Exemple de fichier Excel valide

### **Structure minimale (2 colonnes)**

| Désignation | Total |
|-------------|-------|
| DOLIPRANE 1000MG 8 CPR | 43.00 |
| SPASFON 80MG 30 CPR | 116.00 |
| EFFERALGAN 500MG 16 CPR | 48.00 |

### **Structure complète (recommandée)**

| Code CIP | Désignation | Quantité | Prix unitaire | Remise % | Total HT |
|----------|-------------|----------|---------------|----------|----------|
| 3400935926661 | DOLIPRANE 1000MG 8 CPR | 20 | 2.15 | 2.0 | 43.00 |
| 3400933989668 | SPASFON 80MG 30 CPR | 20 | 5.80 | 2.0 | 116.00 |
| 3400936111431 | EFFERALGAN 500MG 16 CPR | 20 | 2.40 | 2.0 | 48.00 |

---

## 📌 Pied de facture (Totaux)

Ces lignes seront détectées automatiquement en fin de fichier :

| Libellé | Montant |
|---------|---------|
| Total brut HT | 1250.00 |
| Remises lignes | -25.00 |
| Remises pied de facture | -50.00 |
| **Net à payer** | **1175.00** |

---

## 🎯 Conseils pour un parsing optimal

### ✅ **Bonnes pratiques**

1. **Garder un format simple** : Une ligne d'en-têtes, puis les données
2. **Utiliser des noms standards** : "Désignation" plutôt que "Desc. prod."
3. **Format numérique** : Utiliser des nombres, pas du texte (exemple : `123.45` et non `"123,45 €"`)
4. **Pas de cellules fusionnées** : Éviter les fusions de cellules
5. **Première feuille** : Mettre les données dans la première feuille Excel

### ❌ **À éviter**

- ❌ Cellules fusionnées ou mise en forme complexe
- ❌ Formules Excel (utiliser les valeurs calculées)
- ❌ Plusieurs tableaux sur une même feuille
- ❌ Lignes vides entre les produits
- ❌ Espaces ou caractères spéciaux dans les nombres

---

## 🧪 Tester votre fichier

### **1. Créer un fichier de test**

Créez un fichier Excel avec cette structure simple :

**Feuille "Facture"** :

```
Facture         FAC2026-00001
Date            08/02/2026
Grossiste       Alliance Healthcare

Désignation                     Quantité    Prix unitaire    Total HT
DOLIPRANE 1000MG 8 CPR         20          2.15             43.00
SPASFON 80MG 30 CPR            15          5.80             87.00
EFFERALGAN 500MG 16 CPR        25          2.40             60.00

Net à payer                                                  190.00
```

### **2. Importer dans PharmaVerif**

1. Sélectionnez un grossiste (ex: Alliance Healthcare)
2. Uploadez votre fichier Excel
3. Cliquez sur "Lancer la vérification"
4. Vérifiez les messages de succès/erreur

---

## 🔧 Dépannage

### **Erreur : "Colonnes obligatoires manquantes"**

**Solution** : Ajoutez au minimum les colonnes "Désignation" et "Total"

### **Erreur : "Aucune ligne de facture détectée"**

**Causes possibles** :
- Les données sont dans une autre feuille Excel
- Toutes les cellules sont vides
- Format non reconnu

**Solution** : Vérifiez que vos données sont dans la première feuille

### **Erreur : "Montant brut HT invalide"**

**Cause** : Les totaux ne sont pas calculés correctement

**Solution** : Vérifiez que la colonne "Total HT" contient des nombres valides

### **Warning : "Incohérence détectée"**

**Cause** : Le net à payer ne correspond pas aux calculs

**Solution** : C'est normal ! PharmaVerif détecte justement ces incohérences (anomalies)

---

## 💡 Astuces avancées

### **Exporter depuis votre logiciel de gestion**

La plupart des logiciels de pharmacie permettent d'exporter les factures en Excel :

- **LGO** : Menu Facturation → Exporter → Excel
- **Winpharma** : Fichier → Export → Format Excel
- **Pharma ML** : Outils → Extraction données → Excel

### **Convertir un PDF en Excel**

Si vous n'avez que le PDF :

1. **Option 1** : Copier-coller dans Excel
2. **Option 2** : Utiliser un outil en ligne (PDF to Excel)
3. **Option 3** : Ressaisir manuellement les lignes

⚠️ **Attention** : La conversion automatique peut introduire des erreurs

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez ce guide
2. Testez avec le fichier exemple minimal
3. Consultez la console développeur (F12) pour voir les erreurs détaillées

---

## ✨ Exemples de fichiers

### **Télécharger des exemples** :

Créez ces fichiers pour tester :

**1. facture_simple.xlsx** - Structure minimale
**2. facture_complete.xlsx** - Toutes les colonnes
**3. facture_anomalies.xlsx** - Avec des remises manquantes

---

**Mis à jour le** : Février 2026  
**Copyright** : © 2026 Anas BENDAIKHA - PharmaVerif
