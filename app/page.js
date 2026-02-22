'use client';

import { useCallback, useState } from 'react';
import ComparisonDashboard from './components/ComparisonDashboard';
import ConfigPanel from './components/ConfigPanel';
import IntersectionView from './components/IntersectionView';
import ResultsHistory from './components/ResultsHistory';
import { runSimulation, saveResult } from './engine/simulationEngine';
import { createDefaultConfig } from './engine/trafficModels';
import styles from './page.module.css';

export default function Home() {
  const [config, setConfig] = useState(createDefaultConfig());
  const [result, setResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showOptimized, setShowOptimized] = useState(false);

  const handleSimulate = useCallback(() => {
    setIsSimulating(true);

    setTimeout(() => {
      const simResult = runSimulation(config);
      setResult(simResult);
      saveResult(simResult);
      setShowOptimized(false);
      setIsSimulating(false);
    }, 350);
  }, [config]);

  const handleLoadResult = useCallback((loadedResult) => {
    setResult(loadedResult);
    setShowOptimized(false);
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Traffic Flow Optimization Simulator</p>
          <h1>Urban Signal Control Command Center</h1>
        </div>
        <div className={styles.headerMeta}>
          <span>Queue modeling</span>
          <span>Dynamic timing optimization</span>
          <span>Load balancing</span>
        </div>
      </header>

      <main className={styles.main}>
        <aside className={styles.sidebar}>
          <ConfigPanel
            config={config}
            onChange={setConfig}
            onSimulate={handleSimulate}
            isSimulating={isSimulating}
          />
          <ResultsHistory currentResultId={result?.id} onLoadResult={handleLoadResult} />
        </aside>

        <section className={styles.workspace}>
          <IntersectionView config={config} result={result} showOptimized={showOptimized} />

          {result ? (
            <>
              <div className={styles.toggleRow}>
                <button
                  type="button"
                  className={`btn ${showOptimized ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={() => setShowOptimized(false)}
                >
                  Show Current Timing
                </button>
                <button
                  type="button"
                  className={`btn ${showOptimized ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setShowOptimized(true)}
                >
                  Show Optimized Timing
                </button>
              </div>

              <ComparisonDashboard result={result} />
            </>
          ) : (
            <section className={`glass-card ${styles.empty}`}>
              <h2>Configure lanes and run simulation</h2>
              <p>
                The simulator models queue growth per cycle, optimizes green splits,
                and estimates congestion and wait-time reduction before vs after.
              </p>
              <ul>
                <li>Vehicles per lane + lane type + density</li>
                <li>Current cycle and per-direction timing</li>
                <li>Queue, delay, throughput and load balancing output</li>
                <li>Saved results for side-by-side run comparison</li>
              </ul>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
