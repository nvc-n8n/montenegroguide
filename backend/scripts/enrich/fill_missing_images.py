"""
Fill missing images for all 66 places that have none.

Strategy:
1. Try broader Wikimedia searches (strip diacritics, simplify names)
2. For places still without images, assign a representative image
   from the same municipality + category (reuse an existing place's image)
"""

import re
import sqlite3
import sys
import time
import unicodedata

import httpx

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = "montenegro_guide.db"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"


def strip_diacritics(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def simplify_name(name: str) -> str:
    """Strip parenthetical suffixes, common prefixes, diacritics."""
    name = re.sub(r"\s*\(.*?\)\s*", " ", name)  # remove (Long Beach) etc.
    name = re.sub(r"^(Konoba|Restaurant|Restoran|Club|Bar|Plaža|Beach)\s+", "", name, flags=re.IGNORECASE)
    name = strip_diacritics(name).strip()
    return name


CATEGORY_SEARCH_TERMS = {
    "plaze": "beach coast",
    "manastiri-crkve": "church monastery",
    "tvrdjave-stari-gradovi": "fortress walls",
    "priroda-vidikovci": "nature panorama landscape",
    "restorani-beach-barovi": "restaurant coast waterfront",
    "nocni-zivot": "nightlife promenade evening",
    "aktivni-odmor": "hiking adventure outdoor",
    "porodicna-mjesta": "park family beach",
    "znamenitosti": "landmark monument",
    "muzeji-kultura": "museum",
    "hidden-gems": "hidden village",
}


def search_commons(query: str, client: httpx.Client) -> tuple[str | None, str | None]:
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"File: {query}",
        "gsrlimit": "5",
        "prop": "imageinfo",
        "iiprop": "url|size|mime",
        "iiurlwidth": "960",
    }
    try:
        resp = client.get(COMMONS_API, params=params)
        resp.raise_for_status()
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        if not pages:
            return None, None

        for page in sorted(pages.values(), key=lambda p: p.get("index", 999)):
            info = page.get("imageinfo", [{}])[0]
            mime = info.get("mime", "")
            url = info.get("url", "")
            thumburl = info.get("thumburl", "")
            width = info.get("width", 0)

            if "image" not in mime:
                continue
            # Reject non-photo formats (djvu documents, SVG diagrams)
            if any(fmt in mime for fmt in ("djvu", "svg", "tiff")):
                continue
            if any(url.lower().endswith(ext) for ext in (".djvu", ".svg", ".tif", ".tiff", ".xcf", ".pdf")):
                continue
            if "upload.wikimedia.org" not in url:
                continue
            # Skip tiny icons/logos
            if width < 200:
                continue

            thumb = thumburl if thumburl and "upload.wikimedia.org" in thumburl else url
            return url, thumb
    except Exception:
        pass
    return None, None


def build_queries(name: str, municipality: str, cat_slug: str) -> list[str]:
    """Build multiple search query variations, broadest last."""
    simple = simplify_name(name)
    queries = []

    # 1. Simplified name + Montenegro
    if simple != strip_diacritics(name):
        queries.append(f"{simple} Montenegro")

    # 2. Original (stripped diacritics) + Montenegro
    queries.append(f"{strip_diacritics(name)} Montenegro")

    # 3. Simplified name + municipality
    queries.append(f"{simple} {municipality}")

    # 4. Just the simplified name
    if len(simple.split()) >= 2:
        queries.append(simple)

    # 5. Municipality + category terms (broadest fallback)
    cat_terms = CATEGORY_SEARCH_TERMS.get(cat_slug, "")
    if cat_terms:
        queries.append(f"{municipality} Montenegro {cat_terms}")

    return queries


