# Documentation

Quick reference for HudAim's documentation.

## Contents

| Document | Description |
|----------|-------------|
| [Architecture](ARCHITECTURE.md) | Component hierarchy, data flow, animation patterns, anti-cheat design |
| [API Reference](API.md) | Backend endpoints — sessions, leaderboards, replays |
| [Tech Stack](TECH_STACK.md) | Technology choices, versions, and rationale |
| [Contributing](CONTRIBUTING.md) | Development setup, code style, adding new games |
| [Changelog](CHANGELOG.md) | Version history |

## Games

| Game | File | Lines | Key Mechanic |
|------|------|-------|-------------|
| Reaction Time | `src/pages/ReactionTime.jsx` | 531 | 5-round visual stimulus response |
| Aim Trainer | `src/pages/AimTrainer.jsx` | 693 | 30 sequential targets, speed-scored |
| Grid Shot | `src/pages/GridShot.jsx` | 721 | 3x3 grid with staggered spawning |
| Tracking | `src/pages/Tracking.jsx` | 1028 | Adaptive difficulty, strafe patterns |
| Target Switching | `src/pages/Switching.jsx` | 838 | 4 moving targets, elimination |
| Precision | `src/pages/Precision.jsx` | 692 | Small targets, accuracy-weighted scoring |

## Components

| Component | File | Purpose |
|-----------|------|---------|
| Navbar | `src/components/Navbar.jsx` | Navigation and settings access |
| Settings | `src/components/Settings.jsx` | Nickname management, data reset |
| NicknamePrompt | `src/components/NicknamePrompt.jsx` | First-run setup modal |
| ReplayViewer | `src/components/ReplayViewer.jsx` | Playback with seek and speed controls |
| PostGameAnalytics | `src/components/PostGameAnalytics.jsx` | Click heatmaps and statistics |
| FixedGameArea | `src/components/FixedGameArea.jsx` | Standardized 1200x600px game container |
| GameCard | `src/components/GameCard.jsx` | Home page game selection card |

## Utilities

| Module | File | Purpose |
|--------|------|---------|
| Leaderboard | `src/utils/leaderboard.js` | Score management, identity, server sync |
| Replay | `src/utils/replay.js` | Recording, playback, IndexedDB storage |
| Game Session | `src/utils/gameSession.js` | Anti-cheat session management |

## Quick Start

```sh
# Frontend only
npm install && npm run dev

# With backend
cd server && npm install && node index.js  # Terminal 1
npm run dev                                 # Terminal 2
```
