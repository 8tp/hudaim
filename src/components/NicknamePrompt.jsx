import { useState } from 'react';
import { User, ArrowRight } from 'lucide-react';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '1.5rem',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    margin: '1rem',
    border: '1px solid #334155',
    textAlign: 'center',
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(to bottom right, #22d3ee, #3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '1rem',
    marginBottom: '2rem',
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: '1.5rem',
  },
  input: {
    width: '100%',
    padding: '1rem 1.25rem',
    borderRadius: '0.75rem',
    border: '2px solid #334155',
    backgroundColor: '#0f172a',
    color: 'white',
    fontSize: '1.125rem',
    textAlign: 'center',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputFocused: {
    borderColor: '#22d3ee',
  },
  button: {
    width: '100%',
    padding: '1rem',
    borderRadius: '0.75rem',
    border: 'none',
    background: 'linear-gradient(to right, #22d3ee, #3b82f6)',
    color: 'white',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'transform 0.2s, opacity 0.2s',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  hint: {
    color: '#64748b',
    fontSize: '0.875rem',
    marginTop: '1rem',
  },
};

export default function NicknamePrompt({ onComplete }) {
  const [nickname, setNickname] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length >= 2) {
      onComplete(trimmed);
    }
  };

  const isValid = nickname.trim().length >= 2;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.iconWrapper}>
          <User size={40} color="white" />
        </div>
        
        <h1 style={styles.title}>Welcome to HudAim!</h1>
        <p style={styles.subtitle}>
          Enter a nickname to track your scores on the leaderboard
        </p>
        
        <form onSubmit={handleSubmit}>
          <div style={styles.inputWrapper}>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 20))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                ...styles.input,
                ...(focused ? styles.inputFocused : {}),
              }}
              placeholder="Your nickname"
              autoFocus
              maxLength={20}
            />
          </div>
          
          <button
            type="submit"
            style={{
              ...styles.button,
              ...(!isValid ? styles.buttonDisabled : {}),
            }}
            disabled={!isValid}
          >
            Start Training
            <ArrowRight size={20} />
          </button>
        </form>
        
        <p style={styles.hint}>
          2-20 characters • You can change this later in settings
        </p>
      </div>
    </div>
  );
}
