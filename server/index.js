const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'leaderboard.json');
const REPLAYS_DIR = path.join(__dirname, 'replays');

// Anti-cheat secret key
const ANTI_CHEAT_SECRET = process.env.ANTI_CHEAT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.ANTI_CHEAT_SECRET) {
  console.warn('WARNING: ANTI_CHEAT_SECRET not set — using random secret (sessions will not survive restarts)');
}

// Active game sessions (in production, use Redis or similar)
const activeSessions = new Map();
const SESSION_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Valid game types whitelist
const VALID_GAME_TYPES = ['aim', 'gridshot', 'tracking', 'switching', 'precision', 'reaction'];

// Admin secret for destructive operations
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for replay data

// Validate gameType parameter
const validateGameType = (req, res, next) => {
  const { gameType } = req.params;
  if (gameType && !VALID_GAME_TYPES.includes(gameType)) {
    return res.status(400).json({ error: `Invalid game type. Must be one of: ${VALID_GAME_TYPES.join(', ')}` });
  }
  next();
};

// Require admin secret for destructive operations
const requireAdmin = (req, res, next) => {
  if (!ADMIN_SECRET) {
    return res.status(403).json({ error: 'Admin operations disabled — set ADMIN_SECRET env var' });
  }
  const provided = req.headers['x-admin-secret'];
  if (!provided || provided !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Invalid admin secret' });
  }
  next();
};

// Validate replay ID (prevent path traversal)
const validateReplayId = (req, res, next) => {
  const { replayId } = req.params;
  if (replayId && !/^[a-zA-Z0-9_-]+$/.test(replayId)) {
    return res.status(400).json({ error: 'Invalid replay ID' });
  }
  next();
};

// Initialize replays directory
const initReplaysDir = () => {
  if (!fs.existsSync(REPLAYS_DIR)) {
    fs.mkdirSync(REPLAYS_DIR, { recursive: true });
  }
};

// Initialize data file if it doesn't exist
const initDataFile = () => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
  }
};

// Read leaderboard data
const readData = () => {
  try {
    initDataFile();
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading data:', err);
    return {};
  }
};

// Write leaderboard data
const writeData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing data:', err);
    return false;
  }
};

// GET /api/leaderboard/:gameType - Get leaderboard for a game
app.get('/api/leaderboard/:gameType', validateGameType, (req, res) => {
  const { gameType } = req.params;
  const data = readData();
  const leaderboard = (data[gameType] || [])
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json(leaderboard);
});

// GET /api/leaderboard - Get all leaderboards
app.get('/api/leaderboard', (req, res) => {
  const data = readData();
  res.json(data);
});

// ============ ANTI-CHEAT SYSTEM ============

// Validation helpers
const isValidNumber = (value) => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

const isValidString = (value) => {
  return typeof value === 'string' && value.length > 0 && value.length <= 100;
};

const isValidUUID = (uuid) => {
  if (typeof uuid !== 'string') return false;
  // Standard UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Game-specific maximum achievable scores and plausibility bounds
const GAME_BOUNDS = {
  aim: {
    maxScore: 3000,        // 30 targets × 100 max points each
    minAvgTime: 80,        // Minimum realistic avg reaction time (ms)
    maxAvgTime: 2000,      // Maximum reasonable avg time
    minAccuracy: 1,        // At least some accuracy required
  },
  gridshot: {
    maxScore: 25000,       // ~250 hits × 100 points max (30 sec, ~8 hits/sec max sustained)
    maxHitsPerSecond: 8,   // Maximum sustainable hit rate (top aimers can reach 7-9/sec)
    gameDuration: 30,
    minAccuracy: 10,
  },
  tracking: {
    maxScore: 5000,        // Based on difficulty multipliers and time
    gameDuration: 30,
    maxTrackingTime: 30,
  },
  switching: {
    maxScore: 15000,       // ~150 kills × 100 points (60 sec)
    maxKillsPerSecond: 2.5, // Maximum sustainable kill rate
    gameDuration: 60,
  },
  precision: {
    maxScore: 50000,       // kills × accuracy, theoretical max
    maxKillsPerSecond: 4,  // Maximum sustainable with 4 targets
    gameDuration: 60,
    minAccuracy: 5,
  },
  reaction: {
    minReactionTime: 100,  // World record is ~100ms, anything below is cheating
    maxReactionTime: 5000, // Reasonable upper bound
  },
};

// Generate HMAC signature for session validation
const generateSessionSignature = (sessionId, gameType, startTime) => {
  const data = `${sessionId}:${gameType}:${startTime}`;
  return crypto.createHmac('sha256', ANTI_CHEAT_SECRET).update(data).digest('hex');
};

// Verify session signature
const verifySessionSignature = (sessionId, gameType, startTime, signature) => {
  const expected = generateSessionSignature(sessionId, gameType, startTime);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.startTime > SESSION_EXPIRY) {
      activeSessions.delete(sessionId);
    }
  }
}, 60000); // Clean every minute

