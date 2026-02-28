import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Target, Zap, Home, Grid3X3, Move, Crosshair, Settings as SettingsIcon, Focus, Trophy } from 'lucide-react';
import Settings from './Settings';

const styles = {
  nav: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderBottom: '1px solid #334155',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backdropFilter: 'blur(8px)',
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 1rem',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(to right, #22d3ee, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    textDecoration: 'none',
    color: '#cbd5e1',
    transition: 'all 0.2s',
  },
  activeLink: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    color: '#22d3ee',
  },
  settingsButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    marginLeft: '0.5rem',
  },
};

export default function Navbar() {
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.container}>
          <div style={styles.inner}>
            <Link to="/" style={styles.logo}>
              <Target size={32} color="#22d3ee" />
              <span style={styles.logoText}>HudAim</span>
            </Link>

            <div style={styles.navLinks}>
              <Link to="/" style={{ ...styles.link, ...(isActive('/') ? styles.activeLink : {}) }}>
                <Home size={16} />
                <span>Home</span>
              </Link>
              <Link to="/reaction" style={{ ...styles.link, ...(isActive('/reaction') ? styles.activeLink : {}) }}>
                <Zap size={16} />
                <span>Reaction</span>
              </Link>
              <Link to="/aim" style={{ ...styles.link, ...(isActive('/aim') ? styles.activeLink : {}) }}>
                <Target size={16} />
                <span>Aim Trainer</span>
              </Link>
              <Link to="/gridshot" style={{ ...styles.link, ...(isActive('/gridshot') ? styles.activeLink : {}) }}>
                <Grid3X3 size={16} />
                <span>Grid Shot</span>
              </Link>
              <Link to="/tracking" style={{ ...styles.link, ...(isActive('/tracking') ? styles.activeLink : {}) }}>
                <Move size={16} />
                <span>Tracking</span>
              </Link>
              <Link to="/switching" style={{ ...styles.link, ...(isActive('/switching') ? styles.activeLink : {}) }}>
                <Crosshair size={16} />
                <span>Switching</span>
              </Link>
              <Link to="/precision" style={{ ...styles.link, ...(isActive('/precision') ? styles.activeLink : {}) }}>
                <Focus size={16} />
                <span>Precision</span>
              </Link>
              <Link to="/leaderboards" style={{ ...styles.link, ...(isActive('/leaderboards') ? styles.activeLink : {}) }}>
                <Trophy size={16} />
                <span>Leaderboards</span>
              </Link>
              <button 
                style={styles.settingsButton} 
                onClick={() => setSettingsOpen(true)}
                title="Settings"
              >
                <SettingsIcon size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
