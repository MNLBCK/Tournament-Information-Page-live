# README für Agenten (Turnierdaten)

Diese Datei beschreibt den **IST-Stand** der benötigten Datenformate, damit Agenten Turnierinformationen konsistent als JSON bereitstellen können.

## Ziel

Agenten liefern strukturierte Daten für:

- Spielplan
- Spielfeldlayout
- Anfahrt (Adresse ist Pflicht, weitere Angaben optional)
- Orga-Informationen wie Trainerbesprechung und Siegerehrung

## Pflichtdateien

Ablage unter `data/`:

1. `data/spielplan.json`
2. `data/spielfeldlayout.json`
3. `data/anfahrt.json`

## Formatvorgaben

### 1) Spielplan: `data/spielplan.json`

Pflichtfelder:

- `event.name` (String)
- `event.date` (ISO-Datum, `YYYY-MM-DD`)
- `event.startTime` (24h, `HH:MM`)
- `event.location` (String)
- `matches` (Array)

Pro Eintrag in `matches`:

- `time` (`HH:MM`)
- `field` (z. B. `Feld 1`)
- `group` (z. B. `Gruppe A`)
- `home.club`, `home.team`
- `away.club`, `away.team`

### 2) Spielfeldlayout: `data/spielfeldlayout.json`

Pflichtfelder:

- `fieldLayout.summary` (String)
- `fieldLayout.fields` (Array)

Pro Feld:

- `field` (z. B. `Feld 1`)
- `group` (z. B. `Gruppe A`)

### 3) Anfahrt: `data/anfahrt.json`

Pflichtfeld:

- `directions.address`

Optionale Felder:

- `directions.parking`
- `directions.publicTransport`

## Erweiterte Informationen (im Hauptdatensatz)

Die Website liest aktuell `sample-data.json` als Hauptdatensatz. Dort sind folgende Orga-Felder vorgesehen:

- `trainerMeeting.time` (z. B. `08:30`)
- `trainerMeeting.location` (z. B. `Vereinsheim, Besprechungsraum`)
- `awardCeremony.isPlanned` (Boolean)
- `awardCeremony.time` (optional)
- `awardCeremony.location` (optional)

## Validierungsempfehlungen

- Nur valides JSON (UTF-8)
- Datumsformat strikt `YYYY-MM-DD`
- Uhrzeitformat strikt `HH:MM`
- Mannschaftsnamen eindeutig pro Spiel

