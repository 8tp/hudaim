import { useState, useEffect } from 'react';
import { X, User, Trash2 } from 'lucide-react';
import { getNickname, setNickname, clearLeaderboard } from '../utils/leaderboard';

export default function Settings({ isOpen, onClose }) {
  const [nickname, setNicknameState] = useState(() => getNickname());
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNicknameState(getNickname());
      setConfirmClear(false);
      setCleared(false);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNicknameChange = (e) => {
    const value = e.target.value;
    setNicknameState(value);
    setNickname(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearLeaderboard = () => {
    clearLeaderboard();
    setConfirmClear(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]" onClick={onClose}>
      <div className="animate-fade-in-scale bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-slate-700" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button className="p-1 text-slate-400 hover:text-white transition-colors" onClick={onClose} aria-label="Close settings">
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
          {cleared ? (
            <p className="text-green-500 text-sm">Leaderboard data cleared!</p>
          ) : confirmClear ? (
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">Are you sure?</span>
              <button
                className="px-3 py-1.5 bg-red-500 rounded-lg text-white text-sm font-medium hover:bg-red-600 transition-colors cursor-pointer"
                onClick={handleClearLeaderboard}
              >
                Yes, clear all
              </button>
              <button
                className="px-3 py-1.5 bg-slate-700 rounded-lg text-slate-300 text-sm hover:bg-slate-600 transition-colors cursor-pointer"
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500 rounded-lg text-red-500 text-sm hover:bg-red-500/30 transition-colors cursor-pointer"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 size={16} />
              Clear All Leaderboard Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
