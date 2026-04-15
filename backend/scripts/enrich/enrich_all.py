"""Master enrichment script:
1. Generate short descriptions for places that lack them
2. Tag hidden gems (low popularity, off main tourist paths)
3. Tag family-friendly places
4. Set featured flags for notable places
5. Add more Budva/Bar curated places to fill the OSM gap
6. Better reclassify remaining Znamenitosti using Wikidata descriptions
"""

import sys
import re
import json
import sqlite3
import logging

sys.stdout.reconfigure(encoding="utf-8")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-5s %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)

DB_PATH = "montenegro_guide.db"

# ─── Municipality display names for description generation ───
MUNICIPALITY_NAMES = {
    1: "Herceg Novi", 2: "Kotor", 3: "Tivat",
    4: "Budva", 5: "Bar", 6: "Ulcinj",
}

# ─── Category slug -> id cache ───
def get_cat_map(conn):
    cur = conn.cursor()
    cur.execute("SELECT slug, id FROM categories")
    return {r[0]: r[1] for r in cur.fetchall()}

# ─── Category descriptions for auto-gen ───
CATEGORY_DESCRIPTIONS = {
    "plaze": "beach on the Montenegrin coast",
    "znamenitosti": "notable landmark",
    "tvrdjave-stari-gradovi": "historic fortification or old town",
    "manastiri-crkve": "religious site",
    "muzeji-kultura": "cultural venue",
    "priroda-vidikovci": "natural attraction or viewpoint",
    "restorani-beach-barovi": "restaurant or beach bar",
    "nocni-zivot": "nightlife venue",
    "aktivni-odmor": "activity and adventure spot",
    "porodicna-mjesta": "family-friendly attraction",
    "hidden-gems": "hidden gem off the beaten path",
}


def enrich_descriptions(conn):
    """Generate short descriptions for places that lack them."""
    cur = conn.cursor()

    # Get category id -> slug map
    cur.execute("SELECT id, slug FROM categories")
    cat_id_to_slug = {r[0]: r[1] for r in cur.fetchall()}

    # Get places without descriptions
    cur.execute("""
        SELECT p.id, p.name, p.municipality_id, p.category_id, p.beach_type,
               p.lat, p.lng, p.alternate_names, p.tags
        FROM places p
        WHERE p.short_description IS NULL
    """)
    places = cur.fetchall()
    logger.info(f"Found {len(places)} places without short descriptions")

    updated = 0
    for pid, name, muni_id, cat_id, beach_type, lat, lng, alt_names, tags in places:
        muni_name = MUNICIPALITY_NAMES.get(muni_id, "Montenegro")
        cat_slug = cat_id_to_slug.get(cat_id, "znamenitosti")
        cat_desc = CATEGORY_DESCRIPTIONS.get(cat_slug, "point of interest")

        # Build a contextual description
        parts = []

        if cat_slug == "plaze":
            bt = beach_type or "mixed"
            parts.append(f"{bt.capitalize()} beach in {muni_name}")
        elif cat_slug == "restorani-beach-barovi":
            parts.append(f"Dining spot in {muni_name}")
        elif cat_slug == "nocni-zivot":
            parts.append(f"Nightlife venue in {muni_name}")
        elif cat_slug == "manastiri-crkve":
            if "mosque" in name.lower() or "džamija" in name.lower():
                parts.append(f"Mosque in {muni_name}")
            elif "monastery" in name.lower() or "manastir" in name.lower():
                parts.append(f"Monastery in {muni_name}")
            else:
                parts.append(f"Church in {muni_name}")
        elif cat_slug == "tvrdjave-stari-gradovi":
            parts.append(f"Historic fortification in {muni_name}")
        elif cat_slug == "muzeji-kultura":
            parts.append(f"Cultural venue in {muni_name}")
        elif cat_slug == "priroda-vidikovci":
            parts.append(f"Natural attraction near {muni_name}")
        elif cat_slug == "aktivni-odmor":
            parts.append(f"Activity spot in {muni_name}")
        elif cat_slug == "porodicna-mjesta":
            parts.append(f"Family attraction in {muni_name}")
        else:
            parts.append(f"Notable {cat_desc} in {muni_name}")

        # Add alt name context
        if alt_names:
            try:
                alts = json.loads(alt_names) if isinstance(alt_names, str) else alt_names
                if alts and isinstance(alts, list):
                    local_names = [a for a in alts if a != name][:2]
                    if local_names:
                        parts.append(f"Also known as {', '.join(local_names)}")
            except:
                pass

        # Add coordinate context
        if lat and lng:
            parts.append(f"Located at {lat:.4f}°N, {lng:.4f}°E")

        desc = ". ".join(parts) + "."
        cur.execute("UPDATE places SET short_description = ? WHERE id = ?", (desc, pid))
        updated += 1

    conn.commit()
    logger.info(f"Generated descriptions for {updated} places")


