import React from 'react';
import { GameMode, GameStats } from '../types';
import { VoiceStatus } from '../voice/VoiceManager';
import { Heart, Pause, Play, Volume2, VolumeX, Mic, MicOff, Camera, VideoOff, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface HUDProps {
  stats: GameStats;
  mode: GameMode;
  isPaused: boolean;
  onTogglePause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  voiceStatus: VoiceStatus;
  voiceTranscript?: string;
  voiceFeedback?: { message: string; success: boolean } | null;
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
  voiceFeedback,
  voiceError,
  isCameraActive,
  isHandDetected,
  onExitToMenu,
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 p-2 sm:p-4 pointer-events-none flex justify-between items-start select-none z-20 max-w-full">
      {/* Voice feedback & transcript pill */}
      {(voiceFeedback || voiceTranscript || voiceError) && (
        <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 max-w-[92vw] px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-xs flex items-center gap-2 shadow-2xl transition-all duration-200 pointer-events-auto">
          {voiceFeedback ? (
            <>
              {voiceFeedback.success ? (
                <Sparkles size={14} className="text-cyan-400 shrink-0" />
              ) : (
                <AlertCircle size={14} className="text-amber-400 shrink-0" />
              )}
              <span
                className={`font-bold tracking-wide truncate ${
                  voiceFeedback.success ? 'text-cyan-300' : 'text-amber-300'
                }`}
              >
                {voiceFeedback.message}
              </span>
            </>
          ) : voiceError ? (
            <>
              <MicOff size={14} className="text-red-300 shrink-0" />
              <span className="text-red-200 truncate">{voiceError}</span>
            </>
          ) : (
            <>
              <Mic size={14} className="text-emerald-300 shrink-0 animate-pulse" />
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
              {Math.ceil(stats.timer)}s
            </span>
          </div>
        )}

        {mode === 'endless' && (
          <div className="px-3 py-1 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
            <span className="text-xs uppercase tracking-wider text-cyan-400 font-bold">Endless Zen</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto">
        {/* Camera Tracking Indicator */}
        <div
          title={isCameraActive ? (isHandDetected ? 'Fingertip Tracked' : 'Searching for Hand') : 'Touch/Mouse Blade'}
          className={`p-1.5 sm:p-2 rounded-xl border backdrop-blur-md flex items-center gap-1 text-xs transition-colors ${
            isCameraActive
              ? isHandDetected
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                : 'bg-amber-500/20 border-amber-400/50 text-amber-300'
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
          title={`Voice status: ${voiceStatus}${voiceError ? ` (${voiceError})` : ''}`}
          className={`p-1.5 sm:p-2 rounded-xl border backdrop-blur-md flex items-center gap-1.5 text-xs transition-colors ${
            voiceStatus === 'listening'
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
              : voiceStatus === 'reconnecting'
              ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 animate-pulse'
              : voiceStatus === 'error' || voiceStatus === 'permission_denied'
              ? 'bg-red-500/20 border-red-400/40 text-red-300'
              : 'bg-black/40 border-white/10 text-gray-400'
          }`}
        >
          {voiceStatus === 'listening' ? (
            <Mic size={15} className="text-emerald-400 animate-pulse" />
          ) : voiceStatus === 'reconnecting' ? (
            <RefreshCw size={15} className="animate-spin text-amber-400" />
          ) : (
            <MicOff size={15} />
          )}
          <span className="hidden lg:inline font-medium">
            {voiceStatus === 'listening'
              ? 'Voice ON'
              : voiceStatus === 'reconnecting'
              ? 'Reconnecting'
              : voiceStatus === 'permission_denied'
              ? 'Mic Blocked'
              : voiceStatus === 'unsupported'
              ? 'No Voice API'
              : 'Voice Off'}
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