// Validate score plausibility based on game mechanics
const validateScorePlausibility = (gameType, score, stats, gameDuration) => {
  const bounds = GAME_BOUNDS[gameType];
  if (!bounds) {
    return { valid: false, error: 'Unknown game type' };
  }

  switch (gameType) {
    case 'aim': {
      // Check score bounds
      if (score > bounds.maxScore) {
        return { valid: false, error: `Score exceeds maximum possible (${bounds.maxScore})` };
      }
      // Check avg time plausibility
      if (stats.avgTime < bounds.minAvgTime) {
        return { valid: false, error: `Average time too fast (min ${bounds.minAvgTime}ms)` };
      }
      if (stats.avgTime > bounds.maxAvgTime) {
        return { valid: false, error: 'Average time too slow' };
      }
      // Check accuracy
      if (stats.accuracy < bounds.minAccuracy) {
        return { valid: false, error: 'Accuracy too low' };
      }
      // Verify score calculation: score should roughly match performance
      // Each target: max 100 pts (at 0ms) down to 10 pts (at 900ms+)
      // With 30 targets and miss penalties (-25 each), verify score is plausible
      // Note: Individual hits can be faster than avgTime, so use a generous tolerance
      // Max possible: 30 * 100 = 3000, minus misses
      const maxPossibleScore = bounds.maxScore;
      if (score > maxPossibleScore) {
        return { valid: false, error: 'Score exceeds maximum possible' };
      }
      // Sanity check: score shouldn't be impossibly high given avgTime
      // If avgTime is 500ms, typical score per hit is ~50, so 30 hits = ~1500
      // But faster individual hits can boost this, so allow 2x tolerance
      const typicalScorePerHit = Math.max(100 - Math.floor(stats.avgTime / 10), 10);
      const expectedTypicalScore = 30 * typicalScorePerHit;
      if (score > expectedTypicalScore * 2.5) { // 150% tolerance for variance
        return { valid: false, error: 'Score inconsistent with average time' };
      }
      break;
    }
    
    case 'gridshot': {
      if (score > bounds.maxScore) {
        return { valid: false, error: `Score exceeds maximum possible` };
      }
      // Check hits per second
      const hitsPerSecond = stats.hits / bounds.gameDuration;
      if (hitsPerSecond > bounds.maxHitsPerSecond) {
        return { valid: false, error: `Hit rate too high (${hitsPerSecond.toFixed(1)}/sec, max ${bounds.maxHitsPerSecond}/sec)` };
      }
      if (stats.accuracy < bounds.minAccuracy) {
        return { valid: false, error: 'Accuracy too low' };
      }
      break;
    }
    
    case 'tracking': {
      if (score > bounds.maxScore) {
        return { valid: false, error: 'Score exceeds maximum possible' };
      }
      const trackingTime = parseFloat(stats.trackingTime);
      if (trackingTime > bounds.maxTrackingTime) {
        return { valid: false, error: 'Tracking time exceeds game duration' };
      }
      break;
    }
    
    case 'switching': {
      if (score > bounds.maxScore) {
        return { valid: false, error: 'Score exceeds maximum possible' };
      }
      const killsPerSecond = stats.kills / bounds.gameDuration;
      if (killsPerSecond > bounds.maxKillsPerSecond) {
        return { valid: false, error: `Kill rate too high (${killsPerSecond.toFixed(1)}/sec)` };
      }
      // Verify score = kills × 100
      if (score !== stats.kills * 100) {
        return { valid: false, error: 'Score does not match kills' };
      }
      break;
    }
    
    case 'precision': {
      if (score > bounds.maxScore) {
        return { valid: false, error: 'Score exceeds maximum possible' };
      }
      const killsPerSecond = stats.kills / bounds.gameDuration;
      if (killsPerSecond > bounds.maxKillsPerSecond) {
        return { valid: false, error: `Kill rate too high (${killsPerSecond.toFixed(1)}/sec)` };
      }
      if (stats.accuracy < bounds.minAccuracy) {
        return { valid: false, error: 'Accuracy too low' };
      }
      // Verify score = kills × accuracy
      const expectedScore = stats.kills * stats.accuracy;
      if (Math.abs(score - expectedScore) > 1) { // Allow rounding error
        return { valid: false, error: 'Score does not match kills × accuracy' };
      }
      break;
    }
    
    case 'reaction': {
      if (stats.bestTime < bounds.minReactionTime) {
        return { valid: false, error: `Reaction time too fast (min ${bounds.minReactionTime}ms)` };
      }
      if (stats.averageTime > bounds.maxReactionTime) {
        return { valid: false, error: 'Reaction time too slow' };
      }
      // Best time must be <= average time
      if (stats.bestTime > stats.averageTime) {
        return { valid: false, error: 'Best time cannot exceed average time' };
      }
      // Verify score calculation: score = 500 - avgTime (clamped 0-500)
      const expectedScore = Math.max(0, Math.min(500, 500 - stats.averageTime));
      if (Math.abs(score - expectedScore) > 5) {
        return { valid: false, error: 'Score inconsistent with average time' };
      }
      break;
    }
  }

  return { valid: true };
};

