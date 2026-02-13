"""
PharmaVerif Backend - Routes Historique des Prix
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/api/routes/historique_prix.py
Endpoints pour l'historique des prix, comparaison fournisseurs,
top produits, alertes prix et economies potentielles.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, extract, distinct
from datetime import datetime, date, timedelta
from typing import List, Optional

from app.schemas_labo import (
    HistoriquePrixResponse,
    HistoriquePrixListResponse,
    ComparaisonFournisseurItem,
    ComparaisonProduitResponse,
    TopProduitItem,
    TopProduitsResponse,
    AlertePrixItem,
    AlertesPrixResponse,
    EconomiePotentielleItem,
    EconomiesPotentiellesResponse,
)
from app.database import get_db
from app.models import User
from app.models_labo import (
    Laboratoire, AccordCommercial, FactureLabo, LigneFactureLabo,
    HistoriquePrix,
)
from app.api.routes.auth import get_current_user, get_current_pharmacy_id

router = APIRouter()


# ========================================
# HELPERS
# ========================================

def _build_historique_response(hp: HistoriquePrix, labo_nom: str = None) -> dict:
    """Construire la reponse historique prix avec le nom du labo."""
    return {
        "id": hp.id,
        "cip13": hp.cip13,
        "designation": hp.designation,
        "laboratoire_id": hp.laboratoire_id,
        "date_facture": hp.date_facture,
        "facture_labo_id": hp.facture_labo_id,
        "prix_unitaire_brut": hp.prix_unitaire_brut,
        "remise_pct": hp.remise_pct,
        "prix_unitaire_net": hp.prix_unitaire_net,
        "quantite": hp.quantite,
        "cout_net_reel": hp.cout_net_reel,
        "tranche": hp.tranche,
        "taux_tva": hp.taux_tva,
        "created_at": hp.created_at,
        "laboratoire_nom": labo_nom or (hp.laboratoire.nom if hp.laboratoire else None),
    }


# ========================================
# GET /historique/{cip13} - Evolution prix d'un produit
# ========================================

@router.get("/historique/{cip13}", response_model=HistoriquePrixListResponse)
async def get_historique_prix(
    cip13: str,
    laboratoire_id: Optional[int] = Query(None, description="Filtrer par laboratoire"),
    date_debut: Optional[date] = Query(None, description="Date de debut"),
    date_fin: Optional[date] = Query(None, description="Date de fin"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Historique des prix pour un produit (CIP13)

    Retourne l'evolution du prix dans le temps, avec :
    - Prix brut, net, cout net reel pour chaque achat
    - Statistiques min/max/moyenne
    - Filtrage par laboratoire et periode
    """
    query = db.query(HistoriquePrix).filter(
        HistoriquePrix.cip13 == cip13,
        HistoriquePrix.pharmacy_id == pharmacy_id
    )

    if laboratoire_id:
        query = query.filter(HistoriquePrix.laboratoire_id == laboratoire_id)

    if date_debut:
        query = query.filter(HistoriquePrix.date_facture >= date_debut)

    if date_fin:
        query = query.filter(HistoriquePrix.date_facture <= date_fin)

    entries = query.order_by(asc(HistoriquePrix.date_facture)).all()

    if not entries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aucun historique prix trouve pour CIP13 {cip13}"
        )

    # Statistiques
    prix_nets = [e.prix_unitaire_net for e in entries]
    designation = entries[0].designation

    # Charger les noms de labos
    labo_ids = set(e.laboratoire_id for e in entries)
    labos = {l.id: l.nom for l in db.query(Laboratoire).filter(
        Laboratoire.id.in_(labo_ids),
        Laboratoire.pharmacy_id == pharmacy_id
    ).all()}

    historique_list = []
    for e in entries:
        resp = _build_historique_response(e, labos.get(e.laboratoire_id))
        historique_list.append(HistoriquePrixResponse(**resp))

    return HistoriquePrixListResponse(
        cip13=cip13,
        designation=designation,
        nb_enregistrements=len(entries),
        prix_min=round(min(prix_nets), 4),
        prix_max=round(max(prix_nets), 4),
        prix_moyen=round(sum(prix_nets) / len(prix_nets), 4),
        derniere_date=entries[-1].date_facture,
        historique=historique_list,
    )


# ========================================
# GET /comparaison - Comparaison multi-fournisseurs
# ========================================

