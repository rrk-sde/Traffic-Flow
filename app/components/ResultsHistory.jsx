'use client';

import { useEffect, useState } from 'react';
import { clearHistory, getHistory } from '../engine/simulationEngine';
import styles from './ResultsHistory.module.css';

function formatStamp(iso) {
  const date = new Date(iso);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ResultsHistory({ onLoadResult, currentResultId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(getHistory());
  }, [currentResultId]);

  if (!items.length) return null;

  const onClear = () => {
    clearHistory();
    setItems([]);
  };

  return (
    <section className={`glass-card ${styles.container}`}>
      <div className={styles.header}>
        <h2>Saved Runs</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>Clear</button>
      </div>

      <div className={styles.list}>
        {items.map((item) => {
          const isActive = currentResultId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onLoadResult(item)}
              className={`${styles.item} ${isActive ? styles.active : ''}`}
            >
              <div className={styles.rowTop}>
                <span>{formatStamp(item.timestamp)}</span>
                <strong>{item.improvements.waitTimeReduction}%</strong>
              </div>
              <div className={styles.rowMeta}>
                Delay {item.before.aggregate.avgDelay}s to {item.after.aggregate.avgDelay}s
              </div>
              <div className={styles.rowMeta}>
                Queue {item.before.aggregate.totalQueue} to {item.after.aggregate.totalQueue}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
