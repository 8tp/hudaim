import { useState, useRef, useEffect } from 'react';
import useDocumentTitle from '../utils/useDocumentTitle';
import { Focus, RotateCcw, Play } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { ReplayRecorder, saveReplay } from '../utils/replay';
import { startGameSession, endGameSession } from '../utils/gameSession';
import FixedGameArea, { GAME_WIDTH, GAME_HEIGHT } from '../components/FixedGameArea';
import PostGameAnalytics from '../components/PostGameAnalytics';
import ReplayViewer from '../components/ReplayViewer';
import GameFinished from '../components/GameFinished';

const GAME_DURATION = 60;
const NUM_SIMULTANEOUS = 4;
const TARGET_SIZE = 40;

export default function Precision() {
  useDocumentTitle('Precision | HudAim');
  const [gameState, setGameState] = useState('idle');
  const [targets, setTargets] = useState([]);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [shots, setShots] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('precision'));

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
    const session = await startGameSession('precision', getUserUUID());
    if (!session) {
      console.error('Failed to start game session');
    }

    gameStateRef.current = 'playing';
    killsRef.current = 0;
    shotsRef.current = 0;
    clickDataRef.current = [];

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

    const accuracy = shotsRef.current > 0 ? Math.round((killsRef.current / shotsRef.current) * 100) : 0;
    const finalScore = killsRef.current * accuracy;
    setScore(finalScore);

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

    const clickedTarget = targetsRef.current.find(t => t.id === targetId);
    if (clickedTarget && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / rect.width * GAME_WIDTH;
      const clickY = (e.clientY - rect.top) / rect.height * GAME_HEIGHT;
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

    const newTargets = targetsRef.current.filter(t => t.id !== targetId);
    const newTarget = generateTarget();
    newTargets.push(newTarget);
    targetsRef.current = newTargets;
    setTargets(newTargets);

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

    if (replayRecorderRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      replayRecorderRef.current.recordEvent('miss', {
        x: (e.clientX - rect.left) / rect.width * GAME_WIDTH,
        y: (e.clientY - rect.top) / rect.height * GAME_HEIGHT
      });
    }

    shotsRef.current += 1;
    setShots(shotsRef.current);
  };

  const handleMouseMove = (e) => {
    if (replayRecorderRef.current && gameStateRef.current === 'playing' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      replayRecorderRef.current.recordMouseMove(
        (e.clientX - rect.left) / rect.width * GAME_WIDTH,
        (e.clientY - rect.top) / rect.height * GAME_HEIGHT
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
    <div className="flex-1 flex flex-col h-full">
      {/* Header stats bar */}
      <div className="game-header">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Focus size={24} className="text-purple-500" />
            <h1 className="text-xl font-bold text-white">Precision</h1>
          </div>

          {gameState === 'playing' && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-slate-400">Time</p>
                <p className="text-lg font-bold text-amber-400">{timeLeft}s</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Kills</p>
                <p className="text-lg font-bold text-white">{kills}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Accuracy</p>
                <p className="text-lg font-bold text-purple-400">{accuracy}%</p>
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
        <FixedGameArea ref={containerRef} onMouseDown={handleMissClick} onMouseMove={handleMouseMove} cursor="crosshair">
          {gameState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in-up">
              <Focus size={80} className="text-purple-500 mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">Precision</h2>
              <p className="text-slate-400 mb-8 text-center max-w-sm px-4">
                Hit small targets with maximum accuracy for 60 seconds.
                4 targets appear at once. Score = Kills x Accuracy!
              </p>
              <button onClick={startGame} className="btn-primary bg-gradient-to-r from-purple-500 to-pink-500">
                <Play size={20} />
                Start Game
              </button>
            </div>
          )}

          {/* Targets stay inline - dynamic positions */}
          {gameState === 'playing' && targets.map((target) => (
            <button
              key={target.id}
              onMouseDown={(e) => handleTargetClick(e, target.id)}
              style={{
                position: 'absolute',
                left: target.x,
                top: target.y,
                width: target.size,
                height: target.size,
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
              }}
            >
              <div className="w-2 h-2 rounded-full bg-white" />
            </button>
          ))}
        </FixedGameArea>
      )}

      {gameState === 'finished' && (
        <GameFinished
          title="Game Complete!"
          subtitle={`Score: ${score}`}
          subtitleColor="text-purple-400"
          stats={[
            { label: 'Kills', value: kills, color: 'text-green-500' },
            { label: 'Accuracy', value: `${accuracy}%`, color: 'text-purple-400' },
            { label: 'Shots', value: shots, color: 'text-red-400' },
          ]}
          statGridCols="grid-cols-2 sm:grid-cols-3"
          leaderboard={leaderboard}
          leaderboardScoreColor="text-purple-400"
          nickname={nickname}
          onNicknameChange={handleNicknameChange}
          onPlayAgain={startGame}
          onViewReplay={lastReplay ? () => setShowReplayViewer(true) : null}
          gradientClasses="from-purple-500 to-pink-500"
        >
          <PostGameAnalytics
            gameType="precision"
            stats={{ score, accuracy, kills }}
            clickData={clickData}
            targetSize={TARGET_SIZE}
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
