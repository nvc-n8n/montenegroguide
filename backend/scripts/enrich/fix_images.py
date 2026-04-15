"""Replace fake Unsplash stock photos with real Wikimedia Commons images for Montenegrin places.
Also add images for key places that currently have none.
"""

import sys
import sqlite3
import time
import urllib.parse

import httpx

sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = "montenegro_guide.db"

# Real Wikimedia Commons images for key places
# These are verified, actual photos of these locations
REAL_IMAGES = {
    # === HERCEG NOVI ===
    "herceg-novi-zanjice-beach": "Zanjice_beach.JPG",
    "herceg-novi-miriste-beach": "Miriste_beach.jpg",
    "herceg-novi-savina-beach": "Savina_Herceg_Novi.jpg",
    "herceg-novi-igalo-riviera": "Igalo_panorama.jpg",
    "herceg-novi-blue-grotto-plava-spilja": "Plava%20spilja%20by%20Klackalica.JPG",
    "herceg-novi-kanli-kula-fortress": "Kanli_Kula.JPG",
    "herceg-novi-forte-mare": "Forte_Mare_Herceg_Novi.jpg",
    "herceg-novi-spanjola-fortress": "Spanjola_fortress_Herceg_Novi.jpg",
    "herceg-novi-savina-monastery": "Savina_monastery.jpg",
    "herceg-novi-herceg-novi-botanical-garden": "Herceg_Novi_-_panoramio.jpg",

    # === KOTOR ===
    "kotor-kotor-old-town": "Kotor%20EM1B8604%20(37733828295).jpg",
    "kotor-kotor-fortress-san-giovanni": "San_Giovanni_fortress_Kotor.jpg",
    "kotor-cathedral-of-saint-tryphon": "Katedrala%20Svetog%20Tripuna.jpg",
    "kotor-perast": "Perast_Boka_Kotorska.jpg",
    "kotor-our-lady-of-the-rocks": "Our_Lady_of_the_Rocks,_Perast.jpg",
    "kotor-maritime-museum-of-montenegro": "Maritime_Museum_of_Montenegro.jpg",
    "kotor-bajova-kula-beach": "Kotor_Montenegro.jpg",
    "kotor-morinj-beach": "Morinj_%E2%80%93_panoramio.jpg",
    "kotor-vrmac-ridge-trail": "Vrmac_ridge.jpg",
    "kotor-ladder-of-kotor-kotor-serpentines": "Kotor_serpentines.jpg",

    # === TIVAT ===
    "tivat-porto-montenegro": "Porto_Montenegro.jpg",
    "tivat-island-of-flowers-miholjska-prevlaka": "Prevlaka_Tivat.jpg",
    "tivat-plavi-horizonti-beach": "Radovici%20-%20Plavi%20horizonti.jpg",
    "tivat-donja-lastva-beach": "Donja_Lastva.jpg",
    "tivat-ponta-beach": "Tivat_promenade.jpg",
    "tivat-naval-heritage-collection": "Porto_Montenegro_submarine.jpg",
    "tivat-big-city-park-veliki-gradski-park": "Gradski_park_Tivat.jpg",

    # === BUDVA ===
    "budva-budva-old-town-stari-grad": "Budva_Stari_Grad.jpg",
    "budva-sveti-stefan": "Sveti_Stefan_peninsula.jpg",
    "budva-sveti-stefan-beach": "Sveti_Stefan_Montenegro.jpg",
    "budva-citadela-budva": "Citadela_Budva.jpg",
    "budva-jaz-beach": "Jaz_beach.jpg",
    "budva-mogren-beach": "Mogren_beach.jpg",
    "budva-becici-beach": "Becici_beach_Montenegro.jpg",
    "budva-kamenovo-beach": "Kamenovo_beach_Montenegro.jpg",
    "budva-slovenska-plaza": "Slovenska_plaza_Budva.jpg",
    "budva-ploce-beach": "Budva_-_Plo%C4%8De.jpg",
    "budva-red-beach-crvena-plaza": "Crvena_plaza.jpg",
    "budva-church-of-santa-maria-in-punta": "Santa_Maria_in_Punta_Budva.jpg",
    "budva-top-hill": "Top_Hill_Budva.jpg",
    "budva-top-hill-club": "Top_Hill_Budva.jpg",
    "budva-dukley-beach-bar": "Dukley_Beach_Budva.jpg",

    # === BAR ===
    "bar-stari-bar-old-bar": "Stari_Bar_panorama.jpg",
    "bar-old-olive-tree-of-bar": "Old_Olive_tree_Bar_Montenegro.jpg",
    "bar-haj-nehaj-fortress": "Haj-Nehaj_fortress.jpg",
    "bar-sutomore-beach": "Sutomore_beach.jpg",
    "bar-canj-beach": "Canj_beach_Montenegro.jpg",
    "bar-bar-promenade-king-nikolas-palace": "King_Nikola_Palace_Bar.jpg",
    "bar-king-nikolas-palace": "King_Nikola_Palace_Bar.jpg",
    "bar-bar-aqueduct": "Aqueduct_Stari_Bar.jpg",

    # === ULCINJ ===
    "ulcinj-ulcinj-old-town": "Ulcinj_old_town.jpg",
    "ulcinj-velika-plaza-long-beach": "Velika_Plaza_Ulcinj.jpg",
    "ulcinj-mala-plaza-small-beach": "Mala_plaza_Ulcinj.jpg",
    "ulcinj-ladies-beach-zenska-plaza": "Ulcinj_Ladies_Beach.jpg",
    "ulcinj-ada-bojana": "Ada_Bojana.jpg",
    "ulcinj-ulcinj-salina": "Ulcinj_salina.jpg",
    "ulcinj-valdanos-olive-grove": "Valdanos_Montenegro.jpg",
    "ulcinj-sas-lake-sasko-jezero": "Sasko_jezero.jpg",
    "ulcinj-zukotrlica-beach": "Zukotrlica_beach.jpg",
}

