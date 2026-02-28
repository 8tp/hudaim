import { useState, useRef, useEffect } from 'react';
import { Move, RotateCcw, Trophy, Play, User, Zap, Video } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { ReplayRecorder, saveReplay } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import FixedGameArea, { GAME_WIDTH, GAME_HEIGHT } from '../components/FixedGameArea';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';

const GAME_DURATION = 30;
const TARGET_SIZE = 72;  // Increased from 60 (20% larger)
const TARGET_RADIUS = 48; // Increased from 40 (20% larger)

// Target frame rate for consistent movement (60 FPS)
const TARGET_FRAME_TIME = 1000 / 60; // ~16.67ms

// Strafe pattern types (Kovaaks-style)
const STRAFE_PATTERNS = {
  SMOOTH: 'smooth',      // Smooth continuous movement
  REACTIVE: 'reactive',  // Quick direction changes
  STUTTER: 'stutter',    // Stop-start movement
  ZIGZAG: 'zigzag',      // Sharp zigzag pattern
};

// Difficulty settings that scale with player accuracy
const getDifficultySettings = (accuracy) => {
  // accuracy is 0-100
  if (accuracy < 30) {
    return { baseSpeed: 2, maxSpeed: 3.5, strafeInterval: 90, patternWeight: { smooth: 0.7, reactive: 0.2, stutter: 0.1, zigzag: 0 } };
  } else if (accuracy < 50) {
    return { baseSpeed: 2.5, maxSpeed: 4.5, strafeInterval: 70, patternWeight: { smooth: 0.4, reactive: 0.35, stutter: 0.15, zigzag: 0.1 } };
  } else if (accuracy < 70) {
    return { baseSpeed: 3, maxSpeed: 5.5, strafeInterval: 50, patternWeight: { smooth: 0.2, reactive: 0.4, stutter: 0.2, zigzag: 0.2 } };
  } else if (accuracy < 85) {
    return { baseSpeed: 3.5, maxSpeed: 6.5, strafeInterval: 35, patternWeight: { smooth: 0.1, reactive: 0.35, stutter: 0.25, zigzag: 0.3 } };
  } else {
    return { baseSpeed: 4, maxSpeed: 7.5, strafeInterval: 25, patternWeight: { smooth: 0.05, reactive: 0.3, stutter: 0.3, zigzag: 0.35 } };
  }
};

// Select a strafe pattern based on weights
const selectPattern = (weights) => {
  const rand = Math.random();
  let cumulative = 0;
  for (const [pattern, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (rand < cumulative) return pattern;
  }
  return STRAFE_PATTERNS.SMOOTH;
};

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
  statValueGreen: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#22c55e',
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
    cursor: 'none',
    transform: 'translate3d(0, 0, 0)',
    willChange: 'transform',
  },
  idleOverlay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'default',
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
  },
  target: {
    position: 'absolute',
    width: `${TARGET_SIZE}px`,
    height: `${TARGET_SIZE}px`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'none',
    transition: 'none',
    willChange: 'transform',
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden',
    pointerEvents: 'none',
  },
  targetCenter: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'white',
  },
  cursor: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '3px solid #22d3ee',
    pointerEvents: 'none',
    transform: 'translate3d(-50%, -50%, 0)',
    willChange: 'transform',
    backfaceVisibility: 'hidden',
  },
  trackingIndicator: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  finishedOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    cursor: 'default',
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

