"""CLI entry point for the Montenegro Coast City Guide backend.

Usage:
    python cli.py migrate
    python cli.py seed
    python cli.py seed_categories
    python cli.py seed_municipalities
    python cli.py seed_places [--municipality herceg-novi]
    python cli.py seed_sources
    python cli.py ingest_all
    python cli.py ingest_osm [--municipality herceg-novi]
    python cli.py ingest_tourism <source_key> [--municipality herceg-novi]
    python cli.py ingest_morskodobro [--municipality herceg-novi]
    python cli.py ingest_wikidata [--municipality herceg-novi]
    python cli.py ingest_montenegro_travel
    python cli.py rebuild_images
    python cli.py process_images
    python cli.py run_api
"""

import os
import sys
import logging
import click

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("cli")


def get_sync_session():
    from app.db.session import sync_session_factory
    return sync_session_factory()


@click.group()
def cli():
    """Montenegro Coast City Guide - Backend CLI"""
    pass


@cli.command()
def migrate():
    """Create database tables."""
    from app.db.init_db import init_db
    init_db()
    click.echo("Database initialized successfully.")


@cli.command()
def seed():
    """Run all seed scripts (categories, municipalities, data sources, places)."""
    db = get_sync_session()
    try:
        from scripts.seed.categories import seed_categories
        from scripts.seed.municipalities import seed_municipalities
        from scripts.seed.data_sources import seed_data_sources
        from scripts.seed.seed_places import seed_places

        seed_categories(db)
        seed_municipalities(db)
        seed_data_sources(db)
        seed_places(db)
        click.echo("All seed data loaded.")
    finally:
        db.close()


@cli.command()
def seed_categories():
    """Seed categories only."""
    db = get_sync_session()
    try:
        from scripts.seed.categories import seed_categories as _seed
        _seed(db)
    finally:
        db.close()


@cli.command()
def seed_municipalities():
    """Seed municipalities only."""
    db = get_sync_session()
    try:
        from scripts.seed.municipalities import seed_municipalities as _seed
        _seed(db)
    finally:
        db.close()


@cli.command()
def seed_sources():
    """Seed data sources only."""
    db = get_sync_session()
    try:
        from scripts.seed.data_sources import seed_data_sources as _seed
        _seed(db)
    finally:
        db.close()


@cli.command()
@click.option("--municipality", "-m", default=None, help="Municipality slug to seed")
def seed_places(municipality):
    """Seed curated places data."""
    db = get_sync_session()
    try:
        from scripts.seed.seed_places import seed_places as _seed
        _seed(db, municipality_slug=municipality)
    finally:
        db.close()


@cli.command()
@click.option("--municipality", "-m", default=None, help="Municipality slug to ingest")
def ingest_osm(municipality):
    """Ingest data from OpenStreetMap/Overpass."""
    db = get_sync_session()
    try:
        from scripts.sources.osm_overpass import OSMOverpassIngestor
        ingestor = OSMOverpassIngestor(db)
        ingestor.run_full(municipality_slug=municipality)
    finally:
        db.close()


@cli.command()
@click.argument("source_key")
@click.option("--municipality", "-m", default=None, help="Municipality slug (usually set by source)")
def ingest_tourism(source_key, municipality):
    """Ingest data from a tourism .travel website."""
    db = get_sync_session()
    try:
        from scripts.sources.tourism_travel import TourismTravelIngestor, TOURISM_SITES
        if source_key not in TOURISM_SITES:
            click.echo(f"Unknown source: {source_key}. Available: {list(TOURISM_SITES.keys())}")
            return
        ingestor = TourismTravelIngestor(db, source_key)
        ingestor.run_full(municipality_slug=municipality)
    finally:
        db.close()


@cli.command()
@click.option("--municipality", "-m", default=None, help="Municipality slug to ingest")
def ingest_morskodobro(municipality):
    """Ingest beach data from JP Morsko Dobro."""
    db = get_sync_session()
    try:
        from scripts.sources.morskodobro import MorskoDobroIngestor
        ingestor = MorskoDobroIngestor(db)
        ingestor.run_full(municipality_slug=municipality)
    finally:
        db.close()


@cli.command()
@click.option("--municipality", "-m", default=None, help="Municipality slug to ingest")
def ingest_wikidata(municipality):
    """Ingest/enrich data from Wikidata."""
    db = get_sync_session()
    try:
        from scripts.sources.wikidata import WikidataIngestor
        ingestor = WikidataIngestor(db)
        ingestor.run_full(municipality_slug=municipality)
    finally:
        db.close()


@cli.command()
def ingest_montenegro_travel():
    """Ingest data from national montenegro.travel portal."""
    db = get_sync_session()
    try:
        from scripts.sources.montenegro_travel import MontenegroTravelIngestor
        ingestor = MontenegroTravelIngestor(db)
        ingestor.run_full()
    finally:
        db.close()


@cli.command()
@click.option("--municipality", "-m", default=None, help="Municipality slug to ingest")
def ingest_all(municipality):
    """Run all ingestion sources in order."""
    db = get_sync_session()
    try:
        click.echo("=== Seeding base data ===")
        from scripts.seed.categories import seed_categories
        from scripts.seed.municipalities import seed_municipalities
        from scripts.seed.data_sources import seed_data_sources
        from scripts.seed.seed_places import seed_places as sp
        seed_categories(db)
        seed_municipalities(db)
        seed_data_sources(db)
        sp(db, municipality_slug=municipality)

        click.echo("=== Ingesting from OSM/Overpass ===")
        from scripts.sources.osm_overpass import OSMOverpassIngestor
        OSMOverpassIngestor(db).run_full(municipality_slug=municipality)

        click.echo("=== Ingesting from Wikidata ===")
        from scripts.sources.wikidata import WikidataIngestor
        WikidataIngestor(db).run_full(municipality_slug=municipality)

        click.echo("=== Ingesting from Morsko Dobro ===")
        from scripts.sources.morskodobro import MorskoDobroIngestor
        MorskoDobroIngestor(db).run_full(municipality_slug=municipality)

        click.echo("=== Ingesting from tourism sites ===")
        from scripts.sources.tourism_travel import TourismTravelIngestor, TOURISM_SITES
        for key in TOURISM_SITES:
            if municipality:
                if TOURISM_SITES[key]["municipality_slug"] != municipality:
                    continue
            click.echo(f"  -> {key}")
            TourismTravelIngestor(db, key).run_full(municipality_slug=municipality)

        click.echo("=== Ingesting from montenegro.travel ===")
        from scripts.sources.montenegro_travel import MontenegroTravelIngestor
        MontenegroTravelIngestor(db).run_full(municipality_slug=municipality)

        click.echo("=== All ingestion complete ===")
    finally:
        db.close()


@cli.command()
def process_images():
    """Download and process pending images."""
    db = get_sync_session()
    try:
        from scripts.images.pipeline import ImagePipeline
        pipeline = ImagePipeline(db)
        pipeline.process_all()
    finally:
        db.close()


@cli.command()
def rebuild_images():
    """Re-download and re-process all images."""
    db = get_sync_session()
    try:
        from scripts.images.pipeline import ImagePipeline
        pipeline = ImagePipeline(db)
        pipeline.rebuild_all()
    finally:
        db.close()


@cli.command()
@click.option("--host", default="0.0.0.0")
@click.option("--port", default=8000, type=int)
def run_api(host, port):
    """Start the FastAPI server."""
    import uvicorn
    uvicorn.run("app.main:app", host=host, port=port, reload=True)


if __name__ == "__main__":
    cli()