// Legacy validation (basic stats check)
const validateScore = (gameType, score, stats) => {
  // Score must be a valid positive number
  if (!isValidNumber(score) || score < 0 || score > 1000000) {
    return { valid: false, error: 'Invalid score value' };
  }

  // Validate stats based on game type
  if (!stats || typeof stats !== 'object') {
    return { valid: false, error: 'Invalid stats object' };
  }

  switch (gameType) {
    case 'reaction':
      if (!isValidNumber(stats.averageTime) || !isValidNumber(stats.bestTime) ||
          stats.averageTime < GAME_BOUNDS.reaction.minReactionTime || 
          stats.bestTime < GAME_BOUNDS.reaction.minReactionTime ||
          stats.averageTime > GAME_BOUNDS.reaction.maxReactionTime || 
          stats.bestTime > GAME_BOUNDS.reaction.maxReactionTime) {
        return { valid: false, error: `Invalid reaction time (must be ${GAME_BOUNDS.reaction.minReactionTime}-${GAME_BOUNDS.reaction.maxReactionTime}ms)` };
      }
      if (stats.bestTime > stats.averageTime) {
        return { valid: false, error: 'Best time cannot be greater than average time' };
      }
      break;
    case 'aim':
      if (!isValidNumber(stats.accuracy) || stats.accuracy < 0 || stats.accuracy > 100) {
        return { valid: false, error: 'Invalid accuracy value' };
      }
      if (!isValidNumber(stats.avgTime) || stats.avgTime < GAME_BOUNDS.aim.minAvgTime) {
        return { valid: false, error: `Invalid average time (min ${GAME_BOUNDS.aim.minAvgTime}ms)` };
      }
      break;
    case 'gridshot':
      if (!isValidNumber(stats.accuracy) || stats.accuracy < 0 || stats.accuracy > 100) {
        return { valid: false, error: 'Invalid accuracy value' };
      }
      if (!isValidNumber(stats.hits) || stats.hits < 0) {
        return { valid: false, error: 'Invalid hits value' };
      }
      break;
    case 'tracking':
      if (!isValidString(stats.trackingTime) || !isValidNumber(stats.percentage) ||
          stats.percentage < 0 || stats.percentage > 100) {
        return { valid: false, error: 'Invalid tracking stats' };
      }
      break;
    case 'switching':
      if (!isValidNumber(stats.kills) || stats.kills < 0 || stats.kills > 1000) {
        return { valid: false, error: 'Invalid kills value' };
      }
      break;
    case 'precision':
      if (!isValidNumber(stats.kills) || stats.kills < 0 || stats.kills > 500) {
        return { valid: false, error: 'Invalid kills value' };
      }
      if (!isValidNumber(stats.accuracy) || stats.accuracy < 0 || stats.accuracy > 100) {
        return { valid: false, error: 'Invalid accuracy value' };
      }
      break;
  }

  return { valid: true };
};

