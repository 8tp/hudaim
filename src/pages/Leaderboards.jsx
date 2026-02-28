import { useState, useEffect } from 'react';
import { Trophy, ChevronDown, Play } from 'lucide-react';
import { syncLeaderboard } from '../utils/leaderboard';
import { getServerReplays, getServerReplay, getLocalReplays, getLocalReplay } from '../utils/replay';
import ReplayViewer from '../components/ReplayViewer';

const GAME_TYPES = [
  { id: 'aim', name: 'Aim Trainer', color: '#22d3ee' },
  { id: 'tracking', name: 'Tracking', color: '#06b6d4' },
  { id: 'switching', name: 'Target Switching', color: '#0ea5e9' },
  { id: 'precision', name: 'Precision', color: '#a855f7' },
  { id: 'gridshot', name: 'Grid Shot', color: '#f59e0b' },
  { id: 'reaction', name: 'Reaction Time', color: '#eab308' },
];

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderBottom: '1px solid #334155',
    padding: '1.5rem',
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  titleText: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white',
  },
  dropdownContainer: {
    position: 'relative',
    maxWidth: '300px',
  },
  dropdownButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    zIndex: 10,
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
  },
  dropdownItem: {
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    color: 'white',
    borderBottom: '1px solid #334155',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '2rem 1rem',
  },
  contentInner: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  leaderboardSection: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    border: '1px solid #334155',
  },
  leaderboardTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  leaderboardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  leaderboardItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    transition: 'all 0.2s',
  },
  leaderboardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
  },
  leaderboardRank: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#94a3b8',
    minWidth: '2.5rem',
  },
  leaderboardName: {
    fontSize: '1rem',
    color: 'white',
    fontWeight: '500',
    flex: 1,
  },
  leaderboardScore: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#facc15',
  },
  leaderboardStats: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.875rem',
    color: '#94a3b8',
    marginLeft: '3.5rem',
  },
  statItem: {
    display: 'flex',
    gap: '0.25rem',
  },
  statLabel: {
    color: '#64748b',
  },
  statValue: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#64748b',
  },
  emptyStateText: {
    fontSize: '1.125rem',
    marginBottom: '0.5rem',
  },
  emptyStateSubtext: {
    fontSize: '0.875rem',
  },
  replayButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.375rem 0.75rem',
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    border: '1px solid #22d3ee',
    borderRadius: '0.375rem',
    color: '#22d3ee',
    fontSize: '0.75rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginLeft: '1rem',
    transition: 'all 0.2s',
  },
};

