/**
 * Simulation engine for queue modeling and timing optimization.
 */

import { DENSITY_LEVELS, DIRECTIONS, SATURATION_FLOW_RATES } from './trafficModels';

const HISTORY_KEY = 'trafficSimHistory';
const DEFAULT_CYCLE = 90;
const SIMULATION_HORIZON_CYCLES = 12;
const MIN_GREEN = 8;
const MIN_YELLOW = 3;
const MAX_CYCLE = 170;
const MIN_CYCLE = 48;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, digits = 1) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config));
}

function getLaneSaturation(lane) {
  const base = SATURATION_FLOW_RATES[lane.laneType] || SATURATION_FLOW_RATES.straight;
  const density = DENSITY_LEVELS[lane.density] || DENSITY_LEVELS.moderate;
  return base * density.saturationPenalty;
}

function getLaneArrivalRate(lane) {
  const base = SATURATION_FLOW_RATES[lane.laneType] || SATURATION_FLOW_RATES.straight;
  const density = DENSITY_LEVELS[lane.density] || DENSITY_LEVELS.moderate;
  return base * density.arrivalMultiplier * 0.34;
}

function normalizeDirectionTiming(rawTiming, cycleLength) {
  const green = clamp(Number(rawTiming?.green) || 0, MIN_GREEN, cycleLength - (MIN_YELLOW + 1));
  const yellow = clamp(Number(rawTiming?.yellow) || MIN_YELLOW, MIN_YELLOW, 8);
  const red = Math.max(cycleLength - green - yellow, 1);
  return { green, yellow, red };
}

function normalizeConfig(input) {
  const draft = cloneConfig(input || {});
  const cycleLength = clamp(Number(draft.cycleLength) || DEFAULT_CYCLE, MIN_CYCLE, MAX_CYCLE);

  const lanes = {};
  const signalTiming = {};

  DIRECTIONS.forEach((dir) => {
    const rawLanes = Array.isArray(draft.lanes?.[dir]) && draft.lanes[dir].length
      ? draft.lanes[dir]
      : [{ vehicleCount: 0, laneType: 'straight', density: 'low' }];

    lanes[dir] = rawLanes.slice(0, 4).map((lane) => ({
      vehicleCount: clamp(Number(lane.vehicleCount) || 0, 0, 250),
      laneType: SATURATION_FLOW_RATES[lane.laneType] ? lane.laneType : 'straight',
      density: DENSITY_LEVELS[lane.density] ? lane.density : 'moderate',
    }));

    signalTiming[dir] = normalizeDirectionTiming(draft.signalTiming?.[dir], cycleLength);
  });

  return { lanes, signalTiming, cycleLength };
}

function getDirectionPressure(lanes) {
  return lanes.reduce((sum, lane) => {
    const arrival = getLaneArrivalRate(lane);
    return sum + arrival + lane.vehicleCount * 15;
  }, 0);
}

function allocateLaneShares(lanes, directionGreen, cycleLength) {
  if (!lanes.length) return [];

  const lanePressures = lanes.map((lane) => getLaneArrivalRate(lane) + lane.vehicleCount * 18);
  const totalPressure = lanePressures.reduce((sum, value) => sum + value, 0);

  return lanes.map((lane, index) => {
    const share = totalPressure > 0 ? lanePressures[index] / totalPressure : 1 / lanes.length;
    const greenSeconds = directionGreen * share;
    const laneSaturation = getLaneSaturation(lane);
    const servicePerCycle = (laneSaturation * greenSeconds * 0.92) / 3600;
    const arrivalPerCycle = (getLaneArrivalRate(lane) / 3600) * cycleLength;

    return {
      share,
      greenSeconds,
      servicePerCycle,
      arrivalPerCycle,
      laneSaturation,
    };
  });
}

function simulateLane(lane, laneTiming, cycleLength, horizonCycles) {
  let queue = lane.vehicleCount;
  let totalWaitVehicleSeconds = 0;
  let totalDeparted = 0;
  let queueAccumulator = 0;
  let maxQueue = queue;

  for (let tick = 0; tick < horizonCycles; tick += 1) {
    const queueStart = queue;
    const entering = laneTiming.arrivalPerCycle;
    const demandThisCycle = queueStart + entering;
    const discharged = Math.min(demandThisCycle, laneTiming.servicePerCycle);

    queue = Math.max(demandThisCycle - discharged, 0);
    totalDeparted += discharged;
    maxQueue = Math.max(maxQueue, queue);

    // Trapezoid approximation of queue area for average waiting time.
    totalWaitVehicleSeconds += ((queueStart + queue) / 2) * cycleLength;
    queueAccumulator += queue;
  }

  const avgDelay = totalDeparted > 0 ? totalWaitVehicleSeconds / totalDeparted : 0;
  const avgQueue = queueAccumulator / horizonCycles;
  const demandRate = laneTiming.arrivalPerCycle * (3600 / cycleLength);
  const capacityRate = laneTiming.servicePerCycle * (3600 / cycleLength);
  const volumeToCapacity = capacityRate > 0 ? demandRate / capacityRate : 1.5;

  return {
    avgDelay,
    avgQueue,
    maxQueue,
    throughputPerHour: totalDeparted * (3600 / (cycleLength * horizonCycles)),
    demandRate,
    capacityRate,
    volumeToCapacity,
    queueEnd: queue,
    waitVehicleSeconds: totalWaitVehicleSeconds,
  };
}