def tag_hidden_gems(conn):
    """Tag small, lesser-known places as hidden gems."""
    cur = conn.cursor()

    # Hidden gem criteria: low popularity, not featured, not a chain restaurant
    cur.execute("""
        UPDATE places SET hidden_gem = 1
        WHERE hidden_gem = 0
          AND featured = 0
          AND popularity_score <= 30
          AND source_type IN ('osm', 'wikidata')
          AND category_id NOT IN (
              SELECT id FROM categories WHERE slug IN ('restorani-beach-barovi', 'nocni-zivot')
          )
    """)
    tagged = cur.rowcount
    conn.commit()
    logger.info(f"Tagged {tagged} places as hidden gems")

    # Also tag some more from specific categories
    cur.execute("""
        UPDATE places SET hidden_gem = 1
        WHERE hidden_gem = 0
          AND featured = 0
          AND popularity_score <= 50
          AND category_id IN (
              SELECT id FROM categories WHERE slug IN ('priroda-vidikovci', 'manastiri-crkve')
          )
          AND source_type IN ('osm', 'wikidata')
    """)
    tagged2 = cur.rowcount
    conn.commit()
    logger.info(f"Tagged {tagged2} more nature/monastery places as hidden gems")


def tag_family_friendly(conn):
    """Tag appropriate places as family-friendly."""
    cur = conn.cursor()

    # Beaches, parks, playgrounds, museums are family friendly
    cur.execute("""
        UPDATE places SET family_friendly = 1
        WHERE family_friendly = 0
          AND category_id IN (
              SELECT id FROM categories WHERE slug IN (
                  'plaze', 'priroda-vidikovci', 'porodicna-mjesta', 'muzeji-kultura'
              )
          )
    """)
    tagged = cur.rowcount
    conn.commit()
    logger.info(f"Tagged {tagged} places as family-friendly")


def set_featured_flags(conn):
    """Set featured flag for notable places."""
    cur = conn.cursor()

    # Feature places with high popularity or that are cultural sites
    cur.execute("""
        UPDATE places SET featured = 1
        WHERE featured = 0
          AND (
              popularity_score >= 80
              OR (cultural_site = 1 AND popularity_score >= 50)
          )
    """)
    tagged = cur.rowcount
    conn.commit()
    logger.info(f"Set featured flag on {tagged} more places")


