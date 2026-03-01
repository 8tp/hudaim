import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Crosshair, RotateCcw, Play } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { ReplayRecorder, saveReplay } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import FixedGameArea, { GAME_WIDTH, GAME_HEIGHT } from '../components/FixedGameArea';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';
import GameFinished from '../components/GameFinished';

const GAME_DURATION = 60;
const TARGET_SIZE = 60;
const TARGET_RADIUS = 30;
const NUM_TARGETS = 4;
const BASE_SPEED = 2;
const HEALTH_MAX = 100;
const DAMAGE_PER_SECOND = 120;
const RESPAWN_DELAY = 500;
const STRAFE_INTERVAL = 90;
const TARGET_FRAME_TIME = 1000 / 60;

export default function Switching() {
  const [gameState, setGameState] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [kills, setKills] = useState(0);
  const [avgSwitchTime, setAvgSwitchTime] = useState(0);
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('switching'));

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

    const elapsed = lastFrameTimeRef.current ? timestamp - lastFrameTimeRef.current : TARGET_FRAME_TIME;
    const delta = Math.min(elapsed / TARGET_FRAME_TIME, 3);
    const deltaTime = elapsed / 1000;
    lastFrameTimeRef.current = timestamp;

    const margin = TARGET_RADIUS;
    let needsUpdate = false;

    const targets = targetsRef.current;
    const numTargets = targets.length;

    for (let i = 0; i < numTargets; i++) {
      const target = targets[i];
      if (target.isRespawning) continue;

      const timeSinceStrafe = timestamp - target.lastStrafeChange;
      if (timeSinceStrafe > STRAFE_INTERVAL) {
        const angle = Math.random() * Math.PI * 2;
        target.targetVx = Math.cos(angle) * BASE_SPEED;
        target.targetVy = Math.sin(angle) * BASE_SPEED;
        target.lastStrafeChange = timestamp;
      }

      target.vx += (target.targetVx - target.vx) * 0.05;
      target.vy += (target.targetVy - target.vy) * 0.05;

      target.x += target.vx * delta;
      target.y += target.vy * delta;

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

      const wasOnTarget = target.isOnTarget;
      target.isOnTarget = checkIfOnTarget(target, mouseXRef.current, mouseYRef.current);

      if (target.isOnTarget) {
        const damageThisFrame = DAMAGE_PER_SECOND * deltaTime;
        target.health = Math.max(0, target.health - damageThisFrame);
        needsUpdate = true;

        if (target.health <= 0 && !target.isRespawning) {
          target.isRespawning = true;
          killsRef.current += 1;

          const now = performance.now();
          if (lastKillTimeRef.current > 0) {
            const switchTime = Math.round(now - lastKillTimeRef.current);
            switchTimesRef.current.push(switchTime);
          }
          lastKillTimeRef.current = now;

          setTimeout(() => {
            respawnTarget(i);
          }, RESPAWN_DELAY);

          needsUpdate = true;
        }
      }

      // Direct DOM updates - keep inline for performance
      const targetEl = targetElementsRef.current[i];
      if (targetEl && !target.isRespawning) {
        targetEl.style.transform = `translate3d(${target.x - TARGET_RADIUS}px, ${target.y - TARGET_RADIUS}px, 0)`;

        if (target.isOnTarget) {
          targetEl.style.background = 'linear-gradient(to bottom right, #06b6d4, #3b82f6)';
          targetEl.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.8)';
          targetEl.style.border = '2px solid #06b6d4';
        } else {
          targetEl.style.background = 'rgba(148, 163, 184, 0.4)';
          targetEl.style.boxShadow = 'none';
          targetEl.style.border = '2px solid rgba(148, 163, 184, 0.6)';
        }

        const healthBar = targetEl.querySelector('.health-bar');
        if (healthBar) {
          healthBar.style.width = `${(target.health / HEALTH_MAX) * 100}%`;
        }
      }

      if (wasOnTarget !== target.isOnTarget) {
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      setKills(killsRef.current);
      const times = switchTimesRef.current;
      if (times.length > 0) {
        const sum = times.reduce((a, b) => a + b, 0);
        setAvgSwitchTime(Math.round(sum / times.length));
      }
    }

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

    if (replayRecorderRef.current) {
      replayRecorderRef.current.recordMouseMove(mouseXRef.current, mouseYRef.current);
    }
  };

  const startGame = async () => {
    const session = await startGameSession('switching', getUserUUID());
    if (!session) {
      console.error('Failed to start game session');
    }

    gameStateRef.current = 'playing';
    killsRef.current = 0;
    switchTimesRef.current = [];
    lastKillTimeRef.current = 0;
    lastFrameTimeRef.current = 0;

    replayRecorderRef.current = new ReplayRecorder('switching', {
      gameDuration: GAME_DURATION,
      gameWidth: GAME_WIDTH,
      gameHeight: GAME_HEIGHT,
      numTargets: NUM_TARGETS
    });
    replayRecorderRef.current.start();

    targetsRef.current = initializeTargets();

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

    animationFrameRef.current = requestAnimationFrame(gameLoop);

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

    const times = switchTimesRef.current;
    const computedAvgSwitchTime = times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

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
    <div className="flex-1 flex flex-col h-full">
      {/* Header stats bar */}
      <div className="game-header">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Crosshair size={24} className="text-cyan-500" />
            <h1 className="text-xl font-bold text-white">Target Switching</h1>
          </div>

          {gameState === 'playing' && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-slate-400">Time</p>
                <p className="text-lg font-bold text-amber-400">{timeLeft}s</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Kills</p>
                <p className="text-lg font-bold text-cyan-400">{kills}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Avg Switch</p>
                <p className="text-lg font-bold text-white">{avgSwitchTime}ms</p>
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
          ref={gameAreaRef}
          onMouseMove={handleMouseMove}
          cursor="crosshair"
        >
          {gameState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in-up">
              <Crosshair size={80} className="text-cyan-500 mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">Target Switching</h2>
              <p className="text-slate-400 mb-8 text-center max-w-lg leading-relaxed">
                Track moving targets with your cursor to damage them. When a target's health reaches zero,
                it will respawn and you switch to another target. Eliminate as many as possible in {GAME_DURATION} seconds!
              </p>
              <button onClick={startGame} className="btn-primary bg-gradient-to-r from-cyan-500 to-blue-500">
                <Play size={20} />
                Start Game
              </button>
            </div>
          )}

          {/* Targets + health bars stay inline - 60fps DOM manipulation */}
          {gameState === 'playing' && targetsRef.current.map((target, i) => (
            <div
              key={target.id}
              ref={el => targetElementsRef.current[i] = el}
              style={{
                position: 'absolute',
                width: `${TARGET_SIZE}px`,
                height: `${TARGET_SIZE}px`,
                borderRadius: '50%',
                display: target.isRespawning ? 'none' : 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'none',
                pointerEvents: 'none',
                willChange: 'transform',
                transform: `translate3d(${target.x - TARGET_RADIUS}px, ${target.y - TARGET_RADIUS}px, 0)`,
                backfaceVisibility: 'hidden',
                ...(target.isOnTarget
                  ? { background: 'linear-gradient(to bottom right, #06b6d4, #3b82f6)', boxShadow: '0 0 30px rgba(6, 182, 212, 0.8)', border: '2px solid #06b6d4' }
                  : { background: 'rgba(148, 163, 184, 0.4)', boxShadow: 'none', border: '2px solid rgba(148, 163, 184, 0.6)' }
                ),
              }}
            >
              <div className="w-3 h-3 rounded-full bg-white mb-1" />
              <div className="w-[50px] h-1.5 bg-black/30 rounded-full overflow-hidden border border-white/20">
                <div
                  className="health-bar h-full bg-green-500 rounded-full"
                  style={{
                    width: `${(target.health / HEALTH_MAX) * 100}%`,
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>
            </div>
          ))}
        </FixedGameArea>
      )}

      {gameState === 'finished' && (
        <GameFinished
          title="Time's Up!"
          subtitle={`Kills: ${kills}`}
          subtitleColor="text-cyan-400"
          stats={[
            { label: 'Total Kills', value: kills, color: 'text-cyan-400' },
            { label: 'Avg Switch', value: `${avgSwitchTime}ms`, color: 'text-white' },
            { label: 'Score', value: kills * 100, color: 'text-white' },
          ]}
          statGridCols="grid-cols-2 sm:grid-cols-3"
          leaderboard={leaderboard}
          leaderboardScoreColor="text-cyan-400"
          nickname={nickname}
          onNicknameChange={handleNicknameChange}
          onPlayAgain={startGame}
          onViewReplay={lastReplay ? () => setShowReplayViewer(true) : null}
          gradientClasses="from-cyan-500 to-blue-500"
        >
          <PostGameAnalytics
            gameType="switching"
            stats={{ score: kills * 100, kills, avgSwitchTime }}
            clickData={[]}

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
