import { useState, useEffect } from 'react';
import { Trophy, Play } from 'lucide-react';
import { syncLeaderboard } from '../utils/leaderboard';
import { getServerReplays, getServerReplay, getLocalReplays, getLocalReplay } from '../utils/replay';
import ReplayViewer from '../components/ReplayViewer';

const GAME_TYPES = [
  { id: 'aim', name: 'Aim Trainer', color: 'cyan' },
  { id: 'tracking', name: 'Tracking', color: 'cyan' },
  { id: 'switching', name: 'Switching', color: 'sky' },
  { id: 'precision', name: 'Precision', color: 'purple' },
  { id: 'gridshot', name: 'Grid Shot', color: 'amber' },
  { id: 'reaction', name: 'Reaction', color: 'yellow' },
];

const getRankBadge = (index) => {
  if (index === 0) return <span className="w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-sm font-bold">1</span>;
  if (index === 1) return <span className="w-7 h-7 rounded-full bg-slate-400/20 text-slate-300 flex items-center justify-center text-sm font-bold">2</span>;
  if (index === 2) return <span className="w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 flex items-center justify-center text-sm font-bold">3</span>;
  return <span className="w-7 text-center text-slate-500 text-sm font-bold">#{index + 1}</span>;
};

const formatStats = (stats, gameType) => {
  if (!stats) return null;
  const items = [];

  if (gameType === 'aim') {
    items.push({ label: 'Accuracy', value: `${stats.accuracy}%` });
    items.push({ label: 'Avg Time', value: `${stats.avgTime}ms` });
  } else if (gameType === 'tracking') {
    items.push({ label: 'Tracking', value: `${stats.trackingTime}s` });
    items.push({ label: 'Accuracy', value: `${stats.percentage}%` });
    items.push({ label: 'Difficulty', value: stats.difficulty });
  } else if (gameType === 'switching') {
    items.push({ label: 'Kills', value: stats.kills });
  } else if (gameType === 'precision') {
    items.push({ label: 'Kills', value: stats.kills });
    items.push({ label: 'Accuracy', value: `${stats.accuracy}%` });
  } else if (gameType === 'gridshot') {
    items.push({ label: 'Hits', value: stats.hits });
    items.push({ label: 'Accuracy', value: `${stats.accuracy}%` });
  } else if (gameType === 'reaction') {
    items.push({ label: 'Avg', value: `${stats.averageTime}ms` });
    items.push({ label: 'Best', value: `${stats.bestTime}ms` });
  }

  return items;
};

export default function Leaderboards() {
  const [selectedGame, setSelectedGame] = useState(GAME_TYPES[0]);
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

      if (selectedGame.id !== 'reaction') {
        const serverReplays = await getServerReplays(selectedGame.id);
        const localReplays = await getLocalReplays(selectedGame.id);

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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900">
      {/* Header with tab bar */}
      <div className="game-header">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-5 animate-fade-in-up">
            <Trophy size={28} className="text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">Leaderboards</h1>
          </div>

          {/* Horizontal tab bar */}
          <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            {GAME_TYPES.map((game) => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                  ${selectedGame.id === game.id
                    ? 'bg-cyan-400/20 text-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
              >
                {game.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="section-card">
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Trophy size={20} className="text-cyan-400" />
              {selectedGame.name} Top 10
            </h2>

            {loading ? (
              /* Skeleton loading */
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 w-full" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="flex flex-col gap-2">
                {leaderboard.map((entry, index) => {
                  const statItems = formatStats(entry.stats, selectedGame.id);
                  return (
                    <div
                      key={index}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-lg border border-slate-700/50 hover:bg-slate-800/80 hover:translate-x-1 transition-all">
                        <div className="flex items-center gap-3 flex-1">
                          {getRankBadge(index)}
                          <span className="text-white font-medium">{entry.nickname}</span>
                          {availableReplays[entry.uuid] && selectedGame.id !== 'reaction' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleWatchReplay(entry); }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-400/20 border border-cyan-400/50 rounded text-cyan-400 text-xs font-medium hover:bg-cyan-400/30 transition-colors ml-2"
                            >
                              <Play size={12} />
                              Replay
                            </button>
                          )}
                        </div>
                        <span className="text-yellow-400 font-bold text-lg">{entry.score}</span>
                      </div>
                      {statItems && statItems.length > 0 && (
                        <div className="flex gap-4 ml-10 mt-1 text-sm">
                          {statItems.map((stat) => (
                            <div key={stat.label} className="flex gap-1">
                              <span className="text-slate-500">{stat.label}:</span>
                              <span className="text-slate-400 font-medium">{stat.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg mb-1">No scores yet!</p>
                <p className="text-sm">Be the first to set a record in {selectedGame.name}</p>
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
