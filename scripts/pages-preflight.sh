#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] JSON-Dateien validieren"
python -m json.tool data/config.json >/dev/null
python -m json.tool data/event.json >/dev/null
python -m json.tool data/catering.json >/dev/null
python -m json.tool data/anfahrt.json >/dev/null
python -m json.tool data/spielfeldlayout.json >/dev/null
python -m json.tool data/spielplan.json >/dev/null
python -m json.tool data/tournaments.json >/dev/null

echo "[2/4] Referenzierte Seiten prüfen"
html_files=(index.html turnier.html verpflegung.html anfahrt.html spielfeldlayout.html spielplan.html)
missing=0
for file in "${html_files[@]}"; do
  while IFS= read -r href; do
    target="${href#href=\"}"
    target="${target%\"}"
    [[ "$target" == http* ]] && continue
    [[ "$target" == \#* ]] && continue
    target="${target%%\?*}"
    if [[ ! -f "$target" ]]; then
      echo "Fehlender Link in $file: $target"
      missing=1
    fi
  done < <(grep -o 'href="[^"]\+"' "$file")
done

if [[ $missing -ne 0 ]]; then
  echo "Linkprüfung fehlgeschlagen"
  exit 1
fi

echo "[3/4] Asset-Dateien prüfen"
required_assets=(styles.css script.js logo.svg favicon.svg)
for asset in "${required_assets[@]}"; do
  [[ -f "$asset" ]] || { echo "Fehlendes Asset: $asset"; exit 1; }
done

echo "[4/4] Datenquellen im Script prüfen"
grep -En './data/config.json|./data/tournaments.json' script.js >/dev/null

echo "Pages-Preflight erfolgreich."