function coefficientOfVariation(values) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function simulateDirection(lanes, timing, cycleLength) {
  const laneTimings = allocateLaneShares(lanes, timing.green, cycleLength);

  const laneMetrics = lanes.map((lane, index) => {
    const laneSimulation = simulateLane(lane, laneTimings[index], cycleLength, SIMULATION_HORIZON_CYCLES);

    return {
      laneType: lane.laneType,
      density: lane.density,
      initialVehicles: lane.vehicleCount,
      greenShare: round(laneTimings[index].share * 100, 1),
      avgDelay: round(laneSimulation.avgDelay, 1),
      avgQueue: round(laneSimulation.avgQueue, 1),
      maxQueue: round(laneSimulation.maxQueue, 1),
      throughput: round(laneSimulation.throughputPerHour, 1),
      demandRate: round(laneSimulation.demandRate, 1),
      volumeToCapacity: round(laneSimulation.volumeToCapacity, 2),
      queueEnd: round(laneSimulation.queueEnd, 1),
      waitVehicleSeconds: laneSimulation.waitVehicleSeconds,
    };
  });

  const totalDemandRate = laneMetrics.reduce((sum, lane) => sum + lane.demandRate, 0);
  const totalThroughput = laneMetrics.reduce((sum, lane) => sum + lane.throughput, 0);
  const totalInitialVehicles = laneMetrics.reduce((sum, lane) => sum + lane.initialVehicles, 0);
  const totalQueueEnd = laneMetrics.reduce((sum, lane) => sum + lane.queueEnd, 0);
  const totalWaitVehicleSeconds = laneMetrics.reduce((sum, lane) => sum + lane.waitVehicleSeconds, 0);
  const avgDelay = totalThroughput > 0 ? totalWaitVehicleSeconds / (totalThroughput * (SIMULATION_HORIZON_CYCLES * cycleLength / 3600)) : 0;
  const meanVolumeToCapacity = laneMetrics.length
    ? laneMetrics.reduce((sum, lane) => sum + lane.volumeToCapacity, 0) / laneMetrics.length
    : 0;

  const laneQueueCv = coefficientOfVariation(laneMetrics.map((lane) => lane.avgQueue));
  const laneVcCv = coefficientOfVariation(laneMetrics.map((lane) => lane.volumeToCapacity));
  const loadBalanceScore = clamp(Math.round(100 - ((laneQueueCv * 50) + (laneVcCv * 50))), 0, 100);

  const queuePressure = totalInitialVehicles > 0 ? totalQueueEnd / totalInitialVehicles : 0;
  const congestionIndex = clamp(
    Math.round(
      (Math.min(meanVolumeToCapacity, 1.8) / 1.8) * 50 +
      (Math.min(avgDelay, 180) / 180) * 30 +
      Math.min(queuePressure, 2) * 20
    ),
    0,
    100
  );

  return {
    avgDelay: round(avgDelay, 1),
    queueLength: Math.round(totalQueueEnd),
    throughput: Math.round(totalThroughput),
    congestionIndex,
    loadBalanceScore,
    totalVehicles: totalInitialVehicles,
    demandRate: Math.round(totalDemandRate),
    waitVehicleSeconds: Math.round(totalWaitVehicleSeconds),
    laneBreakdown: laneMetrics,
    timing,
    cycleLength,
  };
}

function optimizeTiming(config) {
  const demands = {};
  const criticalRatios = {};

  DIRECTIONS.forEach((dir) => {
    const dirLanes = config.lanes[dir] || [];
    const demand = getDirectionPressure(dirLanes);
    const baseCapacity = dirLanes.reduce((sum, lane) => sum + getLaneSaturation(lane), 0);

    demands[dir] = demand;
    criticalRatios[dir] = baseCapacity > 0 ? demand / (baseCapacity * 1.05) : 0;
  });

  const totalCriticalRatio = DIRECTIONS.reduce((sum, dir) => sum + criticalRatios[dir], 0);
  const avgYellow = DIRECTIONS.reduce((sum, dir) => sum + (config.signalTiming[dir]?.yellow || MIN_YELLOW), 0) / DIRECTIONS.length;
  const lostPerPhase = avgYellow + 1;
  const totalLostTime = lostPerPhase * DIRECTIONS.length;

  const proposedCycle = (1.5 * totalLostTime + 5) / Math.max(1 - Math.min(totalCriticalRatio, 0.92), 0.08);
  const cycleLength = clamp(Math.round(proposedCycle), MIN_CYCLE, MAX_CYCLE);

  const usableGreen = Math.max(cycleLength - Math.round(totalLostTime), DIRECTIONS.length * MIN_GREEN);
  const totalDemand = DIRECTIONS.reduce((sum, dir) => sum + demands[dir], 0);

  const timing = {};
  let allocatedGreen = 0;

  DIRECTIONS.forEach((dir, index) => {
    const baseWeight = totalDemand > 0 ? demands[dir] / totalDemand : 1 / DIRECTIONS.length;
    const proposedGreen = Math.max(Math.round(usableGreen * baseWeight), MIN_GREEN);

    const remainingDirections = DIRECTIONS.length - index - 1;
    const maxCurrent = usableGreen - allocatedGreen - remainingDirections * MIN_GREEN;
    const green = clamp(proposedGreen, MIN_GREEN, Math.max(maxCurrent, MIN_GREEN));

    const yellow = clamp(Math.round(config.signalTiming[dir]?.yellow || MIN_YELLOW), MIN_YELLOW, 8);
    const red = Math.max(cycleLength - green - yellow, 1);

    timing[dir] = { green, yellow, red };
    allocatedGreen += green;
  });

  return {
    cycleLength,
    timing,
    diagnostics: {
      totalCriticalRatio: round(totalCriticalRatio, 2),
      usableGreen,
      lostTime: round(totalLostTime, 1),
      directionalDemand: DIRECTIONS.reduce((acc, dir) => {
        acc[dir] = Math.round(demands[dir]);
        return acc;
      }, {}),
    },
  };
}

