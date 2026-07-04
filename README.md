# Turnier-Info-Seite

![Website-Logo](favicon.svg)

Statische, mobilefreundliche Website für mehrere Turnierseiten (GitHub Pages kompatibel).

## IST-Stand

Die Website bietet jetzt eine vorgeschaltete Auswahlseite plus Turnier-Unterseiten:

- `index.html` – Turnier-Auswahl mit Suche, Zeitstatus (läuft/lief/läuft bald), Geo-basierter Sortierung, Direktlink und QR-Code
- `turnier.html` – Turnier-Startseite mit Countdown, Orga-Infos und Kurzinformationen
- `verpflegung.html` – Verpflegungsinformationen des gewählten Turniers
- `anfahrt.html` – Anfahrt, Parken, ÖPNV/Website des gewählten Turniers
- `spielfeldlayout.html` – Spielfeld- und Lageplan des gewählten Turniers
- `spielplan.html` – Spielplan mit Filterung, Feld-Pills und Autocomplete

Turniere werden über den Query-Parameter `?t=<turnier-id>` ausgewählt. Damit sind Direktlinks und QR-Codes pro Turnier möglich.

## Datenmodell

- `data/tournaments.json` enthält mehrere Turniere mit:
  - `id`
  - `event` (inkl. Datum, Startzeit, optional Endzeit)
  - `geo` (lat/lon)
  - `quickInfo`, `trainerMeeting`, `awardCeremony`
  - `catering`, `directions`, `fieldLayout`
  - `matches`

Bestehende Einzeldateien unter `data/*.json` bleiben als Referenz erhalten.

## Projektstruktur

- `styles.css` – responsives Layout inkl. Auswahlkarten, Status-Badges und QR-Code-Darstellung
- `script.js` – Laden der Turnierdaten, Auswahl/Suche, Geo-/Zeit-Vorschläge, Rendern der Turnierseiten
- `scripts/pages-preflight.sh` – Preflight inkl. Validierung von `data/tournaments.json`

## Lokal testen

```bash
python3 -m http.server 8000
./scripts/pages-preflight.sh
```

Danach öffnen: <http://localhost:8000>
