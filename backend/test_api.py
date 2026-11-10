"""Run: python -m pytest -q  (uses a throwaway database file)."""

import json
import os
import tempfile
from datetime import date, datetime, timedelta, timezone

os.environ["DATABASE_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")

from fastapi.testclient import TestClient  # noqa: E402

import db  # noqa: E402
import logic  # noqa: E402
import main  # noqa: E402
import seed  # noqa: E402


def test_rules():
    assert logic.normalize("¿Qué hora es?") == "que hora es"
    assert logic.grade("translate", {"accepted": ["I drink water"]}, ["I", "drink", "water"])
    assert logic.grade("type", {"accepted": ["el café"]}, "El cafe!")
    assert not logic.grade("type", {"accepted": ["el café"]}, "el pan")
    assert logic.grade("match", {"pairs": [["a", "1"], ["b", "2"]]}, [["b", "2"], ["a", "1"]])
    assert not logic.grade("match", {"pairs": [["a", "1"]]}, "garbage")
    t = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert logic.regen_hearts(2, t, t + timedelta(minutes=65)) == (4, t + timedelta(minutes=60))
    assert logic.regen_hearts(4, t, t + timedelta(hours=9))[0] == 5
    d = date(2026, 1, 10)
    assert logic.next_streak(3, d - timedelta(days=1), d) == (4, True)
    assert logic.next_streak(3, d, d) == (3, False)
    assert logic.next_streak(3, d - timedelta(days=2), d) == (1, True)
    assert logic.current_streak(3, d - timedelta(days=2), d) == 0


def test_new_rules():
    d = date(2026, 1, 10)
    # Freezes cover missed days; the streak survives and yesterday counts as the last day.
    assert logic.settle_missed_days(6, d - timedelta(days=3), d, 3) == (
        6, d - timedelta(days=1), 1, [d - timedelta(days=2), d - timedelta(days=1)], 0)
    # Not enough freezes: streak lost, nothing consumed, lost value kept for earn back.
    assert logic.settle_missed_days(6, d - timedelta(days=5), d, 3) == (0, d - timedelta(days=5), 3, [], 6)
    assert logic.settle_missed_days(6, d - timedelta(days=1), d, 0)[4] == 0  # nothing missed
    # Freezes unlock at a 5-day streak, refill every 5 days, otherwise +1 per practice day.
    assert logic.freezes_after_practice(4, 4, 0) == 0
    assert logic.freezes_after_practice(5, 5, 0) == 3
    assert logic.freezes_after_practice(7, 7, 1) == 2
    assert logic.freezes_after_practice(10, 10, 0) == 3
    # Leagues: Bronze promotes the top 20 of 30, demotion hits the bottom 5 above Bronze, no XP = no promotion.
    assert logic.league_outcome(0, 20, 30, 50) == (1, "promoted")
    assert logic.league_outcome(0, 30, 30, 5) == (0, "stayed")
    assert logic.league_outcome(3, 26, 30, 5) == (2, "demoted")
    assert logic.league_outcome(9, 1, 30, 999) == (9, "stayed")
    assert logic.league_outcome(0, 1, 30, 0) == (0, "stayed")
    # Half-life regression: practice raises recall, time and mistakes lower it.
    fresh, stale = logic.recall_probability(3, 0, 0.5), logic.recall_probability(3, 0, 10)
    assert 0 < stale < fresh <= 1
    assert logic.recall_probability(1, 3, 2) < logic.recall_probability(4, 0, 2)


def answers_for(session):
    conn = db.connect()
    out = {}
    for ex in session["exercises"]:
        row = conn.execute("SELECT type, payload FROM exercises WHERE id = ?", (ex["id"],)).fetchone()
        p = json.loads(row["payload"])
        out[ex["id"]] = p["pairs"] if row["type"] == "match" else p.get("answer") or p["accepted"][0]
    conn.close()
    return out


