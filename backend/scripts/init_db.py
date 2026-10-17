"""
Initialize the SalesLens PostgreSQL database.
Creates the database if missing and generates all relational tables.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import text

from app.config import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, get_database_url
from app.database import Base, get_engine
import app.models  # Registers all ORM models with Base.metadata


def ensure_database_exists():
    """Connect to default 'postgres' database and create 'saleslens_db' if it does not exist."""
    print(f"Connecting to PostgreSQL server at {DB_HOST}:{DB_PORT} as user '{DB_USER}'...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD or None,
            dbname="postgres",
            connect_timeout=5,
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        exists = cursor.fetchone()

        if not exists:
            print(f"Database '{DB_NAME}' does not exist. Creating...")
            cursor.execute(f'CREATE DATABASE "{DB_NAME}"')
            print(f"Database '{DB_NAME}' created successfully.")
        else:
            print(f"Database '{DB_NAME}' already exists.")

        cursor.close()
        conn.close()
        return True
    except psycopg2.OperationalError as exc:
        print(f"\n[ERROR] Could not connect to PostgreSQL server: {exc}")
        print("\nPlease ensure your credentials in .env are correct:")
        print("  DB_HOST=localhost")
        print("  DB_PORT=5432")
        print("  DB_NAME=saleslens_db")
        print(f"  DB_USER={DB_USER}")
        print("  DB_PASSWORD=<your_actual_password>")
        return False


def create_schema():
    """Create all tables in saleslens_db using SQLAlchemy metadata."""
    print(f"\nCreating tables in database '{DB_NAME}'...")
    engine = get_engine()
    if engine is None:
        print("[ERROR] Could not obtain database engine.")
        return False

    try:
        Base.metadata.create_all(bind=engine)
        print("Schema tables initialized successfully:")
        for table_name in Base.metadata.tables.keys():
            print(f"  + {table_name}")
        return True
    except Exception as exc:
        print(f"[ERROR] Failed to create schema tables: {exc}")
        return False


def main():
    print("=" * 60)
    print("SalesLens — PostgreSQL Database Setup")
    print("=" * 60)
    if not ensure_database_exists():
        sys.exit(1)
    if not create_schema():
        sys.exit(1)
    print("\n[SUCCESS] PostgreSQL integration setup completed successfully.")
    print("=" * 60)


if __name__ == "__main__":
    main()
