# Tech Stack

## Frontend

### Core

- **React 19** — functional components with hooks (`useState`, `useRef`, `useEffect`)
- **React Router 7** — client-side routing with `BrowserRouter`
- **Vite 7** — build tool, dev server, HMR

### Styling

- **TailwindCSS 4** — utility classes via `@tailwindcss/vite` plugin
- **Inline styles** — CSS-in-JS style objects for component-specific styling

### Icons

- **Lucide React** — tree-shakeable SVG icon library

### State Management

- **React Hooks** — `useState` for UI, `useRef` for animation data
- **Direct DOM manipulation** — in animation loops to avoid re-render overhead
- **localStorage** — persistent client-side storage for scores and identity

## Backend

### Server

- **Express 4** — HTTP API server
- **CORS** — cross-origin middleware for LAN access
- **Node.js crypto** — HMAC-SHA256 for session signing

### Data Storage

- **JSON files** — `leaderboard.json` for scores, `replays/*.json` for replay data
- **localStorage** — client-side score cache (primary, instant)
- **IndexedDB** — browser-native storage for replay frame data

## Key Technical Decisions

### Performance — Refs Over State

Game animation runs at 60 FPS. Using React state for position/velocity would trigger 60 re-renders per second. Instead, refs hold all animation data and DOM nodes are updated directly:

```javascript
// Refs: no re-renders
const positionRef = useRef({ x: 300, y: 200 });
const targetRef = useRef(null);

// Direct DOM update in animation loop
targetRef.current.style.left = positionRef.current.x + 'px';
```

Only the timer (1 update/second) and game state transitions trigger React re-renders.

### Offline-First Storage

```
┌─────────────────┐     ┌─────────────────┐
│   localStorage  │────▶│  Immediate UI   │
│   (Primary)     │     │    Response      │
└─────────────────┘     └─────────────────┘
         │
         ▼ (background, fire-and-forget)
┌─────────────────┐     ┌─────────────────┐
│  Express Server │────▶│   LAN Sync      │
│   (Secondary)   │     │   Shared Board  │
└─────────────────┘     └─────────────────┘
```

All games work without the backend. Server sync uses `.catch(() => {})` — failures are silent.

### Anti-Cheat — HMAC Sessions

Rather than trusting client-submitted scores, the server:
1. Issues a signed session ID before gameplay starts
2. Verifies the signature on submission using `crypto.timingSafeEqual`
3. Checks that game duration matches expected range
4. Validates score plausibility per game type (hit rate, accuracy bounds, score calculation)

### Replay Recording — IndexedDB

Replays capture 60 frames/second with mouse position and game events. This generates large datasets (30s game = ~1800 frames). IndexedDB handles this better than localStorage:
- No 5MB size limit
- Async API doesn't block the main thread
- Structured cloning for complex objects

### UUID-Based Identity

```javascript
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
```

- UUID stored in localStorage, persists across sessions
- Scores linked by UUID, displayed by nickname
- Nickname changes propagate to all historical scores (both local and server)

## Dependencies

### Frontend (`package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI library |
| react-dom | ^19.2.0 | DOM renderer |
| react-router-dom | ^7.11.0 | Client-side routing |
| lucide-react | ^0.562.0 | Icon library |
| tailwindcss | ^4.1.18 | Utility CSS |
| vite | ^7.2.4 | Build tool |
| @vitejs/plugin-react | ^5.1.1 | React fast refresh |
| @tailwindcss/vite | ^4.1.18 | Tailwind Vite integration |
| eslint | ^9.39.1 | Code linting |

### Backend (`server/package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web framework |
| cors | ^2.8.5 | Cross-origin support |

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)
- Requires JavaScript, localStorage, and IndexedDB
- `requestAnimationFrame` for game rendering

## Network Configuration

- Frontend: port 5174 (Vite default)
- Backend: port 3001
- Both bind to `0.0.0.0` for LAN access
