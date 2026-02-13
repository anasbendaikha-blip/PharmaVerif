"""
PharmaVerif - Generateur de rapports PDF professionnels
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Fichier : backend/app/services/pdf_generator.py

4 types de rapports :
  1. Synthese de verification par facture
  2. Rapport mensuel par fournisseur (laboratoire)
  3. Reclamation fournisseur (courrier professionnel)
  4. Rapport EMAC (triangle de verification)

Librairie : reportlab
Design : A4, Helvetica, couleurs PharmaVerif
"""

import io
import logging
from datetime import datetime, date
from typing import List, Optional, Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable,
)
from reportlab.platypus.flowables import Flowable

logger = logging.getLogger(__name__)

# ========================================
# COULEURS PHARMAVERIF
# ========================================

BLEU = HexColor("#2563EB")
BLEU_CLAIR = HexColor("#DBEAFE")
BLEU_FONCE = HexColor("#1E40AF")
VERT = HexColor("#10B981")
VERT_CLAIR = HexColor("#D1FAE5")
ROUGE = HexColor("#EF4444")
ROUGE_CLAIR = HexColor("#FEE2E2")
ORANGE = HexColor("#F59E0B")
ORANGE_CLAIR = HexColor("#FEF3C7")
GRIS = HexColor("#6B7280")
GRIS_CLAIR = HexColor("#F3F4F6")
GRIS_FONCE = HexColor("#374151")
BLANC = white
NOIR = black


# ========================================
# STYLES
# ========================================

def _get_styles() -> dict:
    """Retourne les styles personnalises PharmaVerif."""
    styles = getSampleStyleSheet()

    custom = {
        "title": ParagraphStyle(
            "PVTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=18,
            textColor=BLEU_FONCE,
            spaceAfter=6 * mm,
            alignment=TA_LEFT,
        ),
        "subtitle": ParagraphStyle(
            "PVSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            textColor=GRIS,
            spaceAfter=4 * mm,
        ),
        "heading": ParagraphStyle(
            "PVHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            textColor=BLEU,
            spaceBefore=6 * mm,
            spaceAfter=3 * mm,
        ),
        "body": ParagraphStyle(
            "PVBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=GRIS_FONCE,
            leading=14,
        ),
        "body_bold": ParagraphStyle(
            "PVBodyBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=GRIS_FONCE,
            leading=14,
        ),
        "small": ParagraphStyle(
            "PVSmall",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=GRIS,
            leading=10,
        ),
        "footer": ParagraphStyle(
            "PVFooter",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7,
            textColor=GRIS,
            alignment=TA_CENTER,
        ),
        "amount": ParagraphStyle(
            "PVAmount",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=GRIS_FONCE,
            alignment=TA_RIGHT,
        ),
        "amount_green": ParagraphStyle(
            "PVAmountGreen",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=VERT,
            alignment=TA_RIGHT,
        ),
        "amount_red": ParagraphStyle(
            "PVAmountRed",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=ROUGE,
            alignment=TA_RIGHT,
        ),
        "letter_body": ParagraphStyle(
            "PVLetterBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=NOIR,
            leading=16,
            alignment=TA_JUSTIFY,
            spaceBefore=2 * mm,
            spaceAfter=2 * mm,
        ),
    }
    return custom


# ========================================
# HELPERS
# ========================================

def _fmt_currency(amount: Optional[float]) -> str:
    """Format montant en EUR francais."""
    if amount is None:
        return "-"
    return f"{amount:,.2f} EUR".replace(",", " ").replace(".", ",").replace(" ", " ")


def _fmt_date(d: Optional[Any]) -> str:
    """Format date en francais."""
    if d is None:
        return "-"
    if isinstance(d, str):
        try:
            d = datetime.fromisoformat(d).date() if "T" in d else date.fromisoformat(d)
        except ValueError:
            return d
    if isinstance(d, datetime):
        d = d.date()
    if isinstance(d, date):
        mois = [
            "", "janvier", "fevrier", "mars", "avril", "mai", "juin",
            "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
        ]
        return f"{d.day} {mois[d.month]} {d.year}"
    return str(d)


def _fmt_pct(val: Optional[float]) -> str:
    """Format pourcentage."""
    if val is None:
        return "-"
    return f"{val:+.1f}%"


def _severity_label(severite: str) -> str:
    """Label de severite."""
    mapping = {
        "critical": "CRITIQUE",
        "warning": "ALERTE",
        "opportunity": "OPPORTUNITE",
        "info": "INFO",
    }
    return mapping.get(severite, severite.upper())


