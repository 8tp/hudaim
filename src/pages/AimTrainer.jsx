import { useState, useRef, useEffect } from 'react';
import { Target, RotateCcw, Play } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { ReplayRecorder, saveReplay } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import FixedGameArea, { GAME_WIDTH, GAME_HEIGHT } from '../components/FixedGameArea';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';
import GameFinished from '../components/GameFinished';

const TOTAL_TARGETS = 30;

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

      const stats = {
        accuracy: Math.round((hitsRef.current / (hitsRef.current + missesRef.current)) * 100),
        avgTime: Math.round(timesRef.current.reduce((a, b) => a + b, 0) / timesRef.current.length)
      };

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

      const result = await endGameSession(scoreRef.current, stats, nickname);
      if (result?.success && result.leaderboard) {
        setLeaderboard(result.leaderboard);
      } else {
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
    <div className="flex-1 flex flex-col h-full">
      {/* Header stats bar */}
      <div className="game-header">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Target size={24} className="text-cyan-400" />
            <h1 className="text-xl font-bold text-white">Aim Trainer</h1>
          </div>

          {gameState === 'playing' && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-slate-400">Targets</p>
                <p className="text-lg font-bold text-white">{hits}/{TOTAL_TARGETS}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Score</p>
                <p className="text-lg font-bold text-cyan-400">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Misses</p>
                <p className="text-lg font-bold text-red-400">{misses}</p>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in-up">
              <Target size={80} className="text-cyan-400 mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">Aim Trainer</h2>
              <p className="text-slate-400 mb-8 text-center max-w-sm px-4">
                Click on {TOTAL_TARGETS} targets as quickly and accurately as possible.
                Missing targets will cost you points!
              </p>
              <button onMouseDown={startGame} className="btn-primary bg-gradient-to-r from-cyan-500 to-blue-500">
                <Play size={20} />
                Start Game
              </button>
            </div>
          )}

          {/* Target stays inline - dynamic positions */}
          {gameState === 'playing' && target && (
            <button
              onMouseDown={handleTargetMouseDown}
              style={{
                position: 'absolute',
                left: target.x,
                top: target.y,
                width: target.size,
                height: target.size,
                borderRadius: '50%',
                background: 'linear-gradient(to bottom right, #ef4444, #dc2626)',
                boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: 'none',
                transition: 'transform 0.1s',
              }}
            >
              <div className="w-3 h-3 rounded-full bg-white" />
            </button>
          )}
        </FixedGameArea>
      )}

      {gameState === 'finished' && (
        <GameFinished
          title="Game Complete!"
          subtitle={`Score: ${score}`}
          subtitleColor="text-cyan-400"
          stats={[
            { label: 'Accuracy', value: `${accuracy}%`, color: 'text-green-500' },
            { label: 'Avg Time', value: `${averageTime}ms`, color: 'text-cyan-400' },
            { label: 'Total Time', value: `${totalTime}s`, color: 'text-white' },
            { label: 'Misses', value: misses, color: 'text-red-400' },
          ]}
          statGridCols="grid-cols-2 sm:grid-cols-4"
          leaderboard={leaderboard}
          leaderboardScoreColor="text-cyan-400"
          nickname={nickname}
          onNicknameChange={handleNicknameChange}
          onPlayAgain={startGame}
          onViewReplay={lastReplay ? () => setShowReplayViewer(true) : null}
          gradientClasses="from-cyan-500 to-blue-500"
        >
          <PostGameAnalytics
            gameType="aim"
            stats={{ score, accuracy, avgTime: averageTime }}
            clickData={clickData}
            targetSize={60}
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
