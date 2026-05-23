import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, MessageSquareHeart, Sparkles, Volume2, CloudSun, Moon, Trees } from 'lucide-react';
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
  const [recognition, setRecognition] = useState<any>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          onPhraseSubmit(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Feel free to type instead.');
        } else if (event.error === 'network') {
          setSpeechError('Speech network connection failed.');
        } else {
          setSpeechError(`Speech matching error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      setSpeechError('Speech recognition is not natively supported in this browser. Please type below.');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onPhraseSubmit(inputText);
    setInputText('');
  };

  const handlePresetClick = (preset: string) => {
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
            {isListening && (
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
            className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.4)] text-white' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-indigo-100'
            }`}
          >
            {isListening ? (
              <Volume2 className="w-4 h-4 animate-pulse text-white" />
            ) : (
              <Mic className="w-4 h-4 text-white" />
            )}
          </button>
        </div>

        <div className="flex-1 text-left min-w-0">
          <p className="font-sans text-[11px] font-semibold text-slate-300 truncate">
            {isListening ? 'Listening for voice...' : 'Tap Mic to speak phrase'}
          </p>
          {speechError ? (
            <p className="text-[9px] text-rose-400 font-sans truncate">
              {speechError}
            </p>
          ) : (
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">
              HTML5 speech API
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
            onChange={(e) => setInputText(e.target.value)}
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
