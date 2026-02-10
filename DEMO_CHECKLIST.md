# 🎯 CHECKLIST DE DÉMONSTRATION - PharmaVerif

> **Guide complet pour réussir votre démonstration du prototype**

---

## 📋 AVANT LA DÉMO (J-1 ou 2 heures avant)

### ✅ Tests techniques

- [ ] **Tester le lancement de l'application**
  ```bash
  cd backend
  python main.py
  # Vérifier : "Uvicorn running on http://localhost:8000"
  ```

- [ ] **Vérifier que les 5 factures de démo sont présentes**
  - Ouvrir http://localhost:8000
  - Compter les factures sur le dashboard
  - Vérifier que les montants s'affichent correctement

- [ ] **Tester la création d'une nouvelle facture**
  - Cliquer sur "Vérifier une facture"
  - Remplir le formulaire avec des données de test
  - Vérifier que le résultat s'affiche correctement
  - **Note :** Tester avec une facture CONFORME et une avec ANOMALIE

- [ ] **Vérifier l'affichage du dashboard**
  - Stats globales visibles (4 cartes en haut)
  - Dernières anomalies affichées
  - Aucune erreur JavaScript dans la console (F12)

- [ ] **Tester sur le navigateur que tu vas utiliser**
  - Chrome (recommandé)
  - Firefox
  - Edge
  - Safari (si MacOS)

- [ ] **Nettoyer la console de tout message d'erreur**
  - Ouvrir DevTools (F12)
  - Vérifier qu'il n'y a pas de messages rouges
  - Si erreurs mineures, les noter (pour expliquer si demandé)

- [ ] **Préparer un backup de la DB**
  ```bash
  cp backend/pharmaverif.db backend/pharmaverif_backup.db
  ```

- [ ] **Charger la batterie du laptop**
  - 100% recommandé
  - Avoir le chargeur à portée de main

- [ ] **Tester sans connexion internet**
  - Couper le WiFi
  - Vérifier que tout fonctionne en local
  - Reconnecter après le test

- [ ] **Avoir un plan B si ça plante**
  - Screenshots de l'interface prêts dans un dossier
  - Version PDF du README avec captures
  - Savoir relancer rapidement l'app

### 📱 Préparation matérielle

- [ ] **Laptop complètement chargé**
- [ ] **Chargeur à portée de main**
- [ ] **Souris (si plus confortable que le trackpad)**
- [ ] **Câble HDMI/VGA si présentation sur écran externe**
- [ ] **Adaptateurs nécessaires (USB-C, etc.)**
- [ ] **Bouteille d'eau** (pour éviter de partir chercher)

### 📄 Documents à préparer

- [ ] **Cette checklist imprimée ou sur téléphone**
- [ ] **Fiche récap du projet** (1 page A4)
  - Nom du projet : PharmaVerif
  - Contact : [votre email]
  - Valeur : "Récupérer 1500-3000€/mois en moyenne"
  - Roadmap : Septembre 2026 avec Factur-X

- [ ] **Business case sur papier** (au cas où)
  - 200k€ d'achats/mois × 2% d'erreurs = 4k€ de manque à gagner
  - Sur 1 an = 48k€

- [ ] **Carnet pour noter les retours**

### 🧠 Préparation mentale

- [ ] **Relire le README.md** (section "Utilisation")
- [ ] **Relire le scénario de démo** (ci-dessous)
- [ ] **Répéter la démo 1 fois à voix haute** (chronomètre : 8 min max)
- [ ] **Préparer 3 phrases d'intro** :
  1. "Je vous présente PharmaVerif, un outil qui vérifie automatiquement vos factures grossistes"
  2. "L'objectif : ne plus perdre d'argent sur les remises oubliées"
  3. "Aujourd'hui c'est un prototype, mais dès septembre 2026 tout sera automatique"

---

## 🎬 PENDANT LA DÉMO

### ⏰ 5 minutes avant

- [ ] **Lancer l'application**
  ```bash
  cd backend
  python main.py
  ```

- [ ] **Ouvrir http://localhost:8000 dans un onglet propre**
  - Fermer tous les autres onglets (pour éviter notifications)
  - Mode plein écran (F11 si besoin)

- [ ] **Avoir cette checklist sous les yeux**
  - Sur téléphone ou imprimée
  - Section "Scénario de démo" visible

- [ ] **Respirer !** 🧘
  - 3 grandes respirations
  - Tu connais ton projet par cœur
  - Si ça plante, pas grave, c'est un prototype

