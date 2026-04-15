"""
Search Wikimedia Commons for images for ALL places that currently have no image.

Uses multiple query variations per place and category-aware keyword boosting.
Only accepts upload.wikimedia.org CDN URLs with image/* MIME types.
"""

import sys
import sqlite3
import time

import httpx

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = "montenegro_guide.db"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

# Category slug -> extra keywords to append to search queries
CATEGORY_KEYWORDS = {
    "plaze": ["beach"],
    "manastiri-crkve": ["church", "monastery"],
    "tvrdjave-stari-gradovi": ["fortress", "old town"],
    "priroda-vidikovci": ["nature", "viewpoint"],
    "restorani-beach-barovi": ["restaurant"],
    "nocni-zivot": ["nightclub"],
    "aktivni-odmor": ["adventure", "sport"],
    "porodicna-mjesta": [],
    "znamenitosti": ["landmark", "monument"],
}

MUNICIPALITY_NAMES = {}


def load_municipality_names(cur):
    cur.execute("SELECT id, name FROM municipalities")
    for row in cur.fetchall():
        MUNICIPALITY_NAMES[row[0]] = row[1]


def build_search_queries(place_name: str, municipality_name: str, category_slug: str) -> list[str]:
    """Build a list of search query variations for a place."""
    queries = []

    # Category-specific queries first (most targeted)
    keywords = CATEGORY_KEYWORDS.get(category_slug, [])
    for kw in keywords:
        queries.append(f"{place_name} {kw} Montenegro")

    # Standard queries
    queries.append(f"{place_name} Montenegro")
    queries.append(f"{place_name} {municipality_name}")
    queries.append(f"{place_name}")

    return queries


def search_commons_image(
    place_name: str,
    municipality_name: str,
    category_slug: str,
    client: httpx.Client,
) -> tuple[str | None, str | None]:
    """
    Search Wikimedia Commons for a real photo of a place.
    Tries multiple query variations.
    Returns (url, thumburl) if found, else (None, None).
    """
    queries = build_search_queries(place_name, municipality_name, category_slug)

    for query in queries:
        params = {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": f"File: {query}",
            "gsrlimit": "5",
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
                mime = info.get("mime", "")
                url = info.get("url", "")
                thumburl = info.get("thumburl", "")

                # Only accept image MIME types
                if "image" not in mime:
                    continue

                # Only accept upload.wikimedia.org CDN URLs
                if "upload.wikimedia.org" not in url:
                    continue

                thumb = thumburl if thumburl and "upload.wikimedia.org" in thumburl else url
                return url, thumb

        except Exception as e:
            print(f"    API error for query '{query}': {e}")
            continue

        # Sleep between API calls within the same place
        time.sleep(0.5)

    return None, None


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    load_municipality_names(cur)

    # ----- Get all places without images -----
    cur.execute("""
        SELECT p.id, p.name, p.municipality_id, c.slug
        FROM places p
        JOIN categories c ON p.category_id = c.id
        WHERE p.id NOT IN (
            SELECT DISTINCT place_id FROM place_images
        )
        ORDER BY p.featured DESC, p.popularity_score DESC
    """)
    places = cur.fetchall()
    total = len(places)

    print("=" * 60)
    print(f"Searching Wikimedia Commons images for {total} places")
    print("=" * 60)

    client = httpx.Client(
        headers={
            "User-Agent": "MontenegroGuide/1.0 (https://github.com/montenegroguide; montenegroguide@example.com)"
        },
        follow_redirects=True,
        timeout=15,
    )

    found = 0
    not_found = 0
    skipped_categories = {"restorani-beach-barovi", "nocni-zivot"}

    for i, (place_id, name, muni_id, cat_slug) in enumerate(places):
        muni_name = MUNICIPALITY_NAMES.get(muni_id, "Montenegro")

        # Print progress every 10 places
        if (i + 1) % 10 == 0 or i == 0:
            print(f"\n--- Progress: {i+1}/{total}  found={found}  not_found={not_found} ---")

        # Search Wikimedia - even for restaurants/nightclubs, try once
        url, thumburl = search_commons_image(name, muni_name, cat_slug, client)

        if url:
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
            print(f"  [{i+1}] FOUND: {name} ({muni_name}, {cat_slug})")
        else:
            not_found += 1
            print(f"  [{i+1}] NOT FOUND: {name} ({muni_name}, {cat_slug})")

        # Commit every 10 places
        if (i + 1) % 10 == 0:
            conn.commit()

        # Be polite to Wikimedia API
        time.sleep(0.5)

    conn.commit()

    # ----- Final report -----
    print()
    print("=" * 60)
    print("FINAL REPORT")
    print("=" * 60)
    print(f"  Total searched:   {total}")
    print(f"  Images found:     {found}")
    print(f"  Not found:        {not_found}")

    # Overall database stats
    cur.execute("SELECT COUNT(*) FROM places")
    total_places = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT place_id) FROM place_images")
    places_with_images = cur.fetchone()[0]
    print()
    print(f"  Total places in DB:       {total_places}")
    print(f"  Places with images (now): {places_with_images}")
    print(f"  Places still missing:     {total_places - places_with_images}")
    print(f"  Coverage:                 {places_with_images}/{total_places} ({100*places_with_images/total_places:.1f}%)")

    # Breakdown by category of still-missing
    cur.execute("""
        SELECT c.slug, COUNT(*) as cnt
        FROM places p
        JOIN categories c ON p.category_id = c.id
        WHERE p.id NOT IN (SELECT DISTINCT place_id FROM place_images)
        GROUP BY c.slug
        ORDER BY cnt DESC
    """)
    remaining = cur.fetchall()
    if remaining:
        print()
        print("  Still missing by category:")
        for slug, cnt in remaining:
            print(f"    {slug}: {cnt}")

    client.close()
    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    run()
