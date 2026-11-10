# Dingo — a Duolingo-style language-learning web app

Learn Spanish through a learning path of units and skills, lessons with six interactive exercise
types, and the gamification loop: XP, streaks, hearts, gems, a daily goal, quests, achievements and a
weekly leaderboard. All progress persists in SQLite.

**Live demo:** https://dingo-learn.vercel.app · API docs: https://lingo-api-n7jg.onrender.com/docs
(free tier: the API sleeps when idle, so the first load can take ~50 s while it wakes up).

| | |
|---|---|
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind CSS · Radix UI |
| Backend | Python 3.12 · FastAPI · stdlib `sqlite3` |
| Database | SQLite (hand-written schema, `backend/schema.sql`) |

## Setup

Requires Python 3.12+ and Node 20+.

```bash
# backend — http://localhost:8000 (API docs at /docs)
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt -r requirements-dev.txt
uvicorn main:app --reload --port 8000
```

```bash
# frontend — http://localhost:3000
cd frontend
npm install
npm run dev
```

The database is created and seeded automatically on first start. `python seed.py` (or **Settings →
Reset progress**) rebuilds it. Tests: `cd backend && python -m pytest -q`.

Environment variables (all optional):

| Variable | Where | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000` |
| `DATABASE_PATH` | backend | `backend/lingo.db` |
| `CORS_ORIGINS` | backend | `*` (comma-separated list) |

## Features

- **Learning path** — 3 units × 3 skills, snake layout, unit colours, locked / active / completed
  (crown) states, progress ring on the current skill, popover with Start / Review.
- **Lesson player** — six exercise types, each with its own interaction:
  picture multiple choice (keys 1-3), match pairs (graded per tap), translate with a word bank
  (both directions), fill in the blank, type the answer, and listen-and-type (browser text-to-speech,
  normal and slow). Feedback bar with the correct solution, sounds, animated progress bar, missed
  exercises re-queued at the end ("Previous mistake"), quit confirmation, out-of-hearts screen,
  lesson-complete screen (XP, accuracy, gems, achievements, confetti) and a streak screen.
- **Gamification** — XP (10 per lesson, +5 for a perfect lesson, 5 per practice), streaks, hearts
  (lose one per wrong answer, regenerate one every 30 minutes, refill for 350 gems, +1 per practice),
  gems, daily goal (10/20/30/50 XP), nine achievements with gem rewards.
- **Leagues** — 10 tiers (Bronze → Diamond), 30 learners per league, weekly reset. Promotion and
  demotion follow Duolingo's sizes (Bronze: top 20 move up; bottom 5 drop from Silver upward), shown as
  green / red zone lines; top 3 win 60 gems; an end-of-week popup shows the result. Higher leagues
  have stronger (seeded) competition.
- **Streak freezes** — unlocked at the first 5-day streak (3 freezes), refilled at every 5-day
  milestone, +1 for each day you practise, buyable in the shop (200 gems, max 3). They are spent
  automatically on missed days, which show as ❄️ on the streak calendar.
- **Earn back** — a lost streak can be restored by finishing 3 lessons within 2 days.
- **Streak polish** — milestone celebrations (7 / 30 / 100 / 365), gold "perfect streak" flame when
  no freeze was used, an evening "streak at risk" banner on the Learn page.
- **Daily quests with chests** — three quests per day; finishing one unlocks a chest worth 10 / 15 / 20 gems.
- **Guidebook** — each unit's key phrases and words with audio, from the button on the unit banner.
- **Word hints** — hover (or tap) a Spanish word in a lesson to see its meaning.
- **Practice Hub** with two modes:
  - *Review* picks the exercises you're most likely to have forgotten, using half-life regression
    (Duolingo's published model: recall = 2^(−days since practice / half-life), where the half-life grows
    with correct answers and shrinks with mistakes), topped up with exercises from completed lessons.
    Works with zero hearts and earns one back.
  - *Timed challenge* gives 90 seconds to answer as many as you can, at 1 XP per correct answer,
    with no hearts lost. The time limit is enforced by the server (answers after the deadline are refused).
- **Top-bar popovers** (hover on desktop, tap on mobile): streak with this week's active days, gems,
  and hearts with a live "next heart in mm:ss" countdown plus refill / practice shortcuts.
- **Dark mode**: System / Light / Dark in Settings, remembered per browser and applied before first paint.
- **Profile** — stats, a 7-day XP chart, achievements with progress, "exercises to review".
- **Settings** — display name, daily goal, course list (other languages "Coming soon"), and testing
  tools: *Simulate next day* (moves the app clock to check streak and daily-goal logic) and
  *Reset progress*.
- Responsive: sidebar + stats rail on desktop; top stats bar + bottom tab bar on mobile.

Dark mode works by pointing Tailwind's neutral, slate and tint shades at CSS variables
(`globals.css`) that `.dark` redefines, so every existing class themes itself.

## Architecture

```
frontend/  Next.js
  app/(main)/          pages with sidebar + stats rail (learn, leaderboard, quests, shop, profile, settings)
  app/lesson/          lesson player: player.tsx (state machine), exercises.tsx (one component per type)
  app/lesson/review/   mistakes review   app/lesson/timed/  timed challenge   (same player, `mode` prop)
  app/(main)/practice/ practice hub        app/(main)/guidebook/[unitId]/  unit guidebook
  components/          shared UI (sidebar, stats bar, quests, icons, shadcn/ui primitives)
  lib/api.ts           typed API client (the only place that talks to the backend)
