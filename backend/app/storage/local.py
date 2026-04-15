import os
import aiofiles
from pathlib import Path

from app.storage.base import StorageBackend
from app.config import settings


class LocalStorage(StorageBackend):
    def __init__(self):
        self.root = Path(settings.media_root)
        self.base_url = settings.media_url

    async def save(self, data: bytes, path: str, content_type: str = "image/jpeg") -> str:
        full_path = self.root / path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(str(full_path), "wb") as f:
            await f.write(data)
        return self.get_public_url(path)

    def save_sync(self, data: bytes, path: str, content_type: str = "image/jpeg") -> str:
        full_path = self.root / path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(str(full_path), "wb") as f:
            f.write(data)
        return self.get_public_url(path)

    async def delete(self, path: str) -> bool:
        full_path = self.root / path
        if full_path.exists():
            full_path.unlink()
            return True
        return False

    def get_public_url(self, path: str) -> str:
        return f"{self.base_url}/{path}"

    async def exists(self, path: str) -> bool:
        return (self.root / path).exists()
