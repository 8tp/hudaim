import { forwardRef } from 'react';

// Fixed game area dimensions - 16:9 aspect ratio, similar to Human Benchmark
// This prevents cheating by resizing the browser window
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

const styles = {
  wrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0f1a',
    padding: '1rem',
    overflow: 'hidden',
  },
  gameArea: {
    width: `${GAME_WIDTH}px`,
    height: `${GAME_HEIGHT}px`,
    position: 'relative',
    backgroundColor: '#0f172a',
    borderRadius: '0.5rem',
    border: '2px solid #334155',
    overflow: 'hidden',
    flexShrink: 0,
  },
};

const FixedGameArea = forwardRef(({ children, style, onMouseMove, onMouseDown, cursor = 'crosshair' }, ref) => {
  return (
    <div style={styles.wrapper}>
      <div
        ref={ref}
        style={{
          ...styles.gameArea,
          cursor,
          ...style,
        }}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
      >
        {children}
      </div>
    </div>
  );
});

FixedGameArea.displayName = 'FixedGameArea';

export default FixedGameArea;