def _severity_color(severite: str) -> HexColor:
    """Couleur par severite."""
    mapping = {
        "critical": ROUGE,
        "warning": ORANGE,
        "opportunity": BLEU,
        "info": GRIS,
    }
    return mapping.get(severite, GRIS)


def _severity_bg_color(severite: str) -> HexColor:
    """Couleur de fond par severite."""
    mapping = {
        "critical": ROUGE_CLAIR,
        "warning": ORANGE_CLAIR,
        "opportunity": BLEU_CLAIR,
        "info": GRIS_CLAIR,
    }
    return mapping.get(severite, GRIS_CLAIR)


def _build_table(
    data: List[List[Any]],
    col_widths: Optional[List[float]] = None,
    has_header: bool = True,
    zebra: bool = True,
) -> Table:
    """Construit un tableau stylise PharmaVerif."""
    table = Table(data, colWidths=col_widths, repeatRows=1 if has_header else 0)

    style_cmds = [
        # Bordures
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        # Padding
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # Police
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (-1, -1), GRIS_FONCE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]

    if has_header and len(data) > 0:
        style_cmds.extend([
            ("BACKGROUND", (0, 0), (-1, 0), BLEU),
            ("TEXTCOLOR", (0, 0), (-1, 0), BLANC),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
        ])

    if zebra:
        start_row = 1 if has_header else 0
        for i in range(start_row, len(data)):
            if (i - start_row) % 2 == 1:
                style_cmds.append(
                    ("BACKGROUND", (0, i), (-1, i), GRIS_CLAIR)
                )

    table.setStyle(TableStyle(style_cmds))
    return table


class PharmaVerifHeader(Flowable):
    """En-tete PharmaVerif avec logo texte."""

    def __init__(self, width: float = 17 * cm):
        super().__init__()
        self.width = width
        self.height = 2.5 * cm

    def draw(self):
        c = self.canv

        # Rectangle bleu en fond
        c.setFillColor(BLEU)
        c.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=0)

        # Logo texte
        c.setFillColor(BLANC)
        c.setFont("Helvetica-Bold", 20)
        c.drawString(15, self.height - 20, "PharmaVerif")

        # Sous-titre
        c.setFont("Helvetica", 9)
        c.drawString(15, self.height - 35, "Verification de factures pharmaceutiques")

        # Date a droite
        c.setFont("Helvetica", 8)
        now = datetime.now().strftime("%d/%m/%Y %H:%M")
        c.drawRightString(self.width - 15, self.height - 20, f"Genere le {now}")

        # Copyright
        c.setFont("Helvetica", 7)
        c.drawRightString(self.width - 15, self.height - 35, "Anas BENDAIKHA")


def _add_footer(canvas, doc):
    """Footer sur chaque page."""
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GRIS)
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    footer_text = f"Document genere par PharmaVerif — {now} — Confidentiel"
    canvas.drawCentredString(A4[0] / 2, 1.2 * cm, footer_text)
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


# ========================================
# RAPPORT 1 : SYNTHESE VERIFICATION FACTURE
# ========================================

