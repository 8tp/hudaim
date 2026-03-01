import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Target, Zap, Home, Grid3X3, Move, Crosshair, Settings as SettingsIcon, Focus, Trophy, Menu, X } from 'lucide-react';
import Settings from './Settings';

const gameLinks = [
  { to: '/reaction', label: 'Reaction', icon: Zap },
  { to: '/aim', label: 'Aim', icon: Target },
  { to: '/gridshot', label: 'Grid Shot', icon: Grid3X3 },
  { to: '/tracking', label: 'Tracking', icon: Move },
  { to: '/switching', label: 'Switching', icon: Crosshair },
  { to: '/precision', label: 'Precision', icon: Focus },
];

const mobileLinks = [
  { to: '/', label: 'Home', icon: Home },
  ...gameLinks,
  { to: '/leaderboards', label: 'Leaderboards', icon: Trophy },
];

export default function Navbar() {
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-slate-800/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 no-underline shrink-0">
              <Target size={26} className="text-cyan-400" />
              <span className="text-xl font-bold text-gradient-primary">HudAim</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5 ml-8">
              {gameLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`px-2.5 py-1.5 rounded-md no-underline text-[13px] font-medium transition-colors
                    ${isActive(to)
                      ? 'bg-cyan-400/15 text-cyan-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                    }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Right side: Leaderboards + Settings */}
            <div className="hidden md:flex items-center gap-1 ml-auto">
              <Link
                to="/leaderboards"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md no-underline text-[13px] font-medium transition-colors
                  ${isActive('/leaderboards')
                    ? 'bg-cyan-400/15 text-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                  }`}
              >
                <Trophy size={14} />
                <span>Leaderboards</span>
              </Link>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              <button
                className="flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/40 transition-colors"
                onClick={() => setSettingsOpen(true)}
                title="Settings"
              >
                <SettingsIcon size={16} />
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-700 animate-slide-down">
            <div className="px-4 py-3 flex flex-col gap-1">
              {mobileLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline text-sm font-medium transition-colors
                    ${isActive(to)
                      ? 'bg-cyan-400/20 text-cyan-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors text-sm font-medium"
                onClick={() => { setSettingsOpen(true); setMobileOpen(false); }}
              >
                <SettingsIcon size={18} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        )}
      </nav>
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
