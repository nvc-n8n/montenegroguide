"""
Fix ALL broken images in the Montenegro Guide database.

1. DELETE all place_images rows with Special:FilePath URLs (broken guessed filenames)
2. For the top 100 most important places, search Wikimedia Commons API for real photos
3. Insert working upload.wikimedia.org URLs only
"""

import sys
import sqlite3
import time

import httpx

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = "montenegro_guide.db"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

# Municipality ID -> name mapping for better search context
MUNICIPALITY_NAMES = {}


def load_municipality_names(cur):
    """Load municipality names for search context."""
    cur.execute("SELECT id, name FROM municipalities")
    for row in cur.fetchall():
        MUNICIPALITY_NAMES[row[0]] = row[1]


def search_commons_image(place_name: str, municipality_name: str, client: httpx.Client) -> dict | None:
    """
    Search Wikimedia Commons for a real photo of a place.
    Returns dict with 'url' and 'thumburl' if found, else None.
    Only returns upload.wikimedia.org URLs (direct CDN links).
    """
    # Try with municipality context first, then without
    search_queries = [
        f"File: {place_name} {municipality_name} Montenegro",
        f"File: {place_name} Montenegro",
    ]

    for query in search_queries:
        params = {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": query,
            "gsrlimit": "3",
            "prop": "imageinfo",
            "iiprop": "url|size|mime",
            "iiurlwidth": "800",
        }
        try:
            resp = client.get(COMMONS_API, params=params)
            resp.raise_for_status()
            data = resp.json()
            pages = data.get("query", {}).get("pages", {})
            if not pages:
                continue

            for page in sorted(pages.values(), key=lambda p: p.get("index", 999)):
                info = page.get("imageinfo", [{}])[0]
                url = info.get("url", "")
                thumburl = info.get("thumburl", "")
                mime = info.get("mime", "")

                # Only accept image types
                if mime not in ("image/jpeg", "image/png", "image/webp"):
                    continue

                # CRITICAL: Only use upload.wikimedia.org URLs - these are direct CDN links that work
                if "upload.wikimedia.org" not in url:
                    continue

                # Use thumburl if available, otherwise url
                thumb = thumburl if thumburl and "upload.wikimedia.org" in thumburl else url

                return {"url": url, "thumburl": thumb}

        except Exception as e:
            print(f"    API error for '{query}': {e}")
            continue

    return None


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Load municipality names
    load_municipality_names(cur)

    # ===== STEP 1: Delete all broken Special:FilePath images =====
    print("=" * 60)
    print("STEP 1: Deleting broken Special:FilePath images")
    print("=" * 60)

    cur.execute("SELECT COUNT(*) FROM place_images WHERE public_url LIKE '%Special:FilePath%'")
    broken_count = cur.fetchone()[0]
    print(f"  Found {broken_count} broken Special:FilePath image records")

    cur.execute("DELETE FROM place_images WHERE public_url LIKE '%Special:FilePath%'")
    conn.commit()
    print(f"  DELETED {broken_count} broken image records")

    # Audit after deletion
    cur.execute("SELECT COUNT(*) FROM place_images")
    remaining = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT place_id) FROM place_images")
    places_with_images = cur.fetchone()[0]
    print(f"  Remaining image records: {remaining}")
    print(f"  Places with images after cleanup: {places_with_images}")

    # ===== STEP 2: Find images for top 100 places =====
    print()
    print("=" * 60)
    print("STEP 2: Finding Wikimedia Commons images for top 100 places")
    print("=" * 60)

    # Get top 100 places that DON'T already have working images
    cur.execute("""
        SELECT p.id, p.name, p.featured, p.popularity_score, p.municipality_id
        FROM places p
        WHERE p.id NOT IN (
            SELECT DISTINCT place_id FROM place_images
            WHERE public_url LIKE '%upload.wikimedia.org%'
        )
        ORDER BY p.featured DESC, p.popularity_score DESC
        LIMIT 100
    """)
    places_needing_images = cur.fetchall()
    print(f"  Top places needing images: {len(places_needing_images)}")

    client = httpx.Client(
        headers={
            "User-Agent": "MontenegroGuide/1.0 (https://github.com/montenegroguide; montenegroguide@example.com)"
        },
        follow_redirects=True,
        timeout=15,
    )

    found = 0
    failed = 0
    for i, (place_id, name, featured, pop_score, muni_id) in enumerate(places_needing_images):
        muni_name = MUNICIPALITY_NAMES.get(muni_id, "Montenegro")

        result = search_commons_image(name, muni_name, client)

        if result:
            url = result["url"]
            thumburl = result["thumburl"]

            # Insert the image record
            cur.execute("""
                INSERT INTO place_images (
                    place_id, original_url, public_url, thumb_public_url,
                    alt_text, is_primary, sort_order,
                    license_label, license_status,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, 1, 0, 'Wikimedia Commons', 'cc',
                        datetime('now'), datetime('now'))
            """, (place_id, url, url, thumburl, name))

            found += 1
            if (i + 1) % 10 == 0 or i == 0:
                print(f"  [{i+1}/{len(places_needing_images)}] FOUND: {name} ({muni_name})")
        else:
            failed += 1
            if (i + 1) % 10 == 0 or i == 0:
                print(f"  [{i+1}/{len(places_needing_images)}] no image: {name} ({muni_name})")

        # Progress report every 10 places
        if (i + 1) % 10 == 0:
            print(f"  --- Progress: {i+1}/{len(places_needing_images)}, found={found}, missed={failed} ---")
            conn.commit()  # Commit in batches

        # Be polite to Wikimedia API
        time.sleep(0.4)

    conn.commit()
    print(f"\n  Results: Found images for {found} places, missed {failed}")

    # ===== FINAL AUDIT =====
    print()
    print("=" * 60)
    print("FINAL AUDIT")
    print("=" * 60)

    cur.execute("SELECT COUNT(*) FROM places")
    total_places = cur.fetchone()[0]
    print(f"  Total places in database: {total_places}")

    cur.execute("SELECT COUNT(*) FROM place_images")
    total_images = cur.fetchone()[0]
    print(f"  Total image records: {total_images}")

    cur.execute("SELECT COUNT(DISTINCT place_id) FROM place_images")
    places_with_imgs = cur.fetchone()[0]
    print(f"  Places with working images: {places_with_imgs}")

    cur.execute("SELECT COUNT(*) FROM place_images WHERE public_url LIKE '%upload.wikimedia.org%'")
    wikimedia_count = cur.fetchone()[0]
    print(f"  Images from upload.wikimedia.org (CDN): {wikimedia_count}")

    cur.execute("SELECT COUNT(*) FROM place_images WHERE public_url LIKE '%Special:FilePath%'")
    broken_remaining = cur.fetchone()[0]
    print(f"  Broken Special:FilePath images (should be 0): {broken_remaining}")

    # Show top featured places image status
    print()
    print("  Top 20 places image status:")
    cur.execute("""
        SELECT p.name, p.featured, p.popularity_score,
               CASE WHEN EXISTS(
                   SELECT 1 FROM place_images pi WHERE pi.place_id = p.id
                   AND pi.public_url LIKE '%upload.wikimedia.org%'
               ) THEN 'HAS IMAGE' ELSE 'NO IMAGE' END as status
        FROM places p
        ORDER BY p.featured DESC, p.popularity_score DESC
        LIMIT 20
    """)
    for row in cur.fetchall():
        flag = "OK" if row[3] == "HAS IMAGE" else "MISSING"
        print(f"    [{flag}] {row[0]} (featured={row[1]}, pop={row[2]})")

    client.close()
    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    run()
