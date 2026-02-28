const API_BASE = import.meta.env.VITE_API_URL || null;

let currentSession = null;

export const startGameSession = async (gameType, uuid) => {
  // Skip if no backend is configured (production without backend)
  if (!API_BASE) {
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE}/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameType, uuid }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to start session:', error);
      return null;
    }
    
    const session = await response.json();
    currentSession = {
      ...session,
      gameType,
      uuid,
    };
    
    return currentSession;
  } catch (error) {
    console.error('Error starting game session:', error);
    return null;
  }
};

export const endGameSession = async (score, stats, nickname) => {
  // Skip if no backend is configured (production without backend)
  if (!API_BASE || !currentSession) {
    return { success: false, error: 'No backend configured' };
  }
  
  try {
    const response = await fetch(`${API_BASE}/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSession.sessionId,
        signature: currentSession.signature,
        score,
        stats,
        nickname,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Failed to end session:', result.error);
      currentSession = null;
      return { success: false, error: result.error };
    }
    
    currentSession = null;
    return { success: true, leaderboard: result.leaderboard };
  } catch (error) {
    console.error('Error ending game session:', error);
    currentSession = null;
    return { success: false, error: error.message };
  }
};

export const getCurrentSession = () => currentSession;

export const clearSession = () => {
  currentSession = null;
};
