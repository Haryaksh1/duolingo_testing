-- Lingo schema. Content (courses → units → skills → lessons → exercises) is static and seeded;
-- learner state lives in users, sessions, attempts and user_achievements.
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS league_results;
DROP TABLE IF EXISTS quest_claims;
DROP TABLE IF EXISTS streak_freeze_days;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS attempts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS app_clock;

CREATE TABLE courses (
  id        INTEGER PRIMARY KEY,
  language  TEXT NOT NULL UNIQUE,          -- ISO code, e.g. 'es'
  title     TEXT NOT NULL,
  flag      TEXT NOT NULL                  -- image path served by the frontend
);

CREATE TABLE units (
  id          INTEGER PRIMARY KEY,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  color       TEXT NOT NULL,               -- theme key used by the path UI
  UNIQUE (course_id, position)
);

-- A skill is one node on the learning path; its progress ring = completed lessons / lessons.
CREATE TABLE skills (
  id        INTEGER PRIMARY KEY,
  unit_id   INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  title     TEXT NOT NULL,
  icon      TEXT NOT NULL,
  UNIQUE (unit_id, position)
);

CREATE TABLE lessons (
  id        INTEGER PRIMARY KEY,
  skill_id  INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  UNIQUE (skill_id, position)
);

-- payload holds the type-specific data, including the answer. The API strips answers before
-- sending exercises to the client, and grades server-side.
CREATE TABLE exercises (
  id        INTEGER PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  type      TEXT NOT NULL CHECK (type IN ('select', 'translate', 'match', 'fill', 'type', 'listen')),
  prompt    TEXT NOT NULL,
  payload   TEXT NOT NULL CHECK (json_valid(payload)),
  UNIQUE (lesson_id, position)
);

CREATE TABLE users (
  id                INTEGER PRIMARY KEY,
  username          TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  avatar            TEXT NOT NULL,
  is_bot            INTEGER NOT NULL DEFAULT 0 CHECK (is_bot IN (0, 1)),
  course_id         INTEGER NOT NULL REFERENCES courses(id),
  xp                INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  gems              INTEGER NOT NULL DEFAULT 0 CHECK (gems >= 0),
  hearts            INTEGER NOT NULL DEFAULT 5 CHECK (hearts BETWEEN 0 AND 5),
  hearts_updated_at TEXT NOT NULL,         -- UTC ISO timestamp; regeneration is computed from it
  streak            INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  longest_streak    INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_streak_date  TEXT,                  -- last (simulated) day the streak counted (practice or freeze)
  streak_freezes    INTEGER NOT NULL DEFAULT 0 CHECK (streak_freezes BETWEEN 0 AND 3),
  freezes_in_streak INTEGER NOT NULL DEFAULT 0,  -- 0 means a "perfect" streak
  lost_streak       INTEGER NOT NULL DEFAULT 0,  -- streak available to earn back (0 = none)
  lost_streak_on    TEXT,                         -- day the streak was lost; earn-back window starts here
  league_tier       INTEGER NOT NULL DEFAULT 0 CHECK (league_tier BETWEEN 0 AND 9),
  league_week       TEXT,                         -- Monday of the week the tier applies to
  daily_goal        INTEGER NOT NULL DEFAULT 20 CHECK (daily_goal IN (10, 20, 30, 50)),
  created_at        TEXT NOT NULL
);

-- One row per lesson/practice run. Completed sessions double as the XP history
-- (daily goal, weekly leaderboard, profile chart) and as lesson-completion records.
CREATE TABLE sessions (
  id            INTEGER PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id     INTEGER REFERENCES lessons(id) ON DELETE CASCADE,   -- NULL for practice / timed
  kind          TEXT NOT NULL CHECK (kind IN ('lesson', 'practice', 'timed')),
  exercise_ids  TEXT NOT NULL CHECK (json_valid(exercise_ids)),
  started_at    TEXT NOT NULL,
  completed_at  TEXT,
  completed_day TEXT,                      -- simulated calendar day of completion
  xp_earned     INTEGER NOT NULL DEFAULT 0,
  mistakes      INTEGER NOT NULL DEFAULT 0,
  CHECK (kind <> 'lesson' OR lesson_id IS NOT NULL)
);
CREATE INDEX idx_sessions_user_day ON sessions(user_id, completed_day);
CREATE INDEX idx_sessions_user_lesson ON sessions(user_id, lesson_id);

-- Every graded answer. Drives lesson completion checks and weakness-based practice.
CREATE TABLE attempts (
  id          INTEGER PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  correct     INTEGER NOT NULL CHECK (correct IN (0, 1)),
  answer      TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_attempts_session ON attempts(session_id);
CREATE INDEX idx_attempts_exercise ON attempts(exercise_id);

CREATE TABLE achievements (
  id          INTEGER PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,
  metric      TEXT NOT NULL CHECK (metric IN ('xp', 'streak', 'lessons', 'perfect')),
  threshold   INTEGER NOT NULL CHECK (threshold > 0),
  reward_gems INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE user_achievements (
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TEXT NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

-- Days a streak freeze covered (shown as snowflakes on the streak calendar).
CREATE TABLE streak_freeze_days (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);

-- One chest per daily quest per day.
CREATE TABLE quest_claims (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day      TEXT NOT NULL,
  quest_id TEXT NOT NULL CHECK (quest_id IN ('xp', 'lessons', 'perfect')),
  gems     INTEGER NOT NULL,
  PRIMARY KEY (user_id, day, quest_id)
);

-- Weekly league history; `seen` drives the end-of-week results popup.
CREATE TABLE league_results (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start TEXT NOT NULL,
  tier       INTEGER NOT NULL,
  rank       INTEGER NOT NULL,
  new_tier   INTEGER NOT NULL,
  result     TEXT NOT NULL CHECK (result IN ('promoted', 'demoted', 'stayed')),
  gems       INTEGER NOT NULL DEFAULT 0,
  seen       INTEGER NOT NULL DEFAULT 0 CHECK (seen IN (0, 1)),
  PRIMARY KEY (user_id, week_start)
);

-- Single-row clock offset so day-based logic (streaks, daily goal) is testable.
CREATE TABLE app_clock (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  day_offset INTEGER NOT NULL DEFAULT 0
);
INSERT INTO app_clock (id, day_offset) VALUES (1, 0);
