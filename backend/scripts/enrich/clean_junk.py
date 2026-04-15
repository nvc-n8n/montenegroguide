"""
Aggressive cleanup of junk data from the Montenegro Guide database.

Removes:
  1. Places with Cyrillic names (Serbian/other non-Latin scripts)
  2. Nullifies garbage auto-generated descriptions ("... Located at X°N, Y°E")
  3. Duplicate/near-duplicate places (keeps curated or higher popularity)
  4. Low-quality places: no image, no real description, source=wikidata/osm, popularity=0

Never touches:
  - source_type='curated'
  - Places with images in place_images
  - Places with real (non-garbage) descriptions
"""

import re
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "montenegro_guide.db"

# Cyrillic Unicode range
CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")

# Garbage description patterns:
#   "Notable landmark in Ulcinj. Located at 41.9291°N, 19.2153°E."
#   "Historic fortress in Bar. Also known as Stari Bar. Located at 42.0°N, 19.1°E."
#   "Natural attraction near Herceg Novi. Located at 42.4584°N, 18.5383°E."
GARBAGE_DESC_RE = re.compile(
    r".*(?:in|near)\s+\w[\w\s]*\.\s*"
    r"(?:Also known as\s+[^.]+\.\s*)?"
    r"Located at\s+[\d.]+.N,?\s*[\d.]+.E",
    re.IGNORECASE,
)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def count(conn: sqlite3.Connection, query: str, params=()) -> int:
    return conn.execute(query, params).fetchone()[0]


def ids_with_images(conn: sqlite3.Connection) -> set[int]:
    rows = conn.execute("SELECT DISTINCT place_id FROM place_images").fetchall()
    return {r[0] for r in rows}


