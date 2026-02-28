const STORAGE_KEY = 'hudaim_leaderboard';
const NICKNAME_KEY = 'hudaim_nickname';
const UUID_KEY = 'hudaim_user_uuid';
const API_BASE = import.meta.env.VITE_API_URL || null;

// Generate a UUID for the user
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Get or create user UUID
export const getUserUUID = () => {
  try {
    let uuid = localStorage.getItem(UUID_KEY);
    if (!uuid) {
      uuid = generateUUID();
      localStorage.setItem(UUID_KEY, uuid);
    }
    return uuid;
  } catch {
    return generateUUID();
  }
};

// Reset all leaderboards (for admin/testing purposes)
export const resetAllLeaderboards = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('All leaderboards have been reset');
    return true;
  } catch (error) {
    console.error('Failed to reset leaderboards:', error);
    return false;
  }
};

// Check if user has completed initial setup
export const hasCompletedSetup = () => {
  try {
    const nickname = localStorage.getItem(NICKNAME_KEY);
    const uuid = localStorage.getItem(UUID_KEY);
    return !!(nickname && uuid && nickname !== 'Player');
  } catch {
    return false;
  }
};

// Complete initial setup
export const completeSetup = (nickname) => {
  const uuid = getUserUUID();
  const sanitized = nickname.trim().slice(0, 20) || 'Player';
  localStorage.setItem(NICKNAME_KEY, sanitized);
  return { uuid, nickname: sanitized };
};

// Sync with server and return merged data
export const getLeaderboard = (gameType) => {
  // Return local data immediately, but prioritize server data
  // This will be updated when fetchServerLeaderboard completes
  return getLocalLeaderboard(gameType);
};

// Fetch leaderboard from server and update local cache
export const syncLeaderboard = async (gameType) => {
  if (!API_BASE) {
    return getLeaderboard(gameType); // Return local data if no backend
  }
  
  try {
    const response = await fetch(`${API_BASE}/leaderboard/${gameType}`);
    if (response.ok) {
      const serverData = await response.json();
      // Replace local data with server data (server is source of truth)
      saveLocalLeaderboard(gameType, serverData);
      return serverData;
    }
  } catch {
    // Server not available, use local only
  }
  return getLocalLeaderboard(gameType);
};

// Sync all leaderboards from server
export const syncAllLeaderboards = async () => {
  const gameTypes = ['tracking', 'aim', 'reaction', 'gridshot', 'switching', 'precision'];
  const results = {};
  
  await Promise.all(
    gameTypes.map(async (gameType) => {
      results[gameType] = await syncLeaderboard(gameType);
    })
  );
  
  return results;
};

const getLocalLeaderboard = (gameType) => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const leaderboard = JSON.parse(data);
    return (leaderboard[gameType] || []).sort((a, b) => b.score - a.score).slice(0, 10);
  } catch {
    return [];
  }
};

// Initialize: sync all leaderboards from server on app load
export const initializeLeaderboards = async () => {
  try {
    await syncAllLeaderboards();
    console.log('Leaderboards synced from server');
  } catch {
    console.log('Using local leaderboard data');
  }
};

const saveLocalLeaderboard = (gameType, entries) => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const leaderboard = data ? JSON.parse(data) : {};
    leaderboard[gameType] = entries;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
  } catch {
    // Ignore
  }
};

export const addScore = (gameType, score, stats = {}) => {
  const uuid = getUserUUID();
  const nickname = getNickname();
  const newEntry = {
    uuid,
    nickname,
    score,
    stats,
    date: new Date().toISOString(),
  };
  
  // Save locally first
  const localResult = addScoreLocal(gameType, newEntry);
  
  // Sync to server in background
  syncScoreToServer(gameType, uuid, nickname, score, stats).catch(() => {});
  
  return localResult;
};

const addScoreLocal = (gameType, newEntry) => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const leaderboard = data ? JSON.parse(data) : {};
    
    if (!leaderboard[gameType]) {
      leaderboard[gameType] = [];
    }
    
    // Find by UUID instead of nickname
    const existingIndex = leaderboard[gameType].findIndex(e => e.uuid === newEntry.uuid);
    
    if (existingIndex >= 0) {
      if (newEntry.score > leaderboard[gameType][existingIndex].score) {
        leaderboard[gameType][existingIndex] = newEntry;
      } else {
        // Update nickname even if score isn't better
        leaderboard[gameType][existingIndex].nickname = newEntry.nickname;
      }
    } else {
      leaderboard[gameType].push(newEntry);
    }
    
    leaderboard[gameType] = leaderboard[gameType]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
    return leaderboard[gameType];
  } catch {
    return [];
  }
};

const syncScoreToServer = async (gameType, uuid, nickname, score, stats) => {
  if (!API_BASE) return; // Skip if no backend
  
  try {
    await fetch(`${API_BASE}/leaderboard/${gameType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, nickname, score, stats }),
    });
  } catch {
    // Server not available
  }
};

export const getNickname = () => {
  try {
    return localStorage.getItem(NICKNAME_KEY) || 'Player';
  } catch {
    return 'Player';
  }
};

export const setNickname = (nickname) => {
  try {
    const oldNickname = getNickname();
    const sanitized = nickname.trim().slice(0, 20) || 'Player';
    localStorage.setItem(NICKNAME_KEY, sanitized);
    
    // Update all local leaderboard entries with new nickname
    if (oldNickname !== sanitized) {
      updateAllNicknames(sanitized);
      // Sync nickname change to server
      syncNicknameChange(sanitized).catch(() => {});
    }
    
    return sanitized;
  } catch {
    return 'Player';
  }
};

// Update all local leaderboard entries with new nickname
const updateAllNicknames = (newNickname) => {
  try {
    const uuid = getUserUUID();
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    
    const leaderboard = JSON.parse(data);
    Object.keys(leaderboard).forEach(gameType => {
      leaderboard[gameType].forEach(entry => {
        if (entry.uuid === uuid) {
          entry.nickname = newNickname;
        }
      });
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
  } catch {
    // Ignore
  }
};

// Sync nickname change to server
const syncNicknameChange = async (newNickname) => {
  if (!API_BASE) return; // Skip if no backend
  
  try {
    const uuid = getUserUUID();
    await fetch(`${API_BASE}/nickname`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, nickname: newNickname }),
    });
  } catch {
    // Server not available
  }
};

export const clearLeaderboard = (gameType) => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const leaderboard = JSON.parse(data);
      if (gameType) {
        delete leaderboard[gameType];
      } else {
        Object.keys(leaderboard).forEach(key => delete leaderboard[key]);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leaderboard));
    }
    
    // Also clear on server (only if backend is configured)
    if (API_BASE) {
      if (gameType) {
        fetch(`${API_BASE}/leaderboard/${gameType}`, { method: 'DELETE' }).catch(() => {});
      } else {
        fetch(`${API_BASE}/leaderboard`, { method: 'DELETE' }).catch(() => {});
      }
    }
  } catch {
    // Ignore errors
  }
};

// Function to refresh leaderboard from server
export const refreshLeaderboard = async (gameType) => {
  return syncLeaderboard(gameType);
};
