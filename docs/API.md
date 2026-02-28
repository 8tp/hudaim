# API Reference

## Base URL

```
http://[hostname]:3001/api
```

The API automatically uses the same hostname as the frontend for LAN compatibility.

## Session Endpoints

### Start Game Session

**POST** `/session/start`

Begin a new anti-cheat validated game session.

**Request Body:**
```json
{
  "gameType": "tracking",
  "uuid": "abc123-..."
}
```

**Response:**
```json
{
  "sessionId": "f47ac10b-58cc-...",
  "startTime": 1704672600000,
  "signature": "a1b2c3d4e5f6..."
}
```

**Notes:**
- Session expires after 5 minutes
- Signature is HMAC-SHA256 of `sessionId:gameType:startTime`

---

### End Game Session

**POST** `/session/end`

Submit a score through the anti-cheat system. The server validates the signature, game duration, and score plausibility before saving.

**Request Body:**
```json
{
  "sessionId": "f47ac10b-58cc-...",
  "signature": "a1b2c3d4e5f6...",
  "score": 2500,
  "nickname": "Player1",
  "stats": {
    "trackingTime": "25.5",
    "percentage": 85,
    "reactionTime": 180,
    "difficulty": "Hard"
  }
}
```

**Response:**
```json
{
  "success": true,
  "leaderboard": [...]
}
```

**Error Responses:**
- `400` — Invalid or expired session, invalid duration, failed validation
- `403` — Invalid session signature

**Validation Steps:**
1. Verify session exists and hasn't expired
2. Verify HMAC-SHA256 signature with `crypto.timingSafeEqual`
3. Check game duration falls within expected range
4. Validate score and stats types/ranges
5. Check score plausibility against game-specific bounds

**Duration Bounds:**

| Game | Min (s) | Max (s) |
|------|---------|---------|
| aim | 5 | 120 |
| gridshot | 28 | 35 |
| tracking | 28 | 35 |
| switching | 58 | 65 |
| precision | 58 | 65 |
| reaction | 3 | 60 |

---

## Leaderboard Endpoints

### Get Leaderboard

**GET** `/leaderboard/:gameType`

Retrieve the top 10 scores for a specific game.

**Parameters:**
- `gameType` (path) — Game identifier: `reaction`, `aim`, `gridshot`, `tracking`, `switching`, `precision`

**Response:**
```json
[
  {
    "uuid": "abc123-...",
    "nickname": "Player1",
    "score": 2500,
    "stats": { ... },
    "date": "2026-01-07T20:30:00.000Z",
    "verified": true
  }
]
```

---

### Get All Leaderboards

**GET** `/leaderboard`

Retrieve all leaderboards for all games.

**Response:**
```json
{
  "tracking": [...],
  "gridshot": [...],
  "aim": [...],
  "reaction": [...],
  "switching": [...],
  "precision": [...]
}
```

---

### Add Score

**POST** `/leaderboard/:gameType`

Add a new score directly (legacy endpoint — prefer session-based submission).

**Request Body:**
```json
{
  "uuid": "abc123-...",
  "nickname": "Player1",
  "score": 2500,
  "stats": { ... }
}
```

**Response:** Returns the updated leaderboard array for that game type.

**Notes:**
- If UUID exists, only updates if new score is higher
- Always updates nickname even if score isn't higher
- Sorted by score (descending), limited to top 10
- Validates score and stats against game-specific bounds

---

### Update Nickname

**PUT** `/nickname`

Update nickname for all scores associated with a UUID.

