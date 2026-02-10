# 🧪 Guide de test - Export PDF

## 📋 Checklist de test

### ✅ Tests fonctionnels

#### Test 1 : Export depuis la page de vérification
- [ ] Aller sur la page "Vérifier une facture"
- [ ] Sélectionner "CERP Rouen"
- [ ] Uploader un fichier PDF factice
- [ ] Cliquer sur "Lancer la vérification"
- [ ] Attendre les résultats (2 secondes)
- [ ] Cliquer sur "Exporter le rapport PDF"
- [ ] **Attendu** : PDF téléchargé + Toast de succès

#### Test 2 : Export depuis le dashboard
- [ ] Aller sur le "Tableau de bord"
- [ ] Onglet "Factures"
- [ ] Trouver une facture dans le tableau
- [ ] Cliquer sur le bouton "PDF" dans la colonne Actions
- [ ] **Attendu** : PDF téléchargé + Toast de succès

#### Test 3 : Export facture conforme
- [ ] Vérifier une facture qui ne génère pas d'anomalie
- [ ] Exporter le rapport
- [ ] Ouvrir le PDF
- [ ] **Attendu** : Badge vert "CONFORME" + message positif

#### Test 4 : Export facture avec anomalies
- [ ] Vérifier une facture qui génère des anomalies
- [ ] Exporter le rapport
- [ ] Ouvrir le PDF
- [ ] **Attendu** : Badge orange + tableau des anomalies + total en rouge

#### Test 5 : Nom de fichier
- [ ] Exporter un rapport
- [ ] Vérifier le nom du fichier téléchargé
- [ ] **Attendu** : Format `Rapport_Verification_{NUM}_{DATE}.pdf`

#### Test 6 : Contenu du PDF - Facture avec anomalies
- [ ] Header présent (PharmaVerif)
- [ ] Informations facture complètes
- [ ] Tableau des remises
- [ ] Badge de statut "ANOMALIE"
- [ ] Liste des anomalies (numérotées)
- [ ] Total des économies en rouge
- [ ] Recommandations (4 points)
- [ ] Conditions contractuelles
- [ ] Footer (date + page + confidentialité)

#### Test 7 : Formatage français
- [ ] Dates au format JJ/MM/AAAA
- [ ] Montants avec virgule (1 234,56 €)
- [ ] Pourcentages avec virgule (3,5%)
- [ ] Pas d'erreur d'accent

#### Test 8 : Multiple exports
- [ ] Exporter 3 rapports différents
- [ ] Vérifier que les 3 PDF sont distincts
- [ ] **Attendu** : Chaque PDF contient les bonnes données

---

## 🎨 Tests visuels

### Vérifications visuelles

