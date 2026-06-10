#!/usr/bin/env bash
# Identical post-process for every generated image (M3-B6): quantize toward the
# theme palette, vignette, uniform crop. Requires ImageMagick 7.
set -euo pipefail
IN=${1:?usage: post-process.sh <raw-dir> <out-dir>}
OUT=${2:?usage: post-process.sh <raw-dir> <out-dir>}
mkdir -p "$OUT"
# 12-color palette swatch derived from theme.css tokens
PALETTE=$(mktemp /tmp/tb-palette-XXXX.png)
magick -size 12x1 xc:none \
  -draw "fill #14110f point 0,0  fill #1f1a14 point 1,0  fill #262017 point 2,0 \
         fill #4a3f31 point 3,0  fill #8a7f6e point 4,0  fill #d8cfc0 point 5,0 \
         fill #b98fd4 point 6,0  fill #d4756f point 7,0  fill #7fd4ff point 8,0 \
         fill #8fd48f point 9,0  fill #d4af6f point 10,0 fill #ff8a5c point 11,0" \
  "$PALETTE"
for f in "$IN"/*.png "$IN"/*.jpg; do
  [ -e "$f" ] || continue
  name=$(basename "${f%.*}")
  magick "$f" \
    -resize 512x512^ -gravity center -extent 512x512 \
    -modulate 92,78,100 \
    -remap "$PALETTE" -dither FloydSteinberg \
    \( +clone -fill black -colorize 100 -fill white -draw "circle 256,256 256,40" -blur 0x60 \) \
    -compose multiply -composite \
    -bordercolor '#4a3f31' -border 2 \
    "$OUT/$name.png"
  echo "✓ $name"
done
rm -f "$PALETTE"
