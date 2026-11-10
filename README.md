# Lingo — a Duolingo-style language-learning web app

Learn Spanish through a learning path of units and skills, lessons with six interactive exercise
types, and the gamification loop: XP, streaks, hearts, gems, a daily goal, quests, achievements and a
weekly leaderboard. All progress persists in SQLite.

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
  gems, daily goal (10/20/30/50 XP), three daily quests, nine achievements with gem rewards, weekly
  Bronze league against seeded learners.
- **Practice** — builds a session from the exercises you miss most (net misses > corrects), topped
  up with exercises from completed lessons. Works with zero hearts and earns one back.
- **Profile** — stats, a 7-day XP chart, achievements with progress, "exercises to review".
- **Settings** — display name, daily goal, course list (other languages "Coming soon"), and testing
  tools: *Simulate next day* (moves the app clock to check streak and daily-goal logic) and
  *Reset progress*.
- Responsive: sidebar + stats rail on desktop; top stats bar + bottom tab bar on mobile.

## Architecture

```
frontend/  Next.js
  app/(main)/          pages with sidebar + stats rail (learn, leaderboard, quests, shop, profile, settings)
  app/lesson/          lesson player: player.tsx (state machine), exercises.tsx (one component per type)
  app/practice/        practice session (same player)
  components/          shared UI (sidebar, stats bar, quests, icons, shadcn/ui primitives)
  lib/api.ts           typed API client (the only place that talks to the backend)
backend/   FastAPI
  main.py              HTTP routes and request validation
  services.py          game state that needs the DB: heart regen on read, path unlocking, stats, achievements
  logic.py             pure rules: grading, answer normalisation, hearts, streaks, XP
  db.py                connection per request (one transaction), simulated clock
  schema.sql           tables, constraints, indexes
  content.py, seed.py  Spanish course data → generated exercises, sample learner, leaderboard bots
  test_api.py          rule checks + an end-to-end lesson-loop test
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
app_clock (single row: day offset for simulated dates)
```

| Table | Purpose / key columns |
|---|---|
| `courses` | one per language (`language` unique) |
| `units` | `course_id`, `position`, `title`, `description`, `color` — unique `(course_id, position)` |
| `skills` | a node on the path; `unit_id`, `position`, `title`, `icon` |
| `lessons` | `skill_id`, `position` |
| `exercises` | `lesson_id`, `position`, `type` (CHECK in 6 types), `prompt`, `payload` (JSON, CHECK `json_valid`) holding type-specific data incl. the answer |
| `users` | learner and leaderboard bots: `xp`, `gems`, `hearts` (CHECK 0–5), `hearts_updated_at`, `streak`, `longest_streak`, `last_streak_date`, `daily_goal` (CHECK in 10/20/30/50) |
| `sessions` | one lesson or practice run: `kind`, `lesson_id` (NULL for practice), `exercise_ids`, `completed_at`, `completed_day`, `xp_earned`, `mistakes` |
| `attempts` | every graded answer: `session_id`, `exercise_id`, `correct`, `answer` |
| `achievements` | `code`, `metric` (xp / streak / lessons / perfect), `threshold`, `reward_gems` |
| `user_achievements` | PK `(user_id, achievement_id)`, `unlocked_at` |

Design choices:
- **Completed sessions are the XP ledger.** Daily goal, quests, the weekly leaderboard, the profile
  chart and lesson completion are all queries over `sessions` — there's no duplicated counter to drift.
- **Hearts regenerate lazily**: stored as `(hearts, hearts_updated_at)` and topped up whenever the user
  is loaded, so no background job is needed.
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
| `POST /api/sessions` | start `{kind: "lesson", lesson_id}` or `{kind: "practice"}`; 403 if locked, 409 if out of hearts |
| `POST /api/sessions/{id}/answer` | grade `{exercise_id, answer}` → `{correct, solution, hearts, out_of_hearts}` |
| `POST /api/sessions/{id}/complete` | award XP, gems, streak, achievements |
| `GET /api/profile` | stats, achievements with progress, 7-day history |
| `GET /api/leaderboard` | this week's league ranking |
| `POST /api/hearts/refill` | spend gems for full hearts |
| `POST /api/dev/advance-day` | move the simulated clock one day forward |
| `POST /api/dev/reset` | rebuild and reseed the database |

Interactive docs: `http://localhost:8000/docs`.

## Assumptions

- **One default learner** (`USER_ID = 1`), no login; the assignment allows simplified auth.
- Course content is small and seeded: Spanish for English speakers, 9 skills × 2 lessons × 8 exercises.
  Exercises are generated deterministically from per-skill vocabulary and sentences in `content.py`.
- Audio uses the browser's speech synthesis (no audio files needed); it's silent where unsupported.
- The leaderboard is a single Bronze league with nine seeded learners who "practise" on each simulated
  day. No promotion between leagues.
- The streak/day logic uses a simulated date (real date + offset), so it can be demoed without waiting.
- Gems are a mock currency; Super, speaking exercises, friends and other languages are "Coming soon".

## Credits

The frontend began from [sanidhyy/duolingo-clone](https://github.com/sanidhyy/duolingo-clone)
(MIT, see `frontend/LICENSE`): the visual shell (sidebar, button styles, exit modal, mascot and icon
SVGs, sound effects) was kept. Its Clerk/Drizzle/Postgres/Stripe data layer and two-type quiz were
replaced; the backend, database schema, lesson engine, path, and the gamification and practice systems
are new. Not affiliated with Duolingo.
