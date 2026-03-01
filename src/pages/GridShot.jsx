import { useState, useRef, useEffect } from 'react';
import { Grid3X3, RotateCcw, Play } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { ReplayRecorder, saveReplay } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';
import GameFinished from '../components/GameFinished';
import { GAME_WIDTH, GAME_HEIGHT } from '../components/FixedGameArea';

const GAME_DURATION = 30;
const GRID_SIZE = 3;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

export default function GridShot() {
  const [, forceUpdate] = useState(0);
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('gridshot'));

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
      if (replayRecorderRef.current) {
        replayRecorderRef.current.recordEvent('gridActivate', { cellIndex: newTarget });
      }
    }
  };

  const startGame = async () => {
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

        const stats = {
          hits: hits.current,
          accuracy: hits.current + misses.current > 0
            ? Math.round((hits.current / (hits.current + misses.current)) * 100) : 0
        };

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

        setClickData([...clickDataRef.current]);

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

    render();
  };

  const handleMiss = (e) => {
    if (gameState.current !== 'playing') return;
    misses.current += 1;
    score.current = Math.max(0, score.current - 50);

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
    <div className="flex-1 flex flex-col h-full">
      {/* Header stats bar */}
      <div className="game-header">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Grid3X3 size={24} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Grid Shot</h1>
          </div>

          {gameState.current === 'playing' && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-slate-400">Time</p>
                <p className="text-lg font-bold text-yellow-400">{timeLeft.current}s</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Score</p>
                <p className="text-lg font-bold text-cyan-400">{score.current}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Hits</p>
                <p className="text-lg font-bold text-white">{hits.current}</p>
              </div>
            </div>
          )}

          <button onClick={resetGame} className="btn-secondary">
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Game area - stays inline for grid rendering */}
      {gameState.current !== 'finished' && (
        <div
          ref={gameAreaRef}
          className="flex-1 relative flex items-center justify-center min-h-[500px] overflow-hidden"
          style={{
            backgroundColor: '#0f172a',
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform',
          }}
          onMouseDown={handleMiss}
          onMouseMove={handleMouseMove}
        >
          {gameState.current === 'idle' && (
            <div className="flex flex-col items-center justify-center animate-fade-in-up">
              <Grid3X3 size={80} className="text-amber-400 mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">Grid Shot</h2>
              <p className="text-slate-400 mb-8 text-center max-w-sm px-4">
                Click targets as they appear in the grid. You have {GAME_DURATION} seconds.
                Missing clicks will cost you points!
              </p>
              <button onClick={startGame} className="btn-primary bg-gradient-to-r from-amber-500 to-red-500">
                <Play size={20} />
                Start Game
              </button>
            </div>
          )}

          {/* Grid cells - keep inline styles for game rendering */}
          {gameState.current === 'playing' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gap: '1rem',
                padding: '1rem',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {Array.from({ length: TOTAL_CELLS }).map((_, index) => (
                <div
                  key={index}
                  ref={el => cellRefs.current[index] = el}
                  style={{
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
                  }}
                >
                  {activeTargets.current.has(index) && (
                    <button
                      onMouseDown={() => handleTargetClick(index)}
                      style={{
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
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {gameState.current === 'finished' && (
        <GameFinished
          title="Time's Up!"
          subtitle={`Score: ${score.current}`}
          subtitleColor="text-amber-400"
          stats={[
            { label: 'Hits', value: hits.current, color: 'text-green-500' },
            { label: 'Avg Time', value: `${averageTime}ms`, color: 'text-cyan-400' },
            { label: 'Accuracy', value: `${accuracy}%`, color: 'text-white' },
          ]}
          statGridCols="grid-cols-2 sm:grid-cols-3"
          leaderboard={leaderboard}
          leaderboardScoreColor="text-amber-400"
          nickname={nickname}
          onNicknameChange={handleNicknameChange}
          onPlayAgain={(e) => { if (e) e.stopPropagation(); startGame(); }}
          onViewReplay={lastReplay ? () => setShowReplayViewer(true) : null}
          gradientClasses="from-amber-500 to-red-500"
        >
          <PostGameAnalytics
            gameType="gridshot"
            stats={{ score: score.current, accuracy, hits: hits.current }}
            clickData={clickData}
            targetSize={100}
            gameWidth={960}
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
