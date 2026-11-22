# Security Policy — PALA

## Grundprinzipien für Entwickler & Nutzer

1. **Zero Secret Exposure (Keine API-Keys im Repository oder Client-Bundle)**
   - `.gitignore` blockiert alle `.env`-Dateien (`.env`, `.env.*`), Schlüsseldateien (`*.pem`, `*.key`, `*.p12`, `secrets.*`) sowie lokale Editor- und Build-Verzeichnisse.
   - `.env.example` enthält ausschließlich leere Platzhalter ohne echte Zugangsdaten.
   - `vite.config.ts` schränkt das Client-Env-Präfix auf `VITE_PUBLIC_` ein und deaktiviert Produktions-Sourcemaps (`sourcemap: false`), damit keine internen Pfade oder privaten Umgebungsvariablen im Browser-Bundle landen.

2. **Nutzer-Datenschutz (Local-First Isolation)**
   - Es werden keine persönlichen Spielernamen, Spielstände oder Nutzungsdaten an externe Server übertragen.
   - Sämtliche `localStorage`-Einträge (`pala_prefs_v1`, `pala_active_match_v1`, `pala_match_history_v1`) werden beim Laden gegen ein striktes Schema geprüft:
     - Team- und Spielernamen werden von Steuerzeichen bereinigt und auf maximal 26 Zeichen begrenzt.
     - Numerische Werte (`pointsA`, `pointsB`, `gamesA`, `gamesB`, `elapsedSeconds`) werden auf gültige, nicht-negative Ganzzahlen beschränkt.
     - Array-Größen (`sets`, `undoStack`, `match_history`) sind nach oben begrenzt, um Speicherüberläufe durch manipulierte Storage-Daten zu verhindern.

3. **Browser- & HTTP-Härtung**
   - Sichere Standard-Header (`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` und restriktive `Permissions-Policy`).
   - Alle dynamischen Texte werden über sichere React-Text-Bindings gerendert (kein `dangerouslySetInnerHTML`, kein `innerHTML`).