def add_budva_bar_curated(conn):
    """Add curated places for Budva and Bar to fill the OSM gap."""
    cur = conn.cursor()
    cat_map = get_cat_map(conn)

    # Get municipality IDs
    cur.execute("SELECT slug, id FROM municipalities")
    muni_map = {r[0]: r[1] for r in cur.fetchall()}

    EXTRA_PLACES = [
        # ── BUDVA extras ──
        {"name": "Top Hill Club", "slug": "budva-top-hill-club", "municipality": "budva", "category": "nocni-zivot",
         "lat": 42.2907, "lng": 18.8411, "short_description": "One of Europe's top open-air nightclubs, perched on a hill above Budva with panoramic sea views. Hosts world-class DJs every summer.",
         "popularity_score": 95, "featured": True, "nightlife": True},
        {"name": "Trocadero Club", "slug": "budva-trocadero-club", "municipality": "budva", "category": "nocni-zivot",
         "lat": 42.2889, "lng": 18.8387, "short_description": "Iconic beach club on Budva's waterfront. Open-air venue with live music, DJs, and cocktails steps from the old town.",
         "popularity_score": 85, "featured": True, "nightlife": True},
        {"name": "Dukley Beach Lounge", "slug": "budva-dukley-beach-lounge", "municipality": "budva", "category": "restorani-beach-barovi",
         "lat": 42.2830, "lng": 18.8430, "short_description": "Upscale beach club and restaurant between Budva and Bečići. Mediterranean cuisine, premium beach service, and sunset views.",
         "popularity_score": 80, "featured": True},
        {"name": "Mogul Restaurant", "slug": "budva-mogul-restaurant", "municipality": "budva", "category": "restorani-beach-barovi",
         "lat": 42.2892, "lng": 18.8390, "short_description": "Fine dining restaurant in Budva's old town. Mediterranean and Montenegrin cuisine with romantic courtyard seating.",
         "popularity_score": 75},
        {"name": "Budva Water Slides", "slug": "budva-water-slides", "municipality": "budva", "category": "porodicna-mjesta",
         "lat": 42.2880, "lng": 18.8350, "short_description": "Water park with slides near Budva. Popular family destination during summer months.",
         "popularity_score": 60, "family_friendly": True},
        {"name": "Kayak Tour Budva", "slug": "budva-kayak-tour", "municipality": "budva", "category": "aktivni-odmor",
         "lat": 42.2890, "lng": 18.8370, "short_description": "Sea kayaking tours along the Budva coastline. Explore hidden caves, beaches, and the island of Sveti Nikola by kayak.",
         "popularity_score": 70, "active_holiday": True},
        {"name": "Paragliding Budva", "slug": "budva-paragliding", "municipality": "budva", "category": "aktivni-odmor",
         "lat": 42.2850, "lng": 18.8500, "short_description": "Tandem paragliding flights over Budva and the Adriatic coast. Launch from Brajići mountain with stunning aerial views.",
         "popularity_score": 75, "active_holiday": True},
        {"name": "Diving Center Blue Water", "slug": "budva-diving-center", "municipality": "budva", "category": "aktivni-odmor",
         "lat": 42.2890, "lng": 18.8400, "short_description": "PADI-certified diving center in Budva. Discover underwater caves, shipwrecks, and marine life along the coast.",
         "popularity_score": 65, "active_holiday": True},

        # ── BAR extras ──
        {"name": "Rumija Mountain Trail", "slug": "bar-rumija-mountain", "municipality": "bar", "category": "aktivni-odmor",
         "lat": 42.1300, "lng": 19.1100, "short_description": "Hiking trail to Rumija peak (1594m) above Bar. Challenging climb with panoramic views of the coast and Lake Skadar.",
         "popularity_score": 65, "active_holiday": True, "hidden_gem": True},
        {"name": "Bar Marina", "slug": "bar-marina", "municipality": "bar", "category": "znamenitosti",
         "lat": 42.0900, "lng": 19.0990, "short_description": "Modern marina in Bar with berths for yachts and sailboats. Starting point for sailing trips along the southern Montenegrin coast.",
         "popularity_score": 55},
        {"name": "Kaldrma Restaurant", "slug": "bar-kaldrma", "municipality": "bar", "category": "restorani-beach-barovi",
         "lat": 42.0940, "lng": 19.1000, "short_description": "Traditional Montenegrin restaurant in Bar. Known for grilled meats, fresh fish, and local wine from the Crmnica region.",
         "popularity_score": 70},
        {"name": "Bar Nightlife Strip", "slug": "bar-nightlife-strip", "municipality": "bar", "category": "nocni-zivot",
         "lat": 42.0920, "lng": 19.1010, "short_description": "Bar's main nightlife area along the waterfront promenade. Several bars, clubs, and late-night cafes with outdoor seating.",
         "popularity_score": 55, "nightlife": True},
        {"name": "King Nikola's Palace", "slug": "bar-king-nikolas-palace", "municipality": "bar", "category": "muzeji-kultura",
         "lat": 42.0900, "lng": 19.1005, "short_description": "19th-century palace of King Nikola I, now a museum. Houses the Bar Local History Museum with royal artifacts and ethnographic collections.",
         "popularity_score": 70, "cultural_site": True, "featured": True},
        {"name": "Bar Aqueduct", "slug": "bar-aqueduct", "municipality": "bar", "category": "znamenitosti",
         "lat": 42.0970, "lng": 19.1250, "short_description": "Well-preserved Ottoman-era aqueduct near Stari Bar. An impressive 17-arch structure that once supplied water to the old fortress city.",
         "popularity_score": 60, "cultural_site": True, "hidden_gem": True},
        {"name": "Crmnica Wine Region", "slug": "bar-crmnica-wine", "municipality": "bar", "category": "restorani-beach-barovi",
         "lat": 42.1300, "lng": 19.0800, "short_description": "Montenegro's premier wine region near Bar. Visit family vineyards producing Vranac and Krstač wines with tasting tours available.",
         "popularity_score": 65, "hidden_gem": True},
    ]

    created = 0
    for place in EXTRA_PLACES:
        slug = place["slug"]
        cur.execute("SELECT id FROM places WHERE slug = ?", (slug,))
        if cur.fetchone():
            continue

        muni_id = muni_map.get(place["municipality"])
        cat_id = cat_map.get(place["category"])
        if not muni_id or not cat_id:
            continue

        cur.execute("""
            INSERT INTO places (slug, name, municipality_id, category_id, lat, lng,
                short_description, source_type, popularity_score, featured,
                family_friendly, hidden_gem, nightlife, active_holiday, cultural_site,
                parking_available, pet_friendly, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'curated', ?, ?, ?, ?, ?, ?, ?, 0, 0,
                datetime('now'), datetime('now'))
        """, (
            slug, place["name"], muni_id, cat_id, place["lat"], place["lng"],
            place["short_description"], place.get("popularity_score", 50),
            place.get("featured", False), place.get("family_friendly", False),
            place.get("hidden_gem", False), place.get("nightlife", False),
            place.get("active_holiday", False), place.get("cultural_site", False),
        ))
        created += 1

    conn.commit()
    logger.info(f"Added {created} curated places for Budva/Bar")