def insert_image(cur, place_id: int, name: str, url: str, thumb: str):
    cur.execute("""
        INSERT INTO place_images (
            place_id, original_url, public_url, thumb_public_url,
            alt_text, is_primary, sort_order,
            license_label, license_status,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 1, 0, 'Wikimedia Commons', 'cc',
                datetime('now'), datetime('now'))
    """, (place_id, url, url, thumb, name))


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Load municipality names
    cur.execute("SELECT id, name FROM municipalities")
    muni_names = {r[0]: r[1] for r in cur.fetchall()}

    # Get places without images
    cur.execute("""
        SELECT p.id, p.name, p.municipality_id, c.slug
        FROM places p
        JOIN categories c ON p.category_id = c.id
        WHERE p.id NOT IN (SELECT DISTINCT place_id FROM place_images)
        ORDER BY p.featured DESC, p.popularity_score DESC
    """)
    places = cur.fetchall()
    total = len(places)

    print(f"{'='*60}")
    print(f"Phase 1: Searching Wikimedia Commons for {total} places")
    print(f"{'='*60}")

    client = httpx.Client(
        headers={"User-Agent": "MontenegroGuide/1.0 (montenegroguide@example.com)"},
        follow_redirects=True,
        timeout=15,
    )

    found_phase1 = 0
    still_missing = []

    for i, (pid, name, mid, cat) in enumerate(places):
        muni = muni_names.get(mid, "Montenegro")
        queries = build_queries(name, muni, cat)

        url, thumb = None, None
        for q in queries:
            url, thumb = search_commons(q, client)
            if url:
                break
            time.sleep(0.3)

        if url:
            insert_image(cur, pid, name, url, thumb)
            found_phase1 += 1
            print(f"  [{i+1}/{total}] FOUND: {name}")
        else:
            still_missing.append((pid, name, mid, cat))
            print(f"  [{i+1}/{total}] miss:  {name}")

        if (i + 1) % 10 == 0:
            conn.commit()
        time.sleep(0.3)

    conn.commit()
    print(f"\nPhase 1 results: {found_phase1} found, {len(still_missing)} still missing")

    # ---- Phase 2: Assign representative images from same municipality+category ----
    print(f"\n{'='*60}")
    print(f"Phase 2: Assigning representative images for {len(still_missing)} remaining")
    print(f"{'='*60}")

    # Build lookup: (municipality_id, category_slug) -> (url, thumb)
    cur.execute("""
        SELECT p.municipality_id, c.slug, pi.public_url, pi.thumb_public_url
        FROM place_images pi
        JOIN places p ON pi.place_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE pi.public_url IS NOT NULL
          AND pi.public_url != ''
          AND pi.is_primary = 1
        ORDER BY p.popularity_score DESC
    """)
    representative = {}
    for mid, cat, url, thumb in cur.fetchall():
        key = (mid, cat)
        if key not in representative:
            representative[key] = (url, thumb)

    # Also build municipality-level fallback (any category)
    muni_fallback = {}
    for (mid, _), (url, thumb) in representative.items():
        if mid not in muni_fallback:
            muni_fallback[mid] = (url, thumb)

    found_phase2 = 0
    final_missing = []

    for pid, name, mid, cat in still_missing:
        # Try same municipality + category first
        rep = representative.get((mid, cat))
        if not rep:
            # Fallback: any image from same municipality
            rep = muni_fallback.get(mid)

        if rep:
            insert_image(cur, pid, name, rep[0], rep[1])
            found_phase2 += 1
            print(f"  REP: {name} <- {cat} in {muni_names.get(mid, '?')}")
        else:
            final_missing.append(name)
            print(f"  STILL MISSING: {name}")

    conn.commit()

    # ---- Final report ----
    print(f"\n{'='*60}")
    print("FINAL REPORT")
    print(f"{'='*60}")
    print(f"  Phase 1 (Wikimedia search): {found_phase1}")
    print(f"  Phase 2 (representative):   {found_phase2}")
    print(f"  Still missing:              {len(final_missing)}")

    cur.execute("SELECT COUNT(*) FROM places")
    total_places = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT place_id) FROM place_images")
    with_images = cur.fetchone()[0]
    print(f"\n  Coverage: {with_images}/{total_places} ({100*with_images/total_places:.1f}%)")

    if final_missing:
        print(f"\n  Still missing:")
        for n in final_missing:
            print(f"    - {n}")

    client.close()
    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    run()
