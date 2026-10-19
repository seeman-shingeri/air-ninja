import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { CameraManager, CameraStatus } from '../tracking/CameraManager';
import { HandTracker, TrackerStatus } from '../tracking/HandTracker';
import { VoiceManager } from '../voice/VoiceManager';
import { SettingsStorage } from '../storage/SettingsStorage';
import { LeaderboardStorage } from '../storage/LeaderboardStorage';
import { ActivePowerState, GameMode, GameStats, GameStatus, Point2D, SpecialPower, UserSettings } from '../types';

import { HUD } from './HUD';
import { PowerBar } from './PowerBar';
import { CalibrationOverlay } from './CalibrationOverlay';
import { MainMenu } from './MainMenu';
import { GameOverModal } from './GameOverModal';
import { HowToPlayModal } from './HowToPlayModal';
import { SettingsModal } from './SettingsModal';
import { LeaderboardModal } from './LeaderboardModal';

export const AirNinjaGame: React.FC = () => {
  // DOM Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Engine & Subsystem Refs
  const engineRef = useRef<GameEngine | null>(null);
  const cameraManagerRef = useRef<CameraManager | null>(null);
  const handTrackerRef = useRef<HandTracker | null>(null);
  const voiceManagerRef = useRef<VoiceManager | null>(null);

  // Animation frame for tracking video processing
  const trackingFrameIdRef = useRef<number | null>(null);

  // React state for HUD & Overlays
  const [userSettings, setUserSettings] = useState<UserSettings>(() => SettingsStorage.getSettings());
  const [gameStatus, setGameStatus] = useState<GameStatus>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    lives: 3,
    timer: 60,
    comboCount: 0,
    comboMultiplier: 1,
    maxCombo: 0,
    totalSlices: 0,
    totalBombsHit: 0,
    fruitBreakdown: { watermelon: 0, orange: 0, apple: 0, banana: 0, strawberry: 0, pineapple: 0 },
  });

  const [activePowers, setActivePowers] = useState<Record<SpecialPower, ActivePowerState>>({
    slow_motion: { power: 'slow_motion', active: false, remainingTime: 0, duration: 5, cooldownRemaining: 0 },
    double_score: { power: 'double_score', active: false, remainingTime: 0, duration: 8, cooldownRemaining: 0 },
    bomb_mode: { power: 'bomb_mode', active: false, remainingTime: 0, duration: 6, cooldownRemaining: 0 },
  });

  // Hardware Status State
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('uninitialized');
  const [cameraError, setCameraError] = useState<string>('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus>('idle');
  const [isHandDetected, setIsHandDetected] = useState<boolean>(false);
  const [currentFingertip, setCurrentFingertip] = useState<Point2D | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'listening' | 'idle' | 'error' | 'unsupported'>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const transcriptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modals
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const userSettingsRef = useRef(userSettings);
  useEffect(() => {
    userSettingsRef.current = userSettings;
  }, [userSettings]);

  // Initialize GameEngine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, userSettingsRef.current, {
      onStatsChange: (newStats) => setStats(newStats),
      onStatusChange: (newStatus) => setGameStatus(newStatus),
      onPowersChange: (newPowers) => setActivePowers(newPowers),
      onGameOver: (finalStats) => {
        setStats(finalStats);
        setGameStatus('game_over');
      },
    });

    engineRef.current = engine;

    const handleWindowResize = () => {
      engine.handleResize();
      if (handTrackerRef.current) {
        handTrackerRef.current.setDimensions(engine.getWidth(), engine.getHeight());
      }
    };

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Update engine settings on change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setUserSettings(userSettings);
    }
    if (handTrackerRef.current) {
      handTrackerRef.current.setMirrored(userSettings.mirrorCamera);
      handTrackerRef.current.setSensitivity(userSettings.sensitivity);
    }
  }, [userSettings]);

  // Video tracking loop with velocity dead-reckoning extrapolation for 60-120fps smoothness
  const startTrackingLoop = useCallback(() => {
    if (trackingFrameIdRef.current !== null) {
      cancelAnimationFrame(trackingFrameIdRef.current);
    }

    const processFrame = () => {
      const video = videoRef.current;
      const tracker = handTrackerRef.current;
      const engine = engineRef.current;

      // Detected points are forwarded to the engine via the tracker's onFingertipMove callback
      if (video && tracker && engine && video.readyState >= 2 && video.videoWidth > 0) {
        const point = tracker.processVideoFrame(video, performance.now());
        if (!point) {
          // Dead-reckoning extrapolation: interpolate between camera inference intervals for 60-120fps smoothness
          const predicted = tracker.predictCurrentPosition(performance.now());
          if (predicted && tracker.getStatus() === 'tracking') {
            engine.updateFingertip(predicted, true);
            setCurrentFingertip(predicted);
          } else {
            setIsHandDetected(false);
          }
        }
      }

      trackingFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    trackingFrameIdRef.current = requestAnimationFrame(processFrame);
  }, []);

  const stopTrackingLoop = useCallback(() => {
    if (trackingFrameIdRef.current !== null) {
      cancelAnimationFrame(trackingFrameIdRef.current);
      trackingFrameIdRef.current = null;
    }
  }, []);

  // Start Camera and Tracker
  const initCameraAndTracker = useCallback(async () => {
    if (!videoRef.current) return;

    const camManager = new CameraManager({
      videoElement: videoRef.current,
      onStatusChange: (status, error) => {
        setCameraStatus(status);
        if (error) setCameraError(error);
      },
    });
    cameraManagerRef.current = camManager;

    const success = await camManager.startCamera();
    if (!success) {
      setMediaStream(null);
      return false;
    }

    const stream = camManager.getStream();
    setMediaStream(stream);

    const width = engineRef.current?.getWidth() || window.innerWidth;
    const height = engineRef.current?.getHeight() || window.innerHeight;

    const tracker = new HandTracker(
      {
        canvasWidth: width,
        canvasHeight: height,
        mirrored: userSettings.mirrorCamera,
        sensitivity: userSettings.sensitivity,
      },
      {
        onStatusChange: (status, err) => {
          setTrackerStatus(status);
          if (err) setCameraError(err);
        },
        onFingertipMove: (point) => {
          engineRef.current?.updateFingertip(point, true);
          setCurrentFingertip(point);
          setIsHandDetected(true);
        },
        onTrackingLost: () => {
          setIsHandDetected(false);
          engineRef.current?.updateFingertip(null, true);
        },
      }
    );

    handTrackerRef.current = tracker;
    const trackerReady = await tracker.init();
    if (trackerReady) {
      startTrackingLoop();
      return true;
    }
    return false;
  }, [userSettings.mirrorCamera, userSettings.sensitivity, startTrackingLoop]);

  // Teardown camera & tracker
  const releaseCamera = useCallback(() => {
    stopTrackingLoop();
    if (cameraManagerRef.current) {
      cameraManagerRef.current.stopCamera();
      cameraManagerRef.current = null;
    }
    if (handTrackerRef.current) {
      handTrackerRef.current.dispose();
      handTrackerRef.current = null;
    }
    setMediaStream(null);
    setCameraStatus('uninitialized');
    setIsHandDetected(false);
    setCurrentFingertip(null);
  }, [stopTrackingLoop]);

  // Start Voice Recognition
  const initVoice = useCallback(() => {
    if (!userSettings.voiceEnabled || voiceManagerRef.current) return;

    const voice = new VoiceManager({
      onStatusChange: (status, message) => {
        setVoiceStatus(status);
        if (status === 'listening') setVoiceError('');
        if (message) {
          setVoiceError(message);
          console.warn('[Voice]', message);
        }
      },
      onInterimText: (text) => {
        setVoiceTranscript(text.trim());
        if (transcriptTimerRef.current) clearTimeout(transcriptTimerRef.current);
        transcriptTimerRef.current = setTimeout(() => setVoiceTranscript(''), 2500);
      },
      onPowerTriggered: (power) => {
        engineRef.current?.triggerPower(power);
      },
      onFruitCalled: (fruit) => {
        engineRef.current?.sliceFruitByVoice(fruit);
      },
    });

    voiceManagerRef.current = voice;
    voice.start();
  }, [userSettings.voiceEnabled]);

  const releaseVoice = useCallback(() => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.stop();
      voiceManagerRef.current = null;
    }
    setVoiceStatus('idle');
    setVoiceTranscript('');
    setVoiceError('');
    if (transcriptTimerRef.current) clearTimeout(transcriptTimerRef.current);
  }, []);

  // Cleanup on unmount or tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (engineRef.current?.pause) {
          engineRef.current.pause();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseCamera();
      releaseVoice();
    };
  }, [releaseCamera, releaseVoice]);

  // Flow Handlers
  const handleStartGame = (mode: GameMode) => {
    setGameMode(mode);
    engineRef.current?.soundManager.unlock();

    // Start the microphone right away so voice works regardless of camera calibration
    initVoice();

    if (userSettings.cameraEnabled) {
      setGameStatus('calibrating');
      initCameraAndTracker();
    } else {
      // Direct start with touch / mouse blade
      engineRef.current?.startRound(mode);
    }
  };

  const handleCalibrationComplete = () => {
    initVoice();
    engineRef.current?.startRound(gameMode);
  };

  const handleSwitchToMouse = () => {
    releaseCamera();
    const updated = { ...userSettings, cameraEnabled: false };
    setUserSettings(updated);
    SettingsStorage.saveSettings(updated);

    initVoice();
    engineRef.current?.startRound(gameMode);
  };

  const handleToggleCameraControl = () => {
    const updated = { ...userSettings, cameraEnabled: !userSettings.cameraEnabled };
    setUserSettings(updated);
    SettingsStorage.saveSettings(updated);
  };

  const handleTogglePause = () => {
    if (gameStatus === 'playing') {
      engineRef.current?.pause();
    } else if (gameStatus === 'paused') {
      engineRef.current?.resume();
    }
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    engineRef.current?.soundManager.setMuted(newMuted);
  };

  const handleTriggerPower = (power: SpecialPower) => {
    engineRef.current?.triggerPower(power);
  };

  const handleRestart = () => {
    engineRef.current?.startRound(gameMode);
  };

  const handleExitToMenu = () => {
    engineRef.current?.exitToMenu();
    releaseCamera();
    releaseVoice();
    setGameStatus('menu');
  };

  const handleResetData = () => {
    if (window.confirm('Reset all user settings and high scores?')) {
      LeaderboardStorage.clearScores();
      const freshSettings = SettingsStorage.resetSettings();
      setUserSettings(freshSettings);
      setShowSettings(false);
    }
  };

  // Touch and Pointer Input Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!userSettings.cameraEnabled || trackerStatus === 'error' || !isHandDetected) {
      engineRef.current?.updateFingertip({ x, y }, false);
      setCurrentFingertip({ x, y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!userSettings.cameraEnabled || trackerStatus === 'error' || !isHandDetected) {
      engineRef.current?.updateFingertip({ x, y }, false);
      setCurrentFingertip({ x, y });
    }
  };

  const handlePointerUp = () => {
    if (!userSettings.cameraEnabled || trackerStatus === 'error' || !isHandDetected) {
      engineRef.current?.updateFingertip(null, false);
      setCurrentFingertip(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!userSettings.cameraEnabled || trackerStatus === 'error' || !isHandDetected) {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      engineRef.current?.updateFingertip({ x, y }, false);
      setCurrentFingertip({ x, y });
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        handleTogglePause();
      } else if (e.key === '1') {
        handleTriggerPower('slow_motion');
      } else if (e.key === '2') {
        handleTriggerPower('double_score');
      } else if (e.key === '3') {
        handleTriggerPower('bomb_mode');
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.code === 'Space' && gameStatus === 'game_over') {
        handleRestart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-black select-none font-sans touch-none overscroll-none">
      {/* Persistent Master Video Element for background decoding */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '320px',
          height: '240px',
          opacity: 0.001,
          pointerEvents: 'none',
          zIndex: -100,
        }}
      />

      {/* Main 2D Canvas Arena */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchMove}
        onTouchMove={handleTouchMove}
        onTouchEnd={handlePointerUp}
        className="w-full h-full block cursor-crosshair touch-none"
      />

      {/* Active Game HUD & Controls */}
      {(gameStatus === 'playing' || gameStatus === 'paused') && (
        <>
          <HUD
            stats={stats}
            mode={gameMode}
            isPaused={gameStatus === 'paused'}
            onTogglePause={handleTogglePause}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            voiceStatus={voiceStatus}
            voiceTranscript={voiceTranscript}
            voiceError={voiceError}
            isCameraActive={userSettings.cameraEnabled && cameraStatus === 'ready'}
            isHandDetected={isHandDetected}
            onExitToMenu={handleExitToMenu}
          />

          <PowerBar powers={activePowers} onTriggerPower={handleTriggerPower} />

          {/* Pause Overlay */}
          {gameStatus === 'paused' && (
            <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center">
              <h2 className="text-4xl sm:text-5xl font-black text-cyan-300 tracking-wider">GAME PAUSED</h2>
              <p className="text-xs text-gray-400 mt-2">Tap Resume or press Esc</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full max-w-xs">
                <button
                  onClick={handleTogglePause}
                  className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg"
                >
                  Resume Playing
                </button>
                <button
                  onClick={handleExitToMenu}
                  className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm uppercase tracking-wider transition-all active:scale-95"
                >
                  Exit to Menu
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Calibration Overlay */}
      {gameStatus === 'calibrating' && (
        <CalibrationOverlay
          cameraStatus={cameraStatus}
          trackerStatus={trackerStatus}
          errorMessage={cameraError}
          mediaStream={mediaStream}
          currentFingertip={currentFingertip}
          isHandDetected={isHandDetected}
          onCalibrationComplete={handleCalibrationComplete}
          onSwitchToMouse={handleSwitchToMouse}
          onRetryCamera={() => {
            releaseCamera();
            initCameraAndTracker();
          }}
          isMirrored={userSettings.mirrorCamera}
        />
      )}

      {/* Main Menu */}
      {gameStatus === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          selectedMode={gameMode}
          onSelectMode={setGameMode}
          settings={userSettings}
          onToggleCameraControl={handleToggleCameraControl}
        />
      )}

      {/* Game Over Modal */}
      {gameStatus === 'game_over' && (
        <GameOverModal
          stats={stats}
          mode={gameMode}
          onRestart={handleRestart}
          onReturnToMenu={handleExitToMenu}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      {/* Modals */}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
      {showSettings && (
        <SettingsModal
          settings={userSettings}
          onUpdateSettings={(newSettings) => {
            setUserSettings(newSettings);
            SettingsStorage.saveSettings(newSettings);
          }}
          onResetData={handleResetData}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showLeaderboard && (
        <LeaderboardModal
          initialMode={gameMode}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  );
};
