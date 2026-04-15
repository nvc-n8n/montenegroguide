# Database Schema

## Tables Overview

### municipalities
Core reference table for the 6 coastal municipalities.

| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| slug | varchar(100) | Unique, indexed |
| name | varchar(200) | |
| region | varchar(100) | Default: "coast" |
| short_description | text | |
| hero_image_id | integer FK → place_images | Nullable |
| created_at / updated_at | timestamptz | |

### categories
Controlled vocabulary of place types.

| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| slug | varchar(100) | Unique, indexed |
| name | varchar(200) | |
| icon | varchar(50) | FontAwesome icon name |
| created_at / updated_at | timestamptz | |

### places
Main content table. One row per point of interest.

| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| slug | varchar(300) | Unique, indexed. Format: `{municipality}-{name}` |
| name | varchar(300) | |
| alternate_names | jsonb | Array of strings |
| municipality_id | integer FK | Indexed |
| category_id | integer FK | Indexed |
| subtype | varchar(100) | Fine-grained type |
| lat / lng | float | Nullable |
| short_description | text | ~300 chars |
| long_description | text | Full description |
| tags | jsonb | Array of tag strings |
| amenities | jsonb | Array of amenity strings |
| best_for | jsonb | Array of activity strings |
| featured | boolean | Indexed |
| popularity_score | integer | 0-100 |
| family_friendly | boolean | |
| hidden_gem | boolean | |
| nightlife | boolean | |
| active_holiday | boolean | |
| cultural_site | boolean | |
| beach_type | varchar(50) | sandy, pebble, rocky, mixed |
| parking_available | boolean | |
| pet_friendly | boolean | |
| accessibility_notes | text | |
| source_url | text | |
| source_type | varchar(50) | curated, osm, official_tourism, etc. |
| license_type | varchar(100) | |
| verified_at | timestamptz | |
| search_document | tsvector | Auto-populated by trigger |
| created_at / updated_at | timestamptz | |

### place_images
Image metadata and storage references.

| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| place_id | integer FK → places | Indexed, CASCADE delete |
| original_url | text | Source image URL |
| storage_path | text | Local/S3 path |
| public_url | text | Served URL |
| thumb_path | text | Thumbnail path |
| thumb_public_url | text | Thumbnail URL |
| alt_text | text | |
| width / height | integer | |
| file_size | integer | Bytes |
| mime_type | varchar(50) | |
| sha256 | varchar(64) | Indexed for dedup |
| source_page_url | text | Page where image was found |
| credit | text | Attribution |
| license_label | varchar(200) | |
| license_url | text | |
| license_status | varchar(20) | approved, needs_review, unknown, blocked |
| sort_order | integer | |
| is_primary | boolean | |
| created_at / updated_at | timestamptz | |

### data_sources
Registry of ingestion sources.

| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| source_key | varchar(100) | Unique, indexed |
| name | varchar(200) | |
| base_url | varchar(500) | |
| source_type | varchar(50) | |
| active | boolean | |

### source_records
Raw data from each source, preserved for debugging and re-processing.

| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| data_source_id | integer FK | Indexed |
| external_id | varchar(300) | Source's own ID |
| source_url | text | |
| municipality_slug | varchar(100) | Indexed |
| raw_payload | jsonb | Full raw data |
| normalized_slug | varchar(300) | Indexed, links to places.slug |
| parse_status | varchar(30) | pending, parsed, failed |

### ingestion_runs
Audit log of each ingestion execution.

| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| source_key | varchar(100) | Indexed |
| started_at / finished_at | timestamptz | |
| status | varchar(30) | running, completed, failed |
| records_seen / created / updated / failed | integer | |
| notes | text | Error details on failure |

### place_related_places
Graph of related places (nearby, similar, etc.).

| Column | Type | Notes |
|---|---|---|
| id | integer PK | |
| place_id | integer FK → places | |
| related_place_id | integer FK → places | |
| relation_type | varchar(50) | nearby, similar, same_area |

## Index Strategy

### Primary Indexes
- All slug columns: B-tree unique index for fast lookup
- municipality_id, category_id on places: B-tree for filtering
- Composite (municipality_id, category_id): for combined filters

### Search Indexes
- `search_document` on places: GIN index for full-text search
- `name` on places: GIN trigram index for fuzzy matching

### Performance Indexes
- `(featured, popularity_score)` on places: for featured/popular listings
- `sha256` on place_images: for deduplication lookups
- `place_id` on place_images: for image retrieval

### Full-Text Search
- Automatic trigger updates `search_document` on INSERT/UPDATE
- Weighted: name (A), short_description (B), long_description (C)
- Uses `simple` text search config (language-agnostic, good for proper nouns)
- Combined with `ILIKE` fallback for names not in tsvector
