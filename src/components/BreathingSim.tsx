import React, { useEffect, useState, useRef } from 'react';
import { WatchBiofeedback } from '../types';
import { Watch, Heart, Flame, ShieldAlert, Cpu, Footprints } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BreathingSimProps {
  biofeedback: WatchBiofeedback;
  onChange: (updates: Partial<WatchBiofeedback>) => void;
  onHideMenu?: () => void;
}

export const BreathingSim: React.FC<BreathingSimProps> = ({ biofeedback, onChange, onHideMenu }) => {
  const [inhaleSec, setInhaleSec] = useState(4);
  const [holdSec, setHoldSec] = useState(2);
  const [exhaleSec, setExhaleSec] = useState(5);
  
  const timerRef = useRef<number | null>(null);
  
  // Local mutable state for exact counting
  const [localPhase, setLocalPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [localProgress, setLocalProgress] = useState(0); 
  const [timeLeft, setTimeLeft] = useState(4);

  // Toggle sensor connection state
  const toggleConnection = () => {
    onChange({ connected: !biofeedback.connected });
  };

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Run the Breathing Clock Cycle (Inhale -> Hold -> Exhale ->...)
  useEffect(() => {
    if (!biofeedback.connected) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    let intervalMs = 50;

    timerRef.current = window.setInterval(() => {
      setLocalProgress((prevProgress) => {
        let currentMax = inhaleSec;
        if (localPhase === 'hold') currentMax = holdSec;
        if (localPhase === 'exhale') currentMax = exhaleSec;

        const delta = intervalMs / 1000 / currentMax;
        const nextProgress = prevProgress + delta;

        if (nextProgress >= 1.0) {
          // Transit to next phase in respiration loop
          let nextPhase: 'inhale' | 'hold' | 'exhale' = 'inhale';
          let nextTime = inhaleSec;

          if (localPhase === 'inhale') {
            nextPhase = 'hold';
            nextTime = holdSec;
          } else if (localPhase === 'hold') {
            nextPhase = 'exhale';
            nextTime = exhaleSec;
          } else if (localPhase === 'exhale') {
            nextPhase = 'inhale';
            nextTime = inhaleSec;
          }

          setLocalPhase(nextPhase);
          setTimeLeft(nextTime);
          
          return 0;
        } else {
          const currentSecondsLeft = currentMax * (1 - nextProgress);
          setTimeLeft(Math.max(0, parseFloat(currentSecondsLeft.toFixed(1))));
          
          return nextProgress;
        }
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [biofeedback.connected, localPhase, inhaleSec, holdSec, exhaleSec]);

  // Synchronize state safely to parent on separate side-effect ticks instead of during render / setstate calculation
  useEffect(() => {
    if (biofeedback.connected) {
      onChangeRef.current({
        currentPhase: localPhase,
        phaseProgress: localProgress
      });
    }
  }, [localPhase, localProgress, biofeedback.connected]);

  // Handle manual adjustments
  const handleRateSlider = (rate: number) => {
    onChange({ breathingRateBpm: rate });
    // Adjust seconds proportionally
    // 60 seconds / rate BPM = seconds per cycle. Let's spread 40% inhale, 20% hold, 40% exhale
    const cycleSec = 60 / rate;
    setInhaleSec(parseFloat((cycleSec * 0.4).toFixed(1)));
    setHoldSec(parseFloat((cycleSec * 0.15).toFixed(1)));
    setExhaleSec(parseFloat((cycleSec * 0.45).toFixed(1)));
  };

  const handleHeartSlider = (bpm: number) => {
    // HRV generally drops as HR rises (inverse relationship)
    const hrv = Math.round(Math.max(15, 120 - (bpm - 50) * 1.1));
    onChange({ heartRateBpm: bpm, hrvMs: hrv });
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-lg select-none">
      {/* Header and Sync Control */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <Watch className={`w-5 h-5 ${biofeedback.connected ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} />
          <h2 className="font-sans font-medium text-slate-200 text-sm tracking-wide">SMARTWATCH BIO-SYNC</h2>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            id="btn_watch_toggle"
            onClick={toggleConnection}
            className={`px-3 py-1 text-xs font-semibold rounded-full duration-200 transition-all cursor-pointer ${
              biofeedback.connected 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            {biofeedback.connected ? 'SIMULATOR ACTIVE' : 'CONNECT SIMULATOR'}
          </button>
          {onHideMenu && (
            <button
              id="btn_hide_menu"
              onClick={onHideMenu}
              className="px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-indigo-300 bg-slate-850 hover:bg-slate-800 rounded-md transition-all cursor-pointer border border-slate-800 flex items-center justify-center gap-1 active:scale-95"
            >
              Hide Menu
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
        {/* Watch Device UI Render */}
        <div className="flex flex-col items-center justify-center p-3 relative bg-slate-950/45 rounded-xl border border-slate-800/40 min-h-[220px]">
          {biofeedback.connected ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center"
            >
              {/* Circular Watch Face Frame */}
              <div className="w-36 h-36 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center relative p-2 shadow-inner bg-slate-950">
                {/* Simulated Breathing Circle */}
                <motion.div
                  className={`absolute rounded-full border-2 ${
                    localPhase === 'inhale' 
                      ? 'bg-indigo-500/5 border-indigo-400/40' 
                      : localPhase === 'hold' 
                        ? 'bg-violet-500/10 border-violet-400/60' 
                        : 'bg-emerald-500/5 border-emerald-400/40'
                  }`}
                  animate={{ 
                    scale: localPhase === 'inhale' 
                      ? 1 + (0.5 * localProgress) 
                      : localPhase === 'hold' 
                        ? 1.5 
                        : 1.5 - (0.5 * localProgress)
                  }}
                  transition={{ duration: 0.1, ease: "linear" }}
                  style={{ width: '80px', height: '80px' }}
                />

                {/* Digital readout inside smartwatch */}
                <div className="z-10 text-center flex flex-col items-center justify-center">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {localPhase}
                  </span>
                  
                  {/* Dynamic Timer Readout */}
                  <span className="font-sans text-2xl font-bold text-slate-100 tabular-nums">
                    {timeLeft}s
                  </span>

                  {/* Pulsing heart inside face */}
                  <div className="flex items-center gap-1 mt-1 text-red-400">
                    <Heart 
                      className={`w-3.5 h-3.5 fill-current`} 
                      style={{
                        animation: `pulse ${60 / biofeedback.heartRateBpm}s infinite ease-in-out`
                      }}
                    />
                    <span className="font-mono text-xs tabular-nums text-slate-300 font-semibold">{biofeedback.heartRateBpm}</span>
                  </div>
                </div>

                {/* Minute ticks on border */}
                <div className="absolute inset-0.5 rounded-full border border-slate-800 pointer-events-none opacity-40 border-dashed" />
              </div>

              {/* HRV & Breathing Stats */}
              <div className="flex gap-4 mt-3 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded">
                  <ShieldAlert className="w-3 h-3 text-violet-400" />
                  <span>HRV: <b className="text-violet-300 tabular-nums">{biofeedback.hrvMs}ms</b></span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded">
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  <span>BREATH: <b className="text-emerald-300 tabular-nums">{biofeedback.breathingRateBpm}/M</b></span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="text-center p-4 flex flex-col items-center justify-center text-slate-500">
              <Watch className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
              <p className="font-sans text-xs text-slate-400 max-w-[200px] leading-relaxed">
                Connect the simulated Smartwatch to overlay wearable respiration and pulse metrics onto your relaxation elements.
              </p>
            </div>
          )}
        </div>

        {/* Sliders and controls (Adjust raw physics in real-time) */}
        <div className="flex flex-col gap-4 text-xs font-sans">
          {/* Heart rate adjustment */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                Simulated Heart Rate
              </span>
              <span className="font-mono text-slate-200 font-bold tabular-nums">
                {biofeedback.heartRateBpm} BPM
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="110"
              value={biofeedback.heartRateBpm}
              onChange={(e) => handleHeartSlider(parseInt(e.target.value))}
              disabled={!biofeedback.connected}
              className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-1.5 opacity-80 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>50 BPM (Resting)</span>
              <span>110 BPM (Arousal)</span>
            </div>
          </div>

          {/* Breathing rate adjustment */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                Simulated Respiration Frequency
              </span>
              <span className="font-mono text-slate-200 font-bold tabular-nums">
                {biofeedback.breathingRateBpm} Breath/Min
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              value={biofeedback.breathingRateBpm}
              onChange={(e) => handleRateSlider(parseInt(e.target.value))}
              disabled={!biofeedback.connected}
              className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer h-1.5 opacity-80 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>4/Min (Deep Pranayama)</span>
              <span>12/Min (Normal)</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Styles injected to pulse the watch icon */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
};

export default BreathingSim;