// ============ SESSION MANAGEMENT ENDPOINTS ============

// POST /api/session/start - Start a new game session
app.post('/api/session/start', (req, res) => {
  const { gameType, uuid } = req.body;
  
  if (!gameType || !uuid) {
    return res.status(400).json({ error: 'gameType and uuid required' });
  }

  if (!VALID_GAME_TYPES.includes(gameType)) {
    return res.status(400).json({ error: `Invalid game type. Must be one of: ${VALID_GAME_TYPES.join(', ')}` });
  }

  if (!isValidUUID(uuid)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }
  
  const sessionId = crypto.randomUUID();
  const startTime = Date.now();
  const signature = generateSessionSignature(sessionId, gameType, startTime);
  
  activeSessions.set(sessionId, {
    gameType,
    uuid,
    startTime,
    signature,
  });
  
  res.json({
    sessionId,
    startTime,
    signature,
  });
});

// POST /api/session/end - End a game session and submit score
app.post('/api/session/end', (req, res) => {
  const { sessionId, signature, score, stats, nickname } = req.body;
  
  if (!sessionId || !signature) {
    return res.status(400).json({ error: 'Session credentials required' });
  }
  
  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }
  
  // Verify signature
  try {
    if (!verifySessionSignature(sessionId, session.gameType, session.startTime, signature)) {
      return res.status(403).json({ error: 'Invalid session signature' });
    }
  } catch (e) {
    return res.status(403).json({ error: 'Signature verification failed' });
  }
  
  // Check session duration
  const gameDuration = (Date.now() - session.startTime) / 1000;
  console.log(`[${session.gameType}] Session end request - Duration: ${gameDuration.toFixed(1)}s, Score: ${score}`);
  
  const expectedDurations = {
    aim: { min: 5, max: 120 },      // 30 targets, variable time
    gridshot: { min: 28, max: 35 }, // 30 second game
    tracking: { min: 28, max: 35 }, // 30 second game
    switching: { min: 58, max: 65 }, // 60 second game
    precision: { min: 58, max: 65 }, // 60 second game
    reaction: { min: 3, max: 60 },  // 5 rounds, variable
  };
  
  const expected = expectedDurations[session.gameType];
  if (expected && (gameDuration < expected.min || gameDuration > expected.max)) {
    console.log(`[${session.gameType}] Duration validation failed: ${gameDuration.toFixed(1)}s not in ${expected.min}-${expected.max}s`);
    activeSessions.delete(sessionId);
    return res.status(400).json({ 
      error: `Invalid game duration (${gameDuration.toFixed(1)}s, expected ${expected.min}-${expected.max}s)` 
    });
  }
  
  // Validate score
  const basicValidation = validateScore(session.gameType, score, stats);
  if (!basicValidation.valid) {
    console.log(`[${session.gameType}] Basic validation failed:`, basicValidation.error, { score, stats });
    activeSessions.delete(sessionId);
    return res.status(400).json({ error: basicValidation.error });
  }
  
  // Validate plausibility
  const plausibilityCheck = validateScorePlausibility(session.gameType, score, stats, gameDuration);
  if (!plausibilityCheck.valid) {
    console.log(`[${session.gameType}] Plausibility check failed:`, plausibilityCheck.error, { score, stats, gameDuration });
    activeSessions.delete(sessionId);
    return res.status(400).json({ error: plausibilityCheck.error });
  }
  
  console.log(`[${session.gameType}] Score validated successfully:`, { score, stats, gameDuration });
  
  // Clean up session
  activeSessions.delete(sessionId);
  
  // Save to leaderboard (reuse existing logic)
  const data = readData();
  const gameType = session.gameType;
  
  if (!data[gameType]) {
    data[gameType] = [];
  }
  
  const sanitizedNickname = (nickname || 'Player').trim().slice(0, 20);
  
  const existingIndex = data[gameType].findIndex(e => e.uuid === session.uuid);
  
  const newEntry = {
    uuid: session.uuid,
    nickname: sanitizedNickname,
    score: Math.round(score),
    stats: stats || {},
    date: new Date().toISOString(),
    verified: true, // Mark as verified through session system
  };
  
  if (existingIndex >= 0) {
    if (score > data[gameType][existingIndex].score) {
      data[gameType][existingIndex] = newEntry;
    } else {
      data[gameType][existingIndex].nickname = sanitizedNickname;
    }
  } else {
    data[gameType].push(newEntry);
  }
  
  data[gameType] = data[gameType]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  writeData(data);
  res.json({ success: true, leaderboard: data[gameType] });
});

