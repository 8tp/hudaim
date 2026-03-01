import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Award, Zap } from 'lucide-react';

// Heatmap color gradient (blue -> green -> yellow -> red)
const getHeatmapColor = (intensity) => {
  if (intensity < 0.25) return `rgba(59, 130, 246, ${0.3 + intensity * 2})`; // Blue
  if (intensity < 0.5) return `rgba(34, 197, 94, ${0.4 + intensity})`; // Green
  if (intensity < 0.75) return `rgba(250, 204, 21, ${0.5 + intensity * 0.5})`; // Yellow
  return `rgba(239, 68, 68, ${0.6 + intensity * 0.4})`; // Red
};

// Analyze click positions relative to target centers
const analyzeClickAccuracy = (clickData) => {
  if (!clickData || clickData.length === 0) {
    return { avgOffset: { x: 0, y: 0 }, spread: 0, bias: 'center' };
  }

  const offsets = clickData.map(c => ({
    x: c.clickX - c.targetX,
    y: c.clickY - c.targetY,
  }));

  const avgX = offsets.reduce((sum, o) => sum + o.x, 0) / offsets.length;
  const avgY = offsets.reduce((sum, o) => sum + o.y, 0) / offsets.length;

  const spread = Math.sqrt(
    offsets.reduce((sum, o) => sum + Math.pow(o.x - avgX, 2) + Math.pow(o.y - avgY, 2), 0) / offsets.length
  );

  let bias = 'center';
  const threshold = 5;
  if (Math.abs(avgX) > threshold || Math.abs(avgY) > threshold) {
    const angle = Math.atan2(avgY, avgX) * (180 / Math.PI);
    if (angle >= -22.5 && angle < 22.5) bias = 'right';
    else if (angle >= 22.5 && angle < 67.5) bias = 'bottom-right';
    else if (angle >= 67.5 && angle < 112.5) bias = 'bottom';
    else if (angle >= 112.5 && angle < 157.5) bias = 'bottom-left';
    else if (angle >= 157.5 || angle < -157.5) bias = 'left';
    else if (angle >= -157.5 && angle < -112.5) bias = 'top-left';
    else if (angle >= -112.5 && angle < -67.5) bias = 'top';
    else if (angle >= -67.5 && angle < -22.5) bias = 'top-right';
  }

  return { avgOffset: { x: avgX, y: avgY }, spread, bias, offsets };
};

// Analyze spatial performance
const analyzeSpatialPerformance = (clickData, gameWidth = 960) => {
  if (!clickData || clickData.length === 0) {
    return { leftBias: 0, rightBias: 0, overshootLeft: 0, overshootRight: 0, weakness: null };
  }

  let leftOffsets = [];
  let rightOffsets = [];

  clickData.forEach(click => {
    const offsetX = click.clickX - click.targetX;
    if (click.targetX < gameWidth / 2) {
      leftOffsets.push(offsetX);
    } else {
      rightOffsets.push(offsetX);
    }
  });

  const calcBias = (offsets) => {
    if (offsets.length === 0) return { bias: 0, overshoot: 0 };
    const avgOffset = offsets.reduce((sum, o) => sum + o, 0) / offsets.length;
    const overshoots = offsets.filter(o => Math.abs(o) > 10).length;
    const overshootRate = Math.round((overshoots / offsets.length) * 100);
    return { bias: Math.round(avgOffset), overshoot: overshootRate };
  };

  const leftAnalysis = calcBias(leftOffsets);
  const rightAnalysis = calcBias(rightOffsets);

  let weakness = null;
  if (leftAnalysis.bias > 15) weakness = 'overshooting left targets';
  else if (leftAnalysis.bias < -15) weakness = 'undershooting left targets';
  if (rightAnalysis.bias > 15) weakness = weakness ? `${weakness} and overshooting right targets` : 'overshooting right targets';
  else if (rightAnalysis.bias < -15) weakness = weakness ? `${weakness} and undershooting right targets` : 'undershooting right targets';

  return {
    leftBias: leftAnalysis.bias,
    rightBias: rightAnalysis.bias,
    overshootLeft: leftAnalysis.overshoot,
    overshootRight: rightAnalysis.overshoot,
    weakness
  };
};

