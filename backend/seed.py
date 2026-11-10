"""Rebuild the database: schema, course content, achievements, sample learner, leaderboard bots.

Run directly (`python seed.py`) to reset the local database.
"""

import json
import random
import re
from datetime import date, timedelta

import db
import logic
import services
from content import ACHIEVEMENTS, BOT_NAMES, COURSE, UNITS

LESSONS_PER_SKILL = 2
LEARNER_ID = 1


def first(alts: str) -> str:
    return alts.split("|")[0]


def tiles_of(sentence: str) -> list[str]:
    return [w for w in (re.sub(r"[^\w']", "", t) for t in sentence.split()) if w]


def distractors(rng: random.Random, pool: list[str], exclude: list[str], n: int) -> list[str]:
    taken = {logic.normalize(w) for w in exclude}
    choices = sorted({w for w in pool if logic.normalize(w) not in taken})
    return rng.sample(choices, min(n, len(choices)))


def select_ex(rng, vocab, target):
    es, en, _ = target
    others = rng.sample([v for v in vocab if v != target], 2)
    options = [{"text": v[0], "image": v[2]} for v in [target, *others]]
    rng.shuffle(options)
    return ("select", f"Which one is “{first(en)}”?", {"options": options, "answer": es})


def fill_ex(rng, vocab, sentence):
    es, en = sentence
    words = es.split()
    i = max(range(len(words)), key=lambda k: len(re.sub(r"\W", "", words[k])))
    pre, core, post = re.match(r"^(\W*)(\w+)(\W*)$", words[i]).groups()
    pool = [v[0].split()[-1] for v in vocab]
    options = [core, *distractors(rng, pool, [core], 2)]
    rng.shuffle(options)
    return (
        "fill",
        "Fill in the blank",
        {
            "before": " ".join(words[:i] + [pre]).strip(),
            "after": " ".join([post] + words[i + 1 :]).strip(),
            "translation": first(en),
            "options": options,
            "answer": core,
        },
    )


def translate_ex(rng, sentence, to_english, en_pool, es_pool):
    es, en = sentence
    if to_english:
        source, answer, pool, prompt = es, first(en), en_pool, "Write this in English"
        accepted = en.split("|")
    else:
        source, answer, pool, prompt = first(en), es, es_pool, "Write this in Spanish"
        accepted = [es]
    tiles = tiles_of(answer)
    tiles += distractors(rng, pool, tiles, 3)
    rng.shuffle(tiles)
    lang = "es" if to_english else "en"
    return ("translate", prompt, {"source": source, "source_lang": lang, "tiles": tiles, "accepted": accepted})


def lesson_exercises(rng, skill, idx, en_pool, es_pool):
    vocab, sents = skill["vocab"], skill["sentences"]
    v = vocab[idx * 2 : idx * 2 + 4]
    s = sents[idx * 2 : idx * 2 + 2]
    es_word, en_word, _ = v[2]
    accepted_type = [es_word] + ([es_word.split(" ", 1)[1]] if es_word.split()[0] in ("el", "la") else [])
    return [
        select_ex(rng, vocab, v[0]),
        ("match", "Tap the matching pairs", {"pairs": [[x[0], first(x[1])] for x in v]}),
        translate_ex(rng, s[0], True, en_pool, es_pool),
        select_ex(rng, vocab, v[1]),
        fill_ex(rng, vocab, s[1]),
        translate_ex(rng, s[1], False, en_pool, es_pool),
        ("type", f"Type “{first(en_word)}” in Spanish", {"source": first(en_word), "accepted": accepted_type}),
        ("listen", "Type what you hear", {"text": s[0][0], "accepted": [s[0][0]]}),
    ]


def seed_content(conn, rng):
    cur = conn.execute(
        "INSERT INTO courses (language, title, flag) VALUES (?, ?, ?)",
        (COURSE["language"], COURSE["title"], COURSE["flag"]),
    )
    course_id = cur.lastrowid
    skills = [s for u in UNITS for s in u["skills"]]
    en_pool = [w for s in skills for _, en in s["sentences"] for w in tiles_of(first(en))]
    es_pool = [w for s in skills for es, _ in s["sentences"] for w in tiles_of(es)]

    for upos, unit in enumerate(UNITS):
        unit_id = conn.execute(
            "INSERT INTO units (course_id, position, title, description, color) VALUES (?, ?, ?, ?, ?)",
            (course_id, upos, unit["title"], unit["description"], unit["color"]),
        ).lastrowid
        for spos, skill in enumerate(unit["skills"]):
            skill_id = conn.execute(
                "INSERT INTO skills (unit_id, position, title, icon) VALUES (?, ?, ?, ?)",
                (unit_id, spos, skill["title"], skill["icon"]),
            ).lastrowid
            for lpos in range(LESSONS_PER_SKILL):
                lesson_id = conn.execute(
                    "INSERT INTO lessons (skill_id, position) VALUES (?, ?)", (skill_id, lpos)
                ).lastrowid
                for epos, (kind, prompt, payload) in enumerate(lesson_exercises(rng, skill, lpos, en_pool, es_pool)):
                    conn.execute(
                        "INSERT INTO exercises (lesson_id, position, type, prompt, payload) VALUES (?, ?, ?, ?, ?)",
                        (lesson_id, epos, kind, prompt, json.dumps(payload, ensure_ascii=False)),
                    )
    conn.executemany(
        "INSERT INTO achievements (code, title, description, icon, metric, threshold, reward_gems) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ACHIEVEMENTS,
    )
    return course_id


