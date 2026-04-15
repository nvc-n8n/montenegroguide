"""Image ingestion pipeline.

Downloads images from original URLs, generates thumbnails,
computes hashes, and stores them through the storage adapter.
"""

import hashlib
import io
import logging
from pathlib import Path
from urllib.parse import urlparse

import httpx
from PIL import Image
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import PlaceImage
from app.storage.local import LocalStorage

logger = logging.getLogger(__name__)


class ImagePipeline:
    def __init__(self, db: Session):
        self.db = db
        self.storage = LocalStorage()
        self.client = httpx.Client(
            timeout=30,
            follow_redirects=True,
            headers={"User-Agent": "MontenegroGuide/1.0 (image pipeline)"},
        )
        self.stats = {"processed": 0, "downloaded": 0, "failed": 0, "skipped": 0, "deduped": 0}

    def _download_image(self, url: str) -> bytes | None:
        try:
            resp = self.client.get(url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "image" not in content_type and not url.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                logger.warning(f"Not an image: {url} (content-type: {content_type})")
                return None
            return resp.content
        except Exception as e:
            logger.warning(f"Failed to download {url}: {e}")
            return None

    def _compute_sha256(self, data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    def _get_image_metadata(self, data: bytes) -> dict:
        try:
            img = Image.open(io.BytesIO(data))
            return {
                "width": img.width,
                "height": img.height,
                "mime_type": Image.MIME.get(img.format, "image/jpeg"),
                "file_size": len(data),
            }
        except Exception:
            return {
                "width": None,
                "height": None,
                "mime_type": "image/jpeg",
                "file_size": len(data),
            }

    def _generate_thumbnail(self, data: bytes, max_w: int = None, max_h: int = None) -> bytes | None:
        max_w = max_w or settings.thumbnail_width
        max_h = max_h or settings.thumbnail_height
        try:
            img = Image.open(io.BytesIO(data))
            img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            fmt = img.format or "JPEG"
            if fmt == "JPEG":
                img.save(buf, format="JPEG", quality=85, optimize=True)
            elif fmt == "PNG":
                img.save(buf, format="PNG", optimize=True)
            elif fmt == "WEBP":
                img.save(buf, format="WEBP", quality=85)
            else:
                img.save(buf, format="JPEG", quality=85)
            return buf.getvalue()
        except Exception as e:
            logger.warning(f"Failed to generate thumbnail: {e}")
            return None

    def _optimize_image(self, data: bytes) -> bytes:
        """Resize oversized images to max dimensions."""
        try:
            img = Image.open(io.BytesIO(data))
            max_w = settings.image_max_width
            max_h = settings.image_max_height
            if img.width > max_w or img.height > max_h:
                img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            fmt = img.format or "JPEG"
            if fmt == "JPEG":
                img.save(buf, format="JPEG", quality=90, optimize=True)
            elif fmt == "PNG":
                img.save(buf, format="PNG", optimize=True)
            elif fmt == "WEBP":
                img.save(buf, format="WEBP", quality=90)
            else:
                img.save(buf, format="JPEG", quality=90)
            return buf.getvalue()
        except Exception:
            return data

    def _make_storage_path(self, image_id: int, sha256: str, ext: str = ".jpg") -> str:
        prefix = sha256[:2]
        return f"images/{prefix}/{sha256}{ext}"

    def _make_thumb_path(self, image_id: int, sha256: str, ext: str = ".jpg") -> str:
        prefix = sha256[:2]
        return f"thumbnails/{prefix}/{sha256}{ext}"

    def _ext_from_mime(self, mime_type: str) -> str:
        mapping = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }
        return mapping.get(mime_type, ".jpg")

    def process_image(self, img_record: PlaceImage) -> bool:
        """Process a single image record: download, hash, store, thumbnail."""
        if not img_record.original_url:
            self.stats["skipped"] += 1
            return False

        # Skip already processed
        if img_record.storage_path and img_record.sha256:
            self.stats["skipped"] += 1
            return False

        # Skip blocked images
        if img_record.license_status == "blocked":
            self.stats["skipped"] += 1
            return False

        logger.info(f"Processing image {img_record.id}: {img_record.original_url}")

        # Download
        data = self._download_image(img_record.original_url)
        if not data:
            self.stats["failed"] += 1
            return False

        # Hash
        sha256 = self._compute_sha256(data)

        # Dedup check
        existing = self.db.execute(
            select(PlaceImage).where(
                PlaceImage.sha256 == sha256,
                PlaceImage.storage_path.isnot(None),
                PlaceImage.id != img_record.id,
            )
        ).scalars().first()

        if existing:
            # Reuse existing storage
            img_record.sha256 = sha256
            img_record.storage_path = existing.storage_path
            img_record.public_url = existing.public_url
            img_record.thumb_path = existing.thumb_path
            img_record.thumb_public_url = existing.thumb_public_url
            img_record.width = existing.width
            img_record.height = existing.height
            img_record.file_size = existing.file_size
            img_record.mime_type = existing.mime_type
            self.stats["deduped"] += 1
            self.db.flush()
            return True

        # Metadata
        meta = self._get_image_metadata(data)
        ext = self._ext_from_mime(meta["mime_type"])

        # Optimize full image
        optimized = self._optimize_image(data)
        storage_path = self._make_storage_path(img_record.id, sha256, ext)
        public_url = self.storage.save_sync(optimized, storage_path, meta["mime_type"])

        # Thumbnail
        thumb_data = self._generate_thumbnail(data)
        thumb_path = None
        thumb_url = None
        if thumb_data:
            thumb_path = self._make_thumb_path(img_record.id, sha256, ext)
            thumb_url = self.storage.save_sync(thumb_data, thumb_path, meta["mime_type"])

        # Update record
        img_record.sha256 = sha256
        img_record.storage_path = storage_path
        img_record.public_url = public_url
        img_record.thumb_path = thumb_path
        img_record.thumb_public_url = thumb_url
        img_record.width = meta["width"]
        img_record.height = meta["height"]
        img_record.file_size = meta["file_size"]
        img_record.mime_type = meta["mime_type"]

        self.stats["downloaded"] += 1
        self.db.flush()
        return True

    def process_all(self, place_id: int = None):
        """Process all unprocessed image records."""
        query = select(PlaceImage).where(
            PlaceImage.original_url.isnot(None),
            PlaceImage.storage_path.is_(None),
            PlaceImage.license_status != "blocked",
        )
        if place_id:
            query = query.where(PlaceImage.place_id == place_id)

        query = query.order_by(PlaceImage.is_primary.desc(), PlaceImage.sort_order)

        result = self.db.execute(query)
        images = result.scalars().all()
        logger.info(f"Found {len(images)} images to process")

        for img in images:
            self.stats["processed"] += 1
            try:
                self.process_image(img)
            except Exception as e:
                logger.error(f"Failed to process image {img.id}: {e}")
                self.stats["failed"] += 1

            if self.stats["processed"] % 10 == 0:
                self.db.commit()

        self.db.commit()
        logger.info(
            f"Image pipeline done: processed={self.stats['processed']} "
            f"downloaded={self.stats['downloaded']} deduped={self.stats['deduped']} "
            f"failed={self.stats['failed']} skipped={self.stats['skipped']}"
        )

    def rebuild_all(self):
        """Re-process all images, including already processed ones."""
        # Reset storage fields
        result = self.db.execute(select(PlaceImage).where(PlaceImage.original_url.isnot(None)))
        images = result.scalars().all()
        for img in images:
            img.storage_path = None
            img.public_url = None
            img.thumb_path = None
            img.thumb_public_url = None
            img.sha256 = None
        self.db.commit()
        self.process_all()
