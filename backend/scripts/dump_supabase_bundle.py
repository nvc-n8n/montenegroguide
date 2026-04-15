"""Dump a single SQL bundle for one-shot paste into Supabase SQL Editor.

Reads:
  - Local SQLite DB (backend/montenegro_guide.db) for seed data
  - Alembic offline migration for the Postgres schema

Writes:
  - backend/scripts/supabase_bundle.sql

The bundle contains, in order:
  1. Schema (CREATE EXTENSION, CREATE TABLE, indexes, triggers) from alembic
  2. Seed INSERTs for content tables
  3. Sequence resets (so auto-increment continues past imported ids)
  4. Row-level security: enable + public SELECT policy per content table
  5. Views + RPC functions for the non-trivial API endpoints
     (featured, municipality overview, nearby by distance, search)
  6. A safety block that forces a re-run of the full-text trigger on all rows
     (imported rows bypass the BEFORE INSERT trigger when COPY-style loaded)
"""

from __future__ import annotations

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
DB_PATH = BACKEND / "montenegro_guide.db"
OUTPUT = BACKEND / "scripts" / "supabase_bundle.sql"
OUTPUT_SCHEMA = BACKEND / "scripts" / "supabase_01_schema_and_api.sql"
OUTPUT_SEED = BACKEND / "scripts" / "supabase_02_seed.sql"

CONTENT_TABLES = [
    # Order matters for FKs
    ("municipalities", [
        "id", "slug", "name", "region", "short_description", "hero_image_id",
        "created_at", "updated_at",
    ]),
    ("categories", [
        "id", "slug", "name", "icon", "created_at", "updated_at",
    ]),
    ("places", [
        "id", "slug", "name", "alternate_names", "municipality_id", "category_id",
        "subtype", "lat", "lng", "short_description", "long_description",
        "tags", "amenities", "best_for", "featured", "popularity_score",
        "family_friendly", "hidden_gem", "nightlife", "active_holiday",
        "cultural_site", "beach_type", "parking_available", "pet_friendly",
        "accessibility_notes", "source_url", "source_type", "license_type",
        "verified_at", "created_at", "updated_at",
    ]),
    ("place_images", [
        "id", "place_id", "original_url", "storage_path", "public_url",
        "thumb_path", "thumb_public_url", "alt_text", "width", "height",
        "file_size", "mime_type", "sha256", "source_page_url", "credit",
        "license_label", "license_url", "license_status", "sort_order",
        "is_primary", "created_at", "updated_at",
    ]),
    ("place_related_places", [
        "id", "place_id", "related_place_id", "relation_type",
    ]),
]

# Columns that hold JSON text in SQLite and should land as JSONB in Postgres
JSONB_COLS = {"alternate_names", "tags", "amenities", "best_for"}
# Columns that are 0/1 in SQLite and should become boolean in Postgres
BOOL_COLS = {
    "featured", "family_friendly", "hidden_gem", "nightlife", "active_holiday",
    "cultural_site", "parking_available", "pet_friendly", "is_primary",
}


def generate_schema() -> str:
    """Run alembic in offline mode against a dummy URL and capture the DDL."""
    env_overrides = {
        "DATABASE_URL": "postgresql+asyncpg://postgres:dummy@dummy:5432/postgres",
        "DATABASE_URL_SYNC": "postgresql://postgres:dummy@dummy:5432/postgres",
    }
    import os
    env = {**os.environ, **env_overrides}
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=BACKEND,
        capture_output=True,
        text=True,
        env=env,
        check=True,
    )
    lines = [ln for ln in result.stdout.splitlines() if not ln.startswith("INFO")]
    return "\n".join(lines)


def sql_literal(value, col: str) -> str:
    if value is None:
        return "NULL"
    if col in BOOL_COLS:
        return "TRUE" if value in (1, True, "1", "true") else "FALSE"
    if col in JSONB_COLS:
        # SQLite stored JSON as text; keep as text then cast
        if isinstance(value, (dict, list)):
            text = json.dumps(value, ensure_ascii=False)
        else:
            text = str(value)
        escaped = text.replace("'", "''")
        return f"'{escaped}'::jsonb"
    if isinstance(value, (int, float)):
        return str(value)
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"


def dump_table(cur: sqlite3.Cursor, table: str, columns: list[str]) -> str:
    # Validate the table actually has all the columns we expect
    cur.execute(f"PRAGMA table_info({table})")
    have = {row[1] for row in cur.fetchall()}
    usable = [c for c in columns if c in have]
    missing = [c for c in columns if c not in have]
    if missing:
        print(f"warning: {table} missing columns {missing}; skipping them", file=sys.stderr)

    cur.execute(f"SELECT {', '.join(usable)} FROM {table} ORDER BY id")
    rows = cur.fetchall()
    if not rows:
        return f"-- no rows for {table}\n"

    out = [f"-- {len(rows)} rows into {table}"]
    col_list = ", ".join(usable)
    for row in rows:
        values = ", ".join(sql_literal(v, c) for v, c in zip(row, usable))
        out.append(f"INSERT INTO {table} ({col_list}) VALUES ({values});")
    return "\n".join(out) + "\n"


