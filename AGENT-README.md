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

1. `data/config.json`
2. `data/spielplan.json`
3. `data/event.json`
4. `data/catering.json`
5. `data/spielfeldlayout.json`
6. `data/anfahrt.json`

## Formatvorgaben

### 1) Konfiguration: `data/config.json`

Pflichtfelder:

- keine

Optionale Felder:

- `siteTitle` (String für seitenspezifischen Titel)

### 2) Spielplan: `data/spielplan.json`

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

### 3) Event-Metadaten: `data/event.json`

Pflichtfelder:

- `quickInfo` (Array aus Strings)
- `trainerMeeting.time`
- `trainerMeeting.location`
- `awardCeremony.isPlanned` (Boolean)

Optionale Felder:

- `awardCeremony.time`
- `awardCeremony.location`

### 4) Verpflegung: `data/catering.json`

Pflichtfelder:

- `catering.offerings` (Array aus Strings)
- `catering.payment`
- `catering.notes`

### 5) Spielfeldlayout: `data/spielfeldlayout.json`

Pflichtfelder:

- `fieldLayout.summary` (String)
- `fieldLayout.fields` (Array)

Optionale Felder:

- `fieldLayout.title` (String)
- `fieldLayout.image.url` (String)
- `fieldLayout.image.alt` (String)

Pro Feld:

- `field` (z. B. `Feld 1`)
- `group` (z. B. `Gruppe A`)

### 6) Anfahrt: `data/anfahrt.json`

Pflichtfeld:

- `directions.address`

Optionale Felder:

- `directions.parking`
- `directions.publicTransport`

## Hinweis zum Hauptdatensatz

`sample-data.json` ist nur noch eine Referenzvorlage. Die aktive Website lädt die Daten aus den Dateien unter `data/`.

## Validierungsempfehlungen

- Nur valides JSON (UTF-8)
- Datumsformat strikt `YYYY-MM-DD`
- Uhrzeitformat strikt `HH:MM`
- Mannschaftsnamen eindeutig pro Spiel
