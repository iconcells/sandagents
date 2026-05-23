import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, MessageSquareHeart, Sparkles, Volume2, CloudSun, Moon, Trees, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceControllerProps {
  currentPhrase: string;
  isProcessing: boolean;
  onPhraseSubmit: (phrase: string) => void;
}

export const VoiceController: React.FC<VoiceControllerProps> = ({
  currentPhrase,
  isProcessing,
  onPhraseSubmit
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);

  // Maintain hot-swappable reference to latest submit handler to completely solve stale closures
  const onPhraseSubmitRef = useRef(onPhraseSubmit);
  useEffect(() => {
    onPhraseSubmitRef.current = onPhraseSubmit;
  }, [onPhraseSubmit]);

  // Synchronize input text with the active environment's key phrase
  useEffect(() => {
    if (currentPhrase) {
      setInputText(currentPhrase);
    }
  }, [currentPhrase]);

  // Clean background recognition and debouncer on unmount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not natively supported in this browser. Please type below.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
    };

    rec.onresult = (event: any) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          onPhraseSubmitRef.current(transcript);
        }
      }
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error event:', event.error);
      if (event.error === 'not-allowed') {
        setSpeechError('Microphone permission denied. Feel free to type instead.');
      } else if (event.error === 'network') {
        setSpeechError('Speech network connection failed.');
      } else if (event.error === 'aborted') {
        // normal termination, no error indicator
      } else if (event.error === 'no-speech') {
        // no speech processed, smooth transition
      } else {
        setSpeechError(`Speech error: ${event.error}`);
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle typing inputs with dynamic smart auto-submission on keyboard pauses
  const handleInputChange = (val: string) => {
    setInputText(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.toLowerCase() === currentPhrase.toLowerCase()) {
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      onPhraseSubmitRef.current(trimmed);
    }, 1000); // Wait for 1 second of inactivity to confirm phrase typing completes
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError('Speech recognition is not natively supported in this browser. Please type below.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping speech engine:', err);
      }
      setIsListening(false);
    } else {
      try {
        setSpeechError(null);
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to construct or start Web SpeechRecognition engine:', err);
        try {
          recognitionRef.current.abort();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (retryErr) {
              console.error('Failed speech recognition retry start:', retryErr);
              setSpeechError('Could not start microphone listening.');
              setIsListening(false);
            }
          }, 100);
        } catch (abortErr) {
          setSpeechError('Could not start microphone listening.');
          setIsListening(false);
        }
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onPhraseSubmit(inputText);
  };

  const handlePresetClick = (preset: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onPhraseSubmit(preset);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-3.5 shadow-md flex flex-col gap-2.5">
      <div className="flex items-center gap-2 border-b border-slate-800/60 pb-1.5">
        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
        <h2 className="font-sans font-medium text-slate-200 text-xs tracking-wide uppercase">Environmental Synth</h2>
      </div>

      {/* Preset quick buttons */}
      <div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            id="btn_preset_sunshine"
            onClick={() => handlePresetClick('Sunshine')}
            className="flex items-center justify-center gap-1 p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 hover:border-amber-500/40 duration-200 cursor-pointer text-amber-200 text-[11px] font-sans transition-all text-center"
          >
            <CloudSun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium truncate">Sunshine</span>
          </button>
          
          <button
            id="btn_preset_star"
            onClick={() => handlePresetClick('Star')}
            className="flex items-center justify-center gap-1 p-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 hover:border-indigo-500/40 duration-200 cursor-pointer text-indigo-200 text-[11px] font-sans transition-all text-center"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-medium truncate">Star</span>
          </button>

          <button
            id="btn_preset_forest"
            onClick={() => handlePresetClick('Forest')}
            className="flex items-center justify-center gap-1 p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/40 duration-200 cursor-pointer text-emerald-200 text-[11px] font-sans transition-all text-center"
          >
            <Trees className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-medium truncate">Forest</span>
          </button>
        </div>
      </div>

      {/* Mic Trigger Row */}
      <div className="flex items-center gap-2.5 p-2 bg-slate-950/30 rounded-xl border border-slate-800/45">
        <div className="relative flex items-center justify-center shrink-0">
          {/* Glowing Animated Ripple rings */}
          <AnimatePresence>
            {isListening && !isProcessing && (
              <>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.5 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                  className="absolute w-9 h-9 bg-indigo-500/25 rounded-full"
                />
              </>
            )}
          </AnimatePresence>

          <button
            id="btn_mic_action"
            onClick={toggleListening}
            disabled={isProcessing}
            className={`h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm z-10 shrink-0 overflow-hidden ${
              isProcessing
                ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] text-amber-50 cursor-wait w-auto px-3.5 gap-2'
                : isListening 
                  ? 'w-9 bg-red-500 hover:bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.4)] text-white cursor-pointer' 
                  : 'w-9 bg-indigo-600 hover:bg-indigo-500 text-indigo-100 cursor-pointer'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-white" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Processing..</span>
              </>
            ) : isListening ? (
              <Volume2 className="w-4 h-4 animate-pulse text-white" />
            ) : (
              <Mic className="w-4 h-4 text-white" />
            )}
          </button>
        </div>

        <div className="flex-1 text-left min-w-0">
          <p className="font-sans text-[11px] font-semibold text-slate-300 truncate transition-all">
            {isProcessing ? 'Synthesizing...' : isListening ? 'Listening for voice...' : 'Tap Mic to speak phrase'}
          </p>
          {speechError && !isProcessing ? (
            <p className="text-[9px] text-rose-400 font-sans truncate">
              {speechError}
            </p>
          ) : (
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">
              {isProcessing ? 'Please wait' : 'HTML5 speech API'}
            </p>
          )}
        </div>
      </div>

      {/* Manual Search / Input */}
      <form onSubmit={handleTextSubmit} className="space-y-1">
        <div className="relative flex items-center bg-slate-950/60 rounded-xl border border-slate-800 focus-within:border-indigo-500/50 transition-colors p-1 shadow-inner">
          <input
            id="input_voice_text"
            type="text"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={isProcessing}
            placeholder='Or type e.g. "rainy night"...'
            className="w-full bg-transparent border-none text-slate-200 outline-none text-[11px] px-2 py-0.5 placeholder:text-slate-600"
          />
          <button
            id="btn_send_voice_text"
            type="submit"
            disabled={isProcessing || !inputText.trim()}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-indigo-100 disabled:opacity-40 hover:scale-105 duration-200 transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </form>
      
      {/* Current vocal parameter description */}
      <div className="flex items-center gap-1.5 text-[10px] font-sans text-indigo-300/80 bg-slate-950/20 px-2 py-1.5 rounded-lg border border-slate-800/30">
        <MessageSquareHeart className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
        <span className="truncate">Active: <b className="text-slate-100 font-mono">"{currentPhrase}"</b></span>
      </div>
    </div>
  );
};

export default VoiceController;
