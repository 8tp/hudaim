import { useState, useRef, useEffect } from 'react';
import { Zap, RotateCcw, Trophy, User } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { startGameSession, endGameSession } from '../utils/gameSession';

const WAITING = 0;
const READY = 1;
const TOO_EARLY = 2;
const CLICK_NOW = 3;
const RESULT = 4;

const MIN_DELAY_BEFORE_NEXT = 1500; // Minimum 1.5 seconds before next round starts

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  gameArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'none',
    willChange: 'background-color',
    transform: 'translate3d(0, 0, 0)',
    minHeight: '400px',
    height: '400px',
    position: 'relative',
  },
  waiting: { backgroundColor: '#1e293b' },
  ready: { backgroundColor: '#dc2626' },
  clickNow: { backgroundColor: '#16a34a' },
  tooEarly: { backgroundColor: '#ea580c' },
  result: { backgroundColor: '#1e293b' },
  title: {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '1.25rem',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  icon: {
    marginBottom: '1.5rem',
  },
  attemptCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  attemptNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'white',
  },
  resultsPanel: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderTop: '1px solid #334155',
    padding: '1.5rem',
    minHeight: '200px',
  },
  resultsInner: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  resultsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'white',
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
  },
  statCard: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: '0.75rem',
    padding: '1rem',
    textAlign: 'center',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: '0.875rem',
    marginBottom: '0.25rem',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white',
  },
  statValueCyan: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#22d3ee',
  },
  statValueGreen: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#22c55e',
  },
  finalResult: {
    marginTop: '1rem',
    padding: '1rem',
    background: 'linear-gradient(to right, rgba(34, 211, 238, 0.2), rgba(59, 130, 246, 0.2))',
    borderRadius: '0.75rem',
    border: '1px solid rgba(34, 211, 238, 0.3)',
    textAlign: 'center',
    color: 'white',
  },
  leaderboardSection: {
    marginTop: '1.5rem',
    borderTop: '1px solid #334155',
    paddingTop: '1.5rem',
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
    color: '#22c55e',
  },
  nicknameSection: {
    marginTop: '1rem',
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
    fontSize: '0.875rem',
    width: '150px',
  },
  nicknameLabel: {
    color: '#94a3b8',
    fontSize: '0.875rem',
  },
};

