-- Montenegro Coast City Guide — Supabase schema + API layer
-- Paste FIRST into Supabase SQL Editor

-- 1. SCHEMA
BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 001

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE municipalities (
    id SERIAL NOT NULL, 
    slug VARCHAR(100) NOT NULL, 
    name VARCHAR(200) NOT NULL, 
    region VARCHAR(100) DEFAULT 'coast', 
    short_description TEXT, 
    hero_image_id INTEGER, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id), 
    UNIQUE (slug)
);

CREATE INDEX ix_municipalities_slug ON municipalities (slug);

CREATE TABLE categories (
    id SERIAL NOT NULL, 
    slug VARCHAR(100) NOT NULL, 
    name VARCHAR(200) NOT NULL, 
    icon VARCHAR(50), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id), 
    UNIQUE (slug)
);

CREATE INDEX ix_categories_slug ON categories (slug);

CREATE TABLE places (
    id SERIAL NOT NULL, 
    slug VARCHAR(300) NOT NULL, 
    name VARCHAR(300) NOT NULL, 
    alternate_names JSONB DEFAULT '[]', 
    municipality_id INTEGER NOT NULL, 
    category_id INTEGER NOT NULL, 
    subtype VARCHAR(100), 
    lat FLOAT, 
    lng FLOAT, 
    short_description TEXT, 
    long_description TEXT, 
    tags JSONB DEFAULT '[]', 
    amenities JSONB DEFAULT '[]', 
    best_for JSONB DEFAULT '[]', 
    featured BOOLEAN DEFAULT 'false', 
    popularity_score INTEGER DEFAULT '0', 
    family_friendly BOOLEAN DEFAULT 'false', 
    hidden_gem BOOLEAN DEFAULT 'false', 
    nightlife BOOLEAN DEFAULT 'false', 
    active_holiday BOOLEAN DEFAULT 'false', 
    cultural_site BOOLEAN DEFAULT 'false', 
    beach_type VARCHAR(50), 
    parking_available BOOLEAN DEFAULT 'false', 
    pet_friendly BOOLEAN DEFAULT 'false', 
    accessibility_notes TEXT, 
    source_url TEXT, 
    source_type VARCHAR(50), 
    license_type VARCHAR(100), 
    verified_at TIMESTAMP WITH TIME ZONE, 
    search_document TSVECTOR, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id), 
    UNIQUE (slug), 
    FOREIGN KEY(municipality_id) REFERENCES municipalities (id), 
    FOREIGN KEY(category_id) REFERENCES categories (id)
);

CREATE INDEX ix_places_slug ON places (slug);

CREATE INDEX ix_places_municipality_id ON places (municipality_id);

CREATE INDEX ix_places_category_id ON places (category_id);

CREATE INDEX ix_places_featured ON places (featured);

CREATE INDEX ix_places_municipality_category ON places (municipality_id, category_id);

CREATE INDEX ix_places_featured_popularity ON places (featured, popularity_score);

CREATE TABLE place_images (
    id SERIAL NOT NULL, 
    place_id INTEGER NOT NULL, 
    original_url TEXT, 
    storage_path TEXT, 
    public_url TEXT, 
    thumb_path TEXT, 
    thumb_public_url TEXT, 
    alt_text TEXT, 
    width INTEGER, 
    height INTEGER, 
    file_size INTEGER, 
    mime_type VARCHAR(50), 
    sha256 VARCHAR(64), 
    source_page_url TEXT, 
    credit TEXT, 
    license_label VARCHAR(200), 
    license_url TEXT, 
    license_status VARCHAR(20) DEFAULT 'needs_review' NOT NULL, 
    sort_order INTEGER DEFAULT '0', 
    is_primary BOOLEAN DEFAULT 'false', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id), 
    FOREIGN KEY(place_id) REFERENCES places (id) ON DELETE CASCADE
);

CREATE INDEX ix_place_images_place_id ON place_images (place_id);