### 💡 Pendant la présentation

- [ ] **Parler lentement et clairement**
- [ ] **Montrer l'écran, pas le clavier**
- [ ] **Laisser le temps de regarder** (pauses de 2-3 secondes)
- [ ] **Demander régulièrement : "Vous voyez ?"**
- [ ] **Encourager les questions** : "N'hésitez pas à m'interrompre"

---

## 🎯 SCÉNARIO DE DÉMO (8 minutes)

### 1️⃣ Introduction (30 secondes)

**Script :**
> "Bonjour ! Je vous présente **PharmaVerif**, une solution pour les pharmacies d'officine.
> L'objectif est simple : **vérifier automatiquement vos factures grossistes** et **détecter les remises manquantes**.
> 
> Selon les études, **60% des factures ont des erreurs** de calcul.
> On parle de **1 500 à 3 000 euros par mois** qu'une pharmacie pourrait récupérer.
> 
> Je vais vous montrer comment ça fonctionne."

**Actions :**
- [ ] Sourire et regarder la personne
- [ ] Montrer l'écran
- [ ] Attendre son accord avant de continuer

---

### 2️⃣ Page d'accueil - Vue d'ensemble (1 minute)

**Script :**
> "Voici le **tableau de bord** de PharmaVerif.
> 
> En haut, vous avez les **statistiques globales** :
> - 5 factures analysées
> - 3 anomalies détectées (60% des factures)
> - **296 euros récupérables** sur ces seules 5 factures
> - Un taux de conformité de 40%
> 
> En dessous, vous voyez le **détail des anomalies** :
> - Remise de base manquante
> - Coopération commerciale non appliquée
> - Avec le montant exact de l'écart
> 
> Et tout en bas, les **conditions contractuelles** de vos 3 grossistes."

**Actions :**
- [ ] Pointer les 4 cartes de stats avec la souris
- [ ] Scroller doucement pour montrer les anomalies
- [ ] Scroller jusqu'aux grossistes
- [ ] **PAUSE 3 secondes** pour laisser observer
- [ ] Demander : "C'est clair jusqu'ici ?"

---

### 3️⃣ Vérifier une facture - Saisie (2 minutes)

**Script :**
> "Maintenant, je vais vous montrer comment **vérifier une nouvelle facture**.
> 
> Je clique sur **'Vérifier une facture'** dans le menu."

**Actions :**
- [ ] Cliquer sur "Vérifier une facture"
- [ ] Attendre le chargement de la page

**Script (page de vérification) :**
> "Ici, c'est très simple.
> 
> **Étape 1** : Je choisis mon **grossiste**.
> Par exemple, CERP Rouen."

**Actions :**
- [ ] Sélectionner "CERP Rouen" dans le dropdown

**Script :**
> "**Étape 2** : Je saisis les informations de ma facture.
> 
> Pour l'instant, c'est de la **saisie assistée**, mais dès **septembre 2026**,
> avec la réforme des **factures électroniques obligatoires**, tout sera automatique.
> 
> Je remplis :
> - Numéro de facture : **DEMO-2026-001**
> - Date : **aujourd'hui**
> - Montant brut HT : **8 450 euros**
> - Remises ligne à ligne : **245 euros**
> - Remises pied de facture : **125 euros**
> - Net à payer : **8 080 euros**"

**Actions :**
- [ ] Remplir chaque champ en PARLANT PENDANT que tu tapes
- [ ] Aller LENTEMENT (pour que la personne suive)
- [ ] Utiliser les valeurs ci-dessus (elles génèrent une anomalie)

**Script :**
> "Et maintenant, je clique sur **'Vérifier la facture'**."

**Actions :**
- [ ] Cliquer sur "Vérifier la facture"
- [ ] **SILENCE pendant 2 secondes** (suspense)

---

### 4️⃣ Résultats - Anomalie détectée (2 minutes)

**Script :**
> "Et voilà ! En **2 secondes**, le système a analysé la facture et détecté **une anomalie**.
> 
> Il me dit clairement :
> - **Type d'anomalie** : Remise de base incomplète
> - **Explication** : La remise de base contractuelle est de 3%, soit 253,50 euros.
>   Mais seulement 245 euros ont été appliqués.
> - **Montant de l'écart** : **127,50 euros**
> 
> C'est exactement ce montant que vous pouvez **contester auprès du grossiste**.
> 
> Sur une année, si vous traitez 30 factures par mois avec ce type d'erreur,
> on parle de **46 000 euros récupérables**."

