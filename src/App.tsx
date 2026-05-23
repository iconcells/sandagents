/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, Heart, RotateCcw, Compass, Music, Sliders, Play, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EnvironmentConfig, WatchBiofeedback, SoundToggle } from './types';
import { AudioSynthesizer } from './lib/AudioSynthesizer';
import { VisualCanvas } from './components/VisualCanvas';
import { VoiceController } from './components/VoiceController';
import { BreathingSim } from './components/BreathingSim';

// Beautiful initial fallback config modeled after the signature "Sunshine" preset
const defaultEnvironment: EnvironmentConfig = {
  keyPhrase: "Sunshine",
  visuals: {
    theme: "sunshine",
    primaryColor: "#f59e0b",
    secondaryColor: "#fef08a",
    backgroundColor: "#111827",
    particleCount: 75,
    particleSpeed: 0.4,
    visualStyle: "canopy",
    brightnessMultiplier: 1.1
  },
  audio: {
    binauralEnabled: true,
    carrierFreq: 136.1,
    beatFreq: 4.5,
    musicSynthType: "acoustic-guitar",
    volume: 0.8,
    natureSounds: {
      leavesRustling: true,
      birdsChirping: true,
      gentleWater: false,
      softWind: true,
      fireCrackling: false,
      binauralBeats: true
    },
    eqFilterCutoff: 1200
  },
  narrativeText: "A warm golden hour sunbeams drift softly through the leaves above. Breathe in the warm glowing light; let everything else dissolve."
};