def deeper_reclassify(conn):
    """Second pass reclassification using Wikidata descriptions and source records."""
    cur = conn.cursor()
    cat_map = get_cat_map(conn)

    cur.execute("SELECT id FROM categories WHERE slug = 'znamenitosti'")
    znam_id = cur.fetchone()[0]

    # Get all remaining znamenitosti places with source records
    cur.execute("""
        SELECT p.id, p.slug, p.name, sr.raw_payload
        FROM places p
        LEFT JOIN source_records sr ON sr.normalized_slug = p.slug
        WHERE p.category_id = ?
    """, (znam_id,))

    rows = cur.fetchall()
    reclassified = 0
    by_cat = {}

    for pid, slug, name, raw_payload in rows:
        new_cat = None

        # Try parsing source record for more signals
        if raw_payload:
            try:
                payload = json.loads(raw_payload)
                tags = payload.get("tags", {})

                # Religion tag = church/monastery
                if tags.get("religion") or tags.get("denomination"):
                    new_cat = "manastiri-crkve"
                # Cuisine tag = restaurant
                elif tags.get("cuisine") or tags.get("diet:vegetarian"):
                    new_cat = "restorani-beach-barovi"
                # Opening hours for nightlife places
                elif tags.get("opening_hours") and any(
                    x in str(tags.get("opening_hours", "")).lower()
                    for x in ["22:", "23:", "00:", "01:", "02:"]
                ):
                    if "cafe" not in name.lower() and "restaurant" not in name.lower():
                        new_cat = "nocni-zivot"
                # Sport tag
                elif tags.get("sport"):
                    new_cat = "aktivni-odmor"
            except:
                pass

        if new_cat and new_cat in cat_map:
            cur.execute("UPDATE places SET category_id = ? WHERE id = ?", (cat_map[new_cat], pid))
            reclassified += 1
            by_cat[new_cat] = by_cat.get(new_cat, 0) + 1

    conn.commit()
    logger.info(f"Deep reclassified {reclassified} more places:")
    for cat, count in sorted(by_cat.items(), key=lambda x: -x[1]):
        logger.info(f"  -> {cat}: {count}")


