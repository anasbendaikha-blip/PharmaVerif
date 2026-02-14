"""
PharmaVerif - Modeles de donnees normalises pour les parsers
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Format de sortie commun a tous les parsers, independant du fournisseur.
Chaque parser specifique produit ces structures normalisees.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict


# ========================================
# FOURNISSEUR
# ========================================

@dataclass
class FournisseurInfo:
    """Informations sur le fournisseur detecte."""
    nom: str                          # Ex: "Biogaran", "Teva Sante"
    type: str = "laboratoire"         # "laboratoire", "grossiste", "inconnu"
    detecte_auto: bool = True         # True si detecte automatiquement
    parser_id: str = "generic"        # ID du parser utilise
    confiance: float = 1.0            # Score de confiance 0.0 - 1.0


# ========================================
# LIGNE DE FACTURE (normalisee)
# ========================================

@dataclass
class LigneFacture:
    """
    Une ligne de produit normalisee.
    Tous les parsers produisent ce format identique.
    """
    # Identification produit
    cip13: str = ""
    designation: str = ""
    numero_lot: str = ""

    # Quantites et prix
    quantite: int = 0
    prix_unitaire_ht: float = 0.0
    remise_pct: float = 0.0
    prix_unitaire_apres_remise: float = 0.0
    montant_ht: float = 0.0
    taux_tva: float = 0.0

    # Calcules
    montant_brut: float = 0.0         # quantite * prix_unitaire_ht
    montant_remise: float = 0.0       # montant_brut - montant_ht

    # Classification
    categorie: str = ""               # REMBOURSABLE_STANDARD, REMBOURSABLE_FAIBLE_MARGE, NON_REMBOURSABLE
    tranche: str = ""                 # A, B, OTC

    def __post_init__(self):
        """Calcule les champs derives si non fournis."""
        if self.montant_brut == 0.0 and self.quantite > 0 and self.prix_unitaire_ht > 0:
            self.montant_brut = round(self.quantite * self.prix_unitaire_ht, 2)
        if self.montant_remise == 0.0 and self.montant_brut > 0 and self.montant_ht > 0:
            self.montant_remise = round(self.montant_brut - self.montant_ht, 2)
        if not self.categorie and not self.tranche:
            self._classify()

    def _classify(self):
        """Classification par defaut basee sur TVA + remise.

        Utilise une tolerance de 0.01 pour la comparaison float du taux TVA
        afin d'eviter les erreurs d'arrondi IEEE 754 (ex: 2.0999999... != 2.10).
        """
        if abs(self.taux_tva - 2.10) < 0.01:
            if self.remise_pct <= 2.50:
                self.categorie = "REMBOURSABLE_FAIBLE_MARGE"
                self.tranche = "B"
            else:
                self.categorie = "REMBOURSABLE_STANDARD"
                self.tranche = "A"
        elif self.taux_tva > 0:
            self.categorie = "NON_REMBOURSABLE"
            self.tranche = "OTC"


# ========================================
# ANALYSE PAR TRANCHE
# ========================================

@dataclass
class TrancheAnalyse:
    """Analyse d'une tranche (A, B, OTC)."""
    tranche: str = ""                 # "A", "B", "OTC"
    montant_brut: float = 0.0
    montant_remise: float = 0.0
    montant_net: float = 0.0
    nb_lignes: int = 0
    pct_du_total: float = 0.0        # % du CA total
    taux_remise_moyen: float = 0.0    # % remise moyen
    taux_remise_cible: float = 0.0    # % cible accord commercial
    rfa_attendue: float = 0.0


# ========================================
# TOTAUX FACTURE
# ========================================

@dataclass
class TvaDetail:
    """Detail TVA par taux."""
    taux: float = 0.0
    base_ht: float = 0.0
    montant_tva: float = 0.0


@dataclass
class TotauxFacture:
    """Totaux globaux de la facture."""
    brut_ht: float = 0.0
    remises: float = 0.0
    net_ht: float = 0.0
    tva: List[TvaDetail] = field(default_factory=list)
    ttc: Optional[float] = None
    total_tva: Optional[float] = None
    rfa_attendue: float = 0.0


# ========================================
# WARNING
# ========================================

@dataclass
class WarningInfo:
    """Avertissement structure."""
    type: str = "info"                # "info", "warning", "error", "alignment"
    message: str = ""
    page: Optional[int] = None
    ligne: Optional[int] = None


