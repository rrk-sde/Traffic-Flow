/**
 * Traffic domain models and defaults for the simulator.
 */

export const SATURATION_FLOW_RATES = {
  straight: 1800,
  leftTurn: 1350,
  rightTurn: 1550,
  combined: 1650,
};

export const DENSITY_LEVELS = {
  low: { label: 'Low', arrivalMultiplier: 0.4, saturationPenalty: 0.95, color: '#7ae582' },
  moderate: { label: 'Moderate', arrivalMultiplier: 0.65, saturationPenalty: 0.9, color: '#ffd166' },
  high: { label: 'High', arrivalMultiplier: 0.9, saturationPenalty: 0.82, color: '#f8961e' },
  gridlock: { label: 'Gridlock', arrivalMultiplier: 1.15, saturationPenalty: 0.72, color: '#ef476f' },
};

export const LANE_TYPES = {
  straight: { label: 'Straight', icon: 'ST' },
  leftTurn: { label: 'Left Turn', icon: 'LT' },
  rightTurn: { label: 'Right Turn', icon: 'RT' },
  combined: { label: 'Combined', icon: 'CB' },
};

export const DIRECTIONS = ['north', 'south', 'east', 'west'];

export const DIRECTION_LABELS = {
  north: 'North',
  south: 'South',
  east: 'East',
  west: 'West',
};

export const DIRECTION_COLORS = {
  north: '#5bc0eb',
  south: '#ff7f50',
  east: '#70c1b3',
  west: '#f4a261',
};

export function createDefaultLane() {
  return {
    vehicleCount: 18,
    laneType: 'straight',
    density: 'moderate',
  };
}

export function createDefaultSignalTiming(cycleLength = 96) {
  return {
    north: { green: 28, yellow: 4, red: cycleLength - 32 },
    south: { green: 28, yellow: 4, red: cycleLength - 32 },
    east: { green: 20, yellow: 4, red: cycleLength - 24 },
    west: { green: 20, yellow: 4, red: cycleLength - 24 },
  };
}

export function createDefaultConfig() {
  const cycleLength = 96;

  return {
    lanes: {
      north: [
        { vehicleCount: 24, laneType: 'straight', density: 'moderate' },
        { vehicleCount: 10, laneType: 'leftTurn', density: 'moderate' },
      ],
      south: [
        { vehicleCount: 22, laneType: 'straight', density: 'moderate' },
        { vehicleCount: 12, laneType: 'leftTurn', density: 'high' },
      ],
      east: [
        { vehicleCount: 30, laneType: 'straight', density: 'high' },
        { vehicleCount: 8, laneType: 'rightTurn', density: 'moderate' },
      ],
      west: [
        { vehicleCount: 14, laneType: 'straight', density: 'low' },
      ],
    },
    signalTiming: createDefaultSignalTiming(cycleLength),
    cycleLength,
  };
}

export const PRESETS = {
  rushHour: {
    name: 'Rush Hour Peak',
    description: 'Heavy arrivals on all approaches with high residual queues',
    config: {
      lanes: {
        north: [
          { vehicleCount: 52, laneType: 'straight', density: 'high' },
          { vehicleCount: 24, laneType: 'leftTurn', density: 'high' },
        ],
        south: [
          { vehicleCount: 58, laneType: 'straight', density: 'gridlock' },
          { vehicleCount: 20, laneType: 'leftTurn', density: 'high' },
        ],
        east: [
          { vehicleCount: 45, laneType: 'straight', density: 'high' },
          { vehicleCount: 14, laneType: 'rightTurn', density: 'moderate' },
        ],
        west: [
          { vehicleCount: 40, laneType: 'straight', density: 'high' },
          { vehicleCount: 12, laneType: 'leftTurn', density: 'moderate' },
        ],
      },
      cycleLength: 120,
      signalTiming: {
        north: { green: 30, yellow: 5, red: 85 },
        south: { green: 30, yellow: 5, red: 85 },
        east: { green: 25, yellow: 5, red: 90 },
        west: { green: 25, yellow: 5, red: 90 },
      },
    },
  },
  normalDay: {
    name: 'Normal Midday',
    description: 'Balanced daytime traffic demand',
    config: createDefaultConfig(),
  },
  lightTraffic: {
    name: 'Late Night',
    description: 'Light traffic with short cycle demand',
    config: {
      lanes: {
        north: [{ vehicleCount: 6, laneType: 'straight', density: 'low' }],
        south: [{ vehicleCount: 9, laneType: 'straight', density: 'low' }],
        east: [{ vehicleCount: 4, laneType: 'combined', density: 'low' }],
        west: [{ vehicleCount: 5, laneType: 'combined', density: 'low' }],
      },
      cycleLength: 64,
      signalTiming: {
        north: { green: 18, yellow: 3, red: 43 },
        south: { green: 18, yellow: 3, red: 43 },
        east: { green: 14, yellow: 3, red: 47 },
        west: { green: 14, yellow: 3, red: 47 },
      },
    },
  },
  unevenFlow: {
    name: 'Uneven Corridor',
    description: 'North-South oversaturated while East-West remains light',
    config: {
      lanes: {
        north: [
          { vehicleCount: 58, laneType: 'straight', density: 'gridlock' },
          { vehicleCount: 28, laneType: 'leftTurn', density: 'high' },
        ],
        south: [
          { vehicleCount: 50, laneType: 'straight', density: 'high' },
          { vehicleCount: 24, laneType: 'leftTurn', density: 'high' },
        ],
        east: [{ vehicleCount: 10, laneType: 'straight', density: 'low' }],
        west: [{ vehicleCount: 8, laneType: 'combined', density: 'low' }],
      },
      cycleLength: 100,
      signalTiming: {
        north: { green: 25, yellow: 4, red: 71 },
        south: { green: 25, yellow: 4, red: 71 },
        east: { green: 21, yellow: 4, red: 75 },
        west: { green: 21, yellow: 4, red: 75 },
      },
    },
  },
};
