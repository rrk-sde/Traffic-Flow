'use client';

import { DIRECTION_COLORS, DENSITY_LEVELS } from '../engine/trafficModels';
import styles from './IntersectionView.module.css';

export default function IntersectionView({ config, result, showOptimized }) {
  const metrics = result
    ? (showOptimized ? result.after.perDirection : result.before.perDirection)
    : null;

  const timing = showOptimized && result
    ? result.config.optimized.signalTiming
    : config.signalTiming;

  const getQueueWidth = (dir) => {
    if (!metrics || !metrics[dir]) return 0;
    const maxQueue = 80;
    return Math.min(metrics[dir].queueLength / maxQueue, 1) * 100;
  };

  const getCongestionColor = (dir) => {
    if (!metrics || !metrics[dir]) return 'rgba(255,255,255,0.1)';
    const ci = metrics[dir].congestionIndex;
    if (ci < 25) return '#7ae58266';
    if (ci < 50) return '#ffd16666';
    if (ci < 75) return '#f8961e77';
    return '#ef476f88';
  };

  const getSignalColor = (dir) => {
    if (!timing || !timing[dir]) return '#666';
    const t = timing[dir];
    const total = t.green + t.yellow + t.red;
    const ratio = t.green / Math.max(total, 1);
    if (ratio > 0.34) return '#7ae582';
    if (ratio > 0.23) return '#ffd166';
    return '#ef476f';
  };

  const getVehicleCount = (dir) => {
    const lanes = config.lanes[dir] || [];
    return lanes.reduce((sum, l) => sum + l.vehicleCount, 0);
  };

  const getDensityColor = (dir) => {
    const lanes = config.lanes[dir] || [];
    if (!lanes.length) return DENSITY_LEVELS.low.color;
    const order = ['low', 'moderate', 'high', 'gridlock'];
    let maxIdx = 0;
    lanes.forEach((lane) => {
      const idx = order.indexOf(lane.density);
      if (idx > maxIdx) maxIdx = idx;
    });
    return DENSITY_LEVELS[order[maxIdx]].color;
  };

  return (
    <section className={`glass-card ${styles.container}`}>
      <div className={styles.header}>
        <h2>Intersection View</h2>
        {result && (
          <span className={`${styles.badge} ${showOptimized ? styles.badgeGreen : styles.badgeBlue}`}>
            {showOptimized ? 'Optimized' : 'Current'}
          </span>
        )}
      </div>

      <div className={styles.intersectionWrapper}>
        <svg viewBox="0 0 500 500" className={styles.svg}>
          <defs>
            <linearGradient id="roadGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1c2836" />
              <stop offset="100%" stopColor="#101824" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="180" y="0" width="140" height="500" fill="url(#roadGrad)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <rect x="0" y="180" width="500" height="140" fill="url(#roadGrad)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <rect x="180" y="180" width="140" height="140" fill="#0d1521" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

          <line x1="250" y1="0" x2="250" y2="175" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="12 8" />
          <line x1="250" y1="325" x2="250" y2="500" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="12 8" />
          <line x1="325" y1="250" x2="500" y2="250" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="12 8" />
          <line x1="0" y1="250" x2="175" y2="250" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="12 8" />

          <rect x="255" y={60} width="50" height={Math.max(getQueueWidth('north') * 1.1, 5)} fill={getCongestionColor('north')} rx="4" className={styles.queueBar} />
          <rect x="195" y={340} width="50" height={Math.max(getQueueWidth('south') * 1.1, 5)} fill={getCongestionColor('south')} rx="4" className={styles.queueBar} />
          <rect x={340} y="195" width={Math.max(getQueueWidth('east') * 1.5, 5)} height="50" fill={getCongestionColor('east')} rx="4" className={styles.queueBar} />
          <rect x={Math.max(170 - getQueueWidth('west') * 1.5, 10)} y="255" width={Math.max(getQueueWidth('west') * 1.5, 5)} height="50" fill={getCongestionColor('west')} rx="4" className={styles.queueBar} />

          <circle cx="175" cy="175" r="10" fill={getSignalColor('north')} filter="url(#glow)" className={styles.signal} />
          <circle cx="325" cy="325" r="10" fill={getSignalColor('south')} filter="url(#glow)" className={styles.signal} />
          <circle cx="325" cy="175" r="10" fill={getSignalColor('east')} filter="url(#glow)" className={styles.signal} />
          <circle cx="175" cy="325" r="10" fill={getSignalColor('west')} filter="url(#glow)" className={styles.signal} />

          <g>
            <text x="250" y="30" textAnchor="middle" fill={DIRECTION_COLORS.north} fontSize="13" fontWeight="700" fontFamily="Space Grotesk">NORTH</text>
            <text x="250" y="48" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11" fontFamily="IBM Plex Mono">{getVehicleCount('north')} vehicles</text>
            {metrics?.north && (
              <text x="250" y="65" textAnchor="middle" fill={getDensityColor('north')} fontSize="10" fontFamily="IBM Plex Mono">{metrics.north.avgDelay}s delay</text>
            )}
          </g>

          <g>
            <text x="250" y="455" textAnchor="middle" fill={DIRECTION_COLORS.south} fontSize="13" fontWeight="700" fontFamily="Space Grotesk">SOUTH</text>
            <text x="250" y="473" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11" fontFamily="IBM Plex Mono">{getVehicleCount('south')} vehicles</text>
            {metrics?.south && (
              <text x="250" y="490" textAnchor="middle" fill={getDensityColor('south')} fontSize="10" fontFamily="IBM Plex Mono">{metrics.south.avgDelay}s delay</text>
            )}
          </g>

          <g>
            <text x="430" y="245" textAnchor="middle" fill={DIRECTION_COLORS.east} fontSize="13" fontWeight="700" fontFamily="Space Grotesk">EAST</text>
            <text x="430" y="263" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11" fontFamily="IBM Plex Mono">{getVehicleCount('east')} vehicles</text>
            {metrics?.east && (
              <text x="430" y="280" textAnchor="middle" fill={getDensityColor('east')} fontSize="10" fontFamily="IBM Plex Mono">{metrics.east.avgDelay}s delay</text>
            )}
          </g>

          <g>
            <text x="70" y="245" textAnchor="middle" fill={DIRECTION_COLORS.west} fontSize="13" fontWeight="700" fontFamily="Space Grotesk">WEST</text>
            <text x="70" y="263" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11" fontFamily="IBM Plex Mono">{getVehicleCount('west')} vehicles</text>
            {metrics?.west && (
              <text x="70" y="280" textAnchor="middle" fill={getDensityColor('west')} fontSize="10" fontFamily="IBM Plex Mono">{metrics.west.avgDelay}s delay</text>
            )}
          </g>
        </svg>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#7ae582' }} /> Low</div>
        <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ffd166' }} /> Moderate</div>
        <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#f8961e' }} /> High</div>
        <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ef476f' }} /> Gridlock</div>
      </div>
    </section>
  );
}
