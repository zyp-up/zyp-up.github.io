#!/usr/bin/env bash
set -euo pipefail

# Lossless-oriented image optimization helper.
# Usage:
#   ./scripts/optimize-images-lossless.sh [target_dir]
# Example:
#   ./scripts/optimize-images-lossless.sh images

TARGET_DIR="${1:-images}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Directory not found: $TARGET_DIR"
  exit 1
fi

echo "Target directory: $TARGET_DIR"

# PNG: true lossless optimization
if command -v oxipng >/dev/null 2>&1; then
  echo "[PNG] Running oxipng..."
  find "$TARGET_DIR" -type f \( -iname "*.png" \) -print0 |
    xargs -0 -I{} oxipng -o 4 --strip safe "{}"
else
  echo "[PNG] oxipng not found. Install: brew install oxipng"
fi

# JPEG: metadata stripping + progressive, no quality re-encode
if command -v jpegtran >/dev/null 2>&1; then
  echo "[JPG] Running jpegtran (lossless transform)..."
  while IFS= read -r -d '' file; do
    tmp="${file}.tmp.jpg"
    jpegtran -copy none -optimize -progressive -outfile "$tmp" "$file"
    mv "$tmp" "$file"
  done < <(find "$TARGET_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) -print0)
else
  echo "[JPG] jpegtran not found. Install: brew install jpeg-turbo"
fi

# Optional: generate lossless WebP sidecar files (*.webp) from PNG/JPEG
if command -v cwebp >/dev/null 2>&1; then
  echo "[WebP] Generating lossless sidecar files..."
  while IFS= read -r -d '' file; do
    out="${file%.*}.webp"
    cwebp -quiet -lossless -z 6 "$file" -o "$out"
  done < <(find "$TARGET_DIR" -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) -print0)
else
  echo "[WebP] cwebp not found. Install: brew install webp"
fi

# Optional: generate lossless-ish AVIF sidecar files (*.avif)
if command -v avifenc >/dev/null 2>&1; then
  echo "[AVIF] Generating sidecar files (near-lossless mode)..."
  while IFS= read -r -d '' file; do
    out="${file%.*}.avif"
    avifenc --min 0 --max 0 "$file" "$out" >/dev/null 2>&1 || true
  done < <(find "$TARGET_DIR" -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) -print0)
else
  echo "[AVIF] avifenc not found. Install: brew install libavif"
fi

echo "Done."
