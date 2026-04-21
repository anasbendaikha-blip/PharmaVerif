# PharmaVerif — Documentation Infrastructure

**Dernière mise à jour** : 21 avril 2026
**Auteur consolidation** : Claude Code + Anas

---

## 1. Serveur

- **Hébergeur** : Hostinger
- **Plan** : VPS KVM 8
- **OS** : Ubuntu 24.04
- **IP publique** : 72.60.92.5
- **Accès** : `ssh root@72.60.92.5` (clé SSH sur laptop Anas)
- **Panel Hostinger** : https://hpanel.hostinger.com/
- **Ressources** : 8 vCPU, 32 GB RAM, 400 GB disque

## 2. Domaine et DNS

- **Domaine** : `pharmaverif.phiecare.com` → `72.60.92.5` (record A)
- **Certificat SSL** : Let's Encrypt via certbot, expire 9 juin 2026, renouvellement auto
- **Reverse proxy** : Traefik (Docker, ports 80/443) → nginx (systemd, port 8087) → backend (port 8001)

## 3. Architecture services

| Composant | Type | Port | Chemin | Process |
|---|---|---|---|---|
| Frontend | Static nginx | 8087 (via Traefik 80/443) | `/var/www/pharmaverif/dist/` | nginx systemd |
| Backend API | uvicorn systemd | 8001 (localhost) | `/var/www/pharmaverif/backend/` | `pharmaverif-backend.service` |
| PostgreSQL | systemd (host) | 5432 (localhost) | `/var/lib/postgresql/16/main` | `postgresql.service` |
| Reverse proxy | nginx systemd | 8087 | `/etc/nginx/sites-enabled/pharmaverif.conf` | nginx systemd |
| TLS termination | Traefik Docker | 80, 443 | container `n8n-traefik-1` | Docker |

**Note** : le container Docker `postgres` (port 5433) est pour **n8n**, pas PharmaVerif.

## 4. Commandes opérationnelles

### Backend
```bash
systemctl status pharmaverif-backend
systemctl restart pharmaverif-backend
journalctl -u pharmaverif-backend -f             # logs live
journalctl -u pharmaverif-backend --since "1h ago"
curl http://localhost:8001/health                 # healthcheck
```

### Base de données
```bash
sudo -u postgres psql -d pharmaverif_prod
# Dump manuel :
sudo -u postgres pg_dump pharmaverif_prod | gzip > /tmp/backup-manual.sql.gz
```

### Frontend (redéploiement)
```bash
cd /var/www/pharmaverif/
git pull origin main
npm install && npm run build
# Le build écrit dans dist/ servi directement par nginx
```

### Nginx
```bash
nginx -t && systemctl reload nginx
tail -f /var/log/nginx/error.log
cat /etc/nginx/sites-enabled/pharmaverif.conf
```

## 5. Monitoring

- **Healthcheck public** : `https://pharmaverif.phiecare.com/health`
  Retourne `{"status":"healthy","service":"pharmaverif-api","version":"1.0.0"}`
- **UptimeRobot** : à configurer sur https://uptimerobot.com/
  - Monitor HTTPS : `https://pharmaverif.phiecare.com/health`
  - Keyword : `healthy`
  - Interval : 5 min
  - Alerte email : contact@al-iqraiyyah.com

## 6. Backups

- **Automatique** : cron root quotidien 3h, script `/root/scripts/backup-pharmaverif.sh`
- **Emplacement** : `/root/backups/pharmaverif/`
- **Rotation** : 14 jours
- **Log** : `/var/log/pharmaverif-backup.log`
- **Restauration** :
  ```bash
  gunzip < /root/backups/pharmaverif/backup-YYYYMMDD-HHMM.sql.gz | sudo -u postgres psql pharmaverif_prod
  ```
- **⚠️ TODO** : backup off-site (S3/Backblaze B2)

## 7. Incident playbook

### Le site renvoie 502 Bad Gateway
1. `systemctl status pharmaverif-backend` → actif ?
2. Si `inactive` : `systemctl start pharmaverif-backend` puis `journalctl -u pharmaverif-backend -n 100`
3. Si `active` mais `/health` timeout : `systemctl restart pharmaverif-backend`
4. Si crash répété : vérifier DB (`systemctl status postgresql`), RAM (`free -h`)

### La DB ne répond plus
1. `systemctl status postgresql` → actif ?
2. Si `inactive` : `systemctl start postgresql`
3. Test : `sudo -u postgres psql -d pharmaverif_prod -c "SELECT 1;"`

### Le certificat SSL expire
```bash
certbot renew --dry-run
certbot renew
systemctl reload nginx
```

### Le disque sature
```bash
df -h /
du -sh /var/log/* | sort -h | tail -5
journalctl --vacuum-size=200M
docker image prune -f
```

## 8. Secrets

- **Fichier** : `/var/www/pharmaverif/backend/.env` (chmod 600 root:root)
- **Non versionné** dans git (vérifié)
- **Variables critiques** : `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`
- **Rotation recommandée** : tous les 6 mois

## 9. Dettes d'infra identifiées

- [ ] Backup off-site (S3/B2) — tout sur le même VPS
- [ ] Environnement de staging séparé
- [ ] CI/CD automatisé (aujourd'hui : SSH + git pull + npm build)
- [ ] Migrer le backend dans Docker pour cohérence avec le reste du VPS
- [ ] Secrets manager (HashiCorp Vault ou équivalent)
- [ ] Auditer firewall UFW : `ufw status verbose`

## 10. Contacts

- **Dev principal** : Anas BENDAIKHA
- **Pharmacien test** : Mustafa (Pharmacie des Coquelicots, Strasbourg)
- **Hébergeur** : Hostinger support
- **Domaine** : phiecare.com (Hostinger)
