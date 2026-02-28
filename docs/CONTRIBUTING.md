# Contributing to HudAim

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Getting Started

```bash
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

### General Guidelines
- Use functional components with hooks
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Keep functions small and focused

### React Patterns

#### State vs Refs
```javascript
// Use STATE for UI that needs to re-render
const [gameState, setGameState] = useState('idle');

// Use REFS for animation data (no re-renders)
const positionRef = useRef({ x: 0, y: 0 });
```

#### Animation Loops
```javascript
// Always use requestAnimationFrame for smooth animations
useEffect(() => {
  let running = true;
  
  const animate = (timestamp) => {
    if (!running) return;
    // ... animation logic
    requestAnimationFrame(animate);
  };
  
  requestAnimationFrame(animate);
  
  return () => { running = false; };
}, [dependency]);
```

### Styling
- Use inline style objects (no external CSS)
- Define styles at the top of the component file
- Use consistent color palette:
  - Primary: `#a855f7` (purple)
  - Secondary: `#ec4899` (pink)
  - Accent: `#22d3ee` (cyan)
  - Success: `#22c55e` (green)
  - Warning: `#facc15` (yellow)
  - Error: `#ef4444` (red)
  - Background: `#0f172a`, `#1e293b`
  - Text: `white`, `#94a3b8`

## Adding a New Game

### 1. Create the Page Component

```javascript
// src/pages/NewGame.jsx
import { useState, useRef, useEffect } from 'react';
import { GameIcon, RotateCcw, Trophy, Play, User } from 'lucide-react';
import { getLeaderboard, addScore, getNickname, setNickname } from '../utils/leaderboard';

const styles = {
  // ... define styles
};

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

## Leaderboard Integration

### Saving Scores
```javascript
import { addScore } from '../utils/leaderboard';

// When game ends:
const newLeaderboard = addScore('gametype', score, {
  // Optional stats object
  accuracy: 95,
  time: 30,
});
```

### Displaying Leaderboard
```javascript
{leaderboard.length > 0 && (
  <div style={styles.leaderboardSection}>
    <h3>Leaderboard</h3>
    {leaderboard.map((entry, i) => (
      <div key={i}>
        #{i + 1} {entry.nickname} - {entry.score}
      </div>
    ))}
  </div>
)}
```

## Testing

### Manual Testing Checklist
- [ ] Game starts correctly
- [ ] Game ends and shows results
- [ ] Score is saved to leaderboard
- [ ] Nickname changes update all scores
- [ ] Game works offline (no server)
- [ ] Game works on LAN with server
- [ ] Reset button works
- [ ] No console errors

### Performance Testing
- Check for smooth 60fps in animation games
- Verify no memory leaks (check browser dev tools)
- Test on different screen sizes

## Git Workflow

### Branch Naming
- `feature/game-name` - New games
- `fix/issue-description` - Bug fixes
- `improve/component-name` - Improvements

### Commit Messages
```
feat: add spider shot game mode
fix: tracking reaction time not updating
improve: optimize gridshot target rendering
docs: update README with new features
```

## File Structure for New Features

```
src/
├── components/
│   └── NewComponent.jsx    # Reusable components
├── pages/
│   └── NewGame.jsx         # New game pages
└── utils/
    └── newUtility.js       # New utilities
```

## Common Issues

### Animation Lag
- Use refs instead of state for animation data
- Use direct DOM manipulation in animation loops
- Avoid creating new objects/arrays in animation loops

### Leaderboard Not Showing
- Check that `leaderboard.length > 0`
- Verify game type string matches in `addScore` and `getLeaderboard`
- Check localStorage in browser dev tools

### Server Connection Issues
- Ensure server is running on port 3001
- Check CORS is enabled
- Verify `API_BASE` URL in leaderboard.js

## Questions?

Open an issue or check existing documentation in the `/docs` folder.