def generate_facture_verification_pdf(
    facture: dict,
    lignes: List[dict],
    anomalies: List[dict],
    laboratoire_nom: str,
    accord_nom: Optional[str] = None,
) -> io.BytesIO:
    """
    Genere le rapport de synthese de verification d'une facture labo.

    Contenu :
    - En-tete PharmaVerif
    - Infos facture (numero, date, fournisseur, montants)
    - Tableau des lignes detaillees
    - Resultat des verifications (anomalies / conformes)
    - Montant a recuperer
    - Pied de page mentions legales
    """
    buffer = io.BytesIO()
    styles = _get_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2.5 * cm,
    )

    elements = []

    # En-tete
    elements.append(PharmaVerifHeader())
    elements.append(Spacer(1, 8 * mm))

    # Titre
    elements.append(Paragraph("Synthese de verification", styles["title"]))
    elements.append(Paragraph(
        f"Facture {facture.get('numero_facture', 'N/A')} — {laboratoire_nom}",
        styles["subtitle"],
    ))

    # Infos facture
    elements.append(Paragraph("Informations facture", styles["heading"]))

    info_data = [
        ["Numero facture", facture.get("numero_facture", "N/A"),
         "Date facture", _fmt_date(facture.get("date_facture"))],
        ["Laboratoire", laboratoire_nom,
         "Accord", accord_nom or "Aucun"],
        ["Montant brut HT", _fmt_currency(facture.get("montant_brut_ht")),
         "Remises", _fmt_currency(facture.get("total_remise_facture"))],
        ["Montant net HT", _fmt_currency(facture.get("montant_net_ht")),
         "Montant TTC", _fmt_currency(facture.get("montant_ttc"))],
        ["Lignes", str(facture.get("nb_lignes", 0)),
         "Statut", (facture.get("statut", "N/A")).upper()],
    ]

    info_table_data = []
    for row in info_data:
        formatted = []
        for i, cell in enumerate(row):
            if i % 2 == 0:
                formatted.append(Paragraph(f"<b>{cell}</b>", styles["small"]))
            else:
                formatted.append(Paragraph(str(cell), styles["body"]))
        info_table_data.append(formatted)

    info_table = Table(info_table_data, colWidths=[3.5 * cm, 5 * cm, 3.5 * cm, 5 * cm])
    info_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("BACKGROUND", (0, 0), (0, -1), GRIS_CLAIR),
        ("BACKGROUND", (2, 0), (2, -1), GRIS_CLAIR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    # Analyse par tranche
    elements.append(Paragraph("Analyse par tranche", styles["heading"]))

    tranche_data = [["Tranche", "Brut HT", "Remise", "Taux reel", "% CA"]]
    for tranche_name, brut_key, remise_key, pct_key in [
        ("A - Remboursable standard", "tranche_a_brut", "tranche_a_remise", "tranche_a_pct_reel"),
        ("B - Remboursable faible marge", "tranche_b_brut", "tranche_b_remise", "tranche_b_pct_reel"),
        ("OTC - Non remboursable", "otc_brut", "otc_remise", None),
    ]:
        brut = facture.get(brut_key, 0.0) or 0.0
        remise = facture.get(remise_key, 0.0) or 0.0
        taux = f"{remise / brut * 100:.1f}%" if brut > 0 else "-"
        pct_ca = f"{facture.get(pct_key, 0.0) or 0.0:.1f}%" if pct_key else "-"
        tranche_data.append([
            tranche_name,
            _fmt_currency(brut),
            _fmt_currency(remise),
            taux,
            pct_ca,
        ])

    # Total
    tranche_data.append([
        "TOTAL",
        _fmt_currency(facture.get("montant_brut_ht")),
        _fmt_currency(facture.get("total_remise_facture")),
        f"{facture.get('total_remise_facture', 0.0) / max(facture.get('montant_brut_ht', 1.0), 0.01) * 100:.1f}%",
        "100%",
    ])

    elements.append(_build_table(tranche_data, col_widths=[6 * cm, 3 * cm, 3 * cm, 2.5 * cm, 2.5 * cm]))
    elements.append(Spacer(1, 6 * mm))

    # Lignes detaillees (max 50 lignes)
    if lignes:
        elements.append(Paragraph("Lignes de facture", styles["heading"]))
        lignes_data = [["CIP13", "Designation", "Qte", "PU HT", "Remise%", "Montant HT", "Tranche"]]
        for l in lignes[:50]:
            lignes_data.append([
                l.get("cip13", ""),
                Paragraph(l.get("designation", "")[:40], styles["small"]),
                str(l.get("quantite", 0)),
                _fmt_currency(l.get("prix_unitaire_ht")),
                f"{l.get('remise_pct', 0.0):.1f}%",
                _fmt_currency(l.get("montant_ht")),
                l.get("tranche", "-"),
            ])
        if len(lignes) > 50:
            lignes_data.append(["", f"... et {len(lignes) - 50} autres lignes", "", "", "", "", ""])

        elements.append(_build_table(
            lignes_data,
            col_widths=[2 * cm, 5 * cm, 1.2 * cm, 2.2 * cm, 1.5 * cm, 2.5 * cm, 1.5 * cm],
        ))
        elements.append(Spacer(1, 6 * mm))

    # Anomalies
    elements.append(Paragraph("Resultat des verifications", styles["heading"]))

    if not anomalies:
        elements.append(Paragraph(
            "Aucune anomalie detectee. Facture conforme.",
            styles["body"],
        ))
    else:
        nb_crit = sum(1 for a in anomalies if a.get("severite") == "critical")
        nb_opp = sum(1 for a in anomalies if a.get("severite") == "opportunity")
        nb_info = sum(1 for a in anomalies if a.get("severite") == "info")
        montant_total = sum(a.get("montant_ecart", 0.0) or 0.0 for a in anomalies)

        summary = (
            f"{len(anomalies)} anomalie(s) detectee(s) : "
            f"{nb_crit} critique(s), {nb_opp} opportunite(s), {nb_info} info(s). "
            f"Montant total des ecarts : {_fmt_currency(montant_total)}"
        )
        elements.append(Paragraph(summary, styles["body_bold"]))
        elements.append(Spacer(1, 3 * mm))

        anom_data = [["Severite", "Type", "Description", "Montant ecart"]]
        for a in anomalies:
            anom_data.append([
                _severity_label(a.get("severite", "info")),
                a.get("type_anomalie", ""),
                Paragraph(a.get("description", "")[:120], styles["small"]),
                _fmt_currency(a.get("montant_ecart", 0.0)),
            ])
        elements.append(_build_table(
            anom_data,
            col_widths=[2.5 * cm, 3 * cm, 8 * cm, 3.5 * cm],
        ))

    # RFA
    elements.append(Spacer(1, 6 * mm))
    elements.append(Paragraph("RFA (Remise de Fin d'Annee)", styles["heading"]))

    rfa_attendue = facture.get("rfa_attendue", 0.0)
    rfa_recue = facture.get("rfa_recue")
    ecart_rfa = facture.get("ecart_rfa")

    rfa_text = f"RFA attendue : {_fmt_currency(rfa_attendue)}"
    if rfa_recue is not None:
        rfa_text += f" | RFA recue : {_fmt_currency(rfa_recue)} | Ecart : {_fmt_currency(ecart_rfa)}"
    else:
        rfa_text += " | RFA recue : non renseignee"
    elements.append(Paragraph(rfa_text, styles["body"]))

    doc.build(elements, onFirstPage=_add_footer, onLaterPages=_add_footer)
    buffer.seek(0)
    return buffer


# ========================================
# RAPPORT 2 : RAPPORT MENSUEL PAR FOURNISSEUR
# ========================================

def generate_monthly_report_pdf(
    laboratoire_nom: str,
    laboratoire_id: int,
    mois: int,
    annee: int,
    factures: List[dict],
    anomalies: List[dict],
    rfa_progression: Optional[dict] = None,
    stats_mois_precedent: Optional[dict] = None,
) -> io.BytesIO:
    """
    Genere le rapport mensuel par fournisseur (laboratoire).

    Contenu :
    - Synthese du mois : nb factures, CA total, total remises
    - Liste des anomalies avec montants
    - Progression RFA (texte)
    - Comparaison avec le mois precedent
    - Total economies detectees / recuperees
    """
    buffer = io.BytesIO()
    styles = _get_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2.5 * cm,
    )

    elements = []

    # En-tete
    elements.append(PharmaVerifHeader())
    elements.append(Spacer(1, 8 * mm))

    # Titre
    mois_noms = [
        "", "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
    ]
    mois_label = mois_noms[mois] if 1 <= mois <= 12 else str(mois)

    elements.append(Paragraph(f"Rapport mensuel — {mois_label} {annee}", styles["title"]))
    elements.append(Paragraph(f"Laboratoire : {laboratoire_nom}", styles["subtitle"]))

    # Synthese du mois
    elements.append(Paragraph("Synthese du mois", styles["heading"]))

    nb_factures = len(factures)
    ca_total = sum(f.get("montant_brut_ht", 0.0) or 0.0 for f in factures)
    remises_total = sum(f.get("total_remise_facture", 0.0) or 0.0 for f in factures)
    net_total = sum(f.get("montant_net_ht", 0.0) or 0.0 for f in factures)
    rfa_attendue_total = sum(f.get("rfa_attendue", 0.0) or 0.0 for f in factures)

    synth_data = [
        ["Indicateur", "Valeur"],
        ["Nombre de factures", str(nb_factures)],
        ["CA brut HT total", _fmt_currency(ca_total)],
        ["Total remises", _fmt_currency(remises_total)],
        ["Net HT total", _fmt_currency(net_total)],
        ["Taux de remise moyen", f"{remises_total / max(ca_total, 0.01) * 100:.1f}%"],
        ["RFA attendue", _fmt_currency(rfa_attendue_total)],
    ]
    elements.append(_build_table(synth_data, col_widths=[7 * cm, 10 * cm]))
    elements.append(Spacer(1, 6 * mm))

    # Liste des factures
    elements.append(Paragraph("Detail des factures", styles["heading"]))
    if factures:
        fact_data = [["Numero", "Date", "Brut HT", "Remise", "Net HT", "Statut"]]
        for f in factures:
            fact_data.append([
                f.get("numero_facture", "N/A"),
                _fmt_date(f.get("date_facture")),
                _fmt_currency(f.get("montant_brut_ht")),
                _fmt_currency(f.get("total_remise_facture")),
                _fmt_currency(f.get("montant_net_ht")),
                (f.get("statut", "N/A")).upper(),
            ])
        elements.append(_build_table(
            fact_data,
            col_widths=[3 * cm, 3 * cm, 3 * cm, 3 * cm, 3 * cm, 2 * cm],
        ))
    else:
        elements.append(Paragraph("Aucune facture pour cette periode.", styles["body"]))

    elements.append(Spacer(1, 6 * mm))

    # Anomalies
    elements.append(Paragraph("Anomalies detectees", styles["heading"]))

    if anomalies:
        nb_crit = sum(1 for a in anomalies if a.get("severite") == "critical")
        montant_economies = sum(a.get("montant_ecart", 0.0) or 0.0 for a in anomalies)

        elements.append(Paragraph(
            f"{len(anomalies)} anomalie(s) detectee(s), dont {nb_crit} critique(s). "
            f"Economies potentielles : {_fmt_currency(montant_economies)}",
            styles["body_bold"],
        ))
        elements.append(Spacer(1, 3 * mm))

        anom_data = [["Facture", "Severite", "Description", "Montant"]]
        for a in anomalies:
            anom_data.append([
                a.get("facture_numero", ""),
                _severity_label(a.get("severite", "info")),
                Paragraph(a.get("description", "")[:100], styles["small"]),
                _fmt_currency(a.get("montant_ecart", 0.0)),
            ])
        elements.append(_build_table(
            anom_data,
            col_widths=[2.5 * cm, 2.5 * cm, 8 * cm, 4 * cm],
        ))
    else:
        elements.append(Paragraph("Aucune anomalie detectee ce mois.", styles["body"]))

    elements.append(Spacer(1, 6 * mm))

    # Progression RFA
    elements.append(Paragraph("Progression RFA annuelle", styles["heading"]))

    if rfa_progression:
        cumul = rfa_progression.get("cumul_achats_ht", 0.0)
        taux_actuel = rfa_progression.get("taux_rfa_actuel", 0.0)
        rfa_estimee = rfa_progression.get("rfa_estimee_annuelle", 0.0)
        progression = rfa_progression.get("progression_pct", 0.0)
        restant = rfa_progression.get("montant_restant_prochain_palier")

        rfa_data = [
            ["Indicateur", "Valeur"],
            ["Cumul achats HT annuel", _fmt_currency(cumul)],
            ["Taux RFA actuel", f"{taux_actuel:.1f}%"],
            ["RFA estimee annuelle", _fmt_currency(rfa_estimee)],
            ["Progression vers palier suivant", f"{progression:.1f}%"],
        ]
        if restant is not None:
            rfa_data.append(["Montant restant prochain palier", _fmt_currency(restant)])

        elements.append(_build_table(rfa_data, col_widths=[7 * cm, 10 * cm]))
    else:
        elements.append(Paragraph("Aucun accord commercial actif pour ce laboratoire.", styles["body"]))

    # Comparaison mois precedent
    if stats_mois_precedent:
        elements.append(Spacer(1, 6 * mm))
        elements.append(Paragraph("Comparaison avec le mois precedent", styles["heading"]))

        prev_ca = stats_mois_precedent.get("ca_total", 0.0)
        prev_nb = stats_mois_precedent.get("nb_factures", 0)
        prev_remises = stats_mois_precedent.get("remises_total", 0.0)

        evol_ca = ((ca_total - prev_ca) / max(prev_ca, 0.01)) * 100 if prev_ca > 0 else 0.0
        evol_nb = nb_factures - prev_nb

        comp_data = [
            ["Indicateur", "Mois precedent", "Mois actuel", "Evolution"],
            ["CA brut HT", _fmt_currency(prev_ca), _fmt_currency(ca_total), _fmt_pct(evol_ca)],
            ["Nb factures", str(prev_nb), str(nb_factures), f"{evol_nb:+d}"],
            ["Remises", _fmt_currency(prev_remises), _fmt_currency(remises_total),
             _fmt_pct(((remises_total - prev_remises) / max(prev_remises, 0.01)) * 100 if prev_remises > 0 else 0.0)],
        ]
        elements.append(_build_table(comp_data, col_widths=[4 * cm, 4.5 * cm, 4.5 * cm, 4 * cm]))

    doc.build(elements, onFirstPage=_add_footer, onLaterPages=_add_footer)
    buffer.seek(0)
    return buffer