@router.get("/comparaison", response_model=ComparaisonProduitResponse)
async def get_comparaison_fournisseurs(
    cip13: str = Query(..., description="Code CIP13 du produit"),
    annee: Optional[int] = Query(None, description="Annee (defaut: toutes)"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Comparaison multi-fournisseurs pour un produit

    Pour chaque fournisseur ayant vendu ce produit :
    - Dernier prix (brut, net, cout net reel)
    - Nombre d'achats et quantite totale
    - Evolution du prix
    - Identification du meilleur prix
    """
    query = db.query(HistoriquePrix).filter(
        HistoriquePrix.cip13 == cip13,
        HistoriquePrix.pharmacy_id == pharmacy_id
    )

    if annee:
        query = query.filter(extract("year", HistoriquePrix.date_facture) == annee)

    entries = query.order_by(asc(HistoriquePrix.date_facture)).all()

    if not entries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aucune donnee trouvee pour CIP13 {cip13}"
        )

    designation = entries[0].designation

    # Grouper par laboratoire
    labo_data = {}
    for e in entries:
        if e.laboratoire_id not in labo_data:
            labo_data[e.laboratoire_id] = []
        labo_data[e.laboratoire_id].append(e)

    # Charger les noms
    labo_ids = list(labo_data.keys())
    labos = {l.id: l.nom for l in db.query(Laboratoire).filter(
        Laboratoire.id.in_(labo_ids),
        Laboratoire.pharmacy_id == pharmacy_id
    ).all()}

    fournisseurs = []
    for labo_id, labo_entries in labo_data.items():
        dernier = labo_entries[-1]
        nb_achats = len(labo_entries)
        quantite_totale = sum(e.quantite for e in labo_entries)
        montant_total = round(sum(e.prix_unitaire_net * e.quantite for e in labo_entries), 2)

        # Evolution prix : comparer dernier vs avant-dernier
        evolution_pct = None
        if len(labo_entries) >= 2:
            avant_dernier = labo_entries[-2]
            if avant_dernier.prix_unitaire_net > 0:
                evolution_pct = round(
                    (dernier.prix_unitaire_net - avant_dernier.prix_unitaire_net) /
                    avant_dernier.prix_unitaire_net * 100, 2
                )

        fournisseurs.append(ComparaisonFournisseurItem(
            laboratoire_id=labo_id,
            laboratoire_nom=labos.get(labo_id, f"Labo #{labo_id}"),
            dernier_prix_brut=dernier.prix_unitaire_brut,
            dernier_prix_net=dernier.prix_unitaire_net,
            cout_net_reel=dernier.cout_net_reel,
            remise_pct=dernier.remise_pct,
            derniere_date=dernier.date_facture,
            nb_achats=nb_achats,
            quantite_totale=quantite_totale,
            montant_total_ht=montant_total,
            evolution_pct=evolution_pct,
        ))

    # Trier par prix net croissant (meilleur en premier)
    fournisseurs.sort(key=lambda f: f.dernier_prix_net)

    meilleur_prix = fournisseurs[0].dernier_prix_net if fournisseurs else None
    meilleur_fournisseur = fournisseurs[0].laboratoire_nom if fournisseurs else None

    # Ecart max entre meilleur et pire prix
    ecart_max_pct = None
    if len(fournisseurs) >= 2 and meilleur_prix and meilleur_prix > 0:
        pire_prix = fournisseurs[-1].dernier_prix_net
        ecart_max_pct = round((pire_prix - meilleur_prix) / meilleur_prix * 100, 2)

    return ComparaisonProduitResponse(
        cip13=cip13,
        designation=designation,
        nb_fournisseurs=len(fournisseurs),
        meilleur_prix_net=meilleur_prix,
        meilleur_fournisseur=meilleur_fournisseur,
        ecart_max_pct=ecart_max_pct,
        fournisseurs=fournisseurs,
    )


# ========================================
# GET /top-produits - Top produits par volume/montant
# ========================================

@router.get("/top-produits", response_model=TopProduitsResponse)
async def get_top_produits(
    critere: str = Query("montant", description="Critere de tri (montant, quantite)"),
    limit: int = Query(20, ge=1, le=100, description="Nombre de produits"),
    laboratoire_id: Optional[int] = Query(None, description="Filtrer par laboratoire"),
    annee: Optional[int] = Query(None, description="Annee (defaut: toutes)"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Top produits par montant ou quantite achetee

    Retourne les produits les plus achetes avec :
    - Quantite totale, montant total
    - Prix moyen net
    - Nombre de fournisseurs
    """
    query = db.query(
        HistoriquePrix.cip13,
        func.max(HistoriquePrix.designation).label("designation"),
        func.sum(HistoriquePrix.quantite).label("quantite_totale"),
        func.sum(HistoriquePrix.prix_unitaire_net * HistoriquePrix.quantite).label("montant_total_ht"),
        func.count(HistoriquePrix.id).label("nb_achats"),
        func.avg(HistoriquePrix.prix_unitaire_net).label("prix_moyen_net"),
        func.count(distinct(HistoriquePrix.laboratoire_id)).label("nb_fournisseurs"),
        func.max(HistoriquePrix.date_facture).label("derniere_date"),
    ).filter(
        HistoriquePrix.pharmacy_id == pharmacy_id
    ).group_by(HistoriquePrix.cip13)

    if laboratoire_id:
        query = query.filter(HistoriquePrix.laboratoire_id == laboratoire_id)

    if annee:
        query = query.filter(extract("year", HistoriquePrix.date_facture) == annee)

    # Tri
    if critere == "quantite":
        query = query.order_by(desc("quantite_totale"))
    else:
        query = query.order_by(desc("montant_total_ht"))

    results = query.limit(limit).all()

    produits = []
    for r in results:
        produits.append(TopProduitItem(
            cip13=r.cip13,
            designation=r.designation or "",
            quantite_totale=int(r.quantite_totale or 0),
            montant_total_ht=round(float(r.montant_total_ht or 0), 2),
            nb_achats=int(r.nb_achats or 0),
            prix_moyen_net=round(float(r.prix_moyen_net or 0), 4),
            nb_fournisseurs=int(r.nb_fournisseurs or 0),
            derniere_date=r.derniere_date,
        ))

    periode = f"Annee {annee}" if annee else "Toutes periodes"

    return TopProduitsResponse(
        critere=critere,
        periode=periode,
        produits=produits,
        total=len(produits),
    )


# ========================================
# GET /alertes - Alertes prix
# ========================================

@router.get("/alertes", response_model=AlertesPrixResponse)
async def get_alertes_prix(
    laboratoire_id: Optional[int] = Query(None, description="Filtrer par laboratoire"),
    seuil_hausse_pct: float = Query(5.0, description="Seuil de hausse en % (defaut: 5%)"),
    seuil_concurrent_pct: float = Query(10.0, description="Seuil concurrent moins cher en % (defaut: 10%)"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Alertes sur les changements de prix

    Detecte :
    - Hausse de prix > seuil (defaut 5%)
    - Concurrent propose un prix plus bas > seuil (defaut 10%)
    - Conditions commerciales expirant bientot
    """
    alertes = []

    # --- 1. Detecter les hausses de prix ---
    # Pour chaque CIP13 et labo, comparer le dernier prix avec le precedent
    cip_labos = db.query(
        HistoriquePrix.cip13,
        HistoriquePrix.laboratoire_id
    ).filter(
        HistoriquePrix.pharmacy_id == pharmacy_id
    ).group_by(
        HistoriquePrix.cip13,
        HistoriquePrix.laboratoire_id
    )

    if laboratoire_id:
        cip_labos = cip_labos.filter(HistoriquePrix.laboratoire_id == laboratoire_id)

    cip_labos = cip_labos.all()

    # Cache noms labos
    all_labo_ids = set(cl[1] for cl in cip_labos)
    labos = {l.id: l.nom for l in db.query(Laboratoire).filter(
        Laboratoire.id.in_(all_labo_ids),
        Laboratoire.pharmacy_id == pharmacy_id
    ).all()}

    for cip13, labo_id in cip_labos:
        # Recuperer les 2 derniers prix pour ce couple CIP/labo
        derniers = db.query(HistoriquePrix).filter(
            HistoriquePrix.cip13 == cip13,
            HistoriquePrix.laboratoire_id == labo_id,
            HistoriquePrix.pharmacy_id == pharmacy_id
        ).order_by(desc(HistoriquePrix.date_facture)).limit(2).all()

        if len(derniers) >= 2:
            dernier = derniers[0]
            precedent = derniers[1]

            if precedent.prix_unitaire_net > 0:
                hausse = (dernier.prix_unitaire_net - precedent.prix_unitaire_net) / precedent.prix_unitaire_net * 100

                if hausse > seuil_hausse_pct:
                    alertes.append(AlertePrixItem(
                        type_alerte="hausse_prix",
                        severite="critical" if hausse > seuil_hausse_pct * 2 else "warning",
                        cip13=cip13,
                        designation=dernier.designation,
                        laboratoire_id=labo_id,
                        laboratoire_nom=labos.get(labo_id, f"Labo #{labo_id}"),
                        description=f"Hausse de {hausse:.1f}% sur {dernier.designation} ({labos.get(labo_id, '')})",
                        prix_ancien=precedent.prix_unitaire_net,
                        prix_nouveau=dernier.prix_unitaire_net,
                        ecart_pct=round(hausse, 2),
                        date_detection=dernier.date_facture,
                    ))

    # --- 2. Concurrent moins cher ---
    # Pour chaque CIP acheté chez un labo, verifier si un autre labo le propose moins cher
    cip_multi = db.query(
        HistoriquePrix.cip13
    ).filter(
        HistoriquePrix.pharmacy_id == pharmacy_id
    ).group_by(
        HistoriquePrix.cip13
    ).having(
        func.count(distinct(HistoriquePrix.laboratoire_id)) > 1
    ).all()

    for (cip13,) in cip_multi:
        # Dernier prix de chaque labo pour ce CIP
        subq = db.query(
            HistoriquePrix.laboratoire_id,
            func.max(HistoriquePrix.date_facture).label("max_date")
        ).filter(
            HistoriquePrix.cip13 == cip13,
            HistoriquePrix.pharmacy_id == pharmacy_id
        ).group_by(HistoriquePrix.laboratoire_id).subquery()

        derniers_par_labo = db.query(HistoriquePrix).join(
            subq,
            (HistoriquePrix.laboratoire_id == subq.c.laboratoire_id) &
            (HistoriquePrix.date_facture == subq.c.max_date) &
            (HistoriquePrix.cip13 == cip13)
        ).all()

        if len(derniers_par_labo) < 2:
            continue

        # Trier par prix net
        derniers_par_labo.sort(key=lambda x: x.prix_unitaire_net)
        meilleur = derniers_par_labo[0]
        designation = meilleur.designation

        for hp in derniers_par_labo[1:]:
            if meilleur.prix_unitaire_net > 0:
                ecart = (hp.prix_unitaire_net - meilleur.prix_unitaire_net) / meilleur.prix_unitaire_net * 100

                if ecart > seuil_concurrent_pct:
                    # Si filtre labo_id, ne garder que les alertes du labo concerne
                    if laboratoire_id and hp.laboratoire_id != laboratoire_id:
                        continue

                    # Verifier que cette alerte n'existe pas deja (meme CIP + labo)
                    alerte_existe = any(
                        a.cip13 == cip13 and a.laboratoire_id == hp.laboratoire_id and a.type_alerte == "concurrent_moins_cher"
                        for a in alertes
                    )
                    if alerte_existe:
                        continue

                    economie = round((hp.prix_unitaire_net - meilleur.prix_unitaire_net) * hp.quantite, 2)

                    alertes.append(AlertePrixItem(
                        type_alerte="concurrent_moins_cher",
                        severite="warning",
                        cip13=cip13,
                        designation=designation,
                        laboratoire_id=hp.laboratoire_id,
                        laboratoire_nom=labos.get(hp.laboratoire_id, f"Labo #{hp.laboratoire_id}"),
                        description=f"{designation} : {labos.get(meilleur.laboratoire_id, '')} est {ecart:.1f}% moins cher que {labos.get(hp.laboratoire_id, '')}",
                        prix_ancien=hp.prix_unitaire_net,
                        prix_nouveau=meilleur.prix_unitaire_net,
                        ecart_pct=round(ecart, 2),
                        date_detection=hp.date_facture,
                        meilleur_prix_concurrent=meilleur.prix_unitaire_net,
                        concurrent_nom=labos.get(meilleur.laboratoire_id, f"Labo #{meilleur.laboratoire_id}"),
                        economie_potentielle=economie,
                    ))

    # --- 3. Conditions expirant bientot ---
    today = date.today()
    dans_30_jours = today + timedelta(days=30)

    accords_expirants = db.query(AccordCommercial).join(
        Laboratoire, AccordCommercial.laboratoire_id == Laboratoire.id
    ).filter(
        AccordCommercial.actif == True,
        AccordCommercial.date_fin != None,
        AccordCommercial.date_fin <= dans_30_jours,
        AccordCommercial.date_fin >= today,
        Laboratoire.pharmacy_id == pharmacy_id
    )

    if laboratoire_id:
        accords_expirants = accords_expirants.filter(AccordCommercial.laboratoire_id == laboratoire_id)

    for accord in accords_expirants.all():
        labo = db.query(Laboratoire).filter(
            Laboratoire.id == accord.laboratoire_id,
            Laboratoire.pharmacy_id == pharmacy_id
        ).first()
        labo_nom = labo.nom if labo else f"Labo #{accord.laboratoire_id}"
        jours_restants = (accord.date_fin - today).days

        alertes.append(AlertePrixItem(
            type_alerte="condition_expire",
            severite="warning" if jours_restants > 7 else "critical",
            cip13="",
            designation=f"Accord {accord.nom}",
            laboratoire_id=accord.laboratoire_id,
            laboratoire_nom=labo_nom,
            description=f"L'accord '{accord.nom}' avec {labo_nom} expire dans {jours_restants} jour(s) ({accord.date_fin})",
            date_detection=today,
        ))

    # Trier : critical en premier, puis warning, puis info
    severite_order = {"critical": 0, "warning": 1, "info": 2}
    alertes.sort(key=lambda a: severite_order.get(a.severite, 3))

    nb_critical = sum(1 for a in alertes if a.severite == "critical")
    nb_warning = sum(1 for a in alertes if a.severite == "warning")
    nb_info = sum(1 for a in alertes if a.severite == "info")

    return AlertesPrixResponse(
        nb_alertes=len(alertes),
        nb_critical=nb_critical,
        nb_warning=nb_warning,
        nb_info=nb_info,
        alertes=alertes,
    )


# ========================================
# GET /economies-potentielles - Economies
# ========================================

@router.get("/economies-potentielles", response_model=EconomiesPotentiellesResponse)
async def get_economies_potentielles(
    laboratoire_id: Optional[int] = Query(None, description="Fournisseur actuel a comparer"),
    annee: Optional[int] = Query(None, description="Annee pour calcul volume (defaut: en cours)"),
    seuil_ecart_pct: float = Query(5.0, description="Seuil ecart minimum en % (defaut: 5%)"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Calculer les economies potentielles en changeant de fournisseur

    Pour chaque produit achete chez le fournisseur actuel :
    - Compare avec le meilleur prix d'un concurrent
    - Calcule l'economie unitaire et annuelle (base volume annuel)
    - Filtre les ecarts > seuil (defaut 5%)
    """
    if annee is None:
        annee = datetime.now().year

    # Produits avec multi-fournisseurs
    cip_multi_query = db.query(
        HistoriquePrix.cip13
    ).filter(
        HistoriquePrix.pharmacy_id == pharmacy_id
    ).group_by(
        HistoriquePrix.cip13
    ).having(
        func.count(distinct(HistoriquePrix.laboratoire_id)) > 1
    )

    cip_multi = [r[0] for r in cip_multi_query.all()]

    if not cip_multi:
        return EconomiesPotentiellesResponse(
            nb_produits_optimisables=0,
            economie_totale_annuelle=0.0,
            economies=[],
        )

    # Cache noms labos
    all_labos = {l.id: l.nom for l in db.query(Laboratoire).filter(
        Laboratoire.pharmacy_id == pharmacy_id
    ).all()}

    economies = []

    for cip13 in cip_multi:
        # Dernier prix de chaque labo pour ce CIP
        subq = db.query(
            HistoriquePrix.laboratoire_id,
            func.max(HistoriquePrix.date_facture).label("max_date")
        ).filter(
            HistoriquePrix.cip13 == cip13,
            HistoriquePrix.pharmacy_id == pharmacy_id
        ).group_by(HistoriquePrix.laboratoire_id).subquery()

        derniers = db.query(HistoriquePrix).join(
            subq,
            (HistoriquePrix.laboratoire_id == subq.c.laboratoire_id) &
            (HistoriquePrix.date_facture == subq.c.max_date) &
            (HistoriquePrix.cip13 == cip13)
        ).all()

        if len(derniers) < 2:
            continue

        # Trier par prix net
        derniers.sort(key=lambda x: x.prix_unitaire_net)
        meilleur = derniers[0]

        for hp in derniers[1:]:
            # Si filtre labo_id, ne garder que ce labo comme "actuel"
            if laboratoire_id and hp.laboratoire_id != laboratoire_id:
                continue

            if meilleur.prix_unitaire_net > 0 and hp.prix_unitaire_net > 0:
                ecart_pct = (hp.prix_unitaire_net - meilleur.prix_unitaire_net) / hp.prix_unitaire_net * 100

                if ecart_pct >= seuil_ecart_pct:
                    # Volume annuel pour ce produit chez ce labo
                    qte_annuelle = db.query(
                        func.coalesce(func.sum(HistoriquePrix.quantite), 0)
                    ).filter(
                        HistoriquePrix.cip13 == cip13,
                        HistoriquePrix.laboratoire_id == hp.laboratoire_id,
                        HistoriquePrix.pharmacy_id == pharmacy_id,
                        extract("year", HistoriquePrix.date_facture) == annee
                    ).scalar() or 0

                    if qte_annuelle == 0:
                        # Pas d'achats cette annee, estimer sur l'annee precedente
                        qte_annuelle = db.query(
                            func.coalesce(func.sum(HistoriquePrix.quantite), 0)
                        ).filter(
                            HistoriquePrix.cip13 == cip13,
                            HistoriquePrix.laboratoire_id == hp.laboratoire_id,
                            HistoriquePrix.pharmacy_id == pharmacy_id,
                            extract("year", HistoriquePrix.date_facture) == annee - 1
                        ).scalar() or 0

                    ecart_unitaire = round(hp.prix_unitaire_net - meilleur.prix_unitaire_net, 4)
                    economie_annuelle = round(ecart_unitaire * qte_annuelle, 2)

                    economies.append(EconomiePotentielleItem(
                        cip13=cip13,
                        designation=hp.designation,
                        fournisseur_actuel=all_labos.get(hp.laboratoire_id, f"Labo #{hp.laboratoire_id}"),
                        prix_actuel_net=hp.prix_unitaire_net,
                        meilleur_fournisseur=all_labos.get(meilleur.laboratoire_id, f"Labo #{meilleur.laboratoire_id}"),
                        meilleur_prix_net=meilleur.prix_unitaire_net,
                        ecart_unitaire=ecart_unitaire,
                        ecart_pct=round(ecart_pct, 2),
                        quantite_annuelle=int(qte_annuelle),
                        economie_annuelle=economie_annuelle,
                    ))

    # Trier par economie annuelle decroissante
    economies.sort(key=lambda e: e.economie_annuelle, reverse=True)

    economie_totale = round(sum(e.economie_annuelle for e in economies), 2)

    return EconomiesPotentiellesResponse(
        nb_produits_optimisables=len(economies),
        economie_totale_annuelle=economie_totale,
        economies=economies,
    )


# ========================================
# GET /recherche - Recherche produits dans l'historique
# ========================================

@router.get("/recherche")
async def recherche_produits(
    q: str = Query(..., min_length=2, description="Terme de recherche (CIP13 ou designation)"),
    limit: int = Query(20, ge=1, le=100, description="Nombre max de resultats"),
    current_user: User = Depends(get_current_user),
    pharmacy_id: int = Depends(get_current_pharmacy_id),
    db: Session = Depends(get_db)
):
    """
    Rechercher des produits dans l'historique des prix

    Recherche par CIP13 (exact ou partiel) ou par designation (partiel).
    Retourne les produits uniques avec leur dernier prix.
    """
    results = db.query(
        HistoriquePrix.cip13,
        func.max(HistoriquePrix.designation).label("designation"),
        func.count(HistoriquePrix.id).label("nb_achats"),
        func.max(HistoriquePrix.date_facture).label("derniere_date"),
        func.avg(HistoriquePrix.prix_unitaire_net).label("prix_moyen"),
        func.count(distinct(HistoriquePrix.laboratoire_id)).label("nb_fournisseurs"),
    ).filter(
        HistoriquePrix.pharmacy_id == pharmacy_id,
        (HistoriquePrix.cip13.ilike(f"%{q}%")) |
        (HistoriquePrix.designation.ilike(f"%{q}%"))
    ).group_by(
        HistoriquePrix.cip13
    ).order_by(
        desc("nb_achats")
    ).limit(limit).all()

    return {
        "query": q,
        "nb_resultats": len(results),
        "produits": [
            {
                "cip13": r.cip13,
                "designation": r.designation,
                "nb_achats": r.nb_achats,
                "derniere_date": r.derniere_date,
                "prix_moyen": round(float(r.prix_moyen or 0), 4),
                "nb_fournisseurs": r.nb_fournisseurs,
            }
            for r in results
        ],
    }
