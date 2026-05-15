# Tournament-Information-Page

Statische, mobilefreundliche Website für Spieltags- und Turnierinformationen (GitHub Pages kompatibel).

## IST-Stand

Die Website besteht aktuell aus einer Startseite und separaten Unterseiten:

- `index.html` – Startseite mit Kurzinformationen und Navigation
- `verpflegung.html` – Verpflegungsinformationen
- `anfahrt.html` – Anfahrt, Parken, ÖPNV
- `spielfeldlayout.html` – Layout und Gruppen je Spielfeld
- `spielplan.html` – kompakter Spielplan mit Suche und JSON-Import

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
- `styles.css` – responsives, kompaktes Layout
- `script.js` – Laden, Validieren, Rendern und Filtern der Daten
- `sample-data.json` – Beispielformat für Turnierdaten

## JSON-Format (Kurzüberblick)

Die Datenstruktur enthält:

- `event` (Name, Datum, Startzeit, Ort)
- `quickInfo` (kurze Hinweise als Liste)
- `catering`
- `directions`
- `fieldLayout`
- `matches` (Spiele)

Jedes Spiel in `matches` enthält u. a. `field`, `group`, `home`, `away`.

## Lokal testen

Da die Seite per `fetch` auf `sample-data.json` zugreift, sollte lokal ein HTTP-Server genutzt werden:

```bash
python3 -m http.server 8000
```

Danach öffnen:

- <http://localhost:8000>

## GitHub Pages Deployment

1. Repository zu GitHub pushen.
2. Unter **Settings → Pages** als Source den Branch (z. B. `main`) und Ordner `/ (root)` wählen.
3. Speichern; GitHub veröffentlicht die statische Seite.