function aggregate(metrics) {
  const dirs = Object.keys(metrics);
  if (!dirs.length) {
    return {
      avgDelay: 0,
      totalQueue: 0,
      totalThroughput: 0,
      avgCongestion: 0,
      avgLoadBalance: 0,
      totalWaitVehicleSeconds: 0,
      demandRate: 0,
    };
  }

  const totalVehicles = dirs.reduce((sum, dir) => sum + metrics[dir].totalVehicles, 0);
  const weightedDelay = dirs.reduce((sum, dir) => sum + metrics[dir].avgDelay * metrics[dir].totalVehicles, 0);

  return {
    avgDelay: round(weightedDelay / Math.max(totalVehicles, 1), 1),
    totalQueue: Math.round(dirs.reduce((sum, dir) => sum + metrics[dir].queueLength, 0)),
    totalThroughput: Math.round(dirs.reduce((sum, dir) => sum + metrics[dir].throughput, 0)),
    avgCongestion: Math.round(dirs.reduce((sum, dir) => sum + metrics[dir].congestionIndex, 0) / dirs.length),
    avgLoadBalance: Math.round(dirs.reduce((sum, dir) => sum + metrics[dir].loadBalanceScore, 0) / dirs.length),
    totalWaitVehicleSeconds: Math.round(dirs.reduce((sum, dir) => sum + metrics[dir].waitVehicleSeconds, 0)),
    demandRate: Math.round(dirs.reduce((sum, dir) => sum + metrics[dir].demandRate, 0)),
  };
}

function pctChange(beforeValue, afterValue, invert = false) {
  if (!beforeValue) return 0;
  const ratio = afterValue / beforeValue;
  const raw = invert ? (1 - ratio) * 100 : (ratio - 1) * 100;
  return Math.round(raw);
}

export function runSimulation(rawConfig) {
  const config = normalizeConfig(rawConfig);

  const beforeMetrics = {};
  DIRECTIONS.forEach((dir) => {
    beforeMetrics[dir] = simulateDirection(config.lanes[dir], config.signalTiming[dir], config.cycleLength);
  });

  const optimized = optimizeTiming(config);

  const afterMetrics = {};
  DIRECTIONS.forEach((dir) => {
    afterMetrics[dir] = simulateDirection(config.lanes[dir], optimized.timing[dir], optimized.cycleLength);
  });

  const beforeAgg = aggregate(beforeMetrics);
  const afterAgg = aggregate(afterMetrics);

  const improvements = {
    delayReduction: pctChange(beforeAgg.avgDelay, afterAgg.avgDelay, true),
    queueReduction: pctChange(beforeAgg.totalQueue, afterAgg.totalQueue, true),
    throughputIncrease: pctChange(beforeAgg.totalThroughput, afterAgg.totalThroughput, false),
    congestionReduction: pctChange(beforeAgg.avgCongestion, afterAgg.avgCongestion, true),
    waitTimeReduction: pctChange(beforeAgg.totalWaitVehicleSeconds, afterAgg.totalWaitVehicleSeconds, true),
    loadBalanceImprovement: pctChange(beforeAgg.avgLoadBalance, afterAgg.avgLoadBalance, false),
  };

  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    config: {
      lanes: config.lanes,
      original: { signalTiming: config.signalTiming, cycleLength: config.cycleLength },
      optimized: { signalTiming: optimized.timing, cycleLength: optimized.cycleLength },
    },
    before: { perDirection: beforeMetrics, aggregate: beforeAgg },
    after: { perDirection: afterMetrics, aggregate: afterAgg },
    improvements,
    optimization: optimized.diagnostics,
  };
}

export function getHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveResult(result) {
  if (typeof window === 'undefined') return;

  const history = getHistory();
  history.unshift(result);

  if (history.length > 20) {
    history.length = 20;
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}