CREATE INDEX ix_place_images_sha256 ON place_images (sha256);

ALTER TABLE municipalities ADD CONSTRAINT fk_municipalities_hero_image FOREIGN KEY(hero_image_id) REFERENCES place_images (id);

CREATE TABLE data_sources (
    id SERIAL NOT NULL, 
    source_key VARCHAR(100) NOT NULL, 
    name VARCHAR(200) NOT NULL, 
    base_url VARCHAR(500), 
    source_type VARCHAR(50) NOT NULL, 
    active BOOLEAN DEFAULT 'true', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id), 
    UNIQUE (source_key)
);

CREATE INDEX ix_data_sources_source_key ON data_sources (source_key);

CREATE TABLE source_records (
    id SERIAL NOT NULL, 
    data_source_id INTEGER NOT NULL, 
    external_id VARCHAR(300), 
    source_url TEXT NOT NULL, 
    municipality_slug VARCHAR(100), 
    raw_payload JSONB, 
    normalized_slug VARCHAR(300), 
    parse_status VARCHAR(30) DEFAULT 'pending' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    PRIMARY KEY (id), 
    FOREIGN KEY(data_source_id) REFERENCES data_sources (id)
);

CREATE INDEX ix_source_records_data_source_id ON source_records (data_source_id);

CREATE INDEX ix_source_records_municipality_slug ON source_records (municipality_slug);

CREATE INDEX ix_source_records_normalized_slug ON source_records (normalized_slug);

CREATE TABLE ingestion_runs (
    id SERIAL NOT NULL, 
    source_key VARCHAR(100) NOT NULL, 
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    finished_at TIMESTAMP WITH TIME ZONE, 
    status VARCHAR(30) DEFAULT 'running' NOT NULL, 
    records_seen INTEGER DEFAULT '0', 
    records_created INTEGER DEFAULT '0', 
    records_updated INTEGER DEFAULT '0', 
    records_failed INTEGER DEFAULT '0', 
    notes TEXT, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_ingestion_runs_source_key ON ingestion_runs (source_key);

CREATE TABLE place_related_places (
    id SERIAL NOT NULL, 
    place_id INTEGER NOT NULL, 
    related_place_id INTEGER NOT NULL, 
    relation_type VARCHAR(50) DEFAULT 'nearby' NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(place_id) REFERENCES places (id) ON DELETE CASCADE, 
    FOREIGN KEY(related_place_id) REFERENCES places (id) ON DELETE CASCADE
);

CREATE INDEX ix_place_related_places_place_id ON place_related_places (place_id);

CREATE INDEX ix_place_related_places_related_place_id ON place_related_places (related_place_id);

CREATE OR REPLACE FUNCTION places_search_trigger() RETURNS trigger AS $$
        BEGIN
            NEW.search_document :=
                setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(NEW.short_description, '')), 'B') ||
                setweight(to_tsvector('simple', coalesce(NEW.long_description, '')), 'C');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;;

CREATE TRIGGER places_search_update
        BEFORE INSERT OR UPDATE ON places
        FOR EACH ROW EXECUTE FUNCTION places_search_trigger();;

INSERT INTO alembic_version (version_num) VALUES ('001') RETURNING alembic_version.version_num;

COMMIT;


-- 2. ROW-LEVEL SECURITY
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_municipalities" ON municipalities FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_places" ON places FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE place_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_place_images" ON place_images FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE place_related_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_place_related_places" ON place_related_places FOR SELECT TO anon, authenticated USING (true);


-- 3. VIEWS + RPC

