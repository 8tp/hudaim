import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Award, Zap } from 'lucide-react';

// Heatmap color gradient (blue -> green -> yellow -> red)
const getHeatmapColor = (intensity) => {
  if (intensity < 0.25) return `rgba(59, 130, 246, ${0.3 + intensity * 2})`; // Blue
  if (intensity < 0.5) return `rgba(34, 197, 94, ${0.4 + intensity})`; // Green
  if (intensity < 0.75) return `rgba(250, 204, 21, ${0.5 + intensity * 0.5})`; // Yellow
  return `rgba(239, 68, 68, ${0.6 + intensity * 0.4})`; // Red
};

const styles = {
  container: {
    width: '100%',
    marginTop: '1.5rem',
  },
  section: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    marginBottom: '1rem',
    border: '1px solid #334155',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'white',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  heatmapContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  heatmapWrapper: {
    position: 'relative',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '2px solid #334155',
    overflow: 'hidden',
  },
  heatmapCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    border: '2px solid white',
    zIndex: 10,
  },
  heatmapDot: {
    position: 'absolute',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
  },
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
  },
  insightCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '0.5rem',
    padding: '0.875rem',
    border: '1px solid #334155',
  },
  insightHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  insightTitle: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  insightValue: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: 'white',
  },
  insightDescription: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  positive: { color: '#22c55e' },
  negative: { color: '#ef4444' },
  neutral: { color: '#f59e0b' },
  legendContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '0.5rem',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
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

  // Calculate spread (standard deviation)
  const spread = Math.sqrt(
    offsets.reduce((sum, o) => sum + Math.pow(o.x - avgX, 2) + Math.pow(o.y - avgY, 2), 0) / offsets.length
  );

  // Determine bias direction
  let bias = 'center';
  const threshold = 5; // pixels
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