backend/   FastAPI
  main.py              HTTP routes and request validation
  services.py          game state that needs the DB: loading the learner (hearts, freezes, league week
                       settled on read), path unlocking, review selection, stats, achievements, guidebook
  logic.py             pure rules: grading, normalisation, hearts, streaks + freezes, leagues, XP, recall
  db.py                connection per request (one transaction), simulated clock
  schema.sql           tables, constraints, indexes
  content.py, seed.py  Spanish course data → generated exercises, sample learner, leaderboard bots
  test_api.py          rule checks, the lesson loop end to end, and the retention features end to end
```

Pages are React Server Components that fetch from the API on each request (`no-store`); interactive
parts are client components that call the API and then `router.refresh()`.

**Grading happens on the server.** Exercises are sent without answers; the client posts each answer to
`/answer`, and `/complete` only succeeds once every exercise in the session has a correct attempt. XP,
hearts and streaks are computed server-side, so the client can't award itself progress. (Match pairs are
the one exception: the pairs are sent so each tap can be graded instantly; the full set is still
confirmed by the server.)

Free-text answers are normalised before comparison (case, accents, punctuation, spacing), so
`quiero un cafe` matches `Quiero un café.`; each sentence can list alternative translations.

## Database schema

```
courses 1─* units 1─* skills 1─* lessons 1─* exercises
users 1─* sessions 1─* attempts *─1 exercises
users *─* achievements   (via user_achievements)
users 1─* streak_freeze_days, quest_claims, league_results
app_clock (single row: day offset for simulated dates)
```

| Table | Purpose / key columns |
|---|---|
| `courses` | one per language (`language` unique) |
| `units` | `course_id`, `position`, `title`, `description`, `color` — unique `(course_id, position)` |
| `skills` | a node on the path; `unit_id`, `position`, `title`, `icon` |
| `lessons` | `skill_id`, `position` |
| `exercises` | `lesson_id`, `position`, `type` (CHECK in 6 types), `prompt`, `payload` (JSON, CHECK `json_valid`) holding type-specific data incl. the answer |
| `users` | learner and leaderboard bots: `xp`, `gems`, `hearts` (CHECK 0–5), `hearts_updated_at`, `streak`, `longest_streak`, `last_streak_date`, `streak_freezes` (CHECK 0–3), `freezes_in_streak` (0 = perfect), `lost_streak` + `lost_streak_on` (earn back), `league_tier` (CHECK 0–9), `league_week`, `daily_goal` (CHECK in 10/20/30/50) |
| `sessions` | one lesson, practice or timed run: `kind`, `lesson_id` (NULL unless a lesson), `exercise_ids`, `completed_at`, `completed_day`, `xp_earned`, `mistakes` |
| `attempts` | every graded answer: `session_id`, `exercise_id`, `correct`, `answer` |
| `achievements` | `code`, `metric` (xp / streak / lessons / perfect), `threshold`, `reward_gems` |
| `user_achievements` | PK `(user_id, achievement_id)`, `unlocked_at` |
| `streak_freeze_days` | days a freeze covered, PK `(user_id, day)`, for the ❄️ calendar |
| `quest_claims` | opened chests, PK `(user_id, day, quest_id)` so each opens once a day |
| `league_results` | one row per finished week: rank, old/new tier, result, prize, `seen` (drives the popup) |

Design choices:
- **Completed sessions are the XP ledger.** Daily goal, quests, the weekly leaderboard, the profile
  chart and lesson completion are all queries over `sessions` — there's no duplicated counter to drift.
- **Time-based state settles lazily** when the learner is loaded: heart regeneration, streak freezes
  for missed days (or losing the streak), and closing any finished league week. No cron job needed,
  and the "Simulate next day" tool exercises exactly the same code path.
- **Unlocking is derived**: a skill unlocks when every lesson in the previous skill has a completed
  session. Nothing to keep in sync.
- **Exercise payloads are JSON** because each type has a different shape; the type column plus a
  `json_valid` CHECK keep it honest. Content is relational down to the exercise.
- Foreign keys with `ON DELETE CASCADE`, CHECK constraints on enums and ranges, indexes on
  `sessions(user_id, completed_day)`, `sessions(user_id, lesson_id)` and `attempts`.

## API

| Method & path | Description |
|---|---|
| `GET /api/me` | learner stats, hearts (after regen), streak, daily XP, quests |
| `PATCH /api/me` | update `display_name`, `daily_goal` |
| `GET /api/path` | units → skills with state and progress |
| `POST /api/sessions` | start `{kind: "lesson", lesson_id}`, `{kind: "practice"}` or `{kind: "timed"}`; 403 if locked, 409 if out of hearts |
| `POST /api/sessions/{id}/answer` | grade `{exercise_id, answer}` → `{correct, solution, hearts, out_of_hearts}`; 409 `time_up` after a timed run's deadline |
| `POST /api/sessions/{id}/complete` | award XP, gems, streak, achievements |
| `GET /api/profile` | stats, achievements with progress, 7-day history |
| `GET /api/leaderboard` | current league, promotion/demotion sizes, ranking, unseen last-week result |
| `POST /api/leaderboard/seen` | dismiss the end-of-week result |
| `POST /api/quests/{id}/claim` | open a finished quest's chest (409 if already opened) |
| `POST /api/shop/freeze` | buy a streak freeze |
| `GET /api/units/{id}/guidebook` | a unit's key words and phrases |
| `POST /api/hearts/refill` | spend gems for full hearts |
| `POST /api/dev/advance-day` | move the simulated clock one day forward |
| `POST /api/dev/reset` | rebuild and reseed the database |

Interactive docs: `http://localhost:8000/docs`.