// Generate insights
const generateInsights = (stats, gameType, clickData, spatialData) => {
  const insights = [];

  if (stats.score) {
    const scoreThresholds = {
      aim: { good: 2000, great: 2500, amazing: 2800 },
      gridshot: { good: 3000, great: 5000, amazing: 7000 },
      precision: { good: 5000, great: 10000, amazing: 15000 },
      tracking: { good: 1500, great: 2500, amazing: 3500 },
      switching: { good: 5000, great: 8000, amazing: 12000 },
    };
    const thresholds = scoreThresholds[gameType] || { good: 1000, great: 2000, amazing: 3000 };

    if (stats.score >= thresholds.amazing) {
      insights.push({ type: 'positive', icon: Award, title: 'Amazing!', text: 'Outstanding performance! You\'re in the top tier.' });
    } else if (stats.score >= thresholds.great) {
      insights.push({ type: 'positive', icon: TrendingUp, title: 'Great Score!', text: 'Excellent work! Keep pushing for even higher.' });
    } else if (stats.score >= thresholds.good) {
      insights.push({ type: 'neutral', icon: Target, title: 'Good Job', text: 'Solid performance. Room for improvement!' });
    }
  }

  if (stats.accuracy !== undefined) {
    if (stats.accuracy >= 95) {
      insights.push({ type: 'positive', icon: Target, title: 'Precision Master', text: 'Near-perfect accuracy! Incredible focus.' });
    } else if (stats.accuracy < 70) {
      insights.push({ type: 'negative', icon: AlertTriangle, title: 'Accuracy Tip', text: 'Try slowing down slightly for better accuracy.' });
    }
  }

  if (spatialData?.weakness) {
    insights.push({
      type: 'neutral',
      icon: AlertTriangle,
      title: `${spatialData.weakness.charAt(0).toUpperCase() + spatialData.weakness.slice(1)} Side Weakness`,
      text: `You tend to miss more targets on the ${spatialData.weakness}. Practice that area!`
    });
  }

  if (clickData?.bias && clickData.bias !== 'center') {
    insights.push({
      type: 'neutral',
      icon: Target,
      title: 'Click Bias Detected',
      text: `Your clicks tend to land ${clickData.bias} of center. Adjust your aim slightly.`
    });
  }

  if (stats.avgTime) {
    if (stats.avgTime < 200) {
      insights.push({ type: 'positive', icon: Zap, title: 'Lightning Fast!', text: 'Your reaction time is exceptional.' });
    } else if (stats.avgTime > 500) {
      insights.push({ type: 'neutral', icon: TrendingDown, title: 'Speed Tip', text: 'Try to react faster to targets for higher scores.' });
    }
  }

  return insights.slice(0, 4);
};

