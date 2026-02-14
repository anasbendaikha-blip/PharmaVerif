"""
PharmaVerif — Migration Alembic : Rebate Engine Tables
========================================================
Copyright (c) 2026 Anas BENDAIKHA
Tous droits reserves.

Cree les 4 tables du module de remises echelonnees :
  - rebate_templates          (grilles de remise pre-definies)
  - laboratory_agreements     (accords specifiques pharmacie <-> labo)
  - invoice_rebate_schedules  (echeancier de remises par facture)
  - agreement_audit_logs      (journal d'audit des modifications)

+ Seeds : 3 templates systeme pre-definis (Biogaran, Arrow, Teva)

IMPORTANT : Cette migration est alignee 1:1 avec models_rebate.py.
Les noms de colonnes, types, et FK correspondent exactement aux
modeles SQLAlchemy du fichier backend/app/models_rebate.py.

Revision : 001_rebate_engine
"""

from alembic import op
import sqlalchemy as sa
import json

# Revision identifiers
revision = '001_rebate_engine'
down_revision = None  # Premiere migration — adapter si une migration existe deja
branch_labels = None
depends_on = None


def upgrade():
    # ========================================================================
    # TABLE 1 : rebate_templates
    # ========================================================================
    # Correspond a : models_rebate.RebateTemplate
    op.create_table(
        'rebate_templates',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        # Identification
        sa.Column('nom', sa.String(200), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('laboratoire_nom', sa.String(200), nullable=False, index=True),
        # Type et frequence (enums stockes comme varchar)
        sa.Column('rebate_type', sa.String(20), nullable=False, server_default='rfa'),
        sa.Column('frequence', sa.String(20), nullable=False, server_default='annuel'),
        # Paliers de remise (JSONB/JSON)
        sa.Column('tiers', sa.JSON(), nullable=False, server_default='[]'),
        # Structure du template (stages/etapes)
        sa.Column('structure', sa.JSON(), nullable=True),
        # Taux fixes
        sa.Column('taux_escompte', sa.Float(), server_default='0.0'),
        sa.Column('delai_escompte_jours', sa.Integer(), server_default='30'),
        sa.Column('taux_cooperation', sa.Float(), server_default='0.0'),
        # Conditions gratuites
        sa.Column('gratuites_ratio', sa.String(50), nullable=True),
        sa.Column('gratuites_seuil_qte', sa.Integer(), server_default='0'),
        # Versioning
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('scope', sa.String(20), server_default='system'),
        # Metadonnees
        sa.Column('actif', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        # Contraintes
        sa.CheckConstraint("rebate_type IN ('rfa', 'escompte', 'cooperation', 'gratuite')", name='ck_template_rebate_type'),
        sa.CheckConstraint("frequence IN ('mensuel', 'trimestriel', 'semestriel', 'annuel')", name='ck_template_frequence'),
        sa.CheckConstraint("scope IN ('system', 'group', 'pharmacy')", name='ck_template_scope'),
    )
    op.create_index('idx_templates_nom', 'rebate_templates', ['nom'])
    op.create_index('idx_templates_labo', 'rebate_templates', ['laboratoire_nom'])
    op.create_index('idx_templates_actif', 'rebate_templates', ['actif'])
    op.create_index('idx_templates_type', 'rebate_templates', ['rebate_type'])

    # ========================================================================
    # TABLE 2 : laboratory_agreements
    # ========================================================================
    # Correspond a : models_rebate.LaboratoryAgreement
    op.create_table(
        'laboratory_agreements',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        # Cles etrangeres
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('rebate_templates.id'), nullable=True),
        sa.Column('laboratoire_id', sa.Integer(), sa.ForeignKey('laboratoires.id'), nullable=False),
        sa.Column('pharmacy_id', sa.Integer(), sa.ForeignKey('pharmacies.id'), nullable=False),
        # Identification
        sa.Column('nom', sa.String(200), nullable=False),
        sa.Column('reference_externe', sa.String(100), nullable=True),
        # Validite
        sa.Column('date_debut', sa.Date(), nullable=False),
        sa.Column('date_fin', sa.Date(), nullable=True),
        # Statut (enum stocke comme varchar)
        sa.Column('statut', sa.String(20), nullable=False, server_default='brouillon'),
        # Paliers personnalises (surcharge du template)
        sa.Column('custom_tiers', sa.JSON(), nullable=True),
        # Configuration complete de l'accord (taux par tranche)
        sa.Column('agreement_config', sa.JSON(), nullable=True),
        # Taux specifiques (surcharge du template)
        sa.Column('taux_escompte', sa.Float(), nullable=True),
        sa.Column('taux_cooperation', sa.Float(), nullable=True),
        sa.Column('gratuites_ratio', sa.String(50), nullable=True),
        # Objectif CA annuel
        sa.Column('objectif_ca_annuel', sa.Float(), nullable=True),
        # Montants cumules (mis a jour par le moteur)
        sa.Column('ca_cumule', sa.Float(), server_default='0.0'),
        sa.Column('remise_cumulee', sa.Float(), server_default='0.0'),
        sa.Column('derniere_maj_calcul', sa.DateTime(timezone=True), nullable=True),
        # Versioning
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('previous_version_id', sa.Integer(), sa.ForeignKey('laboratory_agreements.id'), nullable=True),
        sa.Column('template_version', sa.Integer(), server_default='1'),
        # Notes
        sa.Column('notes', sa.Text(), nullable=True),
        # Metadonnees
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        # Contraintes
        sa.CheckConstraint("statut IN ('brouillon', 'actif', 'suspendu', 'expire', 'archive')", name='ck_agreement_statut'),
        sa.CheckConstraint("date_fin IS NULL OR date_fin >= date_debut", name='ck_agreement_dates'),
    )
    op.create_index('idx_agreements_pharmacy', 'laboratory_agreements', ['pharmacy_id'])
    op.create_index('idx_agreements_labo', 'laboratory_agreements', ['laboratoire_id'])
    op.create_index('idx_agreements_statut', 'laboratory_agreements', ['statut'])
    op.create_index('idx_agreements_dates', 'laboratory_agreements', ['date_debut', 'date_fin'])
    op.create_index('idx_agreements_active_lookup', 'laboratory_agreements', ['pharmacy_id', 'laboratoire_id', 'statut'])

    # ========================================================================
    # TABLE 3 : invoice_rebate_schedules
    # ========================================================================
    # Correspond a : models_rebate.InvoiceRebateSchedule
    op.create_table(
        'invoice_rebate_schedules',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        # Cles etrangeres
        sa.Column('agreement_id', sa.Integer(), sa.ForeignKey('laboratory_agreements.id'), nullable=False),
        sa.Column('facture_labo_id', sa.Integer(), sa.ForeignKey('factures_labo.id'), nullable=True),
        sa.Column('pharmacy_id', sa.Integer(), sa.ForeignKey('pharmacies.id'), nullable=False),
        # Type de remise
        sa.Column('rebate_type', sa.String(20), nullable=False),
        # Montants globaux
        sa.Column('montant_base_ht', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('taux_applique', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('montant_prevu', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('montant_recu', sa.Float(), nullable=True),
        sa.Column('ecart', sa.Float(), nullable=True),
        # Snapshot immutable de la config
        sa.Column('applied_config', sa.JSON(), nullable=True),
        # Ventilation par tranche
        sa.Column('tranche_breakdown', sa.JSON(), nullable=True),
        sa.Column('tranche_type', sa.String(20), nullable=True),
        # Detail du calendrier (entries)
        sa.Column('rebate_entries', sa.JSON(), nullable=True),
        # Version de l'accord
        sa.Column('agreement_version', sa.Integer(), server_default='1'),
        # Date et montant facture (reference rapide)
        sa.Column('invoice_date', sa.Date(), nullable=True),
        sa.Column('invoice_amount', sa.Float(), nullable=True),
        # Echeance
        sa.Column('date_echeance', sa.Date(), nullable=False),
        sa.Column('date_reception', sa.Date(), nullable=True),
        # Statut
        sa.Column('statut', sa.String(20), nullable=False, server_default='prevu'),
        # Totaux RFA
        sa.Column('total_rfa_expected', sa.Float(), server_default='0.0'),
        sa.Column('total_rfa_percentage', sa.Float(), server_default='0.0'),
        # Reference avoir
        sa.Column('reference_avoir', sa.String(100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        # Metadonnees
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        # Contraintes
        sa.CheckConstraint("statut IN ('prevu', 'emis', 'recu', 'ecart', 'annule')", name='ck_schedule_statut'),
        sa.CheckConstraint("rebate_type IN ('rfa', 'escompte', 'cooperation', 'gratuite')", name='ck_schedule_rebate_type'),
    )
    op.create_index('idx_schedules_facture', 'invoice_rebate_schedules', ['facture_labo_id'])
    op.create_index('idx_schedules_agreement', 'invoice_rebate_schedules', ['agreement_id'])
    op.create_index('idx_schedules_tranche', 'invoice_rebate_schedules', ['tranche_type'])
    op.create_index('idx_schedules_date', 'invoice_rebate_schedules', ['invoice_date'])
    op.create_index('idx_schedules_echeance', 'invoice_rebate_schedules', ['date_echeance'])
    op.create_index('idx_schedules_statut', 'invoice_rebate_schedules', ['statut'])

    # ========================================================================
    # TABLE 4 : agreement_audit_logs
    # ========================================================================
    # Correspond a : models_rebate.AgreementAuditLog
    op.create_table(
        'agreement_audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        # Cles etrangeres
        sa.Column('agreement_id', sa.Integer(), sa.ForeignKey('laboratory_agreements.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        # Action
        sa.Column('action', sa.String(50), nullable=False),
        # Diff
        sa.Column('ancien_etat', sa.JSON(), nullable=True),
        sa.Column('nouvel_etat', sa.JSON(), nullable=True),
        # Details
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        # Metadonnees
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_audit_agreement', 'agreement_audit_logs', ['agreement_id'])
    op.create_index('idx_audit_timestamp', 'agreement_audit_logs', ['created_at'])
    op.create_index('idx_audit_action', 'agreement_audit_logs', ['action'])

    # ========================================================================
    # SEEDS : 3 templates systeme pre-definis
    # ========================================================================
    _seed_templates()


def _seed_templates():
    """Insere les 3 templates systeme pre-definis (Biogaran, Arrow, Teva)"""

    templates_table = sa.table(
        'rebate_templates',
        sa.column('nom', sa.String),
        sa.column('description', sa.Text),
        sa.column('laboratoire_nom', sa.String),
        sa.column('rebate_type', sa.String),
        sa.column('frequence', sa.String),
        sa.column('tiers', sa.JSON),
        sa.column('structure', sa.JSON),
        sa.column('taux_escompte', sa.Float),
        sa.column('delai_escompte_jours', sa.Integer),
        sa.column('taux_cooperation', sa.Float),
        sa.column('gratuites_ratio', sa.String),
        sa.column('gratuites_seuil_qte', sa.Integer),
        sa.column('actif', sa.Boolean),
    )

    # -----------------------------------------------
    # Template 1 : Biogaran Standard 2025
    # Remise 4 etapes echelonnees + prime annuelle
    # -----------------------------------------------
    structure_biogaran = json.dumps({
        "type": "staged_rebate",
        "description": "Remise echelonnee sur 4 etapes avec prime fidelite annuelle. Modele standard pour les laboratoires generiques.",
        "stages": [
            {
                "stage_id": "immediate",
                "label": "Remise sur facture",
                "delay_months": 0,
                "rate_type": "percentage",
                "is_cumulative": True,
                "payment_method": "invoice_deduction",
                "fields": ["rate"],
                "order": 1,
            },
            {
                "stage_id": "m1_rebate",
                "label": "Remontee M+1",
                "delay_months": 1,
                "rate_type": "incremental_percentage",
                "is_cumulative": True,
                "payment_method": "emac_transfer",
                "fields": ["incremental_rate", "cumulative_rate"],
                "order": 2,
            },
            {
                "stage_id": "m2_rebate",
                "label": "Remontee M+2",
                "delay_months": 2,
                "rate_type": "incremental_percentage",
                "is_cumulative": True,
                "payment_method": "emac_transfer",
                "fields": ["incremental_rate", "cumulative_rate"],
                "order": 3,
            },
            {
                "stage_id": "annual_bonus",
                "label": "Prime fidelite annuelle",
                "delay_months": 12,
                "rate_type": "conditional_percentage",
                "is_cumulative": True,
                "payment_method": "year_end_transfer",
                "fields": ["incremental_rate", "cumulative_rate"],
                "conditions": [
                    {
                        "type": "annual_volume",
                        "operator": ">=",
                        "threshold_field": "total_purchases",
                        "unit": "euros",
                    }
                ],
                "order": 4,
            },
        ],
        "tranches": ["A", "B"],
        "supports_otc": False,
    })

    # -----------------------------------------------
    # Template 2 : Arrow Generiques 2025
    # Remise 3 etapes sans prime conditionnelle
    # -----------------------------------------------
    structure_arrow = json.dumps({
        "type": "staged_rebate",
        "description": "Remise echelonnee sur 3 etapes sans prime conditionnelle. Modele simplifie pour les laboratoires avec versement rapide.",
        "stages": [
            {
                "stage_id": "immediate",
                "label": "Remise sur facture",
                "delay_months": 0,
                "rate_type": "percentage",
                "is_cumulative": True,
                "payment_method": "invoice_deduction",
                "fields": ["rate"],
                "order": 1,
            },
            {
                "stage_id": "m1_rebate",
                "label": "Remontee M+1",
                "delay_months": 1,
                "rate_type": "incremental_percentage",
                "is_cumulative": True,
                "payment_method": "emac_transfer",
                "fields": ["incremental_rate", "cumulative_rate"],
                "order": 2,
            },
            {
                "stage_id": "m2_rebate",
                "label": "Remontee M+2",
                "delay_months": 2,
                "rate_type": "incremental_percentage",
                "is_cumulative": True,
                "payment_method": "emac_transfer",
                "fields": ["incremental_rate", "cumulative_rate"],
                "order": 3,
            },
        ],
        "tranches": ["B"],
        "supports_otc": False,
    })

    # -----------------------------------------------
    # Template 3 : Teva Premium 2025
    # Paliers de volume annuels
    # -----------------------------------------------
    structure_teva = json.dumps({
        "type": "volume_based_rebate",
        "description": "Prime par paliers de volume d'achat. Chaque palier atteint declenche un taux de remise supplementaire.",
        "stages": [
            {
                "stage_id": "tier_1",
                "label": "Palier 1",
                "delay_months": 12,
                "rate_type": "conditional_percentage",
                "is_cumulative": True,
                "payment_method": "year_end_transfer",
                "fields": ["incremental_rate"],
                "conditions": [{"type": "annual_volume", "operator": ">=", "threshold_field": "total_purchases", "unit": "euros"}],
                "order": 1,
            },
            {
                "stage_id": "tier_2",
                "label": "Palier 2",
                "delay_months": 12,
                "rate_type": "conditional_percentage",
                "is_cumulative": True,
                "payment_method": "year_end_transfer",
                "fields": ["incremental_rate"],
                "conditions": [{"type": "annual_volume", "operator": ">=", "threshold_field": "total_purchases", "unit": "euros"}],
                "order": 2,
            },
            {
                "stage_id": "tier_3",
                "label": "Palier 3",
                "delay_months": 12,
                "rate_type": "conditional_percentage",
                "is_cumulative": True,
                "payment_method": "year_end_transfer",
                "fields": ["incremental_rate"],
                "conditions": [{"type": "annual_volume", "operator": ">=", "threshold_field": "total_purchases", "unit": "euros"}],
                "order": 3,
            },
        ],
        "tranches": ["B"],
        "supports_otc": False,
    })

    op.bulk_insert(templates_table, [
        {
            "nom": "Biogaran Standard 2025",
            "description": "Grille de remise standard Biogaran pour les pharmacies. RFA annuelle sur 3 paliers de CA, escompte 2.5% a 30 jours, gratuites 10+1 a partir de 10 unites.",
            "laboratoire_nom": "Biogaran",
            "rebate_type": "rfa",
            "frequence": "annuel",
            "tiers": json.dumps([
                {"seuil_min": 0, "seuil_max": 50000, "taux": 2.0, "label": "Bronze"},
                {"seuil_min": 50000, "seuil_max": 100000, "taux": 3.0, "label": "Argent"},
                {"seuil_min": 100000, "seuil_max": None, "taux": 4.0, "label": "Or"},
            ]),
            "structure": structure_biogaran,
            "taux_escompte": 2.5,
            "delai_escompte_jours": 30,
            "taux_cooperation": 0.0,
            "gratuites_ratio": "10+1",
            "gratuites_seuil_qte": 10,
            "actif": True,
        },
        {
            "nom": "Arrow Generiques 2025",
            "description": "Grille de remise Arrow Generiques. RFA semestrielle sur 3 paliers de CA, escompte 2.0% a 45 jours. Pas de gratuites.",
            "laboratoire_nom": "Arrow",
            "rebate_type": "rfa",
            "frequence": "semestriel",
            "tiers": json.dumps([
                {"seuil_min": 0, "seuil_max": 30000, "taux": 1.5, "label": "Starter"},
                {"seuil_min": 30000, "seuil_max": 80000, "taux": 2.5, "label": "Pro"},
                {"seuil_min": 80000, "seuil_max": None, "taux": 3.5, "label": "Elite"},
            ]),
            "structure": structure_arrow,
            "taux_escompte": 2.0,
            "delai_escompte_jours": 45,
            "taux_cooperation": 0.0,
            "gratuites_ratio": None,
            "gratuites_seuil_qte": 0,
            "actif": True,
        },
        {
            "nom": "Teva Premium 2025",
            "description": "Grille de remise premium Teva. RFA annuelle sur 4 paliers de CA, cooperation commerciale 1.5%, gratuites 20+2 a partir de 20 unites.",
            "laboratoire_nom": "Teva",
            "rebate_type": "rfa",
            "frequence": "annuel",
            "tiers": json.dumps([
                {"seuil_min": 0, "seuil_max": 25000, "taux": 1.0, "label": "Decouverte"},
                {"seuil_min": 25000, "seuil_max": 60000, "taux": 2.0, "label": "Confiance"},
                {"seuil_min": 60000, "seuil_max": 120000, "taux": 3.0, "label": "Fidelite"},
                {"seuil_min": 120000, "seuil_max": None, "taux": 4.5, "label": "Partenaire"},
            ]),
            "structure": structure_teva,
            "taux_escompte": 0.0,
            "delai_escompte_jours": 0,
            "taux_cooperation": 1.5,
            "gratuites_ratio": "20+2",
            "gratuites_seuil_qte": 20,
            "actif": True,
        },
    ])


def downgrade():
    """Supprime les 4 tables du Rebate Engine dans l'ordre inverse des dependances"""
    op.drop_table('agreement_audit_logs')
    op.drop_table('invoice_rebate_schedules')
    op.drop_table('laboratory_agreements')
    op.drop_table('rebate_templates')
