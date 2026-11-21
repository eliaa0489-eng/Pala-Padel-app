# pala

**Official Padel scoring & match logs. Local-first, minimalist, built for the court.**

`pala.app` is a mobile-first Progressive Web App (PWA) designed for effortless on-court playability and understated athletic precision. Built without login walls, ads, or bloated booking feeds, PALA combines a deterministic FIP scoring engine, a rotatable fullscreen court display, and crash-proof local match logging inside a calm, instrument-grade interface.

---

## Philosophy

Most sports apps are either cluttered social networks or dated utility counters. PALA follows three strict principles:

1. **Zero Friction on Court** — Local-first by default. Open the app and start a match in one tap without forced sign-ups, session timeouts, or broken redirects.
2. **Official FIP Rules** — Accurate scoring logic for `2v2` and `1v1` with automated court cues so players never lose track of serves, side switches, or tie-breaks.
3. **Quiet Business Court Design** — Inspired by Swiss chronometers and modern athletic minimalism. Warm architectural surfaces, strict tabular numerals, zero Google Fonts, and zero visual clutter.

---

## Features

### Official FIP Scoring Engine
- **Supported Modes:** `2v2` (Doubles) and `1v1` (Singles) with an interactive minimalist mini-court blueprint during setup.
- **Configurable Deuce Rules:** Instant toggle between **Golden Point (Punto de Oro)** and classic **Advantage (`Vorteil`)**.
- **Match Formats:** `Best of 3` sets or quick `1 Satz` matches.
- **Automated Tie-Break:** Triggers automatically at `6–6` (numeric `0, 1, 2...`, first to `7` with a 2-point margin, official serve rotation after point 1 and every 2 points thereafter).
- **Live High-Stakes Indicators:** Automatic detection and display of `GOLDEN POINT`, `TIE-BREAK`, `SATZBALL` (Set Point), and `MATCHBALL` (Match Point).
- **Court Automations:** Active server tracking (`#CBE238` micro-indicator) and non-blocking `Seitenwechsel` (side-switch) alerts on odd game totals (`1, 3, 5...`) and every 6 tie-break points.
- **Unlimited Safe Undo:** Full snapshot-based undo stack that cleanly reverts points, games, sets, tie-breaks, and accidental match completions.
- **Accident-Proof Exit:** Dedicated confirmation sheet (`Match beenden & speichern` / `Verwerfen` / `Weiterspielen`) prevents accidental match loss during play.

### Fullscreen & Rotatable Live Scoreboard
- **Locked Viewport (`100dvh`):** Eliminates accidental scrolling and double-tap browser zoom during rapid point entry.
- **Automatic Orientation Switching:**
  - **Portrait Mode:** Ergonomic vertical split with thumb-friendly tap zones separated by a subtle court-net hairline.
  - **Landscape Mode:** Automatic flip into a side-by-side pro court display with oversized tabular numerals readable from 10 meters away when propped on a bench or glass wall.
- **Distance-Readable Team Differentiation:** Subtle `3px` edge accents and ambient washes — **Club Heritage Blue (`#004C97`)** for Team A and **Warm Champagne Silver (`#D6D1C6`)** for Team B.
- **Hardware-Grade Feedback:** Damped mechanical score transitions, subtle tap compression, optional haptic vibration (`navigator.vibrate`), native Fullscreen API (with iOS PWA fallback), and **Screen Wake Lock API** to keep the screen awake throughout the match.

### Local-First & Crash-Proof Persistence
- **Real-Time Auto-Save:** Every single state change persists immediately to `localStorage`. Refreshing the browser, switching apps, or locking the phone restores the exact match state and elapsed timer seamlessly.
- **Resume Banner:** Unfinished matches surface cleanly at the top of the `Spielen` view (`Laufendes Match fortsetzen`).
- **Match History & Collector Cards:** Completed matches are permanently stored in `Verlauf` with live summary KPIs (`MATCHES`, `SPIELZEIT`, `LETZTES MATCH`), expandable detail sheets, collector-grade post-match cards, and one-tap text summary copying (`Ergebnis kopieren`) for WhatsApp or group chats.

---

## Design System

PALA uses a warm, quiet-luxury light mode for setup and match logs paired with a matte anodized dark mode for high-contrast indoor court visibility.

| Role | Token | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Light Canvas** | Warm Limestone | `#F5F3EE` | Setup & History page background |
| **Light Surface** | Warm Ivory | `#FDFCFA` | Elevated cards (`1px solid #E6E2D8`) |
| **Primary Ink** | Deep Obsidian | `#111315` | Primary typography & wordmark |
| **Secondary Ink** | Warm Slate | `#6B6963` | Labels, metadata, timestamps |
| **Brand Accent** | Club Heritage Blue | `#004488` | Primary CTAs, court lines, winner bars |
| **Dark Canvas** | Anodized Obsidian | `#0B0D10` | Fullscreen Live Scoreboard & Match Cards |
| **Dark Numerals** | Warm Chalk | `#F5F3EE` | Scoreboard numerals & dark mode text |
| **Team A / B Edge** | Cobalt / Champagne | `#004C97` / `#D6D1C6` | Subtle distance-readable side indicators |
| **Micro Signal** | Refined Ball Volt | `#CBE238` | Active server dot & high-stakes badges only |

