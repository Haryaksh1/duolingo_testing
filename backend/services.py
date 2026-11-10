"""Game state that needs the database: learner loading, path unlocking, stats, achievements."""

import json
import random
import sqlite3
from datetime import date, datetime, timedelta

import db
import logic


class NotFound(Exception):
    pass


def load_user(conn: sqlite3.Connection, user_id: int) -> sqlite3.Row:
    """Fetch a learner, applying any heart regeneration since the last update."""
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
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return user


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


def weak_exercise_ids(conn, user_id, limit) -> list[int]:
    """Exercises missed more often than answered correctly, worst first."""
    rows = conn.execute(
        """SELECT a.exercise_id
           FROM attempts a JOIN sessions s ON s.id = a.session_id
           WHERE s.user_id = ?
           GROUP BY a.exercise_id
           HAVING SUM(CASE a.correct WHEN 0 THEN 1 ELSE -1 END) >= 0 AND SUM(1 - a.correct) > 0
           ORDER BY SUM(1 - a.correct) DESC, MAX(a.created_at) DESC
           LIMIT ?""",
        (user_id, limit),
    )
    return [r[0] for r in rows]


def practice_exercise_ids(conn, user_id, size=8) -> list[int]:
    ids = weak_exercise_ids(conn, user_id, size // 2)
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


def week_bounds(day: date) -> tuple[date, date]:
    start = day - timedelta(days=day.weekday())
    return start, start + timedelta(days=6)
