# Montenegro Coast City Guide - Backend

Production-grade REST API backend for the Montenegro coastal city guide mobile app.

## Stack

- **Python** + **FastAPI** (async REST API)
- **PostgreSQL** (database with full-text search, trigram indexes)
- **SQLAlchemy** (async ORM) + **Alembic** (migrations)
- **Pydantic** (validation + serialization)
- **Pillow** (image processing)
- **httpx** + **BeautifulSoup** (ingestion pipeline)

## Coverage

6 Montenegrin coastal municipalities:
- Herceg Novi
- Kotor
- Tivat
- Budva
- Bar
- Ulcinj

## Quick Start

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

### 2. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Run migrations

```bash
python cli.py migrate
```

### 4. Seed the database

```bash
# Seed everything (categories, municipalities, data sources, curated places)
python cli.py seed
```

### 5. Run ingestion (optional - fetches live data)

```bash
# Ingest from all sources
python cli.py ingest-all

# Or ingest from specific sources
python cli.py ingest-osm
python cli.py ingest-morskodobro
python cli.py ingest-wikidata
python cli.py ingest-tourism hercegnovi_travel

# Ingest for a single municipality
python cli.py ingest-osm --municipality herceg-novi
```

### 6. Process images

```bash
python cli.py process-images
```

### 7. Start the API

```bash
python cli.py run-api
```

API will be available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/municipalities` | List all municipalities |
| `GET /api/v1/municipalities/{slug}/overview` | Municipality detail with category counts and featured places |
| `GET /api/v1/categories` | List all categories with place counts |
| `GET /api/v1/places` | List places with filtering |
| `GET /api/v1/places/{slug}` | Place detail with images and related places |
| `GET /api/v1/featured` | Featured places |
| `GET /api/v1/search?q=` | Full-text search |
| `GET /api/v1/nearby?lat=&lng=&limit=` | Nearby places by distance |

### Query Parameters for `/api/v1/places`

- `municipality` - filter by municipality slug
- `category` - filter by category slug
- `tags` - comma-separated tags
- `featured` - boolean
- `q` - text search
- `page` / `limit` - pagination

## CLI Commands

```
python cli.py migrate              # Run database migrations
python cli.py seed                 # Seed all base data
python cli.py seed-categories      # Seed categories only
python cli.py seed-municipalities  # Seed municipalities only
python cli.py seed-sources         # Seed data source records
python cli.py seed-places          # Seed curated places
python cli.py ingest-all           # Run full ingestion pipeline
python cli.py ingest-osm           # Ingest from OpenStreetMap
python cli.py ingest-morskodobro   # Ingest from Morsko Dobro
python cli.py ingest-wikidata      # Enrich from Wikidata
python cli.py ingest-tourism <key> # Ingest from tourism site
python cli.py process-images       # Download and process pending images
python cli.py rebuild-images       # Re-process all images
python cli.py run-api              # Start FastAPI server
```

## Architecture

```
backend/
├── app/
│   ├── api/          # FastAPI route handlers
│   ├── models/       # SQLAlchemy ORM models
│   ├── schemas/      # Pydantic response schemas
│   ├── services/     # Business logic layer
│   ├── storage/      # Storage abstraction (local / S3)
│   ├── db/           # Database session and base
│   ├── config.py     # Settings from environment
│   └── main.py       # FastAPI app factory
├── scripts/
│   ├── sources/      # Source-specific ingestors
│   ├── images/       # Image pipeline
│   ├── seed/         # Seed data scripts
│   └── normalize/    # Field normalization utils
├── alembic/          # Database migrations
├── docs/             # Documentation
├── media/            # Local image storage (dev)
└── cli.py            # CLI entry point
```

## Data Sources

| Source | Type | Used For |
|---|---|---|
| JP Morsko Dobro | Primary | Beaches, bathing areas |
| Local .travel sites | Primary | Attractions, culture, gastronomy, nightlife |
| OpenStreetMap / Overpass | Secondary | Coordinates, structured metadata |
| Wikidata | Secondary | Alternate names, multilingual enrichment |
| montenegro.travel | Secondary | National-level content enrichment |
