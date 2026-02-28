import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, X, FastForward } from 'lucide-react';
import { ReplayPlayer } from '../utils/replay';
import { GAME_WIDTH, GAME_HEIGHT } from './FixedGameArea';

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#1e293b',
    borderRadius: '1rem',
    padding: '1.5rem',
    maxWidth: '1100px',
    width: '95%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    marginTop: '0.25rem',
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameAreaContainer: {
    position: 'relative',
    width: `${GAME_WIDTH}px`,
    height: `${GAME_HEIGHT}px`,
    margin: '0 auto',
    backgroundColor: '#0f172a',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    border: '2px solid #334155',
  },
  cursor: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #22d3ee',
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    transition: 'none',
    zIndex: 100,
  },
  target: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
    boxShadow: '0 10px 25px rgba(168, 85, 247, 0.4)',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  targetHit: {
    background: 'linear-gradient(to bottom right, #22c55e, #16a34a)',
    boxShadow: '0 0 30px rgba(34, 197, 94, 0.8)',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '0.5rem',
  },
  playButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#22d3ee',
    border: 'none',
    cursor: 'pointer',
    color: '#0f172a',
  },
  controlButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '0.5rem',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
  },
  speedButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  speedButtonActive: {
    backgroundColor: '#22d3ee',
    color: '#0f172a',
  },
  timeline: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  timelineBar: {
    position: 'relative',
    height: '8px',
    backgroundColor: '#334155',
    borderRadius: '4px',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  timelineProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#22d3ee',
    borderRadius: '4px',
    transition: 'width 0.1s linear',
  },
  timelineHandle: {
    position: 'absolute',
    top: '50%',
    width: '16px',
    height: '16px',
    backgroundColor: 'white',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    cursor: 'grab',
  },
  timeDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#64748b',
  },
  stats: {
    display: 'flex',
    gap: '2rem',
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '0.5rem',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: 'white',
  },
  gridCell: {
    position: 'absolute',
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTarget: {
    width: '80%',
    height: '80%',
    borderRadius: '50%',
    background: 'linear-gradient(to bottom right, #f59e0b, #f97316)',
    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
  },
};

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

  const handleFrame = useCallback((frame) => {
    setCursorPos({ x: frame.mx, y: frame.my });
    setCurrentTime(frame.t);
  }, []);

  const handleEvent = useCallback((event, isAccumulated = false) => {
    switch (event.type) {
      case 'spawn':
        // Always add targets, whether accumulated or not
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

    // Auto-play on mount if enabled
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
      // Reset if at end
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
    
    // Reinitialize player
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
    
    // Immediately clear state synchronously
    setTargets([]);
    setHits(0);
    setCurrentScore(0);
    setCurrentTime(newTime);
    
    // Seek after state is cleared (React batches these updates)
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
      // Render 3x3 grid using CSS Grid to match actual game layout
      const gridSize = 3;
      
      return (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: '1rem',
          padding: '1rem',
        }}>
          {Array.from({ length: 9 }).map((_, i) => {
            const isActive = targets.some(t => t.cellIndex === i);
            
            return (
              <div
                key={i}
                style={{
                  backgroundColor: 'rgba(51, 65, 85, 0.3)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isActive && (
                  <div style={{
                    width: '80%',
                    height: '80%',
                    borderRadius: '50%',
                    background: 'linear-gradient(to bottom right, #f59e0b, #ef4444)',
                    boxShadow: '0 10px 25px rgba(245, 158, 11, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                    }} />
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
        style={{
          ...styles.target,
          ...(target.hit ? styles.targetHit : {}),
          left: target.x,
          top: target.y,
          width: target.size || 60,
          height: target.size || 60,
        }}
      />
    ));
  };

  if (!replay) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>
              Replay: {replay.nickname} - {replay.score} pts
            </div>
            <div style={styles.subtitle}>
              {replay.gameType.charAt(0).toUpperCase() + replay.gameType.slice(1)} • 
              {formatTime(replay.duration)} duration
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.gameAreaContainer}>
          {renderTargets()}
          <div
            style={{
              ...styles.cursor,
              left: cursorPos.x,
              top: cursorPos.y,
            }}
          />
        </div>

        <div style={styles.controls}>
          <button style={styles.playButton} onClick={togglePlay}>
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          
          <button style={styles.controlButton} onClick={resetReplay}>
            <RotateCcw size={20} />
          </button>

          <div style={styles.timeline}>
            <div
              ref={timelineRef}
              style={styles.timelineBar}
              onClick={handleTimelineClick}
            >
              <div style={{ ...styles.timelineProgress, width: `${progress}%` }} />
              <div style={{ ...styles.timelineHandle, left: `${progress}%` }} />
            </div>
            <div style={styles.timeDisplay}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(replay.duration)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[0.5, 1, 2].map(speed => (
              <button
                key={speed}
                style={{
                  ...styles.speedButton,
                  ...(playbackSpeed === speed ? styles.speedButtonActive : {}),
                }}
                onClick={() => handleSpeedChange(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Score</span>
            <span style={styles.statValue}>{currentScore || replay.score}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Hits</span>
            <span style={styles.statValue}>{hits}</span>
          </div>
          {replay.stats?.accuracy !== undefined && (
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Accuracy</span>
              <span style={styles.statValue}>{replay.stats.accuracy}%</span>
            </div>
          )}
          {replay.stats?.avgTime !== undefined && (
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Avg Time</span>
              <span style={styles.statValue}>{replay.stats.avgTime}ms</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
