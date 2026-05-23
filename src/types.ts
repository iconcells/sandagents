export interface VisualsConfig {
  theme: 'sunshine' | 'star' | 'forest' | 'custom-warm' | 'custom-cool' | 'custom-cosmic' | 'custom-nature';
  primaryColor: string; // Hex color code
  secondaryColor: string; // Hex color code
  backgroundColor: string; // Hex color code
  particleCount: number;
  particleSpeed: number;
  visualStyle: 'canopy' | 'waves' | 'constellations' | 'nebula' | 'trees' | 'particles' | 'embers' | 'aurora' | 'fluid';
  brightnessMultiplier: number;
}

export interface SoundToggle {
  leavesRustling: boolean;
  birdsChirping: boolean;
  gentleWater: boolean;
  softWind: boolean;
  fireCrackling: boolean;
  binauralBeats: boolean;
}

export interface AudioConfig {
  binauralEnabled: boolean;
  carrierFreq: number; // e.g. 100 - 250 Hz for carrier
  beatFreq: number; // e.g. 4.0 - 12.0 Hz for Theta/Alpha waves
  musicSynthType: 'acoustic-guitar' | 'space-synth' | 'flute' | 'warm-pad' | 'crystal-chime' | 'soft-organ';
  volume: number; // 0 - 1
  natureSounds: SoundToggle;
  eqFilterCutoff: number; // Low pass filter cutoff frequency (100 - 5000)
}

export interface EnvironmentConfig {
  keyPhrase: string;
  visuals: VisualsConfig;
  audio: AudioConfig;
  narrativeText: string;
}

export interface WatchBiofeedback {
  connected: boolean;
  deviceType: 'smartwatch' | 'simulated';
  heartRateBpm: number;
  breathingRateBpm: number;
  hrvMs: number; // Heart Rate Variability in ms
  currentPhase: 'inhale' | 'hold' | 'exhale';
  phaseProgress: number; // 0 - 1
}