export default function App() {
  const [hasStarted, setHasStarted] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Active configuration states
  const [envConfig, setEnvConfig] = useState<EnvironmentConfig>(defaultEnvironment);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [binauralEnabled, setBinauralEnabled] = useState(envConfig.audio.binauralEnabled);
  const [isMenuHidden, setIsMenuHidden] = useState(true);

  // Biofeedback Smartwatch State Sync
  const [biofeedback, setBiofeedback] = useState<WatchBiofeedback>({
    connected: true, // Auto-connect simulated watch to show immediate results
    deviceType: 'smartwatch',
    heartRateBpm: 68,
    breathingRateBpm: 6,
    hrvMs: 65,
    currentPhase: 'inhale',
    phaseProgress: 0.0
  });

  // Audio Synthesizer Engine ref
  const synthRef = useRef<AudioSynthesizer | null>(null);

  // Initialize Audio Synthesizer singleton safely
  useEffect(() => {
    const synth = new AudioSynthesizer();
    synthRef.current = synth;

    return () => {
      synth.destroy();
    };
  }, []);

  // Update Synthesizer parameters with automated dynamic phase stem adaptation!
  useEffect(() => {
    if (!synthRef.current || !hasStarted) return;
    
    // Dynamically calculate nature sounds based on active breathing phase
    const activeTheme = envConfig.visuals.theme;
    const isWarm = activeTheme.includes("warm") || envConfig.keyPhrase.toLowerCase().includes("fire") || envConfig.keyPhrase.toLowerCase().includes("warm") || envConfig.keyPhrase.toLowerCase().includes("cozy");
    const isSpace = activeTheme === "star" || envConfig.keyPhrase.toLowerCase().includes("space") || envConfig.keyPhrase.toLowerCase().includes("star");

    let autoNatureSounds: SoundToggle = {
      leavesRustling: false,
      birdsChirping: false,
      gentleWater: false,
      softWind: false,
      fireCrackling: false,
      binauralBeats: binauralEnabled
    };

    let autoSynthType = envConfig.audio.musicSynthType;

    if (biofeedback.currentPhase === 'inhale') {
      // Inhale represents gathering energy, air flow, and forest breeze
      autoNatureSounds.softWind = true;
      if (!isSpace) {
        autoNatureSounds.leavesRustling = true;
        autoNatureSounds.birdsChirping = true;
      }
      autoSynthType = "flute"; // Air instrumentation
    } else if (biofeedback.currentPhase === 'hold') {
      // Hold is suspension, starry cosmos focus, and quiet deep guidance
      autoNatureSounds.softWind = true;
      autoSynthType = "space-synth"; // Deep cosmic hold
    } else if (biofeedback.currentPhase === 'exhale') {
      // Exhale represents dynamic warm releasing and body grounding
      if (isWarm) {
        autoNatureSounds.fireCrackling = true;
        autoSynthType = "acoustic-guitar"; // Warm acoustic string vibrations
      } else if (isSpace) {
        autoNatureSounds.softWind = true;
        autoSynthType = "warm-pad";
      } else {
        autoNatureSounds.gentleWater = true;
        autoSynthType = "warm-pad"; // Running brook streams
      }
    }

    const finalAudioConfig = {
      ...envConfig.audio,
      musicSynthType: autoSynthType,
      volume: audioVolume,
      binauralEnabled: binauralEnabled,
      natureSounds: autoNatureSounds
    };

    synthRef.current.updateParameters(finalAudioConfig);
  }, [envConfig, audioVolume, binauralEnabled, biofeedback.currentPhase, hasStarted]);

  // Sync Breathing & Heart oscillation elements immediately to Synthesizer Filter
  useEffect(() => {
    if (!synthRef.current || !hasStarted) return;
    synthRef.current.updateBiofeedback(biofeedback);
  }, [biofeedback, hasStarted]);

  // Handler to start/stop synthesized session safely honoring browser permissions
  const startRelaxationSession = async () => {
    if (!synthRef.current) return;
    try {
      await synthRef.current.start();
      setHasStarted(true);
    } catch (err) {
      console.error("Failed to start AudioContext:", err);
      setErrorText("Web Audio initialization failed. Please try again on a modern browser.");
    }
  };

  const toggleSoundMute = () => {
    if (!synthRef.current) return;
    if (synthRef.current.isRunning) {
      synthRef.current.stop();
    } else {
      synthRef.current.start();
    }
  };

  // Keep track of the last submitted parameters to prevent redundant identical calls
  const lastSubmittedRef = useRef({
    phrase: '',
    hr: 0,
    br: 0
  });

  // Process user requested vocal or typed phrase along with current biofeedback
  const handlePhraseSubmit = async (phrase: string, hr?: number, br?: number) => {
    if (!phrase.trim()) return;
    
    setIsProcessing(true);
    setErrorText(null);

    const activeHr = hr ?? biofeedback.heartRateBpm;
    const activeBr = br ?? biofeedback.breathingRateBpm;

    // Record this configuration
    lastSubmittedRef.current = { phrase, hr: activeHr, br: activeBr };

    try {
      // POST command to backend endpoint
      const response = await fetch('/api/generate-environment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          phrase,
          heartRateBpm: activeHr,
          breathingRateBpm: activeBr
        })
      });

      if (!response.ok) {
        throw new Error(`API returned status code ${response.status}`);
      }

      const newEnv: EnvironmentConfig = await response.json();
      setEnvConfig(newEnv);
      
      // Merge matching parameters onto state levels immediately
      setBinauralEnabled(newEnv.audio.binauralEnabled);
    } catch (err: any) {
      console.warn("Express Gemini API call unavailable or offline. Emulating instant offline safe generation fallback...", err);
      
      // Robust offline fallback simulation to prevent UI locking if dev server is booting
      const clean = phrase.trim().toLowerCase();
      let fallbackTheme = defaultEnvironment;

      if (clean.includes("star") || clean.includes("galaxy") || clean.includes("space")) {
        fallbackTheme = {
          keyPhrase: phrase,
          visuals: {
            theme: "star",
            primaryColor: "#3b82f6",
            secondaryColor: "#a855f7",
            backgroundColor: "#03001e",
            particleCount: 120,
            particleSpeed: 0.2,
            visualStyle: "constellations",
            brightnessMultiplier: 1.0
          },
          audio: {
            binauralEnabled: true,
            carrierFreq: 110.0,
            beatFreq: 4.0,
            musicSynthType: "space-synth",
            volume: 0.8,
            natureSounds: {
              leavesRustling: false,
              birdsChirping: false,
              gentleWater: false,
              softWind: true,
              fireCrackling: false,
              binauralBeats: true
            },
            eqFilterCutoff: 650
          },
          narrativeText: `The star elements expand around you. Cozy starlight streams merge perfectly with the deep space ambient synth frequencies.`
        };
      } else if (clean.includes("forest") || clean.includes("trees") || clean.includes("jungle")) {
        fallbackTheme = {
          keyPhrase: phrase,
          visuals: {
            theme: "forest",
            primaryColor: "#10b981",
            secondaryColor: "#6ee7b7",
            backgroundColor: "#064e3b",
            particleCount: 85,
            particleSpeed: 0.35,
            visualStyle: "trees",
            brightnessMultiplier: 1.1
          },
          audio: {
            binauralEnabled: true,
            carrierFreq: 144.0,
            beatFreq: 6.0,
            musicSynthType: "flute",
            volume: 0.85,
            natureSounds: {
              leavesRustling: true,
              birdsChirping: true,
              gentleWater: true,
              softWind: true,
              fireCrackling: false,
              binauralBeats: true
            },
            eqFilterCutoff: 900
          },
          narrativeText: `Pine branch silhouettes emerge inside memory lanes as distant river brooks provide a continuous source of serene comfort.`
        };
      } else {
        // Dynamic custom rendering modeled on word length and letters
        const isWarm = clean.includes("fire") || clean.includes("cozy") || clean.includes("warm") || clean.includes("ember");
        fallbackTheme = {
          keyPhrase: phrase,
          visuals: {
            theme: isWarm ? "custom-warm" : "custom-nature",
            primaryColor: isWarm ? "#f97316" : "#06b6d4",
            secondaryColor: isWarm ? "#ef4444" : "#22d3ee",
            backgroundColor: isWarm ? "#1c0d02" : "#0f172a",
            particleCount: 60,
            particleSpeed: 0.45,
            visualStyle: isWarm ? "embers" : "particles",
            brightnessMultiplier: 1.0
          },
          audio: {
            binauralEnabled: true,
            carrierFreq: 136.1,
            beatFreq: 5.0,
            musicSynthType: isWarm ? "acoustic-guitar" : "warm-pad",
            volume: 0.8,
            natureSounds: {
              leavesRustling: !isWarm,
              birdsChirping: !isWarm,
              gentleWater: !isWarm,
              softWind: true,
              fireCrackling: isWarm,
              binauralBeats: true
            },
            eqFilterCutoff: 1000
          },
          narrativeText: `The peaceful elements of "${phrase}" have synthesized safely into a nourishing auditory blanket. Breathe gently in phase with the light.`
        };
      }

      // Apply dynamic biofeedback scaling to local state fallback
      const isElevated = activeHr > 75 || activeBr > 8;
      let finalFallback = fallbackTheme;
      if (isElevated) {
        finalFallback = {
          ...fallbackTheme,
          visuals: {
            ...fallbackTheme.visuals,
            particleSpeed: fallbackTheme.visuals.particleSpeed * 0.45,
            particleCount: Math.round(fallbackTheme.visuals.particleCount * 0.8),
          },
          audio: {
            ...fallbackTheme.audio,
            carrierFreq: 110.0,
            beatFreq: 3.2,
            musicSynthType: (fallbackTheme.audio.musicSynthType === "crystal-chime" || fallbackTheme.audio.musicSynthType === "flute") ? "warm-pad" : fallbackTheme.audio.musicSynthType,
            eqFilterCutoff: 600
          },
          narrativeText: `We detected an elevated heart rate of ${activeHr} BPM. Watch these slow-motion particles settle. Breathe on a slow ${activeBr}-breath cycle to help slow down your pulse and rest.`
        };
      }

      setEnvConfig(finalFallback);
      setBinauralEnabled(finalFallback.audio.binauralEnabled);
    } finally {
      setIsProcessing(false);
    }
  };

  // Automated Debounced Re-generator: triggers whenever phrase, heart rate, or respiration freq changes
  useEffect(() => {
    if (!hasStarted) return;

    const phrase = envConfig.keyPhrase;
    const hr = biofeedback.heartRateBpm;
    const br = biofeedback.breathingRateBpm;

    // Do not re-request if the current values match the last submitted parameters (prevents infinite render loops)
    if (
      phrase.toLowerCase() === lastSubmittedRef.current.phrase.toLowerCase() &&
      hr === lastSubmittedRef.current.hr &&
      br === lastSubmittedRef.current.br
    ) {
      return;
    }

    // Debounce slider updates for 1000ms so sliding is exceptionally smooth
    const timer = setTimeout(() => {
      handlePhraseSubmit(phrase, hr, br);
    }, 1000);

    return () => clearTimeout(timer);
  }, [envConfig.keyPhrase, biofeedback.heartRateBpm, biofeedback.breathingRateBpm, hasStarted]);

  // Dynamically scale parameters in response to biofeedback phase to auto-adapt animations in real-time
  const adjustedVisuals = {
    ...envConfig.visuals,
    particleSpeed: biofeedback.currentPhase === 'inhale' 
      ? envConfig.visuals.particleSpeed * 1.6
      : biofeedback.currentPhase === 'hold' 
        ? envConfig.visuals.particleSpeed * 0.4
        : envConfig.visuals.particleSpeed * 0.8,
    brightnessMultiplier: biofeedback.currentPhase === 'inhale' 
      ? envConfig.visuals.brightnessMultiplier * 1.35
      : biofeedback.currentPhase === 'hold' 
        ? envConfig.visuals.brightnessMultiplier * 1.15
        : envConfig.visuals.brightnessMultiplier * 0.85
  };

  // Gentle viewport click/tap fallback to unlock browser audio autoplay restrictions
  const handleViewportClick = () => {
    if (synthRef.current && !synthRef.current.isRunning) {
      synthRef.current.start().catch((err) => {
        console.warn("AudioContext startup pending user gesture:", err);
      });
    }
  };

  return (
    <div id="main_viewport" onClick={handleViewportClick} className="h-screen w-screen relative overflow-hidden text-slate-100 flex flex-col font-sans select-none" style={{ backgroundColor: envConfig.visuals.backgroundColor }}>
      {/* Visual Canvas Backdrop Layer */}
      <div className="absolute inset-0 z-0">
        <VisualCanvas config={adjustedVisuals} biofeedback={biofeedback} />
      </div>

      <AnimatePresence mode="wait">
        {!hasStarted ? (
          // LUXURIOUS GENTLE ENTRY PORTAL
          <motion.div
            key="portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl"
          >
            <div className="max-w-md w-full text-center space-y-7 relative">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
              
              <div className="space-y-3 relative z-10">
                <div className="mx-auto w-14 h-14 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                  <Compass className="w-7 h-7 animate-spin" style={{ animationDuration: '40s' }} />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-violet-200 to-emerald-300 bg-clip-text text-transparent italic uppercase">
                  SANDIFY
                </h1>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  A real-time voice-synthesized Web Audio relaxation engine paired with bio-inspired visual graphics.
                </p>
              </div>

              {/* Enter Button */}
              <button
                id="btn_enter_sanctuary"
                onClick={startRelaxationSession}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold tracking-wider text-xs shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/40 active:scale-98 cursor-pointer duration-300 transition-all flex items-center justify-center gap-2 group border border-indigo-400/20"
              >
                <Play className="w-4 h-4 text-white group-hover:translate-x-0.5 duration-200 transition-all fill-current" />
                ENTER COZY SPACE
              </button>

              <div className="pt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500 font-mono">
                <Info className="w-3.5 h-3.5" />
                <span>Uses HTML5 Web Audio & Smartwatch Simulators</span>
              </div>
            </div>
          </motion.div>
        ) : (
          // IMMERSIVE ACTIVE DASHBOARD OVERLAY LAYER
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 flex flex-col justify-between p-4 md:p-6 z-10 pointer-events-none relative h-full w-full"
          >
            {/* Top Bar (Interactive Menu) */}
            <AnimatePresence>
              {!isMenuHidden && (
                <motion.header
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="flex items-center justify-between w-full pointer-events-auto"
                >
                  <div className="flex items-center gap-3 bg-slate-950/40 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800/60 max-w-xs md:max-w-md">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h1 className="font-sans font-bold text-xs tracking-wider text-slate-100 uppercase tracking-widest bg-gradient-to-r from-indigo-300 to-teal-300 bg-clip-text text-transparent">
                        SANDIFY
                      </h1>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        AI personalized mind therapy
                      </span>
                    </div>
                  </div>

                  {/* Automated Master Volume and Mute row */}
                  <div className="flex items-center gap-4 bg-slate-950/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800/60 pointer-events-auto shadow-md">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                        className="w-20 md:w-28 accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-1 opacity-80 hover:opacity-100 transition-opacity"
                        title="Volume"
                      />
                      <span className="font-mono text-[10px] text-slate-300 w-7 text-right tabular-nums">
                        {Math.round(audioVolume * 100)}%
                      </span>
                    </div>
                    <div className="w-px h-5 bg-slate-800/80" />
                    <button
                      id="btn_master_mute"
                      onClick={toggleSoundMute}
                      className="p-1 text-slate-400 hover:text-indigo-400 duration-200 cursor-pointer transition-all flex items-center justify-center shrink-0"
                      title="Toggle Audio Engine"
                    >
                      {synthRef.current?.isRunning ? (
                        <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                      ) : (
                        <VolumeX className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.header>
              )}
            </AnimatePresence>

            {/* Middle Section: Clear, open space to focus purely on visual art & music */}
            <div className="flex-1" />

            {/* Bottom Controls Panel Grid - 2 columns for maximum clarity */}
            <AnimatePresence>
              {!isMenuHidden && (
                <motion.footer
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-6 pointer-events-auto items-end mt-auto"
                >
                  {/* Left Column: Voice and Text Natural input */}
                  <div className="order-1">
                    <VoiceController
                      currentPhrase={envConfig.keyPhrase}
                      isProcessing={isProcessing}
                      onPhraseSubmit={handlePhraseSubmit}
                    />
                  </div>

                  {/* Right Column: Biofeedback Device controls */}
                  <div className="order-2">
                    <BreathingSim
                      biofeedback={biofeedback}
                      onChange={(updates) => setBiofeedback(p => ({ ...p, ...updates }))}
                      onHideMenu={() => setIsMenuHidden(true)}
                    />
                  </div>
                </motion.footer>
              )}
            </AnimatePresence>

            {/* Show Menu absolute floating overlay toggler */}
            {isMenuHidden && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
              >
                <button
                  id="btn_show_menu"
                  onClick={() => setIsMenuHidden(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-950/70 border border-slate-800/85 text-xs text-slate-350 hover:text-white font-bold tracking-wider shadow-lg hover:shadow-indigo-505/20 hover:border-indigo-500/30 cursor-pointer transition-all duration-300 backdrop-blur-md flex items-center gap-2 active:scale-95 text-slate-200"
                >
                  <Compass className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
                  SHOW MENU
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