export default function Leaderboards() {
  const [selectedGame, setSelectedGame] = useState(GAME_TYPES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableReplays, setAvailableReplays] = useState({});
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [showReplayViewer, setShowReplayViewer] = useState(false);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      const data = await syncLeaderboard(selectedGame.id);
      setLeaderboard(data);
      
      // Load available replays for this game type (skip reaction time)
      if (selectedGame.id !== 'reaction') {
        const serverReplays = await getServerReplays(selectedGame.id);
        const localReplays = await getLocalReplays(selectedGame.id);
        
        // Create a map of userId -> replay availability
        const replayMap = {};
        serverReplays.forEach(r => {
          replayMap[r.userId] = { source: 'server', id: r.id };
        });
        localReplays.forEach(r => {
          if (!replayMap[r.userId]) {
            replayMap[r.userId] = { source: 'local', id: r.id };
          }
        });
        setAvailableReplays(replayMap);
      } else {
        setAvailableReplays({});
      }
      
      setLoading(false);
    };
    loadLeaderboard();
  }, [selectedGame]);

  const handleWatchReplay = async (entry) => {
    const replayInfo = availableReplays[entry.uuid];
    if (!replayInfo) return;
    
    let replay;
    if (replayInfo.source === 'server') {
      replay = await getServerReplay(replayInfo.id);
    } else {
      replay = await getLocalReplay(replayInfo.id);
    }
    
    if (replay) {
      setSelectedReplay(replay);
      setShowReplayViewer(true);
    }
  };

  const closeReplayViewer = () => {
    setShowReplayViewer(false);
    setSelectedReplay(null);
  };

  const handleGameSelect = (game) => {
    setSelectedGame(game);
    setIsDropdownOpen(false);
  };

  const getRankColor = (index) => {
    if (index === 0) return '#facc15'; // Gold
    if (index === 1) return '#94a3b8'; // Silver
    if (index === 2) return '#cd7f32'; // Bronze
    return '#64748b';
  };

  const formatStats = (stats, gameType) => {
    const statElements = [];
    
    if (gameType === 'aim') {
      statElements.push(
        <div key="accuracy" style={styles.statItem}>
          <span style={styles.statLabel}>Accuracy:</span>
          <span style={styles.statValue}>{stats.accuracy}%</span>
        </div>,
        <div key="avgTime" style={styles.statItem}>
          <span style={styles.statLabel}>Avg Time:</span>
          <span style={styles.statValue}>{stats.avgTime}ms</span>
        </div>
      );
    } else if (gameType === 'tracking') {
      statElements.push(
        <div key="tracking" style={styles.statItem}>
          <span style={styles.statLabel}>Tracking:</span>
          <span style={styles.statValue}>{stats.trackingTime}s</span>
        </div>,
        <div key="accuracy" style={styles.statItem}>
          <span style={styles.statLabel}>Accuracy:</span>
          <span style={styles.statValue}>{stats.percentage}%</span>
        </div>,
        <div key="difficulty" style={styles.statItem}>
          <span style={styles.statLabel}>Difficulty:</span>
          <span style={styles.statValue}>{stats.difficulty}</span>
        </div>
      );
    } else if (gameType === 'switching') {
      statElements.push(
        <div key="kills" style={styles.statItem}>
          <span style={styles.statLabel}>Kills:</span>
          <span style={styles.statValue}>{stats.kills}</span>
        </div>
      );
    } else if (gameType === 'precision') {
      statElements.push(
        <div key="kills" style={styles.statItem}>
          <span style={styles.statLabel}>Kills:</span>
          <span style={styles.statValue}>{stats.kills}</span>
        </div>,
        <div key="accuracy" style={styles.statItem}>
          <span style={styles.statLabel}>Accuracy:</span>
          <span style={styles.statValue}>{stats.accuracy}%</span>
        </div>
      );
    } else if (gameType === 'gridshot') {
      statElements.push(
        <div key="hits" style={styles.statItem}>
          <span style={styles.statLabel}>Hits:</span>
          <span style={styles.statValue}>{stats.hits}</span>
        </div>,
        <div key="accuracy" style={styles.statItem}>
          <span style={styles.statLabel}>Accuracy:</span>
          <span style={styles.statValue}>{stats.accuracy}%</span>
        </div>
      );
    } else if (gameType === 'reaction') {
      statElements.push(
        <div key="avg" style={styles.statItem}>
          <span style={styles.statLabel}>Avg:</span>
          <span style={styles.statValue}>{stats.averageTime}ms</span>
        </div>,
        <div key="best" style={styles.statItem}>
          <span style={styles.statLabel}>Best:</span>
          <span style={styles.statValue}>{stats.bestTime}ms</span>
        </div>
      );
    }
    
    return statElements;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerTitle}>
            <Trophy size={28} color="#facc15" />
            <h1 style={styles.titleText}>Leaderboards</h1>
          </div>
          
          <div style={styles.dropdownContainer}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                ...styles.dropdownButton,
                borderColor: selectedGame.color,
              }}
            >
              <span>{selectedGame.name}</span>
              <ChevronDown 
                size={20} 
                style={{ 
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} 
              />
            </button>
            
            {isDropdownOpen && (
              <div style={styles.dropdownMenu}>
                {GAME_TYPES.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => handleGameSelect(game)}
                    style={{
                      ...styles.dropdownItem,
                      backgroundColor: selectedGame.id === game.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedGame.id !== game.id) {
                        e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedGame.id !== game.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {game.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.contentInner}>
          <div style={styles.leaderboardSection}>
            <h2 style={{...styles.leaderboardTitle, color: selectedGame.color}}>
              <Trophy size={20} color={selectedGame.color} />
              {selectedGame.name} Top 10
            </h2>
            
            {loading ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyStateText}>Loading...</p>
              </div>
            ) : leaderboard.length > 0 ? (
              <div style={styles.leaderboardList}>
                {leaderboard.map((entry, index) => (
                  <div key={index}>
                    <div
                      style={{
                        ...styles.leaderboardItem,
                        borderLeft: `3px solid ${getRankColor(index)}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.8)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={styles.leaderboardLeft}>
                        <span style={{...styles.leaderboardRank, color: getRankColor(index)}}>
                          #{index + 1}
                        </span>
                        <span style={styles.leaderboardName}>{entry.nickname}</span>
                        {availableReplays[entry.uuid] && selectedGame.id !== 'reaction' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWatchReplay(entry);
                            }}
                            style={styles.replayButton}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(34, 211, 238, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(34, 211, 238, 0.2)';
                            }}
                          >
                            <Play size={12} />
                            Replay
                          </button>
                        )}
                      </div>
                      <span style={styles.leaderboardScore}>{entry.score}</span>
                    </div>
                    {entry.stats && (
                      <div style={styles.leaderboardStats}>
                        {formatStats(entry.stats, selectedGame.id)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p style={styles.emptyStateText}>No scores yet!</p>
                <p style={styles.emptyStateSubtext}>
                  Be the first to set a record in {selectedGame.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {showReplayViewer && selectedReplay && (
        <ReplayViewer replay={selectedReplay} onClose={closeReplayViewer} />
      )}
    </div>
  );
}
