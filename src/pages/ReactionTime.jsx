import { useState, useRef, useEffect } from 'react';
import useDocumentTitle from '../utils/useDocumentTitle';
import { Zap, RotateCcw, Trophy, User } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { startGameSession, endGameSession } from '../utils/gameSession';
import FixedGameArea from '../components/FixedGameArea';

const WAITING = 0;
const READY = 1;
const TOO_EARLY = 2;
const CLICK_NOW = 3;
const RESULT = 4;

const MIN_DELAY_BEFORE_NEXT = 1500;

export default function ReactionTime() {
  useDocumentTitle('Reaction Time | HudAim');
  const [gameState, setGameState] = useState(WAITING);
  const [reactionTime, setReactionTime] = useState(null);
  const [results, setResults] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [nicknameError, setNicknameError] = useState(null);
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard('reaction'));

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
    const result = setNickname(e.target.value);
    setNicknameState(result.valid ? result.sanitized : e.target.value);
    setNicknameError(result.error);
  };

  const saveScoreIfComplete = (newResults) => {
    if (newResults.length >= 5) {
      const avg = Math.round(newResults.reduce((a, b) => a + b, 0) / newResults.length);
      const score = Math.max(0, 500 - avg);
      const stats = {
        averageTime: avg,
        bestTime: Math.min(...newResults)
      };
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
    if (attemptsRef.current === 0) {
      const session = await startGameSession('reaction', getUserUUID());
      if (!session) {
        console.error('Failed to start game session');
      }
    }

    canClickRef.current = true;
    gameStateRef.current = READY;
    setGameState(READY);
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

      setTimeout(() => setGameState(CLICK_NOW), 0);
    }, delay);
  };

  const startNextRound = () => {
    canClickRef.current = false;

    const cooldown = MIN_DELAY_BEFORE_NEXT + Math.random() * 1500;

    timeoutRef.current = setTimeout(() => {
      startGame();
    }, cooldown);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();

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
      startNextRound();
    } else if (state === CLICK_NOW) {
      const time = Math.round(clickTime - startTimeRef.current);
      gameStateRef.current = RESULT;
      attemptsRef.current += 1;
      resultsRef.current = [...resultsRef.current, time];

      // INSTANT visual feedback via direct DOM
      if (gameAreaRef.current) {
        gameAreaRef.current.style.backgroundColor = '#1e293b';
      }
      if (titleRef.current) {
        titleRef.current.textContent = `${time} ms`;
      }
      if (subtitleRef.current) {
        subtitleRef.current.textContent = attemptsRef.current < 5
          ? `Attempt ${attemptsRef.current}/5 \u2022 Next round starting...`
          : 'All done!';
        subtitleRef.current.style.visibility = 'visible';
      }

      setTimeout(() => {
        setReactionTime(time);
        setResults(resultsRef.current);
        setAttempts(attemptsRef.current);
        setGameState(RESULT);

        if (resultsRef.current.length >= 5) {
          saveScoreIfComplete(resultsRef.current);
        }
      }, 0);

      if (attemptsRef.current < 5) {
        startNextRound();
      }
    } else if (state === RESULT) {
      if (attemptsRef.current >= 5) {
        resetGame();
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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const averageTime = results.length > 0
    ? Math.round(results.reduce((a, b) => a + b, 0) / results.length)
    : null;

  const bestTime = results.length > 0 ? Math.min(...results) : null;

  const isFinished = results.length >= 5;

  // Game area background color
  const getBackgroundColor = () => {
    switch (gameState) {
      case READY: return '#dc2626';
      case CLICK_NOW: return '#16a34a';
      case TOO_EARLY: return '#ea580c';
      default: return '#1e293b';
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
          subtitle: attempts < 5 ? `Attempt ${attempts}/5 \u2022 Next round starting...` : 'All done!'
        };
      default:
        return { title: '', subtitle: '' };
    }
  };

  const { title, subtitle } = getMessage();

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header stats bar */}
      <div className="game-header">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Zap size={24} className="text-green-500" />
            <h1 className="text-xl font-bold text-white">Reaction Time</h1>
          </div>

          {attempts > 0 && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-slate-400">Attempt</p>
                <p className="text-lg font-bold text-white">{attempts}/5</p>
              </div>
              {averageTime !== null && (
                <div className="text-center">
                  <p className="text-xs text-slate-400">Average</p>
                  <p className="text-lg font-bold text-cyan-400">{averageTime}ms</p>
                </div>
              )}
              {bestTime !== null && (
                <div className="text-center">
                  <p className="text-xs text-slate-400">Best</p>
                  <p className="text-lg font-bold text-green-500">{bestTime}ms</p>
                </div>
              )}
            </div>
          )}

          <button onClick={resetGame} className="btn-secondary">
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Game area */}
      {!isFinished && (
        <FixedGameArea
          ref={gameAreaRef}
          onMouseDown={handleMouseDown}
          cursor="pointer"
          style={{
            backgroundColor: getBackgroundColor(),
            transition: 'none',
            willChange: 'background-color',
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            {gameState === WAITING && (
              <div className="text-center mb-6 animate-fade-in-up">
                <Zap size={80} className="text-green-500 mx-auto" />
              </div>
            )}

            {gameState === RESULT && (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl font-bold text-white">{attempts}</span>
              </div>
            )}

            <h1 ref={titleRef} className="text-6xl font-bold text-white mb-4 text-center">{title}</h1>
            <p ref={subtitleRef} className="text-xl text-white/80 text-center" style={{ visibility: subtitle ? 'visible' : 'hidden' }}>{subtitle || ' '}</p>
          </div>
        </FixedGameArea>
      )}

      {/* Finished results */}
      {isFinished && (
        <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 bg-[#0a0f1a] overflow-y-auto">
          <div className="max-w-2xl w-full text-center">
            <Trophy size={64} className="text-yellow-400 mx-auto mb-4 animate-score-pop" />
            <h2 className="text-4xl font-bold text-white mb-2 animate-fade-in-up">{averageTime} ms</h2>
            <p className="text-2xl font-bold text-green-400 mb-8 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
              {averageTime < 200 ? 'Incredible!' : averageTime < 250 ? 'Great!' : averageTime < 300 ? 'Good!' : 'Keep practicing!'}
            </p>

            <div className="flex items-center gap-2 mb-6 justify-center animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <User size={16} className="text-slate-400" />
              <span className="text-slate-400 text-sm">Nickname:</span>
              <input
                type="text"
                value={nickname}
                onChange={handleNicknameChange}
                className="input-field w-40"
                maxLength={20}
              />
            </div>
            {nicknameError && (
              <p className="text-red-400 text-sm -mt-4 mb-4 animate-fade-in-up">{nicknameError}</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
              <div className="stat-card">
                <p className="text-slate-400 text-sm mb-1">Attempts</p>
                <p className="text-2xl font-bold text-white">{results.length}</p>
              </div>
              <div className="stat-card">
                <p className="text-slate-400 text-sm mb-1">Average</p>
                <p className="text-2xl font-bold text-cyan-400">{averageTime} ms</p>
              </div>
              <div className="stat-card">
                <p className="text-slate-400 text-sm mb-1">Best</p>
                <p className="text-2xl font-bold text-green-500">{bestTime} ms</p>
              </div>
              <div className="stat-card">
                <p className="text-slate-400 text-sm mb-1">Last</p>
                <p className="text-2xl font-bold text-white">{results[results.length - 1]} ms</p>
              </div>
            </div>

            {leaderboard.length > 0 && (
              <div className="mt-6 w-full max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '240ms' }}>
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-400" />
                  Leaderboard
                </h3>
                <div className="bg-slate-800/60 rounded-lg overflow-hidden">
                  {leaderboard.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
                      <span className="w-6 font-bold text-slate-400">#{i + 1}</span>
                      <span className="flex-1 text-white ml-2">{entry.nickname}</span>
                      <span className="font-bold text-green-500">{entry.stats?.averageTime || '\u2014'}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center mt-6 animate-fade-in-up" style={{ animationDelay: '320ms' }}>
              <button
                onClick={resetGame}
                className="btn-primary bg-gradient-to-r from-green-500 to-emerald-500"
              >
                <RotateCcw size={20} />
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