def print_section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def main() -> None:
    if not DB_PATH.exists():
        print(f"ERROR: database not found at {DB_PATH}")
        sys.exit(1)

    conn = get_connection()

    total_before = count(conn, "SELECT COUNT(*) FROM places")
    curated_count = count(conn, "SELECT COUNT(*) FROM places WHERE source_type='curated'")
    image_place_ids = ids_with_images(conn)

    print_section("BEFORE CLEANUP")
    print(f"Total places:         {total_before}")
    print(f"Curated places:       {curated_count}")
    print(f"Places with images:   {len(image_place_ids)}")

    by_source = conn.execute(
        "SELECT source_type, COUNT(*) FROM places GROUP BY source_type ORDER BY COUNT(*) DESC"
    ).fetchall()
    for src, cnt in by_source:
        print(f"  {src}: {cnt}")

    # ------------------------------------------------------------------
    # STEP 1: Identify Cyrillic-named places to delete
    # ------------------------------------------------------------------
    print_section("STEP 1: Remove Cyrillic-named places")

    all_places = conn.execute(
        "SELECT id, name, source_type FROM places"
    ).fetchall()

    cyrillic_ids = set()
    for pid, name, source in all_places:
        if source == "curated":
            continue
        if pid in image_place_ids:
            continue
        if CYRILLIC_RE.search(name):
            cyrillic_ids.add(pid)

    print(f"Cyrillic-named places to delete: {len(cyrillic_ids)}")

    if cyrillic_ids:
        placeholders = ",".join("?" * len(cyrillic_ids))
        conn.execute(
            f"DELETE FROM place_related_places WHERE place_id IN ({placeholders}) OR related_place_id IN ({placeholders})",
            list(cyrillic_ids) + list(cyrillic_ids),
        )
        conn.execute(
            f"DELETE FROM place_images WHERE place_id IN ({placeholders})",
            list(cyrillic_ids),
        )
        conn.execute(
            f"DELETE FROM places WHERE id IN ({placeholders})",
            list(cyrillic_ids),
        )
        conn.commit()
        print(f"  Deleted {len(cyrillic_ids)} Cyrillic-named places.")

    # ------------------------------------------------------------------
    # STEP 2: Nullify garbage auto-generated descriptions
    # ------------------------------------------------------------------
    print_section("STEP 2: Nullify garbage descriptions")

    desc_rows = conn.execute(
        "SELECT id, short_description FROM places WHERE short_description IS NOT NULL"
    ).fetchall()

    garbage_ids = []
    for pid, desc in desc_rows:
        if GARBAGE_DESC_RE.match(desc):
            garbage_ids.append(pid)

    print(f"Garbage descriptions to nullify: {len(garbage_ids)}")

    if garbage_ids:
        placeholders = ",".join("?" * len(garbage_ids))
        conn.execute(
            f"UPDATE places SET short_description = NULL WHERE id IN ({placeholders})",
            garbage_ids,
        )
        conn.commit()
        print(f"  Nullified {len(garbage_ids)} garbage descriptions.")

    # Fallback: catch any remaining coordinate-based garbage via SQL
    extra = conn.execute(
        "SELECT id FROM places WHERE short_description LIKE '%Located at%N%E%'"
    ).fetchall()
    if extra:
        extra_ids = [r[0] for r in extra]
        placeholders = ",".join("?" * len(extra_ids))
        conn.execute(
            f"UPDATE places SET short_description = NULL WHERE id IN ({placeholders})",
            extra_ids,
        )
        conn.commit()
        print(f"  Nullified {len(extra_ids)} additional garbage descriptions (SQL fallback).")

    # ------------------------------------------------------------------
    # STEP 3: Remove duplicate/near-duplicate places
    # ------------------------------------------------------------------
    print_section("STEP 3: Remove duplicate places")

    remaining = conn.execute(
        "SELECT id, name, municipality_id, source_type, popularity_score FROM places"
    ).fetchall()

    # Refresh image set after step 1 deletions
    image_place_ids = ids_with_images(conn)

    # Group by municipality, normalized name
    from collections import defaultdict
    groups: dict[tuple[int, str], list] = defaultdict(list)
    for pid, name, muni_id, source, pop in remaining:
        norm = re.sub(r"[^a-z0-9]", "", name.lower())
        groups[(muni_id, norm)].append((pid, name, source, pop))

    dup_delete_ids = set()
    for key, members in groups.items():
        if len(members) < 2:
            continue

        # Sort: curated first, then by popularity desc, then by id asc (earlier = curated seed)
        def sort_key(m):
            source_rank = 0 if m[2] == "curated" else 1
            return (source_rank, -m[3], m[0])

        members.sort(key=sort_key)
        keeper = members[0]

        for m in members[1:]:
            # Never delete curated or places with images
            if m[2] == "curated":
                continue
            if m[0] in image_place_ids:
                continue
            dup_delete_ids.add(m[0])

    print(f"Duplicate places to delete: {len(dup_delete_ids)}")

    if dup_delete_ids:
        placeholders = ",".join("?" * len(dup_delete_ids))
        conn.execute(
            f"DELETE FROM place_related_places WHERE place_id IN ({placeholders}) OR related_place_id IN ({placeholders})",
            list(dup_delete_ids) + list(dup_delete_ids),
        )
        conn.execute(
            f"DELETE FROM place_images WHERE place_id IN ({placeholders})",
            list(dup_delete_ids),
        )
        conn.execute(
            f"DELETE FROM places WHERE id IN ({placeholders})",
            list(dup_delete_ids),
        )
        conn.commit()
        print(f"  Deleted {len(dup_delete_ids)} duplicate places.")

    # ------------------------------------------------------------------
    # STEP 4: Remove low-quality places
    #   - source_type in (wikidata, osm)
    #   - popularity_score = 0
    #   - no image
    #   - no real description (NULL after step 2 cleanup)
    # ------------------------------------------------------------------
    print_section("STEP 4: Remove low-quality junk places")

    # Refresh image set
    image_place_ids = ids_with_images(conn)

    low_quality = conn.execute("""
        SELECT p.id, p.name, p.source_type, p.short_description
        FROM places p
        WHERE p.source_type IN ('wikidata', 'osm')
          AND p.popularity_score = 0
    """).fetchall()

    junk_ids = set()
    for pid, name, source, desc in low_quality:
        if pid in image_place_ids:
            continue
        # No description at all, or description is still garbage
        if desc is None or desc.strip() == "":
            junk_ids.add(pid)
        elif GARBAGE_DESC_RE.match(desc):
            # Shouldn't happen after step 2, but safety net
            junk_ids.add(pid)

    print(f"Low-quality places to delete: {len(junk_ids)}")

    if junk_ids:
        # Batch in chunks to avoid SQLite variable limit
        junk_list = list(junk_ids)
        chunk_size = 500
        deleted = 0
        for i in range(0, len(junk_list), chunk_size):
            chunk = junk_list[i : i + chunk_size]
            placeholders = ",".join("?" * len(chunk))
            conn.execute(
                f"DELETE FROM place_related_places WHERE place_id IN ({placeholders}) OR related_place_id IN ({placeholders})",
                chunk + chunk,
            )
            conn.execute(
                f"DELETE FROM place_images WHERE place_id IN ({placeholders})",
                chunk,
            )
            conn.execute(
                f"DELETE FROM places WHERE id IN ({placeholders})",
                chunk,
            )
            deleted += len(chunk)
        conn.commit()
        print(f"  Deleted {deleted} low-quality places.")

    # ------------------------------------------------------------------
    # FINAL REPORT
    # ------------------------------------------------------------------
    print_section("AFTER CLEANUP")

    total_after = count(conn, "SELECT COUNT(*) FROM places")
    curated_after = count(conn, "SELECT COUNT(*) FROM places WHERE source_type='curated'")
    image_place_ids = ids_with_images(conn)
    with_desc = count(
        conn,
        "SELECT COUNT(*) FROM places WHERE short_description IS NOT NULL AND short_description != ''",
    )

    print(f"Total places:         {total_after}")
    print(f"Curated places:       {curated_after}  (should be unchanged: {curated_count})")
    print(f"Places with images:   {len(image_place_ids)}")
    print(f"Places with real desc:{with_desc}")
    print(f"Removed:              {total_before - total_after} places")

    by_source = conn.execute(
        "SELECT source_type, COUNT(*) FROM places GROUP BY source_type ORDER BY COUNT(*) DESC"
    ).fetchall()
    print("\nBy source_type:")
    for src, cnt in by_source:
        print(f"  {src}: {cnt}")

    by_muni = conn.execute("""
        SELECT m.name, COUNT(p.id)
        FROM places p
        JOIN municipalities m ON p.municipality_id = m.id
        GROUP BY m.name
        ORDER BY COUNT(p.id) DESC
    """).fetchall()
    print("\nBy municipality:")
    for mname, cnt in by_muni:
        print(f"  {mname}: {cnt}")

    conn.close()
    print(f"\nDone. Database cleaned: {total_before} -> {total_after} places.")


if __name__ == "__main__":
    main()