def sequence_resets() -> str:
    """After inserting explicit ids, bump the SERIAL sequences."""
    blocks = []
    for table, _ in CONTENT_TABLES:
        blocks.append(
            f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
            f"(SELECT COALESCE(MAX(id), 1) FROM {table}), true);"
        )
    return "\n".join(blocks) + "\n"


def rls_block() -> str:
    """Enable RLS + public SELECT for all client-facing tables."""
    tables = ["municipalities", "categories", "places", "place_images", "place_related_places"]
    lines = []
    for t in tables:
        lines.append(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;")
        lines.append(
            f"CREATE POLICY \"public_read_{t}\" ON {t} FOR SELECT TO anon, authenticated USING (true);"
        )
    return "\n".join(lines) + "\n"


def views_and_rpc() -> str:
    """
    Views + RPC that match the frontend's PlacesApi contract so the TS client
    can call them through PostgREST without bespoke route handlers.
    """
    return """
-- View: places with joined municipality + category slugs (flattened for PostgREST)
CREATE OR REPLACE VIEW places_full AS
SELECT
  p.id,
  p.slug,
  p.name,
  p.alternate_names,
  p.subtype,
  p.lat,
  p.lng,
  p.short_description,
  p.long_description,
  p.tags,
  p.amenities,
  p.best_for,
  p.featured,
  p.popularity_score,
  p.family_friendly,
  p.hidden_gem,
  p.nightlife,
  p.active_holiday,
  p.cultural_site,
  p.beach_type,
  p.parking_available,
  p.pet_friendly,
  p.accessibility_notes,
  p.source_url,
  p.source_type,
  p.license_type,
  p.verified_at,
  p.created_at,
  p.updated_at,
  m.slug AS municipality_slug,
  m.name AS municipality_name,
  c.slug AS category_slug,
  c.name AS category_name,
  (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'url', coalesce(pi.public_url, pi.original_url),
          'thumb_url', coalesce(pi.thumb_public_url, pi.thumb_path),
          'alt_text', pi.alt_text,
          'width', pi.width,
          'height', pi.height,
          'is_primary', pi.is_primary,
          'sort_order', pi.sort_order,
          'credit', pi.credit,
          'license_label', pi.license_label,
          'license_url', pi.license_url
        )
        ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
      ), '[]'::jsonb
    )
    FROM place_images pi WHERE pi.place_id = p.id
  ) AS images
FROM places p
JOIN municipalities m ON m.id = p.municipality_id
JOIN categories c ON c.id = p.category_id;

GRANT SELECT ON places_full TO anon, authenticated;

-- View: categories with place counts
CREATE OR REPLACE VIEW categories_with_counts AS
SELECT c.*, (SELECT COUNT(*) FROM places p WHERE p.category_id = c.id) AS place_count
FROM categories c;

GRANT SELECT ON categories_with_counts TO anon, authenticated;

-- View: municipalities with place count + category breakdown + featured places (for /overview)
CREATE OR REPLACE VIEW municipalities_full AS
SELECT
  m.*,
  (SELECT COUNT(*) FROM places p WHERE p.municipality_id = m.id) AS place_count,
  (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object('slug', c.slug, 'name', c.name, 'icon', c.icon, 'place_count', cnt)
        ORDER BY cnt DESC
      ), '[]'::jsonb
    )
    FROM (
      SELECT p.category_id, COUNT(*) AS cnt FROM places p
      WHERE p.municipality_id = m.id GROUP BY p.category_id
    ) agg
    JOIN categories c ON c.id = agg.category_id
  ) AS category_breakdown
FROM municipalities m;

GRANT SELECT ON municipalities_full TO anon, authenticated;

-- RPC: nearby places within a bounding box, ordered by great-circle distance
CREATE OR REPLACE FUNCTION places_nearby(
  in_lat double precision,
  in_lng double precision,
  in_limit integer DEFAULT 12
)
RETURNS SETOF places_full
LANGUAGE sql STABLE
AS $$
  SELECT * FROM places_full
  WHERE lat IS NOT NULL AND lng IS NOT NULL
  ORDER BY (
    (lat - in_lat) * (lat - in_lat) +
    (lng - in_lng) * (lng - in_lng)
  ) ASC
  LIMIT in_limit;
$$;

GRANT EXECUTE ON FUNCTION places_nearby TO anon, authenticated;

-- RPC: simple ILIKE search across name + short_description + tags
CREATE OR REPLACE FUNCTION places_search(
  in_query text,
  in_limit integer DEFAULT 30
)
RETURNS SETOF places_full
LANGUAGE sql STABLE
AS $$
  SELECT pf.* FROM places_full pf
  JOIN places p ON p.id = pf.id
  WHERE
    p.name ILIKE '%' || in_query || '%'
    OR coalesce(p.short_description, '') ILIKE '%' || in_query || '%'
    OR p.tags::text ILIKE '%' || in_query || '%'
  ORDER BY
    (p.name ILIKE in_query || '%') DESC,
    p.featured DESC,
    p.popularity_score DESC
  LIMIT in_limit;
$$;

GRANT EXECUTE ON FUNCTION places_search TO anon, authenticated;

-- Force the full-text trigger to populate search_document on all imported rows.
UPDATE places SET name = name;
"""


def main():
    if not DB_PATH.exists():
        print(f"missing {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    chunks: list[str] = []
    chunks.append("-- Montenegro Coast City Guide — Supabase migration bundle")
    chunks.append("-- Generated by backend/scripts/dump_supabase_bundle.py")
    chunks.append("-- Paste into Supabase Dashboard → SQL Editor → Run\n")

    chunks.append("-- ============================================================")
    chunks.append("-- 1. SCHEMA")
    chunks.append("-- ============================================================")
    chunks.append(generate_schema())

    chunks.append("\n-- ============================================================")
    chunks.append("-- 2. SEED DATA")
    chunks.append("-- ============================================================")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    for table, columns in CONTENT_TABLES:
        chunks.append(dump_table(cur, table, columns))
    conn.close()

    chunks.append("\n-- ============================================================")
    chunks.append("-- 3. SEQUENCE RESETS")
    chunks.append("-- ============================================================")
    chunks.append(sequence_resets())

    chunks.append("\n-- ============================================================")
    chunks.append("-- 4. ROW-LEVEL SECURITY + PUBLIC READ POLICIES")
    chunks.append("-- ============================================================")
    chunks.append(rls_block())

    chunks.append("\n-- ============================================================")
    chunks.append("-- 5. VIEWS + RPC (used by the mobile client)")
    chunks.append("-- ============================================================")
    chunks.append(views_and_rpc())

    chunks.append("\nCOMMIT;")

    OUTPUT.write_text("\n".join(chunks), encoding="utf-8")
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"wrote {OUTPUT} ({size_kb:.1f} KB)")

    # --- split variant: schema+api separate from seed for easier pasting
    schema_sql = [
        "-- Montenegro Coast City Guide — Supabase schema + API layer",
        "-- Paste FIRST into Supabase SQL Editor",
        "",
        "-- 1. SCHEMA",
        generate_schema(),
        "",
        "-- 2. ROW-LEVEL SECURITY",
        rls_block(),
        "",
        "-- 3. VIEWS + RPC",
        views_and_rpc(),
        "",
        "COMMIT;",
    ]
    OUTPUT_SCHEMA.write_text("\n".join(schema_sql), encoding="utf-8")
    print(f"wrote {OUTPUT_SCHEMA} ({OUTPUT_SCHEMA.stat().st_size / 1024:.1f} KB)")

    seed_sql = [
        "-- Montenegro Coast City Guide — Supabase seed data",
        "-- Paste SECOND (after supabase_01_schema_and_api.sql) into Supabase SQL Editor",
        "",
        "BEGIN;",
        "",
    ]
    conn2 = sqlite3.connect(DB_PATH)
    conn2.row_factory = sqlite3.Row
    cur2 = conn2.cursor()
    for table, columns in CONTENT_TABLES:
        seed_sql.append(dump_table(cur2, table, columns))
    conn2.close()
    seed_sql.append("")
    seed_sql.append("-- Sequence resets")
    seed_sql.append(sequence_resets())
    seed_sql.append("")
    seed_sql.append("-- Force full-text trigger on imported rows")
    seed_sql.append("UPDATE places SET name = name;")
    seed_sql.append("")
    seed_sql.append("COMMIT;")
    OUTPUT_SEED.write_text("\n".join(seed_sql), encoding="utf-8")
    print(f"wrote {OUTPUT_SEED} ({OUTPUT_SEED.stat().st_size / 1024:.1f} KB)")

    print()
    print("Next: load these onto the clipboard with PowerShell (UTF-8 safe):")
    print(f"  powershell.exe -Command \"Get-Content -Path '{OUTPUT_SCHEMA}' -Encoding UTF8 -Raw | Set-Clipboard\"")
    print(f"  powershell.exe -Command \"Get-Content -Path '{OUTPUT_SEED}' -Encoding UTF8 -Raw | Set-Clipboard\"")
    print()
    print("DO NOT use `cat ... | clip.exe` — clip.exe treats stdin as the")
    print("Windows OEM codepage (CP775/CP852/etc.) and mangles UTF-8 multi-byte")
    print("sequences, producing mojibake like `No─ćni ┼Šivot` on paste.")


if __name__ == "__main__":
    main()
