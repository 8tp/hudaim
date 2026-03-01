import { useState } from 'react';
import { X, User, Trash2 } from 'lucide-react';
import { getNickname, setNickname, clearLeaderboard } from '../utils/leaderboard';

export default function Settings({ isOpen, onClose }) {
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [saved, setSaved] = useState(false);

  // Reset nickname when modal opens
  if (isOpen && nickname !== getNickname()) {
    setNicknameState(getNickname());
  }

  const handleNicknameChange = (e) => {
    const value = e.target.value;
    setNicknameState(value);
    setNickname(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearLeaderboard = () => {
    if (window.confirm('Are you sure you want to clear all leaderboard data? This cannot be undone.')) {
      clearLeaderboard();
      alert('Leaderboard data cleared!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]" onClick={onClose}>
      <div className="animate-fade-in-scale bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-slate-700" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button className="p-1 text-slate-400 hover:text-white transition-colors" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <User size={16} />
            Nickname
          </label>
          <input
            type="text"
            value={nickname}
            onChange={handleNicknameChange}
            className="input-field w-full"
            placeholder="Enter your nickname"
            maxLength={20}
          />
          {saved && <p className="text-green-500 text-xs mt-2">Saved!</p>}
        </div>

        <div className="border-t border-slate-700 pt-6">
          <p className="text-red-500 text-sm font-bold mb-3">Danger Zone</p>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500 rounded-lg text-red-500 text-sm hover:bg-red-500/30 transition-colors cursor-pointer"
            onClick={handleClearLeaderboard}
          >
            <Trash2 size={16} />
            Clear All Leaderboard Data
          </button>
        </div>
      </div>
    </div>
  );
}
