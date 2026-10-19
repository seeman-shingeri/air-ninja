# 🥷 AIR NINJA — SLICE WITHOUT TOUCHING

A high-performance, arcade browser game where players slice flying fruits in mid-air using their fingertip tracked live via webcam and trigger powers using real-time voice commands.

Built with **React 19**, **TypeScript**, **Vite 6**, **HTML5 Canvas 2D**, **Google MediaPipe Tasks Vision (Hand Landmarker)**, **Web Speech API**, and **Web Audio API**.

---

## 🌟 Key Features

### 1. Touchless Air Blade (Webcam Hand Tracking)
- **Computer Vision Model**: Uses Google MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`) detecting index fingertip coordinates (Landmark 8) in real time.
- **Adaptive Jitter Filtering**: Implements a calibrated **One Euro Filter** that eliminates hand-tremor jitter when resting while preserving instant zero-latency tracking for high-velocity slashes.
- **Aspect-Ratio Cover Mapping**: Maps normalized camera landmarks to dynamic canvas dimensions with symmetric letterboxing/cover alignment and horizontal mirroring.
- **Graceful Tracking Loss & Fading**: Fades the blade trail and suppresses phantom cuts when the player's hand exits the camera frame.
- **Mouse & Touch Fallback**: Seamless one-click switch to mouse/touch blade controls if a webcam is unavailable or permissions are denied.

### 2. Slicing Physics & Visual Effects
- **Continuous Segment-Circle Intersection**: Checks the line segment between the previous and current fingertip positions, guaranteeing 100% slice registration even on fast swipes crossing an entire fruit in a single frame.
- **Procedural Fruit Splitting**: Cuts fruits along the exact angle of entry, generating two independent physical halves that rotate and separate with outward normal velocity.
- **Object-Pooled Particle System**: Generates juicy fruit pulp bursts, seeds, splash droplets, and bomb sparks with zero garbage collection stutter.
- **Glowing Blade Ribbon**: Neon cyan, violet, and white glowing slicing trail rendered with dynamic velocity width.

### 3. Voice-Activated Powers & Manual Controls
Speak directly into your microphone to unleash special powers:
- **"Slow motion!"** (or *"slow mo"*): Dilation field reducing physics velocity to 0.35x for 5 seconds.
- **"Double score!"** (or *"double points"*): Radiant golden score multiplier doubling all fruit points for 8 seconds.
- **"Bomb mode!"** (or *"more bombs"*): High-adrenaline surge of bomb spawns for high-risk frenzy scoring for 6 seconds.
- **Voice Slice**: Say a fruit's name (*"Watermelon!"*, *"Banana!"*, *"Pineapple!"*) to instantly cut that fruit on screen. Several names in one breath cut several fruits and can chain combos.
- **Manual Hotkeys & UI Buttons**: Every power features an accessible on-screen button with cooldown progress and keyboard shortcuts (`1`, `2`, `3`).

### 4. Zero-Latency Procedural Audio (Web Audio API)
- 100% procedural synthesized audio using `OscillatorNode`, `BiquadFilterNode`, and `GainNode`.
- Custom frequencies for each fruit type (Watermelon deep thud, Orange citrus snap, Strawberry high chirp, Pineapple crunch).
- Velocity-sensitive blade swishes (`whoosh`), sizzling bomb fuses, sub-bass explosion detonations, combo fanfares, and power-up activation arpeggios.
- Zero external MP3/WAV dependencies — works offline with zero latency.

### 5. Game Modes
1. **Classic Mode**: 3 Lives. Missing an unsliced fruit or slicing a bomb costs 1 life. Ends when lives reach 0.
2. **Timed Challenge**: 60-second countdown frenzy. Unlimited lives, bomb slices deduct 10 points. Compete for maximum score before time expires.
3. **Endless Dojo**: Relaxed practice mode with no timers and no game over.

### 6. Local Leaderboard & Persistence
- Browser-local high score storage per game mode with schema validation, sorting, and corrupted data recovery.
- Stores Player Nickname, Score, Mode, Max Combo, Total Slices, Bombs Hit, and Date.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **NPM**: v9.0.0 or later

### Installation & Development

```bash
# 1. Clone repository
git clone <repo-url>
cd "fruit ninja"

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:5173` in a modern browser (Google Chrome, Microsoft Edge, Brave, or Safari).

### Production Build & Preview

```bash
# Type check and build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🧪 Automated Testing

