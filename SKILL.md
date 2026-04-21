---
name: pharmaverif
description: "Development assistant for PharmaVerif, a production SaaS platform that automates pharmaceutical invoice verification for French pharmacies. Use this skill when working on ANY aspect of PharmaVerif including implementing new features, debugging issues, creating UI components, designing database schemas, implementing verification algorithms, parsing invoices, or making architectural decisions. Triggers include mentions of PharmaVerif, pharmaceutical invoice verification, rebate calculation (remises, RFA, escompte), EMAC verification, distributor invoices (CERP, OCP, Phoenix, Alliance Healthcare), laboratory invoices (Biogaran, Arrow, Teva, Mylan, Sandoz, Zentiva), Factur-X parsing, anomaly detection, tranche documents, or any development task related to this pharmacy invoice verification project. Also trigger when the user mentions facture pharmacie, vérification factures, or anything related to pharmaceutical billing in France."
---

# PharmaVerif Development Skill

## ⚠️ Sources of truth (read first)

When information conflicts between contexts, priority order is:

1. **This skill** — canonical for technical facts (stack, paths, ports, models, API)
2. **Project system prompt** in Claude.ai — canonical for working principles and current priorities
3. **userMemories** — evolves nightly, may lag behind reality; use for personal context only

**Deprecated references to ignore if encountered anywhere**:
- ❌ "Frontend on Vercel" (`pharma-verif.vercel.app`) — obsolete, project is fully VPS-hosted
- ❌ "Backend on Railway" — never true in production, historical confusion only
- ❌ "Biogaran 57% / 27.5% RFA" — outdated; correct March 2026 rates below
- ❌ "Backend on port 8000" — production uses 8001 (nginx upstream)
- ❌ "Tesseract OCR in active use" — OCR is deprecated, project awaits Factur-X (Sept 2026)

---

## Project Overview

PharmaVerif is a **production SaaS platform** that automates pharmaceutical invoice verification for French pharmacies. It addresses a critical market problem: **95% of pharmacies lose €8,000-€10,000 annually** due to undetected billing anomalies, missing rebates, and incorrectly calculated year-end rebates (RFA).

**Status**: In production, validated with pilot pharmacist **Mustafa Unlu** (Pharmacie des Coquelicots, Strasbourg). 7 development sprints completed and deployed.

**Strategic positioning**: Capitalizes on France's mandatory electronic invoicing reform (**Factur-X format, September 2026**), which eliminates OCR requirements and enables reliable automated data extraction from structured XML invoices.

**Strategic pivot (ADONIS interview)**: Focus shifted from laboratory invoices to **distributor invoices** (CERP, OCP, Alliance Healthcare, Phoenix) where systematic opacity mechanisms generate the majority of lost rebates. Distributors represent ~80% of pharmacy purchases.

---

## Production Infrastructure

### Deployment reality (single VPS, multi-service)

| Layer | Technology | Location |
|-------|-----------|----------|
| **Frontend** | Static React build served by nginx | `/var/www/pharmaverif/` on VPS |
| **Backend API** | FastAPI + uvicorn via **systemd** (no Docker) | `/var/www/pharmaverif/backend/` on VPS, port **8001** |
| **PostgreSQL** | Host systemd service (NOT the Docker postgres which is for n8n) | VPS, port 5432, DB `pharmaverif_prod` |
| **Reverse proxy** | nginx (systemd) | VPS, proxies `/api/*` → `127.0.0.1:8001` |
| **TLS termination** | Traefik (Docker) → nginx (systemd port 8087) | Domain `pharmaverif.phiecare.com` |
| **SSL** | Let's Encrypt via certbot | Auto-renew |

### Host

- **Provider**: Hostinger VPS KVM 8
- **OS**: Ubuntu 24.04
- **IP**: 72.60.92.5
- **Resources**: 8 vCPU, 32 GB RAM, 400 GB disk
- **Other services on this VPS**: n8n (Hostinger template), verix-api — **do not confuse** their containers/processes with PharmaVerif's

### Domain and URLs

- **Production URL**: https://pharmaverif.phiecare.com
- **GitHub**: https://github.com/anasbendaikha-blip/PharmaVerif

### Systemd service

The backend runs as a persistent systemd unit `pharmaverif-backend.service` with `Restart=always`.

```bash
systemctl status pharmaverif-backend
systemctl restart pharmaverif-backend
journalctl -u pharmaverif-backend -f              # live logs
journalctl -u pharmaverif-backend --since "1h ago"
```

### Environment configuration

- `.env` local dev: `VITE_API_URL=http://localhost:8000`
- `.env.production` prod build: `VITE_API_URL=https://pharmaverif.phiecare.com`
- Backend `.env` on VPS: `/var/www/pharmaverif/backend/.env` (chmod 600 root:root)

