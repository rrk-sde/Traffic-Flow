'use client';

import { useMemo, useState } from 'react';
import {
  DIRECTIONS,
  DIRECTION_COLORS,
  DIRECTION_LABELS,
  DENSITY_LEVELS,
  LANE_TYPES,
  PRESETS,
  createDefaultLane,
} from '../engine/trafficModels';
import styles from './ConfigPanel.module.css';

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export default function ConfigPanel({ config, onChange, onSimulate, isSimulating }) {
  const [expandedDirection, setExpandedDirection] = useState('north');

  const cycleMismatch = useMemo(() => {
    return DIRECTIONS.some((dir) => {
      const timing = config.signalTiming[dir];
      return (timing.green + timing.yellow + timing.red) !== config.cycleLength;
    });
  }, [config]);

  const activePresetKey = useMemo(() => {
    const current = stableStringify(config);
    const matched = Object.entries(PRESETS).find(([, preset]) => stableStringify(preset.config) === current);
    return matched?.[0] || null;
  }, [config]);

  const patchConfig = (updateFn) => {
    const next = cloneConfig(config);
    updateFn(next);
    onChange(next);
  };

  const updateCycleLength = (value) => {
    const nextCycle = Math.min(Math.max(safeNumber(value, 90), 48), 170);

    patchConfig((draft) => {
      draft.cycleLength = nextCycle;

      DIRECTIONS.forEach((dir) => {
        const timing = draft.signalTiming[dir];
        timing.green = Math.max(Math.min(timing.green, nextCycle - timing.yellow - 1), 8);
        timing.red = nextCycle - timing.green - timing.yellow;
      });
    });
  };

  const updateTiming = (direction, field, value) => {
    const numeric = safeNumber(value, 0);

    patchConfig((draft) => {
      const timing = draft.signalTiming[direction];
      if (field === 'green') timing.green = Math.min(Math.max(numeric, 8), draft.cycleLength - timing.yellow - 1);
      if (field === 'yellow') timing.yellow = Math.min(Math.max(numeric, 3), 8);
      if (field === 'red') timing.red = Math.min(Math.max(numeric, 1), draft.cycleLength - 1);

      if (field === 'red') {
        timing.green = Math.max(Math.min(draft.cycleLength - timing.yellow - timing.red, draft.cycleLength - timing.yellow - 1), 8);
      }

      timing.red = draft.cycleLength - timing.green - timing.yellow;
    });
  };

  const updateLane = (direction, laneIndex, field, value) => {
    patchConfig((draft) => {
      const lane = draft.lanes[direction][laneIndex];
      if (field === 'vehicleCount') lane[field] = Math.min(Math.max(safeNumber(value, 0), 0), 250);
      else lane[field] = value;
    });
  };

  const addLane = (direction) => {
    patchConfig((draft) => {
      if (draft.lanes[direction].length < 4) {
        draft.lanes[direction].push(createDefaultLane());
      }
    });
  };

  const removeLane = (direction, laneIndex) => {
    patchConfig((draft) => {
      if (draft.lanes[direction].length > 1) {
        draft.lanes[direction].splice(laneIndex, 1);
      }
    });
  };

  const loadPreset = (key) => {
    const preset = PRESETS[key];
    if (!preset) return;
    onChange(cloneConfig(preset.config));
  };

  return (
    <section className={`glass-card ${styles.panel}`}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Scenario Builder</p>
          <h2>Traffic Inputs</h2>
        </div>
        <span className={`${styles.status} ${cycleMismatch ? styles.warn : styles.ok}`}>
          {cycleMismatch ? 'Cycle mismatch' : 'Timing consistent'}
        </span>
      </div>

      <div className={styles.block}>
        <div className={styles.presetHeader}>
          <label className="form-label">Quick Presets</label>
          <span className={styles.presetStatus}>
            {activePresetKey ? `Selected: ${PRESETS[activePresetKey].name}` : 'Selected: Custom'}
          </span>
        </div>
        <div className={styles.presetGrid}>
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              type="button"
              key={key}
              className={`btn btn-ghost btn-sm ${styles.presetBtn} ${activePresetKey === key ? styles.presetBtnActive : ''}`}
              onClick={() => loadPreset(key)}
              title={preset.description}
              aria-pressed={activePresetKey === key}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.block}>
        <label className="form-label">Signal Cycle Length (seconds)</label>
        <input
          type="number"
          className="form-input"
          value={config.cycleLength}
          min={48}
          max={170}
          onChange={(event) => updateCycleLength(event.target.value)}
        />
      </div>

      <div className={styles.tabs}>
        {DIRECTIONS.map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => setExpandedDirection(dir)}
            className={`${styles.tab} ${expandedDirection === dir ? styles.tabActive : ''}`}
            style={{ '--dir-color': DIRECTION_COLORS[dir] }}
          >
            <span className={styles.tabDot} />
            {DIRECTION_LABELS[dir]}
          </button>
        ))}
      </div>

      {DIRECTIONS.map((dir) => {
        if (dir !== expandedDirection) return null;

        return (
          <div className={styles.directionPanel} key={dir}>
            <div className={styles.subHeader}>
              <h3 style={{ color: DIRECTION_COLORS[dir] }}>{DIRECTION_LABELS[dir]} Signal</h3>
            </div>

            <div className={styles.timingGrid}>
              <div className="form-group">
                <label className="form-label">Green (s)</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.signalTiming[dir].green}
                  onChange={(event) => updateTiming(dir, 'green', event.target.value)}
                  min={8}
                  max={130}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Yellow (s)</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.signalTiming[dir].yellow}
                  onChange={(event) => updateTiming(dir, 'yellow', event.target.value)}
                  min={3}
                  max={8}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Red (derived)</label>
                <input type="number" className="form-input" value={config.signalTiming[dir].red} readOnly />
              </div>
            </div>

            <div className={styles.laneHeader}>
              <h3 style={{ color: DIRECTION_COLORS[dir] }}>Lane Inputs</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addLane(dir)}>
                Add Lane
              </button>
            </div>

            <div className={styles.laneList}>
              {config.lanes[dir].map((lane, index) => (
                <div className={styles.laneCard} key={`${dir}-${index}`}>
                  <div className={styles.laneTopRow}>
                    <p>Lane {index + 1}</p>
                    {config.lanes[dir].length > 1 && (
                      <button
                        type="button"
                        className={styles.removeLane}
                        onClick={() => removeLane(dir, index)}
                        aria-label="Remove lane"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className={styles.laneGrid}>
                    <div className="form-group">
                      <label className="form-label">Vehicles</label>
                      <input
                        type="number"
                        className="form-input"
                        value={lane.vehicleCount}
                        min={0}
                        max={250}
                        onChange={(event) => updateLane(dir, index, 'vehicleCount', event.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Lane Type</label>
                      <select
                        className="form-select"
                        value={lane.laneType}
                        onChange={(event) => updateLane(dir, index, 'laneType', event.target.value)}
                      >
                        {Object.entries(LANE_TYPES).map(([key, laneType]) => (
                          <option key={key} value={key}>{laneType.icon} | {laneType.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Density</label>
                      <select
                        className="form-select"
                        value={lane.density}
                        onChange={(event) => updateLane(dir, index, 'density', event.target.value)}
                      >
                        {Object.entries(DENSITY_LEVELS).map(([key, level]) => (
                          <option key={key} value={key}>{level.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button type="button" className={`btn btn-primary ${styles.runButton}`} onClick={onSimulate} disabled={isSimulating}>
        {isSimulating ? 'Running simulation...' : 'Run Optimization'}
      </button>
    </section>
  );
}