# ========================================
# METADONNEES FACTURE
# ========================================

@dataclass
class MetadonneeFacture:
    """Metadonnees extraites de l'en-tete."""
    numero_facture: str = ""
    date_facture: str = ""
    date_commande: str = ""
    date_livraison: str = ""
    ref_commande: str = ""
    numero_livraison: str = ""
    numero_client: str = ""
    nom_client: str = ""
    adresse_client: str = ""
    tva_client: str = ""
    mode_paiement: str = ""
    delai_paiement: str = ""
    date_exigibilite: str = ""
    page_count: int = 0


# ========================================
# RESULTAT NORMALISE (sortie de tout parser)
# ========================================

@dataclass
class ParsedInvoice:
    """
    Resultat normalise du parsing d'une facture.
    Format commun a tous les parsers.
    """
    # Fournisseur detecte
    fournisseur: FournisseurInfo = field(default_factory=lambda: FournisseurInfo(nom="Inconnu"))

    # Metadonnees
    metadata: MetadonneeFacture = field(default_factory=MetadonneeFacture)

    # Lignes de produits
    lignes: List[LigneFacture] = field(default_factory=list)

    # Analyse par tranche
    tranches: Dict[str, TrancheAnalyse] = field(default_factory=dict)

    # Totaux
    totaux: TotauxFacture = field(default_factory=TotauxFacture)

    # Avertissements
    warnings: List[WarningInfo] = field(default_factory=list)

    # Sections detectees (specifique au format)
    sections: Dict[str, list] = field(default_factory=dict)

    @property
    def warning_messages(self) -> List[str]:
        """Retourne les messages de warning en liste simple."""
        return [w.message for w in self.warnings]

    @property
    def nb_lignes(self) -> int:
        return len(self.lignes)

    def compute_totaux(self):
        """Recalcule les totaux depuis les lignes."""
        if not self.lignes:
            return

        self.totaux.brut_ht = round(sum(l.montant_brut for l in self.lignes), 2)
        self.totaux.remises = round(sum(l.montant_remise for l in self.lignes), 2)
        self.totaux.net_ht = round(sum(l.montant_ht for l in self.lignes), 2)

        # TVA par taux
        tva_map: Dict[float, float] = {}
        for l in self.lignes:
            tva_map[l.taux_tva] = tva_map.get(l.taux_tva, 0.0) + l.montant_ht
        self.totaux.tva = [
            TvaDetail(taux=taux, base_ht=round(base, 2), montant_tva=round(base * taux / 100, 2))
            for taux, base in sorted(tva_map.items())
        ]
        self.totaux.total_tva = round(sum(t.montant_tva for t in self.totaux.tva), 2)

    def compute_tranches(self, cible_a: float = 57.0, cible_b: float = 27.5, cible_otc: float = 0.0):
        """Calcule l'analyse par tranche depuis les lignes."""
        groups: Dict[str, List[LigneFacture]] = {"A": [], "B": [], "OTC": []}
        for l in self.lignes:
            if l.tranche in groups:
                groups[l.tranche].append(l)

        total_brut = sum(l.montant_brut for l in self.lignes) or 1.0
        cibles = {"A": cible_a, "B": cible_b, "OTC": cible_otc}
        rfa_totale = 0.0

        for tranche_name, lines in groups.items():
            if not lines:
                continue
            brut = round(sum(l.montant_brut for l in lines), 2)
            remise = round(sum(l.montant_remise for l in lines), 2)
            net = round(sum(l.montant_ht for l in lines), 2)
            cible = cibles[tranche_name]
            taux_moyen = round(remise / brut * 100, 2) if brut > 0 else 0.0

            rfa = 0.0
            if tranche_name != "OTC" and brut > 0 and cible > 0:
                rfa = round(max(0.0, brut * cible / 100 - remise), 2)
                rfa_totale += rfa

            self.tranches[tranche_name] = TrancheAnalyse(
                tranche=tranche_name,
                montant_brut=brut,
                montant_remise=remise,
                montant_net=net,
                nb_lignes=len(lines),
                pct_du_total=round(brut / total_brut * 100, 1),
                taux_remise_moyen=taux_moyen,
                taux_remise_cible=cible,
                rfa_attendue=rfa,
            )

        self.totaux.rfa_attendue = round(rfa_totale, 2)
