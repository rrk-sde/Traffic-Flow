'use client';

import { DIRECTION_COLORS, DIRECTION_LABELS, DIRECTIONS } from '../engine/trafficModels';
import styles from './ComparisonDashboard.module.css';

function ImprovementChip({ label, value, positiveWhenUp = false }) {
  const isPositive = positiveWhenUp ? value >= 0 : value <= 0;
  const abs = Math.abs(value);

  return (
    <div className={`${styles.chip} ${isPositive ? styles.good : styles.bad}`}>
      <span>{label}</span>
      <strong>{isPositive ? '+' : '-'}{abs}%</strong>
    </div>
  );
}

function MetricTile({ label, before, after, unit, betterWhenLower = true }) {
  const delta = before === 0 ? 0 : ((after - before) / before) * 100;
  const improved = betterWhenLower ? delta <= 0 : delta >= 0;

  return (
    <article className={styles.metricTile}>
      <p>{label}</p>
      <div className={styles.metricValues}>
        <span>{before}{unit}</span>
        <span className={styles.arrow}>to</span>
        <span className={improved ? styles.goodText : styles.badText}>{after}{unit}</span>
      </div>
      <small className={improved ? styles.goodText : styles.badText}>
        {Math.abs(Math.round(delta))}% {improved ? 'improvement' : 'regression'}
      </small>
    </article>
  );
}

export default function ComparisonDashboard({ result }) {
  if (!result) return null;

  const before = result.before.aggregate;
  const after = result.after.aggregate;

  return (
    <section className={`glass-card ${styles.container}`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Optimization Output</p>
          <h2>Before vs After Metrics</h2>
        </div>
        <div className={styles.cycleTag}>
          Cycle {result.config.original.cycleLength}s to {result.config.optimized.cycleLength}s
        </div>
      </div>

      <div className={styles.chips}>
        <ImprovementChip label="Wait time" value={result.improvements.waitTimeReduction} />
        <ImprovementChip label="Avg delay" value={result.improvements.delayReduction} />
        <ImprovementChip label="Queue" value={result.improvements.queueReduction} />
        <ImprovementChip label="Throughput" value={result.improvements.throughputIncrease} positiveWhenUp />
        <ImprovementChip label="Congestion" value={result.improvements.congestionReduction} />
        <ImprovementChip label="Load balance" value={result.improvements.loadBalanceImprovement} positiveWhenUp />
      </div>

      <div className={styles.metricsGrid}>
        <MetricTile label="Average delay" before={before.avgDelay} after={after.avgDelay} unit="s" />
        <MetricTile label="Total queue" before={before.totalQueue} after={after.totalQueue} unit=" veh" />
        <MetricTile label="Throughput" before={before.totalThroughput} after={after.totalThroughput} unit=" vph" betterWhenLower={false} />
        <MetricTile label="Congestion index" before={before.avgCongestion} after={after.avgCongestion} unit="" />
        <MetricTile label="Load balance score" before={before.avgLoadBalance} after={after.avgLoadBalance} unit="" betterWhenLower={false} />
      </div>

      <div className={styles.section}>
        <h3>Per-direction summary</h3>
        <div className={styles.table}>
          <div className={styles.headRow}>
            <span>Direction</span>
            <span>Delay</span>
            <span>Queue</span>
            <span>Load Balance</span>
          </div>

          {DIRECTIONS.map((dir) => {
            const b = result.before.perDirection[dir];
            const a = result.after.perDirection[dir];

            if (!b || !a) return null;

            return (
              <div className={styles.bodyRow} key={dir}>
                <span style={{ color: DIRECTION_COLORS[dir] }}>{DIRECTION_LABELS[dir]}</span>
                <span>{b.avgDelay}s to <strong>{a.avgDelay}s</strong></span>
                <span>{b.queueLength} to <strong>{a.queueLength}</strong></span>
                <span>{b.loadBalanceScore} to <strong>{a.loadBalanceScore}</strong></span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