def test_lesson_loop():
    conn = db.connect()
    seed.reset(conn)
    conn.close()
    with TestClient(main.app) as c:
        me = c.get("/api/me").json()
        assert me["streak"] == 3 and me["hearts"] == 5 and not me["streak_extended_today"]

        skills = [s for u in c.get("/api/path").json()["units"] for s in u["skills"]]
        assert [s["state"] for s in skills[:3]] == ["completed", "active", "locked"]
        assert skills[1]["lessons_done"] == 1
        locked = c.post("/api/sessions", json={"lesson_id": skills[2]["next_lesson_id"]})
        assert locked.status_code == 403

        s = c.post("/api/sessions", json={"lesson_id": skills[1]["next_lesson_id"]}).json()
        assert all("answer" not in e and "accepted" not in e for e in s["exercises"])
        answers = answers_for(s)
        first = s["exercises"][0]["id"]

        wrong = c.post(f"/api/sessions/{s['id']}/answer", json={"exercise_id": first, "answer": "nope"}).json()
        assert not wrong["correct"] and wrong["hearts"] == 4
        assert c.post(f"/api/sessions/{s['id']}/complete").status_code == 400  # nothing solved yet

        for ex_id, ans in answers.items():
            r = c.post(f"/api/sessions/{s['id']}/answer", json={"exercise_id": ex_id, "answer": ans}).json()
            assert r["correct"], (ex_id, ans)
        done = c.post(f"/api/sessions/{s['id']}/complete").json()
        assert done["xp"] == 10 and done["streak_extended"] and done["me"]["streak"] == 4
        assert done["me"]["daily_xp"] == 10 and done["first_completion"]

        skills = [s for u in c.get("/api/path").json()["units"] for s in u["skills"]]
        assert [s["state"] for s in skills[:3]] == ["completed", "completed", "active"]

        # Out of hearts: four more misses empties the remaining hearts, then the lesson is blocked.
        s = c.post("/api/sessions", json={"lesson_id": skills[2]["next_lesson_id"]}).json()
        for _ in range(4):
            r = c.post(f"/api/sessions/{s['id']}/answer", json={"exercise_id": s["exercises"][0]["id"], "answer": "x"}).json()
        assert r["out_of_hearts"]
        assert c.post("/api/sessions", json={"lesson_id": skills[2]["next_lesson_id"]}).status_code == 409

        # Practice works without hearts and earns one back.
        p = c.post("/api/sessions", json={"kind": "practice"}).json()
        assert len(p["exercises"]) == 8
        for ex_id, ans in answers_for(p).items():
            c.post(f"/api/sessions/{p['id']}/answer", json={"exercise_id": ex_id, "answer": ans})
        assert c.post(f"/api/sessions/{p['id']}/complete").json()["me"]["hearts"] == 1

        # Simulated next day keeps the streak until a full day is missed.
        assert c.post("/api/dev/advance-day").json()["streak"] == 4
        assert c.post("/api/dev/advance-day").json()["streak"] == 0

        # Timed challenge: no completeness requirement, 1 XP per correct answer, no hearts lost.
        t = c.post("/api/sessions", json={"kind": "timed"}).json()
        assert t["time_limit"] == logic.TIMED_SECONDS and len(t["exercises"]) == 20
        ans = answers_for(t)
        first, second = t["exercises"][0]["id"], t["exercises"][1]["id"]
        c.post(f"/api/sessions/{t['id']}/answer", json={"exercise_id": first, "answer": ans[first]})
        miss = c.post(f"/api/sessions/{t['id']}/answer", json={"exercise_id": second, "answer": "nope"}).json()
        assert not miss["correct"] and miss["hearts"] == c.get("/api/me").json()["hearts"]
        timed = c.post(f"/api/sessions/{t['id']}/complete").json()
        assert timed["xp"] == 1 and timed["mistakes"] == 1

        # Answers after the deadline are refused.
        late = c.post("/api/sessions", json={"kind": "timed"}).json()
        conn = db.connect()
        with conn:
            conn.execute("UPDATE sessions SET started_at = '2000-01-01T00:00:00+00:00' WHERE id = ?", (late["id"],))
        conn.close()
        ex = late["exercises"][0]["id"]
        assert c.post(f"/api/sessions/{late['id']}/answer", json={"exercise_id": ex, "answer": "x"}).status_code == 409

        board = c.get("/api/leaderboard").json()["rows"]
        assert any(r["is_me"] for r in board)
        profile = c.get("/api/profile").json()
        assert any(a["unlocked_at"] for a in profile["achievements"])


