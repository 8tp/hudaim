import { useState, useRef, useEffect } from 'react';
import { Move, RotateCcw, Play } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { ReplayRecorder, saveReplay } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import FixedGameArea, { GAME_WIDTH, GAME_HEIGHT } from '../components/FixedGameArea';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';
import GameFinished from '../components/GameFinished';

const GAME_DURATION = 30;
const TARGET_SIZE = 72;
const TARGET_RADIUS = 48;
const TARGET_FRAME_TIME = 1000 / 60;

const STRAFE_PATTERNS = {
  SMOOTH: 'smooth',
  REACTIVE: 'reactive',
  STUTTER: 'stutter',
  ZIGZAG: 'zigzag',
};

const getDifficultySettings = (accuracy) => {
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

const selectPattern = (weights) => {
  const rand = Math.random();
  let cumulative = 0;
  for (const [pattern, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (rand < cumulative) return pattern;
  }
  return STRAFE_PATTERNS.SMOOTH;
};

export default function Tracking() {
  const [gameState, setGameState] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [finalTrackingTime, setFinalTrackingTime] = useState(0);
  const [finalReactionTime, setFinalReactionTime] = useState(0);
  const [finalDifficulty, setFinalDifficulty] = useState('Easy');
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('tracking'));

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

  const currentPatternRef = useRef(STRAFE_PATTERNS.SMOOTH);
  const patternFrameRef = useRef(0);
  const strafeDirectionRef = useRef(1);
  const stutterPauseRef = useRef(false);
  const zigzagPhaseRef = useRef(0);

  const lastStrafeChangeRef = useRef(0);
  const wasOnTargetBeforeStrafeRef = useRef(false);
  const reactionTimesRef = useRef([]);
  const reacquiredTargetRef = useRef(false);

  const currentDifficultyRef = useRef(getDifficultySettings(0));
  const rollingAccuracyRef = useRef(0);
  const accuracySamplesRef = useRef([]);

  const pointsAccumulatedRef = useRef(0);
  const difficultyTimeRef = useRef({ easy: 0, easyPlus: 0, medium: 0, hard: 0, insane: 0 });

  const initialBoundsRef = useRef(null);
  const cheatedRef = useRef(false);

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

      const elapsed = lastFrameRef.current ? timestamp - lastFrameRef.current : TARGET_FRAME_TIME;
      const delta = Math.min(elapsed / TARGET_FRAME_TIME, 3);
      lastFrameRef.current = timestamp;
      frameCount++;
      totalFrames++;

      const bounds = boundsRef.current;
      let { x, y } = targetPosRef.current;
      let { vx, vy } = velocityRef.current;
      const difficulty = currentDifficultyRef.current;

      if (frameCount % 60 === 0) {
        const currentAccuracy = totalFrames > 0 ? (onTargetFrames / totalFrames) * 100 : 0;
        accuracySamplesRef.current.push(currentAccuracy);
        if (accuracySamplesRef.current.length > 5) {
          accuracySamplesRef.current.shift();
        }
        rollingAccuracyRef.current = accuracySamplesRef.current.reduce((a, b) => a + b, 0) / accuracySamplesRef.current.length;

        currentDifficultyRef.current = getDifficultySettings(rollingAccuracyRef.current);

        let diffLabel = 'Easy';
        let pointMultiplier = 1;
        if (rollingAccuracyRef.current >= 85) { diffLabel = 'Insane'; pointMultiplier = 5; difficultyTimeRef.current.insane++; }
        else if (rollingAccuracyRef.current >= 70) { diffLabel = 'Hard'; pointMultiplier = 3; difficultyTimeRef.current.hard++; }
        else if (rollingAccuracyRef.current >= 50) { diffLabel = 'Medium'; pointMultiplier = 2; difficultyTimeRef.current.medium++; }
        else if (rollingAccuracyRef.current >= 30) { diffLabel = 'Easy+'; pointMultiplier = 1.5; difficultyTimeRef.current.easyPlus++; }
        else { difficultyTimeRef.current.easy++; }

        if (isOnTargetRef.current) {
          pointsAccumulatedRef.current += pointMultiplier * 10;
        }

        if (difficultyDisplayRef.current) {
          difficultyDisplayRef.current.textContent = diffLabel;
        }
      }

      patternFrameRef.current++;

      if (patternFrameRef.current >= difficulty.strafeInterval) {
        patternFrameRef.current = 0;

        wasOnTargetBeforeStrafeRef.current = isOnTargetRef.current;
        lastStrafeChangeRef.current = timestamp;
        reacquiredTargetRef.current = false;

        currentPatternRef.current = selectPattern(difficulty.patternWeight);

        if (currentPatternRef.current === STRAFE_PATTERNS.REACTIVE) {
          const angle = (Math.random() * Math.PI) + Math.PI / 2;
          const spd = difficulty.baseSpeed + Math.random() * (difficulty.maxSpeed - difficulty.baseSpeed);
          vx = Math.cos(angle) * spd * strafeDirectionRef.current;
          vy = Math.sin(angle) * spd * (Math.random() > 0.5 ? 1 : -1);
          strafeDirectionRef.current *= -1;
        } else if (currentPatternRef.current === STRAFE_PATTERNS.STUTTER) {
          const stutterSpeed = difficulty.baseSpeed + Math.random() * (difficulty.maxSpeed - difficulty.baseSpeed);
          vx = (Math.random() - 0.5) * stutterSpeed * 2;
          vy = (Math.random() - 0.5) * stutterSpeed * 2;
        } else if (currentPatternRef.current === STRAFE_PATTERNS.ZIGZAG) {
          zigzagPhaseRef.current = (zigzagPhaseRef.current + 1) % 4;
          const zigSpd = difficulty.baseSpeed + Math.random() * 2;
          if (zigzagPhaseRef.current === 0) { vx = zigSpd; vy = zigSpd * 0.5; }
          else if (zigzagPhaseRef.current === 1) { vx = -zigSpd; vy = zigSpd * 0.5; }
          else if (zigzagPhaseRef.current === 2) { vx = -zigSpd; vy = -zigSpd * 0.5; }
          else { vx = zigSpd; vy = -zigSpd * 0.5; }
        } else {
          vx += (Math.random() - 0.5) * 1.5;
          vy += (Math.random() - 0.5) * 1.5;
        }
      }

      x += vx * delta;
      y += vy * delta;

      if (x <= 0 || x >= bounds.width - TARGET_SIZE) {
        vx *= -1;
        x = Math.max(0, Math.min(bounds.width - TARGET_SIZE, x));
      }
      if (y <= 0 || y >= bounds.height - TARGET_SIZE) {
        vy *= -1;
        y = Math.max(0, Math.min(bounds.height - TARGET_SIZE, y));
      }

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

        if (!reacquiredTargetRef.current && lastStrafeChangeRef.current > 0) {
          const reactionTime = timestamp - lastStrafeChangeRef.current;
          if (reactionTime >= 50 && reactionTime < 2000) {
            reactionTimesRef.current.push(reactionTime);

            if (reactionDisplayRef.current) {
              const avgReaction = Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length);
              reactionDisplayRef.current.textContent = avgReaction + 'ms';
            }
          }
          reacquiredTargetRef.current = true;
        }
      } else {
        if (lastStrafeChangeRef.current > 0 && reacquiredTargetRef.current) {
          reacquiredTargetRef.current = false;
        }
      }

      const targetEl = targetRef.current;
      const cursorEl = cursorRef.current;

      if (targetEl) {
        targetEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      if (cursorEl) {
        cursorEl.style.transform = `translate3d(${cursorPosRef.current.x - 10}px, ${cursorPosRef.current.y - 10}px, 0)`;
      }

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

      if (frameCount % 3 === 0 && trackingDisplayRef.current) {
        trackingDisplayRef.current.textContent = (Math.round(trackingTimeRef.current * 10) / 10) + 's';
      }

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

    const avgReaction = reactionTimesRef.current.length > 0
      ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
      : 0;
    setFinalReactionTime(avgReaction);

    let diffLabel = 'Easy';
    if (rollingAccuracyRef.current >= 85) diffLabel = 'Insane';
    else if (rollingAccuracyRef.current >= 70) diffLabel = 'Hard';
    else if (rollingAccuracyRef.current >= 50) diffLabel = 'Medium';
    else if (rollingAccuracyRef.current >= 30) diffLabel = 'Easy+';
    setFinalDifficulty(diffLabel);

    setTimeLeft(0);
    setGameState('finished');

    if (cheatedRef.current) return;

    const accumulatedPoints = Math.round(pointsAccumulatedRef.current);
    const diffTime = difficultyTimeRef.current;

    const difficultyTimeBonus =
      (diffTime.easyPlus * 5) +
      (diffTime.medium * 15) +
      (diffTime.hard * 40) +
      (diffTime.insane * 100);

    const reactionBonus = avgReaction > 0 ? Math.max(0, 100 - Math.floor(avgReaction / 5)) : 0;
    const finalScore = accumulatedPoints + difficultyTimeBonus + reactionBonus;

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
    const session = await startGameSession('tracking', getUserUUID());
    if (!session) {
      console.error('Failed to start game session');
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      boundsRef.current = { width: rect.width, height: rect.height };
      targetPosRef.current = { x: rect.width / 2 - TARGET_SIZE / 2, y: rect.height / 2 - TARGET_SIZE / 2 };
      initialBoundsRef.current = { width: rect.width, height: rect.height };
    }

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

    pointsAccumulatedRef.current = 0;
    difficultyTimeRef.current = { easy: 0, easyPlus: 0, medium: 0, hard: 0, insane: 0 };
    cheatedRef.current = false;

    replayRecorderRef.current = new ReplayRecorder('tracking', {
      gameDuration: GAME_DURATION,
      gameWidth: GAME_WIDTH,
      gameHeight: GAME_HEIGHT
    });
    replayRecorderRef.current.start();

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
    <div className="flex-1 flex flex-col h-full">
      {/* Header stats bar */}
      <div className="game-header">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Move size={24} className="text-purple-500" />
            <h1 className="text-xl font-bold text-white">Tracking</h1>
          </div>

          {gameState === 'playing' && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-slate-400">Time</p>
                <p className="text-lg font-bold text-purple-400">{timeLeft}s</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Tracking</p>
                <p ref={trackingDisplayRef} className="text-lg font-bold text-green-500">0s</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Reaction</p>
                <p ref={reactionDisplayRef} className="text-lg font-bold text-white">--</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Difficulty</p>
                <p ref={difficultyDisplayRef} className="text-lg font-bold text-purple-400">Easy</p>
              </div>
            </div>
          )}

          <button onClick={resetGame} className="btn-secondary">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in-up cursor-default">
              <Move size={80} className="text-purple-500 mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">Tracking</h2>
              <p className="text-slate-400 mb-8 text-center max-w-sm px-4">
                Keep your cursor on the moving target for as long as possible.
                You have {GAME_DURATION} seconds to maximize your tracking time!
              </p>
              <button onClick={startGame} className="btn-primary bg-gradient-to-r from-purple-500 to-pink-500">
                <Play size={20} />
                Start Game
              </button>
            </div>
          )}

          {/* Target, cursor, indicator all stay inline - 60fps DOM manipulation */}
          {gameState === 'playing' && (
            <>
              <div
                ref={targetRef}
                style={{
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
                  transform: `translate3d(${targetPosRef.current.x}px, ${targetPosRef.current.y}px, 0)`,
                  backfaceVisibility: 'hidden',
                  pointerEvents: 'none',
                  left: 0,
                  top: 0,
                }}
              >
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>

              <div
                ref={cursorRef}
                style={{
                  position: 'absolute',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '3px solid #22d3ee',
                  pointerEvents: 'none',
                  transform: `translate3d(${cursorPosRef.current.x - 10}px, ${cursorPosRef.current.y - 10}px, 0)`,
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                  left: 0,
                  top: 0,
                }}
              />

              <div
                ref={indicatorRef}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg font-bold"
              >
                OFF TARGET
              </div>
            </>
          )}
        </FixedGameArea>
      )}

      {gameState === 'finished' && (
        <GameFinished
          title="Time's Up!"
          subtitle={`Tracking: ${trackingPercentage}%`}
          subtitleColor="text-purple-400"
          stats={[
            { label: 'Time On Target', value: `${finalTrackingTime.toFixed(1)}s`, color: 'text-green-500' },
            { label: 'Accuracy', value: `${trackingPercentage}%`, color: 'text-purple-400' },
            { label: 'Reaction', value: finalReactionTime > 0 ? `${finalReactionTime}ms` : '--', color: 'text-white' },
            { label: 'Max Difficulty', value: finalDifficulty, color: 'text-purple-400' },
            { label: 'Total Time', value: `${GAME_DURATION}s`, color: 'text-white' },
          ]}
          statGridCols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          leaderboard={leaderboard}
          leaderboardScoreColor="text-purple-400"
          nickname={nickname}
          onNicknameChange={handleNicknameChange}
          onPlayAgain={startGame}
          onViewReplay={lastReplay ? () => setShowReplayViewer(true) : null}
          gradientClasses="from-purple-500 to-pink-500"
        >
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
        </GameFinished>
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