export default function Tracking() {
  const [gameState, setGameState] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [finalTrackingTime, setFinalTrackingTime] = useState(0);
  const [finalReactionTime, setFinalReactionTime] = useState(0);
  const [finalDifficulty, setFinalDifficulty] = useState('Easy');
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('tracking'));

  // Sync leaderboard from server on mount
  useEffect(() => {
    syncLeaderboard('tracking').then(setLeaderboard);
  }, []);
  
  const containerRef = useRef(null);
  const targetRef = useRef(null);
  const cursorRef = useRef(null);
  const indicatorRef = useRef(null);
  const trackingDisplayRef = useRef(null);
  const reactionDisplayRef = useRef(null);
  const difficultyDisplayRef = useRef(null);
  const velocityRef = useRef({ vx: 2, vy: 1.5 });
  const timerRef = useRef(null);
  const animationRef = useRef(null);
  const lastFrameRef = useRef(0);
  const boundsRef = useRef({ width: GAME_WIDTH, height: GAME_HEIGHT });
  const trackingTimeRef = useRef(0);
  const gameStateRef = useRef('idle');
  const targetPosRef = useRef({ x: 300, y: 200 });
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const isOnTargetRef = useRef(false);
  
  // Strafe pattern state
  const currentPatternRef = useRef(STRAFE_PATTERNS.SMOOTH);
  const patternFrameRef = useRef(0);
  const strafeDirectionRef = useRef(1);
  const stutterPauseRef = useRef(false);
  const zigzagPhaseRef = useRef(0);
  
  // Reaction time tracking
  const lastStrafeChangeRef = useRef(0);
  const wasOnTargetBeforeStrafeRef = useRef(false);
  const reactionTimesRef = useRef([]);
  const reacquiredTargetRef = useRef(false);
  
  // Difficulty tracking
  const currentDifficultyRef = useRef(getDifficultySettings(0));
  const rollingAccuracyRef = useRef(0);
  const accuracySamplesRef = useRef([]);
  
  // Point multiplier tracking (accumulates during higher difficulties)
  const pointsAccumulatedRef = useRef(0);
  const difficultyTimeRef = useRef({ easy: 0, easyPlus: 0, medium: 0, hard: 0, insane: 0 });
  
  // Anti-cheat: track initial game area size
  const initialBoundsRef = useRef(null);
  const cheatedRef = useRef(false);
  
  // Replay recording
  const replayRecorderRef = useRef(null);
  const [lastReplay, setLastReplay] = useState(null);
  const [showReplayViewer, setShowReplayViewer] = useState(false);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let frameCount = 0;
    let totalFrames = 0;
    let onTargetFrames = 0;
    
    const animate = (timestamp) => {
      if (gameStateRef.current !== 'playing') return;
      
      
      // Frame-rate independent delta calculation
      // This ensures movement is consistent regardless of FPS (60Hz, 144Hz, 240Hz, etc.)
      const elapsed = lastFrameRef.current ? timestamp - lastFrameRef.current : TARGET_FRAME_TIME;
      const delta = Math.min(elapsed / TARGET_FRAME_TIME, 3); // Cap at 3x to prevent huge jumps
      lastFrameRef.current = timestamp;
      frameCount++;
      totalFrames++;
      
      const bounds = boundsRef.current;
      let { x, y } = targetPosRef.current;
      let { vx, vy } = velocityRef.current;
      const difficulty = currentDifficultyRef.current;
      
      // Fixed game area - no need to check for resize cheating
      // The game area is now a fixed 960x540 size
      
      // Update rolling accuracy every 60 frames (~1 second)
      if (frameCount % 60 === 0) {
        const currentAccuracy = totalFrames > 0 ? (onTargetFrames / totalFrames) * 100 : 0;
        accuracySamplesRef.current.push(currentAccuracy);
        if (accuracySamplesRef.current.length > 5) {
          accuracySamplesRef.current.shift();
        }
        rollingAccuracyRef.current = accuracySamplesRef.current.reduce((a, b) => a + b, 0) / accuracySamplesRef.current.length;
        
        // Update difficulty based on rolling accuracy
        currentDifficultyRef.current = getDifficultySettings(rollingAccuracyRef.current);
        
        // Track time spent at each difficulty and accumulate points
        let diffLabel = 'Easy';
        let pointMultiplier = 1;
        if (rollingAccuracyRef.current >= 85) { diffLabel = 'Insane'; pointMultiplier = 5; difficultyTimeRef.current.insane++; }
        else if (rollingAccuracyRef.current >= 70) { diffLabel = 'Hard'; pointMultiplier = 3; difficultyTimeRef.current.hard++; }
        else if (rollingAccuracyRef.current >= 50) { diffLabel = 'Medium'; pointMultiplier = 2; difficultyTimeRef.current.medium++; }
        else if (rollingAccuracyRef.current >= 30) { diffLabel = 'Easy+'; pointMultiplier = 1.5; difficultyTimeRef.current.easyPlus++; }
        else { difficultyTimeRef.current.easy++; }
        
        // Accumulate points based on current difficulty (only if on target)
        if (isOnTargetRef.current) {
          pointsAccumulatedRef.current += pointMultiplier * 10;
        }
        
        // Update difficulty display
        if (difficultyDisplayRef.current) {
          difficultyDisplayRef.current.textContent = diffLabel;
        }
      }
      
      // Pattern-based movement
      patternFrameRef.current++;
      
      // Check if it's time for a strafe change
      if (patternFrameRef.current >= difficulty.strafeInterval) {
        patternFrameRef.current = 0;
        
        // Record if player was on target before strafe
        wasOnTargetBeforeStrafeRef.current = isOnTargetRef.current;
        lastStrafeChangeRef.current = timestamp;
        reacquiredTargetRef.current = false;
        
        // Select new pattern
        currentPatternRef.current = selectPattern(difficulty.patternWeight);
        
        // Execute strafe based on pattern
        if (currentPatternRef.current === STRAFE_PATTERNS.REACTIVE) {
          // Sharp 90-180 degree direction change
          const angle = (Math.random() * Math.PI) + Math.PI / 2;
          const spd = difficulty.baseSpeed + Math.random() * (difficulty.maxSpeed - difficulty.baseSpeed);
          vx = Math.cos(angle) * spd * strafeDirectionRef.current;
          vy = Math.sin(angle) * spd * (Math.random() > 0.5 ? 1 : -1);
          strafeDirectionRef.current *= -1;
        } else if (currentPatternRef.current === STRAFE_PATTERNS.STUTTER) {
          // Quick speed changes (no pausing - always moving)
          const stutterSpeed = difficulty.baseSpeed + Math.random() * (difficulty.maxSpeed - difficulty.baseSpeed);
          // Sudden direction change with speed variation
          vx = (Math.random() - 0.5) * stutterSpeed * 2;
          vy = (Math.random() - 0.5) * stutterSpeed * 2;
        } else if (currentPatternRef.current === STRAFE_PATTERNS.ZIGZAG) {
          // Sharp zigzag - alternate between two diagonal directions
          zigzagPhaseRef.current = (zigzagPhaseRef.current + 1) % 4;
          const zigSpd = difficulty.baseSpeed + Math.random() * 2;
          if (zigzagPhaseRef.current === 0) { vx = zigSpd; vy = zigSpd * 0.5; }
          else if (zigzagPhaseRef.current === 1) { vx = -zigSpd; vy = zigSpd * 0.5; }
          else if (zigzagPhaseRef.current === 2) { vx = -zigSpd; vy = -zigSpd * 0.5; }
          else { vx = zigSpd; vy = -zigSpd * 0.5; }
        } else {
          // SMOOTH - Gentle direction adjustment
          vx += (Math.random() - 0.5) * 1.5;
          vy += (Math.random() - 0.5) * 1.5;
        }
      }
      
      // Apply movement (always moving now)
      x += vx * delta;
      y += vy * delta;
      
      // Bounce off walls
      if (x <= 0 || x >= bounds.width - TARGET_SIZE) {
        vx *= -1;
        x = Math.max(0, Math.min(bounds.width - TARGET_SIZE, x));
      }
      if (y <= 0 || y >= bounds.height - TARGET_SIZE) {
        vy *= -1;
        y = Math.max(0, Math.min(bounds.height - TARGET_SIZE, y));
      }
      
      // Clamp speed
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed < difficulty.baseSpeed) {
        const scale = difficulty.baseSpeed / speed;
        vx *= scale;
        vy *= scale;
      } else if (speed > difficulty.maxSpeed) {
        const scale = difficulty.maxSpeed / speed;
        vx *= scale;
        vy *= scale;
      }
      
      velocityRef.current = { vx, vy };
      targetPosRef.current = { x, y };
      
      // Check if cursor is on target
      const centerX = x + TARGET_SIZE / 2;
      const centerY = y + TARGET_SIZE / 2;
      const cx = cursorPosRef.current.x;
      const cy = cursorPosRef.current.y;
      const dx = cx - centerX;
      const dy = cy - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const onTarget = dist < TARGET_RADIUS;
      
      if (onTarget) {
        trackingTimeRef.current += delta / 60;
        onTargetFrames++;
        
        // Track reaction time - time to get back on target after ANY strafe change
        if (!reacquiredTargetRef.current && lastStrafeChangeRef.current > 0) {
          const reactionTime = timestamp - lastStrafeChangeRef.current;
          // Only count reasonable reaction times (50ms to 2000ms)
          if (reactionTime >= 50 && reactionTime < 2000) {
            reactionTimesRef.current.push(reactionTime);
            
            // Update reaction time display
            if (reactionDisplayRef.current) {
              const avgReaction = Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length);
              reactionDisplayRef.current.textContent = avgReaction + 'ms';
            }
          }
          reacquiredTargetRef.current = true;
        }
      } else {
        // When off target after a strafe, mark as not reacquired so we can track next acquisition
        if (lastStrafeChangeRef.current > 0 && reacquiredTargetRef.current) {
          // Player lost target - next time they get on target will count as a new reaction
          reacquiredTargetRef.current = false;
        }
      }
      
      // Direct DOM updates with hardware acceleration
      // Update positions (every frame)
      const targetEl = targetRef.current;
      const cursorEl = cursorRef.current;
      
      if (targetEl) {
        targetEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      if (cursorEl) {
        cursorEl.style.transform = `translate3d(${cursorPosRef.current.x - 10}px, ${cursorPosRef.current.y - 10}px, 0)`;
      }
      
      // Update visual feedback (only when state changes)
      const wasOnTarget = isOnTargetRef.current;
      if (onTarget !== wasOnTarget) {
        if (targetEl) {
          targetEl.style.background = onTarget
            ? 'linear-gradient(to bottom right, #22c55e, #16a34a)'
            : 'linear-gradient(to bottom right, #a855f7, #ec4899)';
          targetEl.style.boxShadow = onTarget
            ? '0 0 30px rgba(34, 197, 94, 0.8)'
            : '0 10px 25px rgba(168, 85, 247, 0.4)';
        }
        if (cursorEl) {
          cursorEl.style.borderColor = onTarget ? '#22c55e' : '#22d3ee';
        }
        const indicatorEl = indicatorRef.current;
        if (indicatorEl) {
          indicatorEl.style.backgroundColor = onTarget ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
          indicatorEl.style.color = onTarget ? '#22c55e' : '#ef4444';
          indicatorEl.textContent = onTarget ? 'ON TARGET' : 'OFF TARGET';
        }
      }
      
      // Update tracking time display (every 3 frames to reduce overhead)
      if (frameCount % 3 === 0 && trackingDisplayRef.current) {
        trackingDisplayRef.current.textContent = (Math.round(trackingTimeRef.current * 10) / 10) + 's';
      }
      
      // Record target position for replay (every 2 frames to balance smoothness vs data size)
      if (frameCount % 2 === 0 && replayRecorderRef.current) {
        replayRecorderRef.current.recordEvent('move', {
          id: 'target',
          x: x + TARGET_SIZE / 2,
          y: y + TARGET_SIZE / 2
        });
      }
      
      isOnTargetRef.current = onTarget;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState]);

  const endTrackingGameRef = useRef(null);
  const endTrackingGame = () => {
    clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    gameStateRef.current = 'finished';
    setFinalTrackingTime(trackingTimeRef.current);

    // Calculate final reaction time
    const avgReaction = reactionTimesRef.current.length > 0
      ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
      : 0;
    setFinalReactionTime(avgReaction);

    // Calculate final difficulty reached
    let diffLabel = 'Easy';
    if (rollingAccuracyRef.current >= 85) diffLabel = 'Insane';
    else if (rollingAccuracyRef.current >= 70) diffLabel = 'Hard';
    else if (rollingAccuracyRef.current >= 50) diffLabel = 'Medium';
    else if (rollingAccuracyRef.current >= 30) diffLabel = 'Easy+';
    setFinalDifficulty(diffLabel);

    setTimeLeft(0);
    setGameState('finished');

    // Check if player cheated by resizing
    if (cheatedRef.current) {
      return;
    }

    // Aggressive difficulty-based scoring
    const accumulatedPoints = Math.round(pointsAccumulatedRef.current);
    const diffTime = difficultyTimeRef.current;

    const difficultyTimeBonus =
      (diffTime.easyPlus * 5) +
      (diffTime.medium * 15) +
      (diffTime.hard * 40) +
      (diffTime.insane * 100);

    const reactionBonus = avgReaction > 0 ? Math.max(0, 100 - Math.floor(avgReaction / 5)) : 0;
    const finalScore = accumulatedPoints + difficultyTimeBonus + reactionBonus;

    // Stop replay recording and save
    if (replayRecorderRef.current) {
      replayRecorderRef.current.stop();
      const stats = {
        trackingTime: trackingTimeRef.current.toFixed(1),
        percentage: Math.round((trackingTimeRef.current / GAME_DURATION) * 100),
        reactionTime: avgReaction,
        difficulty: diffLabel,
        difficultyBreakdown: diffTime
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
      trackingTime: trackingTimeRef.current.toFixed(1),
      percentage: Math.round((trackingTimeRef.current / GAME_DURATION) * 100),
      reactionTime: avgReaction,
      difficulty: diffLabel,
      difficultyBreakdown: diffTime
    };
    endGameSession(finalScore, stats, nickname).then(result => {
      if (result?.success && result.leaderboard) {
        setLeaderboard(result.leaderboard);
      } else {
        console.warn('Session submission failed:', result?.error);
        syncLeaderboard('tracking').then(setLeaderboard);
      }
    });
  };
  endTrackingGameRef.current = endTrackingGame;

  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameEndedRef = { current: false };

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!gameEndedRef.current) {
            gameEndedRef.current = true;
            setTimeout(() => endTrackingGameRef.current(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const startGame = async () => {
    // Start anti-cheat session
    const session = await startGameSession('tracking', getUserUUID());
    if (!session) {
      console.error('Failed to start game session');
    }
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      boundsRef.current = { width: rect.width, height: rect.height };
      targetPosRef.current = { x: rect.width / 2 - TARGET_SIZE / 2, y: rect.height / 2 - TARGET_SIZE / 2 };
      // Store initial bounds for anti-cheat
      initialBoundsRef.current = { width: rect.width, height: rect.height };
    }
    
    // Reset all refs
    gameStateRef.current = 'playing';
    trackingTimeRef.current = 0;
    velocityRef.current = { vx: 2, vy: 1.5 };
    lastFrameRef.current = 0;
    isOnTargetRef.current = false;
    currentPatternRef.current = STRAFE_PATTERNS.SMOOTH;
    patternFrameRef.current = 0;
    strafeDirectionRef.current = 1;
    stutterPauseRef.current = false;
    zigzagPhaseRef.current = 0;
    lastStrafeChangeRef.current = 0;
    wasOnTargetBeforeStrafeRef.current = false;
    reactionTimesRef.current = [];
    reacquiredTargetRef.current = false;
    currentDifficultyRef.current = getDifficultySettings(0);
    rollingAccuracyRef.current = 0;
    accuracySamplesRef.current = [];
    
    // Reset point tracking
    pointsAccumulatedRef.current = 0;
    difficultyTimeRef.current = { easy: 0, easyPlus: 0, medium: 0, hard: 0, insane: 0 };
    cheatedRef.current = false;
    
    // Initialize replay recorder
    replayRecorderRef.current = new ReplayRecorder('tracking', {
      gameDuration: GAME_DURATION,
      gameWidth: GAME_WIDTH,
      gameHeight: GAME_HEIGHT
    });
    replayRecorderRef.current.start();
    
    // Record initial target spawn
    if (replayRecorderRef.current) {
      replayRecorderRef.current.recordEvent('spawn', {
        id: 'target',
        x: targetPosRef.current.x + TARGET_SIZE / 2,
        y: targetPosRef.current.y + TARGET_SIZE / 2,
        size: TARGET_SIZE
      });
    }
    
    setGameState('playing');
    setTimeLeft(GAME_DURATION);
    setFinalReactionTime(0);
    setFinalDifficulty('Easy');
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    cursorPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    // Record mouse movement for replay
    if (replayRecorderRef.current && gameStateRef.current === 'playing') {
      replayRecorderRef.current.recordMouseMove(
        cursorPosRef.current.x,
        cursorPosRef.current.y
      );
    }
  };

  const resetGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    gameStateRef.current = 'idle';
    trackingTimeRef.current = 0;
    isOnTargetRef.current = false;
    reactionTimesRef.current = [];
    accuracySamplesRef.current = [];
    pointsAccumulatedRef.current = 0;
    difficultyTimeRef.current = { easy: 0, easyPlus: 0, medium: 0, hard: 0, insane: 0 };
    cheatedRef.current = false;
    initialBoundsRef.current = null;
    setGameState('idle');
    setTimeLeft(GAME_DURATION);
    setFinalTrackingTime(0);
    setFinalReactionTime(0);
    setFinalDifficulty('Easy');
  };

  const handleNicknameChange = (e) => {
    const newNickname = setNickname(e.target.value);
    setNicknameState(newNickname);
  };

  const trackingPercentage = Math.round((finalTrackingTime / GAME_DURATION) * 100);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerTitle}>
            <Move size={24} color="#a855f7" />
            <h1 style={styles.titleText}>Tracking</h1>
          </div>
          
          {gameState === 'playing' && (
            <div style={styles.statsContainer}>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Time</p>
                <p style={styles.statValuePurple}>{timeLeft}s</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Tracking</p>
                <p ref={trackingDisplayRef} style={styles.statValueGreen}>0s</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Reaction</p>
                <p ref={reactionDisplayRef} style={styles.statValue}>--</p>
              </div>
              <div style={styles.statItem}>
                <p style={styles.statLabel}>Difficulty</p>
                <p ref={difficultyDisplayRef} style={styles.statValuePurple}>Easy</p>
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
          onMouseMove={handleMouseMove}
          cursor="none"
        >
          {gameState === 'idle' && (
          <div style={{...styles.idleOverlay, position: 'absolute', inset: 0}}>
            <Move size={80} color="#a855f7" style={{ marginBottom: '1.5rem' }} />
            <h2 style={styles.idleTitle}>Tracking</h2>
            <p style={styles.idleDescription}>
              Keep your cursor on the moving target for as long as possible.
              You have {GAME_DURATION} seconds to maximize your tracking time!
            </p>
            <button onClick={startGame} style={styles.startButton}>
              <Play size={20} />
              Start Game
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            <div
              ref={targetRef}
              style={{
                ...styles.target,
                left: 0,
                top: 0,
                transform: `translate3d(${targetPosRef.current.x}px, ${targetPosRef.current.y}px, 0)`,
              }}
            >
              <div style={styles.targetCenter} />
            </div>
            
            <div
              ref={cursorRef}
              style={{
                ...styles.cursor,
                left: 0,
                top: 0,
                transform: `translate3d(${cursorPosRef.current.x - 10}px, ${cursorPosRef.current.y - 10}px, 0)`,
              }}
            />
            
            <div
              ref={indicatorRef}
              style={styles.trackingIndicator}
            >
              OFF TARGET
            </div>
          </>
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
            maxWidth: '900px',
            width: '100%',
            textAlign: 'center',
          }}>
            <Trophy size={64} color="#facc15" style={{ marginBottom: '1rem' }} />
            <h2 style={styles.finishedTitle}>Time's Up!</h2>
            <p style={styles.finishedScore}>Tracking: {trackingPercentage}%</p>
            
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
            
            <div style={{...styles.resultsGrid, gridTemplateColumns: 'repeat(5, 1fr)'}}>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Time On Target</p>
                <p style={styles.resultValueGreen}>{finalTrackingTime.toFixed(1)}s</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Accuracy</p>
                <p style={styles.resultValuePurple}>{trackingPercentage}%</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Reaction</p>
                <p style={styles.resultValue}>{finalReactionTime > 0 ? finalReactionTime + 'ms' : '--'}</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Max Difficulty</p>
                <p style={styles.resultValuePurple}>{finalDifficulty}</p>
              </div>
              <div style={styles.resultCard}>
                <p style={styles.resultLabel}>Total Time</p>
                <p style={styles.resultValue}>{GAME_DURATION}s</p>
              </div>
            </div>
            
            <PostGameAnalytics
              gameType="tracking"
              stats={{ 
                score: Math.round(pointsAccumulatedRef.current), 
                accuracy: trackingPercentage,
                trackingTime: finalTrackingTime 
              }}
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