---

## Technical Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Frontend** | React 18.3 + TypeScript + Vite 6.3 | Strict TS mode |
| **Styling** | Tailwind CSS 4.1 + Radix UI primitives | Design tokens ink/ok/warn/crit |
| **Charts** | Recharts 2.15 | Dashboard recovery trends |
| **Backend** | FastAPI 0.109 + SQLAlchemy 2.0 + Alembic | Python 3.11 on VPS |
| **Database** | PostgreSQL 16 (prod) / SQLite (dev) | psycopg2-binary |
| **Auth** | JWT (python-jose) + bcrypt (passlib) | Session blacklisting on logout |
| **Invoice Parsing** | Custom parsers (pdfplumber, PyPDF2) + **factur-x** library | **No OCR in new code** |
| **PDF Reports** | ReportLab (backend) + jsPDF (frontend legacy) | Backend preferred |
| **Excel Export** | openpyxl (backend) + xlsx (frontend legacy) | |
| **Icons** | Lucide React 0.487 | |
| **Testing** | Vitest (frontend), pytest (backend) | Backend: 121+ tests green |

**OCR status**: Tesseract is referenced in legacy Dockerfile layers but is **not used** in new parsing pipelines. All new parsers target structured input (pdfplumber text extraction or factur-x XML). Do **not** add Tesseract logic to new parsers.

---

## Architecture