// Analyze spatial performance (overshoot vs undershoot on horizontal axis)
const analyzeSpatialPerformance = (clickData, gameWidth = 960) => {
  if (!clickData || clickData.length === 0) {
    return { leftBias: 0, rightBias: 0, overshootLeft: 0, overshootRight: 0, weakness: null };
  }

  // Calculate horizontal offset tendencies
  let leftOffsets = [];
  let rightOffsets = [];
  
  clickData.forEach(click => {
    const offsetX = click.clickX - click.targetX;
    
    // Categorize by which side of screen the target was on
    if (click.targetX < gameWidth / 2) {
      leftOffsets.push(offsetX);
    } else {
      rightOffsets.push(offsetX);
    }
  });

  // Calculate average offsets and convert to percentages
  const calcBias = (offsets) => {
    if (offsets.length === 0) return { bias: 0, overshoot: 0 };
    const avgOffset = offsets.reduce((sum, o) => sum + o, 0) / offsets.length;
    const overshoots = offsets.filter(o => Math.abs(o) > 10).length;
    const overshootRate = Math.round((overshoots / offsets.length) * 100);
    
    // Positive offset = clicking to the right (overshoot if target on left)
    // Negative offset = clicking to the left (undershoot if target on right)
    return { 
      bias: Math.round(avgOffset), 
      overshoot: overshootRate 
    };
  };

  const leftAnalysis = calcBias(leftOffsets);
  const rightAnalysis = calcBias(rightOffsets);

  // Determine weakness based on consistent bias
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

// Analyze tracking performance (overshoot vs undershoot)
const analyzeTrackingPerformance = (trackingData) => {
  if (!trackingData || trackingData.length === 0) {
    return { overshootRate: 0, undershootRate: 0, tendency: 'balanced' };
  }

  let overshoots = 0;
  let undershoots = 0;
  let onTarget = 0;

  trackingData.forEach(sample => {
    const distance = Math.sqrt(
      Math.pow(sample.cursorX - sample.targetX, 2) +
      Math.pow(sample.cursorY - sample.targetY, 2)
    );
    
    if (sample.velocity) {
      // If cursor is moving past target, it's an overshoot
      const dotProduct = sample.velocity.x * (sample.targetX - sample.cursorX) +
                        sample.velocity.y * (sample.targetY - sample.cursorY);
      if (dotProduct < 0 && distance > 30) overshoots++;
      else if (dotProduct > 0 && distance > 30) undershoots++;
      else onTarget++;
    }
  });

  const total = overshoots + undershoots + onTarget;
  const overshootRate = total > 0 ? Math.round((overshoots / total) * 100) : 0;
  const undershootRate = total > 0 ? Math.round((undershoots / total) * 100) : 0;

  let tendency = 'balanced';
  if (overshootRate > undershootRate + 15) tendency = 'overshoot';
  else if (undershootRate > overshootRate + 15) tendency = 'undershoot';

  return { overshootRate, undershootRate, tendency };
};

// Generate insights based on performance
const generateInsights = (stats, gameType, clickData, spatialData, trackingData) => {
  const insights = [];

  // Score-based insights
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

  // Accuracy insights
  if (stats.accuracy !== undefined) {
    if (stats.accuracy >= 95) {
      insights.push({ type: 'positive', icon: Target, title: 'Precision Master', text: 'Near-perfect accuracy! Incredible focus.' });
    } else if (stats.accuracy < 70) {
      insights.push({ type: 'negative', icon: AlertTriangle, title: 'Accuracy Tip', text: 'Try slowing down slightly for better accuracy.' });
    }
  }

  // Spatial weakness insights
  if (spatialData?.weakness) {
    insights.push({
      type: 'neutral',
      icon: AlertTriangle,
      title: `${spatialData.weakness.charAt(0).toUpperCase() + spatialData.weakness.slice(1)} Side Weakness`,
      text: `You tend to miss more targets on the ${spatialData.weakness}. Practice that area!`
    });
  }

  // Click accuracy insights
  if (clickData?.bias && clickData.bias !== 'center') {
    insights.push({
      type: 'neutral',
      icon: Target,
      title: 'Click Bias Detected',
      text: `Your clicks tend to land ${clickData.bias} of center. Adjust your aim slightly.`
    });
  }

  // Tracking insights
  if (trackingData?.tendency && trackingData.tendency !== 'balanced') {
    const tip = trackingData.tendency === 'overshoot'
      ? 'Try reducing your sensitivity or smoothing your movements.'
      : 'Try being more aggressive with your cursor movements.';
    insights.push({
      type: 'neutral',
      icon: Zap,
      title: `Tendency to ${trackingData.tendency.charAt(0).toUpperCase() + trackingData.tendency.slice(1)}`,
      text: tip
    });
  }

  // Speed insights for aim trainer
  if (stats.avgTime) {
    if (stats.avgTime < 200) {
      insights.push({ type: 'positive', icon: Zap, title: 'Lightning Fast!', text: 'Your reaction time is exceptional.' });
    } else if (stats.avgTime > 500) {
      insights.push({ type: 'neutral', icon: TrendingDown, title: 'Speed Tip', text: 'Try to react faster to targets for higher scores.' });
    }
  }

  return insights.slice(0, 4); // Max 4 insights
};

// Click Heatmap Component
const ClickHeatmap = ({ clickData, targetSize = 60 }) => {
  const normalizedClicks = useMemo(() => {
    if (!clickData?.offsets) return [];
    
    // Normalize offsets to fit in the heatmap (200px diameter)
    const scale = 80 / (targetSize / 2); // Scale to fit in 80px radius
    return clickData.offsets.map((offset, idx) => {
      // Use deterministic intensity based on distance from center
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
    <div style={styles.heatmapContainer}>
      <div>
        <div style={styles.heatmapWrapper}>
          {/* Target rings */}
          {[80, 60, 40, 20].map(size => (
            <div
              key={size}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${size * 2}px`,
                height: `${size * 2}px`,
                borderRadius: '50%',
                border: '1px solid rgba(100, 116, 139, 0.3)',
              }}
            />
          ))}
          
          {/* Click dots */}
          {normalizedClicks.map((click, i) => (
            <div
              key={i}
              style={{
                ...styles.heatmapDot,
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
          <div style={styles.heatmapCenter} />
          
          {/* Average offset indicator */}
          {clickData.avgOffset && (Math.abs(clickData.avgOffset.x) > 2 || Math.abs(clickData.avgOffset.y) > 2) && (
            <div
              style={{
                position: 'absolute',
                left: `${100 + clickData.avgOffset.x * (80 / (targetSize / 2))}px`,
                top: `${100 + clickData.avgOffset.y * (80 / (targetSize / 2))}px`,
                transform: 'translate(-50%, -50%)',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: '3px solid #22d3ee',
                backgroundColor: 'transparent',
              }}
              title="Average click position"
            />
          )}
        </div>
        
        <div style={styles.legendContainer}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: 'rgba(59, 130, 246, 0.7)' }} />
            <span>Sparse</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
            <span>Dense</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, border: '2px solid #22d3ee', backgroundColor: 'transparent' }} />
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
  trackingData = [],
  targetSize = 60,
  gameWidth = 960,
}) {
  const clickAnalysis = useMemo(() => analyzeClickAccuracy(clickData), [clickData]);
  const spatialAnalysis = useMemo(() => analyzeSpatialPerformance(clickData, gameWidth), [clickData, gameWidth]);
  const trackingAnalysis = useMemo(() => analyzeTrackingPerformance(trackingData), [trackingData]);
  
  const insights = useMemo(() => 
    generateInsights(stats, gameType, clickAnalysis, spatialAnalysis, trackingAnalysis),
    [stats, gameType, clickAnalysis, spatialAnalysis, trackingAnalysis]
  );

  const showHeatmap = ['aim', 'gridshot', 'precision'].includes(gameType) && clickData.length > 0;
  const showTrackingStats = ['tracking', 'switching'].includes(gameType);

  return (
    <div style={styles.container}>
      {/* Click Heatmap for static target games */}
      {showHeatmap && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <Target size={18} color="#22d3ee" />
            Click Accuracy Heatmap
          </h3>
          <ClickHeatmap clickData={clickAnalysis} targetSize={targetSize} />
          
          {clickAnalysis.bias !== 'center' && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              Your clicks tend to land <span style={{ color: '#f59e0b' }}>{clickAnalysis.bias}</span> of center
            </p>
          )}
        </div>
      )}

      {/* Spatial Performance */}
      {clickData.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <Target size={18} color="#a855f7" />
            Spatial Performance
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '0.375rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem' }}>LEFT TARGETS</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: spatialAnalysis.leftBias > 0 ? '#ef4444' : spatialAnalysis.leftBias < 0 ? '#3b82f6' : '#22c55e' }}>
                {spatialAnalysis.leftBias > 0 ? `+${spatialAnalysis.leftBias}px` : `${spatialAnalysis.leftBias}px`}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.25rem' }}>
                {spatialAnalysis.leftBias > 5 ? 'Overshooting →' : spatialAnalysis.leftBias < -5 ? '← Undershooting' : 'Centered'}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '0.375rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem' }}>RIGHT TARGETS</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: spatialAnalysis.rightBias > 0 ? '#ef4444' : spatialAnalysis.rightBias < 0 ? '#3b82f6' : '#22c55e' }}>
                {spatialAnalysis.rightBias > 0 ? `+${spatialAnalysis.rightBias}px` : `${spatialAnalysis.rightBias}px`}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.25rem' }}>
                {spatialAnalysis.rightBias > 5 ? 'Overshooting →' : spatialAnalysis.rightBias < -5 ? '← Undershooting' : 'Centered'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking/Switching specific stats */}
      {showTrackingStats && trackingData.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <Zap size={18} color="#06b6d4" />
            Movement Analysis
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>OVERSHOOT</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600', color: trackingAnalysis.overshootRate > 30 ? '#ef4444' : '#22c55e' }}>
                {trackingAnalysis.overshootRate}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>UNDERSHOOT</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600', color: trackingAnalysis.undershootRate > 30 ? '#ef4444' : '#22c55e' }}>
                {trackingAnalysis.undershootRate}%
              </div>
            </div>
          </div>
          {trackingAnalysis.tendency !== 'balanced' && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.75rem' }}>
              You tend to <span style={{ color: '#f59e0b' }}>{trackingAnalysis.tendency}</span> your targets
            </p>
          )}
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <TrendingUp size={18} color="#22c55e" />
            Performance Insights
          </h3>
          <div style={styles.insightsGrid}>
            {insights.map((insight, i) => {
              const Icon = insight.icon;
              const colorStyle = insight.type === 'positive' ? styles.positive 
                : insight.type === 'negative' ? styles.negative 
                : styles.neutral;
              
              return (
                <div key={i} style={styles.insightCard}>
                  <div style={styles.insightHeader}>
                    <Icon size={16} style={colorStyle} />
                    <span style={{ ...styles.insightTitle, ...colorStyle }}>{insight.title}</span>
                  </div>
                  <p style={styles.insightDescription}>{insight.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