The project includes automated regression tests covering physics, collision math, combo calculations, power state machines, voice command normalization, coordinate mapping, and lifecycle cleanup:

```bash
# Run Vitest test suite
npm run test

# Run Oxlint linter
npm run lint
```

### Test Coverage Highlights
- `src/test/collision.test.ts`: Segment-circle intersections, glancing cuts, entry angles, duplicate slice prevention.
- `src/test/physics_and_spawning.test.ts`: Parabolic trajectories, gravity integration, fruit splitting, missed fruit boundaries.
- `src/test/scoring_and_combos.test.ts`: Combo windows, multi-slice multipliers, double score logic, bomb deductions.
- `src/test/powers_and_voice.test.ts`: Transcript normalization, alias matching, cooldown suppression.
- `src/test/coordinate_mapper_and_filter.test.ts`: Aspect ratio cover mapping, mirroring, One Euro Filter adaptive smoothing.
- `src/test/leaderboard_and_storage.test.ts`: Validation, sorting, corruption recovery, settings reset.
- `src/test/lifecycle_and_camera.test.ts`: Tab sleep delta time clamping, MediaStream track disposal, particle pooling.

---

## 📋 Manual Camera & Microphone Verification Checklist

When testing on hardware with physical webcam and microphone:

1. **Camera Permission Prompt**:
   - Launch game, click **START GAME** on Classic Mode.
   - Verify browser displays camera permission dialog.
   - Click **Allow**. Verify mirrored webcam feed displays in the calibration preview.
2. **Calibration Stage**:
   - Hold index finger inside the central target ring.
   - Verify circular progress ring fills smoothly to 100%.
   - Verify "Enter Arena (Calibrated!)" button illuminates.
3. **Fingertip Tracking & Slicing**:
   - Move index finger across flying fruit.
   - Verify glowing cyan blade trail follows fingertip.
   - Verify fruit splits into two halves along the swipe angle with juice particles.
4. **Voice Commands**:
   - Speak *"Slow motion!"* -> Verify blue time dilation vignette appears and fruits slow to 0.35x.
   - Speak *"Double score!"* -> Verify golden glow appears and score points double.
   - Speak *"Bomb mode!"* -> Verify danger alert and increased bomb spawn rate.
5. **Mouse Fallback**:
   - Click **Play with Mouse / Touch** on calibration or toggle in Main Menu.
   - Verify mouse swipes cleanly slice fruits and trigger blade whooshes.
6. **Lifecycle & Cleanup**:
   - Press **Escape** or **P** -> Verify simulation and timer freeze.
   - Click **Exit** -> Verify webcam indicator turns off and hardware stream releases.

---

## 🔒 Privacy & Security

- **100% Local Inference**: Video frames from your webcam are processed directly in your browser using WebAssembly and WebGPU/WebGL. No video frames, landmarks, or photos are ever saved, stored, or transmitted to any server.
- **Audio Privacy**: Audio is processed strictly for keyword recognition. No raw voice data is recorded or stored.

---

## 🎮 Keyboard Controls

| Key | Action |
|---|---|
| `Esc` / `P` | Pause / Resume Game |
| `1` | Activate Slow Motion Power |
| `2` | Activate Double Score Power |
| `3` | Activate Bomb Mode Power |
| `M` | Mute / Unmute Sound Effects |
| `Space` | Restart round (from Game Over screen) |
