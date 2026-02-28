# Architecture Overview

## Application Structure

```
hudaim/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/               # Game pages (routes)
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
├── NicknamePrompt (conditional - first load only)
├── Navbar
│   └── Settings (modal)
└── Routes
    ├── Home
    ├── ReactionTime
    ├── AimTrainer
    ├── GridShot
    └── Tracking
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

### Tracking Game State Management

```javascript
// React State (triggers re-renders - use sparingly)
const [gameState, setGameState] = useState('idle');
const [timeLeft, setTimeLeft] = useState(30);

// Refs (no re-renders - use for animation data)
const targetPosRef = useRef({ x: 300, y: 200 });
const velocityRef = useRef({ vx: 2, vy: 1.5 });
const trackingTimeRef = useRef(0);
const isOnTargetRef = useRef(false);
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

## Key Files

### `/src/utils/leaderboard.js`
Central utility for all leaderboard operations:
- `getLeaderboard(gameType)` - Fetch scores
- `addScore(gameType, score, stats)` - Save score
- `getNickname()` / `setNickname(name)` - User identity
- `getUserUUID()` - Get/create user UUID
- `hasCompletedSetup()` - Check first-run status
- `completeSetup(nickname)` - Initialize new user
- `clearLeaderboard(gameType?)` - Reset scores

### `/src/pages/Tracking.jsx`
Most complex game with:
- Progressive difficulty system
- Multiple strafe patterns
- Reaction time tracking
- Anti-cheat detection
- Point accumulation system

### `/server/index.js`
Express server endpoints:
- CRUD operations for leaderboards
- Nickname sync across all scores
- File-based JSON storage

## Difficulty System (Tracking)

```javascript
const getDifficultySettings = (accuracy) => {
  // Returns: { baseSpeed, maxSpeed, strafeInterval, patternWeight }
  if (accuracy < 30) return { /* Easy */ };
  if (accuracy < 50) return { /* Easy+ */ };
  if (accuracy < 70) return { /* Medium */ };
  if (accuracy < 85) return { /* Hard */ };
  return { /* Insane */ };
};
```

### Pattern Weights by Difficulty

| Difficulty | Smooth | Reactive | Stutter | Zigzag |
|------------|--------|----------|---------|--------|
| Easy | 70% | 20% | 10% | 0% |
| Easy+ | 40% | 35% | 15% | 10% |
| Medium | 20% | 40% | 20% | 20% |
| Hard | 10% | 35% | 25% | 30% |
| Insane | 5% | 30% | 30% | 35% |

## Anti-Cheat Implementation

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

## Styling Approach

All components use inline style objects:

```javascript
const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  button: {
    padding: '1rem 2rem',
    background: 'linear-gradient(to right, #a855f7, #ec4899)',
    border: 'none',
    borderRadius: '0.75rem',
  },
};

// Usage
<div style={styles.container}>
  <button style={styles.button}>Click</button>
</div>
```

## Error Handling

- localStorage operations wrapped in try-catch
- Server requests use `.catch(() => {})` for graceful failure
- Offline mode automatically falls back to local storage
