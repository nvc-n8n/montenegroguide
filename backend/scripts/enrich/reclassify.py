"""Reclassify places stuck in Znamenitosti using source_records OSM tags and name heuristics."""

import sys
import re
import json
import sqlite3
import logging

sys.stdout.reconfigure(encoding="utf-8")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-5s %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)

DB_PATH = "montenegro_guide.db"

# Name-based classification patterns
NAME_PATTERNS = {
    "plaze": [
        r"\bbeach\b", r"\bplaža\b", r"\bplaže\b", r"\bplaza\b", r"\bbay\b",
        r"\buvala\b", r"\bcove\b",
    ],
    "tvrdjave-stari-gradovi": [
        r"\bfortress\b", r"\bfort\b", r"\bcastle\b", r"\btvrđava\b", r"\bkula\b",
        r"\bcitadel\b", r"\bbastio\b", r"\bwall\b", r"\bgate\b", r"\bruins?\b",
        r"\bstari\s+grad\b", r"\bold\s+town\b",
    ],
    "manastiri-crkve": [
        r"\bchurch\b", r"\bcrkva\b", r"\bmonastery\b", r"\bmanastir\b",
        r"\bchapel\b", r"\bcathedral\b", r"\bbasilica\b", r"\bmosque\b",
        r"\bdžamija\b", r"\bparish\b", r"\bžupa\b",
    ],
    "muzeji-kultura": [
        r"\bmuseum\b", r"\bmuzej\b", r"\bgallery\b", r"\bgalerija\b",
        r"\btheatre\b", r"\btheater\b", r"\bpozorište\b", r"\blibrary\b",
        r"\bbiblioteka\b", r"\bcultural\s+cent", r"\bkulturni\b",
    ],
    "priroda-vidikovci": [
        r"\bpark\b", r"\bgarden\b", r"\bvrt\b", r"\bviewpoint\b", r"\bvidikovac\b",
        r"\bpeak\b", r"\bvrh\b", r"\bmountain\b", r"\bplanina\b",
        r"\btrail\b", r"\bstaza\b", r"\blake\b", r"\bjezero\b", r"\briver\b",
        r"\brijeka\b", r"\bwaterfall\b", r"\bslap\b", r"\bspring\b", r"\bizvor\b",
        r"\bnature\b", r"\bcanyon\b", r"\bgrotto\b", r"\bcave\b", r"\bšpilja\b",
        r"\bforest\b", r"\bšuma\b", r"\bolive\s+grove\b",
    ],
    "restorani-beach-barovi": [
        r"\brestaurant\b", r"\brestoran\b", r"\bkonoba\b", r"\bpizzeria\b",
        r"\bcafe\b", r"\bkafana\b", r"\bbistro\b", r"\btavern\b",
        r"\bgrill\b", r"\bfast\s+food\b", r"\bbakery\b", r"\bpekara\b",
        r"\bpastry\b", r"\bice\s+cream\b", r"\bsladoled\b",
    ],
    "nocni-zivot": [
        r"\bclub\b", r"\bklub\b", r"\bbar\b(?!\s*(municipality|travel))",
        r"\bpub\b", r"\bdisco\b", r"\blounge\b", r"\bcocktail\b",
        r"\bnightclub\b",
    ],
    "aktivni-odmor": [
        r"\bdiving\b", r"\bkayak\b", r"\braft\b", r"\bsail\b", r"\bsurf\b",
        r"\bclimb\b", r"\bbike\b", r"\bcycl\b", r"\bsport\b",
        r"\badventure\b", r"\bzip\s*line\b", r"\bparaglid\b",
        r"\btennis\b", r"\bgolf\b", r"\bswimming\s+pool\b",
    ],
    "porodicna-mjesta": [
        r"\bplayground\b", r"\bwater\s+park\b", r"\baquapark\b", r"\bzoo\b",
        r"\btheme\s+park\b", r"\bchildren\b", r"\bkids?\b",
    ],
}


