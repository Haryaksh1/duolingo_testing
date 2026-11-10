"""Lingo API: FastAPI routes over SQLite. Run: uvicorn main:app --reload"""

import json
import os
import random
import sqlite3
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import db
import logic
import seed
import services

# ponytail: single default learner (the assignment allows simplified auth); swap for a token lookup when real auth lands.
USER_ID = 1


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_if_missing()
    yield


app = FastAPI(title="Lingo API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(services.NotFound)
def not_found(_request: Request, exc: services.NotFound):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


Conn = sqlite3.Connection


def parse_day(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


# ---------------------------------------------------------------- learner


def me_payload(conn: Conn, user: sqlite3.Row) -> dict:
    today = db.today(conn)
    last = parse_day(user["last_streak_date"])
    daily = services.day_xp(conn, user["id"], today)
    lessons_today, perfect_today = conn.execute(
        """SELECT COUNT(*), COALESCE(SUM(mistakes = 0), 0) FROM sessions
           WHERE user_id = ? AND kind = 'lesson' AND completed_day = ?""",
        (user["id"], today.isoformat()),
    ).fetchone()
    next_heart = None
    if user["hearts"] < logic.MAX_HEARTS:
        next_heart = (datetime.fromisoformat(user["hearts_updated_at"]) + logic.HEART_REGEN).isoformat()
    course = conn.execute("SELECT title, flag FROM courses WHERE id = ?", (user["course_id"],)).fetchone()
    return {
        "id": user["id"],
        "display_name": user["display_name"],
        "avatar": user["avatar"],
        "course": dict(course),
        "xp": user["xp"],
        "gems": user["gems"],
        "hearts": user["hearts"],
        "max_hearts": logic.MAX_HEARTS,
        "next_heart_at": next_heart,
        "refill_cost": logic.REFILL_COST,
        "streak": logic.current_streak(user["streak"], last, today),
        "streak_extended_today": last == today,
        "longest_streak": user["longest_streak"],
        "daily_goal": user["daily_goal"],
        "daily_xp": daily,
        "today": today.isoformat(),
        "quests": [
            {"id": "xp", "title": f"Earn {user['daily_goal']} XP", "progress": daily, "target": user["daily_goal"]},
            {"id": "lessons", "title": "Complete 2 lessons", "progress": lessons_today, "target": 2},
            {"id": "perfect", "title": "Finish a lesson with no mistakes", "progress": perfect_today, "target": 1},
        ],
    }


@app.get("/api/me")
def get_me(conn: Conn = Depends(db.get_db)):
    return me_payload(conn, services.load_user(conn, USER_ID))


class SettingsIn(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=30)
    daily_goal: Literal[10, 20, 30, 50] | None = None


@app.patch("/api/me")
def update_me(body: SettingsIn, conn: Conn = Depends(db.get_db)):
    if body.display_name is not None:
        conn.execute("UPDATE users SET display_name = ? WHERE id = ?", (body.display_name.strip(), USER_ID))
    if body.daily_goal is not None:
        conn.execute("UPDATE users SET daily_goal = ? WHERE id = ?", (body.daily_goal, USER_ID))
    return me_payload(conn, services.load_user(conn, USER_ID))


@app.get("/api/path")
def get_path(conn: Conn = Depends(db.get_db)):
    return {"units": services.build_path(conn, USER_ID)}


@app.get("/api/profile")
def get_profile(conn: Conn = Depends(db.get_db)):
    user = services.load_user(conn, USER_ID)
    current = services.stats(conn, USER_ID)
    rows = conn.execute(
        """SELECT a.*, ua.unlocked_at FROM achievements a
           LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
           ORDER BY a.metric, a.threshold""",
        (USER_ID,),
    ).fetchall()
    today = db.today(conn)
    history = []
    for back in range(6, -1, -1):
        day = today - timedelta(days=back)
        history.append({"day": day.isoformat(), "xp": services.day_xp(conn, USER_ID, day)})
    return {
        "me": me_payload(conn, user),
        "created_at": user["created_at"],
        "stats": {**current, "to_review": len(services.weak_exercise_ids(conn, USER_ID, 1000))},
        "achievements": [
            {
                "code": a["code"], "title": a["title"], "description": a["description"], "icon": a["icon"],
                "progress": min(current[a["metric"]], a["threshold"]), "threshold": a["threshold"],
                "unlocked_at": a["unlocked_at"], "reward_gems": a["reward_gems"],
            }
            for a in rows
        ],
        "history": history,
    }


@app.get("/api/leaderboard")
def get_leaderboard(conn: Conn = Depends(db.get_db)):
    start, end = services.week_bounds(db.today(conn))
    rows = conn.execute(
        """SELECT u.id, u.display_name, u.avatar, COALESCE(SUM(s.xp_earned), 0) AS weekly_xp
           FROM users u
           LEFT JOIN sessions s ON s.user_id = u.id AND s.completed_day BETWEEN ? AND ?
           GROUP BY u.id
           ORDER BY weekly_xp DESC, u.id
           LIMIT 30""",
        (start.isoformat(), end.isoformat()),
    ).fetchall()
    return {
        "league": "Bronze",
        "week_start": start.isoformat(),
        "days_left": (end - db.today(conn)).days,
        "rows": [{"rank": i + 1, **dict(r), "is_me": r["id"] == USER_ID} for i, r in enumerate(rows)],
    }


@app.post("/api/hearts/refill")
def refill_hearts(conn: Conn = Depends(db.get_db)):
    user = services.load_user(conn, USER_ID)
    if user["hearts"] >= logic.MAX_HEARTS:
        raise HTTPException(400, "Hearts are already full")
    if user["gems"] < logic.REFILL_COST:
        raise HTTPException(400, "Not enough gems")
    conn.execute(
        "UPDATE users SET hearts = ?, gems = gems - ?, hearts_updated_at = ? WHERE id = ?",
        (logic.MAX_HEARTS, logic.REFILL_COST, db.now().isoformat(), USER_ID),
    )
    return me_payload(conn, services.load_user(conn, USER_ID))


# ---------------------------------------------------------------- lesson loop


class SessionIn(BaseModel):
    kind: Literal["lesson", "practice"] = "lesson"
    lesson_id: int | None = None


@app.post("/api/sessions", status_code=201)
def start_session(body: SessionIn, conn: Conn = Depends(db.get_db)):
    user = services.load_user(conn, USER_ID)
    title = "Practice"
    if body.kind == "lesson":
        if body.lesson_id is None:
            raise HTTPException(422, "lesson_id is required")
        if not services.lesson_unlocked(conn, USER_ID, body.lesson_id):
            raise HTTPException(403, "This lesson is locked")
        if user["hearts"] == 0:
            raise HTTPException(409, "out_of_hearts")
        ids = [r[0] for r in conn.execute("SELECT id FROM exercises WHERE lesson_id = ? ORDER BY position", (body.lesson_id,))]
        title = conn.execute(
            "SELECT s.title FROM skills s JOIN lessons l ON l.skill_id = s.id WHERE l.id = ?", (body.lesson_id,)
        ).fetchone()[0]
    else:
        ids = services.practice_exercise_ids(conn, USER_ID)

    session_id = conn.execute(
        "INSERT INTO sessions (user_id, lesson_id, kind, exercise_ids, started_at) VALUES (?, ?, ?, ?, ?)",
        (USER_ID, body.lesson_id if body.kind == "lesson" else None, body.kind, json.dumps(ids), db.now().isoformat()),
    ).lastrowid
    marks = ",".join("?" * len(ids))
    by_id = {r["id"]: r for r in conn.execute(f"SELECT * FROM exercises WHERE id IN ({marks})", ids)}
    return {
        "id": session_id,
        "kind": body.kind,
        "lesson_id": body.lesson_id,
        "title": title,
        "hearts": user["hearts"],
        "exercises": [services.public_exercise(by_id[i]) for i in ids],
    }


def open_session(conn: Conn, session_id: int) -> sqlite3.Row:
    s = conn.execute("SELECT * FROM sessions WHERE id = ? AND user_id = ?", (session_id, USER_ID)).fetchone()
    if s is None:
        raise HTTPException(404, "Session not found")
    if s["completed_at"]:
        raise HTTPException(409, "Session already completed")
    return s


class AnswerIn(BaseModel):
    exercise_id: int
    answer: str | list[str] | list[list[str]]


@app.post("/api/sessions/{session_id}/answer")
def answer(session_id: int, body: AnswerIn, conn: Conn = Depends(db.get_db)):
    s = open_session(conn, session_id)
    if body.exercise_id not in json.loads(s["exercise_ids"]):
        raise HTTPException(400, "Exercise is not part of this session")
    user = services.load_user(conn, USER_ID)
    if s["kind"] == "lesson" and user["hearts"] == 0:
        raise HTTPException(409, "out_of_hearts")

    ex = conn.execute("SELECT * FROM exercises WHERE id = ?", (body.exercise_id,)).fetchone()
    payload = json.loads(ex["payload"])
    correct = logic.grade(ex["type"], payload, body.answer)
    conn.execute(
        "INSERT INTO attempts (session_id, exercise_id, correct, answer, created_at) VALUES (?, ?, ?, ?, ?)",
        (session_id, ex["id"], int(correct), json.dumps(body.answer, ensure_ascii=False), db.now().isoformat()),
    )
    hearts = user["hearts"]
    if not correct and s["kind"] == "lesson":
        hearts -= 1
        # The regen clock starts when the first heart is lost.
        updated = db.now().isoformat() if user["hearts"] == logic.MAX_HEARTS else user["hearts_updated_at"]
        conn.execute("UPDATE users SET hearts = ?, hearts_updated_at = ? WHERE id = ?", (hearts, updated, USER_ID))
    return {
        "correct": correct,
        "solution": logic.solution(ex["type"], payload),
        "hearts": hearts,
        "out_of_hearts": s["kind"] == "lesson" and hearts == 0,
    }


@app.post("/api/sessions/{session_id}/complete")
def complete(session_id: int, conn: Conn = Depends(db.get_db)):
    s = open_session(conn, session_id)
    attempts = conn.execute("SELECT exercise_id, correct FROM attempts WHERE session_id = ?", (session_id,)).fetchall()
    solved = {a["exercise_id"] for a in attempts if a["correct"]}
    if not set(json.loads(s["exercise_ids"])) <= solved:
        raise HTTPException(400, "Every exercise must be answered correctly first")
    user = services.load_user(conn, USER_ID)
    if s["kind"] == "lesson" and user["hearts"] == 0:
        raise HTTPException(409, "out_of_hearts")

    first_completion = s["kind"] == "lesson" and s["lesson_id"] not in services.completed_lessons(conn, USER_ID)
    mistakes = sum(1 for a in attempts if not a["correct"])
    xp = logic.session_xp(s["kind"], mistakes)
    gems = logic.LESSON_GEMS if s["kind"] == "lesson" else 0
    hearts = min(logic.MAX_HEARTS, user["hearts"] + 1) if s["kind"] == "practice" else user["hearts"]
    today = db.today(conn)
    streak, extended = logic.next_streak(user["streak"], parse_day(user["last_streak_date"]), today)

    conn.execute(
        """UPDATE users SET xp = xp + ?, gems = gems + ?, hearts = ?, streak = ?,
                  longest_streak = MAX(longest_streak, ?), last_streak_date = ? WHERE id = ?""",
        (xp, gems, hearts, streak, streak, today.isoformat(), USER_ID),
    )
    conn.execute(
        "UPDATE sessions SET completed_at = ?, completed_day = ?, xp_earned = ?, mistakes = ? WHERE id = ?",
        (db.now().isoformat(), today.isoformat(), xp, mistakes, session_id),
    )
    unlocked = services.award_achievements(conn, USER_ID)
    total = len(attempts)
    return {
        "xp": xp,
        "gems": gems,
        "mistakes": mistakes,
        "accuracy": round(100 * (total - mistakes) / total) if total else 100,
        "first_completion": first_completion,
        "streak_extended": extended,
        "achievements": unlocked,
        "me": me_payload(conn, services.load_user(conn, USER_ID)),
    }


# ---------------------------------------------------------------- testing helpers


@app.post("/api/dev/advance-day")
def advance_day(conn: Conn = Depends(db.get_db)):
    """Move the simulated calendar forward a day (to demo streaks and daily goals)."""
    conn.execute("UPDATE app_clock SET day_offset = day_offset + 1 WHERE id = 1")
    seed.simulate_bots(conn, db.today(conn), random.Random())
    return me_payload(conn, services.load_user(conn, USER_ID))


@app.post("/api/dev/reset")
def reset_progress():
    conn = db.connect()
    try:
        seed.reset(conn)
    finally:
        conn.close()
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"ok": True}
