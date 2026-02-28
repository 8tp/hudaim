# Technology Stack

## Frontend

### Core Framework
- **React 18** - UI library with hooks-based architecture
- **Vite** - Fast build tool and development server

### Routing
- **React Router DOM v6** - Client-side routing

### Icons
- **Lucide React** - Modern icon library (Home, Zap, Target, Grid3X3, Move, Settings, etc.)

### Styling
- **Inline Styles** - CSS-in-JS approach using style objects
- **No external CSS framework** - Custom styling for full control

### State Management
- **React Hooks** - useState, useRef, useEffect
- **Refs for Performance** - Direct DOM manipulation in animation loops to avoid re-renders

## Backend

### Server
- **Express.js** - Minimal Node.js web framework
- **CORS** - Cross-origin resource sharing middleware

### Data Storage
- **File-based JSON** - `leaderboard.json` for persistent storage
- **localStorage** - Client-side storage for offline support

## Key Technical Decisions

### Performance Optimization

#### Tracking Game
```javascript
// Direct DOM manipulation instead of React state
if (targetRef.current) {
  targetRef.current.style.left = x + 'px';
  targetRef.current.style.top = y + 'px';
}
```
- Uses `requestAnimationFrame` for smooth 60fps animation
- Refs store game state to avoid triggering re-renders
- Only timer updates trigger React state changes (1/second)

#### GridShot Game
```javascript
const activeTargets = useRef(new Set());
const clickedTargets = useRef(new Set());
```
- Uses `Set` for O(1) target lookup
- `forceUpdate` pattern for controlled re-renders

### User Identification
```javascript
// UUID generation
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
```
- UUID stored in localStorage
- Scores linked by UUID, displayed by nickname
- Nickname changes propagate to all historical scores

### Hybrid Storage Architecture
```
┌─────────────────┐     ┌─────────────────┐
│   localStorage  │────▶│  Immediate UI   │
│   (Primary)     │     │    Response     │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Express Server │────▶│   LAN Sync      │
│   (Secondary)   │     │   Background    │
└─────────────────┘     └─────────────────┘
```
- Local storage provides instant response
- Server sync happens in background
- Works offline (graceful degradation)

## Dependencies

### Frontend (`package.json`)
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "lucide-react": "^0.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x"
  }
}
```

### Backend (`server/package.json`)
```json
{
  "dependencies": {
    "express": "^4.18.x",
    "cors": "^2.8.x"
  }
}
```

## Browser Support
- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Requires JavaScript enabled
- localStorage required for score persistence

## Development Tools
- **ESLint** - Code linting
- **Vite HMR** - Hot module replacement for fast development

## Network Configuration
- Frontend: Port 5174 (Vite default)
- Backend: Port 3001
- Both configured for LAN access (`host: '0.0.0.0'`)
