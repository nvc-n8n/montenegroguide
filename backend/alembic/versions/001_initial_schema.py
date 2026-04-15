"""Initial schema

Revision ID: 001
Revises: None
Create Date: 2026-04-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")

    op.create_table(
        "municipalities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("region", sa.String(100), server_default="coast"),
        sa.Column("short_description", sa.Text(), nullable=True),
        sa.Column("hero_image_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_municipalities_slug", "municipalities", ["slug"])

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_categories_slug", "categories", ["slug"])

    op.create_table(
        "places",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(300), unique=True, nullable=False),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("alternate_names", JSONB(), server_default="[]"),
        sa.Column("municipality_id", sa.Integer(), sa.ForeignKey("municipalities.id"), nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("subtype", sa.String(100), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("short_description", sa.Text(), nullable=True),
        sa.Column("long_description", sa.Text(), nullable=True),
        sa.Column("tags", JSONB(), server_default="[]"),
        sa.Column("amenities", JSONB(), server_default="[]"),
        sa.Column("best_for", JSONB(), server_default="[]"),
        sa.Column("featured", sa.Boolean(), server_default="false"),
        sa.Column("popularity_score", sa.Integer(), server_default="0"),
        sa.Column("family_friendly", sa.Boolean(), server_default="false"),
        sa.Column("hidden_gem", sa.Boolean(), server_default="false"),
        sa.Column("nightlife", sa.Boolean(), server_default="false"),
        sa.Column("active_holiday", sa.Boolean(), server_default="false"),
        sa.Column("cultural_site", sa.Boolean(), server_default="false"),
        sa.Column("beach_type", sa.String(50), nullable=True),
        sa.Column("parking_available", sa.Boolean(), server_default="false"),
        sa.Column("pet_friendly", sa.Boolean(), server_default="false"),
        sa.Column("accessibility_notes", sa.Text(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(50), nullable=True),
        sa.Column("license_type", sa.String(100), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("search_document", TSVECTOR(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_places_slug", "places", ["slug"])
    op.create_index("ix_places_municipality_id", "places", ["municipality_id"])
    op.create_index("ix_places_category_id", "places", ["category_id"])
    op.create_index("ix_places_featured", "places", ["featured"])
    op.create_index("ix_places_municipality_category", "places", ["municipality_id", "category_id"])
    op.create_index("ix_places_featured_popularity", "places", ["featured", "popularity_score"])

    op.create_table(
        "place_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("place_id", sa.Integer(), sa.ForeignKey("places.id", ondelete="CASCADE"), nullable=False),
        sa.Column("original_url", sa.Text(), nullable=True),
        sa.Column("storage_path", sa.Text(), nullable=True),
        sa.Column("public_url", sa.Text(), nullable=True),
        sa.Column("thumb_path", sa.Text(), nullable=True),
        sa.Column("thumb_public_url", sa.Text(), nullable=True),
        sa.Column("alt_text", sa.Text(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(50), nullable=True),
        sa.Column("sha256", sa.String(64), nullable=True),
        sa.Column("source_page_url", sa.Text(), nullable=True),
        sa.Column("credit", sa.Text(), nullable=True),
        sa.Column("license_label", sa.String(200), nullable=True),
        sa.Column("license_url", sa.Text(), nullable=True),
        sa.Column("license_status", sa.String(20), nullable=False, server_default="needs_review"),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("is_primary", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_place_images_place_id", "place_images", ["place_id"])
    op.create_index("ix_place_images_sha256", "place_images", ["sha256"])

    # Add FK from municipalities.hero_image_id now that place_images exists
    op.create_foreign_key(
        "fk_municipalities_hero_image",
        "municipalities",
        "place_images",
        ["hero_image_id"],
        ["id"],
    )

    op.create_table(
        "data_sources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_key", sa.String(100), unique=True, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=True),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_data_sources_source_key", "data_sources", ["source_key"])

    op.create_table(
        "source_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("data_source_id", sa.Integer(), sa.ForeignKey("data_sources.id"), nullable=False),
        sa.Column("external_id", sa.String(300), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("municipality_slug", sa.String(100), nullable=True),
        sa.Column("raw_payload", JSONB(), nullable=True),
        sa.Column("normalized_slug", sa.String(300), nullable=True),
        sa.Column("parse_status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_source_records_data_source_id", "source_records", ["data_source_id"])
    op.create_index("ix_source_records_municipality_slug", "source_records", ["municipality_slug"])
    op.create_index("ix_source_records_normalized_slug", "source_records", ["normalized_slug"])

    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_key", sa.String(100), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="running"),
        sa.Column("records_seen", sa.Integer(), server_default="0"),
        sa.Column("records_created", sa.Integer(), server_default="0"),
        sa.Column("records_updated", sa.Integer(), server_default="0"),
        sa.Column("records_failed", sa.Integer(), server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_ingestion_runs_source_key", "ingestion_runs", ["source_key"])

    op.create_table(
        "place_related_places",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("place_id", sa.Integer(), sa.ForeignKey("places.id", ondelete="CASCADE"), nullable=False),
        sa.Column("related_place_id", sa.Integer(), sa.ForeignKey("places.id", ondelete="CASCADE"), nullable=False),
        sa.Column("relation_type", sa.String(50), nullable=False, server_default="nearby"),
    )
    op.create_index("ix_place_related_places_place_id", "place_related_places", ["place_id"])
    op.create_index("ix_place_related_places_related_place_id", "place_related_places", ["related_place_id"])

    # Full text search trigger
    op.execute("""
        CREATE OR REPLACE FUNCTION places_search_trigger() RETURNS trigger AS $$
        BEGIN
            NEW.search_document :=
                setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(NEW.short_description, '')), 'B') ||
                setweight(to_tsvector('simple', coalesce(NEW.long_description, '')), 'C');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER places_search_update
        BEFORE INSERT OR UPDATE ON places
        FOR EACH ROW EXECUTE FUNCTION places_search_trigger();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS places_search_update ON places")
    op.execute("DROP FUNCTION IF EXISTS places_search_trigger()")
    op.drop_table("place_related_places")
    op.drop_table("ingestion_runs")
    op.drop_table("source_records")
    op.drop_table("data_sources")
    op.drop_constraint("fk_municipalities_hero_image", "municipalities", type_="foreignkey")
    op.drop_table("place_images")
    op.drop_table("places")
    op.drop_table("categories")
    op.drop_table("municipalities")
