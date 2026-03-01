/**
 * Replay Recording and Playback System
 * 
 * Records mouse movements and game events at 60 FPS for replay functionality.
 * Stores replays locally in IndexedDB and uploads top 3 scores to server.
 */

const REPLAY_FPS = 60;
const FRAME_INTERVAL = 1000 / REPLAY_FPS; // ~16.67ms
const DB_NAME = 'hudaim_replays';
const DB_VERSION = 1;
const STORE_NAME = 'replays';

// IndexedDB setup
let db = null;

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('gameType', 'gameType', { unique: false });
        store.createIndex('score', 'score', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

/**
 * ReplayRecorder class - handles recording game sessions
 */
export class ReplayRecorder {
  constructor(gameType, gameConfig = {}) {
    this.gameType = gameType;
    this.gameConfig = gameConfig;
    this.frames = [];
    this.events = [];
    this.startTime = null;
    this.lastFrameTime = 0;
    this.isRecording = false;
    this.currentMousePos = { x: 0, y: 0 };
    this.pendingEvents = [];
  }

  start() {
    this.frames = [];
    this.events = [];
    this.startTime = performance.now();
    this.lastFrameTime = 0;
    this.isRecording = true;
    this.pendingEvents = [];
  }

  stop() {
    this.isRecording = false;
    // Capture final frame
    this._captureFrame(performance.now() - this.startTime);
  }

  recordMouseMove(x, y) {
    if (!this.isRecording) return;
    this.currentMousePos = { x: Math.round(x), y: Math.round(y) };
    
    const elapsed = performance.now() - this.startTime;
    
    // Capture frame at target FPS intervals
    if (elapsed - this.lastFrameTime >= FRAME_INTERVAL) {
      this._captureFrame(elapsed);
    }
  }

  recordEvent(type, data = {}) {
    if (!this.isRecording) return;
    const elapsed = performance.now() - this.startTime;
    this.pendingEvents.push({
      type,
      t: Math.round(elapsed),
      ...data
    });
  }

  _captureFrame(elapsed) {
    const frame = {
      t: Math.round(elapsed),
      mx: this.currentMousePos.x,
      my: this.currentMousePos.y,
    };
    
    // Attach any pending events to this frame
    if (this.pendingEvents.length > 0) {
      frame.e = this.pendingEvents;
      this.pendingEvents = [];
    }
    
    this.frames.push(frame);
    this.lastFrameTime = elapsed;
  }

  getReplayData(userId, nickname, score, stats = {}) {
    const duration = this.frames.length > 0 
      ? this.frames[this.frames.length - 1].t 
      : 0;
    
    return {
      id: `${this.gameType}_${userId}_${Date.now()}`,
      gameType: this.gameType,
      userId,
      nickname,
      score,
      stats,
      duration,
      gameConfig: this.gameConfig,
      frames: this.frames,
      timestamp: Date.now()
    };
  }
}

/**
 * Save replay to local IndexedDB
 */
export const saveReplayLocal = async (replayData) => {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(replayData);
      
      request.onsuccess = () => resolve(replayData.id);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save replay locally:', error);
    return null;
  }
};

/**
 * Get all local replays for a game type
 */
export const getLocalReplays = async (gameType) => {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('gameType');
      const request = index.getAll(gameType);
      
      request.onsuccess = () => {
        const replays = request.result.sort((a, b) => b.score - a.score);
        resolve(replays);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get local replays:', error);
    return [];
  }
};

/**
 * Get a specific local replay by ID
 */
export const getLocalReplay = async (replayId) => {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(replayId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get local replay:', error);
    return null;
  }
};

// Server API functions
const API_BASE = import.meta.env.VITE_API_URL || null;

/**
 * Upload replay to server (only for top 3 scores)
 */
