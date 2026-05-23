import { AudioConfig, WatchBiofeedback } from '../types';

export class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private mainFilter: BiquadFilterNode | null = null;

  // Binaural Beat Oscillators
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private leftGain: GainNode | null = null;
  private rightGain: GainNode | null = null;

  // Soundscapes Node refs
  private noiseBuffer: AudioBuffer | null = null;
  
  // Nature Sound Generators
  private windNode: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  private rustleNode: AudioBufferSourceNode | null = null;
  private rustleFilter: BiquadFilterNode | null = null;
  private rustleGain: GainNode | null = null;

  private waterNode: AudioBufferSourceNode | null = null;
  private waterFilter: BiquadFilterNode | null = null;
  private waterGain: GainNode | null = null;
  private waterInterval: any = null;

  private fireGain: GainNode | null = null;
  private fireInterval: any = null;

  private birdGain: GainNode | null = null;
  private birdInterval: any = null;

  // Ambient synth loop melody generator
  private melodyTimeout: any = null;
  private lastBpm: number = 68;
  private lastPhase: string = 'inhale';
  private currentConfig: AudioConfig | null = null;
  
  public isRunning: boolean = false;

  constructor() {
    // Initialized lazily on user interaction to comply with browser autoplay policies
  }

  public init() {
    if (this.ctx) return;
    
    // Create Audio Context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.error("Web Audio API is not supported in this browser");
      return;
    }

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Filter to simulate warmth and breathing
    this.mainFilter = this.ctx.createBiquadFilter();
    this.mainFilter.type = "lowpass";
    this.mainFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);
    this.mainFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);

    // Connections: Generators -> Main Filter -> Master Gain -> Output
    this.mainFilter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Pre-create standard noise buffer for wind/water/rustle/crackles
    const bufferSize = 2 * this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const noiseData = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    this.setupBinauralBeats();
    this.setupNatureSynthesizers();
    this.startMelodyLoop();
  }

  public async start() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    // Fade in primary gain
    const now = this.ctx.currentTime;
    this.masterGain?.gain.linearRampToValueAtTime(0.8, now + 1.5);
    this.isRunning = true;
  }

  public stop() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain?.gain.linearRampToValueAtTime(0.0, now + 1.0);
    setTimeout(() => {
      this.isRunning = false;
    }, 1000);
  }

  public destroy() {
    this.stop();
    this.clearAllIntervals();
    setTimeout(() => {
      if (this.ctx) {
        this.ctx.close();
        this.ctx = null;
      }
    }, 1100);
  }

  private clearAllIntervals() {
    if (this.melodyTimeout) clearTimeout(this.melodyTimeout);
    if (this.waterInterval) clearInterval(this.waterInterval);
    if (this.fireInterval) clearInterval(this.fireInterval);
    if (this.birdInterval) clearInterval(this.birdInterval);
  }

  /**
   * Set up left/right oscillators for natural brainwave entrainment.
   */
  private setupBinauralBeats() {
    if (!this.ctx || !this.mainFilter) return;

    const carrier = 136.1; // Om carrier
    const beat = 5.0; // Theta wave default

    // Create Stereo Splitter to route left/right individually
    const pannerLeft = this.ctx.createStereoPanner();
    pannerLeft.pan.setValueAtTime(-1.0, this.ctx.currentTime);
    
    const pannerRight = this.ctx.createStereoPanner();
    pannerRight.pan.setValueAtTime(1.0, this.ctx.currentTime);

    this.leftOsc = this.ctx.createOscillator();
    this.leftOsc.type = "sine";
    this.leftOsc.frequency.setValueAtTime(carrier - (beat / 2), this.ctx.currentTime);

    this.rightOsc = this.ctx.createOscillator();
    this.rightOsc.type = "sine";
    this.rightOsc.frequency.setValueAtTime(carrier + (beat / 2), this.ctx.currentTime);

    this.leftGain = this.ctx.createGain();
    this.rightGain = this.ctx.createGain();

    this.leftGain.gain.setValueAtTime(0.08, this.ctx.currentTime); // keep binaural subtle and safe
    this.rightGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    // Connection chain
    this.leftOsc.connect(this.leftGain);
    this.leftGain.connect(pannerLeft);
    pannerLeft.connect(this.mainFilter);

    this.rightOsc.connect(this.rightGain);
    this.rightGain.connect(pannerRight);
    pannerRight.connect(this.mainFilter);

    this.leftOsc.start();
    this.rightOsc.start();
  }

  /**
   * Nature Sound Synthesis generators using procedural filters and noise loops
   */
  private setupNatureSynthesizers() {
    if (!this.ctx || !this.mainFilter || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;

    // --- WIND ---
    this.windNode = this.ctx.createBufferSource();
    this.windNode.buffer = this.noiseBuffer;
    this.windNode.loop = true;
    
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.Q.setValueAtTime(3.0, now);
    this.windFilter.frequency.setValueAtTime(400, now);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, now);

    this.windNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.mainFilter);
    this.windNode.start();

    // Modulate wind over time using a slow cycle LFO
    const windLFO = this.ctx.createOscillator();
    windLFO.frequency.setValueAtTime(0.07, now); // slow sea winds
    const windLFOGain = this.ctx.createGain();
    windLFOGain.gain.setValueAtTime(150, now);
    windLFO.connect(windLFOGain);
    if (this.windFilter) {
      windLFOGain.connect(this.windFilter.frequency);
    }
    windLFO.start();

    // --- RUSTLES ---
    this.rustleNode = this.ctx.createBufferSource();
    this.rustleNode.buffer = this.noiseBuffer;
    this.rustleNode.loop = true;
    
    this.rustleFilter = this.ctx.createBiquadFilter();
    this.rustleFilter.type = "highpass";
    this.rustleFilter.frequency.setValueAtTime(8000, now);

    this.rustleGain = this.ctx.createGain();
    this.rustleGain.gain.setValueAtTime(0.0, now);

    this.rustleNode.connect(this.rustleFilter);
    this.rustleFilter.connect(this.rustleGain);
    this.rustleGain.connect(this.mainFilter);
    this.rustleNode.start();

    // --- WATER (Distant Brook & Droplets) ---
    this.waterNode = this.ctx.createBufferSource();
    this.waterNode.buffer = this.noiseBuffer;
    this.waterNode.loop = true;

    this.waterFilter = this.ctx.createBiquadFilter();
    this.waterFilter.type = "bandpass";
    this.waterFilter.frequency.setValueAtTime(250, now);
    this.waterFilter.Q.setValueAtTime(1.0, now);

    this.waterGain = this.ctx.createGain();
    this.waterGain.gain.setValueAtTime(0.0, now);

    this.waterNode.connect(this.waterFilter);
    this.waterFilter.connect(this.waterGain);
    this.waterGain.connect(this.mainFilter);
    this.waterNode.start();

    // Periodic dynamic splash droplets
    this.waterInterval = setInterval(() => {
      if (this.isRunning && this.currentConfig?.natureSounds.gentleWater && this.ctx) {
        this.triggerDroplet();
      }
    }, 1800);

    // --- COZY FIRE CRACKLE ---
    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.setValueAtTime(0.0, now);
    this.fireGain.connect(this.mainFilter);

    this.fireInterval = setInterval(() => {
      if (this.isRunning && this.currentConfig?.natureSounds.fireCrackling && this.ctx) {
        this.triggerFireCrackle();
      }
    }, 180);

    // --- BIRDS CHIRPING ---
    this.birdGain = this.ctx.createGain();
    this.birdGain.gain.setValueAtTime(0.0, now);
    this.birdGain.connect(this.mainFilter);

    this.birdInterval = setInterval(() => {
      if (this.isRunning && this.currentConfig?.natureSounds.birdsChirping && this.ctx) {
        if (Math.random() > 0.4) {
          this.triggerBirdSong();
        }
      }
    }, 4500);
  }

  /**
   * Synthesizes a discrete, relaxing water droplet sound
   */
  private triggerDroplet() {
    if (!this.ctx || !this.mainFilter) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gNode = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(450 + Math.random() * 320, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

    gNode.gain.setValueAtTime(0.0, now);
    gNode.gain.linearRampToValueAtTime(0.08 * (this.currentConfig?.volume || 0.8), now + 0.05);
    gNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gNode);
    gNode.connect(this.mainFilter);
    osc.start();
    osc.stop(now + 0.4);
  }

  /**
   * Synthesizes low rumbles and bright snap crackles of logs burning
   */
  private triggerFireCrackle() {
    if (!this.ctx || !this.fireGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    // Pluck crackle pop click sound
    if (Math.random() > 0.75) {
      const osc = this.ctx.createOscillator();
      const crispCap = this.ctx.createBiquadFilter();
      crispCap.type = "highpass";
      crispCap.frequency.setValueAtTime(9000, now);
      
      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0.03 * (this.currentConfig?.volume || 0.8), now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150 + Math.random() * 300, now);

      osc.connect(crispCap);
      crispCap.connect(clickGain);
      clickGain.connect(this.fireGain);
      
      osc.start();
      osc.stop(now + 0.04);
    }
  }

  /**
   * Synthesizes realistic, procedurally generated ambient birdsongs
   */
  private triggerBirdSong() {
    if (!this.ctx || !this.birdGain) return;
    const now = this.ctx.currentTime;
    const birdVol = 0.06 * (this.currentConfig?.volume || 0.8);

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.type = "sine";
    const startFreq = 2200 + Math.random() * 1200;
    osc.frequency.setValueAtTime(startFreq, now);

    g.gain.setValueAtTime(0.0, now);
    g.gain.linearRampToValueAtTime(birdVol, now + 0.05);

    // Make beautiful multi-stage warble sweeps
    let time = now + 0.05;
    for (let i = 0; i < 4; i++) {
      osc.frequency.exponentialRampToValueAtTime(startFreq + 350, time + 0.08);
      osc.frequency.exponentialRampToValueAtTime(startFreq - 200, time + 0.16);
      time += 0.16;
    }

    g.gain.setValueAtTime(birdVol, time - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);

    osc.connect(g);
    g.connect(this.birdGain);
    
    osc.start();
    osc.stop(time + 0.15);
  }

  /**
   * Start a gentle procedural ambient music stream that changes pace based on patient heart rate
   */
  private startMelodyLoop() {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // Beautiful Pentatonic Pentachord scale C-D-E-G-A-C

    const tick = () => {
      if (this.ctx && this.isRunning && this.currentConfig && this.mainFilter) {
        if (Math.random() > 0.40) {
          const noteFreq = scale[Math.floor(Math.random() * scale.length)];
          this.playSynthesizedNote(noteFreq);
        }
      }

      // Calculate next delay dynamically based on simulated heart rate
      // Lower heart rate = slower, calmer spacing. Higher heart rate = faster pacing to entrain first
      const currentBpm = this.lastBpm || 68;
      const baseDelay = (60 / currentBpm) * 1400; // e.g. at 68 BPM => 1235ms, 50 BPM => 1680ms, 110 BPM => 764ms
      const jitter = Math.random() * 160 - 80;
      const nextDelay = Math.max(450, Math.min(3500, baseDelay + jitter));

      this.melodyTimeout = setTimeout(tick, nextDelay);
    };

    tick();
  }

  /**
   * Plays a single note modulated by choice of instrument selected by user/Gemini,
   * completely customized in pitch and envelop transition timing based on the client's current respiration phase
   */
  private playSynthesizedNote(freq: number) {
    if (!this.ctx || !this.currentConfig || !this.mainFilter) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    const style = this.currentConfig.musicSynthType;
    const baseVol = 0.18 * this.currentConfig.volume;

    // Mutate frequency/tempo and design based on active respiration phase
    let finalFreq = freq;
    let attackTime = 0.4;
    let decayTime = 2.0;

    if (this.lastPhase === 'inhale') {
      // Inhale plays bright, soaring rising notes (1.5x transposition)
      finalFreq = freq * 1.5;
      attackTime = 0.15; // prompt response
      decayTime = 1.3;
    } else if (this.lastPhase === 'hold') {
      // Hold is a suspended upper state (2x pristine pitch)
      finalFreq = freq * 2.0;
      attackTime = 0.8; // beautiful slow swell
      decayTime = 3.5;
    } else if (this.lastPhase === 'exhale') {
      // Exhale plays deep grounding, heavy comforting tones (0.5x transposition)
      finalFreq = freq * 0.5;
      attackTime = 1.25; // extremely warm and slow fade-in
      decayTime = 4.2;   // long soothing resonance
    }

    noteGain.gain.setValueAtTime(0, now);

    if (style === "space-synth") {
      // Modulated warm synthetic drone
      osc1.type = "sawtooth";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(finalFreq / 2, now); // play lower register octave
      osc2.frequency.setValueAtTime(finalFreq + 1.2, now); // slightly detuned upper note

      noteGain.gain.linearRampToValueAtTime(baseVol * 0.7, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      osc1.start();
      osc2.start();
      osc1.stop(now + decayTime + 0.2);
      osc2.stop(now + decayTime + 0.2);

    } else if (style === "acoustic-guitar") {
      // Fast, plucked metallic string model (decay envelope)
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(finalFreq, now);
      
      // Detune a harmonic frequency
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(finalFreq * 1.5, now);

      noteGain.gain.linearRampToValueAtTime(baseVol * 1.2, now + Math.min(0.02, attackTime));
      noteGain.gain.exponentialRampToValueAtTime(baseVol * 0.15, now + 0.5);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      osc1.start();
      osc2.start();
      osc1.stop(now + decayTime + 0.2);
      osc2.stop(now + decayTime + 0.2);

    } else if (style === "flute") {
      // Woodwind breathy flute model
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(finalFreq, now);

      // Low frequency LFO for realistic breath vibrato
      const vibrato = this.ctx.createOscillator();
      vibrato.frequency.setValueAtTime(5.8, now); // 5.8Hz warm human warble
      const vibGain = this.ctx.createGain();
      vibGain.gain.setValueAtTime(4.2, now);
      
      vibrato.connect(vibGain);
      vibGain.connect(osc1.frequency);
      vibrato.start();

      noteGain.gain.linearRampToValueAtTime(baseVol * 1.4, now + attackTime);
      noteGain.gain.setValueAtTime(baseVol * 1.4, now + attackTime + 0.5);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc1.connect(noteGain);
      osc1.start();
      osc1.stop(now + decayTime + 0.2);
      vibrato.stop(now + decayTime + 0.2);

    } else if (style === "crystal-chime") {
      // Bright glockenspiel/metal chime model
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(finalFreq * 2, now); // extra octave
      
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(finalFreq * 3.5, now); // elite overtone

      noteGain.gain.linearRampToValueAtTime(baseVol * 1.6, now + 0.005);
      noteGain.gain.exponentialRampToValueAtTime(baseVol * 0.2, now + 0.2);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      osc1.start();
      osc2.start();
      osc1.stop(now + decayTime + 0.2);
      osc2.stop(now + decayTime + 0.2);

    } else {
      // Default: "warm-pad" or "soft-organ"
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(finalFreq, now);

      noteGain.gain.linearRampToValueAtTime(baseVol, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc1.connect(noteGain);
      osc1.start();
      osc1.stop(now + decayTime + 0.2);
    }

    noteGain.connect(this.mainFilter);
  }

  /**
   * Dynamo-Configuration parameter updater. Called whenever environment shifts.
   */
  public updateParameters(config: AudioConfig) {
    this.currentConfig = config;
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;

    // Update Binaural Beats frequency settings
    if (this.leftOsc && this.rightOsc && this.leftGain && this.rightGain) {
      const beat = config.beatFreq;
      const carrier = config.carrierFreq;
      const active = config.binauralEnabled && config.natureSounds.binauralBeats;

      this.leftOsc.frequency.exponentialRampToValueAtTime(carrier - (beat / 2), now + 2.0);
      this.rightOsc.frequency.exponentialRampToValueAtTime(carrier + (beat / 2), now + 2.0);
      
      this.leftGain.gain.linearRampToValueAtTime(active ? 0.08 : 0.0, now + 1.5);
      this.rightGain.gain.linearRampToValueAtTime(active ? 0.08 : 0.0, now + 1.5);
    }

    // Set low-pass filter
    if (this.mainFilter) {
      this.mainFilter.frequency.exponentialRampToValueAtTime(config.eqFilterCutoff, now + 2.0);
    }

    // Update active loopers
    if (this.windGain) {
      this.windGain.gain.linearRampToValueAtTime(config.natureSounds.softWind ? 0.25 * config.volume : 0.0, now + 2.0);
    }
    if (this.rustleGain) {
      this.rustleGain.gain.linearRampToValueAtTime(config.natureSounds.leavesRustling ? 0.18 * config.volume : 0.0, now + 2.0);
    }
    if (this.waterGain) {
      this.waterGain.gain.linearRampToValueAtTime(config.natureSounds.gentleWater ? 0.15 * config.volume : 0.0, now + 2.0);
    }
    if (this.fireGain) {
      this.fireGain.gain.linearRampToValueAtTime(config.natureSounds.fireCrackling ? 0.15 * config.volume : 0.0, now + 2.0);
    }
    if (this.birdGain) {
      this.birdGain.gain.linearRampToValueAtTime(config.natureSounds.birdsChirping ? 0.10 * config.volume : 0.0, now + 2.0);
    }
  }

  /**
   * Syncs the soundscape to smartwatch Biofeedback respiration signals.
   * Maps chest expansion & heartbeat to filter cutoff, resonance (Q), and audio stem gains!
   */
  public updateBiofeedback(bio: WatchBiofeedback) {
    if (!this.ctx || !this.mainFilter || !this.currentConfig) return;
    
    // Track bio conditions for dynamic ambient generative accompaniment
    this.lastBpm = bio.heartRateBpm;
    this.lastPhase = bio.currentPhase;

    const now = this.ctx.currentTime;
    const baseCutoff = this.currentConfig.eqFilterCutoff;

    // 1. DYNAMIC RESONANCE (Q-FACTOR) BASED ON HEART RATE
    // Higher heart rate Bpm => tighter, sharper resonance (crisp feedback)
    // Lower grounding heart rate Bpm => gentle, flat, cozy warmth
    const normalHr = Math.max(45, Math.min(130, bio.heartRateBpm));
    const targetQ = 1.0 + ((normalHr - 50) / 80) * 3.5; // range 1.0 to 4.5
    this.mainFilter.Q.cancelScheduledValues(now);
    this.mainFilter.Q.setTargetAtTime(targetQ, now, 0.4);

    // 2. RESIDENCY-PHASE MULTIPLIER (FILTER SWEEP)
    // During 'inhale', open filter width to sound bright and airy
    // During 'hold', stay open
    // During 'exhale', deeply warm and cover the filter frequencies
    let phaseMultiplier = 1.0;
    let inhaleProgressAdd = 0.0;
    let exhaleProgressAdd = 0.0;

    if (bio.currentPhase === 'inhale') {
      phaseMultiplier = 1.0 + (0.45 * bio.phaseProgress); // +45% brighter
      inhaleProgressAdd = bio.phaseProgress;
    } else if (bio.currentPhase === 'hold') {
      phaseMultiplier = 1.45;
    } else if (bio.currentPhase === 'exhale') {
      phaseMultiplier = 1.45 - (0.55 * bio.phaseProgress); // deep low-pass shielding
      exhaleProgressAdd = bio.phaseProgress;
    }

    // Target cutoff frequency computed dynamically
    const targetCutoff = Math.max(150, Math.min(12000, baseCutoff * phaseMultiplier));
    this.mainFilter.frequency.cancelScheduledValues(now);
    this.mainFilter.frequency.setTargetAtTime(targetCutoff, now, 0.3);

    // 3. DYNAMIC VOICE-STEM COUPLING IN REAL TIME
    // Wind swells gently on inhale representing cold air pulling in
    if (this.windGain && this.currentConfig.natureSounds.softWind) {
      const windVolume = (0.2 + (0.18 * inhaleProgressAdd)) * this.currentConfig.volume;
      this.windGain.gain.setTargetAtTime(windVolume, now, 0.2);
    }
    // Water streams/bonfires swell gently on exhale representing relief and release grounding
    if (this.waterGain && this.currentConfig.natureSounds.gentleWater) {
      const waterVolume = (0.12 + (0.18 * exhaleProgressAdd)) * this.currentConfig.volume;
      this.waterGain.gain.setTargetAtTime(waterVolume, now, 0.2);
    }
    if (this.fireGain && this.currentConfig.natureSounds.fireCrackling) {
      const fireVolume = (0.12 + (0.18 * exhaleProgressAdd)) * this.currentConfig.volume;
      this.fireGain.gain.setTargetAtTime(fireVolume, now, 0.2);
    }

    // 4. BINAURAL FREQUENCY TUNING BASED ON HRV
    if (this.leftOsc && this.rightOsc) {
      // Map HR BPM to carrier frequency offset slightly
      const hrOffset = (bio.heartRateBpm - 60) * 0.12; // e.g. 70bpm adds +1.2Hz carrier pitch
      const baseCarrier = this.currentConfig.carrierFreq + hrOffset;
      const beat = this.currentConfig.beatFreq;

      this.leftOsc.frequency.setTargetAtTime(baseCarrier - (beat / 2), now, 0.4);
      this.rightOsc.frequency.setTargetAtTime(baseCarrier + (beat / 2), now, 0.4);
    }
  }
}
export default AudioSynthesizer;
