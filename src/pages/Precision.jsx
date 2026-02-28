import { useState, useRef, useEffect } from 'react';
import { Crosshair, RotateCcw, Trophy, Play, User, Video } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { ReplayRecorder, saveReplay } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import FixedGameArea, { GAME_WIDTH, GAME_HEIGHT } from '../components/FixedGameArea';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';

const GAME_DURATION = 60;
const NUM_SIMULTANEOUS = 4;
const TARGET_SIZE = 40; // Smaller than aim trainer (60px)

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
  statValuePurple: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#a855f7',
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
    transform: 'translate3d(0, 0, 0)',
    willChange: 'transform',
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
    background: 'linear-gradient(to right, #a855f7, #ec4899)',
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
    background: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
    boxShadow: '0 10px 25px rgba(168, 85, 247, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    transition: 'transform 0.05s ease-out, opacity 0.15s ease-out',
    willChange: 'transform, opacity',
    transform: 'translate3d(0, 0, 0) scale(1)',
    backfaceVisibility: 'hidden',
  },
  targetCenter: {
    width: '8px',
    height: '8px',
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
    color: '#a855f7',
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
  resultValuePurple: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#a855f7',
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
    color: '#a855f7',
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

export default function Precision() {
  const [gameState, setGameState] = useState('idle');
  const [targets, setTargets] = useState([]);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [shots, setShots] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('precision'));

  // Sync leaderboard from server on mount
  useEffect(() => {
    syncLeaderboard('precision').then(setLeaderboard);
  }, []);

  const containerRef = useRef(null);
  const gameStateRef = useRef('idle');
  const targetsRef = useRef([]);
  const killsRef = useRef(0);
  const shotsRef = useRef(0);
  const timerRef = useRef(null);
  const replayRecorderRef = useRef(null);
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
    const padding = 20;
    const x = Math.random() * (GAME_WIDTH - TARGET_SIZE - padding * 2) + padding;
    const y = Math.random() * (GAME_HEIGHT - TARGET_SIZE - padding * 2) + padding;
    return { 
      x, 
      y, 
      size: TARGET_SIZE,
      id: Math.random().toString(36).substr(2, 9)
    };
  };

  const spawnTargets = () => {
    const newTargets = [];
    for (let i = 0; i < NUM_SIMULTANEOUS; i++) {
      newTargets.push(generateTarget());
    }
    targetsRef.current = newTargets;
    setTargets(newTargets);
    
    // Record spawn events
    newTargets.forEach(target => {
      if (replayRecorderRef.current) {
        replayRecorderRef.current.recordEvent('spawn', {
          id: target.id,
          x: target.x + target.size / 2,
          y: target.y + target.size / 2,
          size: target.size
        });
      }
    });
  };

  const startGame = async () => {
    // Start anti-cheat session
    const session = await startGameSession('precision', getUserUUID());
    if (!session) {
      console.error('Failed to start game session');
    }
    
    gameStateRef.current = 'playing';
    killsRef.current = 0;
    shotsRef.current = 0;
    clickDataRef.current = [];
    
    // Initialize replay recorder
    replayRecorderRef.current = new ReplayRecorder('precision', {
      gameDuration: GAME_DURATION,
      gameWidth: GAME_WIDTH,
      gameHeight: GAME_HEIGHT,
      numSimultaneous: NUM_SIMULTANEOUS
    });
    replayRecorderRef.current.start();
    
    setGameState('playing');
    setScore(0);
    setKills(0);
    setShots(0);
    setTimeLeft(GAME_DURATION);
    
    // Start countdown timer
    const gameEndedRef = { current: false };
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!gameEndedRef.current) {
            gameEndedRef.current = true;
            setTimeout(() => endGame(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimeout(() => spawnTargets(), 50);
  };

  const endGame = () => {
    gameStateRef.current = 'finished';
    targetsRef.current = [];
    setTargets([]);
    setClickData([...clickDataRef.current]);
    setGameState('finished');
    
    // Calculate score: kills × accuracy
    const accuracy = shotsRef.current > 0 ? Math.round((killsRef.current / shotsRef.current) * 100) : 0;
    const finalScore = killsRef.current * accuracy;
    setScore(finalScore);
    
    // Stop replay recording and save
    if (replayRecorderRef.current) {
      replayRecorderRef.current.stop();
      const stats = {
        kills: killsRef.current,
        accuracy: accuracy
      };
      const replayData = replayRecorderRef.current.getReplayData(
        getUserUUID(),
        nickname,
        finalScore,
        stats
      );
      setLastReplay(replayData);
      saveReplay(replayData);
    }
    
    // Submit score through anti-cheat session
    const stats = {
      kills: killsRef.current,
      accuracy: accuracy
    };
    endGameSession(finalScore, stats, nickname).then(result => {
      if (result?.success && result.leaderboard) {
        setLeaderboard(result.leaderboard);
      } else {
        console.warn('Session submission failed:', result?.error);
        syncLeaderboard('precision').then(setLeaderboard);
      }
    });
  };

  const handleTargetClick = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    if (gameStateRef.current !== 'playing') return;
    
    // Track click position for analytics
    const clickedTarget = targetsRef.current.find(t => t.id === targetId);
    if (clickedTarget && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const targetCenterX = clickedTarget.x + clickedTarget.size / 2;
      const targetCenterY = clickedTarget.y + clickedTarget.size / 2;
      
      clickDataRef.current.push({
        clickX,
        clickY,
        targetX: targetCenterX,
        targetY: targetCenterY,
        hit: true,
      });
    }
    
    // Record hit event
    if (replayRecorderRef.current) {
      replayRecorderRef.current.recordEvent('hit', {
        id: targetId,
        score: killsRef.current + 1
      });
    }
    
    shotsRef.current += 1;
    killsRef.current += 1;
    setShots(shotsRef.current);
    setKills(killsRef.current);
    
    // Remove hit target and spawn new one
    const newTargets = targetsRef.current.filter(t => t.id !== targetId);
    const newTarget = generateTarget();
    newTargets.push(newTarget);
    targetsRef.current = newTargets;
    setTargets(newTargets);
    
    // Record new target spawn
    if (replayRecorderRef.current) {
      replayRecorderRef.current.recordEvent('spawn', {
        id: newTarget.id,
        x: newTarget.x + newTarget.size / 2,
        y: newTarget.y + newTarget.size / 2,
        size: newTarget.size
      });
    }
  };

  const handleMissClick = (e) => {
    if (gameStateRef.current !== 'playing') return;
    
    // Record miss event
    if (replayRecorderRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      replayRecorderRef.current.recordEvent('miss', {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    
    shotsRef.current += 1;
    setShots(shotsRef.current);
  };

  const handleMouseMove = (e) => {
    if (replayRecorderRef.current && gameStateRef.current === 'playing' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      replayRecorderRef.current.recordMouseMove(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    }
  };

  const resetGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    gameStateRef.current = 'idle';
    targetsRef.current = [];
    killsRef.current = 0;
    shotsRef.current = 0;
    setGameState('idle');
    setTargets([]);
    setScore(0);
    setKills(0);
    setShots(0);
    setTimeLeft(GAME_DURATION);
  };

  const accuracy = shots > 0 
    ? Math.round((kills / shots) * 100)
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerTitle}>
            <Crosshair size={24} color="#a855f7" />
            <h1 style={styles.titleText}>Precision</h1>
          </div>
          
          {gameState === 'playing' && (
            <div style={styles.statsContainer}>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Time</p>
                <p style={styles.statValuePurple}>{timeLeft}s</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Kills</p>
                <p style={styles.statValue}>{kills}</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Accuracy</p>
                <p style={styles.statValuePurple}>{accuracy}%</p>
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
        <FixedGameArea ref={containerRef} onMouseDown={handleMissClick} onMouseMove={handleMouseMove} cursor="crosshair">
          {gameState === 'idle' && (
          <div style={{...styles.idleOverlay, position: 'absolute', inset: 0}}>
            <Crosshair size={80} color="#a855f7" style={{ marginBottom: '1.5rem' }} />
            <h2 style={styles.idleTitle}>Precision</h2>
            <p style={styles.idleDescription}>
              Hit small targets with maximum accuracy for 60 seconds. 
              4 targets appear at once. Score = Kills × Accuracy!
            </p>
            <button onMouseDown={startGame} style={styles.startButton}>
              <Play size={20} />
              Start Game
            </button>
          </div>
        )}

        {gameState === 'playing' && targets.map((target) => (
          <button
            key={target.id}
            onMouseDown={(e) => handleTargetClick(e, target.id)}
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
        ))}

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
                <p style={styles.resultLabel}>Kills</p>
                <p style={styles.resultValueGreen}>{kills}</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Accuracy</p>
                <p style={styles.resultValuePurple}>{accuracy}%</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Shots</p>
                <p style={styles.resultValueRed}>{shots}</p>
              </div>
            </div>
            
            <PostGameAnalytics
              gameType="precision"
              stats={{ score, accuracy, kills }}
              clickData={clickData}
              targetSize={TARGET_SIZE}
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
