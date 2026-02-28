import { useState } from 'react';
import { X, User, Trash2 } from 'lucide-react';
import { getNickname, setNickname, clearLeaderboard } from '../utils/leaderboard';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '1rem',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '400px',
    margin: '1rem',
    border: '1px solid #334155',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  section: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#94a3b8',
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: 'white',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  dangerSection: {
    borderTop: '1px solid #334155',
    paddingTop: '1.5rem',
  },
  dangerTitle: {
    color: '#ef4444',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    marginBottom: '0.75rem',
  },
  dangerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid #ef4444',
    borderRadius: '0.5rem',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  savedMessage: {
    color: '#22c55e',
    fontSize: '0.75rem',
    marginTop: '0.5rem',
  },
};

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
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button style={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>
            <User size={16} />
            Nickname
          </label>
          <input
            type="text"
            value={nickname}
            onChange={handleNicknameChange}
            style={styles.input}
            placeholder="Enter your nickname"
            maxLength={20}
          />
          {saved && <p style={styles.savedMessage}>Saved!</p>}
        </div>

        <div style={styles.dangerSection}>
          <p style={styles.dangerTitle}>Danger Zone</p>
          <button style={styles.dangerButton} onClick={handleClearLeaderboard}>
            <Trash2 size={16} />
            Clear All Leaderboard Data
          </button>
        </div>
      </div>
    </div>
  );
}