def add_completed_session(conn, user_id, day: date, xp, kind="practice", lesson_id=None, ids=(), mistakes=0):
    stamp = f"{day.isoformat()}T12:00:00+00:00"
    return conn.execute(
        """INSERT INTO sessions (user_id, lesson_id, kind, exercise_ids, started_at, completed_at,
                                 completed_day, xp_earned, mistakes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, lesson_id, kind, json.dumps(list(ids)), stamp, stamp, day.isoformat(), xp, mistakes),
    ).lastrowid


def simulate_bots(conn, day: date, rng: random.Random) -> None:
    """Bots practice on some days so the league stays alive as the clock moves.

    Each bot has its own diligence (30-90% of days), and bots in higher leagues earn more,
    so promotion gets harder as the learner climbs.
    """
    # ponytail: one shared cohort that scales with the learner's tier; real leagues regroup users weekly.
    tier = conn.execute("SELECT league_tier FROM users WHERE id = ?", (LEARNER_ID,)).fetchone()[0]
    for (bot_id,) in conn.execute("SELECT id FROM users WHERE is_bot = 1").fetchall():
        if rng.random() < 0.3 + (bot_id % 7) / 10:
            xp = round(rng.choice([10, 15, 20, 25, 30, 40, 55]) * (1 + 0.4 * tier))
            add_completed_session(conn, bot_id, day, xp)
            conn.execute("UPDATE users SET xp = xp + ? WHERE id = ?", (xp, bot_id))


def seed_users(conn, course_id, rng):
    today = db.today(conn)
    stamp = db.now().isoformat()
    conn.execute(
        """INSERT INTO users (id, username, display_name, avatar, course_id, gems, hearts,
                              hearts_updated_at, created_at, league_week)
           VALUES (?, 'learner', 'Sam', '/mascot.svg', ?, 500, ?, ?, ?, ?)""",
        (LEARNER_ID, course_id, logic.MAX_HEARTS, stamp, stamp, (today - timedelta(days=today.weekday())).isoformat()),
    )
    # Sample progress: three lessons over the last three days (one with a mistake).
    lessons = [r[0] for r in conn.execute("SELECT id FROM lessons ORDER BY skill_id, position LIMIT 3")]
    for offset, lesson_id in zip((3, 2, 1), lessons):
        ids = [r[0] for r in conn.execute("SELECT id FROM exercises WHERE lesson_id = ? ORDER BY position", (lesson_id,))]
        mistakes = 1 if offset == 2 else 0
        day = today - timedelta(days=offset)
        sid = add_completed_session(conn, LEARNER_ID, day, logic.session_xp("lesson", mistakes), "lesson", lesson_id, ids, mistakes)
        stamp_day = f"{day.isoformat()}T12:00:00+00:00"
        rows = [(sid, e, 1, '"seed"', stamp_day) for e in ids]
        if mistakes:
            rows.insert(0, (sid, ids[2], 0, '"seed"', stamp_day))
        conn.executemany(
            "INSERT INTO attempts (session_id, exercise_id, correct, answer, created_at) VALUES (?, ?, ?, ?, ?)", rows
        )
    xp = conn.execute("SELECT SUM(xp_earned) FROM sessions WHERE user_id = ?", (LEARNER_ID,)).fetchone()[0]
    conn.execute(
        "UPDATE users SET xp = ?, streak = 3, longest_streak = 3, last_streak_date = ? WHERE id = ?",
        (xp, (today - timedelta(days=1)).isoformat(), LEARNER_ID),
    )

    avatars = ["/girl.svg", "/boy.svg", "/woman.svg", "/man.svg", "/robot.svg", "/zombie.svg"]
    for i, name in enumerate(BOT_NAMES):
        conn.execute(
            """INSERT INTO users (username, display_name, avatar, is_bot, course_id, xp, hearts_updated_at, created_at)
               VALUES (?, ?, ?, 1, ?, ?, ?, ?)""",
            (f"bot{i}", name, avatars[i % len(avatars)], course_id, rng.randint(200, 3000), stamp, stamp),
        )
    week_start = today - timedelta(days=today.weekday())
    for d in range((today - week_start).days + 1):
        simulate_bots(conn, week_start + timedelta(days=d), rng)


def reset(conn) -> None:
    rng = random.Random(42)
    with conn:
        conn.executescript(db.SCHEMA)
        course_id = seed_content(conn, rng)
        seed_users(conn, course_id, rng)
        services.award_achievements(conn, LEARNER_ID)


if __name__ == "__main__":
    conn = db.connect()
    reset(conn)
    conn.close()
    print(f"Seeded {db.DB_PATH}")
