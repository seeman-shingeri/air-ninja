import React, { useState } from 'react';
import { GameMode, GameStats } from '../types';
import { LeaderboardStorage } from '../storage/LeaderboardStorage';
import { RotateCcw, Home, Trophy, Check, Flame, Bomb as BombIcon } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  mode: GameMode;
  onRestart: () => void;
  onReturnToMenu: () => void;
  onOpenLeaderboard: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  mode,
  onRestart,
  onReturnToMenu,
  onOpenLeaderboard,
}) => {
  const [nickname, setNickname] = useState('Ninja');
  const [savedRank, setSavedRank] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaved) return;

    const result = LeaderboardStorage.addScore(
      nickname,
      stats.score,
      mode,
      stats.maxCombo,
      stats.totalSlices,
      stats.totalBombsHit
    );

    setSavedRank(result.rank);
    setIsSaved(true);
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-white select-none">
      <div className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#101726] to-[#080d18] border border-cyan-500/30 p-6 md:p-8 shadow-[0_0_50px_rgba(0,229,255,0.2)] flex flex-col items-center text-center">
        {/* Banner */}
        <span className="text-xs font-bold tracking-widest uppercase text-cyan-400 mb-1">
          {mode.toUpperCase()} ROUND COMPLETE
        </span>
        <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-200 to-cyan-300">
          GAME OVER
        </h2>

        {/* Big Score Card */}
        <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-full flex flex-col items-center">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            Final Score
          </span>
          <span className="text-5xl font-black text-white tracking-tight mt-1 text-cyan-300 drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]">
            {stats.score}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-6">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Total Slices</span>
            <span className="text-xl font-bold text-white mt-1">{stats.totalSlices}</span>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] text-amber-400 uppercase font-semibold">
              <Flame size={12} /> Max Combo
            </div>
            <span className="text-xl font-bold text-amber-300 mt-1">x{stats.maxCombo}</span>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] text-red-400 uppercase font-semibold">
              <BombIcon size={12} /> Bombs Hit
            </div>
            <span className="text-xl font-bold text-red-300 mt-1">{stats.totalBombsHit}</span>
          </div>
        </div>

        {/* Fruit Breakdown */}
        <div className="w-full bg-black/30 rounded-xl p-3 border border-white/5 mb-6 text-xs text-gray-300 flex justify-between items-center px-4">
          <span>🍉 {stats.fruitBreakdown.watermelon}</span>
          <span>🍊 {stats.fruitBreakdown.orange}</span>
          <span>🍎 {stats.fruitBreakdown.apple}</span>
          <span>🍌 {stats.fruitBreakdown.banana}</span>
          <span>🍓 {stats.fruitBreakdown.strawberry}</span>
          <span>🍍 {stats.fruitBreakdown.pineapple}</span>
        </div>

        {/* Local Leaderboard Submission */}
        {!isSaved ? (
          <form onSubmit={handleSaveScore} className="w-full flex gap-2 mb-6">
            <input
              type="text"
              maxLength={16}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your Ninja Name"
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-white/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Trophy size={15} /> Save High Score
            </button>
          </form>
        ) : (
          <div className="w-full p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 mb-6">
            <Check size={16} />
            <span>Saved to Local Leaderboard! Rank #{savedRank}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 w-full">
          <button
            onClick={onRestart}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-gray-950 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
          >
            <RotateCcw size={16} /> Play Again
          </button>
          <button
            onClick={onOpenLeaderboard}
            className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <Trophy size={16} /> Scores
          </button>
          <button
            onClick={onReturnToMenu}
            className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <Home size={16} /> Menu
          </button>
        </div>
      </div>
    </div>
  );
};
