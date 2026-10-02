#!/bin/sh
# Backup diário dos dados do GenoLab (contas, projetos, arquivos originais, auditoria).
# Agendar com cron na VPS, por exemplo:  15 3 * * *  /opt/genolab/_genoevidence-lab/deploy/backup.sh
# Mantém 14 dias. Os arquivos ficam em /opt/genolab-backups (acesso só do root).
set -eu
DESTINO=/opt/genolab-backups
mkdir -p "$DESTINO"
chmod 700 "$DESTINO"
DATA=$(date +%Y-%m-%d_%H%M)
VOLUME=$(docker volume ls -q | grep 'genolab-dados$' | head -n1)
docker run --rm -v "$VOLUME":/dados:ro -v "$DESTINO":/backup alpine sh -c "tar czf /backup/genolab-$DATA.tar.gz -C /dados ."
chmod 600 "$DESTINO/genolab-$DATA.tar.gz"
find "$DESTINO" -name 'genolab-*.tar.gz' -mtime +14 -delete
echo "backup: $DESTINO/genolab-$DATA.tar.gz"