## Deployment

- **Frontend** on Vercel: root directory `frontend`, env `NEXT_PUBLIC_API_URL=https://lingo-api-n7jg.onrender.com`.
- **Backend** on Render from `render.yaml` (free web service, `CORS_ORIGINS` set to the Vercel URL).
- SQLite lives on the service's disk, which is ephemeral on Render's free tier: the database is
  re-seeded to the demo state whenever the service restarts or redeploys.

## Assumptions

- **One default learner** (`USER_ID = 1`), no login; the assignment allows simplified auth.
- Course content is small and seeded: Spanish for English speakers, 9 skills × 2 lessons × 8 exercises.
  Exercises are generated deterministically from per-skill vocabulary and sentences in `content.py`.
- Audio uses the browser's speech synthesis (no audio files needed); it's silent where unsupported.
- Leagues: the other 29 learners are seeded bots who practise on most simulated days (more in higher
  leagues). Real Duolingo reshuffles leagues weekly; here the same bots move with you.
- The streak/day logic uses a simulated date (real date + offset), so it can be demoed without waiting.
- Gems are a mock currency; Super, speaking exercises, friends and other languages are "Coming soon".

## Product research behind the features

Features beyond the brief come from Duolingo's own published findings, not guesswork:

| Feature | Source finding |
|---|---|
| Leagues with promotion | Jorge Mazal (ex-Duolingo product lead): leagues raised learning time +17% and tripled highly engaged learners |
| Streak freezes | Duolingo blog: allowing equipped freezes raised daily active learners; loss aversion starts around a 7-day streak |
| Earn back, streak saver | Duolingo retention PM (Lenny's podcast): restore lost streaks with lessons, nudge late in the day |
| Milestones, perfect streak | Duolingo blog: milestone animations raised 7-day retention +1.7% |
| Review by predicted recall | Duolingo research (Settles & Meeder 2016): half-life regression, +12% activity |
| Hearts, not energy | Duolingo started replacing hearts with energy on iOS in 2025; kept hearts because the brief requires them |

## Credits

The frontend began from [sanidhyy/duolingo-clone](https://github.com/sanidhyy/duolingo-clone)
(MIT, see `frontend/LICENSE`): the visual shell (sidebar, button styles, exit modal, mascot and icon
SVGs, sound effects) was kept. Its Clerk/Drizzle/Postgres/Stripe data layer and two-type quiz were
replaced; the backend, database schema, lesson engine, path, and the gamification and practice systems
are new. Not affiliated with Duolingo.
