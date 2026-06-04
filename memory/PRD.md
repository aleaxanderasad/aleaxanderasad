# NeoType Dojo — Anime Typing Learning Platform

## Original Problem Statement
> Create a website for learning typewriting based on level from beginners to advanced, the interface like an anime.

## User Choices
- **Aesthetic:** Hybrid — Soft Ghibli + Cyberpunk + Shonen action (delivered as "Neo-Tokyo Dojo")
- **Lessons:** Both pre-built tiered drills AND anime-quote practice
- **Accounts:** JWT login with saved progress, WPM history, achievements
- **Gamification:** XP/levels/streaks, boss-fight typing challenges, leaderboard
- **Stack:** React + FastAPI + MongoDB

## Architecture
- **Backend (FastAPI):** All endpoints under `/api`. Auth via JWT in httpOnly cookies (samesite=none, secure). Admin seeded on startup. MongoDB for users + sessions; lessons/quotes/bosses are static in-code content.
- **Frontend (React + Tailwind):** Dark Neo-Tokyo aesthetic (cyan #00F0FF, magenta #FF003C). Custom fonts: Bebas Neue (display), Outfit (headings), Manrope (body), JetBrains Mono (typing). Custom `TypingEngine` listens to raw keydown events.

## User Personas
1. **Beginner** — Needs structured drills from home row → numbers → symbols.
2. **Intermediate** — Wants progress tracking, WPM history, anime flavor.
3. **Speed-seeker / advanced** — Wants boss-fight challenges and leaderboard competition.

## Core Requirements (static)
- Tiered lessons (Beginner/Intermediate/Advanced)
- Custom anime quote practice
- Real-time WPM + accuracy + character-level feedback
- XP / Level / Streak progression
- Boss-fight mode with HP bar + time limit
- Global leaderboard (WPM, XP, streak)
- 8 unlockable achievements
- User profile w/ session history

## What's Implemented (2026-02 — initial MVP)
- ✅ Landing page with hero, features grid, quotes banner, CTAs
- ✅ JWT auth (register, login, logout, /me) via httpOnly cookies
- ✅ Dashboard with stats tiles, XP bar, WPM history chart, quick links
- ✅ 12 lessons across 3 tiers (Lessons.jsx + /api/lessons)
- ✅ 12 anime quotes (Quotes.jsx + /api/quotes)
- ✅ TypingPractice page (lesson + quote modes) with results card
- ✅ 3 bosses with HP/timer mechanics (BossFight.jsx)
- ✅ Achievements page (8 badges)
- ✅ Leaderboard (3 metrics)
- ✅ Profile page with session history table
- ✅ Backend session recording w/ XP, level, streak, achievement evaluation
- ✅ 100% backend tests (21/21) + frontend e2e flows verified

## Phase 2 (2026-02-04)
- ✅ **Custom Playground** (`/playground`) — paste-your-own-text typing with XP rewards
- ✅ **Daily Challenge** (`/daily`) — rotating deterministic passage with **2× XP** + dashboard tile
- ✅ **Race Mode** (`/race`) — race vs 3 bots (Genin 35 / Chunin 55 / Jonin 80 WPM) with animated tracks + countdown + placement ranking, +100 XP bonus for win
- ✅ **Sound Effects** — Web Audio synth (keystroke clicks, error buzz, level-up chime, boss roar, victory/defeat fanfare) with global mute toggle in nav (persisted in localStorage)
- ✅ **3 More Boss Tiers** — Master Tengu, Demon Lord Akuma, Void Empress Reiko (total: 6 bosses)
- ✅ Stricter `mode` validation (Pydantic Literal); navbar layout polish
- ✅ 100% backend tests (28/28) + frontend Phase 2 flows verified

## Prioritized Backlog
- **P1:** Brute-force lockout on /api/auth/login (5 failed attempts = 15 min lockout)
- **P1:** Custom typing playgrounds (paste own text)
- **P2:** Sound effects (keystroke clicks, boss roar, level-up chime)
- **P2:** Daily challenge (rotating passage with bonus XP)
- **P2:** Social: share results card (Twitter / Instagram story image)
- **P3:** Multiplayer race mode
- **P3:** More boss tiers / NG+ difficulty
- **P3:** Optional password reset email flow (currently dev-logged only)