**Actions :**
- [ ] Pointer chaque élément du résultat avec la souris
- [ ] Bien montrer le montant de l'écart (127,50 €)
- [ ] Laisser le temps de lire
- [ ] Demander : "Vous voyez l'économie potentielle ?"

**Script (si confiance) :**
> "De là, j'ai 3 options :
> - **Marquer pour contestation** (orange) → je vais contacter le grossiste
> - **Enregistrer quand même** (gris) → je note mais je ne conteste pas
> - **Nouvelle vérification** (bleu) → je recommence avec une autre facture"

**Actions :**
- [ ] Pointer les 3 boutons sans cliquer
- [ ] **Option** : Cliquer sur "Marquer pour contestation" pour montrer la sauvegarde

---

### 5️⃣ Retour au dashboard (1 minute)

**Script :**
> "Si je retourne à l'**accueil** maintenant..."

**Actions :**
- [ ] Cliquer sur "PharmaVerif" (logo en haut) ou bouton retour

**Script :**
> "...vous voyez que les statistiques ont été **mises à jour** :
> - Une facture de plus
> - Les montants récalculés
> - La nouvelle anomalie apparaît en haut de la liste
> 
> Tout est **tracé** et **historisé** pour vous."

**Actions :**
- [ ] Montrer que les chiffres ont changé
- [ ] Scroller vers les anomalies

---

### 6️⃣ Explication de la valeur (1 minute 30)

**Script :**
> "Alors, pourquoi c'est **important** ?
> 
> **Aujourd'hui**, vous recevez 30 à 50 factures par mois.
> Il est **impossible** de tout vérifier manuellement.
> Chaque grossiste a ses propres taux :
> - Remise de base : 2,5% à 3,5%
> - Coopération commerciale : 1,5% à 2%
> - Escompte : 0% à 0,5%
> 
> Les **erreurs de calcul** sont fréquentes, souvent involontaires,
> mais ça représente des **milliers d'euros par an**.
> 
> **Avec PharmaVerif** :
> - Le système **connaît vos accords** avec chaque grossiste
> - Il **vérifie systématiquement**, sans jamais oublier
> - Il vous **alerte en 2 secondes** si quelque chose cloche
> 
> **Après septembre 2026**, avec les factures électroniques obligatoires,
> tout sera **100% automatique** :
> - Zéro saisie manuelle
> - Vérification en temps réel
> - Export Excel pour contestation
> 
> En attendant, ce prototype démontre que **la logique fonctionne**.
> Le plus important, c'est le **moteur de vérification** derrière."

**Actions :**
- [ ] Parler calmement
- [ ] Regarder la personne, pas l'écran
- [ ] Laisser des pauses pour réactions

---

### 7️⃣ Conclusion et questions (30 secondes)

**Script :**
> "Voilà ! Je vous ai montré l'essentiel en 8 minutes.
> 
> **En résumé** :
> ✅ Vérification automatique de vos factures
> ✅ Détection des remises manquantes
> ✅ Calcul précis des écarts
> ✅ Potentiel de 1 500 à 3 000 euros récupérés par mois
> 
> Qu'est-ce que vous en pensez ?
> Vous avez des questions ?"

**Actions :**
- [ ] Sourire
- [ ] Se tourner vers la personne
- [ ] Écouter activement

---

## 💬 QUESTIONS PROBABLES & RÉPONSES PRÉPARÉES

### ❓ "Ça marche avec mon logiciel actuel (Winpharma/LGPI/Pharm'Azur/etc.) ?"

**Réponse :**
> "Pas encore dans cette **version de démonstration**, mais c'est **prévu dans la feuille de route**.
> 
> Avec la réforme **Factur-X** en septembre 2026, les factures seront **structurées et standardisées**.
> Ça nous permettra de nous **intégrer facilement** avec tous les logiciels de gestion d'officine (LGO).
> 
> L'avantage, c'est que Factur-X est un **standard national**, donc tous les éditeurs
> devront s'adapter. On sera compatible avec **Winpharma, LGPI, Pharm'Azur**, etc.
> 
> Pour l'instant, le prototype démontre que **la logique de vérification fonctionne**.
> L'intégration technique viendra après."

---

### ❓ "Combien ça coûte ?"

