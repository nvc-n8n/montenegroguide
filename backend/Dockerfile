# Montenegro Coast City Guide — Backend image
# Runs FastAPI + SQLite on a Fly.io volume.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps for Pillow + lxml + psycopg2 (kept in case we move off SQLite later)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

# Volume mount point for the SQLite DB and media files
RUN mkdir -p /data/media

ENV DATABASE_URL="sqlite+aiosqlite:////data/montenegro_guide.db" \
    DATABASE_URL_SYNC="sqlite:////data/montenegro_guide.db" \
    MEDIA_ROOT="/data/media" \
    API_HOST="0.0.0.0" \
    API_PORT="8000" \
    API_RELOAD="false"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
