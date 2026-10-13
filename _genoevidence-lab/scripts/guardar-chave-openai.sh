#!/bin/sh
# Guarda a chave da OpenAI no .env.local, sem ela aparecer na tela nem no histórico.
# Uso: sh scripts/guardar-chave-openai.sh
set -e
cd "$(dirname "$0")/.."
ENV=.env.local

printf 'Cole a chave da OpenAI e tecle Enter (ela não aparece enquanto você digita): '
stty -echo 2>/dev/null || true
IFS= read -r CHAVE
stty echo 2>/dev/null || true
printf '\n'

CHAVE=$(printf '%s' "$CHAVE" | tr -d '[:space:]')
if [ -z "$CHAVE" ]; then
  echo "Nada foi colado. Nenhuma alteração feita."
  exit 1
fi
case "$CHAVE" in
  sk-*) ;;
  *) echo "Isso não parece uma chave da OpenAI (elas começam com sk-). Nenhuma alteração feita."; exit 1 ;;
esac

touch "$ENV"
chmod 600 "$ENV"
# tira uma chave antiga, se houver, e grava a nova
grep -v '^OPENAI_API_KEY=' "$ENV" > "$ENV.tmp" 2>/dev/null || true
printf 'OPENAI_API_KEY=%s\n' "$CHAVE" >> "$ENV.tmp"
mv "$ENV.tmp" "$ENV"
chmod 600 "$ENV"

echo "Pronto. Chave guardada em $ENV (só o seu usuário pode ler)."
echo "Tamanho: $(printf '%s' "$CHAVE" | wc -c | tr -d ' ') caracteres · começa com $(printf '%s' "$CHAVE" | cut -c1-7)…"
echo "A chave não foi impressa e não fica no histórico do terminal."
