# Tournament-Information-Page

Statische, mobilefreundliche Website für Spieltags- und Turnierinformationen (GitHub Pages kompatibel).

## IST-Stand

Die Website besteht aktuell aus einer Startseite und separaten Unterseiten:

- `index.html` – Startseite mit Kurzinformationen, Countdown bis zum ersten Anpfiff und Navigation
- `verpflegung.html` – Verpflegungsinformationen
- `anfahrt.html` – Anfahrt, Parken, ÖPNV
- `spielfeldlayout.html` – Layout und Gruppen je Spielfeld
- `spielplan.html` – kompakter Spielplan mit Suche
- `admin.html` – passwortgeschützter Bereich für administrative Aufgaben (JSON-Import und JSON-Vorschau)

Auf der Startseite werden zusätzlich angezeigt:

- Countdown bis zum ersten Spiel (berechnet aus `event.date` + `event.startTime`)
- Trainerbesprechung (Uhrzeit und Ort)
- Siegerehrung (geplant: ja/nein, optional mit Zeit und Ort)

Der Spielplan bietet folgende Filter:

- Spielfeld
- Mannschaft
- Verein

Mehrere Mannschaften pro Verein sind unterstützt (z. B. „SV Grün 1“, „SV Grün 2“).

## Projektstruktur

- `index.html` – Startseite
- `verpflegung.html` – Unterseite Verpflegung
- `anfahrt.html` – Unterseite Anfahrt
- `spielfeldlayout.html` – Unterseite Spielfeldlayout
- `spielplan.html` – Unterseite Spielplan
- `admin.html` – passwortgeschützter Adminbereich
- `styles.css` – responsives, kompaktes Layout inkl. Kinder-Fußball-Theme
- `script.js` – Laden, Validieren, Rendern, Countdown, Filtern und Admin-Sperre
- `_config.yml` – Jekyll-Theme-Konfiguration für GitHub Pages
- `sample-data.json` – Referenzvorlage (nicht aktive Laufzeitquelle)
- `AGENT-README.md` – Formatvorgaben für Agenten
- `data/config.json` – seitenspezifische Konfiguration inkl. Admin-Passwort-Hash
- `data/event.json` – Event-Metadaten (Kurzinfos, Trainerbesprechung, Siegerehrung)
- `data/catering.json` – Verpflegungsdaten
- `data/spielplan.json` – separates JSON für Spielplan
- `data/spielfeldlayout.json` – separates JSON für Spielfeldlayout
- `data/anfahrt.json` – separates JSON für Anfahrt

- `.github/workflows/pages-preflight.yml` – CI-Workflow für GitHub-Pages-Preflight-Checks
- `scripts/pages-preflight.sh` – lokale und CI-fähige Prüfung für JSON, Links und Kern-Assets

## JSON-Format (Kurzüberblick)

Die Datenstruktur enthält:

- `event` (Name, Datum, Startzeit, Ort)
- `quickInfo` (kurze Hinweise als Liste)
- `trainerMeeting` (Zeit, Ort)
- `awardCeremony` (ob geplant, optional Zeit/Ort)
- `catering`
- `directions`
- `fieldLayout`
- `matches` (Spiele)

Jedes Spiel in `matches` enthält u. a. `field`, `group`, `home`, `away`.

## Passwortschutz Adminbereich

- URL: `admin.html`
- Passwort-Hash ist seitenspezifisch in `data/config.json` abgelegt (`adminPasswordHash`).
- Passwort wird nur sitzungsbasiert im Browser (`sessionStorage`) als entsperrt markiert.
- Hinweis: Da es eine statische Website ist, dient der Schutz der Trennung von Admin- und Besucheransicht, nicht der Absicherung sensibler Daten.


## Pages-Preflight (IST-Stand)

Für die Wartung ist ein Preflight-Check vorhanden, der lokal und in GitHub Actions ausgeführt werden kann.

Geprüft wird:

- JSON-Validität aller aktiven Datenquellen unter `data/*.json`
- interne `href`-Verlinkungen zwischen den HTML-Seiten
- Vorhandensein zentraler Assets (`styles.css`, `script.js`, `logo.svg`, `favicon.svg`)
- Referenzierung aller benötigten Datenquellen im `script.js`

Lokal starten:

```bash
./scripts/pages-preflight.sh
```

## Lokal testen

Da die Seite per `fetch` auf die aktiven Datenquellen unter `data/*.json` (sowie optional `sample-data.json` als Referenzvorlage im Adminbereich) zugreift, sollte lokal ein HTTP-Server genutzt werden:

```bash
python3 -m http.server 8000
```

Danach öffnen:

- <http://localhost:8000>

## GitHub Pages Deployment

1. Repository zu GitHub pushen.
2. Unter **Settings → Pages** als Source den Branch (z. B. `main`) und Ordner `/ (root)` wählen.
3. Speichern; GitHub veröffentlicht die statische Seite.
