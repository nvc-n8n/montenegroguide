"""Seed the municipalities table."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Municipality

MUNICIPALITIES = [
    {
        "slug": "herceg-novi",
        "name": "Herceg Novi",
        "region": "coast",
        "short_description": "Kapija Bokokotorskog zaliva, grad sunca, mimoza i tvrdjava. Mediteranski vrtovi, kamene stepenice i kulturna scena koja ne staje ni ljeti ni zimi.",
    },
    {
        "slug": "kotor",
        "name": "Kotor",
        "region": "coast",
        "short_description": "UNESCO grad na kraju zaliva, sa srednjovjekovnim zidinama ispod dramaticnih planina. Vijekovi mletacke arhitekture, macke na svakom cosku i nezaboravni pogledi.",
    },
    {
        "slug": "tivat",
        "name": "Tivat",
        "region": "coast",
        "short_description": "Moderan primorski grad sa luksuznom marinom Porto Montenegro. Ostrvo cvijeca, lagane setnje i brz pristup cijelom zalivu.",
    },
    {
        "slug": "budva",
        "name": "Budva",
        "region": "coast",
        "short_description": "Srce crnogorskog turizma. Stari grad star 2500 godina, ikonicni Sveti Stefan, najpoznatije plaze na Jadranu i nocni zivot koji ne spava.",
    },
    {
        "slug": "bar",
        "name": "Bar",
        "region": "coast",
        "short_description": "Luka sa dusoom - fascinantne rusevine Starog Bara, maslina stara 2000 godina i most izmedju crnogorskog primorja i unutrasnjosti.",
    },
    {
        "slug": "ulcinj",
        "name": "Ulcinj",
        "region": "coast",
        "short_description": "Najjuzniji grad na crnogorskoj obali. Velika Plaza, ostrvo Ada Bojana, raj za kitesurfere i jedinstven spoj kultura koji se osjeti na svakom koraku.",
    },
]


def seed_municipalities(db: Session):
    for m_data in MUNICIPALITIES:
        existing = db.execute(
            select(Municipality).where(Municipality.slug == m_data["slug"])
        ).scalars().first()
        if not existing:
            db.add(Municipality(**m_data))
        else:
            for key, val in m_data.items():
                if key != "slug" and val:
                    setattr(existing, key, val)
    db.commit()
    print(f"Seeded {len(MUNICIPALITIES)} municipalities")
