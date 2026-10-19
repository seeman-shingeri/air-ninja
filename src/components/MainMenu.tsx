import React from 'react';
import { GameMode, UserSettings } from '../types';
import { Play, HelpCircle, Settings, Trophy, Camera, MousePointer, Sparkles } from 'lucide-react';

interface MainMenuProps {
  onStartGame: (mode: GameMode) => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  settings: UserSettings;
  onToggleCameraControl: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenHowToPlay,
  onOpenSettings,
  onOpenLeaderboard,
  selectedMode,
  onSelectMode,
  settings,
  onToggleCameraControl,
}) => {
  const modes: { id: GameMode; title: string; desc: string; badge: string; color: string }[] = [
    {
      id: 'classic',
      title: 'Classic Mode',
      desc: '3 Lives. Slicing bombs or missing fruits costs a life. How long can you survive?',
      badge: 'Arcade Standard',
      color: 'from-cyan-500/20 to-blue-600/20 border-cyan-500/40',
    },
    {
      id: 'timed',
      title: 'Timed Challenge',
      desc: '60 Seconds on the clock! Unlimited lives, bombs deduct points. Blitz for high score!',
      badge: '60s Frenzy',
      color: 'from-amber-500/20 to-orange-600/20 border-amber-500/40',
    },
    {
      id: 'endless',
      title: 'Endless Dojo',
      desc: 'No timers, no game over. Perfect for honing your air blade slicing and combos!',
      badge: 'Zen Training',
      color: 'from-emerald-500/20 to-teal-600/20 border-emerald-500/40',
    },
  ];

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-4 sm:p-8 text-white select-none bg-gradient-to-b from-[#080c16]/95 via-[#0a1020]/98 to-[#050811] backdrop-blur-sm overflow-y-auto min-h-dvh">
      {/* Top Banner / Title */}
      <div className="flex flex-col items-center text-center mt-2 sm:mt-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[11px] sm:text-xs font-semibold tracking-wider uppercase mb-2">
          <Sparkles size={13} className="text-cyan-400 animate-spin" />
          <span>Next-Gen Air Hand Tracking</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-200 to-indigo-400 drop-shadow-[0_4px_20px_rgba(0,229,255,0.4)]">
          AIR NINJA
        </h1>
        <p className="text-xs sm:text-base font-bold tracking-widest text-cyan-400 uppercase mt-0.5">
          Slice Without Touching
        </p>
      </div>

      {/* Mode Selector Cards */}
      <div className="w-full max-w-4xl my-3 sm:my-6">
        <div className="text-center mb-2 sm:mb-3">
          <span className="text-[11px] sm:text-xs font-bold tracking-widest text-gray-400 uppercase">
            Select Game Mode
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4">
          {modes.map((m) => {
            const isSelected = selectedMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMode(m.id)}
                className={`p-3.5 sm:p-5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? `bg-gradient-to-b ${m.color} ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(0,229,255,0.25)] scale-101`
                    : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-black/40 text-gray-300 border border-white/10">
                      {m.badge}
                    </span>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-gray-300 mt-1 sm:mt-2 leading-relaxed">{m.desc}</p>
                </div>

                <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-cyan-300">
                    {isSelected ? 'Selected' : 'Tap to Select'}
                  </span>
                  <Play size={13} className={isSelected ? 'text-cyan-300' : 'text-gray-500'} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Method Selector & Play Button */}
      <div className="flex flex-col items-center gap-3 w-full max-w-md my-2">
        {/* Toggle between Hand Tracking and Mouse Fallback */}
        <div className="w-full flex items-center justify-between p-1.5 rounded-2xl bg-black/60 border border-white/15 backdrop-blur-md">
          <button
            onClick={onToggleCameraControl}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              settings.cameraEnabled
                ? 'bg-cyan-500 text-gray-950 shadow-md font-extrabold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera size={15} /> Air Hand Blade
          </button>
          <button
            onClick={onToggleCameraControl}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              !settings.cameraEnabled
                ? 'bg-cyan-500 text-gray-950 shadow-md font-extrabold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MousePointer size={15} /> Touch / Mouse
          </button>
        </div>

        {/* Primary Play Button */}
        <button
          onClick={() => onStartGame(selectedMode)}
          className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-gray-950 font-black text-base sm:text-lg tracking-wider uppercase transition-all duration-200 transform hover:scale-102 active:scale-95 shadow-[0_0_35px_rgba(0,229,255,0.45)] flex items-center justify-center gap-2.5"
        >
          <Play size={20} className="fill-gray-950" />
          START {selectedMode.toUpperCase()}
        </button>

        {/* Secondary Navigation */}
        <div className="flex items-center justify-center gap-2 w-full">
          <button
            onClick={onOpenHowToPlay}
            className="flex-1 py-2 sm:py-2.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] sm:text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1"
          >
            <HelpCircle size={14} /> Guide
          </button>
          <button
            onClick={onOpenLeaderboard}
            className="flex-1 py-2 sm:py-2.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] sm:text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1"
          >
            <Trophy size={14} /> Scores
          </button>
          <button
            onClick={onOpenSettings}
            className="flex-1 py-2 sm:py-2.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] sm:text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1"
          >
            <Settings size={14} /> Settings
          </button>
        </div>
      </div>

      <div className="text-[10px] text-gray-500 text-center pb-2">
        Privacy Notice: Camera inference runs 100% locally in your browser. No video is recorded or sent to any server.
      </div>
    </div>
  );
};
