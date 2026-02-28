import { useState, useRef, useEffect } from 'react';
import { Target, RotateCcw, Trophy, Play, User, Video } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { ReplayRecorder, saveReplay } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import FixedGameArea, { GAME_WIDTH, GAME_HEIGHT } from '../components/FixedGameArea';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';

const TOTAL_TARGETS = 30;

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
  statValueRed: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#f87171',
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
    cursor: 'crosshair',
    minHeight: '500px',
    overflow: 'hidden',
  },
  idleOverlay: {
    position: 'absolute',
    inset: 0,
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
    background: 'linear-gradient(to right, #06b6d4, #3b82f6)',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  target: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'linear-gradient(to bottom right, #ef4444, #dc2626)',
    boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    transition: 'transform 0.1s',
  },
  targetCenter: {
    width: '12px',
    height: '12px',
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
    color: '#22d3ee',
    marginBottom: '2rem',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
    marginBottom: '2rem',
    maxWidth: '600px',
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
  resultValueRed: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#f87171',
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
    color: '#22d3ee',
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

export default function AimTrainer() {
  const [gameState, setGameState] = useState('idle');
  const [target, setTarget] = useState(null);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [times, setTimes] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('aim'));

  // Sync leaderboard from server on mount
  useEffect(() => {
    syncLeaderboard('aim').then(setLeaderboard);
  }, []);
  const containerRef = useRef(null);
  const targetStartTimeRef = useRef(null);
  const gameStateRef = useRef('idle');
  const targetRef = useRef(null);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const scoreRef = useRef(0);
  const timesRef = useRef([]);
  const startTimeRef = useRef(null);
  const replayRecorderRef = useRef(null);
  const targetIdRef = useRef(0);
  const clickDataRef = useRef([]);
  const [clickData, setClickData] = useState([]);
  const [lastReplay, setLastReplay] = useState(null);
  const [showReplayViewer, setShowReplayViewer] = useState(false);

  const handleNicknameChange = (e) => {
    const newNickname = setNickname(e.target.value);
    setNicknameState(newNickname);
  };

  const generateTarget = () => {
    // Use fixed dimensions for consistent gameplay
    const targetSize = 60;
    const padding = 20;
    const x = Math.random() * (GAME_WIDTH - targetSize - padding * 2) + padding;
    const y = Math.random() * (GAME_HEIGHT - targetSize - padding * 2) + padding;
    return { x, y, size: targetSize };
  };

  const spawnTarget = () => {
    const newTarget = generateTarget();
    targetIdRef.current += 1;
    newTarget.id = targetIdRef.current;
    targetRef.current = newTarget;
    targetStartTimeRef.current = performance.now();
    setTarget(newTarget);
    
    // Record spawn event
    if (replayRecorderRef.current) {
      replayRecorderRef.current.recordEvent('spawn', {
        id: newTarget.id,
        x: newTarget.x + newTarget.size / 2,
        y: newTarget.y + newTarget.size / 2,
        size: newTarget.size
      });
    }
  };

  const startGame = async () => {
    // Start anti-cheat session
    const session = await startGameSession('aim', getUserUUID());
    if (!session) {
      console.error('Failed to start game session');
    }
    
    gameStateRef.current = 'playing';
    hitsRef.current = 0;
    missesRef.current = 0;
    scoreRef.current = 0;
    timesRef.current = [];
    startTimeRef.current = performance.now();
    targetIdRef.current = 0;
    clickDataRef.current = [];
    
    // Initialize replay recorder
    replayRecorderRef.current = new ReplayRecorder('aim', {
      totalTargets: TOTAL_TARGETS,
      gameWidth: GAME_WIDTH,
      gameHeight: GAME_HEIGHT
    });
    replayRecorderRef.current.start();
    
    setGameState('playing');
    setScore(0);
    setHits(0);
    setMisses(0);
    setTimes([]);
    setStartTime(performance.now());
    setEndTime(null);
    setTimeout(() => spawnTarget(), 50);
  };

  const handleTargetMouseDown = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (gameStateRef.current !== 'playing') return;
    
    const clickTime = performance.now();
    const reactionTime = Math.round(clickTime - targetStartTimeRef.current);
    
    // Get click position relative to target center for analytics
    if (targetRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const targetCenterX = targetRef.current.x + targetRef.current.size / 2;
      const targetCenterY = targetRef.current.y + targetRef.current.size / 2;
      
      clickDataRef.current.push({
        clickX,
        clickY,
        targetX: targetCenterX,
        targetY: targetCenterY,
        hit: true,
      });
    }
    
    // Record hit event
    if (replayRecorderRef.current && targetRef.current) {
      replayRecorderRef.current.recordEvent('hit', {
        id: targetRef.current.id,
        reactionTime,
        score: scoreRef.current + Math.max(100 - Math.floor(reactionTime / 10), 10)
      });
    }
    
    timesRef.current = [...timesRef.current, reactionTime];
    hitsRef.current += 1;
    scoreRef.current += Math.max(100 - Math.floor(reactionTime / 10), 10);
    
    setTimes(timesRef.current);
    setHits(hitsRef.current);
    setScore(scoreRef.current);
    
    if (hitsRef.current >= TOTAL_TARGETS) {
      targetRef.current = null;
      gameStateRef.current = 'finished';
      setTarget(null);
      setEndTime(performance.now());
      setClickData([...clickDataRef.current]);
      setGameState('finished');
      
      // Calculate final stats
      const stats = {
        accuracy: Math.round((hitsRef.current / (hitsRef.current + missesRef.current)) * 100),
        avgTime: Math.round(timesRef.current.reduce((a, b) => a + b, 0) / timesRef.current.length)
      };
      
      // Stop replay recording and save
      if (replayRecorderRef.current) {
        replayRecorderRef.current.stop();
        const replayData = replayRecorderRef.current.getReplayData(
          getUserUUID(),
          nickname,
          scoreRef.current,
          stats
        );
        setLastReplay(replayData);
        saveReplay(replayData);
      }
      
      // Submit score through anti-cheat session
      const result = await endGameSession(scoreRef.current, stats, nickname);
      if (result?.success && result.leaderboard) {
        setLeaderboard(result.leaderboard);
      } else {
        // Fallback: sync from server
        console.warn('Session submission failed:', result?.error);
        const serverLeaderboard = await syncLeaderboard('aim');
        setLeaderboard(serverLeaderboard);
      }
    } else {
      spawnTarget();
    }
  };

  const handleMissMouseDown = (e) => {
    if (gameStateRef.current !== 'playing' || !targetRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const t = targetRef.current;
    
    const targetCenterX = t.x + t.size / 2;
    const targetCenterY = t.y + t.size / 2;
    const distance = Math.sqrt(
      Math.pow(clickX - targetCenterX, 2) + Math.pow(clickY - targetCenterY, 2)
    );
    
    if (distance > t.size / 2) {
      // Record miss event
      if (replayRecorderRef.current) {
        replayRecorderRef.current.recordEvent('miss', {
          x: clickX,
          y: clickY
        });
      }
      
      missesRef.current += 1;
      scoreRef.current = Math.max(0, scoreRef.current - 25);
      setMisses(missesRef.current);
      setScore(scoreRef.current);
    }
  };

  const resetGame = () => {
    gameStateRef.current = 'idle';
    targetRef.current = null;
    hitsRef.current = 0;
    missesRef.current = 0;
    scoreRef.current = 0;
    timesRef.current = [];
    setGameState('idle');
    setTarget(null);
    setScore(0);
    setHits(0);
    setMisses(0);
    setTimes([]);
    setStartTime(null);
    setEndTime(null);
  };

  const averageTime = times.length > 0 
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    : 0;

  const accuracy = hits + misses > 0 
    ? Math.round((hits / (hits + misses)) * 100)
    : 0;

  const totalTime = startTime && endTime
    ? ((endTime - startTime) / 1000).toFixed(1)
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerTitle}>
            <Target size={24} color="#22d3ee" />
            <h1 style={styles.titleText}>Aim Trainer</h1>
          </div>
          
          {gameState === 'playing' && (
            <div style={styles.statsContainer}>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Targets</p>
                <p style={styles.statValue}>{hits}/{TOTAL_TARGETS}</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Score</p>
                <p style={styles.statValueCyan}>{score}</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Misses</p>
                <p style={styles.statValueRed}>{misses}</p>
              </div>
            </div>
          )}
          
          <button onClick={resetGame} style={styles.resetButton}>
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {gameState !== 'finished' && (
        <FixedGameArea 
          ref={containerRef} 
          onMouseDown={handleMissMouseDown} 
          onMouseMove={(e) => {
            if (replayRecorderRef.current && gameStateRef.current === 'playing') {
              const rect = containerRef.current.getBoundingClientRect();
              replayRecorderRef.current.recordMouseMove(
                e.clientX - rect.left,
                e.clientY - rect.top
              );
            }
          }}
          cursor="crosshair"
        >
          {gameState === 'idle' && (
          <div style={{...styles.idleOverlay, position: 'absolute', inset: 0}}>
            <Target size={80} color="#22d3ee" style={{ marginBottom: '1.5rem' }} />
            <h2 style={styles.idleTitle}>Aim Trainer</h2>
            <p style={styles.idleDescription}>
              Click on {TOTAL_TARGETS} targets as quickly and accurately as possible.
              Missing targets will cost you points!
            </p>
            <button onMouseDown={startGame} style={styles.startButton}>
              <Play size={20} />
              Start Game
            </button>
          </div>
        )}

        {gameState === 'playing' && target && (
          <button
            onMouseDown={handleTargetMouseDown}
            style={{
              ...styles.target,
              left: target.x,
              top: target.y,
              width: target.size,
              height: target.size,
            }}
          >
            <div style={styles.targetCenter} />
          </button>
        )}

        </FixedGameArea>
      )}

      {gameState === 'finished' && (
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
            <h2 style={styles.finishedTitle}>Game Complete!</h2>
            <p style={styles.finishedScore}>Score: {score}</p>
            
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
                <p style={styles.resultLabel}>Accuracy</p>
                <p style={styles.resultValueGreen}>{accuracy}%</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Avg Time</p>
                <p style={styles.resultValueCyan}>{averageTime}ms</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Total Time</p>
                <p style={styles.resultValue}>{totalTime}s</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Misses</p>
                <p style={styles.resultValueRed}>{misses}</p>
              </div>
            </div>
            
            <PostGameAnalytics
              gameType="aim"
              stats={{ score, accuracy, avgTime: averageTime }}
              clickData={clickData}
              targetSize={60}
              gameWidth={GAME_WIDTH}
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
              <button onMouseDown={startGame} style={styles.startButton}>
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
