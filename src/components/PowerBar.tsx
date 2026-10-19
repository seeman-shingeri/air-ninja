import React from 'react';
import { ActivePowerState, SpecialPower } from '../types';
import { POWER_CONFIGS } from '../config/gameConfig';
import { Clock, Zap, Bomb as BombIcon } from 'lucide-react';

interface PowerBarProps {
  powers: Record<SpecialPower, ActivePowerState>;
  onTriggerPower: (power: SpecialPower) => void;
}

export const PowerBar: React.FC<PowerBarProps> = ({ powers, onTriggerPower }) => {
  const powerIcons: Record<SpecialPower, React.ReactNode> = {
    slow_motion: <Clock size={18} className="text-cyan-400 sm:w-5 sm:h-5" />,
    double_score: <Zap size={18} className="text-amber-400 sm:w-5 sm:h-5" />,
    bomb_mode: <BombIcon size={18} className="text-red-400 sm:w-5 sm:h-5" />,
  };

  const hotkeys: Record<SpecialPower, string> = {
    slow_motion: '1',
    double_score: '2',
    bomb_mode: '3',
  };

  return (
    <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1.5 sm:gap-3 max-w-[98vw] px-1 select-none pointer-events-auto">
      {(Object.keys(powers) as SpecialPower[]).map((powerKey) => {
        const state = powers[powerKey];
        const config = POWER_CONFIGS[powerKey];
        const isCooldown = state.cooldownRemaining > 0;
        const isActive = state.active;

        return (
          <button
            key={powerKey}
            disabled={isCooldown}
            onClick={() => onTriggerPower(powerKey)}
            className={`relative group px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl backdrop-blur-md border transition-all duration-200 flex items-center gap-2 sm:gap-3 ${
              isActive
                ? 'bg-white/20 border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-102'
                : isCooldown
                ? 'bg-black/50 border-white/5 opacity-60 cursor-not-allowed'
                : 'bg-black/60 hover:bg-black/80 border-white/15 hover:border-white/30 hover:scale-102 active:scale-95 shadow-lg'
            }`}
          >
            {/* Active pulse dot */}
            <div className="relative flex items-center justify-center">
              {powerIcons[powerKey]}
              {isActive && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                </span>
              )}
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-white tracking-wide">{config.label}</span>
                <span className="hidden sm:inline text-[10px] font-mono px-1 rounded bg-white/10 text-gray-300">
                  {hotkeys[powerKey]}
                </span>
              </div>

              <span className="text-[9px] sm:text-[10px] text-gray-400">
                {isActive ? (
                  <span className="text-cyan-300 font-bold">
                    {state.remainingTime.toFixed(1)}s
                  </span>
                ) : isCooldown ? (
                  <span className="text-gray-500">{state.cooldownRemaining.toFixed(0)}s wait</span>
                ) : (
                  <>
                    <span className="hidden sm:inline">Say: &quot;{config.voiceCommand}&quot;</span>
                    <span className="sm:hidden text-cyan-300">Tap / Say</span>
                  </>
                )}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
