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
TIMED_SECONDS = 90
TIMED_GRACE = timedelta(seconds=5)  # network slack for the last answer


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


def session_xp(kind: str, mistakes: int, correct: int = 0) -> int:
    if kind == "timed":
        return correct
    if kind == "practice":
        return PRACTICE_XP
    return LESSON_XP + (PERFECT_BONUS if mistakes == 0 else 0)


# ---------------------------------------------------------------- streak freezes and earn back

MAX_FREEZES = 3
FREEZE_UNLOCK_STREAK = 5  # first 5-day streak unlocks freezes; every 5-day milestone refills them
FREEZE_COST = 200
EARN_BACK_LESSONS = 3
EARN_BACK_DAYS = 2
STREAK_MILESTONES = (7, 30, 100, 365)


def settle_missed_days(streak: int, last: date | None, today: date, freezes: int):
    """Spend freezes on fully missed days since `last`.

    Returns (streak, last, freezes, frozen_days, lost_streak). Frozen days keep the streak alive
    without adding to it; if there aren't enough freezes the streak is lost (kept for earn back).
    """
    if streak == 0 or last is None or last >= today - timedelta(days=1):
        return streak, last, freezes, [], 0
    missed = (today - last).days - 1
    if missed <= freezes:
        days = [last + timedelta(days=i) for i in range(1, missed + 1)]
        return streak, today - timedelta(days=1), freezes - missed, days, 0
    return 0, last, freezes, [], streak


def freezes_after_practice(new_streak: int, longest: int, freezes: int) -> int:
    """Freeze inventory after the day's first lesson."""
    if new_streak >= FREEZE_UNLOCK_STREAK and new_streak % FREEZE_UNLOCK_STREAK == 0:
        return MAX_FREEZES
    if longest >= FREEZE_UNLOCK_STREAK:
        return min(MAX_FREEZES, freezes + 1)
    return freezes


# ---------------------------------------------------------------- leagues (Duolingo-style, 30 per group)

LEAGUES = ["Bronze", "Silver", "Gold", "Sapphire", "Ruby", "Emerald", "Amethyst", "Pearl", "Obsidian", "Diamond"]
PROMOTE = [20, 15, 10, 7, 7, 7, 7, 7, 5, 0]
DEMOTE = [0, 5, 5, 5, 5, 5, 5, 5, 5, 5]
LEAGUE_SIZE = 30
TOP3_GEMS = 60


def league_outcome(tier: int, rank: int, size: int, weekly_xp: int) -> tuple[int, str]:
    if weekly_xp > 0 and rank <= PROMOTE[tier]:
        return tier + 1, "promoted"
    if DEMOTE[tier] and rank > size - DEMOTE[tier]:
        return tier - 1, "demoted"
    return tier, "stayed"


# ---------------------------------------------------------------- spaced repetition

# ponytail: hand-set weights; fit theta on the attempts log (logistic regression on recall) once there's real data.
THETA = (0.0, 1.0, -1.0)  # bias, sqrt(correct), sqrt(wrong)


def recall_probability(correct: int, wrong: int, days_since: float) -> float:
    """Half-life regression (Settles & Meeder 2016): p = 2^(-delta/h), h = 2^(theta . x) in days."""
    half_life = 2 ** (THETA[0] + THETA[1] * (1 + correct) ** 0.5 + THETA[2] * (1 + wrong) ** 0.5)
    return 2 ** (-max(days_since, 0) / half_life)

QUEST_GEMS = {"xp": 10, "lessons": 15, "perfect": 20}  # bronze / silver / gold chest
