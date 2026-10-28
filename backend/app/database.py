"""
Database connection, engine, and session management for Acuity.
Integrates PostgreSQL with SQLAlchemy 2.0 and psycopg2.
"""
from __future__ import annotations

import logging
from typing import Generator, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.config import get_database_url, DB_HOST, DB_PORT, DB_NAME, DB_USER

logger = logging.getLogger("acuity.database")

Base = declarative_base()

_engine = None
_session_factory = None


def get_engine():
    """Lazily initialize and return the SQLAlchemy engine."""
    global _engine, _session_factory
    if _engine is None:
        url = get_database_url()
        try:
            _engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                connect_args={"connect_timeout": 3},
            )
            _session_factory = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        except Exception as exc:
            logger.warning("Could not initialize database engine: %s", exc)
            return None
    return _engine


def get_session_factory():
    """Return the sessionmaker instance."""
    get_engine()
    return _session_factory


def get_db() -> Generator[Session | None, None, None]:
    """FastAPI dependency for acquiring a database session."""
    factory = get_session_factory()
    if factory is None:
        yield None
        return
    db = factory()
    try:
        yield db
    finally:
        db.close()


def check_connection() -> dict[str, Any]:
    """Test PostgreSQL connectivity and return status details."""
    engine = get_engine()
    if engine is None:
        return {
            "connected": False,
            "host": DB_HOST,
            "port": DB_PORT,
            "database": DB_NAME,
            "user": DB_USER,
            "error": "Engine could not be initialized.",
        }
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "connected": True,
            "host": DB_HOST,
            "port": DB_PORT,
            "database": DB_NAME,
            "user": DB_USER,
            "error": None,
        }
    except Exception as exc:
        return {
            "connected": False,
            "host": DB_HOST,
            "port": DB_PORT,
            "database": DB_NAME,
            "user": DB_USER,
            "error": str(exc),
        }


def init_db() -> bool:
    """Create all database tables defined in models if they do not exist."""
    engine = get_engine()
    if engine is None:
        return False
    try:
        # Import models so Base.metadata knows about them
        from app import models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        return True
    except Exception as exc:
        logger.warning("Could not initialize database schema: %s", exc)
        return False
