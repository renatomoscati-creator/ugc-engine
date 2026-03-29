import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
import json

DATABASE_PATH = os.getenv("DATABASE_PATH", "../shared/db/ugc.db")


@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def create_production_job(conn, script_id: int, stage: str, bullmq_job_id: str) -> int:
    cursor = conn.execute(
        """
        INSERT INTO production_jobs (script_id, stage, status, bullmq_job_id, created_at, updated_at)
        VALUES (?, ?, 'running', ?, datetime('now'), datetime('now'))
        """,
        (script_id, stage, bullmq_job_id),
    )
    return cursor.lastrowid


def update_production_job(
    conn,
    job_id: int,
    status: str,
    output_path: str = None,
    error_message: str = None,
    duration_ms: int = None,
):
    conn.execute(
        """
        UPDATE production_jobs
        SET status=?, output_path=?, error_message=?, duration_ms=?, updated_at=datetime('now')
        WHERE id=?
        """,
        (status, output_path, error_message, duration_ms, job_id),
    )


def get_script(conn, script_id: int):
    return conn.execute(
        "SELECT * FROM scripts WHERE id=?", (script_id,)
    ).fetchone()


def get_persona(conn, persona_id: int):
    return conn.execute(
        "SELECT * FROM personas WHERE id=?", (persona_id,)
    ).fetchone()


def insert_asset(conn, script_id: int, job_id: int, asset_type: str, file_path: str, metadata: dict = None) -> int:
    cursor = conn.execute(
        """
        INSERT INTO assets (script_id, production_job_id, asset_type, file_path, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        """,
        (script_id, job_id, asset_type, file_path, json.dumps(metadata) if metadata else None),
    )
    return cursor.lastrowid