// POST /api/leaderboard/:gameType - Add a score
app.post('/api/leaderboard/:gameType', validateGameType, (req, res) => {
  const { gameType } = req.params;
  const { uuid, nickname, score, stats } = req.body;

  // Validate required fields
  if (!nickname || score === undefined) {
    return res.status(400).json({ error: 'nickname and score are required' });
  }

  // Validate nickname
  if (!isValidString(nickname) || nickname.length > 20) {
    return res.status(400).json({ error: 'Invalid nickname' });
  }

  // Validate score and stats
  const validation = validateScore(gameType, score, stats);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const data = readData();
  
  if (!data[gameType]) {
    data[gameType] = [];
  }

  // Find by UUID if provided, otherwise by nickname
  const existingIndex = uuid 
    ? data[gameType].findIndex(e => e.uuid === uuid)
    : data[gameType].findIndex(e => e.nickname === nickname);
    
  // Sanitize nickname
  const sanitizedNickname = nickname.trim().slice(0, 20);

  const newEntry = {
    uuid: uuid || null,
    nickname: sanitizedNickname,
    score: Math.round(score),
    stats: stats || {},
    date: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    // Only update if new score is better
    if (score > data[gameType][existingIndex].score) {
      data[gameType][existingIndex] = newEntry;
    } else {
      // Update nickname even if score isn't better
      data[gameType][existingIndex].nickname = nickname;
    }
  } else {
    data[gameType].push(newEntry);
  }

  // Sort and keep top 10
  data[gameType] = data[gameType]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  writeData(data);
  res.json(data[gameType]);
});

// PUT /api/nickname - Update nickname for all scores with given UUID
app.put('/api/nickname', (req, res) => {
  const { uuid, nickname } = req.body;

  if (!uuid || !nickname) {
    return res.status(400).json({ error: 'uuid and nickname are required' });
  }

  const data = readData();
  
  // Update nickname in all game types
  Object.keys(data).forEach(gameType => {
    data[gameType].forEach(entry => {
      if (entry.uuid === uuid) {
        entry.nickname = nickname;
      }
    });
  });

  writeData(data);
  res.json({ success: true });
});

// DELETE /api/leaderboard - Clear all leaderboard data
app.delete('/api/leaderboard', requireAdmin, (req, res) => {
  writeData({});
  res.json({ success: true });
});

// DELETE /api/leaderboard/:gameType - Clear leaderboard for a game
app.delete('/api/leaderboard/:gameType', requireAdmin, validateGameType, (req, res) => {
  const { gameType } = req.params;
  const data = readData();
  delete data[gameType];
  writeData(data);
  res.json({ success: true });
});

// ============ REPLAY API ENDPOINTS ============

// Helper: Get replay file path
const getReplayPath = (replayId) => path.join(REPLAYS_DIR, `${replayId}.json`);

