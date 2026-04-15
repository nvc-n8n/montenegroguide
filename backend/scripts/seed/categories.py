"""Seed the categories table."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category

CATEGORIES = [
    {"slug": "plaze", "name": "Plaže", "icon": "umbrella-beach"},
    {"slug": "znamenitosti", "name": "Znamenitosti", "icon": "landmark"},
    {"slug": "tvrdjave-stari-gradovi", "name": "Tvrđave i stari gradovi", "icon": "chess-rook"},
    {"slug": "manastiri-crkve", "name": "Manastiri i crkve", "icon": "church"},
    {"slug": "muzeji-kultura", "name": "Muzeji i kultura", "icon": "palette"},
    {"slug": "priroda-vidikovci", "name": "Priroda i vidikovci", "icon": "mountain-sun"},
    {"slug": "restorani-beach-barovi", "name": "Restorani i beach barovi", "icon": "utensils"},
    {"slug": "nocni-zivot", "name": "Noćni život", "icon": "martini-glass"},
    {"slug": "aktivni-odmor", "name": "Aktivni odmor", "icon": "person-hiking"},
    {"slug": "porodicna-mjesta", "name": "Porodična mjesta", "icon": "children"},
    {"slug": "hidden-gems", "name": "Hidden Gems", "icon": "gem"},
]


def seed_categories(db: Session):
    for cat_data in CATEGORIES:
        existing = db.execute(
            select(Category).where(Category.slug == cat_data["slug"])
        ).scalars().first()
        if not existing:
            db.add(Category(**cat_data))
    db.commit()
    print(f"Seeded {len(CATEGORIES)} categories")
