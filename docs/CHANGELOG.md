# Changelog

All notable changes to HudAim will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.0.0] - 2026-02-27

### Added
- **Target Switching game** — eliminate 4 moving targets in 60 seconds, score = kills x 100
- **Precision game** — hit small 40px targets with accuracy scoring, score = kills x accuracy
- **Replay system** — 60 FPS gameplay recording with full playback controls (pause, seek, speed)
  - IndexedDB storage for local replays
  - Server upload for top 3 scores per game type
  - ReplayViewer component with timeline scrubbing
- **Post-game analytics** — click heatmap visualization and statistical breakdowns
- **PostGameAnalytics component** — renders click distribution and performance metrics
- **Unified Leaderboards page** — view top 10 for all games in one place
- **FixedGameArea component** — standardized 1200x600px game container
- **HMAC-SHA256 anti-cheat sessions** — server-signed sessions with signature verification
- **Score plausibility validation** — per-game bounds checking (hit rate, reaction time, accuracy, score calculation)
- **Duration validation** — server verifies game length matches expected range
- **Replay cleanup** — server automatically prunes replays outside top 3

### Changed
- Upgraded React 18 → 19, React Router 6 → 7, Vite 5 → 7
- Added TailwindCSS 4 for utility styling alongside inline styles
- Server request body limit increased to 10MB for replay uploads
- Anti-cheat now uses `crypto.timingSafeEqual` for constant-time signature comparison
- Leaderboard entries from session system marked with `verified: true`

## [1.0.0] - 2026-01-07

### Added
- **Tracking game** with Kovaaks-style strafe patterns
  - Smooth, Reactive, Stutter, and Zigzag movement patterns
  - Progressive difficulty scaling based on player accuracy
  - Reaction time tracking for target reacquisition
  - Difficulty levels: Easy, Easy+, Medium, Hard, Insane
  - Aggressive point scaling at higher difficulties

- **Browser resize anti-cheat** — scores invalidated if window resized during gameplay

- **UUID-based user system**
  - Unique user identification via localStorage UUID
  - Nickname changes update all historical scores
  - First-load nickname prompt for new users

- **LAN leaderboard sync**
  - Express backend server for score synchronization
  - Hybrid local/server storage (works offline)
  - Real-time score syncing across devices

- **Settings modal** — nickname management, clear leaderboard data

### Changed
- Tracking target size increased to 72px (20% larger)
- Removed stutter pause — bot always moves continuously
- Improved reaction time calculation accuracy
- GridShot optimized with refs and Set for O(1) lookups

### Fixed
- Tracking game lag issues (direct DOM manipulation instead of React state)
- Reaction time showing 0ms — now tracks all target acquisitions
- Leaderboard not syncing across nickname changes

## [0.2.0] - 2026-01-07

### Added
- Leaderboard UI on all game pages
- Settings icon in navbar
- Nickname input on results screens
- Local leaderboard storage using localStorage

### Changed
- All games now run entirely client-side
- Improved game responsiveness

## [0.1.0] - 2026-01-07

### Added
- Initial release
- Reaction Time game
- Aim Trainer game
- Grid Shot game
- Basic Tracking game
- Home page with game selection
- Responsive navbar with game links