**Request Body:**
```json
{
  "uuid": "abc123-...",
  "nickname": "NewNickname"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Clear Leaderboards

**DELETE** `/leaderboard` — Clear all leaderboard data

**DELETE** `/leaderboard/:gameType` — Clear leaderboard for a specific game

**Response:**
```json
{
  "success": true
}
```

---

## Replay Endpoints

### Upload Replay

**POST** `/replay`

Upload a gameplay replay. Only accepts replays for scores that qualify for the top 3.

**Request Body:**
```json
{
  "id": "replay-uuid",
  "gameType": "tracking",
  "userId": "user-uuid",
  "nickname": "Player1",
  "score": 2500,
  "duration": 30000,
  "timestamp": 1704672600000,
  "frames": [
    {
      "t": 0,
      "x": 400,
      "y": 300,
      "events": []
    },
    {
      "t": 16.67,
      "x": 405,
      "y": 298,
      "events": [{ "type": "spawn", "x": 200, "y": 150 }]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "id": "replay-uuid"
}
```

**Error Responses:**
- `400` — Invalid replay data (missing fields)
- `403` — Score does not qualify for top 3

**Notes:**
- Maximum request size: 10MB
- Old replays automatically cleaned up when new top-3 replays arrive

---

### Get Replay

**GET** `/replay/:replayId`

Retrieve a specific replay with all frame data.

**Response:** Full replay object including frames array.

**Error Responses:**
- `404` — Replay not found

---

### List Replays

**GET** `/replays/:gameType`

Get metadata for top replays of a game type (no frame data).

**Response:**
```json
[
  {
    "id": "replay-uuid",
    "gameType": "tracking",
    "userId": "user-uuid",
    "nickname": "Player1",
    "score": 2500,
    "duration": 30000,
    "timestamp": 1704672600000
  }
]
```

**Notes:**
- Returns top 3 replays sorted by score
- Frame data excluded for bandwidth efficiency

---

### Delete Replay

**DELETE** `/replay/:replayId`

Delete a specific replay.

**Response:**
```json
{
  "success": true
}
```

---

## Game Types

| Game Type | Description | Max Score |
|-----------|-------------|-----------|
| `reaction` | Reaction time test | 500 |
| `aim` | Aim trainer (30 targets) | 3,000 |
| `gridshot` | Grid shot (30s) | 25,000 |
| `tracking` | Tracking (30s) | 5,000 |
| `switching` | Target switching (60s) | 15,000 |
| `precision` | Precision (60s) | 50,000 |

## Stats Objects by Game

### Reaction Time
```json
{
  "averageTime": 215,
  "bestTime": 180
}
```

### Aim Trainer
```json
{
  "accuracy": 85,
  "avgTime": 450
}
```

### Grid Shot
```json
{
  "hits": 45,
  "accuracy": 90
}
```

### Tracking
```json
{
  "trackingTime": "25.5",
  "percentage": 85,
  "reactionTime": 180,
  "difficulty": "Hard",
  "difficultyBreakdown": {
    "easy": 5,
    "easyPlus": 8,
    "medium": 10,
    "hard": 7,
    "insane": 0
  }
}
```

### Target Switching
```json
{
  "kills": 25
}
```

### Precision
```json
{
  "kills": 40,
  "accuracy": 78
}
```

## Replay Frame Events

| Event Type | Fields | Description |
|------------|--------|-------------|
| `spawn` | `x`, `y`, `id` | Target appeared |
| `move` | `x`, `y`, `id` | Target moved |
| `hit` | `x`, `y`, `id` | Target was hit |
| `kill` | `x`, `y`, `id` | Target was killed |
| `despawn` | `id` | Target removed |
| `gridActivate` | `index` | Grid cell activated |
| `gridHit` | `index` | Grid cell hit |

## Data Storage

The server stores data in two locations:

- `server/leaderboard.json` — all scores (created automatically)
- `server/replays/*.json` — individual replay files (top 3 per game)

## CORS

CORS is enabled for all origins to support LAN access from any device.

## Client Integration

The frontend uses a hybrid storage approach:

```
1. Score saved to localStorage (instant)
2. Background sync to server (async, fire-and-forget)
3. Server validates and saves
4. Other clients poll for updates
```

This ensures the app works offline while syncing when the server is available.