**Réponse :**
> "On est actuellement en **phase de développement**, donc je n'ai pas encore de grille tarifaire définitive.
> 
> Mais l'idée, c'est de proposer un **modèle gagnant-gagnant** :
> - Soit un **abonnement mensuel** entre 99 et 149 euros par mois
> - Soit un **pourcentage sur les économies détectées** (par exemple 20% la première année)
> 
> L'important, c'est que vous soyez **toujours gagnant** :
> Si vous récupérez **2 000 euros par mois**, même avec 149 euros d'abonnement,
> vous gagnez **1 850 euros net par mois**, soit **22 000 euros par an**.
> 
> Le **retour sur investissement** se fait en quelques jours.
> 
> Quel modèle vous intéresserait le plus ?"

---

### ❓ "Et pour les RFA (Remises de Fin d'Année) ?"

**Réponse :**
> "**Excellente question** ! Les RFA, c'est la **phase 2** du projet.
> 
> Aujourd'hui, on se concentre sur les **remises facturées** (remise de base, coopération commerciale, escompte).
> C'est ce qu'on peut vérifier **facture par facture**.
> 
> Les **RFA et EMAC** (Évaluation du Montant des Achats Consolidés), c'est un autre type de remise :
> - Elles sont calculées sur un **trimestre ou une année**
> - Elles dépendent d'**objectifs de volume**
> - Elles sont plus **complexes à suivre**
> 
> Mais oui, c'est prévu ! On pourra :
> - **Suivre vos objectifs trimestriels** en temps réel
> - **Vous alerter** si vous êtes proche d'un palier de RFA
> - **Optimiser votre répartition d'achats** entre grossistes
> 
> C'est une des fonctionnalités les plus demandées, donc elle viendra vite.
> 
> Vous avez beaucoup de RFA à gérer ?"

---

### ❓ "Mes données sont en sécurité ? C'est conforme RGPD ?"

