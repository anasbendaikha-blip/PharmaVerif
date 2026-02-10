# Données de Démonstration PharmaVerif

## Fonction seed_demo_data()

Cette fonction crée automatiquement 5 factures de démonstration avec des montants précis pour tester les fonctionnalités de vérification.

### Exécution Automatique

La fonction `seedDemoData()` est appelée automatiquement au démarrage de l'application si la base de données est vide.

**Équivalent FastAPI Python :**
```python
@app.on_event("startup")
async def startup_event():
    init_db()
    if database_is_empty():
        seed_demo_data()
```

**Implémentation TypeScript :**
```typescript
// Dans endpoints.ts - initializeDatabase()
if (isDatabaseEmpty()) {
    seedDemoData();
}
```

---

## Factures Créées

### 📄 FACTURE 1 - CERP Rouen - ✅ CONFORME
- **Numéro:** FAC-CERP-001
- **Date:** 15/01/2026
- **Montant brut HT:** 5 230,00 €
- **Remises ligne à ligne:** 157,00 €
- **Remises pied de facture:** 131,00 €
- **Net à payer:** 4 942,00 €
- **Taux attendu:** 5,5% (3,0% base + 2,0% coop + 0,5% escompte)
- **Remise attendue:** 287,65 €
- **Remise appliquée:** 288,00 €
- **✅ STATUT:** Conforme (écart < 5€)

---

### 📄 FACTURE 2 - CERP Rouen - ⚠️ ANOMALIE
- **Numéro:** FAC-CERP-002
- **Date:** 22/01/2026
- **Montant brut HT:** 8 450,00 €
- **Remises ligne à ligne:** 245,00 €
- **Remises pied de facture:** 125,00 €
- **Net à payer:** 8 080,00 €
- **Taux attendu:** 5,5% (3,0% base + 2,0% coop + 0,5% escompte)
- **Remise attendue:** 464,75 €
- **Remise appliquée:** 370,00 €
- **⚠️ ANOMALIE DÉTECTÉE:** ~94,75 € de remise manquante
- **Type:** remise_manquante

---

### 📄 FACTURE 3 - OCP - ⚠️ ANOMALIE
- **Numéro:** FAC-OCP-001
- **Date:** 01/02/2026
- **Montant brut HT:** 12 300,00 €
- **Remises ligne à ligne:** 308,00 €
- **Remises pied de facture:** 246,00 €
- **Net à payer:** 11 746,00 €
- **Taux attendu:** 5,0% (2,5% base + 2,0% coop + 0,5% escompte)
- **Remise attendue:** 615,00 €
- **Remise appliquée:** 554,00 €
- **⚠️ ANOMALIE DÉTECTÉE:** ~61,00 € de remise manquante
- **Type:** remise_manquante

---

### 📄 FACTURE 4 - Alliance Healthcare - ✅ CONFORME
- **Numéro:** FAC-ALL-001
- **Date:** 05/02/2026
- **Montant brut HT:** 6 780,00 €
- **Remises ligne à ligne:** 237,00 €
- **Remises pied de facture:** 102,00 €
- **Net à payer:** 6 441,00 €
- **Taux attendu:** 5,0% (3,5% base + 1,5% coop + 0,0% escompte)
- **Remise attendue:** 339,00 €
- **Remise appliquée:** 339,00 €
- **✅ STATUT:** Conforme (écart = 0€)

---

### 📄 FACTURE 5 - OCP - ⚠️ ANOMALIE
- **Numéro:** FAC-OCP-002
- **Date:** 08/02/2026
- **Montant brut HT:** 4 560,00 €
- **Remises ligne à ligne:** 114,00 €
- **Remises pied de facture:** 91,00 €
- **Net à payer:** 4 355,00 €
- **Taux attendu:** 5,0% (2,5% base + 2,0% coop + 0,5% escompte)
- **Remise attendue:** 228,00 €
- **Remise appliquée:** 205,00 €
- **⚠️ ANOMALIE DÉTECTÉE:** ~23,00 € de remise manquante
- **Type:** remise_manquante

---

## Résumé des Statistiques

Après l'exécution de `seedDemoData()`, vous devriez voir :

- **📊 Total Factures:** 5
- **⚠️ Anomalies Détectées:** ~3-4 (selon les seuils de tolérance)
- **💰 Économies Potentielles:** ~178-200 €
- **✓ Taux de Conformité:** 40% (2 factures conformes sur 5)

---

## Logique de Vérification

### Tolérances
- **Remise totale:** ±5,00 € (tolérance sur la comparaison remise attendue vs appliquée)
- **Net à payer:** ±1,00 € (tolérance sur la cohérence du calcul)

### Formules
```typescript
// 1. Calcul de la remise attendue
remise_attendue = montant_brut_ht * (remise_base + cooperation_commerciale + escompte) / 100

// 2. Calcul de la remise réelle
remise_reelle = remises_ligne_a_ligne + remises_pied_facture

// 3. Détection d'anomalie
if (Math.abs(remise_attendue - remise_reelle) > 5.0) {
    → ANOMALIE: remise_manquante ou remise_incorrecte
}

// 4. Vérification du net à payer
net_calcule = montant_brut_ht - remise_reelle
if (Math.abs(net_calcule - net_a_payer) > 1.0) {
    → ANOMALIE: ecart_calcul
}
```

---

## Utilisation

### Réinitialiser les données de démonstration

Pour réinitialiser les données, rechargez simplement l'application. La fonction `initializeDatabase()` vérifie si la DB est vide et recrée automatiquement les 5 factures.

### Désactiver le seeding automatique

Pour désactiver le seeding automatique, commentez cette ligne dans `/src/app/api/endpoints.ts` :

```typescript
// if (isDatabaseEmpty()) {
//     seedDemoData();
// }
```

---

## Console Logs Attendus

```
🗄️  Initialisation de la base de données...
✅ Base de données initialisée avec succès
   - 3 grossistes chargés
   - 0 factures exemples chargées
   - 0 anomalies exemples chargées
🔍 Base de données vide détectée, semer les données de démonstration...
🌱 Création des données de démonstration...
   📄 Création Facture 1: FAC-CERP-001 (CONFORME)
      ✓ Statut: conforme - 0 anomalie(s)
   📄 Création Facture 2: FAC-CERP-002 (ANOMALIE ~127€)
      ✓ Statut: anomalie - 1 anomalie(s) - 94.75€ récupérable
   📄 Création Facture 3: FAC-OCP-001 (ANOMALIE ~123€)
      ✓ Statut: anomalie - 1 anomalie(s) - 61.00€ récupérable
   📄 Création Facture 4: FAC-ALL-001 (CONFORME)
      ✓ Statut: conforme - 0 anomalie(s)
   📄 Création Facture 5: FAC-OCP-002 (ANOMALIE ~46€)
      ✓ Statut: anomalie - 1 anomalie(s) - 23.00€ récupérable

✅ Données de démonstration créées avec succès!
   📊 5 factures créées
   ⚠️  3 anomalies détectées
   💰 178.75€ d'économies potentielles
   ✓  40.0% de taux de conformité
```