# ========================================
# RAPPORT 3 : RECLAMATION FOURNISSEUR
# ========================================

def generate_reclamation_pdf(
    laboratoire_nom: str,
    anomalies: List[dict],
    pharmacie_nom: str = "Pharmacie PharmaVerif",
    pharmacie_adresse: str = "",
    objet: Optional[str] = None,
    texte_intro: Optional[str] = None,
    texte_conclusion: Optional[str] = None,
    signataire: str = "Le pharmacien titulaire",
) -> io.BytesIO:
    """
    Genere un courrier de reclamation professionnel.

    Contenu :
    - Format courrier
    - Destinataire (fournisseur)
    - Objet : Reclamation — Ecarts detectes
    - Tableau des anomalies avec preuves (references factures)
    - Montant total reclame
    - Demande de regularisation
    - Signature
    """
    buffer = io.BytesIO()
    styles = _get_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2.5 * cm,
    )

    elements = []

    # En-tete
    elements.append(PharmaVerifHeader())
    elements.append(Spacer(1, 10 * mm))

    # Expediteur
    elements.append(Paragraph(f"<b>{pharmacie_nom}</b>", styles["body_bold"]))
    if pharmacie_adresse:
        elements.append(Paragraph(pharmacie_adresse, styles["body"]))
    elements.append(Spacer(1, 8 * mm))

    # Destinataire
    elements.append(Paragraph(f"<b>A l'attention de :</b>", styles["body"]))
    elements.append(Paragraph(f"<b>{laboratoire_nom}</b>", styles["body_bold"]))
    elements.append(Paragraph("Service comptabilite / commercial", styles["body"]))
    elements.append(Spacer(1, 4 * mm))

    # Date
    now = datetime.now()
    elements.append(Paragraph(
        f"Le {_fmt_date(now.date())}",
        ParagraphStyle("DateRight", parent=styles["body"], alignment=TA_RIGHT),
    ))
    elements.append(Spacer(1, 6 * mm))

    # Objet
    objet_text = objet or f"Reclamation — Ecarts detectes sur factures {laboratoire_nom}"
    elements.append(Paragraph(f"<b>Objet : {objet_text}</b>", styles["body_bold"]))
    elements.append(Spacer(1, 6 * mm))

    # Ligne horizontale
    elements.append(HRFlowable(width="100%", thickness=1, color=BLEU))
    elements.append(Spacer(1, 6 * mm))

    # Introduction
    intro = texte_intro or (
        f"Madame, Monsieur,\n\n"
        f"Apres verification de nos factures, nous avons detecte plusieurs ecarts "
        f"qui necessitent une regularisation. Nous vous prions de bien vouloir prendre "
        f"connaissance du detail ci-dessous et de proceder aux ajustements necessaires."
    )
    for para in intro.split("\n\n"):
        if para.strip():
            elements.append(Paragraph(para.strip(), styles["letter_body"]))

    elements.append(Spacer(1, 4 * mm))

    # Tableau des anomalies
    elements.append(Paragraph("<b>Detail des ecarts constates :</b>", styles["body_bold"]))
    elements.append(Spacer(1, 3 * mm))

    montant_total_reclame = sum(a.get("montant_ecart", 0.0) or 0.0 for a in anomalies)

    if anomalies:
        anom_data = [["Ref. facture", "Date", "Type d'ecart", "Description", "Montant"]]
        for a in anomalies:
            anom_data.append([
                a.get("facture_numero", "-"),
                a.get("facture_date", "-"),
                a.get("type_anomalie", "").replace("_", " ").title(),
                Paragraph(a.get("description", "")[:100], styles["small"]),
                _fmt_currency(a.get("montant_ecart", 0.0)),
            ])
        # Total
        anom_data.append([
            "", "", "", Paragraph("<b>TOTAL RECLAME</b>", styles["body_bold"]),
            _fmt_currency(montant_total_reclame),
        ])

        anom_table = _build_table(
            anom_data,
            col_widths=[2.5 * cm, 2 * cm, 3 * cm, 5.5 * cm, 4 * cm],
        )
        # Mettre la derniere ligne en gras
        anom_table.setStyle(TableStyle([
            ("BACKGROUND", (0, len(anom_data) - 1), (-1, len(anom_data) - 1), BLEU_CLAIR),
            ("FONTNAME", (0, len(anom_data) - 1), (-1, len(anom_data) - 1), "Helvetica-Bold"),
        ]))
        elements.append(anom_table)
    else:
        elements.append(Paragraph("Aucune anomalie a reclamer.", styles["body"]))

    elements.append(Spacer(1, 6 * mm))

    # Montant total
    elements.append(Paragraph(
        f"<b>Montant total de la reclamation : {_fmt_currency(montant_total_reclame)}</b>",
        ParagraphStyle(
            "MontantTotal", parent=styles["body_bold"],
            fontSize=12, textColor=ROUGE,
        ),
    ))
    elements.append(Spacer(1, 6 * mm))

    # Conclusion
    conclusion = texte_conclusion or (
        f"Nous vous demandons de bien vouloir proceder a la regularisation de ces ecarts "
        f"dans les meilleurs delais, soit par avoir, soit par virement.\n\n"
        f"Nous restons a votre disposition pour tout complement d'information "
        f"et vous prions d'agreer, Madame, Monsieur, l'expression de nos salutations distinguees."
    )
    for para in conclusion.split("\n\n"):
        if para.strip():
            elements.append(Paragraph(para.strip(), styles["letter_body"]))

    elements.append(Spacer(1, 15 * mm))

    # Signature
    elements.append(Paragraph(f"<b>{signataire}</b>", ParagraphStyle(
        "Signature", parent=styles["body_bold"], alignment=TA_RIGHT,
    )))
    elements.append(Paragraph(pharmacie_nom, ParagraphStyle(
        "SignatureNom", parent=styles["body"], alignment=TA_RIGHT,
    )))

    doc.build(elements, onFirstPage=_add_footer, onLaterPages=_add_footer)
    buffer.seek(0)
    return buffer


