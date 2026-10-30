#!/usr/bin/env bash
# Gera os PNGs de identidade visual a partir dos SVGs source (M5-B, #228).
# Usa ImageMagick (`convert`). Rodar quando SVGs em assets/source/ mudarem.
#
# Uso:
#   ./scripts/build-icons.sh
#
# Requer: imagemagick (`sudo apt install imagemagick`).

set -euo pipefail

SRC="assets/source"
OUT="assets"

# icon.png: 1024×1024, iOS/Android legacy launcher. Fundo navy sólido no SVG.
convert -background none -resize 1024x1024 "$SRC/icon.svg" "$OUT/icon.png"

# adaptive-icon.png: 1024×1024, Android foreground. Fundo transparente —
# Android compõe com adaptiveIcon.backgroundColor do app.json.
convert -background none -resize 1024x1024 "$SRC/adaptive-icon.svg" "$OUT/adaptive-icon.png"

# splash-icon.png: 1024×1024, símbolo com transparência (Expo centraliza).
convert -background none -resize 1024x1024 "$SRC/splash-icon.svg" "$OUT/splash-icon.png"

# favicon.png: 96×96 é o sweet spot pra browser tab (renderiza a 16-32).
convert -background none -resize 96x96 "$SRC/favicon.svg" "$OUT/favicon.png"

# Ícones do PWA (#408), servidos da raiz do site pelo `public/`.
# apple-touch-icon: 180×180, tela de início do iPhone. O iOS arredonda sozinho
# e não aceita transparência, então sai do icon.svg de fundo sólido.
# 192 e 512: os tamanhos que o manifesto exige. maskable: pro recorte do
# Android, com o desenho dentro da área segura.
PWA="public/icons"
mkdir -p "$PWA"
convert -background none -resize 180x180 "$SRC/icon.svg" "$PWA/apple-touch-icon.png"
convert -background none -resize 192x192 "$SRC/icon.svg" "$PWA/icon-192.png"
convert -background none -resize 512x512 "$SRC/icon.svg" "$PWA/icon-512.png"
convert -background none -resize 512x512 "$SRC/pwa-maskable.svg" "$PWA/maskable-512.png"

echo "✓ Ícones gerados em $OUT/ e $PWA/:"
ls -la "$OUT"/*.png "$PWA"/*.png | awk '{printf "  %s\t%s bytes\n", $NF, $5}'
