"""
PharmaVerif — Couche domaine (Domain Layer).

Contient uniquement des dataclasses Python pures et de la logique metier
sans dependance sur SQLAlchemy, FastAPI, ou la base de donnees.

Sous-modules :
  - verification : modeles de retour du moteur de verification de factures labo.
  - rebate       : modeles de retour du calculateur RFA.
  - emac         : modeles de retour de la verification triangulaire EMAC.
  - parsing      : (a venir) modeles d'extraction de factures PDF.
"""