-- View: places with joined municipality + category slugs (flattened for PostgREST)
CREATE OR REPLACE VIEW places_full AS
SELECT
  p.id,
  p.slug,
  p.name,
  p.alternate_names,
  p.subtype,
  p.lat,
  p.lng,
  p.short_description,
  p.long_description,
  p.tags,
  p.amenities,
  p.best_for,
  p.featured,
  p.popularity_score,
  p.family_friendly,
  p.hidden_gem,
  p.nightlife,
  p.active_holiday,
  p.cultural_site,
  p.beach_type,
  p.parking_available,
  p.pet_friendly,
  p.accessibility_notes,
  p.source_url,
  p.source_type,
  p.license_type,
  p.verified_at,
  p.created_at,
  p.updated_at,
  m.slug AS municipality_slug,
  m.name AS municipality_name,
  c.slug AS category_slug,
  c.name AS category_name,
  (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'url', coalesce(pi.public_url, pi.original_url),
          'thumb_url', coalesce(pi.thumb_public_url, pi.thumb_path),
          'alt_text', pi.alt_text,
          'width', pi.width,
          'height', pi.height,
          'is_primary', pi.is_primary,
          'sort_order', pi.sort_order,
          'credit', pi.credit,
          'license_label', pi.license_label,
          'license_url', pi.license_url
        )
        ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
      ), '[]'::jsonb
    )
    FROM place_images pi WHERE pi.place_id = p.id
  ) AS images
FROM places p
JOIN municipalities m ON m.id = p.municipality_id
JOIN categories c ON c.id = p.category_id;

GRANT SELECT ON places_full TO anon, authenticated;

-- View: categories with place counts
CREATE OR REPLACE VIEW categories_with_counts AS
SELECT c.*, (SELECT COUNT(*) FROM places p WHERE p.category_id = c.id) AS place_count
FROM categories c;

GRANT SELECT ON categories_with_counts TO anon, authenticated;

-- View: municipalities with place count + category breakdown + featured places (for /overview)
CREATE OR REPLACE VIEW municipalities_full AS
SELECT
  m.*,
  (SELECT COUNT(*) FROM places p WHERE p.municipality_id = m.id) AS place_count,
  (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object('slug', c.slug, 'name', c.name, 'icon', c.icon, 'place_count', cnt)
        ORDER BY cnt DESC
      ), '[]'::jsonb
    )
    FROM (
      SELECT p.category_id, COUNT(*) AS cnt FROM places p
      WHERE p.municipality_id = m.id GROUP BY p.category_id
    ) agg
    JOIN categories c ON c.id = agg.category_id
  ) AS category_breakdown
FROM municipalities m;

GRANT SELECT ON municipalities_full TO anon, authenticated;

-- RPC: nearby places within a bounding box, ordered by great-circle distance
CREATE OR REPLACE FUNCTION places_nearby(
  in_lat double precision,
  in_lng double precision,
  in_limit integer DEFAULT 12
)
RETURNS SETOF places_full
LANGUAGE sql STABLE
AS $$
  SELECT * FROM places_full
  WHERE lat IS NOT NULL AND lng IS NOT NULL
  ORDER BY (
    (lat - in_lat) * (lat - in_lat) +
    (lng - in_lng) * (lng - in_lng)
  ) ASC
  LIMIT in_limit;
$$;

GRANT EXECUTE ON FUNCTION places_nearby TO anon, authenticated;

-- RPC: simple ILIKE search across name + short_description + tags
CREATE OR REPLACE FUNCTION places_search(
  in_query text,
  in_limit integer DEFAULT 30
)
RETURNS SETOF places_full
LANGUAGE sql STABLE
AS $$
  SELECT pf.* FROM places_full pf
  JOIN places p ON p.id = pf.id
  WHERE
    p.name ILIKE '%' || in_query || '%'
    OR coalesce(p.short_description, '') ILIKE '%' || in_query || '%'
    OR p.tags::text ILIKE '%' || in_query || '%'
  ORDER BY
    (p.name ILIKE in_query || '%') DESC,
    p.featured DESC,
    p.popularity_score DESC
  LIMIT in_limit;
$$;

GRANT EXECUTE ON FUNCTION places_search TO anon, authenticated;

-- Force the full-text trigger to populate search_document on all imported rows.
UPDATE places SET name = name;


COMMIT;