### Backend structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app, 16 router groups, startup events
│   ├── config.py                  # Pydantic Settings
│   ├── database.py                # SQLAlchemy setup (SQLite dev / PostgreSQL prod)
│   ├── models.py                  # Core: User, Pharmacy, Grossiste, Facture, Anomalie
│   ├── models_labo.py             # Labs: Laboratoire, AccordCommercial, FactureLabo, PalierRFA
│   ├── models_emac.py             # EMAC: EMAC, AnomalieEMAC
│   ├── models_rebate.py           # Rebates: RebateTemplate, LaboratoryAgreement, InvoiceRebateSchedule
│   ├── schemas.py                 # Pydantic validation
│   ├── security.py                # JWT + bcrypt + session blacklist
│   ├── api/
│   │   ├── deps.py                # FastAPI Depends providers (get_invoice_repo, etc.)
│   │   └── routes/                # 16 route modules
│   ├── services/
│   │   ├── verification_engine.py # Legacy 7-check engine
│   │   ├── rebate_engine.py       # Legacy line-by-line tranche/RFA calculation
│   │   └── parsers/               # Legacy parser factory
│   ├── domain/                    # Pure domain layer (Phase 1 refactor)
│   │   ├── verification/          # 7 rules, engine, inputs/outputs (Decimal, no SQLAlchemy)
│   │   ├── rebate/                # RebateCalculator (A/B classification CORRECTED here)
│   │   ├── emac/                  # EMACVerifier (triangular verification)
│   │   ├── tranche/               # TrancheVerifier (ADONIS mechanism #5)
│   │   ├── parsing/               # Factur-X parser + factory + base/biogaran/generic
│   │   └── adapters.py            # ORM ↔ domain conversion (only file importing SQLAlchemy)
│   └── infrastructure/
│       └── repositories/          # BaseRepository with forced pharmacy_id filtering
│           ├── base.py            # _base_query() always filters by pharmacy_id
│           ├── invoice_repo.py
│           ├── rebate_repo.py
│           ├── emac_repo.py
│           ├── lab_repo.py
│           └── grossiste_repo.py
├── tests/                         # 121+ tests (characterization + domain + repos + multi-tenant)
├── requirements.txt
└── .env                           # chmod 600
```

### Frontend structure

```
src/app/
├── api/                           # httpClient.ts + per-resource modules (typed)
├── components/
│   ├── dashboard/                 # AlertBanner, AnomalyTable, SupplierBadge, etc.
│   ├── layout/                    # Sidebar, Header, MobileNav
│   └── ui/                        # shadcn-style primitives
├── pages/                         # 19 page components
└── styles/theme.css               # Design tokens (ink/ok/warn/crit/slate palettes)
```

---

## Domain Knowledge — Validated Commercial Conditions

### Biogaran — canonical reference (March 2026 update)

| Tranche | Criteria | **RFA rate** | Notes |
|---------|----------|--------------|-------|
| **A** | TVA 2.10% + remise **> 2.5%** | **55%** | Requires remontée |
| **B** | TVA 2.10% + remise **≤ 2.5%** | **25%** | Requires remontée |
| **OTC** | TVA ≠ 2.10% | **57%** | Already integrated in invoice discount — NO remontée |

⚠️ **Known bugs**:
- Old rates **57% / 27.5%** are WRONG — do not use
- Classification A/B in legacy `services/rebate_engine.py` is **INVERTED** (labels swapped). Fixed in `domain/rebate/calculator.py`
- All rates must be **read from DB** via `LaboratoryAgreement` + `RebateTemplate`, never hardcoded
- RFA formula: `rate × net_amount` — NOT `(target_rate − discount_rate) × gross` (historical critical bug, refuted by tests)

### Reference Mustafa — Biogaran January 2026

- Remontée expected: **~5 670 €** (PharmaVerif) vs Mustafa reference **5 539.45 €** = 97.6% convergence
- Total RFA ≈ **8 157 €** (already deducted ≈ 2 487 € + remontée ≈ 5 670 €)

### Other labs

Templates exist with **placeholder values** for Arrow, Teva, Mylan, Sandoz, Zentiva. **Need validation with Mustafa** before production use.

---

## ADONIS Insights — 6 Distributor Opacity Mechanisms

1. **Mixing rebates** — generic + wholesaler rebates combined opaquely
2. **Fixed budget envelopes** — predetermined annual caps below actual earned amounts
3. **Discretionary penalties** — retroactive deductions without documentation
4. **Strategic validation delays** — pressure to accept unverified year-end statements
5. **Deliberately complex documentation** — tranche documents with falsified amounts (target of TrancheVerifier)
6. **Regular method changes** — distributors change calculation methods to prevent comparison

### CERP 2.5% pattern

Exactly 2.500% rebates across varying monthly volumes = artificial capping at legal ceiling (**Article L.138-9 CSS**). Additional earned rebates reclassified as "dividende coopératif". Flagging this pattern is a core value proposition.

---

## Key Services

### Verification Engine — 7 checks

Tolerances: **€0.02** on amounts, **0.5 points** on rates.

1. Remises par tranche — discount rates vs negotiated targets
2. Escompte — cash discount detection
3. Franco de port — freight threshold
4. RFA progression — year-end rebate accumulation
5. Gratuités — free goods verification ("10+1" ratios)
6. TVA cohérence — VAT rate consistency
7. Calcul arithmétique — line-by-line arithmetic

### Multi-tenant isolation

Every query **must** filter by `pharmacy_id`. The repository layer (`infrastructure/repositories/base.py`) enforces this via `_base_query()`. Constructor raises `ValueError` if `pharmacy_id` is `None`. `create()` overwrites any caller-provided `pharmacy_id`.

---

## Severity and Business Rules

- 🔴 **Anomalies critiques** — billing errors, impact > 500 €. **Never** for anomalies favorable to pharmacist.
- 🟡 **Opportunités** — potential savings (escompte, gratuités), 100-500 €
- 🟢 **Conformes** — verified correct
- Écart ≤ 1 € = rounding → ignore. Monetary tolerance: **±0.01 €**.

---

## Run Ops — Incident Response

### Backend returns 502
1. `systemctl status pharmaverif-backend` → if `inactive`: `systemctl start pharmaverif-backend`
2. `journalctl -u pharmaverif-backend -n 100`
3. Check DB: `systemctl status postgresql`
4. Check RAM: `free -h`

### Healthcheck
- `GET /health` — light (no DB), used by external monitoring
- `GET /health/deep` — includes DB check, internal only

### Backups
- Daily cron 3h: `/root/scripts/backup-pharmaverif.sh`
- Location: `/root/backups/pharmaverif/` (14-day rotation)
- Restore: `gunzip < backup.sql.gz | sudo -u postgres psql pharmaverif_prod`

Full ops documentation: `INFRA.md` in project root.

---

## Code Style

- **Python**: FastAPI patterns, type hints, Pydantic validation, SQLAlchemy 2.0
- **TypeScript**: strict mode, functional components + hooks, no `any`
- **Domain naming**: French (`montant_ht`, `remise_ligne`, `anomalie`, `tranche`, `remontée`)
- **Infrastructure naming**: English (`database`, `router`, `service`)
- **Error messages**: French for UI, English for logs
- **Commit convention**: `fix(security): MT-001 —`, `feat(dashboard):`, `docs(infra):`

---

## Current Development Priorities

1. **Dynamic Lab Configuration** — read all rates from DB (infrastructure built, wiring in progress)
2. **Tranche Document Verification** — ADONIS priority, highest ROI
3. **Laboratory Expansion** — validate Arrow/Teva/Mylan/Sandoz/Zentiva with Mustafa
4. **Distributor Parsers** — CERP, OCP (factory ready for plug-in)
5. **Security Remediation** — 63 issues in `AUDIT_TRACKER.md`

---

## References

- `INFRA.md` — VPS operations documentation
- `references/domain-knowledge.md` — pharmaceutical billing ecosystem, ADONIS details
- `references/data-models.md` — complete SQLAlchemy models and Pydantic schemas
- `references/verification-rules.md` — detailed verification logic