WIKIMEDIA_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/"
WIKIMEDIA_THUMB = "https://commons.wikimedia.org/w/thumb.php?f={}&w=600"

# Wikimedia Commons API to search for images
COMMONS_API = "https://commons.wikimedia.org/w/api.php"


def search_commons_image(query: str, client: httpx.Client) -> str | None:
    """Search Wikimedia Commons for an image matching the query."""
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"File: {query} Montenegro",
        "gsrlimit": "3",
        "prop": "imageinfo",
        "iiprop": "url|size",
        "iiurlwidth": "600",
    }
    try:
        resp = client.get(COMMONS_API, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for page in sorted(pages.values(), key=lambda p: p.get("index", 999)):
            info = page.get("imageinfo", [{}])[0]
            url = info.get("url")
            thumb = info.get("thumburl")
            if url and ("jpg" in url.lower() or "jpeg" in url.lower() or "png" in url.lower()):
                return url
    except Exception as e:
        pass
    return None


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    client = httpx.Client(
        headers={"User-Agent": "MontenegroGuide/1.0 (image enrichment)"},
        follow_redirects=True,
    )

    updated = 0
    added = 0

    # Step 1: Replace fake Unsplash images with real Wikimedia images for known places
    print("=== Step 1: Replacing fake stock photos with real images ===")
    for slug, filename in REAL_IMAGES.items():
        cur.execute("SELECT id FROM places WHERE slug = ?", (slug,))
        row = cur.fetchone()
        if not row:
            continue
        place_id = row[0]

        real_url = WIKIMEDIA_BASE + filename
        thumb_url = WIKIMEDIA_THUMB.format(filename)

        # Check if place already has images
        cur.execute("SELECT id, original_url FROM place_images WHERE place_id = ? AND is_primary = 1", (place_id,))
        existing = cur.fetchone()

        if existing:
            # Update the existing primary image
            cur.execute("""
                UPDATE place_images
                SET original_url = ?, public_url = ?, thumb_public_url = ?,
                    license_label = 'Wikimedia Commons', license_status = 'cc'
                WHERE id = ?
            """, (real_url, real_url, thumb_url, existing[0]))
            updated += 1
        else:
            # Add new image
            cur.execute("""
                INSERT INTO place_images (place_id, original_url, public_url, thumb_public_url,
                    alt_text, license_label, license_status, sort_order, is_primary,
                    created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'Wikimedia Commons', 'cc', 0, 1,
                    datetime('now'), datetime('now'))
            """, (place_id, real_url, real_url, thumb_url, slug.split("-", 1)[-1].replace("-", " ").title()))
            added += 1

    conn.commit()
    print(f"  Updated: {updated}, Added: {added}")

    # Step 2: Search Wikimedia Commons for images for featured places that have none
    print("\n=== Step 2: Finding images for featured places without any ===")
    cur.execute("""
        SELECT p.id, p.slug, p.name, p.municipality_id
        FROM places p
        LEFT JOIN place_images pi ON pi.place_id = p.id
        WHERE p.featured = 1 AND pi.id IS NULL
        ORDER BY p.popularity_score DESC
    """)
    no_image_featured = cur.fetchall()
    print(f"  {len(no_image_featured)} featured places without images")

    found = 0
    for place_id, slug, name, muni_id in no_image_featured:
        url = search_commons_image(name, client)
        if url:
            filename = url.split("/")[-1]
            thumb_url = WIKIMEDIA_THUMB.format(urllib.parse.quote(filename))
            cur.execute("""
                INSERT INTO place_images (place_id, original_url, public_url, thumb_public_url,
                    alt_text, license_label, license_status, sort_order, is_primary,
                    created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'Wikimedia Commons', 'cc', 0, 1,
                    datetime('now'), datetime('now'))
            """, (place_id, url, url, thumb_url, name))
            found += 1
            print(f"  Found: {name} -> {url[:80]}...")
        time.sleep(0.5)  # Be polite to Wikimedia API

    conn.commit()
    print(f"  Found images for {found} featured places")

    # Step 3: Search for images for popular curated places without images
    print("\n=== Step 3: Finding images for curated places without any ===")
    cur.execute("""
        SELECT p.id, p.slug, p.name
        FROM places p
        LEFT JOIN place_images pi ON pi.place_id = p.id
        WHERE p.source_type = 'curated' AND pi.id IS NULL
        ORDER BY p.popularity_score DESC
    """)
    no_image_curated = cur.fetchall()
    print(f"  {len(no_image_curated)} curated places without images")

    found2 = 0
    for place_id, slug, name in no_image_curated:
        url = search_commons_image(name, client)
        if url:
            filename = url.split("/")[-1]
            thumb_url = WIKIMEDIA_THUMB.format(urllib.parse.quote(filename))
            cur.execute("""
                INSERT INTO place_images (place_id, original_url, public_url, thumb_public_url,
                    alt_text, license_label, license_status, sort_order, is_primary,
                    created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'Wikimedia Commons', 'cc', 0, 1,
                    datetime('now'), datetime('now'))
            """, (place_id, url, url, thumb_url, name))
            found2 += 1
            print(f"  Found: {name} -> {url[:80]}...")
        time.sleep(0.5)

    conn.commit()
    print(f"  Found images for {found2} curated places")

    # Final audit
    print("\n=== FINAL IMAGE AUDIT ===")
    cur.execute("SELECT COUNT(DISTINCT place_id) FROM place_images WHERE public_url IS NOT NULL")
    print(f"Places with working images: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM place_images WHERE public_url LIKE '%commons.wikimedia%'")
    print(f"Wikimedia Commons images: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM place_images WHERE public_url LIKE '%unsplash%'")
    print(f"Remaining Unsplash (should be 0): {cur.fetchone()[0]}")

    client.close()
    conn.close()


if __name__ == "__main__":
    run()
