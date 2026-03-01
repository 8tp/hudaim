import { useState } from 'react';
import { User, ArrowRight } from 'lucide-react';

export default function NicknamePrompt({ onComplete }) {
  const [nickname, setNickname] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length >= 2) {
      onComplete(trimmed);
    }
  };

  const isValid = nickname.trim().length >= 2;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[2000]">
      <div className="animate-fade-in-scale bg-slate-800 rounded-2xl p-6 sm:p-8 w-full max-w-md mx-4 border border-slate-700 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mx-auto mb-6">
          <User size={40} className="text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Welcome to HudAim!</h1>
        <p className="text-slate-400 text-base mb-8">
          Enter a nickname to track your scores on the leaderboard
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 20))}
              className="input-field-lg"
              placeholder="Your nickname"
              autoFocus
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            className={`btn-primary bg-gradient-to-r from-cyan-400 to-blue-500 w-full justify-center
              ${isValid ? '' : 'opacity-50 cursor-not-allowed'}`}
            disabled={!isValid}
          >
            Start Training
            <ArrowRight size={20} />
          </button>
        </form>

        <p className="text-slate-500 text-sm mt-4">
          2-20 characters &middot; You can change this later in settings
        </p>
      </div>
    </div>
  );
}