// Click Heatmap Component
const ClickHeatmap = ({ clickData, targetSize = 60 }) => {
  const normalizedClicks = useMemo(() => {
    if (!clickData?.offsets) return [];

    const scale = 80 / (targetSize / 2);
    return clickData.offsets.map((offset, idx) => {
      const dist = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
      const maxDist = targetSize / 2;
      const intensity = Math.min(1, 0.5 + (dist / maxDist) * 0.5);
      return {
        x: 100 + offset.x * scale,
        y: 100 + offset.y * scale,
        intensity,
        key: idx,
      };
    });
  }, [clickData, targetSize]);

  if (normalizedClicks.length === 0) return null;

  return (
    <div className="flex justify-center mb-4">
      <div>
        <div className="relative w-[200px] h-[200px] rounded-full bg-slate-900/80 border-2 border-slate-700 overflow-hidden">
          {/* Target rings */}
          {[80, 60, 40, 20].map(size => (
            <div
              key={size}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-600/30"
              style={{ width: `${size * 2}px`, height: `${size * 2}px` }}
            />
          ))}

          {/* Click dots */}
          {normalizedClicks.map((click, i) => (
            <div
              key={i}
              className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${click.x}px`,
                top: `${click.y}px`,
                width: '12px',
                height: '12px',
                backgroundColor: getHeatmapColor(click.intensity),
                boxShadow: `0 0 8px ${getHeatmapColor(click.intensity)}`,
              }}
            />
          ))}

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-500 border-2 border-white z-10" />

          {/* Average offset indicator */}
          {clickData.avgOffset && (Math.abs(clickData.avgOffset.x) > 2 || Math.abs(clickData.avgOffset.y) > 2) && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-3 border-cyan-400 bg-transparent"
              style={{
                left: `${100 + clickData.avgOffset.x * (80 / (targetSize / 2))}px`,
                top: `${100 + clickData.avgOffset.y * (80 / (targetSize / 2))}px`,
              }}
              title="Average click position"
            />
          )}
        </div>

        <div className="flex justify-center gap-4 mt-2 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.7)' }} />
            <span>Sparse</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
            <span>Dense</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-cyan-400 bg-transparent" />
            <span>Avg</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main PostGameAnalytics Component
export default function PostGameAnalytics({
  gameType,
  stats,
  clickData = [],
  targetSize = 60,
  gameWidth = 960,
}) {
  const clickAnalysis = useMemo(() => analyzeClickAccuracy(clickData), [clickData]);
  const spatialAnalysis = useMemo(() => analyzeSpatialPerformance(clickData, gameWidth), [clickData, gameWidth]);

  const insights = useMemo(() =>
    generateInsights(stats, gameType, clickAnalysis, spatialAnalysis),
    [stats, gameType, clickAnalysis, spatialAnalysis]
  );

  const showHeatmap = ['aim', 'gridshot', 'precision'].includes(gameType) && clickData.length > 0;

  return (
    <div className="w-full mt-6">
      {/* Click Heatmap */}
      {showHeatmap && (
        <div className="section-card mb-4">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={18} className="text-cyan-400" />
            Click Accuracy Heatmap
          </h3>
          <ClickHeatmap clickData={clickAnalysis} targetSize={targetSize} />

          {clickAnalysis.bias !== 'center' && (
            <p className="text-center text-slate-400 text-sm">
              Your clicks tend to land <span className="text-amber-400">{clickAnalysis.bias}</span> of center
            </p>
          )}
        </div>
      )}

      {/* Spatial Performance */}
      {clickData.length > 0 && (
        <div className="section-card mb-4">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={18} className="text-purple-500" />
            Spatial Performance
          </h3>
          <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
            <div className="text-center p-3 bg-slate-900/60 rounded-md">
              <div className="text-xs text-slate-500 mb-1">LEFT TARGETS</div>
              <div className={`text-lg font-semibold ${spatialAnalysis.leftBias > 0 ? 'text-red-500' : spatialAnalysis.leftBias < 0 ? 'text-blue-500' : 'text-green-500'}`}>
                {spatialAnalysis.leftBias > 0 ? `+${spatialAnalysis.leftBias}px` : `${spatialAnalysis.leftBias}px`}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {spatialAnalysis.leftBias > 5 ? 'Overshooting \u2192' : spatialAnalysis.leftBias < -5 ? '\u2190 Undershooting' : 'Centered'}
              </div>
            </div>
            <div className="text-center p-3 bg-slate-900/60 rounded-md">
              <div className="text-xs text-slate-500 mb-1">RIGHT TARGETS</div>
              <div className={`text-lg font-semibold ${spatialAnalysis.rightBias > 0 ? 'text-red-500' : spatialAnalysis.rightBias < 0 ? 'text-blue-500' : 'text-green-500'}`}>
                {spatialAnalysis.rightBias > 0 ? `+${spatialAnalysis.rightBias}px` : `${spatialAnalysis.rightBias}px`}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {spatialAnalysis.rightBias > 5 ? 'Overshooting \u2192' : spatialAnalysis.rightBias < -5 ? '\u2190 Undershooting' : 'Centered'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="section-card mb-4">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" />
            Performance Insights
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {insights.map((insight, i) => {
              const Icon = insight.icon;
              const colorClass = insight.type === 'positive' ? 'text-green-500'
                : insight.type === 'negative' ? 'text-red-500'
                : 'text-amber-400';

              return (
                <div key={i} className="bg-slate-900/60 rounded-lg p-3.5 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className={colorClass} />
                    <span className={`text-xs uppercase tracking-wide ${colorClass}`}>{insight.title}</span>
                  </div>
                  <p className="text-sm text-slate-500">{insight.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
