# Contributing to HudAim

## Development Setup

### Prerequisites
- Node.js 18+
- npm
- Git

### Getting Started

```sh
# Install dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Start development server
npm run dev

# In another terminal, start the backend (optional, for LAN sync)
cd server && node index.js
```

## Code Style

### General
- Functional components with hooks
- `const` over `let`, never `var`
- Meaningful variable names
- Small, focused functions

### State vs Refs

```javascript
// Use STATE for UI that needs to re-render
const [gameState, setGameState] = useState('idle');

// Use REFS for animation data (no re-renders)
const positionRef = useRef({ x: 0, y: 0 });
```

### Animation Loops

```javascript
useEffect(() => {
  if (gameState !== 'playing') return;

  const animate = (timestamp) => {
    // Update physics using refs
    // Update DOM directly
    animationRef.current = requestAnimationFrame(animate);
  };

  animationRef.current = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationRef.current);
}, [gameState]);
```

### Styling

Use inline style objects with the project color palette:

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

## Adding a New Game

### 1. Create the Page Component

```javascript
// src/pages/NewGame.jsx
import { useState, useRef, useEffect } from 'react';
import { RotateCcw, Trophy, Play, User } from 'lucide-react';
import { getLeaderboard, addScore, getNickname } from '../utils/leaderboard';
import { ReplayRecorder } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import FixedGameArea from '../components/FixedGameArea';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';

export default function NewGame() {
  const [gameState, setGameState] = useState('idle');
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('newgame'));

  // Game logic...

  const handleGameEnd = () => {
    const newLeaderboard = addScore('newgame', score, { /* stats */ });
    setLeaderboard(newLeaderboard);
  };

  return (
    // JSX...
  );
}
```

### 2. Add Route in App.jsx

```javascript
import NewGame from './pages/NewGame';

// In Routes:
<Route path="/newgame" element={<NewGame />} />
```

### 3. Add to Navbar

```javascript
// In Navbar.jsx, add to navLinks array:
{ path: '/newgame', label: 'New Game', icon: GameIcon }
```

### 4. Add to Home Page

Add a card in `Home.jsx` linking to the new game.

### 5. Add Anti-Cheat Bounds

In `server/index.js`, add bounds to `GAME_BOUNDS`:

```javascript
newgame: {
  maxScore: 10000,
  gameDuration: 30,
  // ... game-specific constraints
},
```

And add duration bounds to `expectedDurations` in the session end handler.

### 6. Add Stats Schema

Document the stats object in `docs/API.md` under "Stats Objects by Game".

## Leaderboard Integration

### Saving Scores

```javascript
import { addScore } from '../utils/leaderboard';

const newLeaderboard = addScore('gametype', score, {
  accuracy: 95,
  time: 30,
});
```

### Replay Recording

```javascript
import { ReplayRecorder, saveReplayLocal } from '../utils/replay';

// Start recording
const recorder = new ReplayRecorder('gametype');
recorder.start();

// Each frame: record mouse position and events
recorder.addFrame(mouseX, mouseY, events);

// End recording
const replayData = recorder.stop();
await saveReplayLocal(replayData);
```

### Anti-Cheat Session

```javascript
import { startGameSession, endGameSession } from '../utils/gameSession';

// Before gameplay
const session = await startGameSession('gametype');

// After gameplay
await endGameSession(session.sessionId, score, stats);
```

## Testing

### Manual Checklist
- [ ] Game starts and ends correctly
- [ ] Score saves to leaderboard
- [ ] Replay records and plays back
- [ ] Post-game analytics display
- [ ] Nickname changes update all scores
- [ ] Works offline (no server)
- [ ] Works on LAN with server
- [ ] Reset button works
- [ ] No console errors
- [ ] Smooth 60 FPS in animation loop
- [ ] No memory leaks (check browser dev tools)

## Git Workflow

### Branch Naming
- `feature/game-name` — new games
- `fix/issue-description` — bug fixes
- `improve/component-name` — improvements

### Commit Messages
```
feat: add spider shot game mode
fix: tracking reaction time not updating
improve: optimize gridshot target rendering
docs: update API reference with new endpoints
```

## Common Issues

### Animation Lag
- Use refs instead of state for animation data
- Use direct DOM manipulation in animation loops
- Avoid creating new objects/arrays in animation loops

### Leaderboard Not Showing
- Verify game type string matches in `addScore` and `getLeaderboard`
- Check localStorage in browser dev tools

### Server Connection Issues
- Ensure server is running on port 3001
- Check CORS is enabled
- Verify `VITE_API_URL` environment variable

## Questions?

Open an issue or check existing documentation in the `/docs` folder.
