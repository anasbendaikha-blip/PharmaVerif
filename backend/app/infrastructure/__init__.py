"""
PharmaVerif — Infrastructure layer.

Abstractions d'acces aux donnees (repositories) et autres integrations
externes (DB, stockage, etc). Les repositories imposent l'isolation
multi-tenant en forcant `pharmacy_id` sur chaque requete.
"""