// Helper: Get all replays for a game type
const getReplaysForGame = (gameType) => {
  initReplaysDir();
  const files = fs.readdirSync(REPLAYS_DIR);
  const replays = [];
  
  files.forEach(file => {
    if (file.endsWith('.json')) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(REPLAYS_DIR, file), 'utf8'));
        if (data.gameType === gameType) {
          // Return metadata only, not full frame data
          replays.push({
            id: data.id,
            gameType: data.gameType,
            userId: data.userId,
            nickname: data.nickname,
            score: data.score,
            duration: data.duration,
            timestamp: data.timestamp
          });
        }
      } catch (err) {
        console.error(`Error reading replay file ${file}:`, err);
      }
    }
  });
  
  return replays.sort((a, b) => b.score - a.score).slice(0, 3);
};

// Helper: Check if score qualifies for top 3
const isTop3Score = (gameType, score) => {
  const data = readData();
  const leaderboard = data[gameType] || [];
  
  if (leaderboard.length < 3) return true;
  
  const sortedScores = [...leaderboard].sort((a, b) => b.score - a.score);
  const top3MinScore = sortedScores[2]?.score || 0;
  
  return score >= top3MinScore;
};

// Helper: Clean up old replays (keep only top 3 per game type)
const cleanupReplays = (gameType) => {
  const replays = getReplaysForGame(gameType);
  const data = readData();
  const leaderboard = (data[gameType] || []).sort((a, b) => b.score - a.score).slice(0, 3);
  const top3UserIds = leaderboard.map(e => e.uuid);
  
  // Get all replay files for this game type
  initReplaysDir();
  const files = fs.readdirSync(REPLAYS_DIR);
  
  files.forEach(file => {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(REPLAYS_DIR, file);
        const replayData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (replayData.gameType === gameType) {
          // Delete if not in top 3
          if (!top3UserIds.includes(replayData.userId)) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up replay: ${file}`);
          }
        }
      } catch (err) {
        console.error(`Error processing replay file ${file}:`, err);
      }
    }
  });
};

// POST /api/replay - Upload a replay (only accepts top 3 scores)
app.post('/api/replay', (req, res) => {
  const replayData = req.body;

  // Validate required fields
  if (!replayData.id || !replayData.gameType || !replayData.userId ||
      !replayData.frames || !Array.isArray(replayData.frames)) {
    return res.status(400).json({ error: 'Invalid replay data' });
  }

  // Validate replay ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(replayData.id)) {
    return res.status(400).json({ error: 'Invalid replay ID format' });
  }

  // Validate game type
  if (!VALID_GAME_TYPES.includes(replayData.gameType)) {
    return res.status(400).json({ error: 'Invalid game type' });
  }
  
  // Check if score qualifies for top 3
  if (!isTop3Score(replayData.gameType, replayData.score)) {
    return res.status(403).json({ 
      error: 'Score does not qualify for top 3',
      message: 'Only top 3 scores are saved to server'
    });
  }
  
  // Save replay
  initReplaysDir();
  const filePath = getReplayPath(replayData.id);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(replayData));
    
    // Clean up old replays for this game type
    cleanupReplays(replayData.gameType);
    
    res.json({ success: true, id: replayData.id });
  } catch (err) {
    console.error('Error saving replay:', err);
    res.status(500).json({ error: 'Failed to save replay' });
  }
});

// GET /api/replay/:replayId - Get a specific replay
app.get('/api/replay/:replayId', validateReplayId, (req, res) => {
  const { replayId } = req.params;
  const filePath = getReplayPath(replayId);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Replay not found' });
  }
  
  try {
    const replayData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(replayData);
  } catch (err) {
    console.error('Error reading replay:', err);
    res.status(500).json({ error: 'Failed to read replay' });
  }
});

// GET /api/replays/:gameType - Get all replays for a game type (metadata only)
app.get('/api/replays/:gameType', validateGameType, (req, res) => {
  const { gameType } = req.params;
  const replays = getReplaysForGame(gameType);
  res.json(replays);
});

// DELETE /api/replay/:replayId - Delete a replay
app.delete('/api/replay/:replayId', requireAdmin, validateReplayId, (req, res) => {
  const { replayId } = req.params;
  const filePath = getReplayPath(replayId);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Replay not found' });
  }
  
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting replay:', err);
    res.status(500).json({ error: 'Failed to delete replay' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Leaderboard server running on http://0.0.0.0:${PORT}`);
  initDataFile();
  initReplaysDir();
});
