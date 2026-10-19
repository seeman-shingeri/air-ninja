import React, { useState } from 'react';
import { GameMode, LeaderboardEntry } from '../types';
import { LeaderboardStorage } from '../storage/LeaderboardStorage';
import { X, Trophy, Medal, Trash2, Calendar, Flame } from 'lucide-react';

interface LeaderboardModalProps {
  initialMode?: GameMode;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  initialMode = 'classic',
  onClose,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>(initialMode);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => LeaderboardStorage.getScores(initialMode));

  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode);
    setEntries(LeaderboardStorage.getScores(mode));
  };

  const handleClear = () => {
    if (window.confirm(`Clear all high scores for ${selectedMode.toUpperCase()} mode?`)) {
      LeaderboardStorage.clearScores(selectedMode);
      setEntries([]);
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-white select-none">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-gradient-to-b from-[#101726] to-[#080d18] border border-cyan-500/30 p-6 md:p-8 shadow-[0_0_50px_rgba(0,229,255,0.2)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Trophy size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-400">
                LOCAL LEADERBOARD
              </h2>
              <p className="text-[11px] text-gray-400">
                Scores persisted locally in this browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex gap-2 my-4">
          {(['classic', 'timed', 'endless'] as GameMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleSelectMode(mode)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                selectedMode === mode
                  ? 'bg-cyan-500 text-gray-950 border-cyan-400 shadow-md font-extrabold'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Scores Table */}
        <div className="flex-1 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <Medal size={40} className="text-gray-600 mb-2" />
              <p className="text-sm font-semibold">No high scores recorded yet for {selectedMode} mode.</p>
              <p className="text-xs text-gray-500 mt-1">Play a round to claim the #1 spot!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const rankBadgeColor =
                  rank === 1
                    ? 'bg-amber-400 text-gray-950 font-black'
                    : rank === 2
                    ? 'bg-slate-300 text-gray-950 font-black'
                    : rank === 3
                    ? 'bg-amber-700 text-white font-black'
                    : 'bg-white/10 text-gray-300';

                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
                      isTop3
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${rankBadgeColor}`}
                      >
                        #{rank}
                      </span>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white tracking-wide">
                          {entry.nickname}
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Flame size={10} className="text-amber-400" /> Max x{entry.maxCombo}
                          </span>
                          <span>•</span>
                          <span>{entry.slices} slices</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Calendar size={10} />
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-cyan-300 font-mono">
                        {entry.score}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase">Points</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          {entries.length > 0 ? (
            <button
              onClick={handleClear}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={14} /> Clear {selectedMode} scores
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
