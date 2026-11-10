"""Game state that needs the database: learner loading, path unlocking, stats, achievements."""

import json
import random
import sqlite3
from datetime import date, datetime, timedelta

import db
import logic


class NotFound(Exception):
    pass


def parse_day(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def load_user(conn: sqlite3.Connection, user_id: int) -> sqlite3.Row:
    """Fetch a learner with time-based state brought up to date:
    heart regeneration, streak freezes / lost streaks, and last week's league result."""
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None:
        raise NotFound("User not found")
    hearts, updated = logic.regen_hearts(
        user["hearts"], datetime.fromisoformat(user["hearts_updated_at"]), db.now()
    )
    if hearts != user["hearts"]:
        conn.execute(
            "UPDATE users SET hearts = ?, hearts_updated_at = ? WHERE id = ?",
            (hearts, updated.isoformat(), user_id),
        )
    settle_streak(conn, user)
    settle_league(conn, user)
    return conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def settle_streak(conn, user) -> None:
    today = db.today(conn)
    streak, last, freezes, frozen, lost = logic.settle_missed_days(
        user["streak"], parse_day(user["last_streak_date"]), today, user["streak_freezes"]
    )
    if frozen:
        conn.executemany(
            "INSERT OR IGNORE INTO streak_freeze_days (user_id, day) VALUES (?, ?)",
            [(user["id"], d.isoformat()) for d in frozen],
        )
        conn.execute(
            """UPDATE users SET last_streak_date = ?, streak_freezes = ?,
                      freezes_in_streak = freezes_in_streak + ? WHERE id = ?""",
            (last.isoformat(), freezes, len(frozen), user["id"]),
        )
    if lost:
        conn.execute(
            "UPDATE users SET streak = 0, freezes_in_streak = 0, lost_streak = ?, lost_streak_on = ? WHERE id = ?",
            (lost, today.isoformat(), user["id"]),
        )
    elif user["lost_streak"] and today > parse_day(user["lost_streak_on"]) + timedelta(days=logic.EARN_BACK_DAYS):
        conn.execute("UPDATE users SET lost_streak = 0, lost_streak_on = NULL WHERE id = ?", (user["id"],))


def weekly_ranking(conn, start: date) -> list[sqlite3.Row]:
    """Everyone in the league for the week starting `start`, best first."""
    return conn.execute(
        """SELECT u.id, u.display_name, u.avatar, COALESCE(SUM(s.xp_earned), 0) AS weekly_xp
           FROM users u
           LEFT JOIN sessions s ON s.user_id = u.id AND s.completed_day BETWEEN ? AND ?
           GROUP BY u.id
           ORDER BY weekly_xp DESC, u.id
           LIMIT ?""",
        (start.isoformat(), (start + timedelta(days=6)).isoformat(), logic.LEAGUE_SIZE),
    ).fetchall()


def settle_league(conn, user) -> None:
    """Close every finished week since the learner's tier was last updated (promote / demote / prize)."""
    if user["is_bot"]:
        return
    current, _ = week_bounds(db.today(conn))
    week = parse_day(user["league_week"]) or current
    tier, prize_total = user["league_tier"], 0
    while week < current:
        rows = weekly_ranking(conn, week)
        rank, my_xp = next((i + 1, r["weekly_xp"]) for i, r in enumerate(rows) if r["id"] == user["id"])
        new_tier, result = logic.league_outcome(tier, rank, len(rows), my_xp)
        prize = logic.TOP3_GEMS if rank <= 3 and my_xp > 0 else 0
        conn.execute(
            """INSERT OR REPLACE INTO league_results (user_id, week_start, tier, rank, new_tier, result, gems)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user["id"], week.isoformat(), tier, rank, new_tier, result, prize),
        )
        tier, prize_total, week = new_tier, prize_total + prize, week + timedelta(days=7)
    if parse_day(user["league_week"]) != current:
        conn.execute(
            "UPDATE users SET league_tier = ?, league_week = ?, gems = gems + ? WHERE id = ?",
            (tier, current.isoformat(), prize_total, user["id"]),
        )


def completed_lessons(conn, user_id) -> set[int]:
    rows = conn.execute(
        "SELECT DISTINCT lesson_id FROM sessions WHERE user_id = ? AND kind = 'lesson' AND completed_at IS NOT NULL",
        (user_id,),
    )
    return {r[0] for r in rows}


def build_path(conn, user_id) -> list[dict]:
    """Units with their skills. A skill unlocks once every lesson of the previous skill is done."""
    done = completed_lessons(conn, user_id)
    rows = conn.execute(
        """SELECT u.id AS unit_id, u.position AS unit_position, u.title AS unit_title, u.description, u.color,
                  s.id AS skill_id, s.title AS skill_title, s.icon, l.id AS lesson_id
           FROM units u
           JOIN skills s ON s.unit_id = u.id
           JOIN lessons l ON l.skill_id = s.id
           ORDER BY u.position, s.position, l.position"""
    ).fetchall()

    units: dict[int, dict] = {}
    skills: dict[int, dict] = {}
    for r in rows:
        unit = units.setdefault(
            r["unit_id"],
            {"id": r["unit_id"], "position": r["unit_position"], "title": r["unit_title"],
             "description": r["description"], "color": r["color"], "skills": []},
        )
        if r["skill_id"] not in skills:
            skills[r["skill_id"]] = {"id": r["skill_id"], "title": r["skill_title"], "icon": r["icon"], "lesson_ids": []}
            unit["skills"].append(skills[r["skill_id"]])
        skills[r["skill_id"]]["lesson_ids"].append(r["lesson_id"])

    previous_complete = True
    for skill in skills.values():
        ids = skill.pop("lesson_ids")
        finished = [i for i in ids if i in done]
        complete = len(finished) == len(ids)
        skill["lessons_total"] = len(ids)
        skill["lessons_done"] = len(finished)
        skill["state"] = "completed" if complete and previous_complete else "active" if previous_complete else "locked"
        skill["next_lesson_id"] = next((i for i in ids if i not in done), ids[0])
        previous_complete = previous_complete and complete
    return list(units.values())


def lesson_unlocked(conn, user_id, lesson_id) -> bool:
    skill_id = conn.execute("SELECT skill_id FROM lessons WHERE id = ?", (lesson_id,)).fetchone()
    if skill_id is None:
        raise NotFound("Lesson not found")
    for unit in build_path(conn, user_id):
        for skill in unit["skills"]:
            if skill["id"] == skill_id[0]:
                return skill["state"] != "locked"
    return False


def recall_scores(conn, user_id) -> dict[int, float]:
    """Predicted chance the learner still remembers each exercise they've seen (half-life regression)."""
    today = db.today(conn)
    rows = conn.execute(
        """SELECT a.exercise_id, SUM(a.correct) AS right, SUM(1 - a.correct) AS wrong,
                  MAX(COALESCE(s.completed_day, substr(a.created_at, 1, 10))) AS last_day
           FROM attempts a JOIN sessions s ON s.id = a.session_id
           WHERE s.user_id = ?
           GROUP BY a.exercise_id""",
        (user_id,),
    )
    return {
        r["exercise_id"]: logic.recall_probability(
            r["right"], r["wrong"], (today - date.fromisoformat(r["last_day"])).days + 0.5
        )
        for r in rows
    }


def due_exercise_ids(conn, user_id, threshold=0.5) -> list[int]:
    """Exercises likely forgotten (predicted recall below `threshold`), most-forgotten first."""
    scores = recall_scores(conn, user_id)
    return sorted((e for e, p in scores.items() if p < threshold), key=scores.get)


def practice_exercise_ids(conn, user_id, size=8) -> list[int]:
    """Half the session is the most-likely-forgotten exercises; the rest is a random mix."""
    scores = recall_scores(conn, user_id)
    ids = sorted(scores, key=scores.get)[: size // 2]
    done = completed_lessons(conn, user_id) or {
        conn.execute("SELECT id FROM lessons ORDER BY skill_id, position LIMIT 1").fetchone()[0]
    }
    marks = ",".join("?" * len(done))
    pool = [r[0] for r in conn.execute(f"SELECT id FROM exercises WHERE lesson_id IN ({marks})", tuple(done))]
    rng = random.Random()
    rng.shuffle(pool)
    ids += [i for i in pool if i not in ids][: size - len(ids)]
    rng.shuffle(ids)
    return ids


def day_xp(conn, user_id, day: date) -> int:
    return conn.execute(
        "SELECT COALESCE(SUM(xp_earned), 0) FROM sessions WHERE user_id = ? AND completed_day = ?",
        (user_id, day.isoformat()),
    ).fetchone()[0]


def stats(conn, user_id) -> dict:
    user = conn.execute("SELECT xp, longest_streak FROM users WHERE id = ?", (user_id,)).fetchone()
    lessons, perfect = conn.execute(
        """SELECT COUNT(*), COALESCE(SUM(mistakes = 0), 0) FROM sessions
           WHERE user_id = ? AND kind = 'lesson' AND completed_at IS NOT NULL""",
        (user_id,),
    ).fetchone()
    return {"xp": user["xp"], "streak": user["longest_streak"], "lessons": lessons, "perfect": perfect}


def award_achievements(conn, user_id) -> list[dict]:
    """Unlock every achievement whose threshold is now met; returns the newly unlocked ones."""
    current = stats(conn, user_id)
    pending = conn.execute(
        """SELECT * FROM achievements WHERE id NOT IN
           (SELECT achievement_id FROM user_achievements WHERE user_id = ?)""",
        (user_id,),
    ).fetchall()
    unlocked = [a for a in pending if current[a["metric"]] >= a["threshold"]]
    stamp = db.now().isoformat()
    for a in unlocked:
        conn.execute(
            "INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)",
            (user_id, a["id"], stamp),
        )
        conn.execute("UPDATE users SET gems = gems + ? WHERE id = ?", (a["reward_gems"], user_id))
    return [{"code": a["code"], "title": a["title"], "icon": a["icon"], "reward_gems": a["reward_gems"]} for a in unlocked]


def public_exercise(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "type": row["type"],
        "prompt": row["prompt"],
        **logic.public_payload(row["type"], json.loads(row["payload"])),
    }


def guidebook(conn, unit_id) -> dict:
    """Key words and phrases of a unit, collected from its own exercises."""
    unit = conn.execute("SELECT id, title, description, color FROM units WHERE id = ?", (unit_id,)).fetchone()
    if unit is None:
        raise NotFound("Unit not found")
    rows = conn.execute(
        """SELECT e.type, e.payload FROM exercises e
           JOIN lessons l ON l.id = e.lesson_id JOIN skills s ON s.id = l.skill_id
           WHERE s.unit_id = ? AND e.type IN ('match', 'translate')
           ORDER BY s.position, l.position, e.position""",
        (unit_id,),
    ).fetchall()
    words, phrases = {}, {}
    for r in rows:
        p = json.loads(r["payload"])
        if r["type"] == "match":
            for es, en in p["pairs"]:
                words.setdefault(es, en)
        elif p["source_lang"] == "es":
            phrases.setdefault(p["source"], p["accepted"][0])
        else:
            phrases.setdefault(p["accepted"][0], p["source"])
    return {
        **dict(unit),
        "words": [{"es": k, "en": v} for k, v in words.items()],
        "phrases": [{"es": k, "en": v} for k, v in phrases.items()],
    }


def week_bounds(day: date) -> tuple[date, date]:
    start = day - timedelta(days=day.weekday())
    return start, start + timedelta(days=6)
