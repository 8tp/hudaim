# HudAim - Aim Training & Reaction Tests

A modern, browser-based aim training application built with React. Train your reflexes, improve your mouse accuracy, and track your progress with local and LAN-synced leaderboards.

## 🎮 Features

### Games
- **Reaction Time** - Test how quickly you can respond to visual stimuli
- **Aim Trainer** - Click targets as quickly and precisely as possible
- **Grid Shot** - Click targets in a 3x3 grid pattern for flicking practice
- **Tracking** - Follow a moving target with Kovaaks-style strafe patterns

### Key Features
- **Progressive Difficulty** - Tracking game scales difficulty based on your accuracy
- **Strafe Patterns** - Smooth, Reactive, Stutter, and Zigzag movement patterns
- **Reaction Time Metrics** - Measures how fast you reacquire targets after direction changes
- **UUID-Based User System** - Scores persist across sessions with nickname support
- **LAN Leaderboard Sync** - Share scores across devices on the same network
- **Anti-Cheat** - Detects browser resize attempts during gameplay
- **First-Load Nickname Prompt** - New users set their nickname immediately

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
cd hudaim

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Running the Application

**Development Mode (Frontend only):**
```bash
npm run dev
```

**With Leaderboard Server (Full LAN support):**
```bash
# Terminal 1 - Start the backend
cd server
node index.js

# Terminal 2 - Start the frontend
npm run dev
```

### Access
- **Local**: http://localhost:5174
- **LAN**: http://[your-ip]:5174
- **Backend API**: http://[your-ip]:3001

## 📁 Project Structure

```
hudaim/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── Settings.jsx
│   │   └── NicknamePrompt.jsx
│   ├── pages/            # Game pages
│   │   ├── Home.jsx
│   │   ├── ReactionTime.jsx
│   │   ├── AimTrainer.jsx
│   │   ├── GridShot.jsx
│   │   └── Tracking.jsx
│   ├── utils/            # Utility functions
│   │   └── leaderboard.js
│   ├── App.jsx
│   └── main.jsx
├── server/               # Express backend for LAN sync
│   ├── index.js
│   └── package.json
├── docs/                 # Documentation
└── package.json
```

## 🎯 Game Details

### Tracking Game
- **Duration**: 30 seconds
- **Target Size**: 72px diameter
- **Difficulty Levels**: Easy → Easy+ → Medium → Hard → Insane
- **Scoring**: Points accumulate faster at higher difficulties (up to 5x multiplier)

### Difficulty Thresholds
| Level | Accuracy Required | Point Multiplier | Time Bonus/sec |
|-------|------------------|------------------|----------------|
| Easy | 0-30% | 1x | 0 |
| Easy+ | 30-50% | 1.5x | +5 |
| Medium | 50-70% | 2x | +15 |
| Hard | 70-85% | 3x | +40 |
| Insane | 85%+ | 5x | +100 |

## 🔧 Configuration

### Vite Config (`vite.config.js`)
The server is configured to be accessible on LAN:
```javascript
server: {
  host: '0.0.0.0'
}
```

### Backend Port
Default: `3001` (configurable in `server/index.js`)

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard/:gameType` | Get leaderboard for a game |
| GET | `/api/leaderboard` | Get all leaderboards |
| POST | `/api/leaderboard/:gameType` | Add a score |
| PUT | `/api/nickname` | Update nickname for all scores |
| DELETE | `/api/leaderboard` | Clear all leaderboards |
| DELETE | `/api/leaderboard/:gameType` | Clear specific game leaderboard |

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

## 📚 Additional Documentation

- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [TECH_STACK.md](./TECH_STACK.md) - Technology details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Code architecture
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
