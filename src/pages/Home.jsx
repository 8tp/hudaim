import { Link } from 'react-router-dom';
import useDocumentTitle from '../utils/useDocumentTitle';
import { Zap, Target, Crosshair, Timer, MousePointer, Grid3X3, Move, Focus } from 'lucide-react';

const games = [
  {
    title: 'Reaction Time',
    description: 'Test how quickly you can respond to a visual stimulus. Click as soon as the screen turns green.',
    icon: Zap,
    to: '/reaction',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    title: 'Aim Trainer',
    description: 'Improve your mouse accuracy by clicking on targets as quickly and precisely as possible.',
    icon: Target,
    to: '/aim',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    title: 'Grid Shot',
    description: 'Click targets in a grid pattern. Tests your flicking speed and precision across the screen.',
    icon: Grid3X3,
    to: '/gridshot',
    gradient: 'from-amber-500 to-red-500',
  },
  {
    title: 'Tracking',
    description: 'Follow a moving target with your cursor. Tests your smooth tracking and mouse control.',
    icon: Move,
    to: '/tracking',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Target Switching',
    description: 'Quickly switch between multiple targets. Eliminate as many as possible in 60 seconds.',
    icon: Crosshair,
    to: '/switching',
    gradient: 'from-indigo-500 to-cyan-500',
  },
  {
    title: 'Precision',
    description: 'Hit small targets with maximum accuracy. 4 targets at once for 60 seconds. Score = Kills x Accuracy!',
    icon: Focus,
    to: '/precision',
    gradient: 'from-rose-500 to-orange-500',
  },
];

export default function Home() {
  useDocumentTitle('HudAim - Aim Training');
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <section className="relative py-12 sm:py-16 md:py-20 px-4 text-center bg-gradient-to-b from-cyan-500/10 to-transparent">
        <div className="animate-fade-in-up flex items-center justify-center gap-3 mb-6">
          <Target size={48} className="text-cyan-400 hidden sm:block" />
          <Target size={36} className="text-cyan-400 sm:hidden" />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gradient-hero">HudAim</h1>
        </div>

        <p className="animate-fade-in-up text-base sm:text-lg md:text-xl text-slate-300 mb-8 max-w-xl mx-auto" style={{ animationDelay: '80ms' }}>
          Train your reflexes and improve your aim with our collection of precision training games.
          Track your progress and compete with yourself.
        </p>

        <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full text-sm text-slate-400">
            <Crosshair size={16} className="text-cyan-400" />
            <span>Precision Training</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full text-sm text-slate-400">
            <Timer size={16} className="text-green-500" />
            <span>Reaction Tests</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full text-sm text-slate-400">
            <MousePointer size={16} className="text-purple-500" />
            <span>Mouse Accuracy</span>
          </div>
        </div>
      </section>

      {/* Game cards */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="animate-fade-in-up text-2xl font-bold text-white mb-8 text-center" style={{ animationDelay: '240ms' }}>
          Choose Your Training
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {games.map((game, index) => (
            <Link
              key={game.to}
              to={game.to}
              className="animate-fade-in-up group glass-card p-6 no-underline hover:border-slate-500 hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${320 + index * 80}ms` }}
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.gradient} flex items-center justify-center mb-4`}>
                <game.icon size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{game.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{game.description}</p>
              <div className="mt-4 text-cyan-400 text-sm font-medium flex items-center gap-1">
                Play Now
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
