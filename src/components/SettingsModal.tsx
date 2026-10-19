import React from 'react';
import { PerformanceMode, Sensitivity, UserSettings } from '../types';
import { X, Volume2, Sliders, Monitor, Eye, Trash2, Check } from 'lucide-react';

interface SettingsModalProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onResetData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
  onClose,
}) => {
  const handleSensitivityChange = (sensitivity: Sensitivity) => {
    onUpdateSettings({ ...settings, sensitivity });
  };

  const handlePerformanceChange = (performanceMode: PerformanceMode) => {
    onUpdateSettings({ ...settings, performanceMode });
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-white select-none">
      <div className="w-full max-w-xl max-h-[85vh] rounded-3xl bg-gradient-to-b from-[#101726] to-[#080d18] border border-cyan-500/30 p-6 md:p-8 shadow-[0_0_50px_rgba(0,229,255,0.2)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
              SETTINGS & PREFERENCES
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Customize hand tracking, audio, and graphics</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
          {/* Audio Volume */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-300">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Volume2 size={16} /> Sound Effects Volume
              </span>
              <span className="font-mono text-cyan-400">{Math.round(settings.soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundVolume}
              onChange={(e) =>
                onUpdateSettings({ ...settings, soundVolume: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Tracking Sensitivity */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <Sliders size={16} /> Hand Tracking Sensitivity
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as Sensitivity[]).map((level) => (
                <button
                  key={level}
                  onClick={() => handleSensitivityChange(level)}
                  className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                    settings.sensitivity === level
                      ? 'bg-cyan-500 text-gray-950 border-cyan-400 shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">
              Higher sensitivity increases responsiveness to rapid wrist & finger swipes.
            </p>
          </div>

          {/* Camera Mirroring & Voice Toggles */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Mirror Webcam Preview</div>
                <div className="text-[11px] text-gray-400">Flip camera horizontally like a mirror</div>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings({ ...settings, mirrorCamera: !settings.mirrorCamera })
                }
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  settings.mirrorCamera ? 'bg-cyan-500' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.mirrorCamera ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Voice Commands</div>
                <div className="text-[11px] text-gray-400">Listen for &quot;Slow motion!&quot;, &quot;Double score!&quot;</div>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings({ ...settings, voiceEnabled: !settings.voiceEnabled })
                }
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  settings.voiceEnabled ? 'bg-cyan-500' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.voiceEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Graphics & Performance Mode */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <Monitor size={16} /> Performance & Visuals
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as PerformanceMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handlePerformanceChange(mode)}
                  className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                    settings.performanceMode === mode
                      ? 'bg-cyan-500 text-gray-950 border-cyan-400 shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400">
              Low mode reduces particles and DPR for older hardware and battery saving.
            </p>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Eye size={15} className="text-cyan-400" /> Reduced Motion
              </div>
              <div className="text-[11px] text-gray-400">Dim screen flashes and disable screen shakes</div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ ...settings, reducedMotion: !settings.reducedMotion })
              }
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                settings.reducedMotion ? 'bg-cyan-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.reducedMotion ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reset Saved Data */}
          <div className="pt-3 border-t border-white/10">
            <button
              onClick={onResetData}
              className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Trash2 size={15} /> Reset All Local Data & High Scores
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Check size={16} /> Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
