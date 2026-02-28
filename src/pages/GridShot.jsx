import { useState, useRef, useEffect } from 'react';
import { Grid3X3, RotateCcw, Trophy, Play, User, Video } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { ReplayRecorder, saveReplay } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';
import { GAME_WIDTH, GAME_HEIGHT } from '../components/FixedGameArea';

const GAME_DURATION = 30;
const GRID_SIZE = 3;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderBottom: '1px solid #334155',
    padding: '1rem',
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  titleText: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: 'white',
  },
  statsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  statItem: {
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  statValue: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: 'white',
  },
  statValueCyan: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#22d3ee',
  },
  statValueYellow: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#facc15',
  },
  resetButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '0.5rem',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '500px',
    overflow: 'hidden',
    transform: 'translate3d(0, 0, 0)',
    willChange: 'transform',
  },
  idleOverlay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '1rem',
  },
  idleDescription: {
    color: '#94a3b8',
    marginBottom: '2rem',
    textAlign: 'center',
    maxWidth: '400px',
    padding: '0 1rem',
  },
  startButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 2rem',
    background: 'linear-gradient(to right, #f59e0b, #ef4444)',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
    gap: '1rem',
    padding: '1rem',
  },
  gridCell: {
    width: '100px',
    height: '100px',
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.1s ease-out',
    willChange: 'background-color',
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden',
  },
  gridCellHit: {
    backgroundColor: 'rgba(34, 197, 94, 0.6)',
  },
  target: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(to bottom right, #f59e0b, #ef4444)',
    boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    transition: 'transform 0.05s ease-out, opacity 0.15s ease-out',
    willChange: 'transform, opacity',
    transform: 'translate3d(0, 0, 0) scale(1)',
    backfaceVisibility: 'hidden',
    opacity: 1,
  },
  targetActive: {
    transform: 'translate3d(0, 0, 0) scale(0.95)',
  },
  targetCenter: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: 'white',
  },
  finishedOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  finishedTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '0.5rem',
  },
  finishedScore: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: '2rem',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '2rem',
    maxWidth: '500px',
    width: '100%',
    padding: '0 1rem',
  },
  resultCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: '0.75rem',
    padding: '1rem',
    textAlign: 'center',
  },
  resultLabel: {
    color: '#94a3b8',
    fontSize: '0.875rem',
    marginBottom: '0.25rem',
  },
  resultValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white',
  },
  resultValueGreen: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#22c55e',
  },
  resultValueCyan: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#22d3ee',
  },
  leaderboardSection: {
    marginTop: '1.5rem',
    width: '100%',
    maxWidth: '400px',
    padding: '0 1rem',
  },
  leaderboardTitle: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  leaderboardList: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '0.5rem',
    overflow: 'hidden',
  },
  leaderboardItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
  },
  leaderboardRank: {
    width: '24px',
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  leaderboardName: {
    flex: 1,
    color: 'white',
    marginLeft: '0.5rem',
  },
  leaderboardScore: {
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  nicknameSection: {
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  nicknameInput: {
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    color: 'white',
    fontSize: '1rem',
    width: '150px',
  },
  nicknameLabel: {
    color: '#94a3b8',
    fontSize: '0.875rem',
  },
};

export default function GridShot() {
  const [, forceUpdate] = useState(0);
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('gridshot'));

  // Sync leaderboard from server on mount
  useEffect(() => {
    syncLeaderboard('gridshot').then(setLeaderboard);
  }, []);

  const gameState = useRef('idle');
  const activeTargets = useRef(new Set());
  const score = useRef(0);
  const hits = useRef(0);
  const misses = useRef(0);
  const timeLeft = useRef(GAME_DURATION);
  const times = useRef([]);
  const targetSpawnTime = useRef({});
  const timerRef = useRef(null);
  const clickedTargets = useRef(new Set());
  const cellRefs = useRef({});
  const replayRecorderRef = useRef(null);
  const gameAreaRef = useRef(null);
  const clickDataRef = useRef([]);
  const [clickData, setClickData] = useState([]);
  const [lastReplay, setLastReplay] = useState(null);
  const [showReplayViewer, setShowReplayViewer] = useState(false);

  const render = () => forceUpdate(n => n + 1);

  const spawnTarget = (excludeCell = null) => {
    const available = [];
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (!activeTargets.current.has(i) && i !== excludeCell) {
        available.push(i);
      }
    }
    if (available.length > 0) {
      const newTarget = available[Math.floor(Math.random() * available.length)];
      targetSpawnTime.current[newTarget] = performance.now();
      activeTargets.current.add(newTarget);
      // Record spawn event
      if (replayRecorderRef.current) {
        replayRecorderRef.current.recordEvent('gridActivate', { cellIndex: newTarget });
      }
    }
  };

  const startGame = async () => {
    // Start anti-cheat session
    const session = await startGameSession('gridshot', getUserUUID());
    if (!session) {
      console.error('Failed to start game session');
    }
    
    gameState.current = 'playing';
    activeTargets.current = new Set();
    clickedTargets.current = new Set();
    score.current = 0;
    hits.current = 0;
    misses.current = 0;
    times.current = [];
    timeLeft.current = GAME_DURATION;
    targetSpawnTime.current = {};
    clickDataRef.current = [];
    
    // Initialize replay recorder
    replayRecorderRef.current = new ReplayRecorder('gridshot', {
      gameDuration: GAME_DURATION,
      gridSize: GRID_SIZE
    });
    replayRecorderRef.current.start();
    
    const initialTargets = [0, 4, 8];
    const now = performance.now();
    initialTargets.forEach(t => {
      targetSpawnTime.current[t] = now;
      activeTargets.current.add(t);
      // Record initial target spawns
      if (replayRecorderRef.current) {
        replayRecorderRef.current.recordEvent('gridActivate', { cellIndex: t });
      }
    });
    
    render();
    
    timerRef.current = setInterval(() => {
      timeLeft.current -= 1;
      if (timeLeft.current <= 0) {
        clearInterval(timerRef.current);
        gameState.current = 'finished';
        
        // Calculate final stats
        const stats = {
          hits: hits.current,
          accuracy: hits.current + misses.current > 0 
            ? Math.round((hits.current / (hits.current + misses.current)) * 100) : 0
        };
        
        // Stop replay recording and save
        if (replayRecorderRef.current) {
          replayRecorderRef.current.stop();
          const replayData = replayRecorderRef.current.getReplayData(
            getUserUUID(),
            nickname,
            score.current,
            stats
          );
          setLastReplay(replayData);
          saveReplay(replayData);
        }
        
        // Save click data for analytics
        setClickData([...clickDataRef.current]);
        
        // Submit score through anti-cheat session
        endGameSession(score.current, stats, nickname).then(result => {
          if (result?.success && result.leaderboard) {
            setLeaderboard(result.leaderboard);
          } else {
            console.warn('Session submission failed:', result?.error);
            syncLeaderboard('gridshot').then(setLeaderboard);
          }
        });
      }
      render();
    }, 1000);
  };

  const handleNicknameChange = (e) => {
    const newNickname = setNickname(e.target.value);
    setNicknameState(newNickname);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleTargetClick = (cellIndex) => {
    if (gameState.current !== 'playing') return;
    if (clickedTargets.current.has(cellIndex)) return;
    if (!activeTargets.current.has(cellIndex)) return;
    
    clickedTargets.current.add(cellIndex);
    
    const clickTime = performance.now();
    const reactionTime = Math.round(clickTime - targetSpawnTime.current[cellIndex]);
    
    // Track click position for analytics (grid cell center positions)
    const row = Math.floor(cellIndex / GRID_SIZE);
    const col = cellIndex % GRID_SIZE;
    const cellWidth = 960 / GRID_SIZE;
    const cellHeight = 540 / GRID_SIZE;
    const targetCenterX = col * cellWidth + cellWidth / 2;
    const targetCenterY = row * cellHeight + cellHeight / 2;
    clickDataRef.current.push({
      clickX: targetCenterX,
      clickY: targetCenterY,
      targetX: targetCenterX,
      targetY: targetCenterY,
      hit: true,
    });
    
    // Smooth visual feedback - light up the cell with transition
    const cellEl = cellRefs.current[cellIndex];
    if (cellEl) {
      cellEl.style.backgroundColor = 'rgba(34, 197, 94, 0.6)';
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (cellEl) {
            cellEl.style.backgroundColor = 'rgba(51, 65, 85, 0.3)';
          }
        }, 100);
      });
    }
    
    times.current.push(reactionTime);
    hits.current += 1;
    score.current += Math.max(100 - Math.floor(reactionTime / 10), 10);
    
    // Record hit event
    if (replayRecorderRef.current) {
      replayRecorderRef.current.recordEvent('gridHit', {
        cellIndex,
        reactionTime,
        score: score.current
      });
    }
    
    activeTargets.current.delete(cellIndex);
    delete targetSpawnTime.current[cellIndex];
    
    spawnTarget(cellIndex);
    
    clickedTargets.current.delete(cellIndex);
    
    // Immediate render for responsive feedback
    render();
  };

  const handleMiss = (e) => {
    if (gameState.current !== 'playing') return;
    misses.current += 1;
    score.current = Math.max(0, score.current - 50);
    
    // Record miss event
    if (replayRecorderRef.current && gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      replayRecorderRef.current.recordEvent('miss', {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    
    render();
  };

  const handleMouseMove = (e) => {
    if (replayRecorderRef.current && gameState.current === 'playing' && gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      // Normalize coordinates to fixed game dimensions for consistent replay
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const normalizedX = (relX / rect.width) * GAME_WIDTH;
      const normalizedY = (relY / rect.height) * GAME_HEIGHT;
      replayRecorderRef.current.recordMouseMove(normalizedX, normalizedY);
    }
  };

  const resetGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    gameState.current = 'idle';
    activeTargets.current = new Set();
    clickedTargets.current = new Set();
    score.current = 0;
    hits.current = 0;
    misses.current = 0;
    times.current = [];
    timeLeft.current = GAME_DURATION;
    targetSpawnTime.current = {};
    render();
  };

  const averageTime = times.current.length > 0 
    ? Math.round(times.current.reduce((a, b) => a + b, 0) / times.current.length)
    : 0;

  const accuracy = hits.current + misses.current > 0 
    ? Math.round((hits.current / (hits.current + misses.current)) * 100)
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerTitle}>
            <Grid3X3 size={24} color="#f59e0b" />
            <h1 style={styles.titleText}>Grid Shot</h1>
          </div>
          
          {gameState.current === 'playing' && (
            <div style={styles.statsContainer}>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Time</p>
                <p style={styles.statValueYellow}>{timeLeft.current}s</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Score</p>
                <p style={styles.statValueCyan}>{score.current}</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Hits</p>
                <p style={styles.statValue}>{hits.current}</p>
              </div>
            </div>
          )}
          
          <button onClick={resetGame} style={styles.resetButton}>
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {gameState.current !== 'finished' && (
        <div ref={gameAreaRef} style={styles.gameArea} onMouseDown={handleMiss} onMouseMove={handleMouseMove}>
          {gameState.current === 'idle' && (
          <div style={styles.idleOverlay}>
            <Grid3X3 size={80} color="#f59e0b" style={{ marginBottom: '1.5rem' }} />
            <h2 style={styles.idleTitle}>Grid Shot</h2>
            <p style={styles.idleDescription}>
              Click targets as they appear in the grid. You have {GAME_DURATION} seconds.
              Missing clicks will cost you points!
            </p>
            <button onMouseDown={(e) => { e.stopPropagation(); startGame(); }} style={styles.startButton}>
              <Play size={20} />
              Start Game
            </button>
          </div>
        )}

        {gameState.current === 'playing' && (
          <div style={styles.grid} onMouseDown={(e) => e.stopPropagation()}>
            {Array.from({ length: TOTAL_CELLS }).map((_, index) => (
              <div 
                key={index} 
                ref={el => cellRefs.current[index] = el}
                style={styles.gridCell}
              >
                {activeTargets.current.has(index) && (
                  <button
                    onMouseDown={() => handleTargetClick(index)}
                    style={styles.target}
                  >
                    <div style={styles.targetCenter} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        </div>
      )}

      {gameState.current === 'finished' && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2rem',
          backgroundColor: '#0a0f1a',
          overflowY: 'auto',
        }}>
          <div style={{
            maxWidth: '800px',
            width: '100%',
            textAlign: 'center',
          }}>
            <Trophy size={64} color="#facc15" style={{ marginBottom: '1rem' }} />
            <h2 style={styles.finishedTitle}>Time's Up!</h2>
            <p style={styles.finishedScore}>Score: {score.current}</p>
            
            <div style={styles.nicknameSection}>
              <User size={16} color="#94a3b8" />
              <span style={styles.nicknameLabel}>Nickname:</span>
              <input
                type="text"
                value={nickname}
                onChange={handleNicknameChange}
                style={styles.nicknameInput}
                maxLength={20}
              />
            </div>
            
            <div style={styles.resultsGrid}>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Hits</p>
                <p style={styles.resultValueGreen}>{hits.current}</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Avg Time</p>
                <p style={styles.resultValueCyan}>{averageTime}ms</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Accuracy</p>
                <p style={styles.resultValue}>{accuracy}%</p>
              </div>
            </div>
            
            <PostGameAnalytics
              gameType="gridshot"
              stats={{ score: score.current, accuracy, hits: hits.current }}
              clickData={clickData}
              targetSize={100}
              gameWidth={960}
            />
            
            {leaderboard.length > 0 && (
              <div style={styles.leaderboardSection}>
                <h3 style={styles.leaderboardTitle}>
                  <Trophy size={16} color="#facc15" />
                  Leaderboard
                </h3>
                <div style={styles.leaderboardList}>
                  {leaderboard.map((entry, i) => (
                    <div key={i} style={styles.leaderboardItem}>
                      <span style={styles.leaderboardRank}>#{i + 1}</span>
                      <span style={styles.leaderboardName}>{entry.nickname}</span>
                      <span style={styles.leaderboardScore}>{entry.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button onMouseDown={(e) => { e.stopPropagation(); startGame(); }} style={styles.startButton}>
                <RotateCcw size={20} />
                Play Again
              </button>
              {lastReplay && (
                <button 
                  onClick={() => setShowReplayViewer(true)} 
                  style={{...styles.startButton, backgroundColor: '#6366f1'}}
                >
                  <Video size={20} />
                  View Your Replay
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showReplayViewer && lastReplay && (
        <ReplayViewer 
          replay={lastReplay} 
          onClose={() => setShowReplayViewer(false)}
          autoPlay={true}
        />
      )}
    </div>
  );
}