def play_lesson(c):
    """Complete the current lesson on the path with all answers correct."""
    skills = [s for u in c.get("/api/path").json()["units"] for s in u["skills"]]
    lesson = next(s for s in skills if s["state"] == "active")["next_lesson_id"]
    s = c.post("/api/sessions", json={"lesson_id": lesson}).json()
    for ex_id, ans in answers_for(s).items():
        c.post(f"/api/sessions/{s['id']}/answer", json={"exercise_id": ex_id, "answer": ans})
    return c.post(f"/api/sessions/{s['id']}/complete").json()


def advance(c, days):
    for _ in range(days):
        me = c.post("/api/dev/advance-day").json()
    return me


def test_retention_features():
    conn = db.connect()
    seed.reset(conn)
    conn.close()
    with TestClient(main.app) as c:
        # Streak 3 -> 4 today, 5 tomorrow: the first 5-day streak unlocks 3 freezes.
        assert play_lesson(c)["me"]["streak"] == 4
        advance(c, 1)
        done = play_lesson(c)
        assert done["me"]["streak"] == 5 and done["me"]["streak_freezes"] == 3 and done["freezes_gained"] == 3

        # Miss two days: freezes cover them, the streak survives, the calendar shows snowflakes.
        me = advance(c, 3)
        assert me["streak"] == 5 and me["streak_freezes"] == 1 and not me["perfect_streak"]
        conn = db.connect()
        assert conn.execute("SELECT COUNT(*) FROM streak_freeze_days").fetchone()[0] == 2
        conn.close()
        assert play_lesson(c)["me"]["streak_freezes"] == 2  # practising brings one back

        # Miss four days with two freezes: the streak is lost but can be earned back with 3 lessons.
        me = advance(c, 5)
        assert me["streak"] == 0 and me["earn_back"]["lost_streak"] == 6
        results = [play_lesson(c) for _ in range(3)]
        assert [r["earned_back"] for r in results] == [False, False, True]
        assert results[-1]["me"]["streak"] == 7 and results[-1]["me"]["earn_back"] is None
        assert not results[-1]["me"]["perfect_streak"]

        # Quest chest: 3 lessons today beats "Complete 2 lessons"; a chest opens only once.
        gems = results[-1]["me"]["gems"]
        assert c.post("/api/quests/lessons/claim").json()["gems"] == gems + 15
        assert c.post("/api/quests/lessons/claim").status_code == 409

        # Shop: buy a freeze with gems (cap 3).
        me = c.get("/api/me").json()
        if me["streak_freezes"] < 3:
            bought = c.post("/api/shop/freeze").json()
            assert bought["streak_freezes"] == me["streak_freezes"] + 1
            assert bought["gems"] == me["gems"] - logic.FREEZE_COST

        # League: when the week ends, last week's result is waiting until it's been seen.
        board = c.get("/api/leaderboard").json()
        assert board["league"] in logic.LEAGUES and len(board["rows"]) == 30
        today = date.fromisoformat(c.get("/api/me").json()["today"])
        advance(c, 7 - today.weekday())
        board = c.get("/api/leaderboard").json()
        assert board["result"] is not None and board["result"]["result"] in ("promoted", "stayed", "demoted")
        c.post("/api/leaderboard/seen")
        assert c.get("/api/leaderboard").json()["result"] is None

        # Guidebook and hover hints.
        book = c.get("/api/units/1/guidebook").json()
        assert book["words"] and book["phrases"]
        s = c.post("/api/sessions", json={"kind": "practice"}).json()
        assert s["glossary"]["hola"] == "hello"