export default function ReactionTime() {
  const [gameState, setGameState] = useState(WAITING);
  const [reactionTime, setReactionTime] = useState(null);
  const [results, setResults] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('reaction'));

  // Sync leaderboard from server on mount
  useEffect(() => {
    syncLeaderboard('reaction').then(setLeaderboard);
  }, []);

  const timeoutRef = useRef(null);
  const startTimeRef = useRef(null);
  const gameStateRef = useRef(WAITING);
  const attemptsRef = useRef(0);
  const canClickRef = useRef(true);
  const resultsRef = useRef([]);
  const gameAreaRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);

  const handleNicknameChange = (e) => {
    const newNickname = setNickname(e.target.value);
    setNicknameState(newNickname);
  };

  const saveScoreIfComplete = (newResults) => {
    if (newResults.length >= 5) {
      const avg = Math.round(newResults.reduce((a, b) => a + b, 0) / newResults.length);
      // Lower is better for reaction time, so we invert for scoring (faster = higher score)
      const score = Math.max(0, 500 - avg);
      const stats = {
        averageTime: avg,
        bestTime: Math.min(...newResults)
      };
      // Submit score through anti-cheat session
      endGameSession(score, stats, nickname).then(result => {
        if (result?.success && result.leaderboard) {
          setLeaderboard(result.leaderboard);
        } else {
          console.warn('Session submission failed:', result?.error);
          syncLeaderboard('reaction').then(setLeaderboard);
        }
      });
    }
  };

  const startGame = async () => {
    // Start anti-cheat session on first round
    if (attemptsRef.current === 0) {
      const session = await startGameSession('reaction', getUserUUID());
      if (!session) {
        console.error('Failed to start game session');
      }
    }
    
    canClickRef.current = true;
    gameStateRef.current = READY;
    setGameState(READY);
    // Random delay between 2-5 seconds for the green screen
    const delay = Math.random() * 3000 + 2000;
    
    timeoutRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      gameStateRef.current = CLICK_NOW;
      
      // Direct DOM update for instant green screen
      if (gameAreaRef.current) {
        gameAreaRef.current.style.backgroundColor = '#22c55e';
      }
      if (titleRef.current) {
        titleRef.current.textContent = 'Click!';
      }
      if (subtitleRef.current) {
        subtitleRef.current.style.visibility = 'hidden';
      }
      
      // Update React state after visual change
      setTimeout(() => setGameState(CLICK_NOW), 0);
    }, delay);
  };

  const startNextRound = () => {
    // Disable clicking during cooldown
    canClickRef.current = false;
    
    // Add random delay (1.5-3 seconds) before starting next round
    const cooldown = MIN_DELAY_BEFORE_NEXT + Math.random() * 1500;
    
    timeoutRef.current = setTimeout(() => {
      startGame();
    }, cooldown);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    
    // Ignore clicks during cooldown (except for CLICK_NOW which should always work)
    if (!canClickRef.current && gameStateRef.current !== CLICK_NOW) {
      return;
    }
    
    const clickTime = performance.now();
    const state = gameStateRef.current;
    
    if (state === WAITING) {
      startGame();
    } else if (state === READY) {
      clearTimeout(timeoutRef.current);
      gameStateRef.current = TOO_EARLY;
      setGameState(TOO_EARLY);
      // Auto-start next round after a delay
      startNextRound();
    } else if (state === CLICK_NOW) {
      const time = Math.round(clickTime - startTimeRef.current);
      gameStateRef.current = RESULT;
      attemptsRef.current += 1;
      resultsRef.current = [...resultsRef.current, time];
      
      // INSTANT visual feedback via direct DOM manipulation - bypass React entirely
      if (gameAreaRef.current) {
        gameAreaRef.current.style.backgroundColor = '#1e293b';
      }
      if (titleRef.current) {
        titleRef.current.textContent = `${time} ms`;
      }
      if (subtitleRef.current) {
        subtitleRef.current.textContent = attemptsRef.current < 5 
          ? `Attempt ${attemptsRef.current}/5 • Next round starting...` 
          : 'All done! Click to restart';
        subtitleRef.current.style.visibility = 'visible';
      }
      
      // Defer React state updates to avoid blocking the visual feedback
      setTimeout(() => {
        setReactionTime(time);
        setResults(resultsRef.current);
        setAttempts(attemptsRef.current);
        setGameState(RESULT);
        
        // Save score if this was the 5th attempt
        if (resultsRef.current.length >= 5) {
          saveScoreIfComplete(resultsRef.current);
        }
      }, 0);
      
      // Auto-start next round if not finished
      if (attemptsRef.current < 5) {
        startNextRound();
      }
    } else if (state === RESULT) {
      // Only allow manual restart after all 5 attempts
      if (attemptsRef.current >= 5) {
        gameStateRef.current = WAITING;
        attemptsRef.current = 0;
        setGameState(WAITING);
        setAttempts(0);
      }
    }
  };

  const resetGame = (e) => {
    if (e) e.stopPropagation();
    clearTimeout(timeoutRef.current);
    gameStateRef.current = WAITING;
    attemptsRef.current = 0;
    resultsRef.current = [];
    setGameState(WAITING);
    setReactionTime(null);
    setResults([]);
    setAttempts(0);
  };

  const averageTime = results.length > 0 
    ? Math.round(results.reduce((a, b) => a + b, 0) / results.length)
    : null;

  const bestTime = results.length > 0 ? Math.min(...results) : null;

  const getBackgroundStyle = () => {
    switch (gameState) {
      case READY: return styles.ready;
      case CLICK_NOW: return styles.clickNow;
      case TOO_EARLY: return styles.tooEarly;
      default: return styles.waiting;
    }
  };

  const getMessage = () => {
    switch (gameState) {
      case WAITING:
        return { title: 'Reaction Time Test', subtitle: 'Click anywhere to start' };
      case READY:
        return { title: 'Wait for green...', subtitle: "Don't click yet!" };
      case CLICK_NOW:
        return { title: 'CLICK!', subtitle: '' };
      case TOO_EARLY:
        return { title: 'Too early!', subtitle: 'Next round starting...' };
      case RESULT:
        return { 
          title: `${reactionTime} ms`, 
          subtitle: attempts < 5 ? `Attempt ${attempts}/5 • Next round starting...` : 'All done! Click to restart'
        };
      default:
        return { title: '', subtitle: '' };
    }
  };

  const { title, subtitle } = getMessage();

  return (
    <div style={styles.container}>
      <div
        ref={gameAreaRef}
        onMouseDown={handleMouseDown}
        style={{ ...styles.gameArea, ...getBackgroundStyle() }}
      >
        <div>
          {gameState === WAITING && (
            <div style={{ ...styles.icon, textAlign: 'center' }}>
              <Zap size={80} color="#22c55e" />
            </div>
          )}
          
          {gameState === RESULT && (
            <div style={styles.attemptCircle}>
              <span style={styles.attemptNumber}>{attempts}</span>
            </div>
          )}

          <h1 ref={titleRef} style={styles.title}>{title}</h1>
          
          <p ref={subtitleRef} style={{ ...styles.subtitle, visibility: subtitle ? 'visible' : 'hidden' }}>{subtitle || ' '}</p>
        </div>
      </div>

      {results.length > 0 && (
        <div style={styles.resultsPanel}>
          <div style={styles.resultsInner}>
            <div style={styles.resultsHeader}>
              <h2 style={styles.resultsTitle}>
                <Trophy size={20} color="#facc15" />
                Your Results
              </h2>
              <button
                onMouseDown={resetGame}
                style={styles.resetButton}
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Attempts</p>
                <p style={styles.statValue}>{results.length}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Average</p>
                <p style={styles.statValueCyan}>{averageTime} ms</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Best</p>
                <p style={styles.statValueGreen}>{bestTime} ms</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Last</p>
                <p style={styles.statValue}>{results[results.length - 1]} ms</p>
              </div>
            </div>

            {results.length >= 5 && (
              <>
                <div style={styles.finalResult}>
                  <span style={{ fontWeight: 'bold', color: '#22d3ee' }}>Final Average: {averageTime} ms</span>
                  <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>
                    {averageTime < 200 ? '🔥 Incredible!' : averageTime < 250 ? '⚡ Great!' : averageTime < 300 ? '👍 Good!' : '💪 Keep practicing!'}
                  </span>
                </div>
                
                <div style={styles.nicknameSection}>
                  <User size={16} color="#94a3b8" />
                  <span style={styles.nicknameLabel}>Nickname:</span>
                  <input
                    type="text"
                    value={nickname}
                    onChange={handleNicknameChange}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={styles.nicknameInput}
                    maxLength={20}
                  />
                </div>

                {leaderboard.length > 0 && (
                  <div style={styles.leaderboardSection}>
                    <h3 style={styles.leaderboardTitle}>
                      <Trophy size={16} color="#facc15" />
                      Leaderboard (Best Scores)
                    </h3>
                    <div style={styles.leaderboardList}>
                      {leaderboard.map((entry, i) => (
                        <div key={i} style={styles.leaderboardItem}>
                          <span style={styles.leaderboardRank}>#{i + 1}</span>
                          <span style={styles.leaderboardName}>{entry.nickname}</span>
                          <span style={styles.leaderboardScore}>{entry.stats?.averageTime || '—'}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
