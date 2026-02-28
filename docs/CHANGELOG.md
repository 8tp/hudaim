# Changelog

All notable changes to HudAim will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-01-07

### Added
- **Tracking Game** with Kovaaks-style strafe patterns
  - Smooth, Reactive, Stutter, and Zigzag movement patterns
  - Progressive difficulty scaling based on player accuracy
  - Reaction time tracking for target reacquisition
  - Difficulty levels: Easy, Easy+, Medium, Hard, Insane
  - Aggressive point scaling at higher difficulties
  
- **Anti-Cheat System**
  - Browser resize detection during gameplay
  - Scores invalidated if cheating detected

- **UUID-Based User System**
  - Unique user identification via localStorage UUID
  - Nickname changes update all historical scores
  - First-load nickname prompt for new users

- **LAN Leaderboard Sync**
  - Express backend server for score synchronization
  - Hybrid local/server storage (works offline)
  - Real-time score syncing across devices

- **Settings Modal**
  - Nickname management
  - Clear leaderboard data option
  - Accessible from navbar

### Changed
- Tracking target size increased to 72px (20% larger)
- Removed stutter pause - bot always moves continuously
- Improved reaction time calculation accuracy
- GridShot optimized with refs and Set for O(1) lookups

### Fixed
- Tracking game lag issues (direct DOM manipulation instead of React state)
- Reaction time showing 0ms - now tracks all target acquisitions
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

---

## Upcoming Features (Planned)

- [ ] User accounts with cloud sync
- [ ] Global leaderboards
- [ ] Custom game settings (duration, target size, etc.)
- [ ] Statistics dashboard with graphs
- [ ] Achievement system
- [ ] Sound effects and music
- [ ] Mobile touch support
- [ ] Additional game modes (Spider Shot, Motion Track, etc.)