#### Couleurs
- [ ] Header : Bleu (#2563eb)
- [ ] Badge CONFORME : Vert (#10b981)
- [ ] Badge ANOMALIE : Orange (#f59e0b)
- [ ] Total économies : Rouge (#ef4444)
- [ ] Texte principal : Gris foncé (#374151)

#### Typographie
- [ ] Titre principal : 24pt, bold
- [ ] Sous-titres : 16pt/14pt, bold
- [ ] Corps de texte : 11pt/10pt, normal
- [ ] Footer : 9pt/8pt

#### Mise en page
- [ ] Marges de 15mm
- [ ] Espacement cohérent
- [ ] Pas de chevauchement de texte
- [ ] Tableaux bien alignés
- [ ] Bordures propres

---

## 🔧 Tests techniques

### Performance
- [ ] Génération du PDF < 2 secondes
- [ ] Pas de freeze de l'interface
- [ ] Loader affiché pendant la génération
- [ ] Toast affiché après génération

### Gestion d'erreur
- [ ] Tester sans données de facture
- [ ] Tester sans données de grossiste
- [ ] Tester avec anomalies vides
- [ ] **Attendu** : Erreur capturée + Toast d'erreur

### Compatibilité navigateurs
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (si macOS)

### Taille de fichier
- [ ] Facture conforme : ~25 KB
- [ ] Facture avec 2 anomalies : ~30 KB
- [ ] Facture avec 5 anomalies : ~35 KB
- [ ] **Attendu** : Tailles raisonnables

---

## 📊 Scénarios de test détaillés

### Scénario 1 : Pharmacien découvre une anomalie

**Étapes :**
1. Se connecter à PharmaVerif
2. Cliquer sur "Vérifier une facture"
3. Sélectionner "OCP"
4. Uploader la facture PDF
5. Lancer la vérification
6. Voir 2 anomalies détectées (123€ d'économies)
7. Cliquer sur "Exporter le rapport PDF"
8. Ouvrir le PDF téléchargé
9. Vérifier que les 2 anomalies sont listées
10. Vérifier que le total (123€) est en rouge

**Résultat attendu :**
- PDF complet et professionnel
- Prêt à envoyer au grossiste
- Anomalies clairement identifiées

### Scénario 2 : Export en masse depuis le dashboard

**Étapes :**
1. Aller sur le "Tableau de bord"
2. Onglet "Factures"
3. Identifier les 3 factures avec anomalies
4. Exporter chacune en PDF (clic sur "PDF")
5. Vérifier que 3 fichiers sont téléchargés
6. Ouvrir les 3 PDF
7. Vérifier que chacun contient les bonnes données

**Résultat attendu :**
- 3 PDF distincts
- Chacun avec les bonnes informations
- Noms de fichiers différents

### Scénario 3 : Archivage mensuel

**Étapes :**
1. Exporter toutes les factures du mois
2. Créer un dossier "Archives/2026-02/"
3. Classer les PDF par grossiste
4. Créer un fichier Excel récapitulatif
5. Calculer le total des économies

**Résultat attendu :**
- Dossier bien organisé
- Rapports facilement retrouvables
- Total cohérent

---

## 🐛 Problèmes connus et solutions

### Problème 1 : PDF vide

**Symptôme :** Le PDF se télécharge mais est vide ou cassé

**Solution :**
1. Ouvrir la console (F12)
2. Chercher les erreurs JavaScript
3. Vérifier que `jspdf` et `jspdf-autotable` sont installés
4. Relancer `npm install`

### Problème 2 : Caractères accentués mal affichés

**Symptôme :** "é" affiché comme "Ã©"

**Solution :**
1. Vérifier l'encodage UTF-8 dans le code
2. S'assurer que la police Helvetica est utilisée
3. Tester avec une autre facture

### Problème 3 : Bouton "PDF" grisé

**Symptôme :** Le bouton ne répond pas au clic

**Solution :**
1. Vérifier que la facture a bien été vérifiée
2. Vérifier que le grossiste existe en base
3. Vérifier qu'il n'y a pas d'export en cours

### Problème 4 : Pas de notification après export

**Symptôme :** Le PDF se télécharge mais pas de toast

**Solution :**
1. Vérifier que le Toaster est bien dans App.tsx
2. Vérifier que `toast.success()` est appelé
3. Regarder la console pour les erreurs

---

## 📝 Rapport de test

### Modèle de rapport

```
# Rapport de test - Export PDF

**Date :** 08/02/2026
**Testeur :** [Nom]
**Version :** 1.0.0

## Tests fonctionnels
- [x] Export depuis vérification : ✅ PASS
- [x] Export depuis dashboard : ✅ PASS
- [x] Facture conforme : ✅ PASS
- [x] Facture avec anomalies : ✅ PASS
- [x] Nom de fichier : ✅ PASS
- [x] Contenu complet : ✅ PASS
- [x] Formatage français : ✅ PASS
- [x] Exports multiples : ✅ PASS

## Tests visuels
- [x] Couleurs : ✅ PASS
- [x] Typographie : ✅ PASS
- [x] Mise en page : ✅ PASS

## Tests techniques
- [x] Performance : ✅ PASS (1.2s)
- [x] Gestion d'erreur : ✅ PASS
- [x] Chrome : ✅ PASS
- [x] Firefox : ✅ PASS
- [x] Taille fichier : ✅ PASS (28 KB)

## Bugs détectés
Aucun

## Recommandations
- Ajouter un logo SVG dans le header
- Proposer un aperçu avant téléchargement
- Permettre de choisir le format (A4/Lettre)

## Conclusion
✅ Export PDF fonctionnel et prêt pour production
```

---

## ✅ Validation finale

Avant de considérer la fonctionnalité comme terminée :

- [ ] Tous les tests fonctionnels passent
- [ ] Tous les tests visuels passent
- [ ] Tous les tests techniques passent
- [ ] Documentation complète (EXPORT_PDF_GUIDE.md)
- [ ] Code commenté et propre
- [ ] Pas de console.error en production
- [ ] Toasts fonctionnent correctement
- [ ] Nom de fichiers cohérents
- [ ] PDF imprimable (marges correctes)
- [ ] Testé sur 3 navigateurs minimum

---

<div align="center">

**🧪 Guide de test complet**

*Assurez-vous que tous les tests passent avant mise en production !*

</div>