def classify_by_name(name: str, alt_names: str) -> str | None:
    """Try to classify a place by its name using regex patterns."""
    combined = f"{name} {alt_names}".lower()
    for category_slug, patterns in NAME_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, combined, re.IGNORECASE):
                return category_slug
    return None


def classify_by_source_record(conn: sqlite3.Connection, place_slug: str) -> str | None:
    """Try to classify using OSM tags from source_records."""
    cur = conn.cursor()
    cur.execute(
        "SELECT raw_payload FROM source_records WHERE normalized_slug = ?",
        (place_slug,)
    )
    row = cur.fetchone()
    if not row:
        return None

    try:
        payload = json.loads(row[0])
        tags = payload.get("tags", {})
    except (json.JSONDecodeError, TypeError):
        return None

    # Direct OSM tag mapping
    osm_map = {
        "beach": "plaze",
        "castle": "tvrdjave-stari-gradovi",
        "fort": "tvrdjave-stari-gradovi",
        "city_gate": "tvrdjave-stari-gradovi",
        "ruins": "tvrdjave-stari-gradovi",
        "monastery": "manastiri-crkve",
        "church": "manastiri-crkve",
        "place_of_worship": "manastiri-crkve",
        "chapel": "manastiri-crkve",
        "museum": "muzeji-kultura",
        "gallery": "muzeji-kultura",
        "theatre": "muzeji-kultura",
        "library": "muzeji-kultura",
        "viewpoint": "priroda-vidikovci",
        "peak": "priroda-vidikovci",
        "nature_reserve": "priroda-vidikovci",
        "park": "priroda-vidikovci",
        "garden": "priroda-vidikovci",
        "restaurant": "restorani-beach-barovi",
        "cafe": "restorani-beach-barovi",
        "fast_food": "restorani-beach-barovi",
        "nightclub": "nocni-zivot",
        "bar": "nocni-zivot",
        "pub": "nocni-zivot",
        "dive_centre": "aktivni-odmor",
        "sports_centre": "aktivni-odmor",
        "swimming_pool": "aktivni-odmor",
        "water_park": "porodicna-mjesta",
        "playground": "porodicna-mjesta",
    }

    for key in ["natural", "historic", "tourism", "amenity", "leisure", "sport"]:
        val = tags.get(key, "")
        if val in osm_map:
            return osm_map[val]

    return None


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Get the znamenitosti category ID
    cur.execute("SELECT id FROM categories WHERE slug = 'znamenitosti'")
    znam_id = cur.fetchone()[0]

    # Get category slug -> id map
    cur.execute("SELECT slug, id FROM categories")
    cat_map = {r[0]: r[1] for r in cur.fetchall()}

    # Get all places in znamenitosti
    cur.execute(
        "SELECT id, slug, name, alternate_names FROM places WHERE category_id = ?",
        (znam_id,)
    )
    places = cur.fetchall()
    logger.info(f"Found {len(places)} places in Znamenitosti to reclassify")

    reclassified = 0
    by_category = {}

    for place_id, slug, name, alt_names in places:
        # Try source record first
        new_cat = classify_by_source_record(conn, slug)
        # Then name-based
        if not new_cat:
            new_cat = classify_by_name(name, alt_names or "")

        if new_cat and new_cat != "znamenitosti" and new_cat in cat_map:
            cur.execute(
                "UPDATE places SET category_id = ? WHERE id = ?",
                (cat_map[new_cat], place_id)
            )
            reclassified += 1
            by_category[new_cat] = by_category.get(new_cat, 0) + 1

    conn.commit()
    logger.info(f"Reclassified {reclassified} places from Znamenitosti:")
    for cat, count in sorted(by_category.items(), key=lambda x: -x[1]):
        logger.info(f"  -> {cat}: {count}")

    # Verify
    cur.execute("SELECT c.name, COUNT(p.id) FROM places p JOIN categories c ON p.category_id = c.id GROUP BY c.id ORDER BY COUNT(p.id) DESC")
    logger.info("New category distribution:")
    for r in cur.fetchall():
        logger.info(f"  {r[0]}: {r[1]}")

    conn.close()


if __name__ == "__main__":
    run()
