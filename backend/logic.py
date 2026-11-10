"""Pure game rules: grading, hearts, streaks, XP. No database access here."""

import re
import unicodedata
from datetime import date, datetime, timedelta

MAX_HEARTS = 5
HEART_REGEN = timedelta(minutes=30)
REFILL_COST = 350
LESSON_XP = 10
PERFECT_BONUS = 5
PRACTICE_XP = 5
LESSON_GEMS = 5


def normalize(text: str) -> str:
    """Lowercase, drop accents and punctuation, collapse spaces: 'Que hora es?' -> 'que hora es'."""
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^\w\s]", "", text)
    return " ".join(text.split())


def grade(kind: str, payload: dict, answer) -> bool:
    if kind in ("select", "fill"):
        return answer == payload["answer"]
    if kind == "match":
        try:
            given = {(a, b) for a, b in answer}
        except (TypeError, ValueError):
            return False
        return given == {tuple(p) for p in payload["pairs"]}
    # translate (word bank: list of tiles), type and listen (free text)
    if isinstance(answer, list):
        answer = " ".join(map(str, answer))
    if not isinstance(answer, str):
        return False
    return normalize(answer) in {normalize(a) for a in payload["accepted"]}


def solution(kind: str, payload: dict) -> str:
    if kind in ("select", "fill"):
        return payload["answer"]
    if kind == "match":
        return ", ".join(f"{a} = {b}" for a, b in payload["pairs"])
    return payload["accepted"][0]


def public_payload(kind: str, payload: dict) -> dict:
    """What the client may see. Match pairs are needed client-side to grade each tap."""
    hidden = {"answer", "accepted"}
    return {k: v for k, v in payload.items() if k not in hidden}


def regen_hearts(hearts: int, updated_at: datetime, now: datetime) -> tuple[int, datetime]:
    if hearts >= MAX_HEARTS:
        return hearts, updated_at
    gained = int((now - updated_at) / HEART_REGEN)
    if gained <= 0:
        return hearts, updated_at
    return min(MAX_HEARTS, hearts + gained), updated_at + gained * HEART_REGEN


def next_streak(streak: int, last: date | None, today: date) -> tuple[int, bool]:
    """Streak after earning XP today. Returns (streak, extended_today)."""
    if last == today:
        return streak, False
    if last == today - timedelta(days=1):
        return streak + 1, True
    return 1, True


def current_streak(streak: int, last: date | None, today: date) -> int:
    """Streak as displayed: broken if the learner missed a full day."""
    return streak if last and last >= today - timedelta(days=1) else 0


def session_xp(kind: str, mistakes: int) -> int:
    if kind == "practice":
        return PRACTICE_XP
    return LESSON_XP + (PERFECT_BONUS if mistakes == 0 else 0)