def create_hidden_gems_category(conn):
    """Populate the hidden-gems category with suitable candidates."""
    cur = conn.cursor()
    cat_map = get_cat_map(conn)

    hidden_gems_id = cat_map.get("hidden-gems")
    if not hidden_gems_id:
        cur.execute("INSERT INTO categories (slug, name) VALUES ('hidden-gems', 'Hidden Gems')")
        hidden_gems_id = cur.lastrowid
        conn.commit()

    # Tag very low popularity nature/cultural places with hidden_gem flag
    cur.execute("""
        UPDATE places SET hidden_gem = 1
        WHERE hidden_gem = 0
          AND popularity_score <= 20
          AND source_type IN ('osm', 'wikidata')
          AND category_id IN (
              SELECT id FROM categories WHERE slug IN (
                  'priroda-vidikovci', 'manastiri-crkve', 'tvrdjave-stari-gradovi',
                  'znamenitosti', 'plaze'
              )
          )
    """)
    tagged = cur.rowcount
    conn.commit()
    logger.info(f"Tagged {tagged} more places as hidden gems (low popularity threshold)")


def run():
    conn = sqlite3.connect(DB_PATH)

    logger.info("=" * 60)
    logger.info("ENRICHMENT PIPELINE")
    logger.info("=" * 60)

    logger.info("\n--- Step 1: Adding Budva/Bar curated places ---")
    add_budva_bar_curated(conn)

    logger.info("\n--- Step 2: Deep reclassification ---")
    deeper_reclassify(conn)

    logger.info("\n--- Step 3: Generating descriptions ---")
    enrich_descriptions(conn)

    logger.info("\n--- Step 4: Tagging hidden gems ---")
    tag_hidden_gems(conn)
    create_hidden_gems_category(conn)

    logger.info("\n--- Step 5: Tagging family-friendly ---")
    tag_family_friendly(conn)

    logger.info("\n--- Step 6: Setting featured flags ---")
    set_featured_flags(conn)

    # Final summary
    cur = conn.cursor()
    logger.info("\n" + "=" * 60)
    logger.info("FINAL ENRICHMENT SUMMARY")
    logger.info("=" * 60)

    cur.execute("SELECT COUNT(*) FROM places")
    logger.info(f"Total places: {cur.fetchone()[0]}")

    cur.execute("SELECT COUNT(*) FROM places WHERE short_description IS NOT NULL")
    logger.info(f"With descriptions: {cur.fetchone()[0]}")

    cur.execute("SELECT COUNT(*) FROM places WHERE hidden_gem = 1")
    logger.info(f"Hidden gems: {cur.fetchone()[0]}")

    cur.execute("SELECT COUNT(*) FROM places WHERE family_friendly = 1")
    logger.info(f"Family-friendly: {cur.fetchone()[0]}")

    cur.execute("SELECT COUNT(*) FROM places WHERE featured = 1")
    logger.info(f"Featured: {cur.fetchone()[0]}")

    logger.info("\nCategory distribution:")
    cur.execute("SELECT c.name, COUNT(p.id) FROM places p JOIN categories c ON p.category_id = c.id GROUP BY c.id ORDER BY COUNT(p.id) DESC")
    for r in cur.fetchall():
        logger.info(f"  {r[0]}: {r[1]}")

    logger.info("\nMunicipality distribution:")
    cur.execute("SELECT m.name, COUNT(p.id) FROM places p JOIN municipalities m ON p.municipality_id = m.id GROUP BY m.id ORDER BY COUNT(p.id) DESC")
    for r in cur.fetchall():
        logger.info(f"  {r[0]}: {r[1]}")

    conn.close()


if __name__ == "__main__":
    run()
