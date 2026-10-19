import React, { useEffect, useState, useRef } from 'react';
import { CameraStatus } from '../tracking/CameraManager';
import { TrackerStatus } from '../tracking/HandTracker';
import { Point2D } from '../types';
import { RefreshCw, MousePointer, CheckCircle2, AlertCircle, Play, Sparkles } from 'lucide-react';

interface CalibrationOverlayProps {
  cameraStatus: CameraStatus;
  trackerStatus: TrackerStatus;
  errorMessage?: string;
  mediaStream: MediaStream | null;
  currentFingertip: Point2D | null;
  isHandDetected: boolean;
  onCalibrationComplete: () => void;
  onSwitchToMouse: () => void;
  onRetryCamera: () => void;
  isMirrored: boolean;
}

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  cameraStatus,
  trackerStatus,
  errorMessage,
  mediaStream,
  currentFingertip,
  isHandDetected,
  onCalibrationComplete,
  onSwitchToMouse,
  onRetryCamera,
  isMirrored,
}) => {
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isCalibrated, setIsCalibrated] = useState(false);
  const targetCircleRef = useRef<HTMLDivElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Sync stream to preview video safely
  useEffect(() => {
    const video = previewVideoRef.current;
    if (video && mediaStream) {
      if (video.srcObject !== mediaStream) {
        video.srcObject = mediaStream;
        video.play().catch(() => {});
      }
    }
  }, [mediaStream]);

  // Check if fingertip is inside center calibration circle using physical DOM bounding rect
  useEffect(() => {
    if (isCalibrated) return;

    if (!currentFingertip || !targetCircleRef.current) {
      const resetTimer = setTimeout(() => {
        setHoldProgress((p) => Math.max(0, p - 10));
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const rect = targetCircleRef.current.getBoundingClientRect();
    const targetCenterX = rect.left + rect.width / 2;
    const targetCenterY = rect.top + rect.height / 2;
    const targetRadius = rect.width / 2 + 10; // Slight padding for ease of mobile hit

    const dx = currentFingertip.x - targetCenterX;
    const dy = currentFingertip.y - targetCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= targetRadius) {
      const interval = setInterval(() => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsCalibrated(true);
            return 100;
          }
          return prev + 6;
        });
      }, 40);

      return () => clearInterval(interval);
    } else {
      const decayTimer = setTimeout(() => {
        setHoldProgress((p) => Math.max(0, p - 6));
      }, 0);
      return () => clearTimeout(decayTimer);
    }
  }, [currentFingertip, isCalibrated]);

  return (
    <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 text-white select-none overflow-y-auto min-h-dvh">
      {/* Top Header */}
      <div className="flex flex-col items-center text-center mt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold tracking-wider uppercase mb-1">
          <Sparkles size={13} className="text-cyan-400" />
          <span>Hand Calibration</span>
        </div>
        <h2 className="text-xl sm:text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
          AIR BLADE CALIBRATION
        </h2>
        <p className="text-[11px] sm:text-xs text-gray-300 max-w-sm sm:max-w-md mt-0.5 leading-snug">
          Raise your index finger. Move your fingertip into the target ring to calibrate, or tap &quot;Start Arena&quot; anytime!
        </p>
      </div>

      {/* Responsive Webcam Container */}
      <div className="relative w-full max-w-[340px] sm:max-w-md md:max-w-xl aspect-[3/4] sm:aspect-video rounded-3xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(0,229,255,0.25)] bg-gray-950 flex items-center justify-center my-auto">
        <video
          ref={previewVideoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isMirrored ? 'scale-x-[-1]' : ''
          }`}
        />

        {/* Video overlays */}
        {cameraStatus === 'requesting' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center gap-3">
            <RefreshCw className="animate-spin text-cyan-400" size={36} />
            <p className="text-sm font-bold text-cyan-200">Requesting camera access...</p>
            <p className="text-xs text-gray-400">Please tap &quot;Allow&quot; in your browser</p>
          </div>
        )}

        {(cameraStatus === 'permission_denied' ||
          cameraStatus === 'busy' ||
          cameraStatus === 'not_found' ||
          cameraStatus === 'timeout' ||
          cameraStatus === 'error') && (
          <div className="absolute inset-0 bg-black/90 p-5 flex flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="text-red-400" size={42} />
            <div className="max-w-sm">
              <h3 className="text-base font-bold text-red-300">Camera Unavailable</h3>
              <p className="text-xs text-gray-300 mt-1">{errorMessage || 'Could not access camera feed.'}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full max-w-xs">
              <button
                onClick={onRetryCamera}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <RefreshCw size={14} /> Retry Camera
              </button>
              <button
                onClick={onSwitchToMouse}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <MousePointer size={14} /> Play with Touch
              </button>
            </div>
          </div>
        )}

        {cameraStatus === 'ready' && trackerStatus === 'loading' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="animate-spin text-cyan-400" size={40} />
            <p className="text-sm font-medium text-cyan-200">Loading hand tracking model...</p>
            <p className="text-xs text-gray-400">First load downloads a few MB and can take a moment</p>
          </div>
        )}

        {cameraStatus === 'ready' && trackerStatus === 'error' && (
          <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="text-red-400" size={48} />
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-red-300">Hand Tracking Unavailable</h3>
              <p className="text-xs text-gray-300 mt-1">{errorMessage || 'Hand tracker could not be loaded.'}</p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={onRetryCamera}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <RefreshCw size={14} /> Retry
              </button>
              <button
                onClick={onSwitchToMouse}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <MousePointer size={14} /> Play with Mouse / Touch
              </button>
            </div>
          </div>
        )}

        {/* Target Ring */}
        {cameraStatus === 'ready' && trackerStatus !== 'loading' && trackerStatus !== 'error' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
            <div
              ref={targetCircleRef}
              className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-dashed border-cyan-400/70 flex items-center justify-center transition-all duration-300"
            >
              {/* Radial Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="44%"
                  className="stroke-cyan-500/20 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="44%"
                  className="stroke-cyan-400 fill-none transition-all duration-75"
                  strokeWidth="8"
                  strokeDasharray="400"
                  strokeDashoffset={400 - (400 * holdProgress) / 100}
                  strokeLinecap="round"
                />
              </svg>

              {isCalibrated ? (
                <CheckCircle2 size={44} className="text-emerald-400 animate-bounce" />
              ) : (
                <div className="flex flex-col items-center text-center p-2">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-cyan-300">
                    {isHandDetected ? 'Hold Finger' : 'Raise Index'}
                  </span>
                  <span className="text-xs sm:text-sm font-mono text-cyan-100 font-bold mt-0.5">
                    {holdProgress}%
                  </span>
                </div>
              )}
            </div>

            {/* Hand status pill */}
            <div className="mt-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-cyan-500/30 text-[11px] flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isHandDetected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-gray-200">
                {isHandDetected ? 'Fingertip tracked!' : 'Looking for hand...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col items-center gap-2 w-full max-w-sm mb-3">
        <button
          onClick={onCalibrationComplete}
          className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase transition-all duration-300 shadow-xl flex items-center justify-center gap-2 ${
            isCalibrated
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-gray-950 scale-102 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
              : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-gray-950 active:scale-95'
          }`}
        >
          <Play size={18} className="fill-gray-950" />
          {isCalibrated ? 'Enter Arena (Calibrated!)' : 'Start Arena (Skip Calibration)'}
        </button>

        <button
          onClick={onSwitchToMouse}
          className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-gray-300 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <MousePointer size={14} /> Play with Touch / Mouse Blade
        </button>
      </div>
    </div>
  );
};
