import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Crosshair, RotateCcw, Trophy, Play, User, Video } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { ReplayRecorder, saveReplay } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import FixedGameArea, { GAME_WIDTH, GAME_HEIGHT } from '../components/FixedGameArea';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';

const GAME_DURATION = 60;
const TARGET_SIZE = 60;
const TARGET_RADIUS = 30;
const NUM_TARGETS = 4;
const BASE_SPEED = 2;
const HEALTH_MAX = 100;
const DAMAGE_PER_SECOND = 120; // Damage per second (frame-rate independent)
const RESPAWN_DELAY = 500;
const STRAFE_INTERVAL = 90; // Smooth movement pattern

// Target frame rate for consistent movement (60 FPS)
const TARGET_FRAME_TIME = 1000 / 60; // ~16.67ms

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
  statValueOrange: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#f59e0b',
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
    overflow: 'hidden',
    cursor: 'crosshair',
    transform: 'translate3d(0, 0, 0)',
  },
  idleOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
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
    maxWidth: '500px',
    lineHeight: '1.6',
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
  },
  target: {
    position: 'absolute',
    width: `${TARGET_SIZE}px`,
    height: `${TARGET_SIZE}px`,
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'none',
    pointerEvents: 'none',
    willChange: 'transform',
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden',
  },
  targetInactive: {
    background: 'rgba(148, 163, 184, 0.4)',
    border: '2px solid rgba(148, 163, 184, 0.6)',
  },
  targetActive: {
    background: 'linear-gradient(to bottom right, #06b6d4, #3b82f6)',
    boxShadow: '0 0 30px rgba(6, 182, 212, 0.8)',
    border: '2px solid #06b6d4',
  },
  targetCenter: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'white',
    marginBottom: '4px',
  },
  healthBarContainer: {
    width: '50px',
    height: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '3px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  healthBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    transition: 'width 0.1s linear',
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
    color: '#06b6d4',
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
    color: '#06b6d4',
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

export default function Switching() {
  const [gameState, setGameState] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [kills, setKills] = useState(0);
  const [avgSwitchTime, setAvgSwitchTime] = useState(0);
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('switching'));

  // Sync leaderboard from server on mount
  useEffect(() => {
    syncLeaderboard('switching').then(setLeaderboard);
  }, []);
  
  const gameStateRef = useRef('idle');
  const killsRef = useRef(0);
  const switchTimesRef = useRef([]);
  const lastKillTimeRef = useRef(0);
  const timerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const gameAreaRef = useRef(null);
  const targetsRef = useRef([]);
  const targetElementsRef = useRef([]);
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const replayRecorderRef = useRef(null);
  const [lastReplay, setLastReplay] = useState(null);
  const [showReplayViewer, setShowReplayViewer] = useState(false);

  const handleNicknameChange = (e) => {
    const newNickname = setNickname(e.target.value);
    setNicknameState(newNickname);
  };

  // Initialize targets with random positions and smooth velocities
  // Uses fixed game area dimensions for consistent gameplay
  const initializeTargets = () => {
    const margin = TARGET_RADIUS + 20;
    const targets = [];
    
    for (let i = 0; i < NUM_TARGETS; i++) {
      const angle = Math.random() * Math.PI * 2;
      targets.push({
        id: i,
        x: margin + Math.random() * (GAME_WIDTH - 2 * margin),
        y: margin + Math.random() * (GAME_HEIGHT - 2 * margin),
        vx: Math.cos(angle) * BASE_SPEED,
        vy: Math.sin(angle) * BASE_SPEED,
        targetVx: Math.cos(angle) * BASE_SPEED,
        targetVy: Math.sin(angle) * BASE_SPEED,
        lastStrafeChange: performance.now(),
        health: HEALTH_MAX,
        isOnTarget: false,
        isRespawning: false,
      });
    }
    
    return targets;
  };

  const checkIfOnTarget = (target, mouseX, mouseY) => {
    if (!target || target.isRespawning) return false;
    const dx = mouseX - target.x;
    const dy = mouseY - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= TARGET_RADIUS;
  };

  const respawnTarget = (targetId) => {
    const margin = TARGET_RADIUS + 20;
    const angle = Math.random() * Math.PI * 2;
    
    targetsRef.current[targetId] = {
      ...targetsRef.current[targetId],
      x: margin + Math.random() * (GAME_WIDTH - 2 * margin),
      y: margin + Math.random() * (GAME_HEIGHT - 2 * margin),
      vx: Math.cos(angle) * BASE_SPEED,
      vy: Math.sin(angle) * BASE_SPEED,
      targetVx: Math.cos(angle) * BASE_SPEED,
      targetVy: Math.sin(angle) * BASE_SPEED,
      lastStrafeChange: performance.now(),
      health: HEALTH_MAX,
      isOnTarget: false,
      isRespawning: false,
    };
  };

  const gameLoop = (timestamp) => {
    if (gameStateRef.current !== 'playing') return;
    
    // Frame-rate independent delta calculation
    // This ensures movement is consistent regardless of FPS (60Hz, 144Hz, 240Hz, etc.)
    const elapsed = lastFrameTimeRef.current ? timestamp - lastFrameTimeRef.current : TARGET_FRAME_TIME;
    const delta = Math.min(elapsed / TARGET_FRAME_TIME, 3); // Cap at 3x to prevent huge jumps
    const deltaTime = elapsed / 1000; // For damage calculation (in seconds)
    lastFrameTimeRef.current = timestamp;
    
    // Use fixed dimensions instead of dynamic rect
    const margin = TARGET_RADIUS;
    let needsUpdate = false;
    
    // Update each target
    const targets = targetsRef.current;
    const numTargets = targets.length;
    
    for (let i = 0; i < numTargets; i++) {
      const target = targets[i];
      if (target.isRespawning) continue;
      
      // Smooth strafe pattern - change direction periodically
      const timeSinceStrafe = timestamp - target.lastStrafeChange;
      if (timeSinceStrafe > STRAFE_INTERVAL) {
        const angle = Math.random() * Math.PI * 2;
        target.targetVx = Math.cos(angle) * BASE_SPEED;
        target.targetVy = Math.sin(angle) * BASE_SPEED;
        target.lastStrafeChange = timestamp;
      }
      
      // Smoothly interpolate to target velocity
      target.vx += (target.targetVx - target.vx) * 0.05;
      target.vy += (target.targetVy - target.vy) * 0.05;
      
      // Move target (frame-rate independent)
      target.x += target.vx * delta;
      target.y += target.vy * delta;
      
      // Bounce off walls with smooth direction change (using fixed dimensions)
      if (target.x - margin < 0 || target.x + margin > GAME_WIDTH) {
        target.vx *= -1;
        target.targetVx *= -1;
        target.x = Math.max(margin, Math.min(GAME_WIDTH - margin, target.x));
      }
      if (target.y - margin < 0 || target.y + margin > GAME_HEIGHT) {
        target.vy *= -1;
        target.targetVy *= -1;
        target.y = Math.max(margin, Math.min(GAME_HEIGHT - margin, target.y));
      }
      
      // Check if mouse is on target
      const wasOnTarget = target.isOnTarget;
      target.isOnTarget = checkIfOnTarget(target, mouseXRef.current, mouseYRef.current);
      
      // Deal damage if on target (frame-rate independent)
      if (target.isOnTarget) {
        const damageThisFrame = DAMAGE_PER_SECOND * deltaTime;
        target.health = Math.max(0, target.health - damageThisFrame);
        needsUpdate = true;
        
        // Target eliminated
        if (target.health <= 0 && !target.isRespawning) {
          target.isRespawning = true;
          killsRef.current += 1;
          
          // Track switch time
          const now = performance.now();
          if (lastKillTimeRef.current > 0) {
            const switchTime = Math.round(now - lastKillTimeRef.current);
            switchTimesRef.current.push(switchTime);
          }
          lastKillTimeRef.current = now;
          
          // Respawn after delay
          setTimeout(() => {
            respawnTarget(i);
          }, RESPAWN_DELAY);
          
          needsUpdate = true;
        }
      }
      
      // Direct DOM update for smooth movement with hardware acceleration
      const targetEl = targetElementsRef.current[i];
      if (targetEl && !target.isRespawning) {
        // Use transform instead of left/top for better performance
        targetEl.style.transform = `translate3d(${target.x - TARGET_RADIUS}px, ${target.y - TARGET_RADIUS}px, 0)`;
        
        // Update visual feedback
        if (target.isOnTarget) {
          targetEl.style.background = 'linear-gradient(to bottom right, #06b6d4, #3b82f6)';
          targetEl.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.8)';
          targetEl.style.border = '2px solid #06b6d4';
        } else {
          targetEl.style.background = 'rgba(148, 163, 184, 0.4)';
          targetEl.style.boxShadow = 'none';
          targetEl.style.border = '2px solid rgba(148, 163, 184, 0.6)';
        }
        
        // Update health bar
        const healthBar = targetEl.querySelector('.health-bar');
        if (healthBar) {
          healthBar.style.width = `${(target.health / HEALTH_MAX) * 100}%`;
        }
      }
      
      // Visual feedback changed
      if (wasOnTarget !== target.isOnTarget) {
        needsUpdate = true;
      }
    }
    
    // Batch React state updates (only when needed)
    if (needsUpdate) {
      setKills(killsRef.current);
      const times = switchTimesRef.current;
      if (times.length > 0) {
        const sum = times.reduce((a, b) => a + b, 0);
        setAvgSwitchTime(Math.round(sum / times.length));
      }
    }
    
    // Record target positions for replay (every 4 frames ~30fps to reduce lag with 4 moving targets)
    if (replayRecorderRef.current && Math.floor(timestamp / 33) % 4 === 0) {
      for (let i = 0; i < numTargets; i++) {
        const target = targets[i];
        if (!target.isRespawning) {
          replayRecorderRef.current.recordEvent('move', {
            id: i,
            x: target.x,
            y: target.y
          });
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  const handleMouseMove = (e) => {
    if (gameStateRef.current !== 'playing') return;
    if (!gameAreaRef.current) return;
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    mouseXRef.current = e.clientX - rect.left;
    mouseYRef.current = e.clientY - rect.top;
    
    // Record mouse movement for replay
    if (replayRecorderRef.current) {
      replayRecorderRef.current.recordMouseMove(mouseXRef.current, mouseYRef.current);
    }
  };

  const startGame = async () => {
    // Start anti-cheat session
    const session = await startGameSession('switching', getUserUUID());
    if (!session) {
      console.error('Failed to start game session');
    }
    
    gameStateRef.current = 'playing';
    killsRef.current = 0;
    switchTimesRef.current = [];
    lastKillTimeRef.current = 0;
    lastFrameTimeRef.current = 0;
    
    // Initialize replay recorder
    replayRecorderRef.current = new ReplayRecorder('switching', {
      gameDuration: GAME_DURATION,
      gameWidth: GAME_WIDTH,
      gameHeight: GAME_HEIGHT,
      numTargets: NUM_TARGETS
    });
    replayRecorderRef.current.start();
    
    targetsRef.current = initializeTargets();
    
    // Record initial target spawns
    targetsRef.current.forEach((target, i) => {
      if (replayRecorderRef.current) {
        replayRecorderRef.current.recordEvent('spawn', {
          id: i,
          x: target.x,
          y: target.y,
          size: TARGET_SIZE
        });
      }
    });
    
    flushSync(() => {
      setGameState('playing');
      setTimeLeft(GAME_DURATION);
      setKills(0);
      setAvgSwitchTime(0);
    });
    
    // Start game loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    // Start timer
    const gameEndedRef = { current: false };
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!gameEndedRef.current) {
            gameEndedRef.current = true;
            setTimeout(() => endGame(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    gameStateRef.current = 'finished';
    setGameState('finished');

    const score = killsRef.current * 100;

    // Compute avgSwitchTime from ref to avoid stale state
    const times = switchTimesRef.current;
    const computedAvgSwitchTime = times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

    // Stop replay recording and save
    if (replayRecorderRef.current) {
      replayRecorderRef.current.stop();
      const stats = {
        kills: killsRef.current,
        avgSwitchTime: computedAvgSwitchTime,
      };
      const replayData = replayRecorderRef.current.getReplayData(
        getUserUUID(),
        nickname,
        score,
        stats
      );
      setLastReplay(replayData);
      saveReplay(replayData);
    }

    // Submit score through anti-cheat session
    const stats = {
      kills: killsRef.current,
      avgSwitchTime: computedAvgSwitchTime,
    };
    endGameSession(score, stats, nickname).then(result => {
      if (result?.success && result.leaderboard) {
        setLeaderboard(result.leaderboard);
      } else {
        console.warn('Session submission failed:', result?.error);
        syncLeaderboard('switching').then(setLeaderboard);
      }
    });
  };

  const resetGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    gameStateRef.current = 'idle';
    killsRef.current = 0;
    switchTimesRef.current = [];
    targetsRef.current = [];
    
    setGameState('idle');
    setTimeLeft(GAME_DURATION);
    setKills(0);
    setAvgSwitchTime(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerTitle}>
            <Crosshair size={24} color="#06b6d4" />
            <h1 style={styles.titleText}>Target Switching</h1>
          </div>
          
          {gameState === 'playing' && (
            <div style={styles.statsContainer}>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Time</p>
                <p style={styles.statValueOrange}>{timeLeft}s</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Kills</p>
                <p style={styles.statValueCyan}>{kills}</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Avg Switch</p>
                <p style={styles.statValue}>{avgSwitchTime}ms</p>
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
          ref={gameAreaRef} 
          onMouseMove={handleMouseMove}
          cursor="crosshair"
        >
          {gameState === 'idle' && (
          <div style={{...styles.idleOverlay, position: 'absolute', inset: 0}}>
            <Crosshair size={80} color="#06b6d4" style={{ marginBottom: '1.5rem' }} />
            <h2 style={styles.idleTitle}>Target Switching</h2>
            <p style={styles.idleDescription}>
              Track moving targets with your cursor to damage them. When a target's health reaches zero, 
              it will respawn and you switch to another target. Eliminate as many as possible in {GAME_DURATION} seconds!
            </p>
            <button onClick={startGame} style={styles.startButton}>
              <Play size={20} />
              Start Game
            </button>
          </div>
        )}


        {gameState === 'playing' && targetsRef.current.map((target, i) => (
          <div
            key={target.id}
            ref={el => targetElementsRef.current[i] = el}
            style={{
              ...styles.target,
              ...(target.isOnTarget ? styles.targetActive : styles.targetInactive),
              transform: `translate3d(${target.x - TARGET_RADIUS}px, ${target.y - TARGET_RADIUS}px, 0)`,
              display: target.isRespawning ? 'none' : 'flex',
            }}
          >
            <div style={styles.targetCenter} />
            <div style={styles.healthBarContainer}>
              <div 
                className="health-bar"
                style={{
                  ...styles.healthBar,
                  width: `${(target.health / HEALTH_MAX) * 100}%`,
                }}
              />
            </div>
          </div>
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
            <h2 style={styles.finishedTitle}>Time's Up!</h2>
            <p style={styles.finishedScore}>Kills: {kills}</p>
            
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
                <p style={styles.resultLabel}>Total Kills</p>
                <p style={styles.resultValueCyan}>{kills}</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Avg Switch</p>
                <p style={styles.resultValue}>{avgSwitchTime}ms</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Score</p>
                <p style={styles.resultValue}>{kills * 100}</p>
              </div>
            </div>
            
            <PostGameAnalytics
              gameType="switching"
              stats={{ score: kills * 100, kills, avgSwitchTime }}
              clickData={[]}
              trackingData={[]}
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
              <button onClick={startGame} style={styles.startButton}>
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
