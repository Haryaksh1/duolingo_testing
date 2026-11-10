import os
import sqlite3
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

DB_PATH = os.environ.get("DATABASE_PATH", str(Path(__file__).with_name("lingo.db")))
SCHEMA = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")


def connect() -> sqlite3.Connection:
    # FastAPI may run a sync dependency and its endpoint on different threadpool threads.
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db():
    """FastAPI dependency: one connection and one transaction per request."""
    conn = connect()
    try:
        with conn:  # commits on success, rolls back on any exception
            yield conn
    finally:
        conn.close()


def now() -> datetime:
    return datetime.now(timezone.utc)


def today(conn: sqlite3.Connection) -> date:
    offset = conn.execute("SELECT day_offset FROM app_clock WHERE id = 1").fetchone()[0]
    return date.today() + timedelta(days=offset)


def init_if_missing() -> None:
    import seed

    conn = connect()
    try:
        exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'"
        ).fetchone()
        if not exists:
            seed.reset(conn)
    finally:
        conn.close()
