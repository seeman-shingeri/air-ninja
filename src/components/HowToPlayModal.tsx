import React from 'react';
import { X, Hand, Mic, Bomb, Zap, Keyboard } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-white select-none">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-gradient-to-b from-[#101726] to-[#080d18] border border-cyan-500/30 p-6 md:p-8 shadow-[0_0_50px_rgba(0,229,255,0.2)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
              HOW TO PLAY AIR NINJA
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Master the art of touchless slicing & voice powers</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Card 1: Hand Blade Controls */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300">
              <Hand size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wide">
                1. Webcam Air Blade Slicing
              </h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Position your webcam so your hand is clearly visible. Raise your <strong>index finger</strong> like a blade. Move your fingertip quickly through flying fruits to slice them in half!
                <br />
                <span className="text-gray-400">Mouse/Touch fallback is always available if your webcam is off.</span>
              </p>
            </div>
          </div>

          {/* Card 2: Voice-Activated Powers */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-300">
              <Mic size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wide">
                2. Voice Command Powers
              </h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Activate ninja powers by speaking aloud into your microphone:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                <div className="p-2 rounded-lg bg-black/40 border border-cyan-500/30">
                  <div className="text-[11px] font-bold text-cyan-300">&quot;Slow motion!&quot;</div>
                  <div className="text-[10px] text-gray-400">Slows physics to 0.35x</div>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-amber-500/30">
                  <div className="text-[11px] font-bold text-amber-300">&quot;Double score!&quot;</div>
                  <div className="text-[10px] text-gray-400">2x points for 8 seconds</div>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-red-500/30">
                  <div className="text-[11px] font-bold text-red-300">&quot;Bomb mode!&quot;</div>
                  <div className="text-[10px] text-gray-400">Surges bomb frequency</div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Manual buttons (hotkeys 1, 2, 3) are also on screen.
              </p>
              <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                <strong className="text-cyan-300">Voice Slice:</strong> shout a fruit&apos;s name, like
                &quot;Watermelon!&quot; or &quot;Banana!&quot;, to instantly cut that fruit on screen.
              </p>
            </div>
          </div>

          {/* Card 3: Bombs and Combos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400">
                <Bomb size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-300 uppercase">Beware of Bombs!</h4>
                <p className="text-xs text-gray-300 mt-1">
                  Slicing a bomb detonates it! You lose 1 life in Classic mode and suffer a 10-point penalty.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Zap size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-300 uppercase">Multi-Fruit Combos</h4>
                <p className="text-xs text-gray-300 mt-1">
                  Slice 3 or more fruits in rapid succession (within 380ms) to trigger 2x, 3x, 4x, and 5x score multipliers!
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Keyboard Shortcuts */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300">
              <Keyboard size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-300 uppercase">Keyboard Shortcuts</h4>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <span className="px-2 py-1 rounded bg-black/50 border border-white/10 font-mono">
                  Esc / P: Pause
                </span>
                <span className="px-2 py-1 rounded bg-black/50 border border-white/10 font-mono">
                  1: Slow Mo
                </span>
                <span className="px-2 py-1 rounded bg-black/50 border border-white/10 font-mono">
                  2: Double Score
                </span>
                <span className="px-2 py-1 rounded bg-black/50 border border-white/10 font-mono">
                  3: Bomb Mode
                </span>
                <span className="px-2 py-1 rounded bg-black/50 border border-white/10 font-mono">
                  M: Mute Audio
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
          >
            Got it, Let&apos;s Play
          </button>
        </div>
      </div>
    </div>
  );
};
