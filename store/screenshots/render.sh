#!/usr/bin/env bash
# Exporta os screenshots da Play Store (1080x1920) a partir de screens.html.
#
# Usa o Chromium headless. Por padrao pega o do cache do Playwright; para usar
# outro, rode `CHROME=/caminho/do/chrome ./render.sh`.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/play/pt-BR"
mkdir -p "$OUT"

CHROME="${CHROME:-$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux64/chrome 2>/dev/null | sort -V | tail -1)}"
if [[ -z "$CHROME" || ! -x "$CHROME" ]]; then
  echo "Chromium nao encontrado. Defina CHROME=/caminho/do/chrome." >&2
  exit 1
fi

NOMES=(
  "01-leitura-do-dia"
  "02-audio"
  "03-cinco-etapas"
  "04-caderno"
  "05-acervo"
  "06-habito"
)

for i in "${!NOMES[@]}"; do
  n=$((i + 1))
  arquivo="$OUT/${NOMES[$i]}.png"
  # --virtual-time-budget: da tempo das fontes carregarem antes da captura.
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1080,1920 \
    --allow-file-access-from-files --virtual-time-budget=5000 \
    --screenshot="$arquivo" "file://$DIR/screens.html#$n" >/dev/null 2>&1
  echo "ok  $arquivo"
done