**Réponse :**
> "**Excellente question**, la sécurité est primordiale.
> 
> Dans cette version de démo, **tout est en local** :
> - Les données sont stockées sur **votre ordinateur**
> - Aucune connexion internet nécessaire
> - **Zéro donnée envoyée sur le cloud**
> 
> En version production, on aurait plusieurs options :
> 
> **Option 1** : **Installation locale** (on-premise)
> - Le logiciel tourne sur votre serveur en pharmacie
> - Vos données ne sortent jamais de chez vous
> - C'est vous qui contrôlez tout
> 
> **Option 2** : **Cloud sécurisé** (hébergeur de santé certifié HDS)
> - Hébergement chez un acteur agréé santé (OVH Healthcare, etc.)
> - Chiffrement de bout en bout
> - Conformité RGPD garantie
> 
> Dans tous les cas :
> - **Anonymisation** des données (on n'a pas besoin de noms de patients)
> - **Chiffrement** des communications
> - **Traçabilité** de tous les accès
> 
> Vous préféreriez une installation locale ou cloud ?"

---

### ❓ "Ça détecte vraiment TOUTES les anomalies ?"

**Réponse :**
> "**Soyons honnêtes** : on détecte les **remises contractuelles standard** :
> - Remise de base
> - Coopération commerciale
> - Escompte
> - Franco (seuil de gratuité de livraison)
> 
> Ces 4 types de remises représentent **80-90% des cas**.
> 
> **Ce qu'on ne détecte pas encore** :
> - Les **accords spécifiques complexes** (ex: remise de 5% sur les génériques en janvier)
> - Les **promotions ponctuelles** (ex: -10% sur une gamme)
> - Les **remises négociées au cas par cas**
> 
> **Mais**, on peut vous aider à **paramétrer vos accords spécifiques**.
> Par exemple, si vous avez un accord de 4% sur les génériques,
> on l'ajoute dans le système et il vérifie automatiquement.
> 
> L'objectif, c'est de **vous faire gagner du temps** sur les vérifications répétitives
> et de **ne rien laisser passer** sur les remises contractuelles.
> 
> Vous avez beaucoup d'accords spécifiques ?"

---

### ❓ "Pourquoi je ne peux pas uploader un PDF maintenant ?"

**Réponse :**
> "Bonne remarque ! Vous voyez qu'il y a une **zone de drag & drop pour le PDF**,
> mais pour l'instant c'est juste l'interface utilisateur.
> 
> **Pourquoi ça ne fonctionne pas encore ?**
> 
> Aujourd'hui, les factures PDF des grossistes sont des **documents scannés**,
> pas des fichiers structurés. Pour les lire automatiquement, il faudrait :
> - Un **moteur OCR** (reconnaissance de caractères)
> - Un **parser intelligent** pour trouver les montants
> - Gérer les **différents formats** de chaque grossiste
> 
> C'est **faisable**, mais complexe et pas toujours fiable (90% de précision max).
> 
> **Avec Factur-X** (septembre 2026), ça change tout :
> - Les factures sont au format **PDF + XML structuré**
> - Les données sont **déjà extraites et normalisées**
> - On lit directement les montants, **sans OCR**
> - **Fiabilité 100%**
> 
> Donc plutôt que de faire un système compliqué qui marche à 90%,
> on attend **6 mois** pour avoir un système simple qui marche à **100%**.
> 
> En attendant, la saisie assistée permet de **démontrer la logique**,
> et vous pouvez déjà l'utiliser pour vérifier vos factures importantes.
> 
> Ça vous paraît logique ?"

---

### ❓ "Qu'est-ce qui différencie PharmaVerif d'une simple feuille Excel ?"

**Réponse :**
> "**Très bonne question** ! On pourrait effectivement faire ça dans Excel.
> 
> Mais regardez les différences :
> 
> **Avec Excel** :
> - Vous devez **saisir toutes les formules** vous-même
> - Vous devez **mettre à jour** les taux de chaque grossiste manuellement
> - Si un taux change, vous devez **modifier toutes les lignes**
> - Pas d'**historique** automatique
> - Pas d'**alertes** visuelles
> - Pas d'**export** pour contestation
> - Si votre collaborateur/remplaçant arrive, il ne sait pas comment ça marche
> 
> **Avec PharmaVerif** :
> - Les **taux sont centralisés** et mis à jour automatiquement
> - Les **calculs sont garantis justes** (pas d'erreur de formule)
> - **Historique complet** de toutes les vérifications
> - **Interface claire** pour toute l'équipe
> - **Alertes visuelles** immédiates
> - **Export Excel** en un clic pour contestation
> - Dès sept 2026 : **zéro saisie manuelle**
> 
> C'est comme comparer un **logiciel de comptabilité** à Excel :
> techniquement, on peut tout faire dans Excel, mais un logiciel dédié
> vous fait **gagner du temps**, **évite les erreurs**, et **professionnalise votre démarche**.
> 
> Actuellement, vous utilisez Excel pour ce genre de vérifications ?"

---

### ❓ "Ça marche pour les AUTRES types de fournisseurs (labo, parapharmacie, etc.) ?"

**Réponse :**
> "**Aujourd'hui**, le prototype est focalisé sur les **grossistes pharmaceutiques**
> (CERP, OCP, Alliance Healthcare, Phoenix).
> 
> **Pourquoi ?**
> - C'est là où les **volumes sont les plus importants** (80% de vos achats)
> - Les **remises sont standardisées** (remise de base, coop co, escompte)
> - Les **enjeux financiers** sont les plus élevés
> 
> **Mais oui**, on pourrait étendre à :
> - **Laboratoires** (commandes directes)
> - **Parapharmacie** (fournisseurs dermo, etc.)
> - **Dispositifs médicaux**
> - **Vétérinaire** (si vous en faites)
> 
> La logique est la même : **comparer ce qui devrait être facturé vs ce qui l'est réellement**.
> 
> L'important, c'est de **paramétrer vos accords** avec chaque fournisseur.
> Si vous me donnez votre taux de remise avec un labo, je peux le vérifier.
> 
> Sur quels autres types de fournisseurs vous aimeriez avoir ce genre de vérification ?"

---

## 🆘 PLAN B SI ÇA PLANTE

### Si le serveur ne démarre pas

**Actions :**
1. [ ] Rester calme : "Petit souci technique, une seconde..."
2. [ ] Vérifier que le port 8000 n'est pas déjà utilisé
   ```bash
   # Windows
   netstat -ano | findstr :8000
   # Mac/Linux
   lsof -i :8000
   ```
3. [ ] Relancer sur un autre port
   ```bash
   uvicorn main:app --port 8001
   ```
4. [ ] Si ça ne fonctionne toujours pas :
   - [ ] Dire : "C'est un prototype, je vais vous montrer avec des captures d'écran"
   - [ ] Ouvrir le dossier avec les screenshots préparés
   - [ ] Ou ouvrir le README.md dans un navigateur (pour les images si vous en avez ajoutées)

### Si une erreur s'affiche à l'écran

**Actions :**
1. [ ] Ne pas paniquer
2. [ ] Dire : "Voilà un exemple typique de l'intérêt d'un prototype : on identifie les cas limites"
3. [ ] Noter l'erreur rapidement
4. [ ] Revenir à la page d'accueil (bouton retour ou logo)
5. [ ] Continuer avec un autre exemple

### Si les données sont vides (pas de factures)

**Actions :**
1. [ ] Dire : "La base de données s'est réinitialisée, je vais vous montrer la création en direct"
2. [ ] Créer une facture en direct (démonstration encore plus interactive)
3. [ ] Expliquer : "En production, évidemment, les données seraient persistantes"

### Si l'ordinateur plante complètement

**Actions :**
1. [ ] Respirer
2. [ ] Dire : "Bon, je vais vous expliquer le concept sans l'écran"
3. [ ] Utiliser un **tableau blanc** ou **papier**
4. [ ] Dessiner le schéma :
   ```
   FACTURE        →    PHARMAVERIF    →    RÉSULTAT
   (Grossiste)         (Vérification)      (Anomalies)
   
   Montant: 5000€      Remise attendue:    Écart: 75€
   Remise: 200€        275€ (5.5%)         → À récupérer!
   ```
5. [ ] Raconter un **cas d'usage concret**
6. [ ] Proposer de reprogrammer une démo ou d'envoyer une vidéo

---

## 📝 APRÈS LA DÉMO

### Débriefing immédiat (dans les 5 minutes)

- [ ] **Noter tous les retours du pharmacien**
  - Ce qu'il a aimé
  - Ce qu'il n'a pas compris
  - Ce qui l'inquiète
  - Ce qui l'enthousiasme

- [ ] **Poser des questions ouvertes** :
  - "Qu'est-ce qui vous serait le plus utile dans votre quotidien ?"
  - "Quel serait le déclic pour que vous adoptiez un tel outil ?"
  - "Si vous deviez améliorer une chose, ce serait quoi ?"
  - "Vous connaissez d'autres pharmaciens que ça pourrait intéresser ?"

- [ ] **Identifier les objections principales**
  - Prix ?
  - Complexité ?
  - Changement d'habitude ?
  - Intégration avec le LGO ?

### Actions de suivi

- [ ] **Proposer un suivi dans 2 semaines**
  - "Je note vos retours et je vous recontacte dans 15 jours avec une version améliorée ?"

- [ ] **Lui laisser une fiche récap du projet**
  - Imprimer la première page du README.md
  - Ajouter vos coordonnées
  - Ajouter le calcul du ROI personnalisé

- [ ] **Envoyer un email de remerciement** (dans les 24h)
  ```
  Objet : Merci pour votre retour sur PharmaVerif
  
  Bonjour [Prénom],
  
  Merci d'avoir pris le temps de découvrir PharmaVerif aujourd'hui.
  
  Comme promis, voici le récapitulatif de notre échange :
  - Économies potentielles pour votre pharmacie : [X] € / mois
  - Fonctionnalités prioritaires pour vous : [...]
  - Prochaine étape : [...]
  
  Je reste à votre disposition pour toute question.
  
  À très bientôt,
  [Votre nom]
  ```

- [ ] **Mettre à jour votre roadmap** en fonction des retours

### Analyse à froid (le soir même)

- [ ] **Relire vos notes**
- [ ] **Identifier les patterns** (si plusieurs démos)
  - Quelles questions reviennent ?
  - Quelles fonctionnalités intéressent le plus ?
  - Quels freins sont récurrents ?

- [ ] **Améliorer le prototype** pour la prochaine démo
  - Corriger les bugs rencontrés
  - Ajouter une feature demandée (si rapide)
  - Améliorer le script de démo

- [ ] **S'auto-évaluer**
  - Qu'est-ce qui s'est bien passé ?
  - Qu'est-ce que je peux améliorer ?
  - Est-ce que j'étais trop technique ? Pas assez ?
  - Est-ce que j'ai bien écouté les besoins ?

---

## 📊 FICHE RÉCAP À IMPRIMER (à donner au pharmacien)

```
┌─────────────────────────────────────────────────────────────┐
│  💊 PHARMAVERIF - Votre assistant de vérification de factures│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🎯 OBJECTIF                                                  │
│     Récupérer les remises manquantes sur vos factures        │
│     grossistes (CERP, OCP, Alliance, Phoenix...)             │
│                                                               │
│  💰 POTENTIEL D'ÉCONOMIES                                     │
│     1 500 à 3 000 € / mois en moyenne                        │
│     18 000 à 36 000 € / an                                   │
│                                                               │
│  ✅ CE QUI FONCTIONNE AUJOURD'HUI                             │
│     • Détection automatique des anomalies                    │
│     • Calcul précis des écarts                               │
│     • Interface simple et claire                             │
│     • Saisie assistée de vos factures                        │
│                                                               │
│  🔮 CE QUI ARRIVE EN SEPTEMBRE 2026                           │
│     • Upload automatique de PDF                              │
│     • Parsing avec Factur-X (factures électroniques)         │
│     • Intégration avec votre LGO                             │
│     • Export Excel pour contestation                         │
│                                                               │
│  📞 CONTACT                                                   │
│     [Votre nom]                                              │
│     [Votre email]                                            │
│     [Votre téléphone]                                        │
│                                                               │
│  💡 PROCHAINE ÉTAPE                                           │
│     Rendez-vous de suivi dans 2 semaines                     │
│     → Démonstration des améliorations                        │
│     → Calcul personnalisé de votre ROI                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ RÉSUMÉ EN 1 PAGE (à imprimer et cocher)

### AVANT LA DÉMO
- [ ] Tests techniques (app, factures, dashboard)
- [ ] Matériel (laptop chargé, câbles)
- [ ] Documents (checklist, fiche récap, carnet)
- [ ] Préparation mentale (relire, répéter)

### PENDANT LA DÉMO (8 min)
- [ ] 0:00 - Introduction (30s)
- [ ] 0:30 - Page d'accueil (1 min)
- [ ] 1:30 - Vérifier une facture (2 min)
- [ ] 3:30 - Résultats (2 min)
- [ ] 5:30 - Retour dashboard (1 min)
- [ ] 6:30 - Explication valeur (1m30)
- [ ] 8:00 - Conclusion & questions

### APRÈS LA DÉMO
- [ ] Noter tous les retours
- [ ] Poser questions ouvertes
- [ ] Proposer suivi dans 2 semaines
- [ ] Laisser fiche récap
- [ ] Envoyer email de remerciement (24h)

---

## 🎓 CONSEILS BONUS

### ✅ DO (À FAIRE)
- ✅ Parler lentement et clairement
- ✅ Laisser des pauses pour que la personne observe
- ✅ Demander régulièrement "C'est clair ?" ou "Vous voyez ?"
- ✅ Sourire et regarder la personne (pas que l'écran)
- ✅ Encourager les questions
- ✅ Dire "Je ne sais pas, mais je vais me renseigner" si besoin
- ✅ Être honnête sur les limitations du prototype
- ✅ Montrer votre passion pour le projet

### ❌ DON'T (À ÉVITER)
- ❌ Parler trop vite (respire !)
- ❌ Utiliser trop de jargon technique ("API REST", "SQLAlchemy", etc.)
- ❌ Critiquer les logiciels existants ou les grossistes
- ❌ Promettre des fonctionnalités non développées
- ❌ Paniquer si ça plante (c'est un prototype, c'est normal)
- ❌ Lire un script (sois naturel)
- ❌ Monopoliser la parole (écoute les retours)

---

## 🏆 CITATIONS À RETENIR

### Pour l'intro
> "60% des factures ont des erreurs de calcul. On parle de 1 500 à 3 000 euros par mois qu'une pharmacie pourrait récupérer."

### Pour la valeur
> "Le système connaît vos accords et vérifie systématiquement, sans jamais oublier."

### Pour Factur-X
> "Dès septembre 2026, avec les factures électroniques obligatoires, tout sera 100% automatique."

### Pour le ROI
> "Si vous récupérez 2 000 euros par mois, même avec 149 euros d'abonnement, vous gagnez 22 000 euros net par an."

### Pour rassurer
> "C'est un prototype, mais l'important c'est la logique de vérification. Elle fonctionne."

---

<div align="center">

**Vous allez assurer ! 💪**

**N'oubliez pas : respire, souris, et crois en ton projet.**

</div>

---

**Version de la checklist :** 1.0  
**Dernière mise à jour :** 8 février 2026  
**Durée de démo recommandée :** 8 minutes + questions
