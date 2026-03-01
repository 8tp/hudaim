import { Trophy, RotateCcw, Video, User } from 'lucide-react';

export default function GameFinished({
  title,
  subtitle,
  subtitleColor = 'text-cyan-400',
  stats = [],
  statGridCols = 'grid-cols-2 sm:grid-cols-3',
  leaderboard = [],
  leaderboardScoreColor = 'text-cyan-400',
  nickname,
  onNicknameChange,
  onPlayAgain,
  onViewReplay,
  gradientClasses = 'from-cyan-500 to-blue-500',
  children,
}) {
  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 bg-[#0a0f1a] overflow-y-auto">
      <div className="max-w-2xl w-full text-center">
        <Trophy size={64} className="text-yellow-400 mx-auto mb-4 animate-score-pop" />
        <h2 className="text-4xl font-bold text-white mb-2 animate-fade-in-up">{title}</h2>
        <p className={`text-2xl font-bold ${subtitleColor} mb-8 animate-fade-in-up`} style={{ animationDelay: '80ms' }}>
          {subtitle}
        </p>

        <div className="flex items-center gap-2 mb-6 justify-center animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <User size={16} className="text-slate-400" />
          <span className="text-slate-400 text-sm">Nickname:</span>
          <input
            type="text"
            value={nickname}
            onChange={onNicknameChange}
            className="input-field w-40"
            maxLength={20}
          />
        </div>

        {stats.length > 0 && (
          <div className={`grid ${statGridCols} gap-4 mb-8 animate-fade-in-up`} style={{ animationDelay: '160ms' }}>
            {stats.map((stat, i) => (
              <div key={i} className="stat-card">
                <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {children}

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
                  <span className={`font-bold ${leaderboardScoreColor}`}>{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center mt-6 animate-fade-in-up" style={{ animationDelay: '320ms' }}>
          <button
            onClick={onPlayAgain}
            className={`btn-primary bg-gradient-to-r ${gradientClasses}`}
          >
            <RotateCcw size={20} />
            Play Again
          </button>
          {onViewReplay && (
            <button
              onClick={onViewReplay}
              className="btn-accent"
            >
              <Video size={20} />
              View Your Replay
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
