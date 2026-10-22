#!/bin/sh
# Guarda a chave do Resend no servidor, sem ela passar pelo chat nem pelo histórico do terminal.
#
# A chave vem de um ARQUIVO que a pessoa preenche num editor comum — assim ela VÊ o que colou,
# inclusive se o terminal duplicou a colagem (já aconteceu duas vezes neste projeto).
#
# A chave é CONFERIDA contra a API antes de ser gravada: nada de guardar uma chave quebrada e
# descobrir depois, quando o e-mail não chegar. O arquivo é apagado no fim, em qualquer caso.
#
# Uso: sh scripts/guardar-chave-resend.sh <arquivo-com-a-chave>
set -e

ARQUIVO=$1
VPS_USER=root
VPS_HOST=179.236.238.251
VPS_KEY="$HOME/.ssh/genolab_vps"
ENV_REMOTO=/opt/genolab/_genoevidence-lab/.env.production

# Sem arquivo: pergunta aqui mesmo. A chave fica VISIVEL enquanto voce cola, de proposito — com a
# entrada oculta nao da para ver se a colagem entrou, e isso ja falhou duas vezes. Logo depois do
# Enter a tela e limpa. A chave nao passa pelo chat, nao vai para o git e nao entra no historico de
# comandos (ela e lida pelo roteiro, nao digitada como comando).
if [ -z "$ARQUIVO" ]; then
  echo "Cole a chave do Resend (ela vai aparecer) e tecle Enter."
  echo "A tela e limpa logo em seguida."
  printf '> '
  IFS= read -r COLADA
  clear 2>/dev/null || printf '\033[2J\033[H'
  ARQUIVO=$(mktemp /tmp/resend.XXXXXX)
  chmod 600 "$ARQUIVO"
  printf '%s' "$COLADA" > "$ARQUIVO"
  COLADA=""
elif [ ! -f "$ARQUIVO" ]; then
  echo "Arquivo nao encontrado: $ARQUIVO"
  exit 1
fi

apagar() {
  # Sobrescreve antes de remover, para a chave não ficar recuperável no disco.
  [ -f "$ARQUIVO" ] && { : > "$ARQUIVO"; rm -f "$ARQUIVO"; }
}
trap apagar EXIT INT TERM

CHAVE=$(tr -d '[:space:]' < "$ARQUIVO")
if [ -z "$CHAVE" ]; then
  echo "O arquivo está vazio. Nada foi gravado."
  exit 1
fi

# --- Colagem repetida ---------------------------------------------------------------------------
N=$(printf '%s' "$CHAVE" | wc -c | tr -d ' ')
for VEZES in 2 3 4; do
  PARTE=$((N / VEZES))
  if [ $((PARTE * VEZES)) -eq "$N" ] && [ "$PARTE" -gt 16 ]; then
    PRIMEIRA=$(printf '%s' "$CHAVE" | cut -c1-"$PARTE")
    REPETIDA=""
    I=1
    while [ "$I" -le "$VEZES" ]; do REPETIDA="$REPETIDA$PRIMEIRA"; I=$((I + 1)); done
    if [ "$REPETIDA" = "$CHAVE" ]; then
      echo "Aviso: a chave estava repetida $VEZES vezes no arquivo. Usando só a primeira."
      CHAVE="$PRIMEIRA"
      N=$PARTE
      break
    fi
  fi
done

case "$CHAVE" in
  re_*) ;;
  *) echo "Isso não parece uma chave do Resend (elas começam com re_). Nada foi gravado."; exit 1 ;;
esac

# --- Conferir ANTES de guardar ------------------------------------------------------------------
# Conferimos com um POST /emails PROPOSITALMENTE invalido (corpo vazio): nada e enviado.
# Chave boa responde 422/400 (o corpo e que esta errado); chave ruim responde 401/403.
# Nao usamos /domains: uma chave criada so com permissao de ENVIO nao lista dominios, e seria
# recusada aqui mesmo estando perfeita para o que precisamos.
printf 'Conferindo a chave com o Resend... '
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $CHAVE" -H 'Content-Type: application/json' -d '{}' || echo 000)
case "$CODIGO" in
  200|400|422) echo "aceita (a chave autentica)." ;;
  401|403)
    echo "RECUSADA pelo Resend (HTTP $CODIGO)."
    echo "A chave tem $N caracteres. Chave do Resend costuma ter bem mais que 20."
    echo "Gere uma nova em resend.com (API Keys > Create API Key) e use o botao de copiar."
    echo "Nada foi gravado."
    exit 1 ;;
  000) echo "nao foi possivel falar com o Resend a partir daqui. Nada foi gravado."; exit 1 ;;
  *) echo "resposta inesperada (HTTP $CODIGO). Nada foi gravado."; exit 1 ;;
esac

# --- Gravar no servidor -------------------------------------------------------------------------
printf 'Gravando no servidor... '
printf '%s' "$CHAVE" | ssh -i "$VPS_KEY" "$VPS_USER@$VPS_HOST" "
  set -e
  touch '$ENV_REMOTO'; chmod 600 '$ENV_REMOTO'
  NOVA=\$(cat)
  grep -v '^RESEND_API_KEY=' '$ENV_REMOTO' > '$ENV_REMOTO.tmp' 2>/dev/null || true
  printf 'RESEND_API_KEY=%s\n' \"\$NOVA\" >> '$ENV_REMOTO.tmp'
  mv '$ENV_REMOTO.tmp' '$ENV_REMOTO'
  chmod 600 '$ENV_REMOTO'
"
echo "pronto."

echo
echo "Chave guardada em $ENV_REMOTO no servidor (so o root le)."
echo "Tamanho: $N caracteres - comeca com $(printf '%s' "$CHAVE" | cut -c1-6)..."
echo "O arquivo com a chave foi apagado deste computador."
echo
echo "Falta reconstruir o servidor para ele passar a usar a chave."