export const uploadReplayToServer = async (replayData) => {
  if (!API_BASE) {
    return false; // No backend configured
  }

  try {
    const response = await fetch(`${API_BASE}/replay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replayData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.log('Replay not uploaded:', error.message || 'Not in top 3');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to upload replay:', error);
    return false;
  }
};

/**
 * Get replay from server by ID
 */
export const getServerReplay = async (replayId) => {
  if (!API_BASE) return null;

  try {
    const response = await fetch(`${API_BASE}/replay/${replayId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to get server replay:', error);
    return null;
  }
};

/**
 * Get all server replays for a game type (top 3 only)
 */
export const getServerReplays = async (gameType) => {
  if (!API_BASE) return [];

  try {
    const response = await fetch(`${API_BASE}/replays/${gameType}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Failed to get server replays:', error);
    return [];
  }
};

/**
 * Check if a score qualifies for top 3 (to determine if replay should be uploaded)
 */
export const checkIfTop3 = async (gameType, score) => {
  if (!API_BASE) return false; // No backend, don't attempt upload

  try {
    const response = await fetch(`${API_BASE}/leaderboard/${gameType}`);
    if (!response.ok) return true; // If can't fetch, assume it qualifies
    
    const leaderboard = await response.json();
    if (leaderboard.length < 3) return true;
    
    // Check if score beats any of the top 3
    const top3Scores = leaderboard.slice(0, 3).map(e => e.score);
    return score > Math.min(...top3Scores);
  } catch (error) {
    console.error('Failed to check top 3:', error);
    return false;
  }
};

/**
 * Save replay - saves locally and uploads to server if top 3
 */
export const saveReplay = async (replayData) => {
  // Always save locally
  await saveReplayLocal(replayData);
  
  // Check if qualifies for server upload (top 3)
  const isTop3 = await checkIfTop3(replayData.gameType, replayData.score);
  
  if (isTop3) {
    await uploadReplayToServer(replayData);
  }
  
  return replayData.id;
};

/**
 * ReplayPlayer class - handles playback of recorded replays
 */
export class ReplayPlayer {
  constructor(replayData, onFrame, onEvent, onComplete) {
    this.replay = replayData;
    this.onFrame = onFrame;
    this.onEvent = onEvent;
    this.onComplete = onComplete;
    this.currentFrameIndex = 0;
    this.isPlaying = false;
    this.playbackSpeed = 1;
    this.startTime = null;
    this.pausedAt = 0;
    this.animationFrameId = null;
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now() - this.pausedAt;
    this._tick();
  }

  pause() {
    this.isPlaying = false;
    this.pausedAt = performance.now() - this.startTime;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  stop() {
    this.isPlaying = false;
    this.currentFrameIndex = 0;
    this.pausedAt = 0;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  seekTo(timeMs) {
    const wasPlaying = this.isPlaying;
    
    // Stop current playback
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.isPlaying = false;
    
    // Reset to beginning and rebuild state
    this.currentFrameIndex = 0;
    this.pausedAt = timeMs;
    
    // Find the frame at this time
    const frameIndex = this._findFrameAtTime(timeMs);
    this.currentFrameIndex = frameIndex;
    
    // Emit the frame at this position
    if (frameIndex < this.replay.frames.length) {
      const frame = this.replay.frames[frameIndex];
      this.onFrame(frame, timeMs);
    }
    
    // Rebuild state by emitting all events up to this point
    this._emitEventsUpTo(timeMs);
    
    // Resume playback if it was playing
    if (wasPlaying) {
      this.startTime = performance.now() - (timeMs / this.playbackSpeed);
      this.isPlaying = true;
      this._tick();
    }
  }

  setSpeed(speed) {
    if (this.isPlaying) {
      const currentTime = (performance.now() - this.startTime) * this.playbackSpeed;
      this.playbackSpeed = speed;
      this.startTime = performance.now() - (currentTime / speed);
    } else {
      this.playbackSpeed = speed;
    }
  }

  getCurrentTime() {
    if (this.isPlaying) {
      return (performance.now() - this.startTime) * this.playbackSpeed;
    }
    return this.pausedAt;
  }

  getDuration() {
    return this.replay.duration;
  }

  _tick() {
    if (!this.isPlaying) return;
    
    const elapsed = (performance.now() - this.startTime) * this.playbackSpeed;
    
    // Find and emit frames up to current time
    while (
      this.currentFrameIndex < this.replay.frames.length &&
      this.replay.frames[this.currentFrameIndex].t <= elapsed
    ) {
      const frame = this.replay.frames[this.currentFrameIndex];
      this.onFrame(frame, elapsed);
      
      // Emit events attached to this frame
      if (frame.e) {
        frame.e.forEach(event => this.onEvent(event));
      }
      
      this.currentFrameIndex++;
    }
    
    // Check if replay is complete
    if (this.currentFrameIndex >= this.replay.frames.length) {
      this.isPlaying = false;
      this.onComplete();
      return;
    }
    
    this.animationFrameId = requestAnimationFrame(() => this._tick());
  }

  _findFrameAtTime(timeMs) {
    let low = 0;
    let high = this.replay.frames.length - 1;
    
    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (this.replay.frames[mid].t <= timeMs) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    
    return low;
  }

  _emitEventsUpTo(timeMs) {
    // Collect all events up to this time from ALL frames (not just up to currentFrameIndex)
    // This ensures we capture all events when seeking
    const events = [];
    for (let i = 0; i < this.replay.frames.length; i++) {
      const frame = this.replay.frames[i];
      if (frame.t > timeMs) break; // Stop once we pass the target time
      if (frame.e) {
        events.push(...frame.e);
      }
    }
    
    // Build final state by processing events in order
    // Track which targets exist and their final positions
    const targetState = new Map();
    const gridState = new Set();
    
    for (const event of events) {
      switch (event.type) {
        case 'spawn':
          targetState.set(event.id, { x: event.x, y: event.y, size: event.size });
          break;
        case 'move':
          if (targetState.has(event.id)) {
            const target = targetState.get(event.id);
            target.x = event.x;
            target.y = event.y;
          }
          break;
        case 'hit':
        case 'kill':
        case 'despawn':
          targetState.delete(event.id);
          break;
        case 'gridActivate':
          gridState.add(event.cellIndex);
          break;
        case 'gridHit':
          gridState.delete(event.cellIndex);
          break;
      }
    }
    
    // Emit spawn events for remaining targets with their current positions
    for (const [id, state] of targetState) {
      this.onEvent({ type: 'spawn', id, x: state.x, y: state.y, size: state.size }, true);
    }
    
    // Emit grid activations
    for (const cellIndex of gridState) {
      this.onEvent({ type: 'gridActivate', cellIndex }, true);
    }
  }
}
