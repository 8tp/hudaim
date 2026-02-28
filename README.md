# HudAim

A browser-based aim training and reaction test platform for competitive gamers and esports athletes. Train your reflexes, improve mouse accuracy, and compete on leaderboards with replay support and anti-cheat validation.

## Games

| Game | Description | Duration |
|------|-------------|----------|
| **Reaction Time** | Respond to visual stimuli across 5 rounds | ~30s |
| **Aim Trainer** | Click 30 targets as fast as possible | Untimed |
| **Grid Shot** | Hit targets spawning in a 3x3 grid | 30s |
| **Tracking** | Follow a moving target with adaptive difficulty | 30s |
| **Target Switching** | Eliminate 4 moving targets | 60s |
| **Precision** | Hit small 40px targets with high accuracy | 60s |

## Features

- **Adaptive Difficulty** - Tracking game scales through 5 difficulty tiers based on accuracy
- **Replay System** - Records gameplay at 60 FPS with full playback via IndexedDB
- **Post-Game Analytics** - Click heatmaps and statistical breakdowns
- **Leaderboards** - Local + LAN-synced with top-10 per game
- **Anti-Cheat** - HMAC-SHA256 session validation, score plausibility checks, resize detection
- **Offline Support** - Fully functional without the backend server

## Quick Start

```bash
# Install frontend dependencies
npm install

# Start the dev server
npm run dev
```

### With Leaderboard Server (LAN sync)

```bash
# Terminal 1 - Backend
cd server && npm install && node index.js

# Terminal 2 - Frontend
npm run dev
```

### Access

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3001/api
- **LAN**: Both accessible via your local IP

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Vite 7 |
| Styling | TailwindCSS 4, Inline styles |
| Icons | Lucide React |
| Backend | Node.js, Express 4 |
| Storage | localStorage, IndexedDB, JSON files |
| Deployment | Netlify (frontend) |

## Project Structure

```
hudaim/
├── src/
│   ├── pages/            # Game pages (6 games + leaderboards)
│   ├── components/       # Navbar, Settings, ReplayViewer, PostGameAnalytics, etc.
│   ├── utils/            # leaderboard.js, gameSession.js, replay.js
│   ├── App.jsx           # Router
│   └── main.jsx          # Entry point
├── server/               # Express backend (anti-cheat, leaderboards, replays)
│   └── index.js
├── docs/                 # Detailed documentation
└── public/               # Static assets
```

## Environment Variables

```bash
VITE_API_URL=http://localhost:3001/api
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Component hierarchy, data flow, animation patterns
- [API Reference](docs/API.md) - Backend endpoints and data schemas
- [Tech Stack](docs/TECH_STACK.md) - Technology decisions and rationale
- [Contributing](docs/CONTRIBUTING.md) - Development guidelines and adding new games
- [Changelog](docs/CHANGELOG.md) - Version history

## License

MIT
