import React, { useEffect, useRef, useState } from 'react';
import { CameraStatus } from '../tracking/CameraManager';
import { TrackerStatus } from '../tracking/HandTracker';
import { Point2D } from '../types';
import { RefreshCw, MousePointer, CheckCircle2, AlertCircle } from 'lucide-react';

interface CalibrationOverlayProps {
  cameraStatus: CameraStatus;
  trackerStatus: TrackerStatus;
  errorMessage?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
  videoRef,
  currentFingertip,
  isHandDetected,
  onCalibrationComplete,
  onSwitchToMouse,
  onRetryCamera,
  isMirrored,
}) => {
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isCalibrated, setIsCalibrated] = useState(false);

  // The tracker reads frames from the game's own video element (videoRef); this preview
  // only mirrors the same stream so unmounting the overlay never disconnects tracking
  const previewRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const preview = previewRef.current;
    const source = videoRef.current;
    if (!preview || !source || cameraStatus !== 'ready') return;
    preview.srcObject = source.srcObject;
    preview.play().catch(() => {
      // Autoplay of a muted preview can be interrupted; the live tracker is unaffected
    });
    return () => {
      preview.srcObject = null;
    };
  }, [cameraStatus, videoRef]);

  // Check if fingertip is inside center calibration circle
  useEffect(() => {
    if (!currentFingertip || isCalibrated) {
      const resetTimer = setTimeout(() => {
        setHoldProgress((p) => Math.max(0, p - 8));
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const targetRadius = 90;

    const dx = currentFingertip.x - centerX;
    const dy = currentFingertip.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= targetRadius) {
      const interval = setInterval(() => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsCalibrated(true);
            return 100;
          }
          return prev + 5;
        });
      }, 50);

      return () => clearInterval(interval);
    } else {
      const decayTimer = setTimeout(() => {
        setHoldProgress((p) => Math.max(0, p - 6));
      }, 0);
      return () => clearTimeout(decayTimer);
    }
  }, [currentFingertip, isCalibrated]);

  return (
    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white select-none">
      {/* Background Live Webcam Video (mirrored) */}
      <div className="relative w-full max-w-2xl aspect-video rounded-3xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_50px_rgba(0,229,255,0.2)] bg-gray-950 flex items-center justify-center">
        <video
          ref={previewRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isMirrored ? 'scale-x-[-1]' : ''
          }`}
        />

        {/* Video overlays */}
        {cameraStatus === 'requesting' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="animate-spin text-cyan-400" size={40} />
            <p className="text-sm font-medium text-cyan-200">Requesting webcam access...</p>
            <p className="text-xs text-gray-400">Please click &quot;Allow&quot; in your browser</p>
          </div>
        )}

        {(cameraStatus === 'permission_denied' ||
          cameraStatus === 'busy' ||
          cameraStatus === 'not_found' ||
          cameraStatus === 'timeout' ||
          cameraStatus === 'error') && (
          <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="text-red-400" size={48} />
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-red-300">Camera Unavailable</h3>
              <p className="text-xs text-gray-300 mt-1">{errorMessage || 'Could not start webcam stream.'}</p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={onRetryCamera}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <RefreshCw size={14} /> Retry Camera
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

        {/* Calibration Target Circle */}
        {cameraStatus === 'ready' && trackerStatus !== 'loading' && trackerStatus !== 'error' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="relative w-44 h-44 rounded-full border-2 border-dashed border-cyan-400/60 flex items-center justify-center transition-all duration-300">
              {/* Radial Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r="82"
                  className="stroke-cyan-500/20 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="82"
                  className="stroke-cyan-400 fill-none transition-all duration-75"
                  strokeWidth="8"
                  strokeDasharray="515"
                  strokeDashoffset={515 - (515 * holdProgress) / 100}
                  strokeLinecap="round"
                />
              </svg>

              {isCalibrated ? (
                <CheckCircle2 size={48} className="text-emerald-400 animate-bounce" />
              ) : (
                <div className="flex flex-col items-center text-center p-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                    {isHandDetected ? 'Hold Finger Here' : 'Raise Index Finger'}
                  </span>
                  <span className="text-xs font-mono text-cyan-100 font-bold mt-1">
                    {holdProgress}%
                  </span>
                </div>
              )}
            </div>

            {/* Live hand tracking status pill */}
            <div className="mt-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-cyan-500/30 text-xs flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isHandDetected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-gray-200">
                {isHandDetected ? 'Index fingertip detected!' : 'Looking for hand in frame...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Instructions & Action Controls */}
      <div className="mt-6 flex flex-col items-center gap-4 text-center max-w-lg">
        <h2 className="text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
          AIR BLADE CALIBRATION
        </h2>
        <p className="text-xs text-gray-300 leading-relaxed">
          Position your webcam so your hand is in view. Raise your index finger like a blade. Move your fingertip into the target ring to calibrate, or skip directly into the arena!
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <button
            onClick={onCalibrationComplete}
            className={`px-8 py-3 rounded-2xl font-black text-sm tracking-wider uppercase transition-all duration-300 shadow-xl ${
              isCalibrated
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-gray-950 scale-105 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                : 'bg-cyan-500 hover:bg-cyan-400 text-gray-950 hover:scale-102 active:scale-95'
            }`}
          >
            {isCalibrated ? 'Enter Arena (Calibrated!)' : 'Confirm Readiness & Start'}
          </button>

          <button
            onClick={onSwitchToMouse}
            className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-gray-300 hover:text-white transition-all active:scale-95 flex items-center gap-2"
          >
            <MousePointer size={15} /> Play with Mouse / Touch
          </button>
        </div>
      </div>
    </div>
  );
};
