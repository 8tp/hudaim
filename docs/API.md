# API Documentation

## Base URL
```
http://[hostname]:3001/api
```

The API automatically uses the same hostname as the frontend for LAN compatibility.

## Endpoints

### Get Leaderboard

**GET** `/leaderboard/:gameType`

Retrieve the leaderboard for a specific game.

**Parameters:**
- `gameType` (path) - Game identifier: `reaction`, `aim`, `gridshot`, `tracking`

**Response:**
```json
[
  {
    "uuid": "abc123-...",
    "nickname": "Player1",
    "score": 2500,
    "stats": {
      "trackingTime": "25.5",
      "percentage": 85,
      "reactionTime": 180,
      "difficulty": "Hard"
    },
    "date": "2026-01-07T20:30:00.000Z"
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
  "reaction": [...]
}
```

---

### Add Score

**POST** `/leaderboard/:gameType`

Add a new score to the leaderboard.

**Parameters:**
- `gameType` (path) - Game identifier

**Request Body:**
```json
{
  "uuid": "abc123-...",
  "nickname": "Player1",
  "score": 2500,
  "stats": {
    "trackingTime": "25.5",
    "percentage": 85
  }
}
```

**Response:**
Returns the updated leaderboard array for that game type.

**Notes:**
- If UUID exists, only updates if new score is higher
- Always updates nickname even if score isn't higher
- Leaderboard is sorted by score (descending) and limited to top 10

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

**Notes:**
- Updates nickname in ALL game leaderboards
- Used when user changes their nickname in settings

---

### Clear All Leaderboards

**DELETE** `/leaderboard`

Clear all leaderboard data.

**Response:**
```json
{
  "success": true
}
```

---

### Clear Game Leaderboard

**DELETE** `/leaderboard/:gameType`

Clear leaderboard for a specific game.

**Parameters:**
- `gameType` (path) - Game identifier

**Response:**
```json
{
  "success": true
}
```

---

## Game Types

| Game Type | Description |
|-----------|-------------|
| `reaction` | Reaction Time test |
| `aim` | Aim Trainer |
| `gridshot` | Grid Shot |
| `tracking` | Tracking game |

## Stats Objects by Game

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

### Grid Shot
```json
{
  "hits": 45,
  "accuracy": 90
}
```

### Aim Trainer
```json
{
  "accuracy": 85,
  "averageTime": 450
}
```

### Reaction Time
```json
{
  "averageTime": 215,
  "bestTime": 180
}
```

## Error Responses

**400 Bad Request**
```json
{
  "error": "nickname and score are required"
}
```

**500 Internal Server Error**
```json
{
  "error": "Error message"
}
```

## Data Storage

The server stores data in `leaderboard.json` in the server directory:

```json
{
  "tracking": [...],
  "gridshot": [...],
  "aim": [...],
  "reaction": [...]
}
```

File is created automatically if it doesn't exist.

## CORS

CORS is enabled for all origins to support LAN access from any device.

## Client Integration

The frontend uses a hybrid approach:

1. **Local Storage** - Primary storage for instant response
2. **Server Sync** - Background sync for LAN sharing

```javascript
// From leaderboard.js
export const addScore = (gameType, score, stats = {}) => {
  // Save locally first (instant)
  const localResult = addScoreLocal(gameType, newEntry);
  
  // Sync to server in background (async)
  syncScoreToServer(gameType, uuid, nickname, score, stats).catch(() => {});
  
  return localResult;
};
```

This ensures the app works offline while still syncing when the server is available.