# ========================================
# RAPPORT 4 : RAPPORT EMAC (TRIANGLE)
# ========================================

def generate_emac_report_pdf(
    emac: dict,
    laboratoire_nom: str,
    triangle_lignes: List[dict],
    anomalies: List[dict],
    factures_periode: List[dict],
) -> io.BytesIO:
    """
    Genere le rapport EMAC avec triangle de verification.

    Contenu :
    - Synthese EMAC : periode, fournisseur
    - Triangle de verification visuel
    - Detail des ecarts
    - Liste des factures de la periode
    - Montant a recuperer
    """
    buffer = io.BytesIO()
    styles = _get_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2.5 * cm,
    )

    elements = []

    # En-tete
    elements.append(PharmaVerifHeader())
    elements.append(Spacer(1, 8 * mm))

    # Titre
    # Formatter la periode
    try:
        debut = emac.get("periode_debut")
        if isinstance(debut, str):
            debut = date.fromisoformat(debut)
        mois_noms = [
            "", "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
        ]
        periode_str = f"{mois_noms[debut.month]} {debut.year}" if debut else "Periode inconnue"
    except (ValueError, AttributeError):
        periode_str = str(emac.get("periode_debut", ""))

    elements.append(Paragraph("Rapport EMAC", styles["title"]))
    elements.append(Paragraph(
        f"{laboratoire_nom} — {periode_str}",
        styles["subtitle"],
    ))

    # Synthese EMAC
    elements.append(Paragraph("Synthese EMAC", styles["heading"]))

    synth_data = [
        ["Reference", emac.get("reference") or "-",
         "Periode", periode_str],
        ["Type", (emac.get("type_periode", "mensuel") or "mensuel").capitalize(),
         "Source", (emac.get("format_source", "manuel") or "manuel").capitalize()],
        ["CA declare", _fmt_currency(emac.get("ca_declare")),
         "CA reel (factures)", _fmt_currency(emac.get("ca_reel_calcule"))],
        ["Total avantages declares", _fmt_currency(emac.get("total_avantages_declares")),
         "Montant deja verse", _fmt_currency(emac.get("montant_deja_verse"))],
        ["Solde a percevoir", _fmt_currency(emac.get("solde_a_percevoir")),
         "Montant recouvrable", _fmt_currency(emac.get("montant_recouvrable"))],
        ["Statut", (emac.get("statut_verification", "non_verifie")).upper(),
         "Nb factures matchees", str(emac.get("nb_factures_matched", 0))],
    ]

    synth_table_data = []
    for row in synth_data:
        formatted = []
        for i, cell in enumerate(row):
            if i % 2 == 0:
                formatted.append(Paragraph(f"<b>{cell}</b>", styles["small"]))
            else:
                formatted.append(Paragraph(str(cell), styles["body"]))
        synth_table_data.append(formatted)

    synth_table = Table(synth_table_data, colWidths=[4 * cm, 4.5 * cm, 4 * cm, 4.5 * cm])
    synth_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("BACKGROUND", (0, 0), (0, -1), GRIS_CLAIR),
        ("BACKGROUND", (2, 0), (2, -1), GRIS_CLAIR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(synth_table)
    elements.append(Spacer(1, 6 * mm))

    # Triangle de verification
    elements.append(Paragraph("Triangle de verification", styles["heading"]))

    if triangle_lignes:
        tri_data = [["Element", "EMAC (declare)", "Factures (reel)", "Conditions", "Ecart", "Statut"]]
        for t in triangle_lignes:
            ecart = t.get("ecart_emac_factures") or t.get("ecart_emac_conditions")
            ecart_str = _fmt_currency(ecart) if ecart is not None else "-"
            if t.get("ecart_pct") is not None:
                ecart_str += f" ({t['ecart_pct']:.1f}%)"

            conforme = t.get("conforme", True)
            statut_str = "CONFORME" if conforme else "ECART"

            tri_data.append([
                t.get("label", ""),
                _fmt_currency(t.get("valeur_emac")),
                _fmt_currency(t.get("valeur_factures")) if t.get("valeur_factures") is not None else "-",
                _fmt_currency(t.get("valeur_conditions")) if t.get("valeur_conditions") is not None else "-",
                ecart_str,
                statut_str,
            ])

        tri_table = _build_table(
            tri_data,
            col_widths=[3.5 * cm, 2.7 * cm, 2.7 * cm, 2.7 * cm, 3 * cm, 2.4 * cm],
        )

        # Colorier les lignes en ecart
        for i, t in enumerate(triangle_lignes):
            row_idx = i + 1  # +1 for header
            if not t.get("conforme", True):
                tri_table.setStyle(TableStyle([
                    ("TEXTCOLOR", (4, row_idx), (5, row_idx), ROUGE),
                    ("FONTNAME", (4, row_idx), (5, row_idx), "Helvetica-Bold"),
                ]))
            # Derniere ligne = TOTAL en gras
            if t.get("label") == "TOTAL AVANTAGES":
                tri_table.setStyle(TableStyle([
                    ("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold"),
                    ("BACKGROUND", (0, row_idx), (-1, row_idx), BLEU_CLAIR),
                ]))

        elements.append(tri_table)
    else:
        elements.append(Paragraph("Triangle non disponible (EMAC non verifie).", styles["body"]))

    elements.append(Spacer(1, 6 * mm))

    # Detail avantages declares
    elements.append(Paragraph("Detail des avantages declares", styles["heading"]))

    detail_data = [
        ["Type d'avantage", "Montant declare"],
        ["RFA (Remise de Fin d'Annee)", _fmt_currency(emac.get("rfa_declaree"))],
        ["COP (Conditions Objectifs)", _fmt_currency(emac.get("cop_declaree"))],
        ["Remises differees", _fmt_currency(emac.get("remises_differees_declarees"))],
        ["Autres avantages", _fmt_currency(emac.get("autres_avantages"))],
        ["TOTAL", _fmt_currency(emac.get("total_avantages_declares"))],
    ]
    detail_table = _build_table(detail_data, col_widths=[10 * cm, 7 * cm])
    detail_table.setStyle(TableStyle([
        ("FONTNAME", (0, len(detail_data) - 1), (-1, len(detail_data) - 1), "Helvetica-Bold"),
        ("BACKGROUND", (0, len(detail_data) - 1), (-1, len(detail_data) - 1), BLEU_CLAIR),
    ]))
    elements.append(detail_table)
    elements.append(Spacer(1, 6 * mm))

    # Anomalies
    if anomalies:
        elements.append(Paragraph("Anomalies detectees", styles["heading"]))

        anom_data = [["Severite", "Type", "Description", "Ecart"]]
        for a in anomalies:
            anom_data.append([
                _severity_label(a.get("severite", "info")),
                a.get("type_anomalie", "").replace("_", " "),
                Paragraph(a.get("description", "")[:120], styles["small"]),
                _fmt_currency(a.get("montant_ecart", 0.0)),
            ])
        elements.append(_build_table(
            anom_data,
            col_widths=[2.5 * cm, 3 * cm, 8 * cm, 3.5 * cm],
        ))
        elements.append(Spacer(1, 6 * mm))

    # Factures de la periode
    if factures_periode:
        elements.append(Paragraph("Factures de la periode", styles["heading"]))

        fp_data = [["Numero", "Date", "Brut HT", "Net HT", "Statut"]]
        for f in factures_periode[:30]:
            fp_data.append([
                f.get("numero_facture", "N/A"),
                _fmt_date(f.get("date_facture")),
                _fmt_currency(f.get("montant_brut_ht")),
                _fmt_currency(f.get("montant_net_ht")),
                (f.get("statut", "N/A")).upper(),
            ])
        if len(factures_periode) > 30:
            fp_data.append(["", f"... et {len(factures_periode) - 30} autres factures", "", "", ""])

        elements.append(_build_table(
            fp_data,
            col_widths=[3.5 * cm, 3 * cm, 4 * cm, 4 * cm, 2.5 * cm],
        ))
        elements.append(Spacer(1, 6 * mm))

    # Montant recouvrable
    montant_reco = emac.get("montant_recouvrable", 0.0) or 0.0
    if montant_reco > 0:
        elements.append(Paragraph(
            f"<b>Montant recouvrable : {_fmt_currency(montant_reco)}</b>",
            ParagraphStyle(
                "MontantReco", parent=styles["body_bold"],
                fontSize=14, textColor=VERT,
            ),
        ))

    doc.build(elements, onFirstPage=_add_footer, onLaterPages=_add_footer)
    buffer.seek(0)
    return buffer
