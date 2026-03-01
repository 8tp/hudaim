import { useState, useRef, useEffect } from 'react';
import { Zap, RotateCcw, Trophy, User } from 'lucide-react';
import { getLeaderboard, getNickname, setNickname, syncLeaderboard, getUserUUID } from '../utils/leaderboard';
import { startGameSession, endGameSession } from '../utils/gameSession';

const WAITING = 0;
const READY = 1;
const TOO_EARLY = 2;
const CLICK_NOW = 3;
const RESULT = 4;

const MIN_DELAY_BEFORE_NEXT = 1500;

export default function ReactionTime() {
  const [gameState, setGameState] = useState(WAITING);
  const [reactionTime, setReactionTime] = useState(null);
  const [results, setResults] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [nickname, setNicknameState] = useState(() => getNickname());
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
    const newNickname = setNickname(e.target.value);
    setNicknameState(newNickname);
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

      // Direct DOM update for instant green screen - stays inline
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

      // INSTANT visual feedback via direct DOM - stays inline
      if (gameAreaRef.current) {
        gameAreaRef.current.style.backgroundColor = '#1e293b';
      }
      if (titleRef.current) {
        titleRef.current.textContent = `${time} ms`;
      }
      if (subtitleRef.current) {
        subtitleRef.current.textContent = attemptsRef.current < 5
          ? `Attempt ${attemptsRef.current}/5 \u2022 Next round starting...`
          : 'All done! Click to restart';
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
        gameStateRef.current = WAITING;
        attemptsRef.current = 0;
        resultsRef.current = [];
        setGameState(WAITING);
        setResults([]);
        setReactionTime(null);
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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const averageTime = results.length > 0
    ? Math.round(results.reduce((a, b) => a + b, 0) / results.length)
    : null;

  const bestTime = results.length > 0 ? Math.min(...results) : null;

  // Game area background color - stays inline for instant DOM manipulation
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
          subtitle: attempts < 5 ? `Attempt ${attempts}/5 \u2022 Next round starting...` : 'All done! Click to restart'
        };
      default:
        return { title: '', subtitle: '' };
    }
  };

  const { title, subtitle } = getMessage();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Game area - background color set via ref for instant feedback */}
      <div
        ref={gameAreaRef}
        onMouseDown={handleMouseDown}
        className="flex-1 flex flex-col items-center justify-center cursor-pointer select-none relative min-h-[400px]"
        style={{
          backgroundColor: getBackgroundColor(),
          transition: 'none',
          willChange: 'background-color',
          transform: 'translate3d(0, 0, 0)',
        }}
      >
        <div>
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
      </div>

      {/* Results panel */}
      {results.length > 0 && (
        <div className="bg-slate-800/95 border-t border-slate-700 p-6 min-h-[200px]">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Trophy size={20} className="text-yellow-400" />
                Your Results
              </h2>
              <button onClick={resetGame} className="btn-secondary">
                <RotateCcw size={16} />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

            {results.length >= 5 && (
              <>
                <div className="mt-4 p-4 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-xl border border-cyan-400/30 text-center text-white animate-fade-in-up">
                  <span className="font-bold text-cyan-400">Final Average: {averageTime} ms</span>
                  <span className="text-slate-400 ml-2">
                    {averageTime < 200 ? 'Incredible!' : averageTime < 250 ? 'Great!' : averageTime < 300 ? 'Good!' : 'Keep practicing!'}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                  <User size={16} className="text-slate-400" />
                  <span className="text-slate-400 text-sm">Nickname:</span>
                  <input
                    type="text"
                    value={nickname}
                    onChange={handleNicknameChange}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="input-field text-sm w-40"
                    maxLength={20}
                  />
                </div>

                {leaderboard.length > 0 && (
                  <div className="mt-6 border-t border-slate-700 pt-6 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
                    <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                      <Trophy size={16} className="text-yellow-400" />
                      Leaderboard (Best Scores)
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
