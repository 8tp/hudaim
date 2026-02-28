# Architecture

## Application Structure

```
hudaim/
├── src/
│   ├── pages/               # Game pages (routes)
│   ├── components/          # Reusable UI components
│   ├── utils/               # Utility functions
│   ├── App.jsx              # Root component with routing
│   └── main.jsx             # Entry point
├── server/                  # Express backend
├── docs/                    # Documentation
└── public/                  # Static assets
```

## Component Hierarchy

```
App.jsx
├── NicknamePrompt (conditional — first load only)
├── Navbar
│   └── Settings (modal)
└── Routes
    ├── Home
    ├── ReactionTime
    ├── AimTrainer
    ├── GridShot
    ├── Tracking
    ├── Switching
    ├── Precision
    └── Leaderboards
```

## Data Flow

### Leaderboard System

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Game Page   │───▶│  leaderboard │───▶│ localStorage │
│  (addScore)  │    │    .js       │    │   (instant)  │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼ (async)
                    ┌──────────────┐
                    │   Express    │
                    │   Server     │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ leaderboard  │
                    │    .json     │
                    └──────────────┘
```

### Anti-Cheat Session Flow

```
Client                       Server
  |                            |
  |-- POST /session/start ---->|
  |    { gameType, uuid }      |
  |                            |-- Generate sessionId
  |                            |-- HMAC-SHA256 sign (sessionId:gameType:startTime)
  |<-- { sessionId, sig } -----|
  |                            |
  |   [ gameplay runs ]        |
  |                            |
  |-- POST /session/end ------>|
  |    { sessionId, sig,       |-- Verify signature (timingSafeEqual)
  |      score, stats }        |-- Validate duration vs expected range
  |                            |-- Validate score plausibility
  |                            |-- Save to leaderboard if valid
  |<-- { leaderboard } --------|
```

### Replay System Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ ReplayRecord │───▶│  IndexedDB   │───▶│ Local replay │
│ (60fps)      │    │  (browser)   │    │  storage     │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼ (if top 3 score)
                    ┌──────────────┐
                    │   Express    │
                    │ POST /replay │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ server/      │
                    │ replays/*.json│
                    └──────────────┘
```

### User Identification Flow

```
First Visit:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ App.jsx     │───▶│ Nickname    │───▶│ Complete    │
│ checks      │    │ Prompt      │    │ Setup       │
│ hasSetup()  │    │ (modal)     │    │ (UUID+nick) │
└─────────────┘    └─────────────┘    └─────────────┘

Returning User:
┌─────────────┐    ┌─────────────┐
│ App.jsx     │───▶│ Load UUID   │
│ hasSetup()  │    │ & Nickname  │
│ = true      │    │ from local  │
└─────────────┘    └─────────────┘
```

## Game Architecture

### Common Game Pattern

Every game page follows the same structure:

```javascript
// React State (triggers re-renders — use sparingly)
const [gameState, setGameState] = useState('idle');  // 'idle' | 'playing' | 'ended'
const [timeLeft, setTimeLeft] = useState(duration);

// Refs (no re-renders — use for animation data)
const positionRef = useRef({ x: 300, y: 200 });
const velocityRef = useRef({ vx: 2, vy: 1.5 });
const animationRef = useRef(null);
```

### Animation Loop Pattern

```javascript
useEffect(() => {
  if (gameState !== 'playing') return;

  const animate = (timestamp) => {
    // 1. Calculate delta time
    const delta = lastFrameRef.current
      ? (timestamp - lastFrameRef.current) / 16.67
      : 1;

    // 2. Update physics (refs only)
    targetPosRef.current.x += velocityRef.current.vx * delta;

    // 3. Direct DOM updates (no React)
    targetRef.current.style.left = x + 'px';

    // 4. Schedule next frame
    animationRef.current = requestAnimationFrame(animate);
  };

  animationRef.current = requestAnimationFrame(animate);

  return () => cancelAnimationFrame(animationRef.current);
}, [gameState]);
```

### Game-Specific Notes

**Tracking** (most complex — 1028 lines)
- Adaptive difficulty with 5 tiers based on real-time accuracy
- 4 strafe patterns: Smooth, Reactive, Stutter, Zigzag
- Pattern weights shift toward harder patterns at higher difficulty
- Reaction time tracking for target reacquisition after direction changes
- Point multiplier scales from 1x (Easy) to 5x (Insane)

