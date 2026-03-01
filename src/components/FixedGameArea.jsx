import { forwardRef, useState, useEffect, useRef } from 'react';

// Fixed game area dimensions - 16:9 aspect ratio, similar to Human Benchmark
// This prevents cheating by resizing the browser window
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

const FixedGameArea = forwardRef(({ children, style, onMouseMove, onMouseDown, cursor = 'crosshair' }, ref) => {
  const [scale, setScale] = useState(1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const padding = 32; // p-4 = 16px each side
      const availW = width - padding;
      const availH = height - padding;
      const s = Math.min(1, availW / GAME_WIDTH, availH / GAME_HEIGHT);
      setScale(s);
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="flex-1 flex items-center justify-center bg-[#0a0f1a] p-4 overflow-hidden">
      <div
        ref={ref}
        className="relative rounded-lg border-2 border-slate-700 overflow-hidden shrink-0"
        style={{
          width: `${GAME_WIDTH}px`,
          height: `${GAME_HEIGHT}px`,
          backgroundColor: '#0f172a',
          cursor,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
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
