import React from 'react';
import { GameMode, GameStats } from '../types';
import { Heart, Pause, Play, Volume2, VolumeX, Mic, MicOff, Camera, VideoOff } from 'lucide-react';

interface HUDProps {
  stats: GameStats;
  mode: GameMode;
  isPaused: boolean;
  onTogglePause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  voiceStatus: 'listening' | 'idle' | 'error' | 'unsupported';
  voiceTranscript?: string;
  voiceError?: string;
  isCameraActive: boolean;
  isHandDetected: boolean;
  onExitToMenu: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  mode,
  isPaused,
  onTogglePause,
  isMuted,
  onToggleMute,
  voiceStatus,
  voiceTranscript,
  voiceError,
  isCameraActive,
  isHandDetected,
  onExitToMenu,
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 p-2 sm:p-4 pointer-events-none flex justify-between items-start select-none z-20 max-w-full">
      {/* What the microphone heard, so players can see whether commands are recognized */}
      {(voiceTranscript || voiceError) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 max-w-[90vw] px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs flex items-center gap-2">
          {voiceError ? (
            <>
              <MicOff size={14} className="text-red-300 shrink-0" />
              <span className="text-red-200 truncate">{voiceError}</span>
            </>
          ) : (
            <>
              <Mic size={14} className="text-emerald-300 shrink-0" />
              <span className="text-gray-400">Heard:</span>
              <span className="text-white font-semibold truncate">&quot;{voiceTranscript}&quot;</span>
            </>
          )}
        </div>
      )}
      {/* Left: Score & Combo */}
      <div className="flex flex-col gap-0.5 sm:gap-1 pointer-events-auto">
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-cyan-400">Score</span>
          <span className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,229,255,0.4)]">
            {stats.score}
          </span>
        </div>

        {stats.comboMultiplier > 1 && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/30 border border-amber-400/50 animate-pulse">
            <span className="text-[10px] sm:text-xs font-bold text-amber-300">COMBO x{stats.comboMultiplier}</span>
            <span className="hidden sm:inline text-[10px] text-amber-200">({stats.comboCount})</span>
          </div>
        )}
      </div>

      {/* Center: Lives or Timer */}
      <div className="flex items-center gap-1.5 sm:gap-3 pointer-events-auto">
        {mode === 'classic' && (
          <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
            {[1, 2, 3].map((heartIndex) => (
              <Heart
                key={heartIndex}
                size={18}
                className={`transition-all duration-300 sm:w-[22px] sm:h-[22px] ${
                  heartIndex <= stats.lives
                    ? 'fill-red-500 text-red-500 scale-100 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                    : 'text-gray-600 scale-75 opacity-40'
                }`}
              />
            ))}
          </div>
        )}

        {mode === 'timed' && (
          <div className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-300">Time</span>
            <span
              className={`text-lg sm:text-2xl font-bold font-mono ${
                stats.timer <= 10 ? 'text-red-400 animate-ping' : 'text-white'
              }`}
            >
              {Math.max(0, Math.ceil(stats.timer))}s
            </span>
          </div>
        )}

        {mode === 'endless' && (
          <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-black/40 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            Endless Dojo ∞
          </div>
        )}
      </div>

      {/* Right: Controls & Sensors Status */}
      <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Camera Indicator */}
        <div
          title={isCameraActive ? (isHandDetected ? 'Camera active — hand detected' : 'Camera active — looking for hand') : 'Touch/Mouse mode'}
          className={`p-1.5 sm:p-2 rounded-xl border backdrop-blur-md flex items-center gap-1 text-xs transition-colors ${
            isCameraActive
              ? isHandDetected
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
              : 'bg-black/40 border-white/10 text-gray-400'
          }`}
        >
          {isCameraActive ? <Camera size={15} /> : <VideoOff size={15} />}
          <span className="hidden lg:inline font-medium">
            {isCameraActive ? (isHandDetected ? 'Tracked' : 'Searching') : 'Touch'}
          </span>
        </div>

        {/* Voice Recognition Indicator */}
        <div
          title={`Voice command: ${voiceStatus}`}
          className={`p-1.5 sm:p-2 rounded-xl border backdrop-blur-md flex items-center gap-1 text-xs transition-colors ${
            voiceStatus === 'listening'
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 animate-pulse'
              : voiceStatus === 'error'
              ? 'bg-red-500/20 border-red-400/40 text-red-300'
              : 'bg-black/40 border-white/10 text-gray-400'
          }`}
        >
          {voiceStatus === 'listening' ? <Mic size={15} /> : <MicOff size={15} />}
          <span className="hidden lg:inline font-medium">
            {voiceStatus === 'listening' ? 'Voice ON' : 'Off'}
          </span>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          className="p-1.5 sm:p-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20 text-white backdrop-blur-md transition-all active:scale-95"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Pause Button */}
        <button
          onClick={onTogglePause}
          aria-label={isPaused ? 'Resume Game' : 'Pause Game'}
          className="p-1.5 sm:p-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20 text-white backdrop-blur-md transition-all active:scale-95"
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>

        {/* Exit Button */}
        <button
          onClick={onExitToMenu}
          className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-300 text-[11px] sm:text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
        >
          Exit
        </button>
      </div>
    </div>
  );
};
