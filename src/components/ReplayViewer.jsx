import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, X } from 'lucide-react';
import { ReplayPlayer } from '../utils/replay';
import { GAME_WIDTH, GAME_HEIGHT } from './FixedGameArea';

const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const remainingMs = Math.floor((ms % 1000) / 10);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
};

export default function ReplayViewer({ replay, onClose, autoPlay = true }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cursorPos, setCursorPos] = useState(() => {
    if (replay?.frames?.length > 0) {
      return { x: replay.frames[0].mx, y: replay.frames[0].my };
    }
    return { x: 0, y: 0 };
  });
  const [targets, setTargets] = useState([]);
  const [hits, setHits] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);

  const playerRef = useRef(null);
  const timelineRef = useRef(null);
  const animationRef = useRef(null);
  const hasAutoPlayedRef = useRef(false);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFrame = useCallback((frame) => {
    setCursorPos({ x: frame.mx, y: frame.my });
    setCurrentTime(frame.t);
  }, []);

  const handleEvent = useCallback((event, isAccumulated = false) => {
    switch (event.type) {
      case 'spawn':
        setTargets(prev => [...prev, {
          id: event.id,
          x: event.x,
          y: event.y,
          size: event.size || 60,
          hit: false
        }]);
        break;
      case 'hit':
        setTargets(prev => prev.map(t =>
          t.id === event.id ? { ...t, hit: true } : t
        ));
        if (!isAccumulated) {
          setHits(prev => prev + 1);
          if (event.score) setCurrentScore(event.score);
        }
        setTimeout(() => {
          setTargets(prev => prev.filter(t => t.id !== event.id));
        }, 100);
        break;
      case 'miss':
        break;
      case 'kill':
        setTargets(prev => prev.filter(t => t.id !== event.id));
        if (!isAccumulated) {
          setHits(prev => prev + 1);
          if (event.score) setCurrentScore(event.score);
        }
        break;
      case 'despawn':
        setTargets(prev => prev.filter(t => t.id !== event.id));
        break;
      case 'move':
        setTargets(prev => prev.map(t =>
          t.id === event.id ? { ...t, x: event.x, y: event.y } : t
        ));
        break;
      case 'gridActivate':
        setTargets(prev => [...prev, {
          id: event.cellIndex,
          cellIndex: event.cellIndex,
          isGrid: true,
          hit: false
        }]);
        break;
      case 'gridHit':
        setTargets(prev => prev.filter(t => t.cellIndex !== event.cellIndex));
        if (!isAccumulated) {
          setHits(prev => prev + 1);
          if (event.score) setCurrentScore(event.score);
        }
        break;
      default:
        break;
    }
  }, []);

  const handleComplete = useCallback(() => {
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!replay) return;

    playerRef.current = new ReplayPlayer(
      replay,
      handleFrame,
      handleEvent,
      handleComplete
    );

    if (autoPlay && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.play();
          setIsPlaying(true);
        }
      }, 100);
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [replay, handleFrame, handleEvent, handleComplete, autoPlay]);

  useEffect(() => {
    if (!playerRef.current) return;

    const updateTime = () => {
      if (playerRef.current && isPlaying) {
        setCurrentTime(playerRef.current.getCurrentTime());
        animationRef.current = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= replay.duration - 100) {
        resetReplay();
        setTimeout(() => {
          playerRef.current.play();
          setIsPlaying(true);
        }, 50);
      } else {
        playerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const resetReplay = () => {
    if (!playerRef.current) return;
    playerRef.current.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    setTargets([]);
    setHits(0);
    setCurrentScore(0);

    playerRef.current = new ReplayPlayer(
      replay,
      handleFrame,
      handleEvent,
      handleComplete
    );

    if (replay.frames.length > 0) {
      setCursorPos({ x: replay.frames[0].mx, y: replay.frames[0].my });
    }
  };

  const handleTimelineClick = (e) => {
    if (!timelineRef.current || !playerRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * replay.duration;

    setTargets([]);
    setHits(0);
    setCurrentScore(0);
    setCurrentTime(newTime);
    playerRef.current.seekTo(newTime);
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (playerRef.current) {
      playerRef.current.setSpeed(speed);
    }
  };

  const progress = replay?.duration ? (currentTime / replay.duration) * 100 : 0;

  const renderTargets = () => {
    if (replay.gameType === 'gridshot') {
      const gridSize = 3;

      return (
        <div
          className="absolute inset-0 grid gap-4 p-4"
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const isActive = targets.some(t => t.cellIndex === i);

            return (
              <div
                key={i}
                className="bg-slate-700/30 rounded-lg flex items-center justify-center"
              >
                {isActive && (
                  <div
                    className="w-[80%] h-[80%] rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(to bottom right, #f59e0b, #ef4444)',
                      boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    <div className="w-4 h-4 rounded-full bg-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return targets.map(target => (
      <div
        key={target.id}
        className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          left: target.x,
          top: target.y,
          width: target.size || 60,
          height: target.size || 60,
          background: target.hit
            ? 'linear-gradient(to bottom right, #22c55e, #16a34a)'
            : 'linear-gradient(to bottom right, #a855f7, #ec4899)',
          boxShadow: target.hit
            ? '0 0 30px rgba(34, 197, 94, 0.8)'
            : '0 10px 25px rgba(168, 85, 247, 0.4)',
        }}
      />
    ));
  };

  if (!replay) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1000]" onClick={onClose}>
      <div className="animate-fade-in-scale bg-slate-800 rounded-2xl p-4 sm:p-6 max-w-[1100px] w-[95%] max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-lg sm:text-xl font-bold text-white">
              Replay: {replay.nickname} - {replay.score} pts
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {replay.gameType.charAt(0).toUpperCase() + replay.gameType.slice(1)} &bull; {formatTime(replay.duration)} duration
            </div>
          </div>
          <button className="btn-secondary p-2" onClick={onClose} aria-label="Close replay">
            <X size={20} />
          </button>
        </div>

        {/* Game area - keep inline for dynamic dimensions */}
        <div
          className="relative mx-auto rounded-lg overflow-hidden border-2 border-slate-700"
          style={{
            width: `${GAME_WIDTH}px`,
            height: `${GAME_HEIGHT}px`,
            backgroundColor: '#0f172a',
          }}
        >
          {renderTargets()}
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-cyan-400 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[100]"
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              backgroundColor: 'rgba(34, 211, 238, 0.3)',
              transition: 'none',
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-4 p-4 bg-slate-900/60 rounded-lg">
          <button className="flex items-center justify-center w-12 h-12 rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300 transition-colors" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button className="btn-secondary p-2" onClick={resetReplay} aria-label="Reset replay">
            <RotateCcw size={20} />
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <div
              ref={timelineRef}
              className="relative h-2 bg-slate-700 rounded cursor-pointer overflow-hidden"
              onClick={handleTimelineClick}
            >
              <div className="absolute top-0 left-0 h-full bg-cyan-400 rounded" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }} />
              <div className="absolute top-1/2 w-4 h-4 bg-white rounded-full -translate-y-1/2 shadow cursor-grab" style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(replay.duration)}</span>
            </div>
          </div>

          <div className="flex gap-1">
            {[0.5, 1, 2].map(speed => (
              <button
                key={speed}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${playbackSpeed === speed
                    ? 'bg-cyan-400 text-slate-900'
                    : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                onClick={() => handleSpeedChange(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-6 sm:gap-8 mt-4 p-4 bg-slate-900/60 rounded-lg">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase">Score</span>
            <span className="text-lg font-bold text-white">{currentScore || replay.score}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase">Hits</span>
            <span className="text-lg font-bold text-white">{hits}</span>
          </div>
          {replay.stats?.accuracy !== undefined && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 uppercase">Accuracy</span>
              <span className="text-lg font-bold text-white">{replay.stats.accuracy}%</span>
            </div>
          )}
          {replay.stats?.avgTime !== undefined && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 uppercase">Avg Time</span>
              <span className="text-lg font-bold text-white">{replay.stats.avgTime}ms</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
