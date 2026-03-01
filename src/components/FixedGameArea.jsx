import { forwardRef } from 'react';

// Fixed game area dimensions - 16:9 aspect ratio, similar to Human Benchmark
// This prevents cheating by resizing the browser window
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

const FixedGameArea = forwardRef(({ children, style, onMouseMove, onMouseDown, cursor = 'crosshair' }, ref) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0f1a] p-4 overflow-hidden">
      <div
        ref={ref}
        className="relative rounded-lg border-2 border-slate-700 overflow-hidden shrink-0"
        style={{
          width: `${GAME_WIDTH}px`,
          height: `${GAME_HEIGHT}px`,
          backgroundColor: '#0f172a',
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
