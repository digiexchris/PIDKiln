/**
 * Simulator configuration
 * Loads from config.json and provides runtime access to settings
 */

import fs from 'fs';
import path from 'path';

export interface TimeConfig {
  timeScale: number;      // Simulation speed multiplier (1.0 = real-time)
  tickIntervalMs: number; // Real-world ms between simulation ticks
}

export interface ThermalConfig {
  heaterPower: number;        // Max heating rate at full power (°C/second simulated)
  coolingCoefficient: number; // Newton's cooling coefficient (1/second)
  thermalMass: number;        // Thermal inertia (higher = slower response)
  ambientTemp: number;        // Environment temperature (°C)
  ambientVariation: number;   // Random variation in ambient temp (°C)
  caseHeatTransfer: number;   // How much kiln temp affects case temp (fraction)
  caseBaseTemp: number;       // Base case temperature (°C)
}

export interface SimulatorConfig {
  time: TimeConfig;
  thermal: ThermalConfig;
}

const DEFAULT_CONFIG: SimulatorConfig = {
  time: {
    timeScale: 1.0,
    tickIntervalMs: 1000,
  },
  thermal: {
    heaterPower: 0.5,
    coolingCoefficient: 0.0001,
    thermalMass: 100,
    ambientTemp: 20.0,
    ambientVariation: 0.5,
    caseHeatTransfer: 0.03,
    caseBaseTemp: 25.0,
  },
};

let config: SimulatorConfig = { ...DEFAULT_CONFIG };

// Runtime-adjustable time scale (can be changed via API)
let runtimeTimeScale: number | null = null;

/**
 * Load configuration from file
 */
export function loadConfig(): SimulatorConfig {
  const configPath = path.join(__dirname, '..', 'config.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const fileConfig = JSON.parse(fileContent) as Partial<SimulatorConfig>;
      
      // Merge with defaults
      config = {
        time: { ...DEFAULT_CONFIG.time, ...fileConfig.time },
        thermal: { ...DEFAULT_CONFIG.thermal, ...fileConfig.thermal },
      };
      
      console.log('Loaded simulator config from', configPath);
    } else {
      console.log('No config.json found, using defaults');
      config = { ...DEFAULT_CONFIG };
    }
  } catch (err) {
    console.error('Error loading config, using defaults:', err);
    config = { ...DEFAULT_CONFIG };
  }
  
  // Reset runtime override when config is reloaded
  runtimeTimeScale = null;
  
  return config;
}

/**
 * Get current configuration
 */
export function getConfig(): SimulatorConfig {
  return config;
}

/**
 * Get current time scale (runtime override or config value)
 */
export function getTimeScale(): number {
  return runtimeTimeScale ?? config.time.timeScale;
}

/**
 * Set runtime time scale (overrides config until restart or reload)
 */
export function setTimeScale(scale: number): void {
  // Clamp to valid range
  runtimeTimeScale = Math.max(1.0, Math.min(100.0, scale));
  console.log(`Time scale set to ${runtimeTimeScale}x`);
}

/**
 * Get thermal config
 */
export function getThermalConfig(): ThermalConfig {
  return config.thermal;
}

/**
 * Get tick interval in real milliseconds
 */
export function getTickIntervalMs(): number {
  return config.time.tickIntervalMs;
}

// Load config on module initialization
loadConfig();

/**
 * Watch config file for changes and auto-reload
 */
function watchConfig(): void {
  const configPath = path.join(__dirname, '..', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('Config file not found, skipping watch');
    return;
  }
  
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  
  fs.watch(configPath, (eventType) => {
    if (eventType === 'change') {
      // Debounce to avoid multiple reloads from editors that write multiple times
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log('Config file changed, reloading...');
        loadConfig();
      }, 100);
    }
  });
  
  console.log('Watching config.json for changes');
}

// Start watching config file
watchConfig();