**Switching** (838 lines)
- 4 moving targets with independent movement and respawn
- 60-second time limit
- Score = kills x 100

**Precision** (692 lines)
- 4 simultaneous small targets (40px)
- 60-second time limit
- Score = kills x accuracy percentage

**Grid Shot** (721 lines)
- 3x3 grid with staggered target spawning
- Uses `Set` for O(1) target lookup
- `forceUpdate` pattern for controlled re-renders

**Aim Trainer** (693 lines)
- 30 sequential targets, untimed
- Score per target based on click speed (100 at 0ms down to 10 at 900ms+)
- Miss penalty: -25 points

**Reaction Time** (531 lines)
- 5 rounds with variable delay
- Score = 500 - averageTime (clamped 0–500)

## Key Modules

### `/src/utils/leaderboard.js`
- `addScore(gameType, score, stats)` — save score locally + background server sync
- `getUserUUID()` / `getNickname()` / `setNickname()` — identity management
- `hasCompletedSetup()` / `completeSetup(nickname)` — first-run flow
- `syncLeaderboard()` / `syncAllLeaderboards()` — pull from server
- `clearLeaderboard(gameType?)` — reset scores

### `/src/utils/replay.js`
- `ReplayRecorder` class — captures frames at 60 FPS (time, x, y, events)
- `ReplayPlayer` class — playback with speed control, seek, pause
- `saveReplayLocal()` / `getLocalReplays()` — IndexedDB persistence
- `uploadReplayToServer()` — uploads replay if score qualifies for top 3

### `/src/utils/gameSession.js`
- `startGameSession(gameType)` — requests signed session from server
- `endGameSession(sessionId, score, stats)` — submits score with signature

### `/server/index.js`
- Leaderboard CRUD with top-10 sorting
- HMAC-SHA256 session management with 5-minute expiry
- Per-game score plausibility validation
- Replay storage with automatic cleanup (keeps top 3 per game)
- Nickname sync across all scores

## Difficulty System (Tracking)

| Difficulty | Accuracy | Base Speed | Max Speed | Strafe Interval |
|------------|----------|------------|-----------|-----------------|
| Easy | 0–30% | 2 | 3.5 | Long |
| Easy+ | 30–50% | 2.5 | 4.5 | Medium-long |
| Medium | 50–70% | 3 | 5.5 | Medium |
| Hard | 70–85% | 3.5 | 6.5 | Short |
| Insane | 85%+ | 4 | 7.5 | Very short |

### Pattern Weights by Difficulty

| Difficulty | Smooth | Reactive | Stutter | Zigzag |
|------------|--------|----------|---------|--------|
| Easy | 70% | 20% | 10% | 0% |
| Easy+ | 40% | 35% | 15% | 10% |
| Medium | 20% | 40% | 20% | 20% |
| Hard | 10% | 35% | 25% | 30% |
| Insane | 5% | 30% | 30% | 35% |

## Anti-Cheat Implementation

### Client-Side Detection

```javascript
// Store initial bounds on game start
initialBoundsRef.current = { width, height };

// Check every frame
if (Math.abs(currentWidth - initialWidth) > initialWidth * 0.05) {
  cheatedRef.current = true;
}

// On game end
if (cheatedRef.current) {
  // Score = 0, difficulty = "CHEATED"
}
```

### Server-Side Validation

1. **Signature verification** — HMAC-SHA256 with `crypto.timingSafeEqual`
2. **Duration check** — game length must fall within expected range per game type
3. **Score plausibility** — per-game bounds (max score, max hits/sec, min reaction time)
4. **Score calculation** — server re-derives expected score from stats and compares

## Styling Approach

All components use inline style objects with a consistent color palette:

| Role | Color |
|------|-------|
| Primary | `#a855f7` (purple) |
| Secondary | `#ec4899` (pink) |
| Accent | `#22d3ee` (cyan) |
| Success | `#22c55e` (green) |
| Warning | `#facc15` (yellow) |
| Error | `#ef4444` (red) |
| Background | `#0f172a`, `#1e293b` |
| Text | `white`, `#94a3b8` |

## Error Handling

- localStorage operations wrapped in try-catch
- Server requests use `.catch(() => {})` for graceful failure
- Offline mode automatically falls back to local storage
- Replay upload failures are silent — local copy always persists
