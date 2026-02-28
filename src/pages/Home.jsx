import { Link } from 'react-router-dom';
import { Zap, Target, Crosshair, Timer, MousePointer, Grid3X3, Move, Focus } from 'lucide-react';

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
  },
  hero: {
    position: 'relative',
    padding: '5rem 1rem',
    textAlign: 'center',
    background: 'linear-gradient(to bottom, rgba(6, 182, 212, 0.1), transparent)',
  },
  heroTitle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  heroTitleText: {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(to right, #22d3ee, #3b82f6, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroDescription: {
    fontSize: '1.25rem',
    color: '#cbd5e1',
    marginBottom: '2rem',
    maxWidth: '600px',
    margin: '0 auto 2rem',
  },
  badges: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: '0.5rem 1rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  gamesSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem 5rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  gamesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    maxWidth: '900px',
    margin: '0 auto',
  },
  gameCard: {
    display: 'block',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid #334155',
    borderRadius: '1rem',
    padding: '1.5rem',
    textDecoration: 'none',
    transition: 'all 0.3s',
    cursor: 'pointer',
  },
  gameIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  gameTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '0.5rem',
  },
  gameDescription: {
    color: '#94a3b8',
    fontSize: '0.875rem',
    lineHeight: '1.5',
  },
  playNow: {
    marginTop: '1rem',
    color: '#22d3ee',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
};

const games = [
  {
    title: 'Reaction Time',
    description: 'Test how quickly you can respond to a visual stimulus. Click as soon as the screen turns green.',
    icon: Zap,
    to: '/reaction',
    color: 'linear-gradient(to bottom right, #22c55e, #059669)',
  },
  {
    title: 'Aim Trainer',
    description: 'Improve your mouse accuracy by clicking on targets as quickly and precisely as possible.',
    icon: Target,
    to: '/aim',
    color: 'linear-gradient(to bottom right, #06b6d4, #3b82f6)',
  },
  {
    title: 'Grid Shot',
    description: 'Click targets in a grid pattern. Tests your flicking speed and precision across the screen.',
    icon: Grid3X3,
    to: '/gridshot',
    color: 'linear-gradient(to bottom right, #f59e0b, #ef4444)',
  },
  {
    title: 'Tracking',
    description: 'Follow a moving target with your cursor. Tests your smooth tracking and mouse control.',
    icon: Move,
    to: '/tracking',
    color: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
  },
  {
    title: 'Target Switching',
    description: 'Quickly switch between multiple targets. Eliminate as many as possible in 60 seconds.',
    icon: Crosshair,
    to: '/switching',
    color: 'linear-gradient(to bottom right, #06b6d4, #3b82f6)',
  },
  {
    title: 'Precision',
    description: 'Hit small targets with maximum accuracy. 4 targets at once for 60 seconds. Score = Kills × Accuracy!',
    icon: Focus,
    to: '/precision',
    color: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
  },
];

export default function Home() {
  return (
    <div style={styles.container}>
      <section style={styles.hero}>
        <div style={styles.heroTitle}>
          <Target size={48} color="#22d3ee" />
          <h1 style={styles.heroTitleText}>HudAim</h1>
        </div>
        
        <p style={styles.heroDescription}>
          Train your reflexes and improve your aim with our collection of precision training games. 
          Track your progress and compete with yourself.
        </p>
        
        <div style={styles.badges}>
          <div style={styles.badge}>
            <Crosshair size={16} color="#22d3ee" />
            <span>Precision Training</span>
          </div>
          <div style={styles.badge}>
            <Timer size={16} color="#22c55e" />
            <span>Reaction Tests</span>
          </div>
          <div style={styles.badge}>
            <MousePointer size={16} color="#a855f7" />
            <span>Mouse Accuracy</span>
          </div>
        </div>
      </section>

      <section style={styles.gamesSection}>
        <h2 style={styles.sectionTitle}>Choose Your Training</h2>
        
        <div style={styles.gamesGrid}>
          {games.map((game) => (
            <Link
              key={game.to}
              to={game.to}
              style={styles.gameCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#475569';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ ...styles.gameIcon, background: game.color }}>
                <game.icon size={32} color="white" />
              </div>
              <h3 style={styles.gameTitle}>{game.title}</h3>
              <p style={styles.gameDescription}>{game.description}</p>
              <div style={styles.playNow}>
                Play Now →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