- **Typography:** Zero external font CDNs (no Google Fonts). Native system neo-grotesk stack for UI and tabular monospace (`font-variant-numeric: tabular-nums`) for all scores, timers, and KPIs.
- **Brand Mark:** Custom geometric lowercase SVG wordmark (`<PalaLogo />`) with matching dark obsidian PWA app icon.

---

## Tech Stack

- **Framework:** React + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (custom design tokens, zero external font dependencies)
- **Routing:** Hash-based / client state routing (`#/play`, `#/match`, `#/history`) for zero-404 static hosting
- **Web APIs:** `localStorage`, `Screen Wake Lock API`, `Fullscreen API`, `Vibration API`, `Clipboard API`

---

## Project Structure

```text
pala/
├── index.html                   # PWA meta tags, viewport-fit=cover, inline SVG favicon
├── public/
│   └── manifest.json            # Web App Manifest for iOS/Android homescreen install
├── src/
│   ├── engine/
│   │   └── padelEngine.ts       # Pure deterministic FIP scoring & undo state machine
│   ├── storage/
│   │   └── persistence.ts       # Defensive localStorage layer with schema validation
│   ├── hooks/
│   │   └── useWakeLock.ts       # Screen Wake Lock hook with visibilitychange recovery
│   ├── components/
│   │   ├── PalaLogo.tsx         # Bespoke geometric SVG wordmark
│   │   ├── MiniCourtBlueprint.tsx # Interactive 2v2 / 1v1 court vector diagram
│   │   ├── MatchSetupView.tsx   # Minimal 1-tap setup & resume banner
│   │   ├── LiveScoreboard.tsx   # Fullscreen Portrait/Landscape dark court display
│   │   ├── MatchCollectorCard.tsx # Post-match summary card & WhatsApp copy action
│   │   └── MatchHistoryView.tsx # Saved match logs, live KPIs & detail sheet
│   ├── App.tsx                  # Root state, navigation & view orchestration
│   ├── main.tsx                 # Application entry point
│   └── index.css                # Base tokens, tabular-nums, spring transitions
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites
- Node.js `18+` (LTS recommended)
- `npm`, `pnpm`, or `yarn`

### Installation & Local Development

```bash
# 1. Clone the repository
git clone [https://github.com/](https://github.com/)<your-username>/pala.git
cd pala

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

To test on a physical smartphone on the same Wi-Fi network:

```bash
npm run dev -- --host
```

### Production Build

```bash
# Type-check and build for production
npm run build

# Preview the production bundle locally
npm run preview
```

---

## Installing as a Mobile PWA

For the true distraction-free fullscreen court experience (without browser address bars):

- **iOS (Safari):** Open `pala.app` in Safari, tap the **Share** icon, and select **Add to Home Screen** (*Zum Home-Bildschirm*).
- **Android (Chrome):** Open `pala.app` in Chrome, open the menu, and select **Install App** (*App installieren*).

---

## Local Storage Schema

All persistence calls are wrapped in defensive `try/catch` guards with safe fallbacks so malformed state can never crash the UI.

| Key | Purpose |
| :--- | :--- |
| `pala_active_match_v1` | Complete live match snapshot (scores, sets, undo stack, start time, server, rules) |
| `pala_match_history_v1` | Array of completed match logs (ID, timestamp, mode, rule, teams, set scores, winner, duration) |
| `pala_prefs_v1` | Lightweight user preferences (last mode, rule, format, default team/player names) |

---

## Roadmap

- [x] **v1.0 — Core Playability:** Local-first `2v2` & `1v1` FIP engine, rotatable fullscreen scoreboard, wake lock, crash-proof match logs, Quiet Business Court design system.
- [ ] **v1.1 — Exportable Share Cards:** High-resolution PNG export of the Post-Match Collector Card for Instagram Stories and WhatsApp.
- [ ] **v1.2 — Verified Matches:** Optional 4-player confirmation links to mark official matches as verified.
- [ ] **v2.0 — Telemetry & Wearables:** Pocket motion tracking and automated biometric sync via **WHOOP API**, **Fitbit / Google Health Connect**, and **Apple Health**.
- [ ] **v2.1 — Tournament Formats & Watch Companion:** Americano, Mexicano, King of the Court, and dedicated Apple Watch wrist scoring.

---

## License

All rights reserved — © 2026 **PALA** (`pala.app`).
