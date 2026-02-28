<h1 align="center">HudAim</h1>

<p align="center">
  A browser-based aim training and reaction test platform for competitive gamers.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite 7">
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS 4">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white" alt="Node.js 18+">
  <img src="https://img.shields.io/github/license/8tp/hudaim" alt="MIT License">
</p>

---

Train your reflexes, improve mouse accuracy, and compete on leaderboards across six game modes. HudAim records gameplay at 60 FPS with full replay playback, renders post-game click heatmaps, and validates scores with HMAC-SHA256 anti-cheat — all running offline-first with optional LAN sync.

<!-- ![HudAim screenshot](docs/screenshot.png) -->

## Features

### Game Modes

| Game | Description | Duration |
|------|-------------|----------|
| **Reaction Time** | Respond to visual stimuli across 5 rounds | ~30s |
| **Aim Trainer** | Click 30 targets as fast as possible | Untimed |
| **Grid Shot** | Hit targets spawning in a 3x3 grid | 30s |
| **Tracking** | Follow a moving target with adaptive difficulty | 30s |
| **Target Switching** | Eliminate 4 moving targets | 60s |
| **Precision** | Hit small 40px targets with high accuracy | 60s |

### Training
- **Adaptive difficulty** — Tracking game scales through 5 tiers based on accuracy
- **Strafe patterns** — Smooth, Reactive, Stutter, and Zigzag movement patterns
- **Post-game analytics** — Click heatmaps and statistical breakdowns

### Replay System
- **60 FPS recording** — every click, spawn, and movement captured
- **Full playback** — pause, seek, and speed controls
- **IndexedDB storage** — replays persist locally in the browser
- **Server upload** — top 3 scores per game auto-upload replays

### Multiplayer
- **LAN leaderboards** — top 10 per game, synced across devices on your network
- **UUID-based identity** — nickname changes propagate to all historical scores
- **Offline-first** — fully functional without the backend server

### Anti-Cheat
- **HMAC-SHA256 sessions** — server-signed game sessions prevent score injection
- **Score plausibility** — per-game bounds checking (hit rate, reaction time, accuracy)
- **Duration validation** — server verifies game length matches expected range
- **Resize detection** — window resizing during gameplay invalidates the run

## Getting Started

```sh
git clone https://github.com/8tp/hudaim.git
cd hudaim
npm install
npm run dev
```

The dev server starts at [http://localhost:5174](http://localhost:5174). All six games work offline with local leaderboards.

### With Leaderboard Server

```sh
# Terminal 1 — Backend
cd server && npm install && node index.js

# Terminal 2 — Frontend
npm run dev
```

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3001/api
- **LAN**: both accessible via your local IP

### Environment Variables

```sh
VITE_API_URL=http://localhost:3001/api
```

## Architecture

```
Client A                     Server                      Client B
   |                           |                            |
   |-- session/start --------->|                            |
   |<-- sessionId + sig -------|                            |
   |                           |                            |
   |   [ gameplay @ 60fps ]    |                            |
   |                           |                            |
   |-- session/end + score --->|                            |
   |                           |-- validate signature       |
   |                           |-- check duration           |
   |                           |-- check plausibility       |
   |<-- leaderboard -----------|-- leaderboard ------------>|
```

Scores save to localStorage instantly for offline play. When the server is available, a background sync keeps the LAN leaderboard up to date.

### Tracking Game — Adaptive Difficulty

| Level | Accuracy | Speed | Point Multiplier |
|-------|----------|-------|------------------|
| Easy | 0–30% | 2–3.5 | 1x |
| Easy+ | 30–50% | 2.5–4.5 | 1.5x |
| Medium | 50–70% | 3–5.5 | 2x |
| Hard | 70–85% | 3.5–6.5 | 3x |
| Insane | 85%+ | 4–7.5 | 5x |

## Project Structure

```
hudaim/
├── src/
│   ├── pages/               # Game pages (6 games + leaderboards)
│   │   ├── ReactionTime.jsx
│   │   ├── AimTrainer.jsx
│   │   ├── GridShot.jsx
│   │   ├── Tracking.jsx
│   │   ├── Switching.jsx
│   │   ├── Precision.jsx
│   │   ├── Leaderboards.jsx
│   │   └── Home.jsx
│   ├── components/          # Navbar, Settings, ReplayViewer, PostGameAnalytics
│   ├── utils/               # leaderboard.js, gameSession.js, replay.js
│   ├── App.jsx              # Router
│   └── main.jsx             # Entry point
├── server/                  # Express backend (anti-cheat, leaderboards, replays)
│   └── index.js
├── docs/                    # Detailed documentation
└── public/                  # Static assets
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Vite 7 |
| Styling | TailwindCSS 4, inline styles |
| Icons | Lucide React |
| Backend | Node.js, Express 4 |
| Storage | localStorage, IndexedDB, JSON files |
| Security | HMAC-SHA256, crypto.timingSafeEqual |
| Deployment | Netlify (frontend) |

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — Component hierarchy, data flow, animation patterns
- [API Reference](docs/API.md) — Backend endpoints and data schemas
- [Tech Stack](docs/TECH_STACK.md) — Technology decisions and rationale
- [Contributing](docs/CONTRIBUTING.md) — Development guidelines and adding new games
- [Changelog](docs/CHANGELOG.md) — Version history

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

[MIT](docs/LICENSE) — see the LICENSE file for details.
