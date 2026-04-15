# Data Pipeline

## Ingestion Flow

```
Source Website/API
    ↓
Source Ingestor (scripts/sources/*.py)
    ↓
Raw Source Record (source_records table)
    ↓
Normalization & Mapping
    ↓
Upsert Municipality / Category / Place
    ↓
Image Metadata Records (place_images table)
    ↓
Image Pipeline (download, hash, thumbnail, store)
    ↓
Ingestion Run Stats (ingestion_runs table)
```

## Source Priority Order

1. **Curated seed data** - Bootstrap dataset of well-known places with verified coordinates
2. **JP Morsko Dobro** - Primary source for beaches
3. **Local tourism .travel sites** - Primary for attractions, culture, gastronomy
4. **OpenStreetMap / Overpass** - Structured geo data and coordinates
5. **Wikidata** - Alternate names, multilingual enrichment
6. **montenegro.travel** - National portal enrichment

## Normalization Strategy

### Municipality Names
All municipality names are normalized to slugs:
- "Herceg Novi" → `herceg-novi`
- "Kotor" → `kotor`
- etc.

### Category Mapping
Raw categories from sources are mapped to a controlled vocabulary:
- "beach", "plaža", "beaches" → `plaze`
- "fortress", "castle", "old town" → `tvrdjave-stari-gradovi`
- etc. (see `BaseIngestor.CATEGORY_MAP`)

### Place Slugs
Format: `{municipality-slug}-{slugified-name}`
Example: `kotor-old-town`, `budva-mogren-beach`

### Tags
Tags are normalized to lowercase English with hyphens:
- `["beach", "swimming", "snorkeling"]`
- `["fortress", "medieval", "panorama"]`

### Descriptions
- Strip HTML tags
- Normalize whitespace
- Truncate short_description to ~300 chars
- Store full text in long_description

## Deduplication Strategy

### Place Deduplication
- Primary key: `slug` (unique per place)
- Slug formula: `{municipality_slug}-{slugify(name)}`
- When the same slug appears from multiple sources, existing record is **updated** (not duplicated)
- New fields are merged; existing non-empty fields are preserved

### Image Deduplication
- SHA256 content hash
- If an identical image already exists (by hash), reuse storage path
- Multiple place_images records can point to the same physical file

## Image Pipeline

```
1. Discover image URLs from parsed source pages
2. Create place_images metadata record (original_url, source_page_url, license_status)
3. Download image content
4. Compute SHA256 hash
5. Check for existing image with same hash (dedup)
6. Extract metadata (width, height, mime_type, file_size)
7. Optimize full image (resize if oversized)
8. Generate thumbnail (400x300)
9. Save through storage adapter (local or S3)
10. Update place_images record with storage_path, public_url, thumb_path, etc.
```

### Image Failure Handling
- If download fails: place record is kept, image record stays with null storage_path
- If thumbnail generation fails: full image is still saved
- No single image failure crashes the pipeline
- All failures are logged with reason

## Running Ingestion

```bash
# Full pipeline
python cli.py seed          # Base data
python cli.py ingest-all    # All sources
python cli.py process-images # Download images

# Single municipality
python cli.py ingest-all --municipality budva
python cli.py process-images
```
